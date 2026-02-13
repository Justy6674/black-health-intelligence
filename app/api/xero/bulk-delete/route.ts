import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { fetchInvoicesBeforeDate, bulkDeleteInvoices, dryRunDelete } from '@/lib/xero/client'
import type { BulkDeleteRequest, BulkDeleteResponse } from '@/lib/xero/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body: BulkDeleteRequest = await request.json()
    const { cutoffDate, dryRun, fetchOnly } = body

    if (!cutoffDate || !/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
      return NextResponse.json(
        { error: 'cutoffDate must be a valid ISO date (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Safety: reject dates too far in the future
    const cutoff = new Date(cutoffDate)
    if (isNaN(cutoff.getTime())) {
      return NextResponse.json({ error: 'Invalid cutoff date' }, { status: 400 })
    }

    // Fetch invoices from Xero
    const invoices = await fetchInvoicesBeforeDate(cutoffDate)

    // If fetchOnly, just return the invoice list
    if (fetchOnly) {
      const resp: BulkDeleteResponse = {
        cutoffDate,
        totalFound: invoices.length,
        deleted: 0,
        voided: 0,
        skipped: 0,
        errors: [],
        dryRun: true,
        invoices,
        user: auth.user,
      }
      return NextResponse.json(resp)
    }

    if (invoices.length === 0) {
      const resp: BulkDeleteResponse = {
        cutoffDate,
        totalFound: 0,
        deleted: 0,
        voided: 0,
        skipped: 0,
        errors: [],
        dryRun,
        user: auth.user,
      }
      return NextResponse.json(resp)
    }

    if (dryRun) {
      const results = dryRunDelete(invoices)
      const deleted = results.filter((r) => r.action === 'DELETED' && r.success).length
      const voided = results.filter((r) => r.action === 'VOIDED' && r.success).length
      const skipped = results.filter((r) => r.action === 'SKIPPED').length

      const resp: BulkDeleteResponse = {
        cutoffDate,
        totalFound: invoices.length,
        deleted,
        voided,
        skipped,
        errors: [],
        dryRun: true,
        invoices,
        user: auth.user,
      }
      return NextResponse.json(resp)
    }

    // Live run
    const { results, stoppedEarly } = await bulkDeleteInvoices(invoices)
    const deleted = results.filter((r) => r.action === 'DELETED' && r.success).length
    const voided = results.filter((r) => r.action === 'VOIDED' && r.success).length
    const skipped = results.filter((r) => r.action === 'SKIPPED').length
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))

    const resp: BulkDeleteResponse = {
      cutoffDate,
      totalFound: invoices.length,
      deleted,
      voided,
      skipped,
      errors,
      dryRun: false,
      stoppedEarly,
      user: auth.user,
    }

    console.log(
      `[AUDIT] bulk-delete by ${auth.user} at ${new Date().toISOString()} — cutoff=${cutoffDate} found=${invoices.length} deleted=${deleted} voided=${voided} skipped=${skipped} errors=${errors.length} stoppedEarly=${stoppedEarly}`
    )

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[bulk-delete] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
