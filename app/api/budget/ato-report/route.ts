import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const months = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '3', 10) || 3, 1), 12)

  const supabase = await createClient()

  // Date range: last N complete months
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), 1) // Start of current month
  const startDate = new Date(endDate)
  startDate.setMonth(startDate.getMonth() - months)

  const startISO = startDate.toISOString()
  const endISO = endDate.toISOString()

  // ── 1. Income detection: credits matching BLACK HEALTH INTELLI ──
  const { data: incomeTransactions, error: incErr } = await supabase
    .from('up_transactions')
    .select('description, amount_cents, settled_at')
    .gte('settled_at', startISO)
    .lt('settled_at', endISO)
    .eq('status', 'SETTLED')
    .gt('amount_cents', 0)
    .ilike('description', '%BLACK HEALTH INTELLI%')
    .order('settled_at', { ascending: true })

  if (incErr) {
    return NextResponse.json({ error: incErr.message }, { status: 500 })
  }

  // Separate Justin vs Bec by amount patterns
  // Justin ~$2,104.92/week = ~$210,492 cents
  // Bec ~$1,464.08/week = ~$146,408 cents
  // We split by checking if the amount is above or below a midpoint (~$1,785)
  const midpointCents = 178500
  const justinDeposits: number[] = []
  const becDeposits: number[] = []

  for (const t of incomeTransactions ?? []) {
    if (t.amount_cents >= midpointCents) {
      justinDeposits.push(t.amount_cents)
    } else {
      becDeposits.push(t.amount_cents)
    }
  }

  const justinTotalCents = justinDeposits.reduce((s, c) => s + c, 0)
  const becTotalCents = becDeposits.reduce((s, c) => s + c, 0)

  // Calculate averages
  const justinWeekly = justinDeposits.length > 0
    ? justinTotalCents / justinDeposits.length
    : 0
  const becWeekly = becDeposits.length > 0
    ? becTotalCents / becDeposits.length
    : 0

  const justinMonthly = justinWeekly * (52 / 12)
  const becMonthly = becWeekly * (52 / 12)
  const totalMonthlyIncome = justinMonthly + becMonthly

  // ── 2. Expense aggregation: debits grouped by Up category ──
  // Fetch business expense flags to exclude
  const { data: flags } = await supabase
    .from('business_expense_flags')
    .select('transaction_up_id, is_business')

  const flaggedBusiness = new Set(
    (flags ?? []).filter(f => f.is_business).map(f => f.transaction_up_id)
  )
  const flaggedNotBusiness = new Set(
    (flags ?? []).filter(f => !f.is_business).map(f => f.transaction_up_id)
  )

  // Fetch rules for auto-matching
  const { data: rules } = await supabase
    .from('business_expense_rules')
    .select('pattern, merchant_name, category')
    .eq('is_active', true)

  const { data: expenses, error: expErr } = await supabase
    .from('up_transactions')
    .select('up_id, description, amount_cents, category_up_id, parent_category_up_id, category_override')
    .gte('settled_at', startISO)
    .lt('settled_at', endISO)
    .eq('status', 'SETTLED')
    .lt('amount_cents', 0)

  if (expErr) {
    return NextResponse.json({ error: expErr.message }, { status: 500 })
  }

  // Fetch category names
  const { data: categories } = await supabase
    .from('up_categories')
    .select('up_id, name, parent_up_id')

  const catMap = new Map((categories ?? []).map(c => [c.up_id, c]))

  // Helper to check if a transaction matches a business rule
  function matchesBusinessRule(description: string): { merchant_name: string; category: string } | null {
    const upper = description.toUpperCase()
    for (const rule of rules ?? []) {
      // Convert SQL ILIKE pattern to simple matching
      const parts = rule.pattern.replace(/%/g, '').split(/\s+/)
      if (parts.every((part: string) => upper.includes(part.toUpperCase()))) {
        return { merchant_name: rule.merchant_name, category: rule.category }
      }
    }
    return null
  }

  // Aggregate personal expenses by category (exclude business expenses)
  const categorySpend = new Map<string, { name: string; totalCents: number }>()
  let businessTotalCents = 0
  const businessCategoryTotals = new Map<string, number>()

  for (const t of expenses ?? []) {
    const absCents = Math.abs(t.amount_cents)
    const isFlaggedBusiness = flaggedBusiness.has(t.up_id)
    const isFlaggedNotBusiness = flaggedNotBusiness.has(t.up_id)
    const ruleMatch = matchesBusinessRule(t.description)

    // Determine if this is a business expense
    const isBusiness = isFlaggedBusiness || (!isFlaggedNotBusiness && ruleMatch !== null)

    if (isBusiness) {
      businessTotalCents += absCents
      const cat = ruleMatch?.category ?? 'General'
      businessCategoryTotals.set(cat, (businessCategoryTotals.get(cat) ?? 0) + absCents)
    } else {
      // Personal expense — group by parent category
      const catId = t.category_override ?? t.parent_category_up_id ?? t.category_up_id ?? 'uncategorised'
      const catInfo = catMap.get(catId)
      const catName = catInfo?.name ?? 'Uncategorised'
      const existing = categorySpend.get(catId) ?? { name: catName, totalCents: 0 }
      existing.totalCents += absCents
      categorySpend.set(catId, existing)
    }
  }

  const expenseCategories = Array.from(categorySpend.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .map(c => ({
      name: c.name,
      monthlyAverage: Math.round(c.totalCents / months),
    }))

  const totalMonthlyExpenses = expenseCategories.reduce((s, c) => s + c.monthlyAverage, 0)
  const monthlyBusinessSavings = Math.round(businessTotalCents / months)

  const businessCategories = Array.from(businessCategoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, totalCents]) => ({
      category,
      monthlyAverage: Math.round(totalCents / months),
    }))

  const monthlySurplus = Math.round(totalMonthlyIncome) - totalMonthlyExpenses

  return NextResponse.json({
    period: {
      from: startDate.toISOString().slice(0, 10),
      to: endDate.toISOString().slice(0, 10),
      months,
    },
    income: {
      justin: {
        weekly: Math.round(justinWeekly),
        monthly: Math.round(justinMonthly),
        annual: Math.round(justinWeekly * 52),
      },
      bec: {
        weekly: Math.round(becWeekly),
        monthly: Math.round(becMonthly),
        annual: Math.round(becWeekly * 52),
      },
      totalMonthly: Math.round(totalMonthlyIncome),
      totalAnnual: Math.round((justinWeekly + becWeekly) * 52),
    },
    expenses: {
      categories: expenseCategories,
      totalMonthly: totalMonthlyExpenses,
    },
    businessExpenses: {
      totalMonthly: monthlyBusinessSavings,
      categories: businessCategories,
    },
    summary: {
      monthlyIncome: Math.round(totalMonthlyIncome),
      monthlyExpenses: totalMonthlyExpenses,
      businessExpenseSavings: monthlyBusinessSavings,
      monthlySurplus: monthlySurplus,
      weeklySurplus: Math.round(monthlySurplus * 12 / 52),
    },
  })
}
