import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'

/** Max 5 min to avoid 504. Stage 1 un-pay is rate-limited; use batchLimit for large runs. */
export const maxDuration = 300
import {
  getInvoicesByNumbersWithStatus,
  fetchInvoicesBeforeDate,
  bulkDeleteInvoices,
  bulkVoidInvoices,
  getInvoiceByNumber,
  deletePayment,
} from '@/lib/xero/client'
import type {
  InvoiceCleanupRequest,
  InvoiceCleanupResponse,
  InvoiceCleanupItem,
  InvoiceCleanupAction,
  InvoiceCleanupResultItem,
  InvoiceCleanupVerifyResponse,
  XeroInvoiceSummary,
} from '@/lib/xero/types'

const BATCH_DELAY_MS = 1500 // Xero rate limit ~60/min; 1.5s between paid-wipe items avoids 429

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function categorise(inv: XeroInvoiceSummary): InvoiceCleanupAction {
  const s = inv.status.toUpperCase().replace(/\s+/g, ' ')
  if (s === 'DRAFT' || s === 'SUBMITTED') return 'DELETE'
  if (s === 'AUTHORISED' || s === 'AUTHORIZED' || s.includes('AWAITING')) return 'VOID'
  if (s === 'PAID') return 'UNPAY_VOID'
  return 'SKIP'
}

function normaliseStatus(s: string): string {
  const u = s.toUpperCase()
  if (u === 'AUTHORIZED') return 'AUTHORISED'
  return u
}

