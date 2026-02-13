import type { VoidResult, BankDeposit, ClearingTransaction, DepositMatch, XeroInvoiceSummary, BulkDeleteResult } from './types'

// ── Environment ──

const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0'
const BATCH_SIZE = 100
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

/**
 * Void a batch of invoices (max ~100) in a single PUT request.
 * Returns per‑invoice success/error.
 */
export async function voidInvoicesBatch(invoiceNumbers: string[]): Promise<VoidResult[]> {
  const headers = await xeroHeaders()

  const body = {
    Invoices: invoiceNumbers.map((n) => ({
      InvoiceNumber: n,
      Status: 'VOIDED',
    })),
  }

  const res = await fetch(`${XERO_API_BASE}/Invoices`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    // If the whole request fails, mark every invoice as error
    return invoiceNumbers.map((n) => ({
      invoiceNumber: n,
      success: false,
      message: `Xero API ${res.status}: ${text.slice(0, 200)}`,
    }))
  }

  const data = await res.json()
  const invoices: Array<Record<string, unknown>> = data.Invoices ?? []

  return invoiceNumbers.map((num) => {
    const inv = invoices.find(
      (i) => (i.InvoiceNumber as string)?.toUpperCase() === num.toUpperCase()
    )
    if (!inv) {
      return { invoiceNumber: num, success: false, message: 'Not found in response' }
    }
    if (inv.HasErrors) {
      const msgs = ((inv.ValidationErrors as Array<{ Message: string }>) ?? [])
        .map((e) => e.Message)
        .join('; ')
      return { invoiceNumber: num, success: false, message: msgs || 'Unknown error' }
    }
    return { invoiceNumber: num, success: true, message: 'Voided' }
  })
}

export interface BulkVoidOutcome {
  results: VoidResult[]
  stoppedEarly: boolean // true if a batch returned 4xx/5xx
}

/**
 * Chunk invoice numbers and void in batches with rate‑limit pauses.
 * Stops on first 4xx/5xx batch and returns partial results.
 */
