import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { applyClearing } from '@/lib/xero/client'
import type { ClearingApplyRequest, ClearingApplyResponse } from '@/lib/xero/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body: ClearingApplyRequest = await request.json()
    const { bankTransactionId, clearingTransactionIds, dryRun, feeAmount, feeAccountCode } = body

    if (!bankTransactionId || !Array.isArray(clearingTransactionIds) || clearingTransactionIds.length === 0) {
      return NextResponse.json(
        { error: 'bankTransactionId and non-empty clearingTransactionIds[] required' },
        { status: 400 }
      )
    }

    if (feeAmount && feeAmount > 0 && !feeAccountCode) {
      return NextResponse.json(
        { error: 'feeAccountCode is required when feeAmount is provided' },
        { status: 400 }
      )
    }

    if (dryRun) {
      const parts = [`Dry run: would create bank transfer for deposit ${bankTransactionId}`]
      parts.push(`linking ${clearingTransactionIds.length} clearing transaction(s)`)
      if (feeAmount && feeAmount > 0) {
        parts.push(`and post $${feeAmount.toFixed(2)} Spend Money fee to account ${feeAccountCode}`)
      }
      const resp: ClearingApplyResponse = {
        bankTransactionId,
        matched: clearingTransactionIds.length,
        total: 0,
        success: true,
        message: parts.join('; '),
        dryRun: true,
      }
      return NextResponse.json(resp)
    }

    const result = await applyClearing(bankTransactionId, clearingTransactionIds, {
      feeAmount: feeAmount ?? 0,
      feeAccountCode,
    })

    console.log(
      `[AUDIT] clearing-apply by ${auth.user} at ${new Date().toISOString()} — bankTxn=${bankTransactionId} clearing=${clearingTransactionIds.length} fee=${feeAmount ?? 0} success=${result.success}`
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
