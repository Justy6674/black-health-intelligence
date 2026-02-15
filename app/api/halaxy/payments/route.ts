import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import {
  getPaymentTransactions,
  enrichPaymentsWithInvoices,
  isHalaxyConfigured,
} from '@/lib/halaxy/client'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  if (!isHalaxyConfigured()) {
    return NextResponse.json(
      { error: 'Halaxy credentials not configured (HALAXY_CLIENT_ID / HALAXY_CLIENT_SECRET)' },
      { status: 500 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate || !DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
      return NextResponse.json(
        { error: 'fromDate and toDate query params required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const enrich = searchParams.get('enrich') !== 'false'

    // Fetch payments for date range
    let payments = await getPaymentTransactions(fromDate, toDate)

    // Filter to successful payments only (exclude Failed, Refund)
    const successfulOnly = searchParams.get('successfulOnly') === 'true'
    if (successfulOnly) {
      payments = payments.filter((p) => p.type === 'Payment')
    }

    // Enrich with invoice details (patient name, invoice number)
    if (enrich) {
      payments = await enrichPaymentsWithInvoices(payments)
    }

    return NextResponse.json({
      fromDate,
      toDate,
      total: payments.length,
      payments,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[halaxy/payments] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