export async function bulkVoidInvoices(invoiceNumbers: string[]): Promise<BulkVoidOutcome> {
  const results: VoidResult[] = []
  for (let i = 0; i < invoiceNumbers.length; i += BATCH_SIZE) {
    const chunk = invoiceNumbers.slice(i, i + BATCH_SIZE)
    const batch = await voidInvoicesBatch(chunk)
    const batchFailed =
      batch.length > 0 &&
      batch.every(
        (r) => !r.success && (r.message.startsWith('Xero API 4') || r.message.startsWith('Xero API 5'))
      )
    results.push(...batch)
    if (batchFailed) {
      return { results, stoppedEarly: true }
    }
    if (i + BATCH_SIZE < invoiceNumbers.length) {
      await sleep(BATCH_DELAY_MS)
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
 * Uses exact‑match first; returns unmatched items separately.
 */
export function suggestGroupings(
  deposits: BankDeposit[],
  clearingTxns: ClearingTransaction[]
): {
  matches: DepositMatch[]
  unmatchedDeposits: BankDeposit[]
  unmatchedClearing: ClearingTransaction[]
} {
  const used = new Set<string>()
  const matches: DepositMatch[] = []
  const unmatchedDeposits: BankDeposit[] = []

  for (const dep of deposits) {
    const target = Math.round(dep.amount * 100)
    // Try to find a subset of remaining clearing txns that sum to the deposit
    const available = clearingTxns.filter((c) => !used.has(c.transactionId))
    const subset = findExactSubset(available, target)

    if (subset) {
      subset.forEach((c) => used.add(c.transactionId))
      const total = subset.reduce((s, c) => s + c.amount, 0)
      matches.push({
        deposit: dep,
        clearingTransactions: subset,
        total: Math.round(total * 100) / 100,
        difference: Math.round((dep.amount - total) * 100) / 100,
        isExactMatch: true,
      })
    } else {
      unmatchedDeposits.push(dep)
    }
  }

  const unmatchedClearing = clearingTxns.filter((c) => !used.has(c.transactionId))
  return { matches, unmatchedDeposits, unmatchedClearing }
}

/**
 * Greedy exact‑subset finder (amounts in cents).
 * For small sets this is fine; for large sets a more sophisticated algo would be needed.
 */
function findExactSubset(
  txns: ClearingTransaction[],
  targetCents: number
): ClearingTransaction[] | null {
  // Sort descending to try big items first
  const sorted = [...txns].sort((a, b) => b.amount - a.amount)
  const result: ClearingTransaction[] = []
  let remaining = targetCents

  for (const t of sorted) {
    const cents = Math.round(t.amount * 100)
    if (cents <= remaining) {
      result.push(t)
      remaining -= cents
      if (remaining === 0) return result
    }
  }
  return null // no exact match found
}

/**
 * Apply a clearing reconciliation in Xero by creating a bank transfer
 * from the clearing account to the NAB account.
 */
export async function applyClearing(
  bankTransactionId: string,
  clearingTransactionIds: string[]
): Promise<{ success: boolean; message: string }> {
  // In Xero the standard approach is to create a bank transfer or
  // manually reconcile. Here we mark clearing transactions as reconciled
  // by creating a matching transfer. This is a simplified implementation;
  // the exact Xero mechanics depend on the user's chart of accounts.
  const headers = await xeroHeaders()

  // For now: attempt to reconcile by marking matched items.
  // Real implementation would use Xero's Bank Transfers or Manual Journals
  // depending on the account setup.
  const nabAccountId = process.env.XERO_NAB_ACCOUNT_ID
  const clearingAccountId = process.env.XERO_CLEARING_ACCOUNT_ID

  if (!nabAccountId || !clearingAccountId) {
    return {
      success: false,
      message: 'XERO_NAB_ACCOUNT_ID and XERO_CLEARING_ACCOUNT_ID env vars are required',
    }
  }

  // Fetch the bank transaction to get the amount
  const txnRes = await fetch(`${XERO_API_BASE}/BankTransactions/${bankTransactionId}`, { headers })
  if (!txnRes.ok) {
    return { success: false, message: `Failed to fetch bank transaction: ${txnRes.status}` }
  }
  const txnData = await txnRes.json()
  const amount = Number(txnData.BankTransactions?.[0]?.Total ?? 0)

  if (amount <= 0) {
    return { success: false, message: 'Bank transaction amount is zero or negative' }
  }

  // Create a bank transfer from clearing account to NAB account
  const transferBody = {
    FromBankAccount: { AccountID: clearingAccountId },
    ToBankAccount: { AccountID: nabAccountId },
    Amount: amount.toFixed(2),
    Date: txnData.BankTransactions?.[0]?.Date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
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

  return {
    success: true,
    message: `Bank transfer created for $${amount.toFixed(2)} covering ${clearingTransactionIds.length} clearing transactions`,
  }
}

// ── Feature 3: Bulk delete / void invoices before a cutoff date ──

/**
 * Fetch all invoices from Xero before a given cutoff date.
 * Paginates through results (Xero returns max 100 per page).
 * Only returns invoices that can be deleted (DRAFT/SUBMITTED) or voided (AUTHORISED/AWAITING PAYMENT).
 */
export async function fetchInvoicesBeforeDate(
  cutoffDate: string
): Promise<XeroInvoiceSummary[]> {
  const headers = await xeroHeaders()
  const [year, month, day] = cutoffDate.split('-').map(Number)
  const where = `Date<DateTime(${year},${month},${day})`
  const statuses = ['DRAFT', 'SUBMITTED', 'AUTHORISED']

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

    // Check for API-level failure to stop early
    if (!result.success && result.message.startsWith('Xero API 4')) {
      return { results, stoppedEarly: true }
    }
    if (!result.success && result.message.startsWith('Xero API 5')) {
      return { results, stoppedEarly: true }
    }

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
