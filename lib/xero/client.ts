import type {
  VoidResult, BankDeposit, ClearingTransaction, DepositMatch,
  MatchConfidence, XeroInvoiceSummary, BulkDeleteResult,
  ThreeWayMatch, ThreeWayMatchStatus, ReconciliationResult,
} from './types'
import type { HalaxyPayment } from '@/lib/halaxy/types'

// ── Environment ──

const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0'
const BATCH_SIZE = 100
const VOID_BATCH_SIZE = 25 // Xero recommends ~50; smaller batches isolate bad invoices
const BATCH_DELAY_MS = 1500 // respect Xero rate limits
const VOID_BATCH_DELAY_MS = 2000 // void-only delay to stay under 60/min

/** Parse Xero date: ISO string or .NET /Date(ms)/ format */
function parseXeroDate(val: unknown): string {
  if (!val || typeof val !== 'string') return ''
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/\/Date\((\d+)\)\//)
  if (m) {
    const d = new Date(parseInt(m[1], 10))
    return d.toISOString().slice(0, 10)
  }
  return s.slice(0, 10)
}

function env(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing env var ${key}`)
  return v
}

// ── Token management ──

let cachedToken: { accessToken: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.accessToken
  }

  const clientId = env('XERO_CLIENT_ID')
  const clientSecret = env('XERO_CLIENT_SECRET')
  const refreshToken = process.env.XERO_REFRESH_TOKEN

  const bodyParams: Record<string, string> =
    refreshToken
      ? { grant_type: 'refresh_token', refresh_token: refreshToken }
      : {
          grant_type: 'client_credentials',
          scope: 'accounting.transactions accounting.settings accounting.contacts',
        }

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams(bodyParams),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero token request failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.accessToken
}

// ── Helpers ──

async function xeroHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  // Custom Connection: tenant-id not required (one org per connection). OAuth apps need it.
  const tenantId = process.env.XERO_TENANT_ID
  if (tenantId) headers['xero-tenant-id'] = tenantId
  return headers
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Feature 1: Bulk void invoices ──

/** Resolve invoice numbers to IDs. Xero requires InvoiceID for void updates. */
export async function getInvoicesByNumbers(
  invoiceNumbers: string[]
): Promise<Array<{ invoiceNumber: string; invoiceId: string }>> {
  const full = await getInvoicesByNumbersWithStatus(invoiceNumbers)
  return full.map(({ invoiceNumber, invoiceId }) => ({ invoiceNumber, invoiceId }))
}

/** Resolve invoice numbers to full summaries including status (for invoice-cleanup categorisation). */
export async function getInvoicesByNumbersWithStatus(
  invoiceNumbers: string[]
): Promise<XeroInvoiceSummary[]> {
  if (invoiceNumbers.length === 0) return []
  const headers = await xeroHeaders()
  const FETCH_BATCH = 25 // keep where clause URL-safe
  const result: XeroInvoiceSummary[] = []

  for (let i = 0; i < invoiceNumbers.length; i += FETCH_BATCH) {
    const chunk = invoiceNumbers.slice(i, i + FETCH_BATCH)
    const orClauses = chunk.map((n) => {
      const esc = n.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return `InvoiceNumber=="${esc}"`
    })
    const where = orClauses.join(' OR ')
    const url = `${XERO_API_BASE}/Invoices?where=${encodeURIComponent(where)}`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Xero Invoices ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const invoices: Array<Record<string, unknown>> = data.Invoices ?? []
    for (const inv of invoices) {
      const contact = inv.Contact as Record<string, unknown> | undefined
      result.push({
        invoiceId: inv.InvoiceID as string,
        invoiceNumber: (inv.InvoiceNumber as string) ?? '',
        date: parseXeroDate(inv.Date),
        dueDate: parseXeroDate(inv.DueDate),
        status: (inv.Status as string) ?? '',
        type: (inv.Type as string) ?? '',
        contact: (contact?.Name as string) ?? '',
        total: Number(inv.Total ?? 0),
        amountDue: Number(inv.AmountDue ?? 0),
      })
    }
    if (i + FETCH_BATCH < invoiceNumbers.length) await sleep(300)
  }
  return result
}

/**
 * Void a batch of invoices. Uses InvoiceID so Xero can bind the payload correctly.
 * Xero returns ValidationException with zeroed InvoiceID when payload lacks proper identifier.
 * Uses SummarizeErrors=false so 400 responses include per-invoice Elements.
 */
async function voidInvoicesBatchWithIds(
  invoices: Array<{ invoiceNumber: string; invoiceId: string }>
): Promise<VoidResult[]> {
  if (invoices.length === 0) return []
  const headers = await xeroHeaders()

  const body = {
    Invoices: invoices.map(({ invoiceNumber, invoiceId }) => ({
      InvoiceID: invoiceId,
      InvoiceNumber: invoiceNumber,
      Status: 'VOIDED',
    })),
  }

  const url = `${XERO_API_BASE}/Invoices?SummarizeErrors=false`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    const idToNum = new Map(invoices.map(({ invoiceId, invoiceNumber }) => [invoiceId, invoiceNumber]))
    let errMsg = `Xero API ${res.status}: ${text.slice(0, 200)}`
    if (res.status === 400) {
      try {
        const err = JSON.parse(text) as {
          Elements?: Array<{ InvoiceID?: string; InvoiceNumber?: string; ValidationErrors?: Array<{ Message?: string }> }>
        }
        const elements = err.Elements ?? []
        if (elements.length > 0) {
          const failed = elements
            .map((e) => (e.InvoiceNumber as string) ?? idToNum.get(e.InvoiceID as string))
            .filter(Boolean)
          const unique = [...new Set(failed)]
          const validationMsg =
            elements[0]?.ValidationErrors?.map((v) => v.Message).filter(Boolean).join('; ') ?? ''
          errMsg = `Cannot void invoice(s): ${unique.join(', ')}. ${validationMsg || 'Validation failed.'} Exclude these and retry.`
        }
      } catch {
        // keep generic errMsg
      }
    }
    return invoices.map(({ invoiceNumber }) => ({
      invoiceNumber,
      success: false,
      message: errMsg,
    }))
  }

  const data = await res.json()
  const responseInvoices: Array<Record<string, unknown>> = data.Invoices ?? []

  return invoices.map(({ invoiceNumber, invoiceId }) => {
    const inv = responseInvoices.find((i) => (i.InvoiceID as string) === invoiceId)
    if (!inv) {
      return { invoiceNumber, success: false, message: 'Not found in response' }
    }
    if (inv.HasErrors) {
      const msgs = ((inv.ValidationErrors as Array<{ Message: string }>) ?? [])
        .map((e) => e.Message)
        .join('; ')
      return { invoiceNumber, success: false, message: msgs || 'Unknown error' }
    }
    return { invoiceNumber, success: true, message: 'Voided' }
  })
}

export interface BulkVoidOutcome {
  results: VoidResult[]
  stoppedEarly: boolean // kept for compatibility; void always completes (false)
}

const VOID_RETRY_DELAY_MS = 300

/**
 * Chunk invoice numbers and void in batches with rate‑limit pauses.
 * Resolves InvoiceID first (Xero requires it for void payload) then voids.
 * When a batch fails (400), retries that chunk one-by-one to isolate real failures and continues.
 */
export async function bulkVoidInvoices(invoiceNumbers: string[]): Promise<BulkVoidOutcome> {
  const resolved = await getInvoicesByNumbers(invoiceNumbers)
  const foundMap = new Map(resolved.map((r) => [r.invoiceNumber.toUpperCase(), r]))
  const notFound: VoidResult[] = invoiceNumbers
    .filter((n) => !foundMap.has(n.toUpperCase()))
    .map((n) => ({ invoiceNumber: n, success: false, message: 'Invoice not found in Xero' }))
  const toVoid = invoiceNumbers
    .filter((n) => foundMap.has(n.toUpperCase()))
    .map((n) => foundMap.get(n.toUpperCase())!)

  if (toVoid.length === 0) {
    return { results: notFound, stoppedEarly: false }
  }

  const results: VoidResult[] = []
  for (let i = 0; i < toVoid.length; i += VOID_BATCH_SIZE) {
    const chunk = toVoid.slice(i, i + VOID_BATCH_SIZE)
    let batch = await voidInvoicesBatchWithIds(chunk)
    const batchFailed = batch.length > 0 && batch.every((r) => !r.success)

    if (batchFailed) {
      const retryResults: VoidResult[] = []
      for (let j = 0; j < chunk.length; j++) {
        const single = await voidInvoicesBatchWithIds([chunk[j]])
        retryResults.push(single[0])
        if (j < chunk.length - 1) await sleep(VOID_RETRY_DELAY_MS)
      }
      batch = retryResults
    }

    results.push(...batch)
    if (i + VOID_BATCH_SIZE < toVoid.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }
  return { results: [...notFound, ...results], stoppedEarly: false }
}

/**
 * Void invoices when IDs are already known. Skips the fetch-for-IDs step.
 * Use when the route has already fetched invoice data (avoids triple fetch / 429).
 */
export async function bulkVoidInvoicesWithIds(
  invoices: Array<{ invoiceNumber: string; invoiceId: string }>
): Promise<BulkVoidOutcome> {
  if (invoices.length === 0) {
    return { results: [], stoppedEarly: false }
  }

  const results: VoidResult[] = []
  for (let i = 0; i < invoices.length; i += VOID_BATCH_SIZE) {
    const chunk = invoices.slice(i, i + VOID_BATCH_SIZE)
    let batch = await voidInvoicesBatchWithIds(chunk)
    const batchFailed = batch.length > 0 && batch.every((r) => !r.success)

    if (batchFailed) {
      const retryResults: VoidResult[] = []
      for (let j = 0; j < chunk.length; j++) {
        const single = await voidInvoicesBatchWithIds([chunk[j]])
        retryResults.push(single[0])
        if (j < chunk.length - 1) await sleep(VOID_RETRY_DELAY_MS)
      }
      batch = retryResults
    }

    results.push(...batch)
    if (i + VOID_BATCH_SIZE < invoices.length) {
      await sleep(VOID_BATCH_DELAY_MS)
    }
  }
  return { results, stoppedEarly: false }
}

/**
 * Dry‑run: echo back the list with no API call (simple mode).
 */
export function dryRunVoid(invoiceNumbers: string[]): VoidResult[] {
  return invoiceNumbers.map((n) => ({
    invoiceNumber: n,
    success: true,
    message: 'Would be voided (dry run)',
  }))
}

// ── Feature 1b: Reports & queries (for AI assistant) ──

/** Fetch Profit and Loss report. Dates in YYYY-MM-DD. */
export async function getProfitAndLoss(
  fromDate?: string,
  toDate?: string
): Promise<Record<string, unknown>> {
  const headers = await xeroHeaders()
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const url = `${XERO_API_BASE}/Reports/ProfitAndLoss${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Xero P&L ${res.status}: ${await res.text()}`)
  return res.json()
}

/** Fetch Balance Sheet report. Date in YYYY-MM-DD. */
export async function getBalanceSheet(date?: string): Promise<Record<string, unknown>> {
  const headers = await xeroHeaders()
  const params = date ? `?date=${date}` : ''
  const res = await fetch(`${XERO_API_BASE}/Reports/BalanceSheet${params}`, { headers })
  if (!res.ok) throw new Error(`Xero BalanceSheet ${res.status}: ${await res.text()}`)
  return res.json()
}

/** Fetch Trial Balance report. Date in YYYY-MM-DD. */
export async function getTrialBalance(date?: string): Promise<Record<string, unknown>> {
  const headers = await xeroHeaders()
  const params = date ? `?date=${date}` : ''
  const res = await fetch(`${XERO_API_BASE}/Reports/TrialBalance${params}`, { headers })
  if (!res.ok) throw new Error(`Xero TrialBalance ${res.status}: ${await res.text()}`)
  return res.json()
}

/** Fetch Bank Summary report. Dates in YYYY-MM-DD. */
export async function getBankSummary(
  fromDate?: string,
  toDate?: string
): Promise<Record<string, unknown>> {
  const headers = await xeroHeaders()
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const url = `${XERO_API_BASE}/Reports/BankSummary${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Xero BankSummary ${res.status}: ${await res.text()}`)
  return res.json()
}

/** List invoices. status: DRAFT|SUBMITTED|AUTHORISED. where: Xero filter e.g. Status=="AUTHORISED" AND DueDate<DateTime(...) */
export async function listInvoices(params?: {
  status?: string
  contactIDs?: string[]
  where?: string
  order?: string
}): Promise<Record<string, unknown>> {
  const headers = await xeroHeaders()
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('Statuses', params.status)
  if (params?.contactIDs?.length) searchParams.set('ContactIDs', params.contactIDs.join(','))
  if (params?.where) searchParams.set('where', params.where)
  if (params?.order) searchParams.set('order', params.order)
  const qs = searchParams.toString()
  const url = `${XERO_API_BASE}/Invoices${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Xero Invoices ${res.status}: ${await res.text()}`)
  return res.json()
}

/** List contacts. */
export async function listContacts(params?: { where?: string }): Promise<Record<string, unknown>> {
  const headers = await xeroHeaders()
  const qs = params?.where ? `?where=${encodeURIComponent(params.where)}` : ''
  const res = await fetch(`${XERO_API_BASE}/Contacts${qs}`, { headers })
  if (!res.ok) throw new Error(`Xero Contacts ${res.status}: ${await res.text()}`)
  return res.json()
}

/** Get organisation details. */
export async function getOrganisation(): Promise<Record<string, unknown>> {
  const headers = await xeroHeaders()
  const res = await fetch(`${XERO_API_BASE}/Organisation`, { headers })
  if (!res.ok) throw new Error(`Xero Organisation ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── PAID wipe: fetch invoice with payments, delete payments ──

export interface InvoiceWithPayments {
  invoiceId: string
  invoiceNumber: string
  status: string
  date: string
  contactId?: string
  payments: Array<{ paymentId: string; amount: number; date: string }>
  /** Credit notes, prepayments, overpayments applied TO this invoice (from Invoice.CreditNotes etc) */
  appliedCreditNotes?: Array<{ creditNoteId: string; allocationId?: string }>
  appliedPrepayments?: Array<{ prepaymentId: string; allocationId?: string }>
  appliedOverpayments?: Array<{ overpaymentId: string; allocationId?: string }>
}

/**
 * Fetch full invoice by ID. List endpoint omits Payments — must GET by ID for allocations.
 * Returns null if not found.
 */
export async function getInvoiceById(invoiceId: string): Promise<InvoiceWithPayments | null> {
  const headers = await xeroHeaders()
  const url = `${XERO_API_BASE}/Invoices/${invoiceId}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Xero Invoices ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const invoices: Array<Record<string, unknown>> = data.Invoices ?? []
  const inv = invoices[0]
  if (!inv) return null
  const contact = inv.Contact as Record<string, unknown> | undefined
  const payments: Array<Record<string, unknown>> = (inv.Payments as Array<Record<string, unknown>>) ?? []
  const creditNotes: Array<Record<string, unknown>> = (inv.CreditNotes as Array<Record<string, unknown>>) ?? []
  const prepayments: Array<Record<string, unknown>> = (inv.Prepayments as Array<Record<string, unknown>>) ?? []
  const overpayments: Array<Record<string, unknown>> = (inv.Overpayments as Array<Record<string, unknown>>) ?? []
  return {
    invoiceId: inv.InvoiceID as string,
    invoiceNumber: (inv.InvoiceNumber as string) ?? '',
    status: (inv.Status as string) ?? '',
    date: parseXeroDate(inv.Date),
    contactId: contact?.ContactID as string | undefined,
    payments: payments.map((p) => ({
      paymentId: p.PaymentID as string,
      amount: Number(p.Amount ?? 0),
      date: (p.Date as string) ?? '',
    })),
    appliedCreditNotes: creditNotes.map((cn) => ({
      creditNoteId: (cn.CreditNoteID ?? cn.CreditNoteId) as string,
      allocationId: (cn.AllocationID ?? cn.AllocationId) as string | undefined,
    })).filter((cn) => cn.creditNoteId),
    appliedPrepayments: prepayments.map((pp) => ({
      prepaymentId: (pp.PrepaymentID ?? pp.PrepaymentId) as string,
      allocationId: (pp.AllocationID ?? pp.AllocationId) as string | undefined,
    })).filter((pp) => pp.prepaymentId),
    appliedOverpayments: overpayments.map((op) => ({
      overpaymentId: (op.OverpaymentID ?? op.OverpaymentId) as string,
      allocationId: (op.AllocationID ?? op.AllocationId) as string | undefined,
    })).filter((op) => op.overpaymentId),
  }
}

/** Fetch a single invoice by number. Resolves ID first then fetches full invoice (with Payments). */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithPayments | null> {
  const escaped = invoiceNumber.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const where = `InvoiceNumber=="${escaped}"`
  const headers = await xeroHeaders()
  const listUrl = `${XERO_API_BASE}/Invoices?where=${encodeURIComponent(where)}`
  const listRes = await fetch(listUrl, { headers })
  if (!listRes.ok) throw new Error(`Xero Invoices ${listRes.status}: ${await listRes.text()}`)
  const listData = await listRes.json()
  const invoices: Array<Record<string, unknown>> = listData.Invoices ?? []
  const inv = invoices[0]
  if (!inv) return null
  const invoiceId = inv.InvoiceID as string
  return getInvoiceById(invoiceId)
}

/**
 * Fetch a single credit note by ID (includes Allocations). Use when Invoice.CreditNotes gives ID but not AllocationID.
 */
export async function getCreditNoteById(
  creditNoteId: string
): Promise<Array<{ allocationId: string; invoiceId: string }>> {
  const headers = await xeroHeaders()
  const res = await fetch(`${XERO_API_BASE}/CreditNotes/${creditNoteId}`, { headers })
  if (!res.ok) return []
  const data = await res.json()
  const notes: Array<Record<string, unknown>> = data.CreditNotes ?? []
  const cn = notes[0]
  if (!cn) return []
  const allocations: Array<Record<string, unknown>> = (cn.Allocations as Array<Record<string, unknown>>) ?? []
  return allocations.map((a) => {
    const inv = a.Invoice as Record<string, unknown> | undefined
    return {
      allocationId: a.AllocationID as string,
      invoiceId: inv?.InvoiceID as string,
    }
  }).filter((a) => a.allocationId)
}

/**
 * Find credit note allocations that target a given invoice.
 * Tries Invoice.CreditNotes first (from getInvoiceById). Falls back to searching CreditNotes list.
 * List may omit Allocations — then we GET each credit note by ID.
 */
export async function getCreditNoteAllocationsToInvoice(
  invoiceId: string,
  contactId?: string,
  appliedFromInvoice?: Array<{ creditNoteId: string; allocationId?: string }>
): Promise<Array<{ creditNoteId: string; allocationId: string }>> {
  const result: Array<{ creditNoteId: string; allocationId: string }> = []
  if (appliedFromInvoice?.length) {
    for (const ap of appliedFromInvoice) {
      if (ap.allocationId) {
        result.push({ creditNoteId: ap.creditNoteId, allocationId: ap.allocationId })
      } else {
        const allocs = await getCreditNoteById(ap.creditNoteId)
        for (const a of allocs) {
          if (a.invoiceId === invoiceId) {
            result.push({ creditNoteId: ap.creditNoteId, allocationId: a.allocationId })
          }
        }
      }
    }
    if (result.length > 0) return result
  }
  const headers = await xeroHeaders()
  const where = contactId
    ? `Status=="AUTHORISED" AND Contact.ContactID=guid("${contactId.replace(/"/g, '')}")`
    : `Status=="AUTHORISED"`
  const MAX_PAGES = 5
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${XERO_API_BASE}/CreditNotes?where=${encodeURIComponent(where)}&page=${page}`
    const res = await fetch(url, { headers })
    if (!res.ok) break
    const data = await res.json()
    const notes: Array<Record<string, unknown>> = data.CreditNotes ?? []
    for (const cn of notes) {
      const allocations: Array<Record<string, unknown>> = (cn.Allocations as Array<Record<string, unknown>>) ?? []
      if (allocations.length === 0) {
        const allocs = await getCreditNoteById(cn.CreditNoteID as string)
        for (const a of allocs) {
          if (a.invoiceId === invoiceId) {
            result.push({ creditNoteId: cn.CreditNoteID as string, allocationId: a.allocationId })
          }
        }
      } else {
        for (const a of allocations) {
          const inv = a.Invoice as Record<string, unknown> | undefined
          if (inv?.InvoiceID === invoiceId) {
            result.push({
              creditNoteId: cn.CreditNoteID as string,
              allocationId: a.AllocationID as string,
            })
          }
        }
      }
    }
    if (notes.length < 100) break
    await sleep(300)
  }
  return result
}

/**
 * Delete a credit note allocation. Required before voiding invoices that have credit notes allocated.
 * DELETE /CreditNotes/{CreditNoteID}/Allocations/{AllocationID}
 */
export async function deleteCreditNoteAllocation(
  creditNoteId: string,
  allocationId: string
): Promise<{ success: boolean; message: string }> {
  const headers = await xeroHeaders()
  const url = `${XERO_API_BASE}/CreditNotes/${creditNoteId}/Allocations/${allocationId}`
  const res = await fetch(url, { method: 'DELETE', headers })
  if (!res.ok) {
    const text = await res.text()
    return { success: false, message: `Xero API ${res.status}: ${text.slice(0, 300)}` }
  }
  return { success: true, message: 'Credit note allocation removed' }
}

async function getAllocationsFromEndpoint(
  endpoint: string,
  invoiceId: string,
  idKey: string,
  where?: string
): Promise<Array<{ sourceId: string; allocationId: string }>> {
  const headers = await xeroHeaders()
  const result: Array<{ sourceId: string; allocationId: string }> = []
  let page = 1
  let hasMore = true
  const MAX_PAGES = 3
  while (hasMore && page <= MAX_PAGES) {
    const qs = where ? `?where=${encodeURIComponent(where)}&page=${page}` : `?page=${page}`
    const url = `${XERO_API_BASE}/${endpoint}${qs}`
    const res = await fetch(url, { headers })
    if (!res.ok) return result
    const data = await res.json()
    const key = endpoint
    const items: Array<Record<string, unknown>> = (data[key] ?? []) as Array<Record<string, unknown>>
    const list = Array.isArray(items) ? items : []
    for (const item of list) {
      const allocations: Array<Record<string, unknown>> = (item.Allocations as Array<Record<string, unknown>>) ?? []
      for (const a of allocations) {
        const inv = a.Invoice as Record<string, unknown> | undefined
        if (inv?.InvoiceID === invoiceId) {
          result.push({
            sourceId: item[idKey] as string,
            allocationId: a.AllocationID as string,
          })
        }
      }
    }
    hasMore = list.length === 100
    page++
    if (hasMore) await sleep(300)
  }
  return result
}

async function deleteAllocation(
  endpoint: string,
  sourceId: string,
  allocationId: string
): Promise<{ success: boolean; message: string }> {
  const headers = await xeroHeaders()
  const url = `${XERO_API_BASE}/${endpoint}/${sourceId}/Allocations/${allocationId}`
  const res = await fetch(url, { method: 'DELETE', headers })
  if (!res.ok) {
    const text = await res.text()
    return { success: false, message: `Xero API ${res.status}: ${text.slice(0, 300)}` }
  }
  return { success: true, message: 'Allocation removed' }
}

async function getOverpaymentById(
  overpaymentId: string
): Promise<Array<{ allocationId: string; invoiceId: string }>> {
  const headers = await xeroHeaders()
  const res = await fetch(`${XERO_API_BASE}/Overpayments/${overpaymentId}`, { headers })
  if (!res.ok) return []
  const data = await res.json()
  const items: Array<Record<string, unknown>> = data.Overpayments ?? []
  const op = items[0]
  if (!op) return []
  const allocations: Array<Record<string, unknown>> = (op.Allocations as Array<Record<string, unknown>>) ?? []
  return allocations.map((a) => {
    const inv = a.Invoice as Record<string, unknown> | undefined
    return {
      allocationId: a.AllocationID as string,
      invoiceId: inv?.InvoiceID as string,
    }
  }).filter((a) => a.allocationId)
}

async function getPrepaymentById(
  prepaymentId: string
): Promise<Array<{ allocationId: string; invoiceId: string }>> {
  const headers = await xeroHeaders()
  const res = await fetch(`${XERO_API_BASE}/Prepayments/${prepaymentId}`, { headers })
  if (!res.ok) return []
  const data = await res.json()
  const items: Array<Record<string, unknown>> = data.Prepayments ?? []
  const pp = items[0]
  if (!pp) return []
  const allocations: Array<Record<string, unknown>> = (pp.Allocations as Array<Record<string, unknown>>) ?? []
  return allocations.map((a) => {
    const inv = a.Invoice as Record<string, unknown> | undefined
    return {
      allocationId: a.AllocationID as string,
      invoiceId: inv?.InvoiceID as string,
    }
  }).filter((a) => a.allocationId)
}

/** Find overpayment allocations to an invoice. Uses Invoice.Overpayments first; falls back to list. */
export async function getOverpaymentAllocationsToInvoice(
  invoiceId: string,
  contactId?: string,
  appliedFromInvoice?: Array<{ overpaymentId: string; allocationId?: string }>
): Promise<Array<{ overpaymentId: string; allocationId: string }>> {
  const result: Array<{ overpaymentId: string; allocationId: string }> = []
  if (appliedFromInvoice?.length) {
    for (const ap of appliedFromInvoice) {
      if (ap.allocationId) {
        result.push({ overpaymentId: ap.overpaymentId, allocationId: ap.allocationId })
      } else {
        const allocs = await getOverpaymentById(ap.overpaymentId)
        for (const a of allocs) {
          if (a.invoiceId === invoiceId) {
            result.push({ overpaymentId: ap.overpaymentId, allocationId: a.allocationId })
          }
        }
      }
    }
    if (result.length > 0) return result
  }
  const raw = await getAllocationsFromEndpoint(
    'Overpayments',
    invoiceId,
    'OverpaymentID',
    contactId
      ? `Status=="AUTHORISED" AND Contact.ContactID=guid("${contactId.replace(/"/g, '')}")`
      : undefined
  )
  return raw.map((r) => ({ overpaymentId: r.sourceId, allocationId: r.allocationId }))
}

/** Find prepayment allocations to an invoice. Uses Invoice.Prepayments first; falls back to list. */
export async function getPrepaymentAllocationsToInvoice(
  invoiceId: string,
  contactId?: string,
  appliedFromInvoice?: Array<{ prepaymentId: string; allocationId?: string }>
): Promise<Array<{ prepaymentId: string; allocationId: string }>> {
  const result: Array<{ prepaymentId: string; allocationId: string }> = []
  if (appliedFromInvoice?.length) {
    for (const ap of appliedFromInvoice) {
      if (ap.allocationId) {
        result.push({ prepaymentId: ap.prepaymentId, allocationId: ap.allocationId })
      } else {
        const allocs = await getPrepaymentById(ap.prepaymentId)
        for (const a of allocs) {
          if (a.invoiceId === invoiceId) {
            result.push({ prepaymentId: ap.prepaymentId, allocationId: a.allocationId })
          }
        }
      }
    }
    if (result.length > 0) return result
  }
  const where = contactId
    ? `Status=="AUTHORISED" AND Contact.ContactID=guid("${contactId.replace(/"/g, '')}")`
    : `Status=="AUTHORISED"`
  const raw = await getAllocationsFromEndpoint('Prepayments', invoiceId, 'PrepaymentID', where)
  return raw.map((r) => ({ prepaymentId: r.sourceId, allocationId: r.allocationId }))
}

export async function deleteOverpaymentAllocation(
  overpaymentId: string,
  allocationId: string
): Promise<{ success: boolean; message: string }> {
  return deleteAllocation('Overpayments', overpaymentId, allocationId)
}

export async function deletePrepaymentAllocation(
  prepaymentId: string,
  allocationId: string
): Promise<{ success: boolean; message: string }> {
  return deleteAllocation('Prepayments', prepaymentId, allocationId)
}

/**
 * Delete a payment (remove from invoice). Xero: POST /Payments/{PaymentID} with Status: DELETED.
 * NOTE: Xero does NOT support deleting payments created via batch payments or receipts via API.
 * Those must be removed manually in Xero (Remove & Redo on the payment).
 */
export async function deletePayment(paymentId: string): Promise<{ success: boolean; message: string }> {
  const headers = await xeroHeaders()
  const res = await fetch(`${XERO_API_BASE}/Payments/${paymentId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ Status: 'DELETED' }),
  })
  if (!res.ok) {
    const text = await res.text()
    return { success: false, message: `Xero API ${res.status}: ${text.slice(0, 300)}` }
  }
  const data = await res.json()
  const payments: Array<Record<string, unknown>> = data.Payments ?? []
  const p = payments[0]
  if (p?.HasErrors) {
    const msgs = ((p.ValidationErrors as Array<{ Message: string }>) ?? []).map((e) => e.Message).join('; ')
    return { success: false, message: msgs || 'Validation error' }
  }
  return { success: true, message: 'Payment removed' }
}

// ── Feature 2: Clearing‑account reconciliation ──

/**
 * Build a Xero `where` clause for querying bank transactions by account + date range.
 */
function buildBankTxnWhere(
  accountId: string,
  fromDate: string,
  toDate: string,
  extraClauses: string[] = []
): string {
  const from = fromDate.replace(/-/g, ',')
  const to = toDate.replace(/-/g, ',')
  const clauses = [
    `BankAccount.AccountID=guid("${accountId}")`,
    `Status=="AUTHORISED"`,
    `Date>=DateTime(${from})`,
    `Date<=DateTime(${to})`,
    ...extraClauses,
  ]
  return clauses.join(' AND ')
}

/**
 * Fetch unreconciled bank transactions for a given Xero account and date range.
 */
export async function getUnreconciledBankTransactions(
  accountId: string,
  fromDate: string,
  toDate: string
): Promise<BankDeposit[]> {
  const headers = await xeroHeaders()
  const where = buildBankTxnWhere(accountId, fromDate, toDate, ['Type=="RECEIVE"'])
  const url = `${XERO_API_BASE}/BankTransactions?where=${encodeURIComponent(where)}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`Xero BankTransactions ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const txns: Array<Record<string, unknown>> = data.BankTransactions ?? []

  return txns.map((t) => ({
    bankTransactionId: t.BankTransactionID as string,
    date: (t.Date as string).slice(0, 10),
    amount: Number(t.Total ?? 0),
    reference: (t.Reference as string) ?? '',
    isReconciled: t.IsReconciled as boolean,
  })).filter((d) => !d.isReconciled)
}

/**
 * Fetch clearing‑account transactions for a period.
 * Returns Contact name when available (for patient identification).
 */
export async function getClearingTransactions(
  clearingAccountId: string,
  fromDate: string,
  toDate: string
): Promise<ClearingTransaction[]> {
  const headers = await xeroHeaders()
  const where = buildBankTxnWhere(clearingAccountId, fromDate, toDate)
  const url = `${XERO_API_BASE}/BankTransactions?where=${encodeURIComponent(where)}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`Xero ClearingTransactions ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const txns: Array<Record<string, unknown>> = data.BankTransactions ?? []

  return txns.map((t) => {
    const contact = t.Contact as Record<string, unknown> | undefined
    return {
      transactionId: t.BankTransactionID as string,
      date: parseXeroDate(t.Date),
      amount: Number(t.Total ?? 0),
      invoiceNumber: (t.Reference as string) ?? '',
      reference: (t.Reference as string) ?? '',
      txnType: (t.Type as string) ?? undefined,
      contactName: (contact?.Name as string) ?? undefined,
    }
  })
}

/**
 * Suggest groupings of clearing transactions that sum to each deposit.
 * Phase 1: exact match via backtracking. Phase 2: fee-adjusted within tolerance.
 */
export function suggestGroupings(
  deposits: BankDeposit[],
  clearingTxns: ClearingTransaction[],
  toleranceCents: number = 500
): {
  matches: DepositMatch[]
  unmatchedDeposits: BankDeposit[]
  unmatchedClearing: ClearingTransaction[]
} {
  const used = new Set<string>()
  const matches: DepositMatch[] = []
  const unmatchedDeposits: BankDeposit[] = []

  for (const dep of deposits) {
    const targetCents = Math.round(dep.amount * 100)
    const available = clearingTxns.filter((c) => !used.has(c.transactionId))
    const result = findBestSubsetMatch(available, targetCents, toleranceCents)

    if (result) {
      result.subset.forEach((c) => used.add(c.transactionId))
      const total = result.subset.reduce((s, c) => s + c.amount, 0)
      const totalRounded = Math.round(total * 100) / 100
      const diff = Math.round((dep.amount - total) * 100) / 100
      const absDiffCents = Math.abs(result.diffCents)
      let confidence: MatchConfidence = 'uncertain'
      if (absDiffCents === 0) confidence = 'exact'
      else if (absDiffCents <= toleranceCents) confidence = 'fee-adjusted'

      matches.push({
        deposit: dep,
        clearingTransactions: result.subset,
        total: totalRounded,
        difference: diff,
        isExactMatch: absDiffCents === 0,
        impliedFee: Math.round(absDiffCents) / 100,
        matchConfidence: confidence,
      })
    } else {
      unmatchedDeposits.push(dep)
    }
  }

  const unmatchedClearing = clearingTxns.filter((c) => !used.has(c.transactionId))
  return { matches, unmatchedDeposits, unmatchedClearing }
}

/**
 * Backtracking subset-sum finder (amounts in cents).
 *
 * Phase 1 — exact: returns immediately if a subset sums exactly to target.
 * Phase 2 — tolerance: finds the subset with smallest |sum - target| within tolerance.
 *
 * Pruning keeps performance under 100ms for typical clinic volumes (5–50 txns):
 * - Early exit when partial sum exceeds target + tolerance
 * - Skip branch when remaining potential can't reach target - tolerance
 */
function findBestSubsetMatch(
  txns: ClearingTransaction[],
  targetCents: number,
  toleranceCents: number
): { subset: ClearingTransaction[]; diffCents: number } | null {
  if (txns.length === 0) return null

  // Sort descending for better pruning
  const sorted = [...txns].sort((a, b) => b.amount - a.amount)
  const centAmounts = sorted.map((t) => Math.round(t.amount * 100))

  // Precompute suffix sums for remaining-potential pruning
  const suffixSums = new Array<number>(sorted.length + 1)
  suffixSums[sorted.length] = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    suffixSums[i] = suffixSums[i + 1] + centAmounts[i]
  }

  const state = { bestSubset: null as number[] | null, bestAbsDiff: Infinity }

  const current: number[] = []
  let currentSum = 0

  function backtrack(idx: number): boolean {
    // Check current subset
    const diff = currentSum - targetCents
    const absDiff = Math.abs(diff)
    if (absDiff < state.bestAbsDiff) {
      state.bestAbsDiff = absDiff
      state.bestSubset = [...current]
      if (absDiff === 0) return true // exact match — stop immediately
    }

    if (idx >= sorted.length) return false

    for (let i = idx; i < sorted.length; i++) {
      const newSum = currentSum + centAmounts[i]

      // Prune: if adding this item already overshoots beyond tolerance, skip
      if (newSum > targetCents + toleranceCents) continue

      // Prune: if adding everything remaining can't reach target - tolerance, skip
      const remaining = suffixSums[i + 1]
      if (newSum + remaining < targetCents - toleranceCents) break

      current.push(i)
      currentSum = newSum

      if (backtrack(i + 1)) return true

      current.pop()
      currentSum -= centAmounts[i]
    }

    return false
  }

  backtrack(0)

  const { bestSubset, bestAbsDiff } = state
  if (!bestSubset || bestSubset.length === 0) return null
  if (bestAbsDiff > toleranceCents) return null

  return {
    subset: bestSubset.map((i: number) => sorted[i]),
    diffCents: targetCents - bestSubset.reduce((s: number, i: number) => s + centAmounts[i], 0),
  }
}

/**
 * Create a Spend Money transaction to record merchant fees from the clearing account.
 * Posts a SPEND bank transaction against the clearing account with the fee going to an expense account.
 */
export async function createSpendMoney(params: {
  clearingAccountId: string
  feeAmount: number
  feeAccountCode: string
  date: string
  reference?: string
}): Promise<{ success: boolean; message: string; transactionId?: string }> {
  const headers = await xeroHeaders()

  const body = {
    Type: 'SPEND',
    BankAccount: { AccountID: params.clearingAccountId },
    Contact: { Name: 'Halaxy Merchant Fees' },
    Date: params.date,
    Reference: params.reference ?? `CLEARING-FEE-${params.date}`,
    LineItems: [
      {
        Description: `Merchant processing fee — ${params.date}`,
        Quantity: 1,
        UnitAmount: params.feeAmount.toFixed(2),
        AccountCode: params.feeAccountCode,
        TaxType: 'INPUT',
      },
    ],
  }

  const res = await fetch(`${XERO_API_BASE}/BankTransactions`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    return { success: false, message: `Spend Money failed (${res.status}): ${errText.slice(0, 300)}` }
  }

  const data = await res.json()
  const txn = data.BankTransactions?.[0]
  if (txn?.HasErrors) {
    const msgs = ((txn.ValidationErrors as Array<{ Message: string }>) ?? [])
      .map((e: { Message: string }) => e.Message)
      .join('; ')
    return { success: false, message: msgs || 'Validation error creating Spend Money' }
  }

  return {
    success: true,
    message: `Spend Money created for $${params.feeAmount.toFixed(2)} (merchant fee)`,
    transactionId: txn?.BankTransactionID as string | undefined,
  }
}

/**
 * Apply a clearing reconciliation in Xero by creating a bank transfer
 * from the clearing account to the NAB account. Optionally posts a Spend Money
 * transaction first to record merchant fees.
 */
export async function applyClearing(
  bankTransactionId: string,
  clearingTransactionIds: string[],
  options?: { feeAmount?: number; feeAccountCode?: string }
): Promise<{ success: boolean; message: string }> {
  const headers = await xeroHeaders()
  const nabAccountId = process.env.XERO_NAB_ACCOUNT_ID
  const clearingAccountId = process.env.XERO_CLEARING_ACCOUNT_ID

  if (!nabAccountId || !clearingAccountId) {
    return {
      success: false,
      message: 'XERO_NAB_ACCOUNT_ID and XERO_CLEARING_ACCOUNT_ID env vars are required',
    }
  }

  // Fetch the bank transaction to get the deposit amount and date
  const txnRes = await fetch(`${XERO_API_BASE}/BankTransactions/${bankTransactionId}`, { headers })
  if (!txnRes.ok) {
    return { success: false, message: `Failed to fetch bank transaction: ${txnRes.status}` }
  }
  const txnData = await txnRes.json()
  const depositAmount = Number(txnData.BankTransactions?.[0]?.Total ?? 0)
  const txnDate = txnData.BankTransactions?.[0]?.Date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

  if (depositAmount <= 0) {
    return { success: false, message: 'Bank transaction amount is zero or negative' }
  }

  const feeAmount = options?.feeAmount ?? 0
  const feeAccountCode = options?.feeAccountCode

  // Step 1: Post Spend Money for fees if applicable
  if (feeAmount > 0) {
    if (!feeAccountCode) {
      return { success: false, message: 'feeAccountCode is required when feeAmount > 0' }
    }
    const feeResult = await createSpendMoney({
      clearingAccountId,
      feeAmount,
      feeAccountCode,
      date: txnDate,
    })
    if (!feeResult.success) {
      return { success: false, message: `Fee posting failed: ${feeResult.message}` }
    }
  }

  // Step 2: Create bank transfer for the deposit amount
  // The deposit amount is the net (after fees), which is what hit the bank.
  // The clearing account had gross payments in; the fee spend reduces it; the transfer moves the rest.
  const transferBody = {
    FromBankAccount: { AccountID: clearingAccountId },
    ToBankAccount: { AccountID: nabAccountId },
    Amount: depositAmount.toFixed(2),
    Date: txnDate,
  }

  const transferRes = await fetch(`${XERO_API_BASE}/BankTransfers`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(transferBody),
  })

  if (!transferRes.ok) {
    const errText = await transferRes.text()
    return { success: false, message: `Bank transfer failed (${transferRes.status}): ${errText.slice(0, 300)}` }
  }

  const parts = [`Bank transfer created for $${depositAmount.toFixed(2)}`]
  if (feeAmount > 0) {
    parts.push(`fee of $${feeAmount.toFixed(2)} posted to ${feeAccountCode}`)
  }
  parts.push(`covering ${clearingTransactionIds.length} clearing transaction(s)`)

  return { success: true, message: parts.join('; ') }
}

// ── Three-way reconciliation engine ──

/** Bronze tier fee calculation: 1.90% + $1.00 (incl. GST) */
function calculateBronzeFee(amount: number): number {
  return Math.round((amount * 0.019 + 1.0) * 100) / 100
}

/**
 * Three-way matching: Halaxy payments ↔ Xero clearing transactions ↔ NAB bank deposits.
 *
 * Since the user is on Separate Transactions with fees to credit card:
 * - Every Halaxy payment = 1 clearing entry = 1 NAB deposit of the exact same amount
 * - No subset-sum needed — just 1:1:1 matching by invoice number
 */
export function reconcileThreeWay(
  halaxyPayments: HalaxyPayment[],
  clearingTxns: ClearingTransaction[],
  bankDeposits: BankDeposit[]
): ReconciliationResult {
  const matches: ThreeWayMatch[] = []
  const usedClearing = new Set<string>()
  const usedDeposits = new Set<string>()
  const usedHalaxy = new Set<string>()

  // Index clearing transactions by invoice number (reference field)
  const clearingByRef = new Map<string, ClearingTransaction[]>()
  for (const txn of clearingTxns) {
    const ref = (txn.reference || txn.invoiceNumber || '').toUpperCase().trim()
    if (ref) {
      const list = clearingByRef.get(ref) ?? []
      list.push(txn)
      clearingByRef.set(ref, list)
    }
  }

  // Index bank deposits by amount (cents) for matching
  const depositsByAmount = new Map<number, BankDeposit[]>()
  for (const dep of bankDeposits) {
    const cents = Math.round(dep.amount * 100)
    const list = depositsByAmount.get(cents) ?? []
    list.push(dep)
    depositsByAmount.set(cents, list)
  }

  // Phase 1: Match starting from Halaxy payments (the source of truth)
  const braintreePayments = halaxyPayments.filter(
    (p) => p.method === 'Braintree' && p.type === 'Payment'
  )

  for (const payment of braintreePayments) {
    if (usedHalaxy.has(payment.id)) continue

    const invoiceNum = (payment.invoiceNumber ?? '').toUpperCase().trim()
    const amountCents = Math.round(payment.amount * 100)

    // Find matching clearing transaction by invoice number
    let clearingMatch: ClearingTransaction | null = null
    if (invoiceNum) {
      const candidates = clearingByRef.get(invoiceNum) ?? []
      clearingMatch = candidates.find((c) => !usedClearing.has(c.transactionId)) ?? null
    }

    // Fallback: match clearing by amount + date (±1 day)
    if (!clearingMatch) {
      const paymentDate = payment.created.slice(0, 10)
      for (const txn of clearingTxns) {
        if (usedClearing.has(txn.transactionId)) continue
        if (Math.round(txn.amount * 100) !== amountCents) continue
        const dayDiff = Math.abs(
          new Date(txn.date).getTime() - new Date(paymentDate).getTime()
        ) / (1000 * 60 * 60 * 24)
        if (dayDiff <= 1) {
          clearingMatch = txn
          break
        }
      }
    }

    // Find matching NAB deposit by amount + date (±2 days for settlement lag)
    let depositMatch: BankDeposit | null = null
    const depositCandidates = depositsByAmount.get(amountCents) ?? []
    const refDate = clearingMatch?.date ?? payment.created.slice(0, 10)

    for (const dep of depositCandidates) {
      if (usedDeposits.has(dep.bankTransactionId)) continue
      const dayDiff = Math.abs(
        new Date(dep.date).getTime() - new Date(refDate).getTime()
      ) / (1000 * 60 * 60 * 24)
      if (dayDiff <= 2) {
        depositMatch = dep
        break
      }
    }

    // Determine status
    let status: ThreeWayMatchStatus
    if (clearingMatch && depositMatch) {
      status = 'matched'
    } else if (clearingMatch && !depositMatch) {
      status = 'awaiting_deposit'
    } else {
      status = 'sync_failed'
    }

    const matchMethod = invoiceNum && clearingMatch
      ? 'invoice_number' as const
      : clearingMatch
        ? 'amount_date' as const
        : 'unmatched' as const

    usedHalaxy.add(payment.id)
    if (clearingMatch) usedClearing.add(clearingMatch.transactionId)
    if (depositMatch) usedDeposits.add(depositMatch.bankTransactionId)

    matches.push({
      halaxyPayment: {
        id: payment.id,
        created: payment.created,
        method: payment.method,
        type: payment.type,
        amount: payment.amount,
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoiceNumber,
        patientName: payment.patientName,
      },
      clearingTxn: clearingMatch,
      bankDeposit: depositMatch,
      invoiceNumber: payment.invoiceNumber ?? clearingMatch?.invoiceNumber ?? '',
      patientName: payment.patientName ?? clearingMatch?.contactName ?? '',
      amount: payment.amount,
      date: payment.created.slice(0, 10),
      status,
      matchMethod,
      calculatedFee: calculateBronzeFee(payment.amount),
    })
  }

  // Phase 2: Unmatched clearing transactions (no Halaxy payment — manual entries)
  for (const txn of clearingTxns) {
    if (usedClearing.has(txn.transactionId)) continue
    usedClearing.add(txn.transactionId)

    const amountCents = Math.round(txn.amount * 100)
    let depositMatch: BankDeposit | null = null
    const depositCandidates = depositsByAmount.get(amountCents) ?? []
    for (const dep of depositCandidates) {
      if (usedDeposits.has(dep.bankTransactionId)) continue
      const dayDiff = Math.abs(
        new Date(dep.date).getTime() - new Date(txn.date).getTime()
      ) / (1000 * 60 * 60 * 24)
      if (dayDiff <= 2) {
        depositMatch = dep
        break
      }
    }
    if (depositMatch) usedDeposits.add(depositMatch.bankTransactionId)

    matches.push({
      halaxyPayment: null,
      clearingTxn: txn,
      bankDeposit: depositMatch,
      invoiceNumber: txn.invoiceNumber || txn.reference,
      patientName: txn.contactName ?? '',
      amount: txn.amount,
      date: txn.date,
      status: 'manual_entry',
      matchMethod: 'unmatched',
      calculatedFee: calculateBronzeFee(txn.amount),
    })
  }

  // Phase 3: Orphan NAB deposits (no clearing match)
  for (const dep of bankDeposits) {
    if (usedDeposits.has(dep.bankTransactionId)) continue
    usedDeposits.add(dep.bankTransactionId)

    matches.push({
      halaxyPayment: null,
      clearingTxn: null,
      bankDeposit: dep,
      invoiceNumber: dep.reference || '',
      patientName: '',
      amount: dep.amount,
      date: dep.date,
      status: 'orphan_deposit',
      matchMethod: 'unmatched',
    })
  }

  // Sort: matched first, then by date descending
  const statusOrder: Record<ThreeWayMatchStatus, number> = {
    matched: 0,
    awaiting_deposit: 1,
    sync_failed: 2,
    manual_entry: 3,
    orphan_deposit: 4,
  }
  matches.sort((a, b) => {
    const so = statusOrder[a.status] - statusOrder[b.status]
    if (so !== 0) return so
    return b.date.localeCompare(a.date)
  })

  // Calculate stats
  const stats = {
    total: matches.length,
    matched: matches.filter((m) => m.status === 'matched').length,
    awaitingDeposit: matches.filter((m) => m.status === 'awaiting_deposit').length,
    syncFailed: matches.filter((m) => m.status === 'sync_failed').length,
    manualEntry: matches.filter((m) => m.status === 'manual_entry').length,
    orphanDeposits: matches.filter((m) => m.status === 'orphan_deposit').length,
    totalAmount: matches.reduce((s, m) => s + m.amount, 0),
    readyAmount: matches
      .filter((m) => m.status === 'matched')
      .reduce((s, m) => s + m.amount, 0),
  }

  // Clearing balance = sum of all clearing transactions
  const clearingBalance = clearingTxns.reduce((s, t) => s + t.amount, 0)
  // Expected balance after reconciling all matched items
  const expectedBalance = clearingBalance - stats.readyAmount

  return {
    matches,
    stats,
    clearingBalance: Math.round(clearingBalance * 100) / 100,
    expectedBalance: Math.round(expectedBalance * 100) / 100,
    threeWayMode: true,
  }
}

/**
 * Medicare/DVA savings-account reconciliation using subset-sum matching.
 *
 * Medicare batches multiple patient payments into single deposits 2-3x/week.
 * Individual patient amounts ($27.05, $51.25, $75.60) sum to one deposit ($153.90).
 *
 * Algorithm:
 *  1. Filter clearing txns to RECEIVE only (exclude bank transfers/spends)
 *  2. Use subset-sum backtracking to find which clearing entries sum to each deposit
 *  3. Return grouped matches — one bank transfer per deposit when reconciling
 *
 * Uses the same findBestSubsetMatch algorithm as legacy mode.
 */
export interface MedicareBatchMatch {
  deposit: BankDeposit
  clearingEntries: ClearingTransaction[]
  total: number
  difference: number
  isExactMatch: boolean
}

export interface MedicareReconciliationResult {
  batchMatches: MedicareBatchMatch[]
  unmatchedDeposits: BankDeposit[]
  unmatchedClearing: ClearingTransaction[]
  clearingBalance: number
  stats: {
    totalDeposits: number
    matchedDeposits: number
    unmatchedDeposits: number
    totalClearingEntries: number
    matchedClearingEntries: number
    unmatchedClearingEntries: number
    readyAmount: number
    totalClearingAmount: number
  }
}

export function reconcileMedicare(
  clearingTxns: ClearingTransaction[],
  savingsDeposits: BankDeposit[],
  toleranceCents: number = 200 // $2.00 tolerance for rounding
): MedicareReconciliationResult {
  // Step 1: Filter clearing to RECEIVE only — these are the actual patient payments.
  // Exclude SPEND, SPEND-TRANSFER (bank transfers out), RECEIVE-TRANSFER (transfers in).
  const receiveOnly = clearingTxns.filter((t) => {
    const type = (t.txnType ?? '').toUpperCase()
    return type === 'RECEIVE' || type === '' // include if type unknown (backwards compat)
  })

  // Step 2: Use subset-sum matching — find which clearing entries sum to each deposit
  const used = new Set<string>()
  const batchMatches: MedicareBatchMatch[] = []
  const unmatchedDeposits: BankDeposit[] = []

  // Sort deposits by date (oldest first) for deterministic matching
  const sortedDeposits = [...savingsDeposits].sort(
    (a, b) => a.date.localeCompare(b.date)
  )

  for (const dep of sortedDeposits) {
    const targetCents = Math.round(dep.amount * 100)
    const available = receiveOnly.filter((c) => !used.has(c.transactionId))
    const result = findBestSubsetMatch(available, targetCents, toleranceCents)

    if (result) {
      result.subset.forEach((c) => used.add(c.transactionId))
      const total = result.subset.reduce((s, c) => s + c.amount, 0)
      const totalRounded = Math.round(total * 100) / 100
      const diff = Math.round((dep.amount - total) * 100) / 100

      batchMatches.push({
        deposit: dep,
        clearingEntries: result.subset,
        total: totalRounded,
        difference: diff,
        isExactMatch: Math.abs(result.diffCents) === 0,
      })
    } else {
      unmatchedDeposits.push(dep)
    }
  }

  const unmatchedClearing = receiveOnly.filter((c) => !used.has(c.transactionId))
  const clearingBalance = receiveOnly.reduce((s, t) => s + t.amount, 0)
  const readyAmount = batchMatches.reduce((s, m) => s + m.deposit.amount, 0)

  return {
    batchMatches,
    unmatchedDeposits,
    unmatchedClearing,
    clearingBalance: Math.round(clearingBalance * 100) / 100,
    stats: {
      totalDeposits: savingsDeposits.length,
      matchedDeposits: batchMatches.length,
      unmatchedDeposits: unmatchedDeposits.length,
      totalClearingEntries: receiveOnly.length,
      matchedClearingEntries: receiveOnly.length - unmatchedClearing.length,
      unmatchedClearingEntries: unmatchedClearing.length,
      readyAmount: Math.round(readyAmount * 100) / 100,
      totalClearingAmount: Math.round(clearingBalance * 100) / 100,
    },
  }
}

/**
 * Create a bank transfer from clearing account to NAB for a single reconciliation item.
 */
export async function createBankTransfer(params: {
  clearingAccountId: string
  nabAccountId: string
  amount: number
  date: string
  reference: string
}): Promise<{ success: boolean; message: string; transferId?: string }> {
  const headers = await xeroHeaders()

  const body = {
    FromBankAccount: { AccountID: params.clearingAccountId },
    ToBankAccount: { AccountID: params.nabAccountId },
    Amount: params.amount.toFixed(2),
    Date: params.date,
    Reference: params.reference,
  }

  const res = await fetch(`${XERO_API_BASE}/BankTransfers`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    return {
      success: false,
      message: `Bank transfer failed (${res.status}): ${errText.slice(0, 300)}`,
    }
  }

  const data = await res.json()
  const transfer = data.BankTransfers?.[0]
  if (transfer?.HasErrors) {
    const msgs = ((transfer.ValidationErrors as Array<{ Message: string }>) ?? [])
      .map((e: { Message: string }) => e.Message)
      .join('; ')
    return { success: false, message: msgs || 'Validation error creating bank transfer' }
  }

  return {
    success: true,
    message: `Bank transfer created: $${params.amount.toFixed(2)} (${params.reference})`,
    transferId: transfer?.BankTransferID as string | undefined,
  }
}

/**
 * Batch-create bank transfers for multiple reconciliation matches.
 * Rate-limits between batches to stay within Xero limits.
 * @param targetAccountId — destination bank account. Defaults to XERO_NAB_ACCOUNT_ID.
 */
export async function createBatchBankTransfers(
  items: Array<{
    clearingTransactionId: string
    amount: number
    date: string
    reference: string
  }>,
  targetAccountId?: string
): Promise<{
  total: number
  succeeded: number
  failed: number
  results: Array<{ reference: string; success: boolean; message: string; transferId?: string }>
}> {
  const clearingAccountId = process.env.XERO_CLEARING_ACCOUNT_ID
  const destAccountId = targetAccountId ?? process.env.XERO_NAB_ACCOUNT_ID

  if (!clearingAccountId || !destAccountId) {
    return {
      total: items.length,
      succeeded: 0,
      failed: items.length,
      results: items.map((item) => ({
        reference: item.reference,
        success: false,
        message: 'XERO_CLEARING_ACCOUNT_ID and target account ID are required',
      })),
    }
  }

  const results: Array<{ reference: string; success: boolean; message: string; transferId?: string }> = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = await createBankTransfer({
      clearingAccountId,
      nabAccountId: destAccountId,
      amount: item.amount,
      date: item.date,
      reference: item.reference,
    })

    results.push({
      reference: item.reference,
      success: result.success,
      message: result.message,
      transferId: result.transferId,
    })

    // Rate limit between transfers
    if (i < items.length - 1) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  return {
    total: items.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }
}

// ── Feature 3: Bulk delete / void invoices before a cutoff date ──

/**
 * Fetch all invoices from Xero before a given cutoff date.
 * Paginates through results (Xero returns max 100 per page).
 * Returns DRAFT, SUBMITTED, AUTHORISED, and PAID invoices for unified cleanup.
 */
export async function fetchInvoicesBeforeDate(
  cutoffDate: string
): Promise<XeroInvoiceSummary[]> {
  const headers = await xeroHeaders()
  const [year, month, day] = cutoffDate.split('-').map(Number)
  const where = `Date<DateTime(${year},${month},${day})`
  const statuses = ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID']

  const allInvoices: XeroInvoiceSummary[] = []

  for (const status of statuses) {
    let page = 1
    let hasMore = true

    while (hasMore) {
      const statusWhere = `${where} AND Status=="${status}"`
      const url = `${XERO_API_BASE}/Invoices?where=${encodeURIComponent(statusWhere)}&page=${page}&order=${encodeURIComponent('Date ASC')}`

      const res = await fetch(url, { headers })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Xero Invoices API ${res.status}: ${text.slice(0, 300)}`)
      }

      const data = await res.json()
      const invoices: Array<Record<string, unknown>> = data.Invoices ?? []

      for (const inv of invoices) {
        const contact = inv.Contact as Record<string, unknown> | undefined
        allInvoices.push({
          invoiceId: inv.InvoiceID as string,
          invoiceNumber: (inv.InvoiceNumber as string) ?? '',
          date: parseXeroDate(inv.Date),
          dueDate: parseXeroDate(inv.DueDate),
          status: inv.Status as string,
          type: inv.Type as string,
          contact: (contact?.Name as string) ?? '',
          total: Number(inv.Total ?? 0),
          amountDue: Number(inv.AmountDue ?? 0),
        })
      }

      hasMore = invoices.length === 100
      page++
      if (hasMore) await sleep(BATCH_DELAY_MS)
    }
  }

  return allInvoices
}

