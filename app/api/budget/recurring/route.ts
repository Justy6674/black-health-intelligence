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
    .from('recurring_items')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

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
    .from('recurring_items')
    .insert({
      name: body.name,
      type: body.type ?? 'expense',
      amount_cents: body.amount_cents ?? 0,
      frequency: body.frequency ?? 'monthly',
      category_up_id: body.category_up_id ?? null,
      account_up_id: body.account_up_id ?? null,
      next_due_date: body.next_due_date ?? null,
      is_active: body.is_active ?? true,
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
    .from('recurring_items')
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
    .from('recurring_items')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
