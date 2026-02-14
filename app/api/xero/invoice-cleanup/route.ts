import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import {
  getInvoicesByNumbersWithStatus,
  fetchInvoicesBeforeDate,
  bulkDeleteInvoices,
  bulkVoidInvoicesWithIds,
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

/** Hobby: 60s max. Pro: up to 300. Use batchLimit to stay under timeout. */
export const maxDuration = 60

const BATCH_DELAY_MS = 1500 // Xero rate limit ~60/min; 1.5s between paid-wipe items avoids 429

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function categorise(inv: XeroInvoiceSummary): InvoiceCleanupAction {
  const s = inv.status.toUpperCase().replace(/\s+/g, ' ')
  if (s === 'DRAFT' || s === 'SUBMITTED') return 'DELETE'
  // AUTHORISED/AWAITING/PAID can all have payments or credit notes allocated.
  // Xero list API doesn't return that; we must un-pay before void. No direct void path.
  if (s === 'AUTHORISED' || s === 'AUTHORIZED' || s.includes('AWAITING') || s === 'PAID') return 'UNPAY_VOID'
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
    const unpayBatchLimit = batchLimit ?? 75

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

    // Step 1: Un-pay before void. AUTHORISED and PAID can both have hidden payments — list API
    // doesn't include allocations, so we must fetch each and remove before void.
    const paidWipeVoidWithIds: Array<{ invoiceNumber: string; invoiceId: string }> = []
    const runUnpay = runStep === 'unpay' || runStep === 'all' || runStep === 'void'
    const toUnpayAll = runStep === 'void' || runStep === 'all'
      ? [...toPaidWipeItems, ...toVoidItems]
      : toPaidWipeItems
    const toUnpayBatched = toUnpayAll.slice(0, runUnpay ? unpayBatchLimit : undefined)
    const remainingAfterUnpay = toUnpayAll.slice(toUnpayBatched.length).map((i) => i.invoiceNumber)
    if (runUnpay && toUnpayBatched.length > 0) {
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
        const payments = inv.payments ?? []
        for (const p of payments) {
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
          paidWipeVoidWithIds.push({ invoiceNumber: item.invoiceNumber, invoiceId: inv.invoiceId })
          results.push({ invoiceNumber: item.invoiceNumber, action: 'UNPAY_VOID', success: true })
        }
        await sleep(BATCH_DELAY_MS)
      }
    }

    // Step 2: Void — only what we un-paid (or had nothing to un-pay). No direct void.
    const toVoidWithIds: Array<{ invoiceNumber: string; invoiceId: string }> = []
    if (runStep === 'void' || runStep === 'all') {
      toVoidWithIds.push(...paidWipeVoidWithIds)
    }

    if (toVoidWithIds.length > 0 && !stoppedEarly) {
      const { results: voidResults, stoppedEarly: voidStopped } = await bulkVoidInvoicesWithIds(toVoidWithIds)
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
        processedAt: new Date().toISOString(),
      }),
    }

    console.log(
      `[AUDIT] invoice-cleanup by ${auth.user} at ${new Date().toISOString()} — mode=${inputMode} step=${runStep} deleted=${deleted} voided=${voided} paymentsRemoved=${paymentsRemoved} errors=${errors.length} stoppedEarly=${stoppedEarly}`
    )

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[invoice-cleanup] error:', message, stack)
    return NextResponse.json(
      { error: message, ...(process.env.NODE_ENV === 'development' && stack && { stack }) },
      { status: 500 }
    )
  }
}
