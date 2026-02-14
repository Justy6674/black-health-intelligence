import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import {
  getInvoiceByNumber,
  deletePayment,
  bulkVoidInvoices,
} from '@/lib/xero/client'
import type { PaidWipeRequest, PaidWipeResponse } from '@/lib/xero/types'

const BATCH_DELAY_MS = 1500

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body: PaidWipeRequest = await request.json()
    const { invoiceNumbers, dryRun } = body

    if (!Array.isArray(invoiceNumbers) || invoiceNumbers.length === 0) {
      return NextResponse.json(
        { error: 'invoiceNumbers must be a non-empty array of strings' },
        { status: 400 }
      )
    }

    const cleaned = [...new Set(invoiceNumbers.map((n) => n.trim()).filter(Boolean))]

    if (dryRun) {
      const resp: PaidWipeResponse = {
        total: cleaned.length,
        attempted: 0,
        voided: 0,
        skipped: 0,
        errors: [],
        paymentsRemoved: [],
        dryRun: true,
        user: auth.user,
      }
      return NextResponse.json(resp)
    }

    const paymentsRemoved: Array<{ invoiceNumber: string; paymentIds: string[] }> = []
    const errors: Array<{ invoiceNumber: string; message: string }> = []
    const unPaidInvoiceNumbers: string[] = []

    for (const num of cleaned) {
      const inv = await getInvoiceByNumber(num)
      if (!inv) {
        errors.push({ invoiceNumber: num, message: 'Invoice not found in Xero' })
        break
      }

      const removedIds: string[] = []
      for (const p of inv.payments) {
        const result = await deletePayment(p.paymentId)
        if (!result.success) {
          errors.push({ invoiceNumber: num, message: `Payment removal failed: ${result.message}` })
          break
        }
        removedIds.push(p.paymentId)
      }
      if (errors.length > 0) break

      if (removedIds.length > 0) {
        paymentsRemoved.push({ invoiceNumber: num, paymentIds: removedIds })
      }
      unPaidInvoiceNumbers.push(num)
      await sleep(200)
    }

    const voidTarget = errors.length > 0 ? unPaidInvoiceNumbers : cleaned
    const { results, stoppedEarly: voidStopped } = await bulkVoidInvoices(voidTarget)
    const voided = results.filter((r) => r.success).length
    const voidErrors = results
      .filter((r) => !r.success)
      .map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))

    const stoppedEarly = errors.length > 0 || voidStopped
    const resp: PaidWipeResponse = {
      total: cleaned.length,
      attempted: voidTarget.length,
      voided,
      skipped: 0,
      errors: errors.length > 0 ? errors : voidErrors,
      paymentsRemoved,
      dryRun: false,
      stoppedEarly,
      user: auth.user,
    }

    console.log(
      `[AUDIT] paid-wipe by ${auth.user} at ${new Date().toISOString()} — total=${cleaned.length} paymentsRemoved=${paymentsRemoved.length} voided=${voided} errors=${resp.errors.length} stoppedEarly=${stoppedEarly}`
    )

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[paid-wipe] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
