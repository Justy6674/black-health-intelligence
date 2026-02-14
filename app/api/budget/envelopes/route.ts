import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const month = url.searchParams.get('month')

  const supabase = await createClient()

  // Fetch envelopes with their category assignments
  const { data: envelopes, error: envErr } = await supabase
    .from('budget_envelopes')
    .select('*, budget_envelope_categories(category_up_id)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (envErr) return NextResponse.json({ error: envErr.message }, { status: 500 })

  // If month provided, calculate actual spending per envelope
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mo] = month.split('-').map(Number)
    const startDate = new Date(year, mo - 1, 1).toISOString()
    const endDate = new Date(year, mo, 1).toISOString()

    const { data: transactions } = await supabase
      .from('up_transactions')
      .select('amount_cents, category_up_id, category_override')
      .gte('settled_at', startDate)
      .lt('settled_at', endDate)
      .eq('status', 'SETTLED')
      .lt('amount_cents', 0)

    // Build category-to-envelope mapping
    const catToEnvelope = new Map<string, string>()
    for (const env of envelopes ?? []) {
      const cats = (env as { budget_envelope_categories: Array<{ category_up_id: string }> })
        .budget_envelope_categories ?? []
      for (const cat of cats) {
        catToEnvelope.set(cat.category_up_id, env.id)
      }
    }

    // Aggregate spending by envelope
    const envelopeSpend = new Map<string, number>()
    for (const t of transactions ?? []) {
      const catId = t.category_override ?? t.category_up_id ?? 'uncategorised'
      const envId = catToEnvelope.get(catId)
      if (envId) {
        envelopeSpend.set(envId, (envelopeSpend.get(envId) ?? 0) + Math.abs(t.amount_cents))
      }
    }

    const result = (envelopes ?? []).map(env => ({
      id: env.id,
      name: env.name,
      sort_order: env.sort_order,
      monthly_allocation_cents: env.monthly_allocation_cents,
      colour: env.colour,
      categories: ((env as { budget_envelope_categories: Array<{ category_up_id: string }> })
        .budget_envelope_categories ?? []).map((c: { category_up_id: string }) => c.category_up_id),
      actual_spend_cents: envelopeSpend.get(env.id) ?? 0,
    }))

    return NextResponse.json(result)
  }

  // Without month, return envelopes without spend data
  const result = (envelopes ?? []).map(env => ({
    id: env.id,
    name: env.name,
    sort_order: env.sort_order,
    monthly_allocation_cents: env.monthly_allocation_cents,
    colour: env.colour,
    categories: ((env as { budget_envelope_categories: Array<{ category_up_id: string }> })
      .budget_envelope_categories ?? []).map((c: { category_up_id: string }) => c.category_up_id),
    actual_spend_cents: 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const supabase = await createClient()

  const { data: envelope, error: envErr } = await supabase
    .from('budget_envelopes')
    .insert({
      name: body.name,
      sort_order: body.sort_order ?? 0,
      monthly_allocation_cents: body.monthly_allocation_cents ?? 0,
      colour: body.colour ?? '#64748b',
    })
    .select()
    .single()

  if (envErr) return NextResponse.json({ error: envErr.message }, { status: 500 })

  // Assign categories if provided
  if (Array.isArray(body.categories) && body.categories.length > 0) {
    const rows = body.categories.map((catId: string) => ({
      envelope_id: envelope.id,
      category_up_id: catId,
    }))
    await supabase.from('budget_envelope_categories').insert(rows)
  }

  return NextResponse.json(envelope, { status: 201 })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { id, categories, ...updates } = body
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('budget_envelopes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update categories if provided
  if (Array.isArray(categories)) {
    await supabase.from('budget_envelope_categories').delete().eq('envelope_id', id)
    if (categories.length > 0) {
      const rows = categories.map((catId: string) => ({
        envelope_id: id,
        category_up_id: catId,
      }))
      await supabase.from('budget_envelope_categories').insert(rows)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('budget_envelopes')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
