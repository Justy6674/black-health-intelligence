// ── Up Bank API types (JSON:API format) ──

export interface UpAccount {
  type: 'accounts'
  id: string
  attributes: {
    displayName: string
    accountType: 'TRANSACTIONAL' | 'SAVER' | 'HOME_LOAN'
    ownershipType: 'INDIVIDUAL' | 'JOINT'
    balance: {
      currencyCode: string
      value: string
      valueInBaseUnits: number
    }
    createdAt: string
  }
}

export interface UpCategory {
  type: 'categories'
  id: string
  attributes: {
    name: string
  }
  relationships: {
    parent: {
      data: { type: 'categories'; id: string } | null
    }
    children: {
      data: Array<{ type: 'categories'; id: string }>
    }
  }
}

export interface UpTransaction {
  type: 'transactions'
  id: string
  attributes: {
    status: 'HELD' | 'SETTLED'
    rawText: string | null
    description: string
    message: string | null
    isCategorizable: boolean
    amount: {
      currencyCode: string
      value: string
      valueInBaseUnits: number
    }
    settledAt: string | null
    createdAt: string
  }
  relationships: {
    account: {
      data: { type: 'accounts'; id: string }
    }
    category: {
      data: { type: 'categories'; id: string } | null
    }
    parentCategory: {
      data: { type: 'categories'; id: string } | null
    }
  }
}

export interface UpPaginatedResponse<T> {
  data: T[]
  links: {
    prev: string | null
    next: string | null
  }
}

export interface UpSingleResponse<T> {
  data: T
}

// ── Supabase row types ──

export interface UpAccountRow {
  id: number
  up_id: string
  display_name: string
  account_type: string
  ownership_type: string
  balance_cents: number
  synced_at: string
}

export interface UpCategoryRow {
  id: number
  up_id: string
  name: string
  parent_up_id: string | null
  synced_at: string
}

export interface UpTransactionRow {
  id: number
  up_id: string
  account_up_id: string
  description: string
  message: string | null
  amount_cents: number
  status: string
  category_up_id: string | null
  parent_category_up_id: string | null
  category_override: string | null
  settled_at: string | null
  created_at: string
  raw_json: Record<string, unknown> | null
}

export interface BudgetLimitRow {
  id: number
  category_up_id: string
  monthly_limit_cents: number
  updated_at: string
}

// ── Budget expansion row types ──

export interface DebtRow {
  id: string
  lender: string
  balance_cents: number
  interest_rate: number
  compounding: 'monthly' | 'daily'
  min_payment_cents: number
  payment_frequency: 'weekly' | 'fortnightly' | 'monthly'
  due_day: number | null
  priority: number
  account_up_id: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecurringItemRow {
  id: string
  name: string
  type: 'income' | 'expense'
  amount_cents: number
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually'
  category_up_id: string | null
  account_up_id: string | null
  next_due_date: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CategoryMappingRuleRow {
  id: string
  pattern: string
  category_up_id: string
  merchant_label: string | null
  is_active: boolean
  created_at: string
}

export interface BudgetEnvelopeRow {
  id: string
  name: string
  sort_order: number
  monthly_allocation_cents: number
  colour: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetEnvelopeCategoryRow {
  id: string
  envelope_id: string
  category_up_id: string
  created_at: string
}

// ── API response types ──

export interface SyncResponse {
  categories: number
  accounts: number
  transactions: number
  syncedAt: string
}

export interface CategorySpend {
  effectiveId: string
  name: string
  parentUpId: string | null
  parentName: string | null
  totalSpentCents: number
  transactionCount: number
  monthlyLimitCents: number | null
}
