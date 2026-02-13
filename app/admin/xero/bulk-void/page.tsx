'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { ParsedInvoice, BulkVoidResponse, BulkVoidAuditEntry } from '@/lib/xero/types'

const AUDIT_STORAGE_KEY = 'xero_bulk_void_history'
const MAX_CUTOFF = '2026-01-01' // Do not allow cutoff after this without confirmation

// ── CSV helpers ──

function parseCSV(text: string): ParsedInvoice[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase())

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
      (h.includes('invoice') && h.includes('date')) || // "invoice date", "invoicedate"
      (h.includes('due') && h.includes('date')) // "due date"
  )
  // Prefer "total" for invoice amount; "taxamount"/"amountdue" come before "total" in Xero exports
  const totalIdx = headers.findIndex((h) => h === 'total')
  const amtIdx =
    totalIdx >= 0
      ? totalIdx
      : headers.findIndex((h) => h.includes('total') || h.includes('amount'))
  const statusIdx = headers.findIndex((h) => h === 'status')

  if (numIdx === -1) return []

  const rowMap = new Map<string, { date: string; amount: number; status?: string }>()
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    const invoiceNumber = cols[numIdx]?.replace(/"/g, '').trim()
    if (!invoiceNumber) continue
    const date = cols[dateIdx]?.replace(/"/g, '').trim() ?? ''
    const amount = parseFloat(cols[amtIdx]?.replace(/"/g, '').trim() ?? '0') || 0
    const status = statusIdx >= 0 ? cols[statusIdx]?.replace(/"/g, '').trim() : undefined
    const existing = rowMap.get(invoiceNumber)
    if (existing) {
      existing.amount += amount
    } else {
      rowMap.set(invoiceNumber, { date, amount, status })
    }
  }
  return Array.from(rowMap.entries()).map(([invoiceNumber, { date, amount, status }]) => ({
    invoiceNumber,
    date,
    amount,
    status,
  }))
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** Parse date from AU/UK DD/MM/YYYY or ISO YYYY-MM-DD. new Date() mishandles DD/MM/YYYY. */
function parseDateSafe(dateStr: string): Date | null {
  const s = (dateStr ?? '').trim()
  if (!s) return null
  // ISO: 2025-09-26
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3])
    return isNaN(d.getTime()) ? null : d
  }
  // AU/UK: 26/09/2025 or 26-09-2025
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(s)
  if (dmy) {
    const day = +dmy[1]
    const month = +dmy[2] - 1
    const year = +dmy[3]
    const d = new Date(year, month, day)
    return isNaN(d.getTime()) ? null : d
  }
  const fallback = new Date(s)
  return isNaN(fallback.getTime()) ? null : fallback
}

function isBeforeCutoff(dateStr: string, cutoff: string): boolean {
  const parsed = parseDateSafe(dateStr)
  const cutoffDate = new Date(cutoff)
  if (!parsed || isNaN(cutoffDate.getTime())) return false
  return parsed < cutoffDate
}

/** AUTHORISED / Awaiting Payment only. PAID/DRAFT/VOIDED = not safe to void. */
function isVoidableStatus(status: string | undefined): boolean {
  if (!status) return true
  const s = status.toUpperCase().replace(/\s+/g, ' ')
  return (
    s === 'AUTHORISED' ||
    s === 'AUTHORIZED' ||
    s.includes('AWAITING') ||
    s.includes('AUTHOR')
  )
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(n)
}

function loadAuditHistory(): BulkVoidAuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveAuditEntry(entry: BulkVoidAuditEntry) {
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

// ── Component ──

export default function BulkVoidPage() {
  const [allInvoices, setAllInvoices] = useState<ParsedInvoice[]>([])
  const [cutoffDate, setCutoffDate] = useState(MAX_CUTOFF)
  const [allowCutoffAfterMax, setAllowCutoffAfterMax] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkVoidResponse | null>(null)
  const [error, setError] = useState('')
  const [hasDryRunThisSession, setHasDryRunThisSession] = useState(false)
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const [auditHistory, setAuditHistory] = useState<BulkVoidAuditEntry[]>([])

  const [xeroStatus, setXeroStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [xeroOrgName, setXeroOrgName] = useState<string | null>(null)
  const [xeroError, setXeroError] = useState<string | null>(null)

  // Strict filtering: date < cutoff, status = AUTHORISED/Awaiting Payment only
  const dateFiltered = allInvoices.filter((inv) => isBeforeCutoff(inv.date, cutoffDate))
  const toVoid = dateFiltered.filter((inv) => isVoidableStatus(inv.status))
  const skipped = dateFiltered.filter((inv) => !isVoidableStatus(inv.status))

  const totalAmount = toVoid.reduce((sum, inv) => sum + inv.amount, 0)
  const requiredPhrase = `VOID ${toVoid.length} INVOICES TOTAL ${formatAmount(totalAmount)}`
  const phraseMatches =
    confirmationPhrase.trim().toUpperCase() === requiredPhrase.trim().toUpperCase()

  const cutoffExceedsMax = cutoffDate > MAX_CUTOFF
  const cutoffAllowed = !cutoffExceedsMax || allowCutoffAfterMax
  const hasDateFilter = cutoffDate && allInvoices.length > 0

  useEffect(() => {
    setAuditHistory(loadAuditHistory())
  }, [result])

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

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null)
    setError('')
    setHasDryRunThisSession(false)
    setConfirmationPhrase('')
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError('Could not parse any invoices from the CSV. Ensure it has an "InvoiceNumber" column.')
        return
      }
      setAllInvoices(parsed)
    }
    reader.readAsText(file)
  }, [])

  const callBulkVoid = async (dryRun: boolean) => {
    if (toVoid.length === 0) return
    if (!dryRun && !hasDryRunThisSession) {
      setError('You must run a dry-run first before making changes in Xero.')
      return
    }
    if (!dryRun && !phraseMatches) {
      setError(`Type the confirmation phrase exactly: ${requiredPhrase}`)
      return
    }
    if (!cutoffAllowed) {
      setError('Cutoff date exceeds 2026-01-01. Tick "I know what I\'m doing" to proceed.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/xero/bulk-void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumbers: toVoid.map((i) => i.invoiceNumber),
          dryRun,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data: BulkVoidResponse = await res.json()
      setResult(data)
      if (dryRun) setHasDryRunThisSession(true)
      if (!dryRun && data.user) {
        const entry: BulkVoidAuditEntry = {
          timestamp: new Date().toISOString(),
          user: data.user,
          cutoffDate,
          attempted: data.attempted,
          voided: data.voided,
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
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Xero Bulk Void Tool</h1>
          <p className="text-silver-400 text-sm">
            Void Halaxy-origin invoices before 1 Jan 2026 in Xero (safe, reversible workflow)
          </p>
        </div>
        <div className="ml-auto">
          {xeroStatus === 'loading' && (
            <span className="text-sm text-silver-400">Xero: Checking…</span>
          )}
          {xeroStatus === 'ok' && (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded text-sm text-green-400 bg-green-900/20 border border-green-600/30">
              Xero: Connected ({xeroOrgName ?? 'OK'})
            </span>
          )}
          {xeroStatus === 'error' && (
            <span
              className="inline-flex items-center gap-2 px-2 py-1 rounded text-sm text-amber-400 bg-amber-900/20 border border-amber-600/30"
              title={xeroError ?? undefined}
            >
              Xero: {xeroError ?? 'Check failed'}
            </span>
          )}
        </div>
      </div>

      {/* Step 1: Upload CSV */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Step 1 — Upload Xero Invoice CSV</h2>
        <p className="text-silver-400 text-sm mb-3">
          Export from Xero (Sales → Invoices, filter 26 Sep–31 Dec 2025), save as CSV.
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-silver-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-blue/20 file:text-white hover:file:bg-slate-blue/40 cursor-pointer"
        />
        {allInvoices.length > 0 && (
          <p className="mt-2 text-sm text-green-400">✓ Loaded {allInvoices.length} invoices</p>
        )}
      </div>

      {/* Step 2: Cutoff + pre-flight */}
      {allInvoices.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Step 2 — Cutoff & Pre-flight</h2>
          <p className="text-silver-400 text-sm mb-3">
            Only invoices with date <strong>before</strong> this cutoff will be voided.
          </p>
          <input
            type="date"
            value={cutoffDate}
            onChange={(e) => {
              setCutoffDate(e.target.value)
              setResult(null)
              setHasDryRunThisSession(false)
            }}
            className="bg-charcoal border border-silver-700/30 rounded px-3 py-2 text-white"
          />
          {cutoffExceedsMax && (
            <div className="mt-4 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowCutoffAfterMax}
                  onChange={(e) => {
                    setAllowCutoffAfterMax(e.target.checked)
                    setResult(null)
                  }}
                  className="rounded border-silver-600 bg-charcoal text-slate-blue"
                />
                <span className="text-sm text-amber-400">
                  I know what I&apos;m doing (cutoff after 2026-01-01)
                </span>
              </label>
            </div>
          )}
          <div className="mt-4 p-4 bg-charcoal/50 rounded border border-silver-700/30">
            <div className="text-white font-medium">
              {toVoid.length} invoices will be voided.
            </div>
            <div className="text-silver-300 text-sm mt-1">
              Total value affected: {formatAmount(totalAmount)}
            </div>
          </div>
          {skipped.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-amber-400 mb-2">
                Skipped — not safe to void ({skipped.length})
              </h3>
              <div className="max-h-32 overflow-y-auto text-xs font-mono space-y-1 text-silver-400">
                {skipped.slice(0, 50).map((inv) => (
                  <div key={inv.invoiceNumber}>
                    {inv.invoiceNumber} — {inv.status ?? '?'} — {formatAmount(inv.amount)}
                  </div>
                ))}
                {skipped.length > 50 && (
                  <div className="text-silver-500">… and {skipped.length - 50} more</div>
                )}
              </div>
            </div>
          )}

          {toVoid.length === 0 && allInvoices.length > 0 && (
            <div className="mt-4 p-4 bg-amber-900/15 border border-amber-600/30 rounded">
              <h3 className="text-sm font-medium text-amber-400 mb-3">Why 0 invoices?</h3>
              <div className="text-sm text-silver-300 space-y-1 mb-3">
                <div>• {allInvoices.length} invoices loaded from CSV</div>
                <div>• {dateFiltered.length} have date before {cutoffDate} (in range)</div>
                <div>• Of those: {toVoid.length} are voidable (AUTHORISED / Awaiting Payment)</div>
                <div>• {skipped.length} skipped (PAID, VOIDED, or DRAFT — not safe to void)</div>
              </div>
              <div className="text-xs text-silver-400 space-y-1">
                {dateFiltered.length === 0 ? (
                  <p>Try exporting a different date range from Xero, or adjust the cutoff date.</p>
                ) : (
                  <p>All invoices in range are already PAID, VOIDED, or DRAFT.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview + actions */}
      {toVoid.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Step 3 — Preview ({toVoid.length} invoices)
          </h2>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-silver-400 border-b border-silver-700/30">
                <tr>
                  <th className="py-2 pr-4">Invoice Number</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  {toVoid.some((i) => i.status) && <th className="py-2 pr-4">Status</th>}
                </tr>
              </thead>
              <tbody className="text-silver-200">
                {toVoid.slice(0, 200).map((inv) => (
                  <tr key={inv.invoiceNumber} className="border-b border-silver-700/10">
                    <td className="py-1.5 pr-4 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="py-1.5 pr-4">{inv.date}</td>
                    <td className="py-1.5 pr-4 text-right">{formatAmount(inv.amount)}</td>
                    {toVoid.some((i) => i.status) && (
                      <td className="py-1.5 pr-4">{inv.status ?? '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {toVoid.length > 200 && (
              <p className="text-silver-500 text-xs mt-2">Showing first 200 of {toVoid.length}</p>
            )}
          </div>

          {/* Confirmation phrase for real void */}
          {hasDryRunThisSession && (
            <div className="mt-4 p-4 bg-amber-900/20 border border-amber-600/30 rounded">
              <p className="text-sm text-amber-200 mb-2">Type this exactly to enable Void:</p>
              <code className="block text-xs text-white mb-2 font-mono">
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

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => callBulkVoid(true)}
              disabled={loading || !cutoffAllowed}
              className="px-4 py-2 bg-slate-blue/20 text-white rounded hover:bg-slate-blue/40 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Running…' : '🔍 Dry Run (required first)'}
            </button>
            <button
              onClick={() => callBulkVoid(false)}
              disabled={loading || !hasDryRunThisSession || !phraseMatches || !cutoffAllowed}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-bold"
            >
              {loading ? 'Voiding…' : `🗑️ Void ${toVoid.length} Invoices Now`}
            </button>
          </div>
          {!hasDryRunThisSession && toVoid.length > 0 && (
            <p className="mt-2 text-sm text-amber-400">
              You must run a dry-run first before making changes in Xero.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            {result.dryRun ? '🔍 Dry Run Result' : '✅ Void Result'}
          </h2>
          {result.stoppedEarly && (
            <p className="text-amber-400 text-sm mb-3">
              ⚠️ Stopped early due to API error. Partial results below.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-silver-400 text-xs">Total</div>
              <div className="text-xl font-bold text-white">{result.total}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Attempted</div>
              <div className="text-xl font-bold text-white">{result.attempted}</div>
            </div>
            <div>
              <div className="text-silver-400 text-xs">Voided</div>
              <div className="text-xl font-bold text-green-400">{result.voided}</div>
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

      {auditHistory.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-3">History</h2>
          <div className="space-y-2 text-xs font-mono text-silver-400 max-h-48 overflow-y-auto">
            {auditHistory.slice(0, 20).map((entry, i) => (
              <div key={i} className="border-b border-silver-700/20 pb-2">
                {new Date(entry.timestamp).toLocaleString()} — {entry.user} — cutoff {entry.cutoffDate}
                — attempted {entry.attempted}, voided {entry.voided}, failed {entry.failed}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
