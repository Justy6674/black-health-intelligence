'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type {
  ClearingSummaryResponse,
  ClearingApplyResponse,
  DepositMatch,
  MatchConfidence,
} from '@/lib/xero/types'

const CLEARING_AUDIT_KEY = 'xero_clearing_history'

interface ClearingAuditEntry {
  timestamp: string
  date: string
  bankTransactionId: string
  amount: number
  clearingCount: number
  dryRun: boolean
  success: boolean
  feeAmount?: number
}

function loadClearingHistory(): ClearingAuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CLEARING_AUDIT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveClearingEntry(entry: ClearingAuditEntry) {
  if (typeof window === 'undefined') return
  try {
    const history = loadClearingHistory()
    history.unshift(entry)
    localStorage.setItem(CLEARING_AUDIT_KEY, JSON.stringify(history.slice(0, 50)))
  } catch {
    // ignore
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getPresetDates(preset: string): { from: string; to: string } {
  const today = new Date()
  switch (preset) {
    case 'today':
      return { from: formatDate(today), to: formatDate(today) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { from: formatDate(y), to: formatDate(y) }
    }
    case 'last7': {
      const week = new Date(today)
      week.setDate(week.getDate() - 6)
      return { from: formatDate(week), to: formatDate(today) }
    }
    default:
      return { from: formatDate(today), to: formatDate(today) }
  }
}

export default function ClearingHelperPage() {
  const [fromDate, setFromDate] = useState(() => formatDate(new Date()))
  const [toDate, setToDate] = useState(() => formatDate(new Date()))
  const [toleranceDollars, setToleranceDollars] = useState(5)
  const [feeAccountCode, setFeeAccountCode] = useState(
    () => process.env.NEXT_PUBLIC_XERO_FEE_ACCOUNT_CODE ?? ''
  )
  const [hxFilterOnly, setHxFilterOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ClearingSummaryResponse | null>(null)
  const [dryRun, setDryRun] = useState(true)
  const [results, setResults] = useState<Map<string, ClearingApplyResponse>>(new Map())
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState<DepositMatch | null>(null)
  const [clearingHistory, setClearingHistory] = useState<ClearingAuditEntry[]>([])

  useEffect(() => {
    setClearingHistory(loadClearingHistory())
  }, [results])

  // Filter matched deposits by HX reference if toggle is on
  const filteredMatches = useMemo(() => {
    if (!summary) return []
    if (!hxFilterOnly) return summary.deposits
    return summary.deposits.filter(
      (m) => m.deposit.reference && m.deposit.reference.toUpperCase().includes('HX')
    )
  }, [summary, hxFilterOnly])

  const filteredUnmatchedDeposits = useMemo(() => {
    if (!summary) return []
    if (!hxFilterOnly) return summary.unmatchedDeposits
    return summary.unmatchedDeposits.filter(
      (d) => d.reference && d.reference.toUpperCase().includes('HX')
    )
  }, [summary, hxFilterOnly])

  const applyPreset = (preset: string) => {
    const { from, to } = getPresetDates(preset)
    setFromDate(from)
    setToDate(to)
  }

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    setSummary(null)
    setResults(new Map())

    try {
      const toleranceCents = Math.round(toleranceDollars * 100)
      const params = new URLSearchParams({
        fromDate,
        toDate,
        tolerance: String(toleranceCents),
      })
      const res = await fetch(`/api/xero/clearing/summary?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      const data: ClearingSummaryResponse = await res.json()
      setSummary(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const requestApplyForMatch = (match: DepositMatch) => {
    setConfirmModal(match)
  }

  const confirmApply = async () => {
    if (!confirmModal || !summary) return
    const match = confirmModal
    setLoading(true)
    setError('')

    const newResults = new Map(results)
    const fee = match.impliedFee > 0 ? match.impliedFee : 0

    try {
      const body: Record<string, unknown> = {
        bankTransactionId: match.deposit.bankTransactionId,
        clearingTransactionIds: match.clearingTransactions.map((c) => c.transactionId),
        dryRun,
      }
      if (fee > 0 && feeAccountCode) {
        body.feeAmount = fee
        body.feeAccountCode = feeAccountCode
      }

      const res = await fetch('/api/xero/clearing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data: ClearingApplyResponse = await res.json()
      newResults.set(match.deposit.bankTransactionId, data)

      saveClearingEntry({
        timestamp: new Date().toISOString(),
        date: fromDate === toDate ? fromDate : `${fromDate}–${toDate}`,
        bankTransactionId: match.deposit.bankTransactionId,
        amount: match.deposit.amount,
        clearingCount: match.clearingTransactions.length,
        dryRun,
        success: data.success,
        feeAmount: fee > 0 ? fee : undefined,
      })
    } catch (err: unknown) {
      newResults.set(match.deposit.bankTransactionId, {
        bankTransactionId: match.deposit.bankTransactionId,
        matched: 0,
        total: 0,
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        dryRun,
      })
    }

    setResults(newResults)
    setClearingHistory(loadClearingHistory())
    setConfirmModal(null)
    setLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          &larr; Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Clearing Account Reconciliation</h1>
          <p className="text-silver-400 text-sm">
            Match NAB deposits to Halaxy clearing-account payments &mdash; expert / accounting tool
          </p>
        </div>
      </div>

      {/* Date range + controls */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Date Range</h2>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-silver-400 text-sm">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-charcoal border border-silver-700/30 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-silver-400 text-sm">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-charcoal border border-silver-700/30 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex gap-1">
            {(['today', 'yesterday', 'last7'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="px-2 py-1 text-xs bg-silver-700/30 text-silver-300 rounded hover:bg-silver-700/50 transition-colors"
              >
                {preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : 'Last 7 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Tolerance slider */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-silver-400 text-sm">Fee tolerance</label>
            <input
              type="range"
              min={0}
              max={50}
              step={0.5}
              value={toleranceDollars}
              onChange={(e) => setToleranceDollars(Number(e.target.value))}
              className="w-32 accent-slate-blue"
            />
            <span className="text-white text-sm font-mono w-16">
              ${toleranceDollars.toFixed(2)}
            </span>
          </div>

          {/* Fee account code */}
          <div className="flex items-center gap-2">
            <label className="text-silver-400 text-sm">Fee account</label>
            <input
              type="text"
              value={feeAccountCode}
              onChange={(e) => setFeeAccountCode(e.target.value)}
              placeholder="e.g. 404"
              className="bg-charcoal border border-silver-700/30 rounded px-2 py-1 text-white text-sm w-24 font-mono"
            />
          </div>

          {/* HX filter */}
          <label className="flex items-center gap-2 text-sm text-silver-300">
            <input
              type="checkbox"
              checked={hxFilterOnly}
              onChange={(e) => setHxFilterOnly(e.target.checked)}
              className="rounded"
            />
            HX refs only
          </label>
        </div>

        <button
          onClick={fetchSummary}
          disabled={loading}
          className="px-4 py-2 bg-slate-blue/20 text-white rounded hover:bg-slate-blue/40 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Loading\u2026' : 'Load Summary'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Summary results */}
      {summary && (
        <>
          {/* Controls */}
          <div className="card mb-6">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-silver-300">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded"
                />
                Dry Run Mode
              </label>
              <span className="text-xs text-silver-500">
                {dryRun
                  ? '(Preview only \u2014 no changes will be made)'
                  : '\u26A0\uFE0F Live mode \u2014 changes will be applied to Xero'}
              </span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="text-silver-400">
                Deposits: <span className="text-white font-medium">{summary.deposits.length + summary.unmatchedDeposits.length}</span>
              </div>
              <div className="text-green-400">
                Matched: <span className="font-medium">{filteredMatches.length}</span>
              </div>
              <div className="text-yellow-400">
                Unmatched: <span className="font-medium">{filteredUnmatchedDeposits.length}</span>
              </div>
              <div className="text-silver-400">
                Clearing txns: <span className="text-white font-medium">
                  {summary.deposits.reduce((s, m) => s + m.clearingTransactions.length, 0) + summary.unmatchedClearing.length}
                </span>
              </div>
              {summary.toleranceCents !== undefined && (
                <div className="text-silver-400">
                  Tolerance: <span className="text-white font-medium">${(summary.toleranceCents / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Matched deposits */}
          {filteredMatches.length > 0 ? (
            <div className="space-y-4 mb-6">
              {filteredMatches.map((match) => (
                <DepositCard
                  key={match.deposit.bankTransactionId}
                  match={match}
                  result={results.get(match.deposit.bankTransactionId)}
                  onApplyTransfer={() => requestApplyForMatch(match)}
                  loading={loading}
                  dryRun={dryRun}
                  feeAccountCode={feeAccountCode}
                />
              ))}
            </div>
          ) : (
            <div className="card mb-6">
              <p className="text-silver-400">
                No matched deposits found for {summary.date}
                {hxFilterOnly ? ' (HX filter active)' : ''}
              </p>
            </div>
          )}

          {/* Unmatched deposits */}
          {filteredUnmatchedDeposits.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-yellow-400 mb-3">
                Unmatched Deposits ({filteredUnmatchedDeposits.length})
              </h2>
              <div className="space-y-2 text-sm">
                {filteredUnmatchedDeposits.map((d) => (
                  <div key={d.bankTransactionId} className="text-silver-300">
                    ${d.amount.toFixed(2)} &mdash; ref: {d.reference || '(none)'} &mdash; {d.date}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched clearing transactions */}
          {summary.unmatchedClearing.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-yellow-400 mb-3">
                Unmatched Clearing Transactions ({summary.unmatchedClearing.length})
              </h2>
              <div className="space-y-2 text-sm">
                {summary.unmatchedClearing.map((c) => (
                  <div key={c.transactionId} className="text-silver-300">
                    ${c.amount.toFixed(2)} &mdash; {c.invoiceNumber || c.reference || '(no ref)'} &mdash; {c.date}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm modal */}
          {confirmModal && (
            <ConfirmModal
              match={confirmModal}
              dryRun={dryRun}
              loading={loading}
              feeAccountCode={feeAccountCode}
              onCancel={() => setConfirmModal(null)}
              onConfirm={confirmApply}
            />
          )}

          {/* History */}
          {clearingHistory.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-3">History</h2>
              <div className="space-y-1 text-xs font-mono text-silver-400 max-h-40 overflow-y-auto">
                {clearingHistory.slice(0, 20).map((e, i) => (
                  <div key={i}>
                    {new Date(e.timestamp).toLocaleString()} &mdash; {e.date} &mdash; $
                    {e.amount.toFixed(2)}
                    {e.feeAmount ? ` (fee $${e.feeAmount.toFixed(2)})` : ''} &mdash;{' '}
                    {e.clearingCount} txns &mdash;{' '}
                    {e.dryRun ? 'dry run' : e.success ? '\u2713' : '\u2717'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Confirm Modal ──

function ConfirmModal({
  match,
  dryRun,
  loading,
  feeAccountCode,
  onCancel,
  onConfirm,
}: {
  match: DepositMatch
  dryRun: boolean
  loading: boolean
  feeAccountCode: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const hasFee = match.impliedFee > 0
  const needsFeeAccount = hasFee && !feeAccountCode

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card max-w-md w-full">
        <h3 className="text-lg font-semibold text-white mb-3">Confirm Transfer</h3>
        <div className="text-sm text-silver-300 space-y-2 mb-4">
          <p>
            Deposit: ${match.deposit.amount.toFixed(2)} &mdash; {match.deposit.date}
          </p>
          <p>Ref: {match.deposit.reference || '(none)'}</p>
          <p>
            {match.clearingTransactions.length} clearing transaction(s) &mdash; total: $
            {match.total.toFixed(2)}
          </p>
          <ConfidenceBadge confidence={match.matchConfidence} fee={match.impliedFee} />

          {hasFee && (
            <div className="mt-2 p-2 bg-amber-900/20 border border-amber-500/30 rounded text-xs space-y-1">
              <p className="text-amber-300 font-medium">Fee-adjusted match</p>
              <p>1. Spend Money: ${match.impliedFee.toFixed(2)} from clearing &rarr; {feeAccountCode || '(no account set)'}</p>
              <p>2. Bank Transfer: ${match.deposit.amount.toFixed(2)} from clearing &rarr; NAB</p>
            </div>
          )}
        </div>

        {needsFeeAccount && (
          <p className="text-red-400 text-xs mb-3">
            Enter a fee account code above before applying this fee-adjusted match.
          </p>
        )}

        <p className="text-amber-400 text-sm mb-4">
          {dryRun
            ? 'Dry run \u2014 no changes will be made.'
            : hasFee
              ? 'This will create a Spend Money + Bank Transfer in Xero.'
              : 'This will create a bank transfer in Xero.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-silver-700 text-white rounded hover:bg-silver-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || needsFeeAccount}
            className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Applying\u2026' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Confidence badge ──

function ConfidenceBadge({ confidence, fee }: { confidence: MatchConfidence; fee: number }) {
  switch (confidence) {
    case 'exact':
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-green-900/40 text-green-400 border border-green-500/30">
          Exact match
        </span>
      )
    case 'fee-adjusted':
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-900/40 text-amber-400 border border-amber-500/30">
          Fee: ${fee.toFixed(2)}
        </span>
      )
    case 'uncertain':
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-red-900/40 text-red-400 border border-red-500/30">
          Delta: ${fee.toFixed(2)} &mdash; manual review
        </span>
      )
  }
}

// ── Deposit card ──

function DepositCard({
  match,
  result,
  onApplyTransfer,
  loading,
  dryRun,
  feeAccountCode,
}: {
  match: DepositMatch
  result?: ClearingApplyResponse
  onApplyTransfer: () => void
  loading: boolean
  dryRun: boolean
  feeAccountCode: string
}) {
  const isApplied = result?.success && !result.dryRun

  return (
    <div className="card border border-silver-700/30">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white font-semibold">
            NAB Deposit: ${match.deposit.amount.toFixed(2)}
          </div>
          <div className="text-silver-400 text-xs">
            {match.deposit.date} &mdash; ref: {match.deposit.reference || '(none)'}
          </div>
        </div>
        <div className="text-right">
          <ConfidenceBadge confidence={match.matchConfidence} fee={match.impliedFee} />
        </div>
      </div>

      {/* Clearing transactions */}
      <div className="ml-8">
        <div className="text-silver-400 text-xs mb-1">
          {match.clearingTransactions.length} clearing payment(s) &mdash; total: $
          {match.total.toFixed(2)}
        </div>
        <div className="max-h-32 overflow-y-auto space-y-0.5">
          {match.clearingTransactions.map((c) => (
            <div key={c.transactionId} className="text-silver-300 text-xs font-mono">
              ${c.amount.toFixed(2)} &mdash; {c.invoiceNumber || c.reference} &mdash; {c.date}
            </div>
          ))}
        </div>
      </div>

      {/* Fee info */}
      {match.matchConfidence === 'fee-adjusted' && (
        <div className="mt-2 ml-8 text-xs text-amber-400">
          Implied fee: ${match.impliedFee.toFixed(2)}
          {feeAccountCode ? ` \u2192 account ${feeAccountCode}` : ' (set fee account above)'}
        </div>
      )}

      <div className="mt-3 ml-8">
        <button
          onClick={onApplyTransfer}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Applying\u2026' : dryRun ? 'Apply transfer (dry run)' : 'Apply transfer'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mt-3 ml-8 text-xs p-2 rounded ${
            result.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
          }`}
        >
          {result.dryRun ? '\uD83D\uDD0D ' : result.success ? '\u2705 ' : '\u274C '}
          {result.message}
          {isApplied && (
            <p className="mt-1 text-silver-400">
              Transfer created. Go to Xero &rarr; Bank Accounts &rarr; NAB &rarr; Reconcile to confirm.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
