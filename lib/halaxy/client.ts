import type { HalaxyInvoice, HalaxyPayment } from './types'

// ── Environment ──

const HALAXY_TOKEN_URL = 'https://au-api.halaxy.com/main/oauth/token'
const HALAXY_API_BASE = 'https://au-api.halaxy.com/main'
const PAGE_SIZE = 100

function env(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing env var ${key}`)
  return v
}

// ── Token management (50-min cache, token expires at 60 min) ──

let cachedToken: { accessToken: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken
  }

  const clientId = env('HALAXY_CLIENT_ID')
  const clientSecret = env('HALAXY_CLIENT_SECRET')

  const res = await fetch(HALAXY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Halaxy token request failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    accessToken: data.access_token,
    // Cache for 50 minutes (token expires at 60 min)
    expiresAt: Date.now() + 50 * 60 * 1000,
  }
  return cachedToken.accessToken
}

async function halaxyHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'BlackHealthIntelligence/1.0',
  }
}

// ── FHIR response parsing ──

interface FhirBundle {
  entry?: Array<{ resource: Record<string, unknown> }>
  link?: Array<{ relation: string; url: string }>
  total?: number
}

function hasNextPage(bundle: FhirBundle): boolean {
  return bundle.link?.some((l) => l.relation === 'next') ?? false
}

// ── Invoice functions ──

function parseInvoice(resource: Record<string, unknown>): HalaxyInvoice {
  return {
    id: String(resource.id ?? ''),
    identifier: String(
      (resource.identifier as Array<{ value: string }> | undefined)?.[0]?.value ?? ''
    ),
    date: String(resource.date ?? ''),
    status: String(resource.status ?? ''),
    payorType: String(
      (resource.payorType as Record<string, string> | undefined)?.text ?? ''
    ),
    title: String(resource.title ?? ''),
    practitionerRef: String(
      (resource.practitioner as Record<string, string> | undefined)?.reference ?? ''
    ),
    totalNet: Number(
      (resource.totalNet as Record<string, unknown> | undefined)?.value ?? 0
    ),
    totalGross: Number(
      (resource.totalGross as Record<string, unknown> | undefined)?.value ?? 0
    ),
    totalBalance: Number(
      (resource.totalBalance as Record<string, unknown> | undefined)?.value ?? 0
    ),
    totalTax: Number(
      (resource.totalTax as Record<string, unknown> | undefined)?.value ?? 0
    ),
    totalPaid: Number(
      (resource.totalPaid as Record<string, unknown> | undefined)?.value ?? 0
    ),
  }
}

/** Fetch invoices for a date range. Auto-paginates. */
export async function getInvoices(
  fromDate: string,
  toDate: string
): Promise<HalaxyInvoice[]> {
  const headers = await halaxyHeaders()
  const invoices: HalaxyInvoice[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      _count: String(PAGE_SIZE),
      _offset: String(offset),
      date: `ge${fromDate}`,
    })
    // Halaxy FHIR doesn't support le (less-than-equal) on same param,
    // so we filter toDate client-side if needed
    const url = `${HALAXY_API_BASE}/Invoice?${params}`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Halaxy Invoices ${res.status}: ${text.slice(0, 300)}`)
    }

    const bundle: FhirBundle = await res.json()
    const entries = bundle.entry ?? []

    for (const entry of entries) {
      const inv = parseInvoice(entry.resource)
      // Client-side toDate filter
      if (inv.date <= toDate) {
        invoices.push(inv)
      }
    }

    hasMore = entries.length === PAGE_SIZE && hasNextPage(bundle)
    offset += PAGE_SIZE
  }

  return invoices
}

/** Fetch a single invoice by ID. */
export async function getInvoice(id: string): Promise<HalaxyInvoice | null> {
  const headers = await halaxyHeaders()
  const res = await fetch(`${HALAXY_API_BASE}/Invoice/${id}`, { headers })
  if (!res.ok) {
    if (res.status === 404) return null
    const text = await res.text()
    throw new Error(`Halaxy Invoice ${res.status}: ${text.slice(0, 300)}`)
  }
  const resource = await res.json()
  return parseInvoice(resource)
}

// ── Payment functions ──

