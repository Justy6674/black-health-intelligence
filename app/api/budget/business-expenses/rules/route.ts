import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { pattern, merchant_name, category } = body

  if (!pattern || !merchant_name) {
    return NextResponse.json(
      { error: 'pattern and merchant_name are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('business_expense_rules')
    .insert({
      pattern,
      merchant_name,
      category: category || 'General',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
