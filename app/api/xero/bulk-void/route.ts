import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { bulkVoidInvoices, dryRunVoid } from '@/lib/xero/client'
import type { BulkVoidRequest, BulkVoidResponse } from '@/lib/xero/types'

export async function POST(request: NextRequest) {
  // Auth check
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

    // Sanitise: trim and de-dupe
    const cleaned = [...new Set(invoiceNumbers.map((n) => n.trim()).filter(Boolean))]

    if (dryRun) {
      const results = dryRunVoid(cleaned)
      const resp: BulkVoidResponse = {
        total: cleaned.length,
        attempted: 0,
        voided: 0,
        skipped: cleaned.length,
        errors: [],
        dryRun: true,
      }
      return NextResponse.json(resp)
    }

    // Real void
    const results = await bulkVoidInvoices(cleaned)
    const voided = results.filter((r) => r.success).length
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({ invoiceNumber: r.invoiceNumber, message: r.message }))

    const resp: BulkVoidResponse = {
      total: cleaned.length,
      attempted: cleaned.length,
      voided,
      skipped: 0,
      errors,
      dryRun: false,
    }

    console.log(
      `[AUDIT] bulk-void by ${auth.user} at ${new Date().toISOString()} — total=${cleaned.length} voided=${voided} errors=${errors.length}`
    )

    return NextResponse.json(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[bulk-void] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
