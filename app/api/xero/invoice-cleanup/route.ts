import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
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
  XeroInvoiceSummary,
} from '@/lib/xero/types'

const BATCH_DELAY_MS = 200

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
    const { inputMode, cutoffDate, invoiceNumbers, dryRun } = body

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
    let deleted = 0
    let voided = 0
    let paymentsRemoved = 0
    let stoppedEarly = false

    // 1. Delete DRAFT/SUBMITTED
    if (toDeleteItems.length > 0) {
      const toDeleteInvoices: XeroInvoiceSummary[] = toDeleteItems.map((i) =>
        invoices.find((inv) => inv.invoiceNumber === i.invoiceNumber)!
      )
      const { results, stoppedEarly: delStopped } = await bulkDeleteInvoices(toDeleteInvoices)
      deleted = results.filter((r) => r.success && r.action === 'DELETED').length
      const delErrors = results.filter((r) => !r.success).map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))
      errors.push(...delErrors)
      if (delStopped) stoppedEarly = true
      await sleep(BATCH_DELAY_MS)
    }

    // 2. Un-pay PAID invoices, collect for void
    const paidWipeVoidNumbers: string[] = []
    if (toPaidWipeItems.length > 0 && !stoppedEarly) {
      for (const item of toPaidWipeItems) {
        const inv = await getInvoiceByNumber(item.invoiceNumber)
        if (!inv) {
          errors.push({ invoiceNumber: item.invoiceNumber, message: 'Invoice not found in Xero' })
          stoppedEarly = true
          break
        }
        for (const p of inv.payments) {
          const result = await deletePayment(p.paymentId)
          if (!result.success) {
            errors.push({ invoiceNumber: item.invoiceNumber, message: `Payment removal failed: ${result.message}` })
            stoppedEarly = true
            break
          }
          paymentsRemoved++
        }
        if (stoppedEarly) break
        paidWipeVoidNumbers.push(item.invoiceNumber)
        await sleep(BATCH_DELAY_MS)
      }
    }

    // 3. Void AUTHORISED + newly un-paid PAID
    const voidNumbers = [...toVoidItems.map((i) => i.invoiceNumber), ...paidWipeVoidNumbers]
    if (voidNumbers.length > 0 && !stoppedEarly) {
      const { results, stoppedEarly: voidStopped } = await bulkVoidInvoices(voidNumbers)
      voided = results.filter((r) => r.success).length
      const voidErrors = results.filter((r) => !r.success).map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))
      errors.push(...voidErrors)
      if (voidStopped) stoppedEarly = true
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
    }

    console.log(
      `[AUDIT] invoice-cleanup by ${auth.user} at ${new Date().toISOString()} — mode=${inputMode} deleted=${deleted} voided=${voided} paymentsRemoved=${paymentsRemoved} errors=${errors.length} stoppedEarly=${stoppedEarly}`
    )

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[invoice-cleanup] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
