import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ── Helpers to format results for the LLM ──

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(abs / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Tool definitions ──

export const budgetAssistantTools = {
  getAccountBalances: tool({
    description:
      'Get all Up Bank accounts with their current balances. Use for questions about how much money is available.',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('up_accounts')
        .select('display_name, account_type, balance_cents')
        .order('account_type')
        .order('display_name')

      if (error) return `Error fetching accounts: ${error.message}`
      if (!data || data.length === 0) return 'No accounts found.'

      const lines = data.map(
        (a) => `${a.display_name} (${a.account_type}): ${formatCents(a.balance_cents)}`
      )
      const totalCents = data.reduce((sum, a) => sum + a.balance_cents, 0)
      return lines.join('\n') + `\n\nTotal across all accounts: ${formatCents(totalCents)}`
    },
  }),

  getCategorySpend: tool({
    description:
      'Get monthly spending by category with budget limits. Shows how much was spent in each category and whether it is over/under budget.',
    parameters: z.object({
      month: z
        .string()
        .describe('Month to query in YYYY-MM format (e.g. 2026-02). Defaults to current month.')
        .optional(),
    }),
    execute: async ({ month }) => {
      const m = month || currentMonth()
      if (!/^\d{4}-\d{2}$/.test(m)) return 'Invalid month format. Use YYYY-MM.'

      const [year, mo] = m.split('-').map(Number)
      const startDate = new Date(year, mo - 1, 1).toISOString()
      const endDate = new Date(year, mo, 1).toISOString()

      const supabase = await createClient()

      const [{ data: transactions, error: txnErr }, { data: categories }, { data: limits }] =
        await Promise.all([
          supabase
            .from('up_transactions')
            .select('amount_cents, category_up_id, parent_category_up_id, category_override')
            .gte('settled_at', startDate)
            .lt('settled_at', endDate)
            .eq('status', 'SETTLED')
            .lt('amount_cents', 0),
          supabase.from('up_categories').select('up_id, name, parent_up_id'),
          supabase.from('budget_limits').select('category_up_id, monthly_limit_cents'),
        ])

      if (txnErr) return `Error: ${txnErr.message}`

      const catMap = new Map((categories ?? []).map((c) => [c.up_id, c]))
      const limitMap = new Map((limits ?? []).map((l) => [l.category_up_id, l.monthly_limit_cents]))

      // Aggregate
      const spendMap = new Map<string, { totalCents: number; count: number }>()
      for (const t of transactions ?? []) {
        const effectiveId = t.category_override ?? t.category_up_id ?? 'uncategorised'
        const existing = spendMap.get(effectiveId) ?? { totalCents: 0, count: 0 }
        existing.totalCents += Math.abs(t.amount_cents)
        existing.count += 1
        spendMap.set(effectiveId, existing)
      }

      const sorted = Array.from(spendMap.entries())
        .map(([id, { totalCents, count }]) => {
          const cat = catMap.get(id)
          const limitCents = limitMap.get(id)
          const pct = limitCents ? Math.round((totalCents / limitCents) * 100) : null
          const status = pct !== null ? (pct > 100 ? ' OVER BUDGET' : ` (${pct}% of limit)`) : ''
          return {
            line: `${cat?.name ?? 'Uncategorised'}: ${formatCents(totalCents)} (${count} txns)${limitCents ? ` / limit ${formatCents(limitCents)}${status}` : ''}`,
            totalCents,
          }
        })
        .sort((a, b) => b.totalCents - a.totalCents)

      const totalSpent = sorted.reduce((sum, s) => sum + s.totalCents, 0)
      const monthLabel = new Date(year, mo - 1).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
      })

      return (
        `Spending for ${monthLabel}:\n\n` +
        sorted.map((s) => s.line).join('\n') +
        `\n\nTotal spent: ${formatCents(totalSpent)}`
      )
    },
  }),

  searchTransactions: tool({
    description:
      'Search transactions by description text, amount range, or month. Returns matching transactions sorted by date.',
    parameters: z.object({
      month: z
        .string()
        .describe('Month to search in YYYY-MM format. Defaults to current month.')
        .optional(),
      search: z
        .string()
        .describe('Text to search for in transaction descriptions (case-insensitive)')
        .optional(),
      minAmount: z
        .number()
        .describe('Minimum absolute amount in dollars (e.g. 50 means $50+)')
        .optional(),
      maxAmount: z
        .number()
        .describe('Maximum absolute amount in dollars')
        .optional(),
    }),
    execute: async ({ month, search, minAmount, maxAmount }) => {
      const m = month || currentMonth()
      if (!/^\d{4}-\d{2}$/.test(m)) return 'Invalid month format. Use YYYY-MM.'

      const [year, mo] = m.split('-').map(Number)
      const startDate = new Date(year, mo - 1, 1).toISOString()
      const endDate = new Date(year, mo, 1).toISOString()

      const supabase = await createClient()

      let query = supabase
        .from('up_transactions')
        .select('description, amount_cents, settled_at, category_up_id, category_override')
        .gte('settled_at', startDate)
        .lt('settled_at', endDate)
        .eq('status', 'SETTLED')
        .order('settled_at', { ascending: false })
        .limit(50)

      if (search) {
        query = query.ilike('description', `%${search}%`)
      }
      if (minAmount !== undefined) {
        // Debits are negative, so -minAmount*100 in cents. Filter absolute value.
        query = query.lte('amount_cents', -(minAmount * 100))
      }
      if (maxAmount !== undefined) {
        query = query.gte('amount_cents', -(maxAmount * 100))
      }

      const { data, error } = await query

      if (error) return `Error: ${error.message}`
      if (!data || data.length === 0) return 'No matching transactions found.'

      // Fetch categories for names
      const catIds = [...new Set(data.map((t) => t.category_override ?? t.category_up_id).filter(Boolean))]
      let catMap = new Map<string, string>()
      if (catIds.length > 0) {
        const { data: cats } = await supabase
          .from('up_categories')
          .select('up_id, name')
          .in('up_id', catIds)
        catMap = new Map((cats ?? []).map((c) => [c.up_id, c.name]))
      }

      const lines = data.map((t) => {
        const date = t.settled_at
          ? new Date(t.settled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
          : '?'
        const catId = t.category_override ?? t.category_up_id
        const catName = catId ? catMap.get(catId) ?? '' : ''
        return `${date} | ${t.description} | ${formatCents(t.amount_cents)}${catName ? ` | ${catName}` : ''}`
      })

      const total = data.reduce((sum, t) => sum + t.amount_cents, 0)
      return lines.join('\n') + `\n\n${data.length} transaction(s), net: ${formatCents(total)}`
    },
  }),

  getBudgetLimits: tool({
    description:
      'Get all category budget limits that have been set. Shows the monthly spending limit for each category.',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient()

      const [{ data: limits, error }, { data: categories }] = await Promise.all([
        supabase.from('budget_limits').select('category_up_id, monthly_limit_cents').order('category_up_id'),
        supabase.from('up_categories').select('up_id, name'),
      ])

      if (error) return `Error: ${error.message}`
      if (!limits || limits.length === 0) return 'No budget limits have been set.'

      const catMap = new Map((categories ?? []).map((c) => [c.up_id, c.name]))

      const lines = limits.map(
        (l) =>
          `${catMap.get(l.category_up_id) ?? l.category_up_id}: ${formatCents(l.monthly_limit_cents)}/month`
      )

      const totalLimit = limits.reduce((sum, l) => sum + l.monthly_limit_cents, 0)
      return lines.join('\n') + `\n\nTotal monthly budget: ${formatCents(totalLimit)}`
    },
  }),

  getMonthComparison: tool({
    description:
      'Compare total spending between two months. Shows total spent in each month and the difference.',
    parameters: z.object({
      month1: z.string().describe('First month in YYYY-MM format (e.g. 2026-01)'),
      month2: z.string().describe('Second month in YYYY-MM format (e.g. 2026-02)'),
    }),
    execute: async ({ month1, month2 }) => {
      if (!/^\d{4}-\d{2}$/.test(month1) || !/^\d{4}-\d{2}$/.test(month2)) {
        return 'Invalid month format. Use YYYY-MM.'
      }

      const supabase = await createClient()

      async function getMonthTotal(month: string): Promise<{ total: number; count: number }> {
        const [year, mo] = month.split('-').map(Number)
        const startDate = new Date(year, mo - 1, 1).toISOString()
        const endDate = new Date(year, mo, 1).toISOString()

        const { data } = await supabase
          .from('up_transactions')
          .select('amount_cents')
          .gte('settled_at', startDate)
          .lt('settled_at', endDate)
          .eq('status', 'SETTLED')
          .lt('amount_cents', 0)

        const total = (data ?? []).reduce((sum, t) => sum + Math.abs(t.amount_cents), 0)
        return { total, count: data?.length ?? 0 }
      }

      const [m1, m2] = await Promise.all([getMonthTotal(month1), getMonthTotal(month2)])

      const formatMonth = (m: string) => {
        const [y, mo] = m.split('-').map(Number)
        return new Date(y, mo - 1).toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })
      }

      const diff = m2.total - m1.total
      const pctChange = m1.total > 0 ? Math.round((diff / m1.total) * 100) : 0
      const direction = diff > 0 ? 'more' : diff < 0 ? 'less' : 'the same'

      return [
        `${formatMonth(month1)}: ${formatCents(m1.total)} (${m1.count} transactions)`,
        `${formatMonth(month2)}: ${formatCents(m2.total)} (${m2.count} transactions)`,
        '',
        `Difference: ${formatCents(Math.abs(diff))} ${direction} (${diff > 0 ? '+' : ''}${pctChange}%)`,
      ].join('\n')
    },
  }),

  getIncomeBreakdown: tool({
    description:
      'Detect salary deposits from BLACK HEALTH INTELLI PTY LTD and return weekly/monthly/annual income for Justin and Bec separately. Use for income questions, surplus calculations, and ATO payment plan discussions.',
    parameters: z.object({
      months: z
        .number()
        .describe('Number of months to average over (default 3)')
        .optional(),
    }),
    execute: async ({ months: monthCount }) => {
      const m = monthCount ?? 3
      const supabase = await createClient()

      const now = new Date()
      const endDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - m)

      const { data, error } = await supabase
        .from('up_transactions')
        .select('description, amount_cents, settled_at')
        .gte('settled_at', startDate.toISOString())
        .lt('settled_at', endDate.toISOString())
        .eq('status', 'SETTLED')
        .gt('amount_cents', 0)
        .ilike('description', '%BLACK HEALTH INTELLI%')
        .order('settled_at', { ascending: true })

      if (error) return `Error: ${error.message}`
      if (!data || data.length === 0) return 'No income deposits found from BLACK HEALTH INTELLI.'

      // Split Justin vs Bec by amount (Justin ~$2,105/wk, Bec ~$1,464/wk)
      const midpointCents = 178500
      const justinDeposits = data.filter(t => t.amount_cents >= midpointCents)
      const becDeposits = data.filter(t => t.amount_cents < midpointCents)

      const justinTotal = justinDeposits.reduce((s, t) => s + t.amount_cents, 0)
      const becTotal = becDeposits.reduce((s, t) => s + t.amount_cents, 0)

      const justinWeekly = justinDeposits.length > 0 ? justinTotal / justinDeposits.length : 0
      const becWeekly = becDeposits.length > 0 ? becTotal / becDeposits.length : 0

      const justinMonthly = justinWeekly * (52 / 12)
      const becMonthly = becWeekly * (52 / 12)

      const lines = [
        `Income breakdown (${m}-month average):`,
        '',
        `Justin (BLACK HEALTH INTELLI PTY LTD):`,
        `  Weekly:  ${formatCents(Math.round(justinWeekly))}`,
        `  Monthly: ${formatCents(Math.round(justinMonthly))}`,
        `  Annual:  ${formatCents(Math.round(justinWeekly * 52))}`,
        `  (${justinDeposits.length} deposits in period)`,
        '',
        `Bec (BLACK HEALTH INTELLI PTY LTD):`,
        `  Weekly:  ${formatCents(Math.round(becWeekly))}`,
        `  Monthly: ${formatCents(Math.round(becMonthly))}`,
        `  Annual:  ${formatCents(Math.round(becWeekly * 52))}`,
        `  (${becDeposits.length} deposits in period)`,
        '',
        `Combined Household:`,
        `  Weekly:  ${formatCents(Math.round(justinWeekly + becWeekly))}`,
        `  Monthly: ${formatCents(Math.round(justinMonthly + becMonthly))}`,
        `  Annual:  ${formatCents(Math.round((justinWeekly + becWeekly) * 52))}`,
      ]

      return lines.join('\n')
    },
  }),

  getDebts: tool({
    description:
      'Get all tracked debts with balances, interest rates, and minimum payments. Use for questions about debt, how much is owed, or repayment obligations.',
    parameters: z.object({
      activeOnly: z
        .boolean()
        .describe('Only return active debts (default true)')
        .optional(),
    }),
    execute: async ({ activeOnly }) => {
      const supabase = await createClient()
      let query = supabase
        .from('debts')
        .select('lender, balance_cents, interest_rate, compounding, min_payment_cents, payment_frequency, due_day, priority, notes')
        .order('priority')
        .order('balance_cents', { ascending: false })

      if (activeOnly !== false) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) return `Error: ${error.message}`
      if (!data || data.length === 0) return 'No debts tracked.'

      const lines = data.map(d => {
        let minMonthly = d.min_payment_cents
        if (d.payment_frequency === 'weekly') minMonthly = Math.round(d.min_payment_cents * (52 / 12))
        else if (d.payment_frequency === 'fortnightly') minMonthly = Math.round(d.min_payment_cents * (26 / 12))

        return `${d.lender}: ${formatCents(d.balance_cents)} @ ${d.interest_rate}% (min ${formatCents(d.min_payment_cents)}/${d.payment_frequency}, ~${formatCents(minMonthly)}/mo)${d.notes ? ` — ${d.notes}` : ''}`
      })

      const totalBalance = data.reduce((s, d) => s + d.balance_cents, 0)
      const totalMinMonthly = data.reduce((s, d) => {
        let m = d.min_payment_cents
        if (d.payment_frequency === 'weekly') m = Math.round(d.min_payment_cents * (52 / 12))
        else if (d.payment_frequency === 'fortnightly') m = Math.round(d.min_payment_cents * (26 / 12))
        return s + m
      }, 0)
      const weightedRate = totalBalance > 0
        ? data.reduce((s, d) => s + d.interest_rate * d.balance_cents, 0) / totalBalance
        : 0

      return [
        'Tracked debts:',
        '',
        ...lines,
        '',
        `Total debt: ${formatCents(totalBalance)}`,
        `Total minimum payments: ${formatCents(totalMinMonthly)}/month`,
        `Weighted average rate: ${weightedRate.toFixed(2)}%`,
      ].join('\n')
    },
  }),

  getDebtPlan: tool({
    description:
      'Simulate debt payoff using snowball (lowest balance first) or avalanche (highest rate first) strategy. Returns time to debt-free, total interest paid, and payoff order. Use for questions about when debts will be paid off or comparing strategies.',
    parameters: z.object({
      strategy: z
        .enum(['snowball', 'avalanche'])
        .describe('Payoff strategy: snowball = lowest balance first, avalanche = highest rate first')
        .optional(),
      extraMonthlyDollars: z
        .number()
        .describe('Extra dollars per month beyond minimums to throw at debt (default 0)')
        .optional(),
    }),
    execute: async ({ strategy, extraMonthlyDollars }) => {
      const strat = strategy ?? 'avalanche'
      const extraCents = Math.round((extraMonthlyDollars ?? 0) * 100)

      const supabase = await createClient()
      const { data: rawDebts } = await supabase
        .from('debts')
        .select('*')
        .eq('is_active', true)
        .gt('balance_cents', 0)

      if (!rawDebts || rawDebts.length === 0) return 'No active debts to simulate.'

      // Normalise to monthly
      interface SimDebt {
        lender: string
        balanceCents: number
        monthlyRate: number
        minPaymentCents: number
      }

      const debts: SimDebt[] = rawDebts.map(d => {
        let minMonthly = d.min_payment_cents
        if (d.payment_frequency === 'weekly') minMonthly = Math.round(d.min_payment_cents * (52 / 12))
        else if (d.payment_frequency === 'fortnightly') minMonthly = Math.round(d.min_payment_cents * (26 / 12))
        let monthlyRate = 0
        if (d.interest_rate > 0) {
          monthlyRate = d.compounding === 'daily'
            ? Math.pow(1 + d.interest_rate / 100 / 365, 30.44) - 1
            : d.interest_rate / 100 / 12
        }
        return { lender: d.lender, balanceCents: d.balance_cents, monthlyRate, minPaymentCents: minMonthly }
      })

      const balances = debts.map(d => d.balanceCents)
      const totalPaid = debts.map(() => 0)
      let totalInterestPaid = 0
      const payoffOrder: Array<{ lender: string; month: number }> = []

      for (let month = 1; month <= 600; month++) {
        for (let i = 0; i < debts.length; i++) {
          if (balances[i] <= 0) continue
          const interest = Math.round(balances[i] * debts[i].monthlyRate)
          balances[i] += interest
          totalInterestPaid += interest
        }

        for (let i = 0; i < debts.length; i++) {
          if (balances[i] <= 0) continue
          const payment = Math.min(debts[i].minPaymentCents, balances[i])
          balances[i] -= payment
          totalPaid[i] += payment
        }

        let remaining = extraCents
        if (remaining > 0) {
          const active = debts.map((_, i) => i).filter(i => balances[i] > 0)
          if (strat === 'snowball') active.sort((a, b) => balances[a] - balances[b])
          else active.sort((a, b) => debts[b].monthlyRate - debts[a].monthlyRate)
          for (const i of active) {
            if (remaining <= 0) break
            const p = Math.min(remaining, balances[i])
            balances[i] -= p
            totalPaid[i] += p
            remaining -= p
          }
        }

        for (let i = 0; i < debts.length; i++) {
          if (balances[i] <= 0 && !payoffOrder.find(p => p.lender === debts[i].lender)) {
            payoffOrder.push({ lender: debts[i].lender, month })
          }
        }

        if (balances.every(b => b <= 0)) {
          const years = Math.floor(month / 12)
          const mo = month % 12
          const lines = [
            `${strat.charAt(0).toUpperCase() + strat.slice(1)} strategy (${extraMonthlyDollars ? formatCents(extraCents) + ' extra/mo' : 'minimums only'}):`,
            '',
            `Debt-free in: ${years > 0 ? `${years} year${years !== 1 ? 's' : ''} ` : ''}${mo} month${mo !== 1 ? 's' : ''} (${month} months)`,
            `Total interest paid: ${formatCents(totalInterestPaid)}`,
            '',
            'Payoff order:',
            ...payoffOrder.map((p, i) => `  ${i + 1}. ${p.lender} — month ${p.month}`),
          ]
          return lines.join('\n')
        }
      }

      return `With ${strat} strategy, debts would take over 50 years to pay off. Consider increasing payments.`
    },
  }),

  getRecurringItems: tool({
    description:
      'Get all recurring income and expense items. Use for questions about regular bills, subscriptions, salary entries, or to understand fixed costs.',
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('recurring_items')
        .select('name, type, amount_cents, frequency, next_due_date, notes')
        .eq('is_active', true)
        .order('type')
        .order('amount_cents', { ascending: false })

      if (error) return `Error: ${error.message}`
      if (!data || data.length === 0) return 'No recurring items configured.'

      const income = data.filter(i => i.type === 'income')
      const expenses = data.filter(i => i.type === 'expense')

      // Normalise to monthly
      function toMonthly(cents: number, freq: string): number {
        switch (freq) {
          case 'weekly': return Math.round(cents * (52 / 12))
          case 'fortnightly': return Math.round(cents * (26 / 12))
          case 'quarterly': return Math.round(cents / 3)
          case 'annually': return Math.round(cents / 12)
          default: return cents
        }
      }

      const lines: string[] = []

      if (income.length > 0) {
        lines.push('Recurring Income:')
        for (const i of income) {
          lines.push(`  ${i.name}: ${formatCents(i.amount_cents)}/${i.frequency} (~${formatCents(toMonthly(i.amount_cents, i.frequency))}/mo)${i.next_due_date ? ` — next: ${i.next_due_date}` : ''}`)
        }
        const totalIncomeMonthly = income.reduce((s, i) => s + toMonthly(i.amount_cents, i.frequency), 0)
        lines.push(`  Total monthly income: ${formatCents(totalIncomeMonthly)}`)
        lines.push('')
      }

      if (expenses.length > 0) {
        lines.push('Recurring Expenses:')
        for (const e of expenses) {
          lines.push(`  ${e.name}: ${formatCents(e.amount_cents)}/${e.frequency} (~${formatCents(toMonthly(e.amount_cents, e.frequency))}/mo)${e.next_due_date ? ` — next: ${e.next_due_date}` : ''}`)
        }
        const totalExpenseMonthly = expenses.reduce((s, e) => s + toMonthly(e.amount_cents, e.frequency), 0)
        lines.push(`  Total monthly expenses: ${formatCents(totalExpenseMonthly)}`)
      }

      return lines.join('\n')
    },
  }),

  getCashFlow: tool({
    description:
      'Project cash flow for the next N weeks using current balances, recurring items, and debt payments. Returns projected balance timeline and alerts for low-balance dates. Use for questions about upcoming cash flow, when money will run out, or whether upcoming bills are affordable.',
    parameters: z.object({
      weeks: z
        .number()
        .describe('Number of weeks to project (default 8, max 52)')
        .optional(),
    }),
    execute: async ({ weeks: weekCount }) => {
      const w = Math.min(Math.max(weekCount ?? 8, 1), 52)

      const supabase = await createClient()
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
      endDate.setDate(endDate.getDate() + w * 7)

      // Build events
      const events: Array<{ date: string; label: string; amount: number }> = []

      function advanceDate(date: Date, freq: string) {
        switch (freq) {
          case 'weekly': date.setDate(date.getDate() + 7); break
          case 'fortnightly': date.setDate(date.getDate() + 14); break
          case 'monthly': date.setMonth(date.getMonth() + 1); break
          case 'quarterly': date.setMonth(date.getMonth() + 3); break
          case 'annually': date.setFullYear(date.getFullYear() + 1); break
        }
      }

      for (const item of recurringItems ?? []) {
        const nextDue = item.next_due_date ? new Date(item.next_due_date) : new Date(today)
        const current = new Date(nextDue)
        while (current < today) advanceDate(current, item.frequency)
        while (current <= endDate) {
          events.push({
            date: current.toISOString().slice(0, 10),
            label: item.name,
            amount: item.type === 'income' ? item.amount_cents : -item.amount_cents,
          })
          advanceDate(current, item.frequency)
        }
      }

      for (const debt of debts ?? []) {
        let nextDue: Date
        if (debt.due_day) {
          nextDue = new Date(today.getFullYear(), today.getMonth(), debt.due_day)
          if (nextDue < today) advanceDate(nextDue, debt.payment_frequency)
        } else {
          nextDue = new Date(today)
          advanceDate(nextDue, debt.payment_frequency)
        }
        const current = new Date(nextDue)
        while (current <= endDate) {
          events.push({
            date: current.toISOString().slice(0, 10),
            label: `${debt.lender} payment`,
            amount: -debt.min_payment_cents,
          })
          advanceDate(current, debt.payment_frequency)
        }
      }

      events.sort((a, b) => a.date.localeCompare(b.date))

      // Simulate
      let balance = startingBalance
      const lines: string[] = [
        `Cash flow projection (${w} weeks):`,
        `Starting balance: ${formatCents(startingBalance)}`,
        '',
      ]
      const alerts: string[] = []
      let lowestBalance = startingBalance
      let lowestDate = ''

      for (const e of events) {
        balance += e.amount
        const dateLabel = new Date(e.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', weekday: 'short' })
        const sign = e.amount > 0 ? '+' : ''
        lines.push(`${dateLabel}: ${e.label} ${sign}${formatCents(e.amount)} → balance ${formatCents(balance)}`)

        if (balance < lowestBalance) {
          lowestBalance = balance
          lowestDate = e.date
        }
        if (balance < 50000) {
          alerts.push(`Warning: Balance drops to ${formatCents(balance)} on ${dateLabel}`)
        }
      }

      lines.push('')
      lines.push(`Ending balance: ${formatCents(balance)}`)
      if (lowestDate) {
        lines.push(`Lowest point: ${formatCents(lowestBalance)} on ${new Date(lowestDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`)
      }

      if (alerts.length > 0) {
        lines.push('')
        lines.push('ALERTS:')
        // De-duplicate alerts
        const unique = [...new Set(alerts)]
        lines.push(...unique.slice(0, 5))
      }

      return lines.join('\n')
    },
  }),

  getEnvelopeSummary: tool({
    description:
      'Get budget envelope allocation vs actual spending for a given month. Shows how spending is tracking against envelope budgets. Use for questions about budget categories, envelope spending, or budget progress.',
    parameters: z.object({
      month: z
        .string()
        .describe('Month in YYYY-MM format. Defaults to current month.')
        .optional(),
    }),
    execute: async ({ month }) => {
      const m = month || currentMonth()
      if (!/^\d{4}-\d{2}$/.test(m)) return 'Invalid month format. Use YYYY-MM.'

      const [year, mo] = m.split('-').map(Number)
      const startDate = new Date(year, mo - 1, 1).toISOString()
      const endDate = new Date(year, mo, 1).toISOString()

      const supabase = await createClient()

      const [{ data: envelopes }, { data: transactions }] = await Promise.all([
        supabase
          .from('budget_envelopes')
          .select('id, name, monthly_allocation_cents, budget_envelope_categories(category_up_id)')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('up_transactions')
          .select('amount_cents, category_up_id, category_override')
          .gte('settled_at', startDate)
          .lt('settled_at', endDate)
          .eq('status', 'SETTLED')
          .lt('amount_cents', 0),
      ])

      if (!envelopes || envelopes.length === 0) return 'No budget envelopes configured.'

      // Build category-to-envelope mapping
      const catToEnv = new Map<string, string>()
      for (const env of envelopes) {
        const cats = (env as { budget_envelope_categories: Array<{ category_up_id: string }> })
          .budget_envelope_categories ?? []
        for (const c of cats) catToEnv.set(c.category_up_id, env.id)
      }

      // Aggregate spending
      const envSpend = new Map<string, number>()
      let unassigned = 0
      for (const t of transactions ?? []) {
        const catId = t.category_override ?? t.category_up_id ?? 'uncategorised'
        const envId = catToEnv.get(catId)
        if (envId) {
          envSpend.set(envId, (envSpend.get(envId) ?? 0) + Math.abs(t.amount_cents))
        } else {
          unassigned += Math.abs(t.amount_cents)
        }
      }

      const monthLabel = new Date(year, mo - 1).toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })
      const lines = [`Budget envelopes for ${monthLabel}:`, '']

      let totalAllocation = 0
      let totalSpent = 0

      for (const env of envelopes) {
        const spent = envSpend.get(env.id) ?? 0
        const alloc = env.monthly_allocation_cents
        totalAllocation += alloc
        totalSpent += spent
        const pct = alloc > 0 ? Math.round((spent / alloc) * 100) : 0
        const status = alloc > 0 ? (pct > 100 ? ' OVER' : ` (${pct}%)`) : ''
        lines.push(`${env.name}: ${formatCents(spent)}${alloc > 0 ? ` / ${formatCents(alloc)}${status}` : ''}`)
      }

      lines.push('')
      lines.push(`Total allocated: ${formatCents(totalAllocation)}`)
      lines.push(`Total spent (in envelopes): ${formatCents(totalSpent)}`)
      if (unassigned > 0) {
        lines.push(`Unassigned spending: ${formatCents(unassigned)}`)
      }

      return lines.join('\n')
    },
  }),

  getBusinessExpenses: tool({
    description:
      'Scan personal Up Bank transactions against business expense rules to identify payments that should be business expenses through the PTY LTD (e.g. GitHub, Supabase, Vercel, Google, Shopify, etc.). Returns total reclaimable amount and top merchants.',
    parameters: z.object({
      months: z
        .number()
        .describe('Number of months to scan (default 3)')
        .optional(),
    }),
    execute: async ({ months: monthCount }) => {
      const m = monthCount ?? 3
      const supabase = await createClient()

      const now = new Date()
      const endDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - m)

      // Fetch rules
      const { data: rules } = await supabase
        .from('business_expense_rules')
        .select('pattern, merchant_name, category')
        .eq('is_active', true)

      if (!rules || rules.length === 0) return 'No business expense rules configured.'

      // Fetch debits
      const { data: transactions, error } = await supabase
        .from('up_transactions')
        .select('up_id, description, amount_cents')
        .gte('settled_at', startDate.toISOString())
        .lt('settled_at', endDate.toISOString())
        .eq('status', 'SETTLED')
        .lt('amount_cents', 0)

      if (error) return `Error: ${error.message}`

      // Fetch flags
      const { data: flags } = await supabase
        .from('business_expense_flags')
        .select('transaction_up_id, is_business')

      const flaggedBusiness = new Set(
        (flags ?? []).filter(f => f.is_business).map(f => f.transaction_up_id)
      )
      const flaggedNotBusiness = new Set(
        (flags ?? []).filter(f => !f.is_business).map(f => f.transaction_up_id)
      )

      // Match
      const merchantTotals = new Map<string, { cents: number; count: number; category: string }>()
      let totalCents = 0

      for (const t of transactions ?? []) {
        if (flaggedNotBusiness.has(t.up_id)) continue

        const upper = t.description.toUpperCase()
        let matched = false
        let matchedMerchant = ''
        let matchedCategory = ''

        if (flaggedBusiness.has(t.up_id)) {
          matched = true
          matchedMerchant = 'Manual flag'
          matchedCategory = 'Manual'
        } else {
          for (const rule of rules) {
            const parts = rule.pattern.replace(/%/g, '').split(/\s+/)
            if (parts.every((part: string) => upper.includes(part.toUpperCase()))) {
              matched = true
              matchedMerchant = rule.merchant_name
              matchedCategory = rule.category
              break
            }
          }
        }

        if (matched) {
          const absCents = Math.abs(t.amount_cents)
          totalCents += absCents
          const existing = merchantTotals.get(matchedMerchant) ?? { cents: 0, count: 0, category: matchedCategory }
          existing.cents += absCents
          existing.count += 1
          merchantTotals.set(matchedMerchant, existing)
        }
      }

      if (totalCents === 0) return 'No business expenses identified in the period.'

      const sorted = Array.from(merchantTotals.entries())
        .sort((a, b) => b[1].cents - a[1].cents)

      const monthlyAvg = Math.round(totalCents / m)

      const lines = [
        `Business expenses identified (last ${m} months):`,
        '',
        ...sorted.map(([merchant, { cents, count, category }]) =>
          `${merchant} (${category}): ${formatCents(cents)} (${count} txns, ~${formatCents(Math.round(cents / m))}/mo)`
        ),
        '',
        `Total: ${formatCents(totalCents)} over ${m} months`,
        `Monthly average: ${formatCents(monthlyAvg)}`,
        `Annual projection: ${formatCents(monthlyAvg * 12)}`,
        '',
        `These could be reimbursed by BLACK HEALTH INTELLI PTY LTD, increasing personal surplus by ~${formatCents(monthlyAvg)}/month.`,
      ]

      return lines.join('\n')
    },
  }),

}
