'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import type {
  ReconciliationResult,
  ThreeWayMatch,
  ThreeWayMatchStatus,
  BatchReconcileResponse,
  ClearingSummaryResponse,
  ClearingApplyResponse,
  DepositMatch,
  MatchConfidence,
  ClearingTransaction,
  ReconciliationGuideResponse,
  GuideDaySummary,
  GuidePayment,
} from '@/lib/xero/types'
import type { MedicareReconciliationResult, MedicareBatchMatch } from '@/lib/xero/client'

// ── Types ──

type ViewMode = 'threeway' | 'legacy' | 'guide' | 'medicare'

const CLEARING_AUDIT_KEY = 'xero_clearing_history'

interface ClearingAuditEntry {
  timestamp: string
  date: string
  bankTransactionId?: string
  amount: number
  clearingCount: number
  dryRun: boolean
  success: boolean
  feeAmount?: number
  batchMode?: boolean
  batchTotal?: number
  batchSucceeded?: number
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
    case 'last30': {
      const month = new Date(today)
      month.setDate(month.getDate() - 29)
      return { from: formatDate(month), to: formatDate(today) }
    }
    default:
      return { from: formatDate(today), to: formatDate(today) }
  }
}

// ── Main Page ──

export default function ClearingHelperPage() {
  const [fromDate, setFromDate] = useState(() => formatDate(new Date()))
  const [toDate, setToDate] = useState(() => formatDate(new Date()))
  const [viewMode, setViewMode] = useState<ViewMode>('threeway')
  const [loading, setLoading] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [error, setError] = useState('')
  const [clearingHistory, setClearingHistory] = useState<ClearingAuditEntry[]>([])

  // Three-way mode state
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null)
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set())
  const [batchResult, setBatchResult] = useState<BatchReconcileResponse | null>(null)
  const [statusFilter, setStatusFilter] = useState<ThreeWayMatchStatus | 'all'>('all')
  const [reconciling, setReconciling] = useState(false)

  // Legacy mode state
  const [legacySummary, setLegacySummary] = useState<ClearingSummaryResponse | null>(null)
  const [toleranceDollars, setToleranceDollars] = useState(5)
  const [feeAccountCode, setFeeAccountCode] = useState(
    () => process.env.NEXT_PUBLIC_XERO_FEE_ACCOUNT_CODE ?? ''
  )
  const [legacyResults, setLegacyResults] = useState<Map<string, ClearingApplyResponse>>(new Map())
  const [confirmModal, setConfirmModal] = useState<DepositMatch | null>(null)

  // Guide mode state
  const [guideData, setGuideData] = useState<ReconciliationGuideResponse | null>(null)
  const [guideMethodFilter, setGuideMethodFilter] = useState<'all' | 'Braintree' | 'medicare' | 'other'>('all')

  // Medicare mode state
  const [medicareResult, setMedicareResult] = useState<MedicareReconciliationResult | null>(null)
  const [medicareSelected, setMedicareSelected] = useState<Set<number>>(new Set()) // indices into batchMatches
  const [medicareBatchResult, setMedicareBatchResult] = useState<BatchReconcileResponse | null>(null)
  const [medicareReconciling, setMedicareReconciling] = useState(false)

  useEffect(() => {
    setClearingHistory(loadClearingHistory())
  }, [batchResult, legacyResults])

  // ── Filtered matches ──
  const filteredMatches = useMemo(() => {
    if (!reconciliation) return []
    if (statusFilter === 'all') return reconciliation.matches
    return reconciliation.matches.filter((m) => m.status === statusFilter)
  }, [reconciliation, statusFilter])

  // Auto-select all matched items
  const readyMatches = useMemo(() => {
    if (!reconciliation) return []
    return reconciliation.matches.filter(
      (m) => m.status === 'matched' && m.clearingTxn
    )
  }, [reconciliation])

  // ── Handlers ──

  const applyPreset = (preset: string) => {
    const { from, to } = getPresetDates(preset)
    setFromDate(from)
    setToDate(to)
  }

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    setReconciliation(null)
    setLegacySummary(null)
    setGuideData(null)
    setMedicareResult(null)
    setMedicareSelected(new Set())
    setMedicareBatchResult(null)
    setSelectedMatches(new Set())
    setBatchResult(null)
    setLegacyResults(new Map())

    try {
      const params = new URLSearchParams({ fromDate, toDate })

      if (viewMode === 'threeway') {
        params.set('mode', 'threeway')
        const res = await fetch(`/api/xero/clearing/summary?${params}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Request failed (${res.status})`)
        }
        const data: ReconciliationResult = await res.json()
        setReconciliation(data)
        // Auto-select all ready matches
        const readyIds = new Set(
          data.matches
            .filter((m) => m.status === 'matched' && m.clearingTxn)
            .map((m) => m.clearingTxn!.transactionId)
        )
        setSelectedMatches(readyIds)
      } else if (viewMode === 'guide') {
        params.set('mode', 'guide')
        const res = await fetch(`/api/xero/clearing/summary?${params}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Request failed (${res.status})`)
        }
        const data: ReconciliationGuideResponse = await res.json()
        setGuideData(data)
      } else if (viewMode === 'medicare') {
        params.set('mode', 'medicare')
        params.set('tolerance', String(Math.round(toleranceDollars * 100)))
        const res = await fetch(`/api/xero/clearing/summary?${params}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Request failed (${res.status})`)
        }
        const data: MedicareReconciliationResult = await res.json()
        setMedicareResult(data)
        // Auto-select all batch matches
        setMedicareSelected(new Set(data.batchMatches.map((_, i) => i)))
      } else {
        params.set('mode', 'legacy')
        params.set('tolerance', String(Math.round(toleranceDollars * 100)))
        const res = await fetch(`/api/xero/clearing/summary?${params}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Request failed (${res.status})`)
        }
        const data: ClearingSummaryResponse = await res.json()
        setLegacySummary(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const toggleMatchSelection = useCallback((transactionId: string) => {
    setSelectedMatches((prev) => {
      const next = new Set(prev)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }, [])

  const selectAllReady = useCallback(() => {
    const ids = new Set(readyMatches.map((m) => m.clearingTxn!.transactionId))
    setSelectedMatches(ids)
  }, [readyMatches])

  const deselectAll = useCallback(() => {
    setSelectedMatches(new Set())
  }, [])

  const reconcileSelected = async () => {
    if (!reconciliation) return
    setReconciling(true)
    setError('')
    setBatchResult(null)

    const toReconcile = reconciliation.matches.filter(
      (m) => m.status === 'matched' && m.clearingTxn && selectedMatches.has(m.clearingTxn.transactionId)
    )

    try {
      const body = {
        matches: toReconcile.map((m) => ({
          invoiceNumber: m.invoiceNumber,
          clearingTransactionId: m.clearingTxn!.transactionId,
          amount: m.amount,
          date: m.date,
          reference: m.invoiceNumber,
        })),
        dryRun,
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

      const data: BatchReconcileResponse = await res.json()
      setBatchResult(data)

      saveClearingEntry({
        timestamp: new Date().toISOString(),
        date: fromDate === toDate ? fromDate : `${fromDate}\u2013${toDate}`,
        amount: toReconcile.reduce((s, m) => s + m.amount, 0),
        clearingCount: toReconcile.length,
        dryRun,
        success: data.failed === 0,
        batchMode: true,
        batchTotal: data.total,
        batchSucceeded: data.succeeded,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setReconciling(false)
    }
  }

  // ── Medicare batch reconcile ──
  // Creates ONE bank transfer per deposit (clearing → savings)
  const reconcileMedicareBatches = async () => {
    if (!medicareResult) return
    setMedicareReconciling(true)
    setError('')
    setMedicareBatchResult(null)

    // Build one transfer per selected batch match
    const batchTransfers: Array<{
      invoiceNumber: string
      clearingTransactionId: string
      amount: number
      date: string
      reference: string
    }> = []

    for (const idx of medicareSelected) {
      const batch = medicareResult.batchMatches[idx]
      if (!batch) continue
      const patientRefs = batch.clearingEntries
        .map((c) => c.contactName || c.reference || c.invoiceNumber)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')
      batchTransfers.push({
        invoiceNumber: `Medicare ${batch.deposit.date}`,
        clearingTransactionId: batch.deposit.bankTransactionId,
        amount: batch.deposit.amount, // use deposit amount (what actually landed)
        date: batch.deposit.date,
        reference: `Medicare batch ${batch.deposit.date} (${batch.clearingEntries.length} items: ${patientRefs})`,
      })
    }

    if (batchTransfers.length === 0) {
      setError('No batches selected')
      setMedicareReconciling(false)
      return
    }

    try {
      const body = {
        matches: batchTransfers,
        medicare: true, // signals API to use XERO_SAVINGS_ACCOUNT_ID
        dryRun,
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

      const data: BatchReconcileResponse = await res.json()
      setMedicareBatchResult(data)

      saveClearingEntry({
        timestamp: new Date().toISOString(),
        date: fromDate === toDate ? fromDate : `${fromDate}\u2013${toDate}`,
        amount: batchTransfers.reduce((s, t) => s + t.amount, 0),
        clearingCount: batchTransfers.length,
        dryRun,
        success: data.failed === 0,
        batchMode: true,
        batchTotal: data.total,
        batchSucceeded: data.succeeded,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setMedicareReconciling(false)
    }
  }

  // ── Legacy mode apply ──
  const legacyApply = (match: DepositMatch) => {
    setConfirmModal(match)
  }

  const confirmLegacyApply = async () => {
    if (!confirmModal || !legacySummary) return
    const match = confirmModal
    setLoading(true)
    setError('')

    const newResults = new Map(legacyResults)
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
        date: fromDate === toDate ? fromDate : `${fromDate}\u2013${toDate}`,
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

    setLegacyResults(newResults)
    setConfirmModal(null)
    setLoading(false)
  }

  // ── Fee summary for three-way mode ──
  const feeSummary = useMemo(() => {
    if (!reconciliation) return null
    const matchedItems = reconciliation.matches.filter((m) => m.calculatedFee && m.calculatedFee > 0)
    const totalFees = matchedItems.reduce((s, m) => s + (m.calculatedFee ?? 0), 0)
    return {
      count: matchedItems.length,
      totalFees: Math.round(totalFees * 100) / 100,
    }
  }, [reconciliation])

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
            Three-way match: Halaxy payments &harr; Xero clearing &harr; NAB deposits
          </p>
        </div>
      </div>

      {/* Date range + controls */}
      <div className="card mb-6">
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
            {(['today', 'yesterday', 'last7', 'last30'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="px-2 py-1 text-xs bg-silver-700/30 text-silver-300 rounded hover:bg-silver-700/50 transition-colors"
              >
                {preset === 'today'
                  ? 'Today'
                  : preset === 'yesterday'
                    ? 'Yesterday'
                    : preset === 'last7'
                      ? 'Last 7d'
                      : 'Last 30d'}
              </button>
            ))}
          </div>
        </div>

        {/* Mode + controls row */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          {/* View mode tabs */}
          <div className="flex rounded-lg overflow-hidden border border-silver-700/30">
            <button
              onClick={() => setViewMode('threeway')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'threeway'
                  ? 'bg-slate-blue/40 text-white'
                  : 'bg-charcoal text-silver-400 hover:text-white'
              }`}
            >
              Three-Way Match
            </button>
            <button
              onClick={() => setViewMode('legacy')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'legacy'
                  ? 'bg-slate-blue/40 text-white'
                  : 'bg-charcoal text-silver-400 hover:text-white'
              }`}
            >
              Legacy (Subset-Sum)
            </button>
            <button
              onClick={() => setViewMode('medicare')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'medicare'
                  ? 'bg-cyan-700/40 text-white'
                  : 'bg-charcoal text-silver-400 hover:text-white'
              }`}
            >
              Medicare / Savings
            </button>
            <button
              onClick={() => setViewMode('guide')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'guide'
                  ? 'bg-amber-700/40 text-white'
                  : 'bg-charcoal text-silver-400 hover:text-white'
              }`}
            >
              Reconciliation Guide
            </button>
          </div>

          {/* Dry run toggle */}
          <label className="flex items-center gap-2 text-sm text-silver-300">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded"
            />
            Dry Run
          </label>
          <span className="text-xs text-silver-500">
            {dryRun ? '(Preview only)' : 'Live mode \u2014 changes will be applied'}
          </span>

          {/* Legacy-only controls */}
          {viewMode === 'legacy' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-silver-400 text-sm">Tolerance</label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={toleranceDollars}
                  onChange={(e) => setToleranceDollars(Number(e.target.value))}
                  className="w-24 accent-slate-blue"
                />
                <span className="text-white text-sm font-mono w-14">
                  ${toleranceDollars.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-silver-400 text-sm">Fee account</label>
                <input
                  type="text"
                  value={feeAccountCode}
                  onChange={(e) => setFeeAccountCode(e.target.value)}
                  placeholder="e.g. 404"
                  className="bg-charcoal border border-silver-700/30 rounded px-2 py-1 text-white text-sm w-20 font-mono"
                />
              </div>
            </>
          )}
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

      {/* ── Three-Way Mode Results ── */}
      {viewMode === 'threeway' && reconciliation && (
        <ThreeWayView
          reconciliation={reconciliation}
          filteredMatches={filteredMatches}
          selectedMatches={selectedMatches}
          statusFilter={statusFilter}
          readyMatches={readyMatches}
          feeSummary={feeSummary}
          dryRun={dryRun}
          reconciling={reconciling}
          batchResult={batchResult}
          onStatusFilterChange={setStatusFilter}
          onToggleMatch={toggleMatchSelection}
          onSelectAll={selectAllReady}
          onDeselectAll={deselectAll}
          onReconcile={reconcileSelected}
        />
      )}

      {/* ── Legacy Mode Results ── */}
      {viewMode === 'legacy' && legacySummary && (
        <LegacyView
          summary={legacySummary}
          results={legacyResults}
          loading={loading}
          dryRun={dryRun}
          feeAccountCode={feeAccountCode}
          onApply={legacyApply}
        />
      )}

      {/* ── Medicare Mode Results ── */}
      {viewMode === 'medicare' && medicareResult && (
        <MedicareView
          result={medicareResult}
          selectedIndices={medicareSelected}
          dryRun={dryRun}
          reconciling={medicareReconciling}
          batchResult={medicareBatchResult}
          onToggleBatch={(idx) => {
            setMedicareSelected((prev) => {
              const next = new Set(prev)
              if (next.has(idx)) next.delete(idx)
              else next.add(idx)
              return next
            })
          }}
          onSelectAll={() => setMedicareSelected(new Set(medicareResult.batchMatches.map((_, i) => i)))}
          onDeselectAll={() => setMedicareSelected(new Set())}
          onReconcile={reconcileMedicareBatches}
        />
      )}

      {/* ── Guide Mode Results ── */}
      {viewMode === 'guide' && guideData && (
        <GuideView
          data={guideData}
          methodFilter={guideMethodFilter}
          onMethodFilterChange={setGuideMethodFilter}
        />
      )}

      {/* Legacy confirm modal */}
      {confirmModal && (
        <ConfirmModal
          match={confirmModal}
          dryRun={dryRun}
          loading={loading}
          feeAccountCode={feeAccountCode}
          onCancel={() => setConfirmModal(null)}
          onConfirm={confirmLegacyApply}
        />
      )}

      {/* History */}
      {clearingHistory.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-white mb-3">History</h2>
          <div className="space-y-1 text-xs font-mono text-silver-400 max-h-40 overflow-y-auto">
            {clearingHistory.slice(0, 20).map((e, i) => (
              <div key={i}>
                {new Date(e.timestamp).toLocaleString()} &mdash; {e.date} &mdash; $
                {e.amount.toFixed(2)}
                {e.batchMode
                  ? ` (batch: ${e.batchSucceeded}/${e.batchTotal})`
                  : e.feeAmount
                    ? ` (fee $${e.feeAmount.toFixed(2)})`
                    : ''}{' '}
                &mdash; {e.clearingCount} txns &mdash;{' '}
                {e.dryRun ? 'dry run' : e.success ? '\u2713' : '\u2717'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Three-Way View ──

function ThreeWayView({
  reconciliation,
  filteredMatches,
  selectedMatches,
  statusFilter,
  readyMatches,
  feeSummary,
  dryRun,
  reconciling,
  batchResult,
  onStatusFilterChange,
  onToggleMatch,
  onSelectAll,
  onDeselectAll,
  onReconcile,
}: {
  reconciliation: ReconciliationResult
  filteredMatches: ThreeWayMatch[]
  selectedMatches: Set<string>
  statusFilter: ThreeWayMatchStatus | 'all'
  readyMatches: ThreeWayMatch[]
  feeSummary: { count: number; totalFees: number } | null
  dryRun: boolean
  reconciling: boolean
  batchResult: BatchReconcileResponse | null
  onStatusFilterChange: (status: ThreeWayMatchStatus | 'all') => void
  onToggleMatch: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onReconcile: () => void
}) {
  const { stats } = reconciliation
  const selectedReadyCount = readyMatches.filter(
    (m) => m.clearingTxn && selectedMatches.has(m.clearingTxn.transactionId)
  ).length
  const selectedAmount = readyMatches
    .filter((m) => m.clearingTxn && selectedMatches.has(m.clearingTxn.transactionId))
    .reduce((s, m) => s + m.amount, 0)

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label="Clearing Balance"
          value={`$${reconciliation.clearingBalance.toFixed(2)}`}
          sublabel={`Target: $${reconciliation.expectedBalance.toFixed(2)}`}
          colour="text-white"
        />
        <SummaryCard
          label="Ready to Reconcile"
          value={String(stats.matched)}
          sublabel={`$${stats.readyAmount.toFixed(2)}`}
          colour="text-green-400"
          onClick={() => onStatusFilterChange('matched')}
        />
        <SummaryCard
          label="Awaiting Deposit"
          value={String(stats.awaitingDeposit)}
          sublabel="Money not yet in NAB"
          colour="text-yellow-400"
          onClick={() => onStatusFilterChange('awaiting_deposit')}
        />
        <SummaryCard
          label="Issues"
          value={String(stats.syncFailed + stats.manualEntry + stats.orphanDeposits)}
          sublabel={`${stats.syncFailed} sync fail, ${stats.manualEntry} manual, ${stats.orphanDeposits} orphan`}
          colour="text-red-400"
          onClick={() => onStatusFilterChange('all')}
        />
      </div>

      {/* Batch Actions */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter tabs */}
          <div className="flex gap-1">
            {(
              [
                { key: 'all', label: 'All', count: stats.total },
                { key: 'matched', label: 'Ready', count: stats.matched },
                { key: 'awaiting_deposit', label: 'Awaiting', count: stats.awaitingDeposit },
                { key: 'sync_failed', label: 'Sync Fail', count: stats.syncFailed },
                { key: 'manual_entry', label: 'Manual', count: stats.manualEntry },
                { key: 'orphan_deposit', label: 'Orphan', count: stats.orphanDeposits },
              ] as Array<{ key: ThreeWayMatchStatus | 'all'; label: string; count: number }>
            )
              .filter((t) => t.key === 'all' || t.count > 0)
              .map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onStatusFilterChange(tab.key)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-slate-blue/40 text-white'
                      : 'bg-silver-700/20 text-silver-400 hover:text-white'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
          </div>

          {/* Selection controls */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onSelectAll}
              className="px-2 py-1 text-xs text-silver-300 hover:text-white transition-colors"
            >
              Select all ready
            </button>
            <button
              onClick={onDeselectAll}
              className="px-2 py-1 text-xs text-silver-300 hover:text-white transition-colors"
            >
              Deselect all
            </button>
          </div>

          {/* Reconcile button */}
          <button
            onClick={onReconcile}
            disabled={reconciling || selectedReadyCount === 0}
            className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {reconciling
              ? 'Reconciling\u2026'
              : dryRun
                ? `Preview Reconcile (${selectedReadyCount} items, $${selectedAmount.toFixed(2)})`
                : `Reconcile ${selectedReadyCount} items ($${selectedAmount.toFixed(2)})`}
          </button>
        </div>
      </div>

      {/* Batch result */}
      {batchResult && (
        <div
          className={`card mb-6 border ${
            batchResult.failed === 0
              ? 'border-green-500/40 bg-green-900/10'
              : 'border-red-500/40 bg-red-900/10'
          }`}
        >
          <h3 className="text-sm font-semibold text-white mb-2">
            {batchResult.dryRun ? 'Dry Run Result' : 'Reconciliation Result'}
          </h3>
          <div className="text-sm text-silver-300">
            <p>
              Total: {batchResult.total} | Succeeded: {batchResult.succeeded} | Failed:{' '}
              {batchResult.failed}
            </p>
          </div>
          {batchResult.results.some((r) => !r.success) && (
            <div className="mt-2 space-y-1">
              {batchResult.results
                .filter((r) => !r.success)
                .map((r, i) => (
                  <div key={i} className="text-xs text-red-400">
                    {r.invoiceNumber}: {r.message}
                  </div>
                ))}
            </div>
          )}
          {!batchResult.dryRun && batchResult.failed === 0 && (
            <p className="mt-2 text-xs text-silver-400">
              Bank transfers created. Go to Xero &rarr; Bank Accounts &rarr; NAB &rarr;
              Reconcile to confirm.
            </p>
          )}
        </div>
      )}

      {/* Reconciliation Table */}
      <div className="card mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-silver-400 border-b border-silver-700/30">
              <th className="pb-2 pr-2 w-8"></th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Invoice</th>
              <th className="pb-2 pr-3">Patient</th>
              <th className="pb-2 pr-3 text-right">Amount</th>
              <th className="pb-2 pr-3">Halaxy</th>
              <th className="pb-2 pr-3">Clearing</th>
              <th className="pb-2 pr-3">NAB</th>
              <th className="pb-2 pr-3 text-right">Fee (est.)</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-silver-400">
                  No matches found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredMatches.map((match, idx) => (
                <ThreeWayRow
                  key={match.clearingTxn?.transactionId ?? match.halaxyPayment?.id ?? `orphan-${idx}`}
                  match={match}
                  selected={
                    match.status === 'matched' &&
                    !!match.clearingTxn &&
                    selectedMatches.has(match.clearingTxn.transactionId)
                  }
                  onToggle={() => {
                    if (match.clearingTxn) {
                      onToggleMatch(match.clearingTxn.transactionId)
                    }
                  }}
                  batchResult={batchResult}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Fee Summary */}
      {feeSummary && feeSummary.count > 0 && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-white mb-2">Fee Summary (Informational)</h3>
          <p className="text-sm text-silver-300">
            {feeSummary.count} payments with estimated fees totalling{' '}
            <span className="text-amber-400 font-medium">${feeSummary.totalFees.toFixed(2)}</span>
          </p>
          <p className="text-xs text-silver-500 mt-1">
            Bronze tier: 1.90% + $1.00 (incl. GST). Charged to credit card, not deducted from deposits.
          </p>
        </div>
      )}
    </>
  )
}

// ── Summary Card ──

function SummaryCard({
  label,
  value,
  sublabel,
  colour,
  onClick,
}: {
  label: string
  value: string
  sublabel: string
  colour: string
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`card text-left ${onClick ? 'cursor-pointer hover:border-silver-600/50' : ''}`}
    >
      <div className="text-xs text-silver-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colour}`}>{value}</div>
      <div className="text-xs text-silver-500 mt-1">{sublabel}</div>
    </Wrapper>
  )
}

// ── Three-Way Table Row ──

function ThreeWayRow({
  match,
  selected,
  onToggle,
  batchResult,
}: {
  match: ThreeWayMatch
  selected: boolean
  onToggle: () => void
  batchResult: BatchReconcileResponse | null
}) {
  const canSelect = match.status === 'matched' && !!match.clearingTxn

  // Check if this match has a batch result
  const itemResult = batchResult?.results.find(
    (r) => r.invoiceNumber === match.invoiceNumber
  )

  return (
    <tr className="border-b border-silver-700/10 hover:bg-silver-800/20">
      {/* Checkbox */}
      <td className="py-2 pr-2">
        {canSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="rounded"
          />
        )}
      </td>

      {/* Status */}
      <td className="py-2 pr-3">
        <StatusBadge status={match.status} itemResult={itemResult} />
      </td>

      {/* Invoice */}
      <td className="py-2 pr-3">
        <span className="font-mono text-white text-xs">
          {match.invoiceNumber || '\u2014'}
        </span>
        {match.matchMethod === 'invoice_number' && (
          <span className="ml-1 text-[9px] text-purple-400">INV</span>
        )}
        {match.matchMethod === 'amount_date' && (
          <span className="ml-1 text-[9px] text-yellow-400">AMT</span>
        )}
      </td>

      {/* Patient */}
      <td className="py-2 pr-3 text-silver-300 text-xs">{match.patientName || '\u2014'}</td>

      {/* Amount */}
      <td className="py-2 pr-3 text-right text-white font-mono text-xs">
        ${match.amount.toFixed(2)}
      </td>

      {/* Halaxy */}
      <td className="py-2 pr-3">
        {match.halaxyPayment ? (
          <div className="text-xs">
            <span className="text-green-400">{match.halaxyPayment.method}</span>
            <span className="text-silver-500 ml-1">{match.halaxyPayment.created.slice(0, 10)}</span>
          </div>
        ) : (
          <span className="text-silver-600 text-xs">\u2014</span>
        )}
      </td>

      {/* Clearing */}
      <td className="py-2 pr-3">
        {match.clearingTxn ? (
          <div className="text-xs">
            <span className="text-blue-400">Ref: {match.clearingTxn.reference || match.clearingTxn.invoiceNumber}</span>
            <span className="text-silver-500 ml-1">{match.clearingTxn.date}</span>
          </div>
        ) : (
          <span className="text-silver-600 text-xs">\u2014</span>
        )}
      </td>

      {/* NAB */}
      <td className="py-2 pr-3">
        {match.bankDeposit ? (
          <div className="text-xs">
            <span className="text-emerald-400">${match.bankDeposit.amount.toFixed(2)}</span>
            <span className="text-silver-500 ml-1">{match.bankDeposit.date}</span>
          </div>
        ) : (
          <span className="text-silver-600 text-xs">\u2014</span>
        )}
      </td>

      {/* Fee */}
      <td className="py-2 text-right text-xs text-amber-400/70 font-mono">
        {match.calculatedFee ? `$${match.calculatedFee.toFixed(2)}` : '\u2014'}
      </td>
    </tr>
  )
}

// ── Status Badge ──

function StatusBadge({
  status,
  itemResult,
}: {
  status: ThreeWayMatchStatus
  itemResult?: { success: boolean; message: string } | null
}) {
  // If we have a batch result for this item, show that instead
  if (itemResult) {
    if (itemResult.success) {
      return (
        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-900/40 text-green-300 border border-green-500/30">
          Done
        </span>
      )
    }
    return (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-900/40 text-red-300 border border-red-500/30" title={itemResult.message}>
        Failed
      </span>
    )
  }

  const config: Record<ThreeWayMatchStatus, { label: string; cls: string }> = {
    matched: {
      label: 'Ready',
      cls: 'bg-green-900/40 text-green-300 border-green-500/30',
    },
    awaiting_deposit: {
      label: 'Awaiting',
      cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30',
    },
    sync_failed: {
      label: 'Sync Fail',
      cls: 'bg-red-900/40 text-red-300 border-red-500/30',
    },
    manual_entry: {
      label: 'Manual',
      cls: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
    },
    orphan_deposit: {
      label: 'Orphan',
      cls: 'bg-orange-900/40 text-orange-300 border-orange-500/30',
    },
  }

  const { label, cls } = config[status]
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${cls}`}>
      {label}
    </span>
  )
}

// ══════════════════════════════════════════
// Medicare View — subset-sum batch matching
// ══════════════════════════════════════════

function MedicareView({
  result,
  selectedIndices,
  dryRun,
  reconciling,
  batchResult,
  onToggleBatch,
  onSelectAll,
  onDeselectAll,
  onReconcile,
}: {
  result: MedicareReconciliationResult
  selectedIndices: Set<number>
  dryRun: boolean
  reconciling: boolean
  batchResult: BatchReconcileResponse | null
  onToggleBatch: (idx: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onReconcile: () => void
}) {
  const { stats, batchMatches, unmatchedDeposits, unmatchedClearing } = result
  // Only count unreconciled batches as actionable
  const actionableBatches = batchMatches.filter((b) => !b.deposit.isReconciled)
  const reconciledBatches = batchMatches.filter((b) => b.deposit.isReconciled)
  const selectedCount = [...selectedIndices].filter(
    (i) => batchMatches[i] && !batchMatches[i].deposit.isReconciled
  ).length
  const selectedAmount = [...selectedIndices]
    .filter((i) => batchMatches[i] && !batchMatches[i].deposit.isReconciled)
    .reduce((s, i) => s + (batchMatches[i]?.deposit.amount ?? 0), 0)

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <SummaryCard
          label="Clearing Payments"
          value={`$${stats.totalClearingAmount.toFixed(2)}`}
          sublabel={`${stats.totalClearingEntries} entries (${stats.excludedTransferCount} transfers excluded)`}
          colour="text-white"
        />
        <SummaryCard
          label="Matched Batches"
          value={`${stats.matchedDeposits} of ${stats.totalDeposits}`}
          sublabel={`$${stats.readyAmount.toFixed(2)} ready to reconcile`}
          colour="text-green-400"
        />
        <SummaryCard
          label="Already Done"
          value={String(stats.alreadyReconciledDeposits)}
          sublabel="Savings deposits already reconciled"
          colour="text-cyan-400"
        />
        <SummaryCard
          label="Unmatched Deposits"
          value={String(stats.unmatchedDeposits)}
          sublabel="No matching clearing group"
          colour={stats.unmatchedDeposits > 0 ? 'text-yellow-400' : 'text-silver-400'}
        />
        <SummaryCard
          label="Unmatched Clearing"
          value={String(stats.unmatchedClearingEntries)}
          sublabel="Not part of any batch"
          colour={stats.unmatchedClearingEntries > 0 ? 'text-amber-400' : 'text-silver-400'}
        />
      </div>

      {/* Info banner */}
      <div className="card mb-6 border-cyan-500/30 bg-cyan-900/10">
        <p className="text-sm text-cyan-300">
          Subset-sum matching: finds which individual patient payments add up to each Medicare deposit.
          One bank transfer per deposit (clearing &rarr; savings).
        </p>
        {result.clearingTxnTypes.length > 0 && (
          <p className="text-xs text-silver-500 mt-1">
            Clearing txn types found: {result.clearingTxnTypes.join(', ')}
          </p>
        )}
      </div>

      {/* Already reconciled info */}
      {reconciledBatches.length > 0 && (
        <div className="card mb-6 border-cyan-500/20 bg-cyan-900/5">
          <h3 className="text-sm font-semibold text-cyan-400 mb-2">
            Already Reconciled ({reconciledBatches.length} batches)
          </h3>
          <p className="text-xs text-silver-400 mb-2">
            These savings deposits are already reconciled in Xero. No action needed.
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {reconciledBatches.map((batch) => (
              <div key={batch.deposit.bankTransactionId} className="text-xs font-mono text-silver-400 flex items-center gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>${batch.deposit.amount.toFixed(2)}</span>
                <span className="text-silver-600">&mdash;</span>
                <span>{batch.deposit.date}</span>
                <span className="text-silver-600">&mdash;</span>
                <span>{batch.clearingEntries.length} patients</span>
                <span className="text-silver-600">&mdash;</span>
                <span>{batch.clearingEntries.map((c) => c.contactName || c.reference).filter(Boolean).slice(0, 3).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Actions */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className="px-2 py-1 text-xs text-silver-300 hover:text-white transition-colors"
            >
              Select all
            </button>
            <button
              onClick={onDeselectAll}
              className="px-2 py-1 text-xs text-silver-300 hover:text-white transition-colors"
            >
              Deselect all
            </button>
          </div>

          <button
            onClick={onReconcile}
            disabled={reconciling || selectedCount === 0}
            className="ml-auto px-4 py-2 bg-cyan-700 text-white text-sm font-medium rounded hover:bg-cyan-600 disabled:opacity-50 transition-colors"
          >
            {reconciling
              ? 'Reconciling\u2026'
              : dryRun
                ? `Preview ${selectedCount} batch${selectedCount !== 1 ? 'es' : ''} ($${selectedAmount.toFixed(2)}) \u2192 Savings`
                : `Reconcile ${selectedCount} batch${selectedCount !== 1 ? 'es' : ''} ($${selectedAmount.toFixed(2)}) \u2192 Savings`}
          </button>
        </div>
      </div>

      {/* Batch result */}
      {batchResult && (
        <div
          className={`card mb-6 border ${
            batchResult.failed === 0
              ? 'border-green-500/40 bg-green-900/10'
              : 'border-red-500/40 bg-red-900/10'
          }`}
        >
          <h3 className="text-sm font-semibold text-white mb-2">
            {batchResult.dryRun ? 'Dry Run Result' : 'Reconciliation Result'}
          </h3>
          <div className="text-sm text-silver-300">
            <p>
              Batches: {batchResult.total} | Succeeded: {batchResult.succeeded} | Failed:{' '}
              {batchResult.failed}
            </p>
          </div>
          {batchResult.results.some((r) => !r.success) && (
            <div className="mt-2 space-y-1">
              {batchResult.results
                .filter((r) => !r.success)
                .map((r, i) => (
                  <div key={i} className="text-xs text-red-400">
                    {r.invoiceNumber}: {r.message}
                  </div>
                ))}
            </div>
          )}
          {!batchResult.dryRun && batchResult.failed === 0 && (
            <p className="mt-2 text-xs text-silver-400">
              Bank transfers created (clearing &rarr; savings). Savings deposits now have matching transfers.
            </p>
          )}
        </div>
      )}

      {/* Actionable batch groups (unreconciled deposits only) */}
      {actionableBatches.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-white">Ready to Reconcile ({actionableBatches.length} batches)</h3>
          {batchMatches.map((batch, idx) => {
            if (batch.deposit.isReconciled) return null
            return (
            <div key={batch.deposit.bankTransactionId} className="card border border-silver-700/30">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedIndices.has(idx)}
                  onChange={() => onToggleBatch(idx)}
                  className="rounded mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">
                        Savings Deposit: ${batch.deposit.amount.toFixed(2)}
                      </span>
                      <span className="text-silver-400 text-xs ml-2">
                        {batch.deposit.date}
                        {batch.deposit.reference && <> &mdash; ref: {batch.deposit.reference}</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {batch.isExactMatch ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-green-900/40 text-green-300 border border-green-500/30">
                          Exact
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-900/40 text-amber-300 border border-amber-500/30">
                          Diff: ${batch.difference.toFixed(2)}
                        </span>
                      )}
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-cyan-900/40 text-cyan-300 border border-cyan-500/30">
                        {batch.clearingEntries.length} patient{batch.clearingEntries.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-silver-400 mt-1">
                    Clearing entries sum: ${batch.total.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Individual clearing entries within the batch */}
              <div className="ml-8 space-y-0.5 max-h-48 overflow-y-auto">
                {batch.clearingEntries.map((c) => (
                  <div
                    key={c.transactionId}
                    className="text-xs font-mono text-silver-300 flex items-center gap-1.5 flex-wrap"
                  >
                    <span className="text-white">${c.amount.toFixed(2)}</span>
                    <span className="text-silver-600">&mdash;</span>
                    <span className="text-blue-400">{c.reference || c.invoiceNumber || '(no ref)'}</span>
                    <span className="text-silver-600">&mdash;</span>
                    <span className="text-purple-400 font-sans">{c.contactName || '(unknown)'}</span>
                    <span className="text-silver-600">&mdash;</span>
                    <span>{c.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )
          })}
        </div>
      )}

      {/* Unmatched savings deposits */}
      {unmatchedDeposits.length > 0 && (
        <div className="card mb-6 border-yellow-500/30 bg-yellow-900/10">
          <h3 className="text-sm font-semibold text-yellow-300 mb-2">
            Unmatched Savings Deposits ({unmatchedDeposits.length})
          </h3>
          <p className="text-xs text-silver-400 mb-2">
            No combination of clearing entries sums to these deposits. May need a wider date range or manual review.
          </p>
          <div className="space-y-1">
            {unmatchedDeposits.map((dep) => (
              <div key={dep.bankTransactionId} className="text-xs font-mono text-silver-300">
                ${dep.amount.toFixed(2)} &mdash; {dep.date} &mdash; ref: {dep.reference || '(none)'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched clearing entries */}
      {unmatchedClearing.length > 0 && (
        <div className="card mb-6 border-amber-500/30 bg-amber-900/10">
          <h3 className="text-sm font-semibold text-amber-300 mb-2">
            Unmatched Clearing Entries ({unmatchedClearing.length})
          </h3>
          <p className="text-xs text-silver-400 mb-2">
            These patient payments aren&apos;t part of any matched batch. The deposit may not be in the savings account yet, or may fall outside the date range.
          </p>
          <div className="space-y-1">
            {unmatchedClearing.map((c) => (
              <div key={c.transactionId} className="text-xs font-mono text-silver-300">
                ${c.amount.toFixed(2)} &mdash; {c.reference || c.invoiceNumber || '(no ref)'} &mdash; {c.contactName || '(unknown)'} &mdash; {c.date}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════
// Guide View (fee calculator report)
// ══════════════════════════════════════════

function GuideView({
  data,
  methodFilter,
  onMethodFilterChange,
}: {
  data: ReconciliationGuideResponse
  methodFilter: 'all' | 'Braintree' | 'medicare' | 'other'
  onMethodFilterChange: (filter: 'all' | 'Braintree' | 'medicare' | 'other') => void
}) {
  const { grandTotals, days } = data

  // Filter payments within each day
  const filteredDays = useMemo(() => {
    if (methodFilter === 'all') return days
    return days
      .map((day) => {
        const filtered = day.payments.filter((p) => {
          if (methodFilter === 'Braintree') return p.method === 'Braintree'
          if (methodFilter === 'medicare') {
            const m = p.method.toLowerCase()
            return m.includes('medicare') || m.includes('bulk bill') || m.includes('dva')
          }
          // other
          const m = p.method.toLowerCase()
          return p.method !== 'Braintree' && !m.includes('medicare') && !m.includes('bulk bill') && !m.includes('dva')
        })
        return { ...day, payments: filtered }
      })
      .filter((day) => day.payments.length > 0)
  }, [days, methodFilter])

  return (
    <>
      {/* Grand totals cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label="Total Payments"
          value={String(data.paymentCount)}
          sublabel={`$${grandTotals.payments.toFixed(2)}`}
          colour="text-white"
        />
        <SummaryCard
          label="Braintree (Card)"
          value={String(grandTotals.braintreeCount)}
          sublabel={`$${grandTotals.braintreeAmount.toFixed(2)}`}
          colour="text-indigo-400"
          onClick={() => onMethodFilterChange('Braintree')}
        />
        <SummaryCard
          label="Medicare / DVA"
          value={String(grandTotals.medicareCount)}
          sublabel={`$${grandTotals.medicareAmount.toFixed(2)}`}
          colour="text-cyan-400"
          onClick={() => onMethodFilterChange('medicare')}
        />
        <SummaryCard
          label="Est. Fees (Braintree)"
          value={`$${grandTotals.estimatedFees.toFixed(2)}`}
          sublabel="Bronze: 1.90% + $1.00"
          colour="text-amber-400"
        />
      </div>

      {/* Filter tabs + print button */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {(
              [
                { key: 'all', label: 'All', count: data.paymentCount },
                { key: 'Braintree', label: 'Braintree', count: grandTotals.braintreeCount },
                { key: 'medicare', label: 'Medicare/DVA', count: grandTotals.medicareCount },
                { key: 'other', label: 'Other', count: grandTotals.otherCount },
              ] as Array<{ key: typeof methodFilter; label: string; count: number }>
            )
              .filter((t) => t.key === 'all' || t.count > 0)
              .map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onMethodFilterChange(tab.key)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    methodFilter === tab.key
                      ? 'bg-amber-700/40 text-white'
                      : 'bg-silver-700/20 text-silver-400 hover:text-white'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
          </div>

          <button
            onClick={() => window.print()}
            className="ml-auto px-3 py-1.5 text-xs bg-silver-700/30 text-silver-300 rounded hover:bg-silver-700/50 transition-colors"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="card mb-6 border-amber-500/30 bg-amber-900/10">
        <p className="text-sm text-amber-300">
          This report shows all Halaxy payments for the date range. Use it as a reference when
          reconciling in Xero via <strong>Find &amp; Match</strong>.
        </p>
        <p className="text-xs text-silver-400 mt-1">
          For pre-separation payments (fee deducted from deposit): in Xero, click Adjustments &rarr;
          Bank Fee &rarr; enter the fee amount &rarr; account 447 (Merchant Fees).
        </p>
      </div>

      {/* Daily payment tables */}
      {filteredDays.length === 0 ? (
        <div className="card">
          <p className="text-silver-400 text-sm">No payments found for the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDays.map((day) => (
            <GuideDayTable key={day.date} day={day} />
          ))}
        </div>
      )}
    </>
  )
}

function GuideDayTable({ day }: { day: GuideDaySummary }) {
  const braintreePayments = day.payments.filter((p) => p.method === 'Braintree')
  const medicarePayments = day.payments.filter((p) => {
    const m = p.method.toLowerCase()
    return m.includes('medicare') || m.includes('bulk bill') || m.includes('dva')
  })
  const otherPayments = day.payments.filter(
    (p) => !braintreePayments.includes(p) && !medicarePayments.includes(p)
  )

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-AU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </h3>
        <span className="text-xs text-silver-400">
          {day.payments.length} payment{day.payments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-silver-400 border-b border-silver-700/30 text-xs">
            <th className="pb-2 pr-3">Invoice</th>
            <th className="pb-2 pr-3">Patient</th>
            <th className="pb-2 pr-3 text-right">Amount</th>
            <th className="pb-2 pr-3">Method</th>
            <th className="pb-2 pr-3 text-right">Est. Fee</th>
            <th className="pb-2 text-right">Expected Deposit</th>
          </tr>
        </thead>
        <tbody>
          {day.payments.map((p) => (
            <tr key={p.id} className="border-b border-silver-700/10">
              <td className="py-1.5 pr-3 font-mono text-white text-xs">{p.invoiceNumber || '\u2014'}</td>
              <td className="py-1.5 pr-3 text-silver-300 text-xs">{p.patientName || '\u2014'}</td>
              <td className="py-1.5 pr-3 text-right text-white font-mono text-xs">${p.amount.toFixed(2)}</td>
              <td className="py-1.5 pr-3">
                <PaymentMethodBadge method={p.method} />
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-xs text-amber-400/70">
                {p.estimatedFee > 0 ? `$${p.estimatedFee.toFixed(2)}` : '\u2014'}
              </td>
              <td className="py-1.5 text-right font-mono text-xs text-emerald-400">
                ${p.expectedDeposit.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {/* Day summary row */}
          <tr className="border-t border-silver-600/30 text-xs font-medium">
            <td colSpan={2} className="pt-2 text-silver-400">Day Total</td>
            <td className="pt-2 text-right text-white font-mono">${day.totals.dayTotal.toFixed(2)}</td>
            <td></td>
            <td className="pt-2 text-right text-amber-400 font-mono">${day.totals.braintreeFees.toFixed(2)}</td>
            <td className="pt-2 text-right text-emerald-400 font-mono">${day.totals.braintreeNet.toFixed(2)}</td>
          </tr>
          {/* Breakdown by method */}
          {braintreePayments.length > 0 && (
            <tr className="text-[10px] text-silver-500">
              <td colSpan={2} className="pt-1 pl-4">Braintree ({braintreePayments.length})</td>
              <td className="pt-1 text-right font-mono">${day.totals.braintree.toFixed(2)}</td>
              <td></td>
              <td className="pt-1 text-right font-mono">${day.totals.braintreeFees.toFixed(2)}</td>
              <td className="pt-1 text-right font-mono">${day.totals.braintreeNet.toFixed(2)}</td>
            </tr>
          )}
          {medicarePayments.length > 0 && (
            <tr className="text-[10px] text-silver-500">
              <td colSpan={2} className="pt-1 pl-4">Medicare/DVA ({medicarePayments.length})</td>
              <td className="pt-1 text-right font-mono">${day.totals.medicare.toFixed(2)}</td>
              <td colSpan={3}></td>
            </tr>
          )}
          {otherPayments.length > 0 && (
            <tr className="text-[10px] text-silver-500">
              <td colSpan={2} className="pt-1 pl-4">Other ({otherPayments.length})</td>
              <td className="pt-1 text-right font-mono">${day.totals.other.toFixed(2)}</td>
              <td colSpan={3}></td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════
// Legacy View (preserved from original)
// ══════════════════════════════════════════

function LegacyView({
  summary,
  results,
  loading,
  dryRun,
  feeAccountCode,
  onApply,
}: {
  summary: ClearingSummaryResponse
  results: Map<string, ClearingApplyResponse>
  loading: boolean
  dryRun: boolean
  feeAccountCode: string
  onApply: (match: DepositMatch) => void
}) {
  return (
    <>
      {/* Stats bar */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="text-silver-400">
            Deposits:{' '}
            <span className="text-white font-medium">
              {summary.deposits.length + summary.unmatchedDeposits.length}
            </span>
          </div>
          <div className="text-green-400">
            Matched: <span className="font-medium">{summary.deposits.length}</span>
          </div>
          <div className="text-yellow-400">
            Unmatched: <span className="font-medium">{summary.unmatchedDeposits.length}</span>
          </div>
          <div className="text-silver-400">
            Clearing txns:{' '}
            <span className="text-white font-medium">
              {summary.deposits.reduce((s, m) => s + m.clearingTransactions.length, 0) +
                summary.unmatchedClearing.length}
            </span>
          </div>
        </div>
      </div>

      {/* Matched deposits */}
      {summary.deposits.length > 0 ? (
        <div className="space-y-4 mb-6">
          {summary.deposits.map((match) => (
            <LegacyDepositCard
              key={match.deposit.bankTransactionId}
              match={match}
              result={results.get(match.deposit.bankTransactionId)}
              onApplyTransfer={() => onApply(match)}
              loading={loading}
              dryRun={dryRun}
              feeAccountCode={feeAccountCode}
              halaxyEnriched={summary.halaxyEnriched ?? false}
            />
          ))}
        </div>
      ) : (
        <div className="card mb-6">
          <p className="text-silver-400">No matched deposits found for {summary.date}</p>
        </div>
      )}

      {/* Unmatched deposits */}
      {summary.unmatchedDeposits.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">
            Unmatched Deposits ({summary.unmatchedDeposits.length})
          </h2>
          <div className="space-y-2 text-sm">
            {summary.unmatchedDeposits.map((d) => (
              <div key={d.bankTransactionId} className="text-silver-300">
                ${d.amount.toFixed(2)} &mdash; ref: {d.reference || '(none)'} &mdash; {d.date}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched clearing */}
      {summary.unmatchedClearing.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">
            Unmatched Clearing ({summary.unmatchedClearing.length})
          </h2>
          <div className="space-y-2 text-sm">
            {summary.unmatchedClearing.map((c) => (
              <div key={c.transactionId} className="text-silver-300">
                ${c.amount.toFixed(2)} &mdash; {c.invoiceNumber || c.reference || '(no ref)'} &mdash;{' '}
                {c.date}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── Legacy Deposit Card ──

function LegacyDepositCard({
  match,
  result,
  onApplyTransfer,
  loading,
  dryRun,
  feeAccountCode,
  halaxyEnriched,
}: {
  match: DepositMatch
  result?: ClearingApplyResponse
  onApplyTransfer: () => void
  loading: boolean
  dryRun: boolean
  feeAccountCode: string
  halaxyEnriched: boolean
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
        <ConfidenceBadge confidence={match.matchConfidence} fee={match.impliedFee} />
      </div>

      <div className="ml-8">
        <div className="text-silver-400 text-xs mb-1">
          {match.clearingTransactions.length} clearing payment(s) &mdash; total: $
          {match.total.toFixed(2)}
        </div>
        <div className="max-h-32 overflow-y-auto space-y-0.5">
          {match.clearingTransactions.map((c) => (
            <LegacyClearingTxnRow key={c.transactionId} txn={c} halaxyEnriched={halaxyEnriched} />
          ))}
        </div>
      </div>

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

// ── Legacy Clearing Txn Row ──

function LegacyClearingTxnRow({ txn, halaxyEnriched }: { txn: ClearingTransaction; halaxyEnriched: boolean }) {
  return (
    <div className="text-silver-300 text-xs font-mono flex items-center gap-1.5 flex-wrap">
      <span>${txn.amount.toFixed(2)}</span>
      <span className="text-silver-600">&mdash;</span>
      <span>{txn.invoiceNumber || txn.reference}</span>
      <span className="text-silver-600">&mdash;</span>
      <span>{txn.date}</span>
      {halaxyEnriched && txn.halaxyPatientName && (
        <>
          <span className="text-silver-600">&mdash;</span>
          <span className="text-purple-400 font-sans">{txn.halaxyPatientName}</span>
        </>
      )}
      {halaxyEnriched && txn.halaxyPaymentMethod && (
        <PaymentMethodBadge method={txn.halaxyPaymentMethod} />
      )}
    </div>
  )
}

// ── Shared Components ──

function PaymentMethodBadge({ method }: { method: string }) {
  const colours: Record<string, string> = {
    braintree: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30',
    cash: 'bg-green-900/40 text-green-300 border-green-500/30',
    eft: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/30',
    eftpos: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/30',
  }
  const key = method.toLowerCase()
  const cls = colours[key] ?? 'bg-silver-800/40 text-silver-300 border-silver-600/30'

  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${cls}`}>
      {method}
    </span>
  )
}

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
              <p>
                1. Spend Money: ${match.impliedFee.toFixed(2)} from clearing &rarr;{' '}
                {feeAccountCode || '(no account set)'}
              </p>
              <p>
                2. Bank Transfer: ${match.deposit.amount.toFixed(2)} from clearing &rarr; NAB
              </p>
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