function parsePayment(resource: Record<string, unknown>): HalaxyPayment {
  const invoiceRef = String(
    (resource.invoice as Record<string, string> | undefined)?.reference ?? ''
  )
  // Extract invoice ID from reference URL like "Invoice/12345"
  const invoiceId = invoiceRef.split('/').pop() ?? ''

  return {
    id: String(resource.id ?? ''),
    created: String(resource.created ?? ''),
    method: String(
      (resource.method as Record<string, string> | undefined)?.text ?? ''
    ),
    type: String(
      (resource.type as Record<string, string> | undefined)?.text ?? ''
    ),
    amount: Number(
      (resource.amount as Record<string, unknown> | undefined)?.value ?? 0
    ),
    invoiceId,
  }
}

/** Fetch payment transactions for a date range. Auto-paginates. */
export async function getPaymentTransactions(
  fromDate: string,
  toDate: string
): Promise<HalaxyPayment[]> {
  const headers = await halaxyHeaders()
  const payments: HalaxyPayment[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      _count: String(PAGE_SIZE),
      _offset: String(offset),
      created: `ge${fromDate}`,
    })
    const url = `${HALAXY_API_BASE}/PaymentTransaction?${params}`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Halaxy Payments ${res.status}: ${text.slice(0, 300)}`)
    }

    const bundle: FhirBundle = await res.json()
    const entries = bundle.entry ?? []

    for (const entry of entries) {
      const payment = parsePayment(entry.resource)
      // Client-side toDate filter (compare created date)
      const createdDate = payment.created.slice(0, 10)
      if (createdDate <= toDate) {
        payments.push(payment)
      }
    }

    hasMore = entries.length === PAGE_SIZE && hasNextPage(bundle)
    offset += PAGE_SIZE
  }

  return payments
}

/** Fetch payments for a specific invoice. */
export async function getPaymentsByInvoice(
  invoiceId: string
): Promise<HalaxyPayment[]> {
  const headers = await halaxyHeaders()
  const params = new URLSearchParams({
    _count: String(PAGE_SIZE),
    'invoice': `Invoice/${invoiceId}`,
  })
  const url = `${HALAXY_API_BASE}/PaymentTransaction?${params}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Halaxy PaymentsByInvoice ${res.status}: ${text.slice(0, 300)}`)
  }
  const bundle: FhirBundle = await res.json()
  return (bundle.entry ?? []).map((e) => parsePayment(e.resource))
}

/**
 * Enrich payments with invoice details (patient name, invoice number).
 * Batches invoice lookups to avoid excessive API calls.
 */
export async function enrichPaymentsWithInvoices(
  payments: HalaxyPayment[]
): Promise<HalaxyPayment[]> {
  // Collect unique invoice IDs
  const invoiceIds = [...new Set(payments.map((p) => p.invoiceId).filter(Boolean))]

  // Fetch invoices in parallel (capped at 10 concurrent)
  const invoiceMap = new Map<string, HalaxyInvoice>()
  const CONCURRENCY = 10
  for (let i = 0; i < invoiceIds.length; i += CONCURRENCY) {
    const batch = invoiceIds.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map((id) => getInvoice(id)))
    for (let j = 0; j < batch.length; j++) {
      const inv = results[j]
      if (inv) invoiceMap.set(batch[j], inv)
    }
  }

  // Attach invoice details to payments
  return payments.map((p) => {
    const inv = invoiceMap.get(p.invoiceId)
    return {
      ...p,
      invoiceNumber: inv?.identifier,
      patientName: inv?.title,
    }
  })
}

/**
 * Fetch only Braintree payments (method="Braintree", type="Payment") for a date range.
 * These are the card payments that flow through clearing → NAB.
 * Automatically enriches with invoice details (patient name, invoice number).
 */
export async function getBraintreePayments(
  fromDate: string,
  toDate: string
): Promise<HalaxyPayment[]> {
  const allPayments = await getPaymentTransactions(fromDate, toDate)
  const braintreeOnly = allPayments.filter(
    (p) => p.method === 'Braintree' && p.type === 'Payment'
  )
  return enrichPaymentsWithInvoices(braintreeOnly)
}

/** Check if Halaxy credentials are configured. */
export function isHalaxyConfigured(): boolean {
  return !!(process.env.HALAXY_CLIENT_ID && process.env.HALAXY_CLIENT_SECRET)
}
