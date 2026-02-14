import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const activeOnly = url.searchParams.get('active') === 'true'

  const supabase = await createClient()
  let query = supabase
    .from('debts')
    .select('*')
    .order('priority', { ascending: true })
    .order('balance_cents', { ascending: false })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('debts')
    .insert({
      lender: body.lender,
      balance_cents: body.balance_cents ?? 0,
      interest_rate: body.interest_rate ?? 0,
      compounding: body.compounding ?? 'monthly',
      min_payment_cents: body.min_payment_cents ?? 0,
      payment_frequency: body.payment_frequency ?? 'monthly',
      due_day: body.due_day ?? null,
      priority: body.priority ?? 0,
      account_up_id: body.account_up_id ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { id, ...updates } = body
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('debts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('debts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
