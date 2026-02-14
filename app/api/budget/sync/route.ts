import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/xero/auth'
import { getAccounts, getCategories, getTransactions } from '@/lib/up/client'
import type { SyncResponse } from '@/lib/up/types'

/** Service-role client for bulk upserts (bypasses RLS). */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY')
  return createSupabaseClient(url, key)
}

export async function POST() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const supabase = getServiceClient()

    // 1. Sync categories
    const upCategories = await getCategories()
    const categoryRows = upCategories.map((c) => ({
      up_id: c.id,
      name: c.attributes.name,
      parent_up_id: c.relationships.parent.data?.id ?? null,
      synced_at: new Date().toISOString(),
    }))
    if (categoryRows.length > 0) {
      const { error } = await supabase
        .from('up_categories')
        .upsert(categoryRows, { onConflict: 'up_id' })
      if (error) throw new Error(`Category upsert failed: ${error.message}`)
    }

    // 2. Sync accounts
    const upAccounts = await getAccounts()
    const accountRows = upAccounts.map((a) => ({
      up_id: a.id,
      display_name: a.attributes.displayName,
      account_type: a.attributes.accountType,
      ownership_type: a.attributes.ownershipType,
      balance_cents: a.attributes.balance.valueInBaseUnits,
      synced_at: new Date().toISOString(),
    }))
    if (accountRows.length > 0) {
      const { error } = await supabase
        .from('up_accounts')
        .upsert(accountRows, { onConflict: 'up_id' })
      if (error) throw new Error(`Account upsert failed: ${error.message}`)
    }

    // 3. Determine sync window — last settled_at minus 1 hour, or 90 days ago
    const { data: lastTxn } = await supabase
      .from('up_transactions')
      .select('settled_at')
      .not('settled_at', 'is', null)
      .order('settled_at', { ascending: false })
      .limit(1)
      .single()

    let since: string
    if (lastTxn?.settled_at) {
      const d = new Date(lastTxn.settled_at)
      d.setHours(d.getHours() - 1) // 1-hour buffer
      since = d.toISOString()
    } else {
      const d = new Date()
      d.setDate(d.getDate() - 90)
      since = d.toISOString()
    }

    // 4. Fetch settled transactions from Up
    const upTransactions = await getTransactions({ since, status: 'SETTLED' })
    const txnRows = upTransactions.map((t) => ({
      up_id: t.id,
      account_up_id: t.relationships.account.data.id,
      description: t.attributes.description,
      message: t.attributes.message,
      amount_cents: t.attributes.amount.valueInBaseUnits,
      status: t.attributes.status,
      category_up_id: t.relationships.category.data?.id ?? null,
      parent_category_up_id: t.relationships.parentCategory.data?.id ?? null,
      settled_at: t.attributes.settledAt,
      created_at: t.attributes.createdAt,
      raw_json: t as unknown as Record<string, unknown>,
    }))

    if (txnRows.length > 0) {
      // Upsert but preserve category_override (exclude from update)
      const { error } = await supabase
        .from('up_transactions')
        .upsert(txnRows, {
          onConflict: 'up_id',
          ignoreDuplicates: false,
        })
      if (error) throw new Error(`Transaction upsert failed: ${error.message}`)
    }

    const result: SyncResponse = {
      categories: categoryRows.length,
      accounts: accountRows.length,
      transactions: txnRows.length,
      syncedAt: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
