import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import {
  getUnreconciledBankTransactions,
  getClearingTransactions,
  suggestGroupings,
} from '@/lib/xero/client'
import type { ClearingSummaryResponse } from '@/lib/xero/types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

    const nabAccountId = process.env.XERO_NAB_ACCOUNT_ID
    const clearingAccountId = process.env.XERO_CLEARING_ACCOUNT_ID

    if (!nabAccountId || !clearingAccountId) {
      return NextResponse.json(
        { error: 'XERO_NAB_ACCOUNT_ID and XERO_CLEARING_ACCOUNT_ID env vars are required' },
        { status: 500 }
      )
    }

    // Fetch deposits and clearing transactions for the date range
    const deposits = await getUnreconciledBankTransactions(nabAccountId, fromDate, toDate)
    const clearingTxns = await getClearingTransactions(clearingAccountId, fromDate, toDate)

    // Suggest groupings with tolerance
    const { matches, unmatchedDeposits, unmatchedClearing } = suggestGroupings(
      deposits,
      clearingTxns,
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
    }

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[clearing/summary] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
