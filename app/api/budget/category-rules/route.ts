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
    .from('category_mapping_rules')
    .select('*')
    .order('pattern', { ascending: true })

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
  if (!body.pattern || !body.category_up_id) {
    return NextResponse.json({ error: 'pattern and category_up_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('category_mapping_rules')
    .insert({
      pattern: body.pattern,
      category_up_id: body.category_up_id,
      merchant_label: body.merchant_label ?? null,
      is_active: body.is_active ?? true,
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

  const { data, error } = await supabase
    .from('category_mapping_rules')
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
    .from('category_mapping_rules')
    .update({ is_active: false })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
