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

export interface DepositMatch {
  deposit: BankDeposit
  clearingTransactions: ClearingTransaction[]
  total: number
  difference: number
  isExactMatch: boolean
}

export interface ClearingSummaryResponse {
  date: string
  deposits: DepositMatch[]
  unmatchedDeposits: BankDeposit[]
  unmatchedClearing: ClearingTransaction[]
}

export interface ClearingApplyRequest {
  bankTransactionId: string
  clearingTransactionIds: string[]
  dryRun: boolean
}

export interface ClearingApplyResponse {
  bankTransactionId: string
  matched: number
  total: number
  success: boolean
  message: string
  dryRun: boolean
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

// ── Audit log ──

export interface AuditEntry {
  action: 'bulk-void' | 'clearing-apply' | 'bulk-delete'
  user: string
  timestamp: string
  details: Record<string, unknown>
}
