'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type {
  InvoiceCleanupResponse,
  InvoiceCleanupItem,
  InvoiceCleanupInputMode,
  InvoiceCleanupAction,
  ParsedInvoice,
} from '@/lib/xero/types'

const AUDIT_STORAGE_KEY = 'xero_invoice_cleanup_history'
const DEFAULT_CUTOFF = '2026-01-01'
const MAX_DISPLAY_ROWS = 200

// ── CSV helpers ──
function splitLine(line: string, delim: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === delim && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): ParsedInvoice[] {
  const raw = text.replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headerLine = lines[0]
  const byComma = splitLine(headerLine, ',').length
  const byTab = splitLine(headerLine, '\t').length
  const delimiter = byTab > byComma ? '\t' : ','
  const headers = splitLine(headerLine, delimiter).map((h) =>
    h.replace(/"/g, '').trim().toLowerCase()
  )
  const numIdx = headers.findIndex(
    (h) =>
      (h.includes('invoice') && h.includes('number')) ||
      (h.includes('invoice') && h.includes('no'))
  )
  const dateIdx = headers.findIndex(
    (h) =>
      h === 'date' ||
      h === 'invoice date' ||
      h === 'due date' ||
      (h.includes('invoice') && h.includes('date')) ||
      (h.includes('due') && h.includes('date'))
  )
  const totalIdx = headers.findIndex((h) => h === 'total')
  const amtIdx =
    totalIdx >= 0
      ? totalIdx
      : headers.findIndex((h) => h.includes('total') || h.includes('amount'))
  if (numIdx === -1) return []
  const rowMap = new Map<string, { date: string; amount: number }>()
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delimiter)
    const invoiceNumber = cols[numIdx]?.replace(/"/g, '').trim()
    if (!invoiceNumber) continue
    const date = cols[dateIdx]?.replace(/"/g, '').trim() ?? ''
    const amount = parseFloat(cols[amtIdx]?.replace(/"/g, '').trim() ?? '0') || 0
    const existing = rowMap.get(invoiceNumber)
    if (existing) {
      existing.amount += amount
    } else {
      rowMap.set(invoiceNumber, { date, amount })
    }
  }
  return Array.from(rowMap.entries()).map(([invoiceNumber, { date, amount }]) => ({
    invoiceNumber,
    date,
    amount,
  }))
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(n)
}

function actionLabel(a: InvoiceCleanupAction): string {
  if (a === 'DELETE') return 'Delete'
  if (a === 'VOID') return 'Void'
  if (a === 'UNPAY_VOID') return 'Un-pay + Void'
  return 'Skip'
}

function actionColor(a: InvoiceCleanupAction): string {
  if (a === 'DELETE') return 'bg-amber-900/30 text-amber-300'
  if (a === 'VOID') return 'bg-blue-900/30 text-blue-300'
  if (a === 'UNPAY_VOID') return 'bg-red-900/30 text-red-300'
  return 'bg-silver-700/30 text-silver-400'
}

type AuditEntry = {
  timestamp: string
  user: string
  inputMode: InvoiceCleanupInputMode
  cutoffDate?: string
  total: number
  deleted: number
  voided: number
  paymentsRemoved: number
  failed: number
}

function loadAuditHistory(): AuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveAuditEntry(entry: AuditEntry) {
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

export default function InvoiceCleanupPage() {
  const [inputMode, setInputMode] = useState<InvoiceCleanupInputMode>('fetch')
  const [cutoffDate, setCutoffDate] = useState(DEFAULT_CUTOFF)
  const [csvInvoiceNumbers, setCsvInvoiceNumbers] = useState<string[]>([])
  const [invoices, setInvoices] = useState<InvoiceCleanupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InvoiceCleanupResponse | null>(null)
  const [error, setError] = useState('')
  const [hasDryRunThisSession, setHasDryRunThisSession] = useState(false)
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [xeroStatus, setXeroStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [xeroOrgName, setXeroOrgName] = useState<string | null>(null)
  const [xeroError, setXeroError] = useState<string | null>(null)

  const actionableCount = invoices.filter(
    (i) => i.action === 'DELETE' || i.action === 'VOID' || i.action === 'UNPAY_VOID'
  ).length
  const totalAmount = invoices.reduce((s, i) => s + i.total, 0)
  const requiredPhrase = `CLEANUP ${actionableCount} INVOICES TOTAL ${formatAmount(totalAmount)}`
  const phraseMatches =
    confirmationPhrase.trim().toUpperCase() === requiredPhrase.trim().toUpperCase()

  const toDelete = result?.toDelete ?? invoices.filter((i) => i.action === 'DELETE').length
  const toVoid = result?.toVoid ?? invoices.filter((i) => i.action === 'VOID').length
  const toUnpayVoid =
    result?.toUnpayVoid ?? invoices.filter((i) => i.action === 'UNPAY_VOID').length
  const skipped = result?.skipped ?? invoices.filter((i) => i.action === 'SKIP').length

  useEffect(() => {
    setAuditHistory(loadAuditHistory())
  }, [result])

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const mode = params.get('mode')
    if (mode === 'csv' || mode === 'fetch') setInputMode(mode)
  }, [])

  useEffect(() => {
    setXeroStatus('loading')
    fetch('/api/xero/health')
      .then((res) => res.json())
      .then((data: { ok?: boolean; organisationName?: string; error?: string }) => {
        if (data.ok && data.organisationName) {
          setXeroStatus('ok')
          setXeroOrgName(data.organisationName)
          setXeroError(null)
        } else {
          setXeroStatus('error')
          setXeroOrgName(null)
          setXeroError(data.error ?? 'Check failed')
        }
      })
      .catch(() => {
        setXeroStatus('error')
        setXeroOrgName(null)
        setXeroError('Check failed')
      })
  }, [])

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setInvoices([])
    setHasDryRunThisSession(false)
    setConfirmationPhrase('')
    setShowConfirmModal(false)

    try {
      const body =
        inputMode === 'fetch'
          ? { inputMode: 'fetch' as const, cutoffDate, dryRun: true }
          : {
              inputMode: 'csv' as const,
              invoiceNumbers: csvInvoiceNumbers,
              dryRun: true,
            }
      const res = await fetch('/api/xero/invoice-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      const data: InvoiceCleanupResponse = await res.json()
      setInvoices(data.invoices)
      setResult(data)
      setHasDryRunThisSession(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [inputMode, cutoffDate, csvInvoiceNumbers])

  const executeCleanup = useCallback(
    async (dryRun: boolean) => {
      if (invoices.length === 0) return
      if (!dryRun && !hasDryRunThisSession) {
        setError('You must load preview first (dry run) before making changes.')
        return
      }
      if (!dryRun && !phraseMatches) {
        setError(`Type the confirmation phrase exactly: ${requiredPhrase}`)
        return
      }
      setLoading(true)
      setError('')
      setShowConfirmModal(false)

      try {
        const body = inputMode === 'fetch'
          ? { inputMode: 'fetch' as const, cutoffDate, dryRun }
          : {
              inputMode: 'csv' as const,
              invoiceNumbers: invoices.map((i) => i.invoiceNumber),
              dryRun,
            }
        const res = await fetch('/api/xero/invoice-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Request failed (${res.status})`)
        }
        const data: InvoiceCleanupResponse = await res.json()
        setResult(data)
        if (!dryRun && data.user) {
          saveAuditEntry({
            timestamp: new Date().toISOString(),
            user: data.user,
            inputMode,
            cutoffDate: data.cutoffDate,
            total: data.invoices.length,
            deleted: data.deleted,
            voided: data.voided,
            paymentsRemoved: data.paymentsRemoved,
            failed: data.errors.length,
          })
          setAuditHistory(loadAuditHistory())
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [inputMode, cutoffDate, invoices, hasDryRunThisSession, phraseMatches, requiredPhrase]
  )

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError('Could not parse any invoices from CSV. Ensure it has an InvoiceNumber column.')
        return
      }
      setCsvInvoiceNumbers(parsed.map((p) => p.invoiceNumber))
      setResult(null)
      setInvoices([])
      setHasDryRunThisSession(false)
      setConfirmationPhrase('')
      setError('')
    }
    reader.readAsText(file)
  }, [])

  const canLoad =
    inputMode === 'fetch'
      ? !!cutoffDate
      : csvInvoiceNumbers.length > 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Xero Invoice Cleanup</h1>
          <p className="text-silver-400 text-sm">
            Delete (DRAFT), void (AUTHORISED), or un-pay then void (PAID) in one process
          </p>
        </div>
        <div className="ml-auto">
          {xeroStatus === 'loading' && (
            <span className="text-sm text-silver-400">Xero: Checking…</span>
          )}
          {xeroStatus === 'ok' && (
            <span className="inline-flex gap-2 px-2 py-1 rounded text-sm text-green-400 bg-green-900/20 border border-green-600/30">
              Xero: Connected ({xeroOrgName ?? 'OK'})
            </span>
          )}
          {xeroStatus === 'error' && (
            <span
              className="inline-flex gap-2 px-2 py-1 rounded text-sm text-amber-400 bg-amber-900/20 border border-amber-600/30"
              title={xeroError ?? undefined}
            >
              Xero: {xeroError ?? 'Check failed'}
            </span>
          )}
        </div>
      </div>

      {/* Step 1: Input method */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Step 1 — Choose Input</h2>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === 'fetch'}
              onChange={() => {
                setInputMode('fetch')
                setResult(null)
                setInvoices([])
                setCsvInvoiceNumbers([])
                setHasDryRunThisSession(false)
              }}
              className="text-slate-blue"
            />
            <span className="text-sm text-silver-300">Fetch from Xero by cutoff date</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === 'csv'}
              onChange={() => {
                setInputMode('csv')
                setResult(null)
                setInvoices([])
                setHasDryRunThisSession(false)
              }}
              className="text-slate-blue"
            />
            <span className="text-sm text-silver-300">Upload CSV</span>
          </label>
        </div>

        {inputMode === 'fetch' && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-silver-400">Cutoff date (invoices before):</label>
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
          </div>
        )}

        {inputMode === 'csv' && (
          <div>
            <p className="text-sm text-silver-400 mb-2">
              Export from Xero (Sales → Invoices), save as CSV. Include Invoice Number column.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-silver-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-blue/20 file:text-white hover:file:bg-slate-blue/40 cursor-pointer"
            />
            {csvInvoiceNumbers.length > 0 && (
              <p className="mt-2 text-sm text-green-400">
                ✓ Loaded {csvInvoiceNumbers.length} invoice numbers from CSV
              </p>
            )}
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={loadPreview}
            disabled={loading || !canLoad}
            className="px-4 py-2 bg-slate-blue/20 text-white rounded hover:bg-slate-blue/40 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Loading…' : '🔍 Load & Preview'}
          </button>
        </div>
      </div>

      {/* Step 2: Preview */}
      {invoices.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Step 2 — Preview ({invoices.length} invoices)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">To Delete</div>
              <div className="text-xl font-bold text-amber-400">{toDelete}</div>
            </div>
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">To Void</div>
              <div className="text-xl font-bold text-blue-400">{toVoid}</div>
            </div>
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">Un-pay + Void</div>
              <div className="text-xl font-bold text-red-400">{toUnpayVoid}</div>
            </div>
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">Skipped</div>
              <div className="text-xl font-bold text-silver-400">{skipped}</div>
            </div>
            <div className="p-3 bg-charcoal/50 rounded border border-silver-700/30">
              <div className="text-silver-400 text-xs">Total Value</div>
              <div className="text-xl font-bold text-white">{formatAmount(totalAmount)}</div>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-silver-400 border-b border-silver-700/30 sticky top-0 bg-charcoal">
                <tr>
                  <th className="py-2 pr-4">Invoice #</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-silver-200">
                {invoices.slice(0, MAX_DISPLAY_ROWS).map((inv) => (
                  <tr key={inv.invoiceId} className="border-b border-silver-700/10">
                    <td className="py-1.5 pr-4 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="py-1.5 pr-4">{inv.date}</td>
                    <td className="py-1.5 pr-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-silver-700/30 text-silver-300">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(inv.action)}`}>
                        {actionLabel(inv.action)}
                      </span>
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

      {/* Step 3: Execute */}
      {invoices.length > 0 && actionableCount > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Step 3 — Execute</h2>
          {hasDryRunThisSession && (
            <div className="mb-4 p-4 bg-amber-900/20 border border-amber-600/30 rounded">
              <p className="text-sm text-amber-200 mb-2">Type this exactly to run cleanup:</p>
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
              onClick={() => setShowConfirmModal(true)}
              disabled={loading || !hasDryRunThisSession || !phraseMatches}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-bold"
            >
              🗑️ Run Cleanup ({actionableCount} invoices)
            </button>
          </div>
          <p className="mt-2 text-sm text-silver-400">
            Load & Preview above acts as the dry run. Type the phrase to enable execution.
          </p>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-charcoal border border-silver-700/30 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">⚠️ Confirm Invoice Cleanup</h3>
            <div className="space-y-2 text-sm text-silver-300 mb-4">
              <p>
                Total: <strong className="text-white">{actionableCount}</strong> invoices
              </p>
              <p>
                Delete (DRAFT): <strong className="text-amber-400">{toDelete}</strong>
              </p>
              <p>
                Void (AUTHORISED): <strong className="text-blue-400">{toVoid}</strong>
              </p>
              <p>
                Un-pay + Void (PAID): <strong className="text-red-400">{toUnpayVoid}</strong>
              </p>
              <p>
                Total value: <strong className="text-white">{formatAmount(totalAmount)}</strong>
              </p>
            </div>
            <p className="text-red-400 text-xs mb-4">
              Deleted invoices are permanently removed. Voided invoices remain in Xero for audit.
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
                onClick={() => executeCleanup(false)}
                disabled={loading}
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-bold"
              >
                {loading ? 'Running…' : '🗑️ Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {result && !result.dryRun && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">✅ Result</h2>
          {result.stoppedEarly && (
            <p className="text-amber-400 text-sm mb-3">
              ⚠️ Stopped early due to API error. Partial results below.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <div>
              <div className="text-silver-400 text-xs">Deleted</div>
              <div className="text-xl font-bold text-amber-400">{result.deleted}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Voided</div>
              <div className="text-xl font-bold text-blue-400">{result.voided}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Payments removed</div>
              <div className="text-xl font-bold text-red-400">{result.paymentsRemoved}</div>
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
              <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                Errors:
                <button
                  type="button"
                  onClick={() => {
                    const text = result.errors
                      .map((e) => `${e.invoiceNumber}: ${e.message}`)
                      .join('\n')
                    void navigator.clipboard.writeText(text)
                  }}
                  className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                >
                  Copy
                </button>
              </h3>
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

      {auditHistory.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-3">History</h2>
          <div className="space-y-2 text-xs font-mono text-silver-400 max-h-48 overflow-y-auto">
            {auditHistory.slice(0, 20).map((entry, i) => (
              <div key={i} className="border-b border-silver-700/20 pb-2">
                {new Date(entry.timestamp).toLocaleString()} — {entry.user} [{entry.inputMode}]
                {entry.cutoffDate && ` cutoff ${entry.cutoffDate}`} — total {entry.total}, deleted{' '}
                {entry.deleted}, voided {entry.voided}
                {entry.paymentsRemoved > 0 && `, payments removed ${entry.paymentsRemoved}`}
                {entry.failed > 0 && `, failed ${entry.failed}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
