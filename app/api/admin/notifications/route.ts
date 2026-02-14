import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/notifications
 * Returns the current user's notification preferences.
 * Auto-creates a default row (opted in) if none exists.
 */
export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try to fetch existing preferences
  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json(existing)
  }

  // Auto-create default preferences (opted in)
  const { data: created, error } = await supabase
    .from('notification_preferences')
    .insert({
      user_id: user.id,
      email: user.email ?? '',
      clearing_report: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to create preferences' },
      { status: 500 }
    )
  }

  return NextResponse.json(created)
}

/**
 * POST /api/admin/notifications
 * Update clearing_report preference for the current user.
 * Body: { clearing_report: boolean }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const clearingReport = Boolean(body.clearing_report)

  // Upsert so it works whether or not a row exists yet
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? '',
        clearing_report: clearingReport,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Failed to update notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
