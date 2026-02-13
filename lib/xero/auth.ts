import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Verify the request is from an authenticated admin user.
 * Returns the user email on success, or a 401 NextResponse on failure.
 */
export async function requireAdmin(): Promise<
  { user: string } | { error: NextResponse }
> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    return { user: user.email ?? user.id }
  } catch {
    return { error: NextResponse.json({ error: 'Auth check failed' }, { status: 401 }) }
  }
}
