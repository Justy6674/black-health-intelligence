import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { purgeAccountBefore } from '@/lib/xero/client'

export const maxDuration = 60

/**
 * POST /api/xero/clearing/purge
 * Purge old entries from a Xero bank account before a cutoff date.
 * Body: { accountId: string, cutoffDate: string, dryRun: boolean }
 *
 * Accepts "savings" or "clearing" as accountId shortcuts.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { cutoffDate, dryRun = true } = body
    let { accountId } = body

    if (!cutoffDate || !/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
      return NextResponse.json(
        { error: 'cutoffDate required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    // Resolve account shortcuts
    if (accountId === 'savings') {
      accountId = process.env.XERO_SAVINGS_ACCOUNT_ID
    } else if (accountId === 'clearing') {
      accountId = process.env.XERO_CLEARING_ACCOUNT_ID
    } else if (accountId === 'nab') {
      accountId = process.env.XERO_NAB_ACCOUNT_ID
    }

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId required (or set XERO_SAVINGS_ACCOUNT_ID / XERO_CLEARING_ACCOUNT_ID env vars)' },
        { status: 400 }
      )
    }

    const result = await purgeAccountBefore(accountId, cutoffDate, dryRun)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[clearing/purge] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
