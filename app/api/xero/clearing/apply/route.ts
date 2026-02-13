import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { applyClearing } from '@/lib/xero/client'
import type { ClearingApplyRequest, ClearingApplyResponse } from '@/lib/xero/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body: ClearingApplyRequest = await request.json()
    const { bankTransactionId, clearingTransactionIds, dryRun } = body

    if (!bankTransactionId || !Array.isArray(clearingTransactionIds) || clearingTransactionIds.length === 0) {
      return NextResponse.json(
        { error: 'bankTransactionId and non-empty clearingTransactionIds[] required' },
        { status: 400 }
      )
    }

    if (dryRun) {
      const resp: ClearingApplyResponse = {
        bankTransactionId,
        matched: clearingTransactionIds.length,
        total: 0,
        success: true,
        message: `Dry run: would link ${clearingTransactionIds.length} clearing transactions to deposit ${bankTransactionId}`,
        dryRun: true,
      }
      return NextResponse.json(resp)
    }

    const result = await applyClearing(bankTransactionId, clearingTransactionIds)

    console.log(
      `[AUDIT] clearing-apply by ${auth.user} at ${new Date().toISOString()} — bankTxn=${bankTransactionId} clearing=${clearingTransactionIds.length} success=${result.success}`
    )

    const resp: ClearingApplyResponse = {
      bankTransactionId,
      matched: clearingTransactionIds.length,
      total: 0,
      success: result.success,
      message: result.message,
      dryRun: false,
    }
    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[clearing/apply] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
