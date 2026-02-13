import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import {
  getUnreconciledBankTransactions,
  getClearingTransactions,
  suggestGroupings,
} from '@/lib/xero/client'
import type { ClearingSummaryResponse } from '@/lib/xero/types'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date query param required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const nabAccountId = process.env.XERO_NAB_ACCOUNT_ID
    const clearingAccountId = process.env.XERO_CLEARING_ACCOUNT_ID

    if (!nabAccountId || !clearingAccountId) {
      return NextResponse.json(
        { error: 'XERO_NAB_ACCOUNT_ID and XERO_CLEARING_ACCOUNT_ID env vars are required' },
        { status: 500 }
      )
    }

    // Fetch deposits and clearing transactions for the day
    const deposits = await getUnreconciledBankTransactions(nabAccountId, date, date)
    const clearingTxns = await getClearingTransactions(clearingAccountId, date, date)

    // Suggest groupings
    const { matches, unmatchedDeposits, unmatchedClearing } = suggestGroupings(
      deposits,
      clearingTxns
    )

    const resp: ClearingSummaryResponse = {
      date,
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
