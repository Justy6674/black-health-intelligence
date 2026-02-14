import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('up_accounts')
    .select('*')
    .order('account_type')
    .order('display_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