function toItem(inv: XeroInvoiceSummary, action: InvoiceCleanupAction): InvoiceCleanupItem {
  return {
    invoiceNumber: inv.invoiceNumber,
    invoiceId: inv.invoiceId,
    date: inv.date,
    total: inv.total,
    status: inv.status,
    action,
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body: InvoiceCleanupRequest = await request.json()
    const { inputMode, cutoffDate, invoiceNumbers, dryRun, step, verifyOnly, batchLimit } = body
    const unpayBatchLimit = batchLimit ?? 50

    // ── Verify only: re-fetch from Xero, return current status ──
    if (verifyOnly && Array.isArray(invoiceNumbers) && invoiceNumbers.length > 0) {
      const cleaned = [...new Set(invoiceNumbers.map((n) => String(n).trim()).filter(Boolean))]
      const expectedMap = body.expectedByInvoice
      const found = await getInvoicesByNumbersWithStatus(cleaned)
      const foundByNum = new Map(found.map((inv) => [inv.invoiceNumber.toUpperCase(), inv]))
      const verified: InvoiceCleanupVerifyResponse['verified'] = cleaned.map((num) => {
        const inv = foundByNum.get(num.toUpperCase())
        const status = inv ? normaliseStatus(inv.status) : 'not found'
        const expected = expectedMap?.[num]
        const expNorm = expected?.toLowerCase() === 'not found' ? 'not found' : normaliseStatus(expected ?? '')
        const ok = expected ? status === expNorm : true
        return { invoiceNumber: num, status, expected, ok }
      })
      return NextResponse.json({ verified })
    }

    if (inputMode !== 'csv' && inputMode !== 'fetch') {
      return NextResponse.json({ error: 'inputMode must be "csv" or "fetch"' }, { status: 400 })
    }

    let invoices: XeroInvoiceSummary[] = []

    if (inputMode === 'fetch') {
      if (!cutoffDate || !/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
        return NextResponse.json(
          { error: 'cutoffDate required and must be YYYY-MM-DD for fetch mode' },
          { status: 400 }
        )
      }
      invoices = await fetchInvoicesBeforeDate(cutoffDate)
    } else {
      if (!Array.isArray(invoiceNumbers) || invoiceNumbers.length === 0) {
        return NextResponse.json(
          { error: 'invoiceNumbers required and must be non-empty for csv mode' },
          { status: 400 }
        )
      }
      const cleaned = [...new Set(invoiceNumbers.map((n) => String(n).trim()).filter(Boolean))]
      invoices = await getInvoicesByNumbersWithStatus(cleaned)
    }

    const items: InvoiceCleanupItem[] = invoices.map((inv) => {
      const action = categorise(inv)
      return toItem(inv, action)
    })

    const toDeleteItems = items.filter((i) => i.action === 'DELETE')
    const toVoidItems = items.filter((i) => i.action === 'VOID')
    const toPaidWipeItems = items.filter((i) => i.action === 'UNPAY_VOID')
    const skippedCount = items.filter((i) => i.action === 'SKIP').length

    if (dryRun) {
      const resp: InvoiceCleanupResponse = {
        inputMode,
        cutoffDate: inputMode === 'fetch' ? cutoffDate : undefined,
        invoices: items,
        toDelete: toDeleteItems.length,
        toVoid: toVoidItems.length,
        toUnpayVoid: toPaidWipeItems.length,
        skipped: skippedCount,
        deleted: 0,
        voided: 0,
        paymentsRemoved: 0,
        errors: [],
        dryRun: true,
        user: auth.user,
      }
      return NextResponse.json(resp)
    }

    const errors: Array<{ invoiceNumber: string; message: string }> = []
    const results: InvoiceCleanupResultItem[] = []
    let deleted = 0
    let voided = 0
    let paymentsRemoved = 0
    let stoppedEarly = false
    const runStep = step === 'all' || !step ? 'all' : step

    // Helper to add per-invoice results
    function addResults(
      r: { invoiceNumber: string; success: boolean; message: string }[],
      action: InvoiceCleanupAction
    ) {
      for (const x of r) {
        results.push({
          invoiceNumber: x.invoiceNumber,
          action,
          success: x.success,
          message: x.success ? undefined : x.message,
        })
      }
    }

    // Step 1: Un-pay PAID invoices (only when step is unpay or all)
    const paidWipeVoidNumbers: string[] = []
    const toUnpayBatched = toPaidWipeItems.slice(0, runStep === 'unpay' || runStep === 'all' ? unpayBatchLimit : undefined)
    const remainingAfterUnpay = toPaidWipeItems.slice(toUnpayBatched.length).map((i) => i.invoiceNumber)
    if ((runStep === 'unpay' || runStep === 'all') && toUnpayBatched.length > 0) {
      for (const item of toUnpayBatched) {
        if (stoppedEarly) break
        const inv = await getInvoiceByNumber(item.invoiceNumber)
        if (!inv) {
          errors.push({ invoiceNumber: item.invoiceNumber, message: 'Invoice not found in Xero' })
          results.push({ invoiceNumber: item.invoiceNumber, action: 'UNPAY_VOID', success: false, message: 'Invoice not found in Xero' })
          stoppedEarly = true
          break
        }
        let ok = true
        for (const p of inv.payments) {
          const result = await deletePayment(p.paymentId)
          if (!result.success) {
            errors.push({ invoiceNumber: item.invoiceNumber, message: `Payment removal failed: ${result.message}` })
            results.push({ invoiceNumber: item.invoiceNumber, action: 'UNPAY_VOID', success: false, message: result.message })
            stoppedEarly = true
            ok = false
            break
          }
          paymentsRemoved++
          await sleep(500)
        }
        if (ok) {
          paidWipeVoidNumbers.push(item.invoiceNumber)
          results.push({ invoiceNumber: item.invoiceNumber, action: 'UNPAY_VOID', success: true })
        }
        await sleep(BATCH_DELAY_MS)
      }
    }

    // Step 2: Void AUTHORISED (and newly un-paid when runStep is all)
    // When step=void, re-fetch to get current AUTHORISED invoices (including ones we just un-paid if called after unpay)
    let voidNumbers: string[] = []
    if (runStep === 'void') {
      let fresh: XeroInvoiceSummary[]
      if (inputMode === 'fetch' && cutoffDate) {
        fresh = await fetchInvoicesBeforeDate(cutoffDate)
      } else {
        const numsToCheck =
          Array.isArray(invoiceNumbers) && invoiceNumbers.length > 0
            ? invoiceNumbers
            : invoices.map((i) => i.invoiceNumber)
        fresh = await getInvoicesByNumbersWithStatus(numsToCheck)
      }
      const toVoidNow = fresh.filter((inv) => {
        const s = normaliseStatus(inv.status)
        return s === 'AUTHORISED' || s.includes('AWAITING')
      })
      voidNumbers = toVoidNow.map((i) => i.invoiceNumber)
    } else if (runStep === 'all') {
      voidNumbers = [...toVoidItems.map((i) => i.invoiceNumber), ...paidWipeVoidNumbers]
    }

    if (voidNumbers.length > 0 && !stoppedEarly) {
      const { results: voidResults, stoppedEarly: voidStopped } = await bulkVoidInvoices(voidNumbers)
      voided = voidResults.filter((r) => r.success).length
      const voidErrors = voidResults.filter((r) => !r.success).map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))
      errors.push(...voidErrors)
      addResults(voidResults, 'VOID')
      if (voidStopped) stoppedEarly = true
    }

    // Step 3: Delete DRAFT/SUBMITTED (only when step is delete or all)
    if ((runStep === 'delete' || runStep === 'all') && toDeleteItems.length > 0 && !stoppedEarly) {
      const toDeleteInvoices: XeroInvoiceSummary[] = toDeleteItems.map((i) =>
        invoices.find((inv) => inv.invoiceNumber === i.invoiceNumber)!
      )
      const { results: delResults, stoppedEarly: delStopped } = await bulkDeleteInvoices(toDeleteInvoices)
      deleted = delResults.filter((r) => r.success && r.action === 'DELETED').length
      const delErrors = delResults.filter((r) => !r.success).map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))
      errors.push(...delErrors)
      addResults(
        delResults.map((r) => ({ invoiceNumber: r.invoiceNumber, success: r.success, message: r.message })),
        'DELETE'
      )
      if (delStopped) stoppedEarly = true
      await sleep(BATCH_DELAY_MS)
    }

    const resp: InvoiceCleanupResponse = {
      inputMode,
      cutoffDate: inputMode === 'fetch' ? cutoffDate : undefined,
      invoices: items,
      toDelete: toDeleteItems.length,
      toVoid: toVoidItems.length,
      toUnpayVoid: toPaidWipeItems.length,
      skipped: skippedCount,
      deleted,
      voided,
      paymentsRemoved,
      errors,
      dryRun: false,
      stoppedEarly,
      user: auth.user,
      results,
      ...(remainingAfterUnpay.length > 0 && {
        partial: true,
        remainingInvoiceNumbers: remainingAfterUnpay,
      }),
    }

    console.log(
      `[AUDIT] invoice-cleanup by ${auth.user} at ${new Date().toISOString()} — mode=${inputMode} step=${runStep} deleted=${deleted} voided=${voided} paymentsRemoved=${paymentsRemoved} errors=${errors.length} stoppedEarly=${stoppedEarly}`
    )

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[invoice-cleanup] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
