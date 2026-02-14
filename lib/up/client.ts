import type { UpAccount, UpCategory, UpTransaction, UpPaginatedResponse } from './types'

const UP_API_BASE = 'https://api.up.com.au/api/v1'

function getToken(): string {
  const token = process.env.UP_API_TOKEN
  if (!token) throw new Error('Missing env var UP_API_TOKEN')
  return token
}

function upHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/json',
  }
}

/** Verify the API token is valid. */
export async function ping(): Promise<{ ok: boolean; meta?: Record<string, unknown> }> {
  const res = await fetch(`${UP_API_BASE}/util/ping`, { headers: upHeaders() })
  if (!res.ok) return { ok: false }
  const data = await res.json()
  return { ok: true, meta: data.meta }
}

/** Fetch all accounts. */
export async function getAccounts(): Promise<UpAccount[]> {
  const res = await fetch(`${UP_API_BASE}/accounts?page[size]=100`, {
    headers: upHeaders(),
  })
  if (!res.ok) throw new Error(`Up accounts ${res.status}: ${await res.text()}`)
  const data: UpPaginatedResponse<UpAccount> = await res.json()
  return data.data
}

/** Fetch all categories (not paginated by Up). */
export async function getCategories(): Promise<UpCategory[]> {
  const res = await fetch(`${UP_API_BASE}/categories`, { headers: upHeaders() })
  if (!res.ok) throw new Error(`Up categories ${res.status}: ${await res.text()}`)
  const data: { data: UpCategory[] } = await res.json()
  return data.data
}

/** Fetch transactions with auto-pagination. */
export async function getTransactions(params?: {
  since?: string
  until?: string
  status?: 'HELD' | 'SETTLED'
  pageSize?: number
}): Promise<UpTransaction[]> {
  const pageSize = params?.pageSize ?? 100
  const searchParams = new URLSearchParams({ 'page[size]': String(pageSize) })
  if (params?.since) searchParams.set('filter[since]', params.since)
  if (params?.until) searchParams.set('filter[until]', params.until)
  if (params?.status) searchParams.set('filter[status]', params.status)

  let url: string | null = `${UP_API_BASE}/transactions?${searchParams}`
  const all: UpTransaction[] = []

  while (url) {
    const res = await fetch(url, { headers: upHeaders() })
    if (!res.ok) throw new Error(`Up transactions ${res.status}: ${await res.text()}`)
    const data: UpPaginatedResponse<UpTransaction> = await res.json()
    all.push(...data.data)
    url = data.links.next
  }

  return all
}
