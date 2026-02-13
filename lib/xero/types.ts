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

// ── Audit log ──

export interface AuditEntry {
  action: 'bulk-void' | 'clearing-apply'
  user: string
  timestamp: string
  details: Record<string, unknown>
}
