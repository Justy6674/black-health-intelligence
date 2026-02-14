import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const now = new Date()
  const from = url.searchParams.get('from') ?? `${now.getFullYear()}-01-01`
  const to = url.searchParams.get('to') ?? now.toISOString().slice(0, 10)

  const supabase = await createClient()

  // Fetch active rules
  const { data: rules, error: rulesErr } = await supabase
    .from('business_expense_rules')
    .select('id, pattern, merchant_name, category, is_active')
    .order('category')
    .order('merchant_name')

  if (rulesErr) {
    return NextResponse.json({ error: rulesErr.message }, { status: 500 })
  }

  const activeRules = (rules ?? []).filter(r => r.is_active)

  // Fetch debits in the date range
  const startISO = new Date(from).toISOString()
  const endISO = new Date(to + 'T23:59:59.999Z').toISOString()

  const { data: transactions, error: txnErr } = await supabase
    .from('up_transactions')
    .select('up_id, description, amount_cents, settled_at')
    .gte('settled_at', startISO)
    .lte('settled_at', endISO)
    .eq('status', 'SETTLED')
    .lt('amount_cents', 0)
    .order('settled_at', { ascending: false })

  if (txnErr) {
    return NextResponse.json({ error: txnErr.message }, { status: 500 })
  }

  // Fetch existing flags
  const { data: flags } = await supabase
    .from('business_expense_flags')
    .select('transaction_up_id, is_business, notes')

  const flagMap = new Map(
    (flags ?? []).map(f => [f.transaction_up_id, { is_business: f.is_business, notes: f.notes }])
  )

  // Match transactions against rules
  interface MatchedTransaction {
    upId: string
    description: string
    amountCents: number
    settledAt: string | null
    matchedRule: string | null
    matchedCategory: string | null
    isBusiness: boolean
    flagOverride: boolean
    notes: string | null
  }

  const matched: MatchedTransaction[] = []
  const categoryTotals = new Map<string, number>()

  for (const t of transactions ?? []) {
    const upper = t.description.toUpperCase()
    let ruleMatch: { merchant_name: string; category: string } | null = null

    for (const rule of activeRules) {
      const parts = rule.pattern.replace(/%/g, '').split(/\s+/)
      if (parts.every((part: string) => upper.includes(part.toUpperCase()))) {
        ruleMatch = { merchant_name: rule.merchant_name, category: rule.category }
        break
      }
    }

    const flag = flagMap.get(t.up_id)
    const flagOverride = flag !== undefined
    const isBusiness = flagOverride ? flag.is_business : ruleMatch !== null

    if (ruleMatch !== null || flagOverride) {
      matched.push({
        upId: t.up_id,
        description: t.description,
        amountCents: t.amount_cents,
        settledAt: t.settled_at,
        matchedRule: ruleMatch?.merchant_name ?? null,
        matchedCategory: ruleMatch?.category ?? (flag ? 'Manual' : null),
        isBusiness,
        flagOverride,
        notes: flag?.notes ?? null,
      })

      if (isBusiness) {
        const cat = ruleMatch?.category ?? 'Manual'
        categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + Math.abs(t.amount_cents))
      }
    }
  }

  const totalIdentifiedCents = matched
    .filter(m => m.isBusiness)
    .reduce((s, m) => s + Math.abs(m.amountCents), 0)

  const categories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, totalCents]) => ({ category, totalCents }))

  return NextResponse.json({
    period: { from, to },
    rules: rules ?? [],
    transactions: matched,
    summary: {
      totalIdentifiedCents,
      transactionCount: matched.filter(m => m.isBusiness).length,
      categories,
    },
  })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { transactionUpId, isBusiness, notes } = body

  if (!transactionUpId || typeof isBusiness !== 'boolean') {
    return NextResponse.json(
      { error: 'transactionUpId (string) and isBusiness (boolean) are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('business_expense_flags')
    .upsert(
      {
        transaction_up_id: transactionUpId,
        is_business: isBusiness,
        notes: notes ?? null,
      },
      { onConflict: 'transaction_up_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
