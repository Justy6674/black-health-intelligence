import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { bulkVoidInvoices, dryRunVoid } from '@/lib/xero/client'
import type { BulkVoidRequest, BulkVoidResponse } from '@/lib/xero/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body: BulkVoidRequest = await request.json()
    const { invoiceNumbers, dryRun } = body

    if (!Array.isArray(invoiceNumbers) || invoiceNumbers.length === 0) {
      return NextResponse.json(
        { error: 'invoiceNumbers must be a non-empty array of strings' },
        { status: 400 }
      )
    }

    const cleaned = [...new Set(invoiceNumbers.map((n) => n.trim()).filter(Boolean))]

    if (dryRun) {
      dryRunVoid(cleaned)
      const resp: BulkVoidResponse = {
        total: cleaned.length,
        attempted: 0,
        voided: 0,
        skipped: cleaned.length,
        errors: [],
        dryRun: true,
        user: auth.user,
      }
      return NextResponse.json(resp)
    }

    const { results, stoppedEarly } = await bulkVoidInvoices(cleaned)
    const voided = results.filter((r) => r.success).length
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))

    const resp: BulkVoidResponse = {
      total: cleaned.length,
      attempted: results.length,
      voided,
      skipped: 0,
      errors,
      dryRun: false,
      stoppedEarly,
      user: auth.user,
    }

    console.log(
      `[AUDIT] bulk-void by ${auth.user} at ${new Date().toISOString()} — total=${cleaned.length} voided=${voided} errors=${errors.length} stoppedEarly=${stoppedEarly}`
    )

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[bulk-void] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
