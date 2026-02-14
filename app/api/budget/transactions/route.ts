import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

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

  // Fetch transactions for the month
  const { data: transactions, error: txnErr } = await supabase
    .from('up_transactions')
    .select('*')
    .gte('settled_at', startDate)
    .lt('settled_at', endDate)
    .eq('status', 'SETTLED')
    .order('settled_at', { ascending: false })

  if (txnErr) {
    return NextResponse.json({ error: txnErr.message }, { status: 500 })
  }

  // Fetch all categories for name lookups
  const { data: categories } = await supabase
    .from('up_categories')
    .select('up_id, name, parent_up_id')

  const catMap = new Map((categories ?? []).map((c) => [c.up_id, c]))

  // Enrich transactions with category names
  const enriched = (transactions ?? []).map((t) => {
    const effectiveCatId = t.category_override ?? t.category_up_id
    const cat = effectiveCatId ? catMap.get(effectiveCatId) : null
    const parentCat = cat?.parent_up_id ? catMap.get(cat.parent_up_id) : null
    return {
      ...t,
      effective_category_id: effectiveCatId,
      category_name: cat?.name ?? null,
      parent_category_name: parentCat?.name ?? null,
    }
  })

  return NextResponse.json(enriched)
}
