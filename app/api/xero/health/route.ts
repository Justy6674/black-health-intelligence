import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { getOrganisation } from '@/lib/xero/client'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const data = await getOrganisation()
    const orgs = (data.Organisations as Array<{ Name?: string }>) ?? []
    const name = orgs[0]?.Name ?? 'Connected'

    return NextResponse.json({ ok: true, organisationName: name })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
