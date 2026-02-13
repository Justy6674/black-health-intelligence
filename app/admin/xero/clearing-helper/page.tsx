'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type {
  ClearingSummaryResponse,
  ClearingApplyResponse,
  DepositMatch,
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

export default function ClearingHelperPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
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

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    setSummary(null)
    setResults(new Map())

    try {
      const res = await fetch(`/api/xero/clearing/summary?date=${date}`)
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

    try {
      const res = await fetch('/api/xero/clearing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankTransactionId: match.deposit.bankTransactionId,
          clearingTransactionIds: match.clearingTransactions.map((c) => c.transactionId),
          dryRun,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data: ClearingApplyResponse = await res.json()
      newResults.set(match.deposit.bankTransactionId, data)

      saveClearingEntry({
        timestamp: new Date().toISOString(),
        date,
        bankTransactionId: match.deposit.bankTransactionId,
        amount: match.deposit.amount,
        clearingCount: match.clearingTransactions.length,
        dryRun,
        success: data.success,
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
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Clearing Account Reconciliation</h1>
          <p className="text-silver-400 text-sm">
            Match NAB deposits to Halaxy clearing-account payments — expert / accounting tool
          </p>
        </div>
      </div>

      {/* Date picker + fetch */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Select Date</h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-charcoal border border-silver-700/30 rounded px-3 py-2 text-white"
          />
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="px-4 py-2 bg-slate-blue/20 text-white rounded hover:bg-slate-blue/40 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Loading…' : 'Load Summary'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">❌ {error}</p>
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
                  ? '(Preview only — no changes will be made)'
                  : '⚠️ Live mode — changes will be applied to Xero'}
              </span>
            </div>
          </div>

          {/* Matched deposits */}
          {summary.deposits.length > 0 ? (
            <div className="space-y-4 mb-6">
              {summary.deposits.map((match) => (
                <DepositCard
                  key={match.deposit.bankTransactionId}
                  match={match}
                  result={results.get(match.deposit.bankTransactionId)}
                  onApplyTransfer={() => requestApplyForMatch(match)}
                  loading={loading}
                  dryRun={dryRun}
                />
              ))}
            </div>
          ) : (
            <div className="card mb-6">
              <p className="text-silver-400">No matched deposits found for {date}</p>
            </div>
          )}

          {/* Unmatched deposits */}
          {summary.unmatchedDeposits.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-yellow-400 mb-3">
                ⚠️ Unmatched Deposits ({summary.unmatchedDeposits.length})
              </h2>
              <div className="space-y-2 text-sm">
                {summary.unmatchedDeposits.map((d) => (
                  <div key={d.bankTransactionId} className="text-silver-300">
                    ${d.amount.toFixed(2)} — ref: {d.reference || '(none)'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched clearing transactions */}
          {summary.unmatchedClearing.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-yellow-400 mb-3">
                ⚠️ Unmatched Clearing Transactions ({summary.unmatchedClearing.length})
              </h2>
              <div className="space-y-2 text-sm">
                {summary.unmatchedClearing.map((c) => (
                  <div key={c.transactionId} className="text-silver-300">
                    ${c.amount.toFixed(2)} — {c.invoiceNumber || c.reference || '(no ref)'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm modal */}
          {confirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="card max-w-md w-full">
                <h3 className="text-lg font-semibold text-white mb-3">Confirm Transfer</h3>
                <div className="text-sm text-silver-300 space-y-2 mb-4">
                  <p>Deposit: ${confirmModal.deposit.amount.toFixed(2)} — {confirmModal.deposit.date}</p>
                  <p>Ref: {confirmModal.deposit.reference || '(none)'}</p>
                  <p>
                    {confirmModal.clearingTransactions.length} clearing transaction(s) — total: $
                    {confirmModal.total.toFixed(2)}
                  </p>
                </div>
                <p className="text-amber-400 text-sm mb-4">
                  {dryRun
                    ? 'Dry run — no changes will be made.'
                    : 'This will create a bank transfer in Xero.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 bg-silver-700 text-white rounded hover:bg-silver-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmApply}
                    disabled={loading}
                    className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? 'Applying…' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {clearingHistory.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-3">History</h2>
              <div className="space-y-1 text-xs font-mono text-silver-400 max-h-40 overflow-y-auto">
                {clearingHistory.slice(0, 20).map((e, i) => (
                  <div key={i}>
                    {new Date(e.timestamp).toLocaleString()} — {e.date} — $
                    {e.amount.toFixed(2)} — {e.clearingCount} txns —{' '}
                    {e.dryRun ? 'dry run' : e.success ? '✓' : '✗'}
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

// ── Sub‑component ──

function DepositCard({
  match,
  result,
  onApplyTransfer,
  loading,
  dryRun,
}: {
  match: DepositMatch
  result?: ClearingApplyResponse
  onApplyTransfer: () => void
  loading: boolean
  dryRun: boolean
}) {
  return (
    <div className="card border border-silver-700/30">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white font-semibold">
            NAB Deposit: ${match.deposit.amount.toFixed(2)}
          </div>
          <div className="text-silver-400 text-xs">
            {match.deposit.date} — ref: {match.deposit.reference || '(none)'}
          </div>
        </div>
        <div className="text-right">
          {match.isExactMatch ? (
            <span className="text-green-400 text-xs font-medium">✓ Exact match</span>
          ) : (
            <span className="text-yellow-400 text-xs font-medium">
              Δ ${match.difference.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Clearing transactions */}
      <div className="ml-8">
        <div className="text-silver-400 text-xs mb-1">
          {match.clearingTransactions.length} clearing payment(s) — total: $
          {match.total.toFixed(2)}
        </div>
        <div className="max-h-32 overflow-y-auto space-y-0.5">
          {match.clearingTransactions.map((c) => (
            <div key={c.transactionId} className="text-silver-300 text-xs font-mono">
              ${c.amount.toFixed(2)} — {c.invoiceNumber || c.reference}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 ml-8">
        <button
          onClick={onApplyTransfer}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Applying…' : dryRun ? 'Apply transfer (dry run)' : 'Apply transfer'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mt-3 ml-8 text-xs p-2 rounded ${
            result.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
          }`}
        >
          {result.dryRun ? '🔍 ' : result.success ? '✅ ' : '❌ '}
          {result.message}
        </div>
      )}
    </div>
  )
}
