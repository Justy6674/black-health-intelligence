import type { VoidResult, BankDeposit, ClearingTransaction, DepositMatch, MatchConfidence, XeroInvoiceSummary, BulkDeleteResult } from './types'

// ── Environment ──

const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0'
const BATCH_SIZE = 100
const VOID_BATCH_SIZE = 25 // Xero recommends ~50; smaller batches isolate bad invoices
const BATCH_DELAY_MS = 1500 // respect Xero rate limits

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
        date: ((inv.Date as string) ?? '').slice(0, 10),
        dueDate: ((inv.DueDate as string) ?? '').slice(0, 10),
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
  payments: Array<{ paymentId: string; amount: number; date: string }>
}

/** Fetch a single invoice by number, including Payments. Returns null if not found. */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithPayments | null> {
  const headers = await xeroHeaders()
  const escaped = invoiceNumber.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const where = `InvoiceNumber=="${escaped}"`
  const url = `${XERO_API_BASE}/Invoices?where=${encodeURIComponent(where)}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Xero Invoices ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const invoices: Array<Record<string, unknown>> = data.Invoices ?? []
  const inv = invoices[0]
  if (!inv) return null
  const payments: Array<Record<string, unknown>> = (inv.Payments as Array<Record<string, unknown>>) ?? []
  return {
    invoiceId: inv.InvoiceID as string,
    invoiceNumber: (inv.InvoiceNumber as string) ?? '',
    status: (inv.Status as string) ?? '',
    date: ((inv.Date as string) ?? '').slice(0, 10),
    payments: payments.map((p) => ({
      paymentId: p.PaymentID as string,
      amount: Number(p.Amount ?? 0),
      date: (p.Date as string) ?? '',
    })),
  }
}

/**
 * Attempt to delete a payment (remove from invoice). Xero may or may not support this.
 * POST /Payments with PaymentID and Status: DELETED.
 */
export async function deletePayment(paymentId: string): Promise<{ success: boolean; message: string }> {
  const headers = await xeroHeaders()
  const body = { PaymentID: paymentId, Status: 'DELETED' }
  const res = await fetch(`${XERO_API_BASE}/Payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
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

  return txns.map((t) => ({
    transactionId: t.BankTransactionID as string,
    date: (t.Date as string).slice(0, 10),
    amount: Number(t.Total ?? 0),
    invoiceNumber: (t.Reference as string) ?? '',
    reference: (t.Reference as string) ?? '',
  }))
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
          date: ((inv.Date as string) ?? '').slice(0, 10),
          dueDate: ((inv.DueDate as string) ?? '').slice(0, 10),
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
