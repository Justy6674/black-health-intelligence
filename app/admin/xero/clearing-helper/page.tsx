'use client'

import { useState } from 'react'
import Link from 'next/link'
import type {
  ClearingSummaryResponse,
  ClearingApplyResponse,
  DepositMatch,
} from '@/lib/xero/types'

export default function ClearingHelperPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ClearingSummaryResponse | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dryRun, setDryRun] = useState(true)
  const [results, setResults] = useState<Map<string, ClearingApplyResponse>>(new Map())
  const [error, setError] = useState('')

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    setSummary(null)
    setResults(new Map())
    setSelected(new Set())

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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applySelected = async () => {
    if (!summary) return
    setLoading(true)
    setError('')

    const newResults = new Map(results)

    for (const match of summary.deposits) {
      if (!selected.has(match.deposit.bankTransactionId)) continue

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
    }

    setResults(newResults)
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
            <div className="flex items-center justify-between">
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
              <button
                onClick={applySelected}
                disabled={loading || selected.size === 0}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                  dryRun
                    ? 'bg-slate-blue/20 text-white hover:bg-slate-blue/40'
                    : 'bg-green-700 text-white hover:bg-green-600'
                }`}
              >
                {loading
                  ? 'Processing…'
                  : dryRun
                    ? `Preview ${selected.size} Selected`
                    : `Apply ${selected.size} Selected`}
              </button>
            </div>
          </div>

          {/* Matched deposits */}
          {summary.deposits.length > 0 ? (
            <div className="space-y-4 mb-6">
              {summary.deposits.map((match) => (
                <DepositCard
                  key={match.deposit.bankTransactionId}
                  match={match}
                  isSelected={selected.has(match.deposit.bankTransactionId)}
                  onToggle={() => toggleSelect(match.deposit.bankTransactionId)}
                  result={results.get(match.deposit.bankTransactionId)}
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
        </>
      )}
    </div>
  )
}

// ── Sub‑component ──

function DepositCard({
  match,
  isSelected,
  onToggle,
  result,
}: {
  match: DepositMatch
  isSelected: boolean
  onToggle: () => void
  result?: ClearingApplyResponse
}) {
  return (
    <div
      className={`card border ${
        isSelected ? 'border-blue-500/50' : 'border-silver-700/30'
      } transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="rounded mt-1"
          />
          <div>
            <div className="text-white font-semibold">
              NAB Deposit: ${match.deposit.amount.toFixed(2)}
            </div>
            <div className="text-silver-400 text-xs">
              {match.deposit.date} — ref: {match.deposit.reference || '(none)'}
            </div>
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
