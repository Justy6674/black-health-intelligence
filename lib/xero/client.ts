import type { VoidResult, BankDeposit, ClearingTransaction, DepositMatch } from './types'

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

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'accounting.transactions accounting.settings accounting.contacts',
    }),
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
  return {
    Authorization: `Bearer ${token}`,
    'xero-tenant-id': env('XERO_TENANT_ID'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
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

/**
 * Chunk invoice numbers and void in batches with rate‑limit pauses.
 */
export async function bulkVoidInvoices(invoiceNumbers: string[]): Promise<VoidResult[]> {
  const results: VoidResult[] = []
  for (let i = 0; i < invoiceNumbers.length; i += BATCH_SIZE) {
    const chunk = invoiceNumbers.slice(i, i + BATCH_SIZE)
    const batch = await voidInvoicesBatch(chunk)
    results.push(...batch)
    if (i + BATCH_SIZE < invoiceNumbers.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }
  return results
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
