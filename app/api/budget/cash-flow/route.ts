import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

interface CashFlowEvent {
  date: string
  label: string
  amount: number
  type: 'income' | 'expense' | 'debt'
}

/** Add days to a frequency starting from a base date, returning all occurrences within the range. */
function getOccurrences(
  nextDue: Date,
  frequency: string,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const occurrences: Date[] = []
  const current = new Date(nextDue)

  // If nextDue is before rangeStart, advance it
  while (current < rangeStart) {
    advanceDate(current, frequency)
  }

  while (current <= rangeEnd) {
    occurrences.push(new Date(current))
    advanceDate(current, frequency)
  }

  return occurrences
}

function advanceDate(date: Date, frequency: string): void {
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'fortnightly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'annually':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const weeks = Math.min(Math.max(parseInt(url.searchParams.get('weeks') ?? '8', 10) || 8, 1), 52)

  const supabase = await createClient()

  // Fetch accounts, recurring items, and debts in parallel
  const [
    { data: accounts },
    { data: recurringItems },
    { data: debts },
  ] = await Promise.all([
    supabase.from('up_accounts').select('balance_cents'),
    supabase.from('recurring_items').select('*').eq('is_active', true),
    supabase.from('debts').select('*').eq('is_active', true).gt('balance_cents', 0),
  ])

  const startingBalance = (accounts ?? []).reduce((s, a) => s + a.balance_cents, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + weeks * 7)

  // Build events from recurring items
  const events: CashFlowEvent[] = []

  for (const item of recurringItems ?? []) {
    const nextDue = item.next_due_date ? new Date(item.next_due_date) : new Date(today)
    const occurrences = getOccurrences(nextDue, item.frequency, today, endDate)

    for (const occ of occurrences) {
      events.push({
        date: occ.toISOString().slice(0, 10),
        label: item.name,
        amount: item.type === 'income' ? item.amount_cents : -item.amount_cents,
        type: item.type,
      })
    }
  }

  // Build events from debt payments
  for (const debt of debts ?? []) {
    const freq = debt.payment_frequency
    // Use due_day to construct next due date if available
    let nextDue: Date
    if (debt.due_day) {
      nextDue = new Date(today.getFullYear(), today.getMonth(), debt.due_day)
      if (nextDue < today) advanceDate(nextDue, freq)
    } else {
      nextDue = new Date(today)
      advanceDate(nextDue, freq)
    }

    const occurrences = getOccurrences(nextDue, freq, today, endDate)
    for (const occ of occurrences) {
      events.push({
        date: occ.toISOString().slice(0, 10),
        label: `${debt.lender} payment`,
        amount: -debt.min_payment_cents,
        type: 'debt',
      })
    }
  }

  // Sort events by date
  events.sort((a, b) => a.date.localeCompare(b.date))

  // Build daily projections
  const projections: Array<{ date: string; balance: number; events: CashFlowEvent[] }> = []
  let runningBalance = startingBalance
  const alerts: Array<{ date: string; balance: number; message: string }> = []

  const currentDate = new Date(today)
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().slice(0, 10)
    const dayEvents = events.filter(e => e.date === dateStr)

    for (const e of dayEvents) {
      runningBalance += e.amount
    }

    projections.push({
      date: dateStr,
      balance: runningBalance,
      events: dayEvents,
    })

    if (runningBalance < 50000 && dayEvents.length > 0) {
      alerts.push({
        date: dateStr,
        balance: runningBalance,
        message: `Balance drops below $500`,
      })
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return NextResponse.json({
    projections,
    alerts,
    startingBalance,
  })
}
