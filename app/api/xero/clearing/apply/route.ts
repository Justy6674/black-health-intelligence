import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { applyClearing, createBatchBankTransfers } from '@/lib/xero/client'
import type {
  ClearingApplyRequest,
  ClearingApplyResponse,
  BatchReconcileRequest,
  BatchReconcileResponse,
} from '@/lib/xero/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()

    // ── Batch reconcile mode (three-way matching) ──
    if ('matches' in body && Array.isArray(body.matches)) {
      const { matches, dryRun } = body as BatchReconcileRequest
      // Medicare flag: route transfers to savings account instead of NAB
      const isMedicare = body.medicare === true
      const targetAccountId: string | undefined = isMedicare
        ? process.env.XERO_SAVINGS_ACCOUNT_ID
        : body.targetAccountId

      if (matches.length === 0) {
        return NextResponse.json(
          { error: 'matches[] must contain at least one item' },
          { status: 400 }
        )
      }

      if (dryRun) {
        const targetLabel = targetAccountId ? 'savings' : 'NAB'
        const resp: BatchReconcileResponse = {
          total: matches.length,
          succeeded: matches.length,
          failed: 0,
          results: matches.map((m) => ({
            invoiceNumber: m.invoiceNumber,
            success: true,
            message: `Dry run: would create bank transfer for $${m.amount.toFixed(2)} (${m.invoiceNumber}) → ${targetLabel}`,
          })),
          dryRun: true,
        }
        return NextResponse.json(resp)
      }

      const result = await createBatchBankTransfers(
        matches.map((m) => ({
          clearingTransactionId: m.clearingTransactionId,
          amount: m.amount,
          date: m.date,
          reference: m.reference ?? m.invoiceNumber,
        })),
        targetAccountId
      )

      const targetLabel = targetAccountId ? 'savings' : 'NAB'
      console.log(
        `[AUDIT] batch-reconcile (${targetLabel}) by ${auth.user} at ${new Date().toISOString()} — items=${matches.length} succeeded=${result.succeeded} failed=${result.failed}`
      )

      const resp: BatchReconcileResponse = {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        results: result.results.map((r) => ({
          invoiceNumber: matches.find((m) => (m.reference ?? m.invoiceNumber) === r.reference)?.invoiceNumber ?? r.reference,
          success: r.success,
          message: r.message,
          transferId: r.transferId,
        })),
        dryRun: false,
      }
      return NextResponse.json(resp)
    }

    // ── Legacy single-item mode ──
    const {
      bankTransactionId,
      clearingTransactionIds,
      dryRun,
      feeAmount,
      feeAccountCode,
    } = body as ClearingApplyRequest

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