/**
 * Delete or void a single invoice depending on its status.
 * DRAFT/SUBMITTED → Status = DELETED
 * AUTHORISED → Status = VOIDED
 */
async function deleteOrVoidInvoice(
  invoice: XeroInvoiceSummary
): Promise<BulkDeleteResult> {
  const headers = await xeroHeaders()
  const status = invoice.status.toUpperCase()
  let targetStatus: 'DELETED' | 'VOIDED'

  if (status === 'DRAFT' || status === 'SUBMITTED') {
    targetStatus = 'DELETED'
  } else if (status === 'AUTHORISED') {
    targetStatus = 'VOIDED'
  } else {
    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.invoiceId,
      action: 'SKIPPED',
      success: false,
      message: `Cannot delete/void invoice with status "${status}"`,
    }
  }

  const body = {
    InvoiceID: invoice.invoiceId,
    InvoiceNumber: invoice.invoiceNumber,
    Status: targetStatus,
  }

  const res = await fetch(`${XERO_API_BASE}/Invoices/${invoice.invoiceId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.invoiceId,
      action: targetStatus,
      success: false,
      message: `Xero API ${res.status}: ${text.slice(0, 200)}`,
    }
  }

  const data = await res.json()
  const resultInv = data.Invoices?.[0]

  if (resultInv?.HasErrors) {
    const msgs = ((resultInv.ValidationErrors as Array<{ Message: string }>) ?? [])
      .map((e: { Message: string }) => e.Message)
      .join('; ')
    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.invoiceId,
      action: targetStatus,
      success: false,
      message: msgs || 'Unknown validation error',
    }
  }

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceId: invoice.invoiceId,
    action: targetStatus,
    success: true,
    message: targetStatus === 'DELETED' ? 'Deleted' : 'Voided',
  }
}

/**
 * Bulk delete/void invoices in batches with rate-limit pauses.
 */
export async function bulkDeleteInvoices(
  invoices: XeroInvoiceSummary[]
): Promise<{ results: BulkDeleteResult[]; stoppedEarly: boolean }> {
  const results: BulkDeleteResult[] = []

  for (let i = 0; i < invoices.length; i++) {
    const result = await deleteOrVoidInvoice(invoices[i])
    results.push(result)

    // Rate limit: pause every BATCH_SIZE invoices
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < invoices.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  return { results, stoppedEarly: false }
}

/**
 * Dry-run for bulk delete: returns what would happen without calling Xero.
 */
export function dryRunDelete(invoices: XeroInvoiceSummary[]): BulkDeleteResult[] {
  return invoices.map((inv) => {
    const status = inv.status.toUpperCase()
    if (status === 'DRAFT' || status === 'SUBMITTED') {
      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv.invoiceId,
        action: 'DELETED' as const,
        success: true,
        message: 'Would be deleted (dry run)',
      }
    }
    if (status === 'AUTHORISED') {
      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv.invoiceId,
        action: 'VOIDED' as const,
        success: true,
        message: 'Would be voided (dry run)',
      }
    }
    return {
      invoiceNumber: inv.invoiceNumber,
      invoiceId: inv.invoiceId,
      action: 'SKIPPED' as const,
      success: false,
      message: `Cannot delete/void: status "${status}"`,
    }
  })
}
