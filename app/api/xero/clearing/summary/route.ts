import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import {
  getUnreconciledBankTransactions,
  getClearingTransactions,
  suggestGroupings,
  reconcileThreeWay,
} from '@/lib/xero/client'
import type { ClearingSummaryResponse, ClearingTransaction, ReconciliationResult } from '@/lib/xero/types'
import {
  isHalaxyConfigured,
  getPaymentTransactions,
  enrichPaymentsWithInvoices,
  getBraintreePayments,
} from '@/lib/halaxy/client'
import type { HalaxyPayment } from '@/lib/halaxy/types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Cross-reference Halaxy payments with Xero clearing transactions (legacy mode).
 * Matching strategy:
 * 1. Invoice number match (Xero reference === Halaxy invoice identifier)
 * 2. Amount + date match as fallback
 */
function enrichWithHalaxy(
  clearingTxns: ClearingTransaction[],
  halaxyPayments: HalaxyPayment[]
): {
  enrichedTxns: ClearingTransaction[]
  syncGaps: ClearingSummaryResponse['syncGaps']
} {
  // Build lookup maps
  const paymentsByInvoiceNumber = new Map<string, HalaxyPayment[]>()
  const paymentsByAmountDate = new Map<string, HalaxyPayment[]>()

  for (const p of halaxyPayments) {
    // Only match successful payments
    if (p.type !== 'Payment') continue

    if (p.invoiceNumber) {
      const key = p.invoiceNumber.toUpperCase()
      const list = paymentsByInvoiceNumber.get(key) ?? []
      list.push(p)
      paymentsByInvoiceNumber.set(key, list)
    }

    // Amount+date key for fallback matching
    const amountCents = Math.round(p.amount * 100)
    const dateKey = p.created.slice(0, 10)
    const key = `${amountCents}:${dateKey}`
    const list = paymentsByAmountDate.get(key) ?? []
    list.push(p)
    paymentsByAmountDate.set(key, list)
  }

  const matchedHalaxyIds = new Set<string>()
  const enrichedTxns: ClearingTransaction[] = clearingTxns.map((txn) => {
    // Strategy 1: Match by invoice number (Xero reference field)
    const ref = (txn.reference || txn.invoiceNumber || '').toUpperCase()
    if (ref) {
      const matches = paymentsByInvoiceNumber.get(ref)
      if (matches && matches.length > 0) {
        const match = matches.find((m) => !matchedHalaxyIds.has(m.id)) ?? matches[0]
        matchedHalaxyIds.add(match.id)
        return {
          ...txn,
          halaxyInvoiceNumber: match.invoiceNumber,
          halaxyPatientName: match.patientName,
          halaxyPaymentMethod: match.method,
          halaxyAmount: match.amount,
          halaxyMatchType: 'exact' as const,
        }
      }
    }

    // Strategy 2: Amount + date fallback
    const amountCents = Math.round(txn.amount * 100)
    const amountDateKey = `${amountCents}:${txn.date}`
    const amountMatches = paymentsByAmountDate.get(amountDateKey)
    if (amountMatches) {
      const match = amountMatches.find((m) => !matchedHalaxyIds.has(m.id))
      if (match) {
        matchedHalaxyIds.add(match.id)
        return {
          ...txn,
          halaxyInvoiceNumber: match.invoiceNumber,
          halaxyPatientName: match.patientName,
          halaxyPaymentMethod: match.method,
          halaxyAmount: match.amount,
          halaxyMatchType: 'amount-only' as const,
        }
      }
    }

    return { ...txn, halaxyMatchType: 'missing' as const }
  })

  // Sync gaps: Halaxy payments not matched to any Xero clearing txn
  const missingFromXero = halaxyPayments
    .filter((p) => p.type === 'Payment' && !matchedHalaxyIds.has(p.id))
    .map((p) => ({
      id: p.id,
      created: p.created,
      amount: p.amount,
      method: p.method,
      invoiceNumber: p.invoiceNumber,
      patientName: p.patientName,
    }))

  // Xero clearing txns not matched to Halaxy
  const notFromHalaxy = enrichedTxns.filter((t) => t.halaxyMatchType === 'missing')

  return {
    enrichedTxns,
    syncGaps: { missingFromXero, notFromHalaxy },
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)

    // Support date range (fromDate/toDate) with single-date fallback
    let fromDate = searchParams.get('fromDate')
    let toDate = searchParams.get('toDate')
    const singleDate = searchParams.get('date')

    if (!fromDate && singleDate && DATE_RE.test(singleDate)) {
      fromDate = singleDate
      toDate = singleDate
    }

    if (!fromDate || !toDate || !DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
      return NextResponse.json(
        { error: 'fromDate and toDate (or date) query params required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const toleranceParam = searchParams.get('tolerance')
    const toleranceCents = toleranceParam ? Math.max(0, Math.round(Number(toleranceParam))) : 500

    // Mode selection: three-way (default when Halaxy configured) or legacy
    const modeParam = searchParams.get('mode')
    const halaxyParam = searchParams.get('halaxy')
    const halaxyConfigured = isHalaxyConfigured()
    const useThreeWay = modeParam === 'threeway' || (modeParam !== 'legacy' && halaxyConfigured && halaxyParam !== 'false')

    const nabAccountId = process.env.XERO_NAB_ACCOUNT_ID
    const clearingAccountId = process.env.XERO_CLEARING_ACCOUNT_ID

    if (!nabAccountId || !clearingAccountId) {
      return NextResponse.json(
        { error: 'XERO_NAB_ACCOUNT_ID and XERO_CLEARING_ACCOUNT_ID env vars are required' },
        { status: 500 }
      )
    }

    // ── Three-way matching mode ──
    if (useThreeWay) {
      const [deposits, clearingTxns, halaxyPayments] = await Promise.all([
        getUnreconciledBankTransactions(nabAccountId, fromDate, toDate),
        getClearingTransactions(clearingAccountId, fromDate, toDate),
        getBraintreePayments(fromDate, toDate),
      ])

      const result: ReconciliationResult = reconcileThreeWay(
        halaxyPayments,
        clearingTxns,
        deposits
      )

      return NextResponse.json(result)
    }

    // ── Legacy mode: subset-sum matching (fallback) ──
    const wantHalaxy = halaxyParam !== 'false' && halaxyConfigured

    const [deposits, clearingTxns] = await Promise.all([
      getUnreconciledBankTransactions(nabAccountId, fromDate, toDate),
      getClearingTransactions(clearingAccountId, fromDate, toDate),
    ])

    // Optionally enrich with Halaxy data
    let enrichedClearing = clearingTxns
    let halaxyEnriched = false
    let syncGaps: ClearingSummaryResponse['syncGaps'] = undefined

    if (wantHalaxy) {
      try {
        let halaxyPayments = await getPaymentTransactions(fromDate, toDate)
        halaxyPayments = await enrichPaymentsWithInvoices(halaxyPayments)

        const result = enrichWithHalaxy(clearingTxns, halaxyPayments)
        enrichedClearing = result.enrichedTxns
        syncGaps = result.syncGaps
        halaxyEnriched = true
      } catch (err) {
        // Halaxy enrichment failed — continue without it
        console.error('[clearing/summary] Halaxy enrichment failed:', err)
      }
    }

    // Suggest groupings with tolerance
    const { matches, unmatchedDeposits, unmatchedClearing } = suggestGroupings(
      deposits,
      enrichedClearing,
      toleranceCents
    )

    const resp: ClearingSummaryResponse = {
      date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
      fromDate,
      toDate,
      toleranceCents,
      deposits: matches,
      unmatchedDeposits,
      unmatchedClearing,
      halaxyEnriched,
      syncGaps,
    }

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[clearing/summary] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
