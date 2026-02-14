import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'
import type { CategorySpend } from '@/lib/up/types'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = request.nextUrl
  const month = searchParams.get('month') // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
  }

  const [year, m] = month.split('-').map(Number)
  const startDate = new Date(year, m - 1, 1).toISOString()
  const endDate = new Date(year, m, 1).toISOString()

  const supabase = await createClient()

  // Fetch debit transactions for the month
  const { data: transactions, error: txnErr } = await supabase
    .from('up_transactions')
    .select('amount_cents, category_up_id, parent_category_up_id, category_override')
    .gte('settled_at', startDate)
    .lt('settled_at', endDate)
    .eq('status', 'SETTLED')
    .lt('amount_cents', 0) // debits only

  if (txnErr) {
    return NextResponse.json({ error: txnErr.message }, { status: 500 })
  }

  // Fetch categories and budget limits
  const [{ data: categories }, { data: limits }] = await Promise.all([
    supabase.from('up_categories').select('up_id, name, parent_up_id'),
    supabase.from('budget_limits').select('category_up_id, monthly_limit_cents'),
  ])

  const catMap = new Map((categories ?? []).map((c) => [c.up_id, c]))
  const limitMap = new Map((limits ?? []).map((l) => [l.category_up_id, l.monthly_limit_cents]))

  // Aggregate spend by effective category
  const spendMap = new Map<string, { totalCents: number; count: number }>()

  for (const t of transactions ?? []) {
    const effectiveId = t.category_override ?? t.category_up_id ?? 'uncategorised'
    const existing = spendMap.get(effectiveId) ?? { totalCents: 0, count: 0 }
    existing.totalCents += Math.abs(t.amount_cents)
    existing.count += 1
    spendMap.set(effectiveId, existing)
  }

  // Build response
  const result: CategorySpend[] = Array.from(spendMap.entries())
    .map(([effectiveId, { totalCents, count }]) => {
      const cat = catMap.get(effectiveId)
      const parentCat = cat?.parent_up_id ? catMap.get(cat.parent_up_id) : null
      return {
        effectiveId,
        name: cat?.name ?? 'Uncategorised',
        parentUpId: cat?.parent_up_id ?? null,
        parentName: parentCat?.name ?? null,
        totalSpentCents: totalCents,
        transactionCount: count,
        monthlyLimitCents: limitMap.get(effectiveId) ?? null,
      }
    })
    .sort((a, b) => b.totalSpentCents - a.totalSpentCents)

  return NextResponse.json(result)
}
