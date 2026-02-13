'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { BulkDeleteResponse, BulkDeleteAuditEntry, XeroInvoiceSummary } from '@/lib/xero/types'

const AUDIT_STORAGE_KEY = 'xero_bulk_delete_history'
const DEFAULT_CUTOFF = '2026-01-01'
const MAX_DISPLAY_ROWS = 200

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(n)
}

function loadAuditHistory(): BulkDeleteAuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveAuditEntry(entry: BulkDeleteAuditEntry) {
  if (typeof window === 'undefined') return
  try {
    const history = loadAuditHistory()
    history.unshift(entry)
    const trimmed = history.slice(0, 50)
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore
  }
}

export default function BulkDeletePage() {
  const [cutoffDate, setCutoffDate] = useState(DEFAULT_CUTOFF)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [invoices, setInvoices] = useState<XeroInvoiceSummary[]>([])
  const [result, setResult] = useState<BulkDeleteResponse | null>(null)
  const [error, setError] = useState('')
  const [hasDryRunThisSession, setHasDryRunThisSession] = useState(false)
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const [auditHistory, setAuditHistory] = useState<BulkDeleteAuditEntry[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Categorise invoices
  const draftInvoices = invoices.filter(
    (inv) => inv.status === 'DRAFT' || inv.status === 'SUBMITTED'
  )
  const authorisedInvoices = invoices.filter((inv) => inv.status === 'AUTHORISED')
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0)

  const requiredPhrase = `DELETE ${invoices.length} INVOICES TOTAL ${formatAmount(totalAmount)}`
  const phraseMatches =
    confirmationPhrase.trim().toUpperCase() === requiredPhrase.trim().toUpperCase()

  useEffect(() => {
    setAuditHistory(loadAuditHistory())
  }, [result])

  const fetchInvoices = useCallback(async () => {
    setFetching(true)
    setError('')
    setResult(null)
    setInvoices([])
    setHasDryRunThisSession(false)
    setConfirmationPhrase('')

    try {
      const res = await fetch('/api/xero/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cutoffDate, dryRun: true, fetchOnly: true }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data: BulkDeleteResponse = await res.json()
      setInvoices(data.invoices ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFetching(false)
    }
  }, [cutoffDate])

  const callBulkDelete = async (dryRun: boolean) => {
    if (invoices.length === 0) return
    if (!dryRun && !hasDryRunThisSession) {
      setError('You must run a dry-run first before making changes in Xero.')
      return
    }
    if (!dryRun && !phraseMatches) {
      setError(`Type the confirmation phrase exactly: ${requiredPhrase}`)
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    setShowConfirmModal(false)

    try {
      const res = await fetch('/api/xero/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cutoffDate, dryRun }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data: BulkDeleteResponse = await res.json()
      setResult(data)
      if (dryRun) setHasDryRunThisSession(true)

      if (!dryRun && data.user) {
        const entry: BulkDeleteAuditEntry = {
          timestamp: new Date().toISOString(),
          user: data.user,
          cutoffDate,
          totalFound: data.totalFound,
          deleted: data.deleted,
          voided: data.voided,
          skipped: data.skipped,
          failed: data.errors.length,
          dryRun: false,
        }
        saveAuditEntry(entry)
        setAuditHistory(loadAuditHistory())
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Xero Bulk Delete Tool</h1>
          <p className="text-silver-400 text-sm">
            Delete (DRAFT) or void (AUTHORISED) invoices before a cutoff date directly from Xero
          </p>
        </div>
      </div>

      {/* Step 1: Cutoff date & fetch */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Step 1 — Set Cutoff Date & Fetch</h2>
        <p className="text-silver-400 text-sm mb-3">
          Invoices dated <strong>before</strong> this date will be fetched from Xero.
          DRAFT invoices will be <strong>deleted</strong>; AUTHORISED invoices will be{' '}
          <strong>voided</strong>. Paid invoices are excluded automatically.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={cutoffDate}
            onChange={(e) => {
              setCutoffDate(e.target.value)
              setResult(null)
              setInvoices([])
              setHasDryRunThisSession(false)
            }}
            className="bg-charcoal border border-silver-700/30 rounded px-3 py-2 text-white"
          />
          <button
            onClick={fetchInvoices}
            disabled={fetching || !cutoffDate}
            className="px-4 py-2 bg-slate-blue/20 text-white rounded hover:bg-slate-blue/40 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {fetching ? 'Fetching…' : '🔍 Fetch Invoices from Xero'}
          </button>
        </div>
      </div>

      {/* Step 2: Preview */}
      {invoices.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Step 2 — Preview ({invoices.length} invoices found)
          </h2>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">Total Found</div>
              <div className="text-xl font-bold text-white">{invoices.length}</div>
            </div>
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">Draft (will delete)</div>
              <div className="text-xl font-bold text-amber-400">{draftInvoices.length}</div>
            </div>
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">Authorised (will void)</div>
              <div className="text-xl font-bold text-blue-400">{authorisedInvoices.length}</div>
            </div>
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">Total Value</div>
              <div className="text-xl font-bold text-white">{formatAmount(totalAmount)}</div>
            </div>
          </div>

          {/* Invoice table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-silver-400 border-b border-silver-700/30 sticky top-0 bg-charcoal">
                <tr>
                  <th className="py-2 pr-4">Invoice #</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-silver-200">
                {invoices.slice(0, MAX_DISPLAY_ROWS).map((inv) => (
                  <tr key={inv.invoiceId} className="border-b border-silver-700/10">
                    <td className="py-1.5 pr-4 font-mono text-xs">{inv.invoiceNumber || '—'}</td>
                    <td className="py-1.5 pr-4">{inv.date}</td>
                    <td className="py-1.5 pr-4 truncate max-w-[150px]">{inv.contact}</td>
                    <td className="py-1.5 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          inv.status === 'DRAFT' || inv.status === 'SUBMITTED'
                            ? 'bg-amber-900/30 text-amber-300'
                            : 'bg-blue-900/30 text-blue-300'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4 text-xs">
                      {inv.status === 'DRAFT' || inv.status === 'SUBMITTED' ? (
                        <span className="text-amber-400">Delete</span>
                      ) : (
                        <span className="text-blue-400">Void</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-4 text-right">{formatAmount(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length > MAX_DISPLAY_ROWS && (
              <p className="text-silver-500 text-xs mt-2">
                Showing first {MAX_DISPLAY_ROWS} of {invoices.length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Actions */}
      {invoices.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Step 3 — Execute</h2>

          {/* Confirmation phrase for live run */}
          {hasDryRunThisSession && (
            <div className="mb-4 p-4 bg-amber-900/20 border border-amber-600/30 rounded">
              <p className="text-sm text-amber-200 mb-2">
                Type this exactly to enable live delete/void:
              </p>
              <code className="block text-xs text-white mb-2 font-mono break-all">
                {requiredPhrase}
              </code>
              <input
                type="text"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                placeholder="Paste or type the phrase above"
                className="w-full px-3 py-2 bg-charcoal border border-silver-600 rounded text-white text-sm font-mono"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => callBulkDelete(true)}
              disabled={loading}
              className="px-4 py-2 bg-slate-blue/20 text-white rounded hover:bg-slate-blue/40 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Running…' : '🔍 Dry Run (required first)'}
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={loading || !hasDryRunThisSession || !phraseMatches}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-bold"
            >
              🗑️ Delete / Void {invoices.length} Invoices
            </button>
          </div>
          {!hasDryRunThisSession && invoices.length > 0 && (
            <p className="mt-2 text-sm text-amber-400">
              You must run a dry-run first before making changes in Xero.
            </p>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-charcoal border border-silver-700/30 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">⚠️ Confirm Bulk Delete</h3>
            <div className="space-y-2 text-sm text-silver-300 mb-4">
              <p>
                Cutoff date: <strong className="text-white">{cutoffDate}</strong>
              </p>
              <p>
                Total invoices: <strong className="text-white">{invoices.length}</strong>
              </p>
              <p>
                Draft → <strong className="text-amber-400">Delete ({draftInvoices.length})</strong>
              </p>
              <p>
                Authorised → <strong className="text-blue-400">Void ({authorisedInvoices.length})</strong>
              </p>
              <p>
                Total value: <strong className="text-white">{formatAmount(totalAmount)}</strong>
              </p>
            </div>
            <p className="text-red-400 text-xs mb-4">
              This action cannot be undone for deleted (DRAFT) invoices. Voided invoices remain in
              Xero for audit purposes but cannot be reinstated.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="px-4 py-2 bg-silver-700/20 text-silver-300 rounded hover:bg-silver-700/40 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => callBulkDelete(false)}
                disabled={loading}
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-bold"
              >
                {loading ? 'Deleting…' : '🗑️ Confirm Delete / Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            {result.dryRun ? '🔍 Dry Run Result' : '✅ Delete / Void Result'}
          </h2>
          {result.stoppedEarly && (
            <p className="text-amber-400 text-sm mb-3">
              ⚠️ Stopped early due to API error. Partial results below.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <div className="text-silver-400 text-xs">Found</div>
              <div className="text-xl font-bold text-white">{result.totalFound}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Deleted</div>
              <div className="text-xl font-bold text-amber-400">{result.deleted}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Voided</div>
              <div className="text-xl font-bold text-blue-400">{result.voided}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Skipped</div>
              <div className="text-xl font-bold text-silver-400">{result.skipped}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Errors</div>
              <div className="text-xl font-bold text-red-400">{result.errors.length}</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-medium text-red-400 mb-2">Errors:</h3>
              <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-red-300">
                    {e.invoiceNumber}: {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit History */}
      {auditHistory.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-3">History</h2>
          <div className="space-y-2 text-xs font-mono text-silver-400 max-h-48 overflow-y-auto">
            {auditHistory.slice(0, 20).map((entry, i) => (
              <div key={i} className="border-b border-silver-700/20 pb-2">
                {new Date(entry.timestamp).toLocaleString()} — {entry.user} — cutoff{' '}
                {entry.cutoffDate} — found {entry.totalFound}, deleted {entry.deleted}, voided{' '}
                {entry.voided}, skipped {entry.skipped}, failed {entry.failed}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
