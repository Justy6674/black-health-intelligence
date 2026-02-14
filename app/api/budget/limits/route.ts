import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_limits')
    .select('*')
    .order('category_up_id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { categoryUpId, monthlyLimitCents } = body as {
    categoryUpId: string
    monthlyLimitCents: number
  }

  if (!categoryUpId || typeof monthlyLimitCents !== 'number') {
    return NextResponse.json(
      { error: 'categoryUpId and monthlyLimitCents required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_limits')
    .upsert(
      { category_up_id: categoryUpId, monthly_limit_cents: monthlyLimitCents },
      { onConflict: 'category_up_id' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
