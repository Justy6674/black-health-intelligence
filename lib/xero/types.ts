// ── Xero API types ──

export interface VoidResult {
  invoiceNumber: string
  success: boolean
  message: string
}

export interface BulkVoidRequest {
  invoiceNumbers: string[]
  dryRun: boolean
}

export interface BulkVoidResponse {
  total: number
  attempted: number
  voided: number
  skipped: number
  errors: { invoiceNumber: string; message: string }[]
  dryRun: boolean
  stoppedEarly?: boolean
  user?: string // for audit
}

export interface BulkVoidAuditEntry {
  timestamp: string
  user: string
  cutoffDate: string
  attempted: number
  voided: number
  failed: number
  dryRun: boolean
  type?: 'bulk-void' | 'paid-wipe'
  paymentsRemoved?: number
}

export interface PaidWipeRequest {
  invoiceNumbers: string[]
  dryRun?: boolean
}

export interface PaidWipeResponse {
  total: number
  attempted: number
  voided: number
  skipped: number
  errors: { invoiceNumber: string; message: string }[]
  paymentsRemoved: Array<{ invoiceNumber: string; paymentIds: string[] }>
  dryRun: boolean
  stoppedEarly?: boolean
  user?: string
}

// ── Clearing‑account types ──

export interface BankDeposit {
  bankTransactionId: string
  date: string
  amount: number
  reference: string
  isReconciled: boolean
}

export interface ClearingTransaction {
  transactionId: string
  date: string
  amount: number
  invoiceNumber: string
  reference: string
}

export type MatchConfidence = 'exact' | 'fee-adjusted' | 'uncertain'

export interface DepositMatch {
  deposit: BankDeposit
  clearingTransactions: ClearingTransaction[]
  total: number
  difference: number
  isExactMatch: boolean
  /** Absolute value of fee implied by the difference (0 for exact) */
  impliedFee: number
  /** How the match was found */
  matchConfidence: MatchConfidence
}

export interface ClearingSummaryResponse {
  date: string
  /** Date range used for the query */
  fromDate?: string
  toDate?: string
  toleranceCents?: number
  deposits: DepositMatch[]
  unmatchedDeposits: BankDeposit[]
  unmatchedClearing: ClearingTransaction[]
}

export interface ClearingApplyRequest {
  bankTransactionId: string
  clearingTransactionIds: string[]
  dryRun: boolean
  /** Fee to post as Spend Money transaction (absolute value) */
  feeAmount?: number
  /** Xero expense account code for merchant fees */
  feeAccountCode?: string
}

export interface ClearingApplyResponse {
  bankTransactionId: string
  matched: number
  total: number
  success: boolean
  message: string
  dryRun: boolean
}

export interface ClearingOptions {
  /** Tolerance in cents for fee-adjusted matching (default 500 = $5.00) */
  toleranceCents: number
  /** Xero expense account code for merchant fees */
  feeAccountCode?: string
}

// ── CSV parsing types ──

export interface ParsedInvoice {
  invoiceNumber: string
  date: string
  amount: number
  status?: string
}

// ── Bulk delete types ──

export interface XeroInvoiceSummary {
  invoiceId: string
  invoiceNumber: string
  date: string
  dueDate: string
  status: string
  type: string
  contact: string
  total: number
  amountDue: number
}

export interface BulkDeleteRequest {
  cutoffDate: string // ISO date, e.g. "2026-01-01"
  dryRun: boolean
  /** Only fetch invoices; do not delete/void */
  fetchOnly?: boolean
}

export interface BulkDeleteResult {
  invoiceNumber: string
  invoiceId: string
  action: 'DELETED' | 'VOIDED' | 'SKIPPED'
  success: boolean
  message: string
}

export interface BulkDeleteResponse {
  cutoffDate: string
  totalFound: number
  deleted: number
  voided: number
  skipped: number
  errors: { invoiceNumber: string; message: string }[]
  dryRun: boolean
  stoppedEarly?: boolean
  user?: string
  invoices?: XeroInvoiceSummary[] // returned on fetchOnly
}

export interface BulkDeleteAuditEntry {
  timestamp: string
  user: string
  cutoffDate: string
  totalFound: number
  deleted: number
  voided: number
  skipped: number
  failed: number
  dryRun: boolean
}

// ── Invoice cleanup (unified void + delete) ──

export type InvoiceCleanupInputMode = 'csv' | 'fetch'

export type InvoiceCleanupStep = 'unpay' | 'void' | 'delete' | 'all'

export interface InvoiceCleanupRequest {
  inputMode: InvoiceCleanupInputMode
  cutoffDate?: string // for fetch mode
  invoiceNumbers?: string[] // for csv mode
  dryRun: boolean
  /** Include PAID invoices (un-pay then void). If false, PAID → skipped. Default true for fetch, false for CSV. */
  includePaid?: boolean
  /** When retrying failed void: run un-pay first (for "payments allocated" failures) */
  unpayFirstBeforeVoid?: boolean
  /** Run only this step; omit or 'all' = current behaviour */
  step?: InvoiceCleanupStep
  /** Re-fetch from Xero and return current status; no mutations */
  verifyOnly?: boolean
  /** For verifyOnly: expected status per invoice to compare (e.g. AUTHORISED after un-pay) */
  expectedByInvoice?: Record<string, string>
  /** Stage 1 un-pay: process at most N invoices per run to avoid 504 timeout. Default 50. */
  batchLimit?: number
}

export type InvoiceCleanupAction = 'DELETE' | 'VOID' | 'UNPAY_VOID' | 'SKIP'

export interface InvoiceCleanupItem {
  invoiceNumber: string
  invoiceId: string
  date: string
  total: number
  status: string
  action: InvoiceCleanupAction
}

/** Per-invoice result for staged flow and "What's left" */
export interface InvoiceCleanupResultItem {
  invoiceNumber: string
  action: InvoiceCleanupAction
  success: boolean
  message?: string
}

export interface InvoiceCleanupResponse {
  inputMode: InvoiceCleanupInputMode
  cutoffDate?: string
  invoices: InvoiceCleanupItem[]
  toDelete: number
  toVoid: number
  toUnpayVoid: number
  skipped: number
  deleted: number
  voided: number
  paymentsRemoved: number
  errors: { invoiceNumber: string; message: string }[]
  dryRun: boolean
  stoppedEarly?: boolean
  user?: string
  /** Per-invoice success/fail for staged flow and Retry failed only */
  results?: InvoiceCleanupResultItem[]
  /** Stage 1 un-pay was partial due to batchLimit */
  partial?: boolean
  /** Invoice numbers still to process (for "Continue" after partial) */
  remainingInvoiceNumbers?: string[]
  /** When this partial batch completed (ISO string) */
  processedAt?: string
}

/** Verify endpoint: current status from Xero for given invoice numbers */
export interface InvoiceCleanupVerifyResponse {
  verified: Array<{
    invoiceNumber: string
    status: string // PAID | AUTHORISED | VOIDED | not found
    expected?: string
    ok: boolean // true if status matches expected
  }>
}

// ── Audit log ──

export interface AuditEntry {
  action: 'bulk-void' | 'clearing-apply' | 'bulk-delete'
  user: string
  timestamp: string
  details: Record<string, unknown>
}
