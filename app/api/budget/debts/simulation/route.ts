import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/xero/auth'
import { createClient } from '@/lib/supabase/server'

interface Debt {
  lender: string
  balanceCents: number
  monthlyRate: number
  minPaymentCents: number
}

interface PayoffEntry {
  lender: string
  month: number
  totalPaid: number
}

interface MonthlyBreakdown {
  month: number
  payments: Array<{ lender: string; payment: number; interest: number; balance: number }>
  totalBalance: number
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const strategy = (url.searchParams.get('strategy') ?? 'avalanche') as 'snowball' | 'avalanche'
  const extraCents = parseInt(url.searchParams.get('extraCents') ?? '0', 10) || 0

  const supabase = await createClient()
  const { data: rawDebts, error } = await supabase
    .from('debts')
    .select('*')
    .eq('is_active', true)
    .gt('balance_cents', 0)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rawDebts || rawDebts.length === 0) {
    return NextResponse.json({
      strategy,
      totalMonths: 0,
      totalInterestPaid: 0,
      payoffOrder: [],
      monthlyBreakdown: [],
    })
  }

  // Normalise all debts to monthly
  const debts: Debt[] = rawDebts.map(d => {
    // Convert min payment to monthly
    let minMonthly = d.min_payment_cents
    if (d.payment_frequency === 'weekly') minMonthly = Math.round(d.min_payment_cents * (52 / 12))
    else if (d.payment_frequency === 'fortnightly') minMonthly = Math.round(d.min_payment_cents * (26 / 12))

    // Monthly interest rate
    let monthlyRate = 0
    if (d.interest_rate > 0) {
      if (d.compounding === 'daily') {
        // Daily compounding: (1 + r/365)^30.44 - 1
        monthlyRate = Math.pow(1 + d.interest_rate / 100 / 365, 30.44) - 1
      } else {
        // Monthly compounding: r/12
        monthlyRate = d.interest_rate / 100 / 12
      }
    }

    return {
      lender: d.lender,
      balanceCents: d.balance_cents,
      monthlyRate,
      minPaymentCents: minMonthly,
    }
  })

  // Simulate payoff
  const balances = debts.map(d => d.balanceCents)
  const totalPaid = debts.map(() => 0)
  let totalInterestPaid = 0
  const payoffOrder: PayoffEntry[] = []
  const monthlyBreakdown: MonthlyBreakdown[] = []
  const MAX_MONTHS = 600 // 50-year safety limit

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const monthPayments: MonthlyBreakdown['payments'] = []

    // 1. Apply interest
    for (let i = 0; i < debts.length; i++) {
      if (balances[i] <= 0) continue
      const interest = Math.round(balances[i] * debts[i].monthlyRate)
      balances[i] += interest
      totalInterestPaid += interest
    }

    // 2. Pay minimums
    for (let i = 0; i < debts.length; i++) {
      if (balances[i] <= 0) continue
      const payment = Math.min(debts[i].minPaymentCents, balances[i])
      balances[i] -= payment
      totalPaid[i] += payment
    }

    // 3. Apply extra to target debt
    let remaining = extraCents
    if (remaining > 0) {
      // Sort active debt indices by strategy
      const activeIndices = debts
        .map((_, i) => i)
        .filter(i => balances[i] > 0)

      if (strategy === 'snowball') {
        activeIndices.sort((a, b) => balances[a] - balances[b])
      } else {
        activeIndices.sort((a, b) => debts[b].monthlyRate - debts[a].monthlyRate)
      }

      for (const i of activeIndices) {
        if (remaining <= 0) break
        const payment = Math.min(remaining, balances[i])
        balances[i] -= payment
        totalPaid[i] += payment
        remaining -= payment
      }

      // Freed-up minimums from paid-off debts go to next target
      for (const i of activeIndices) {
        if (balances[i] > 0) continue
        // This debt just got paid off, add its minimum to remaining
        remaining += debts[i].minPaymentCents
      }

      // Apply freed-up minimums
      if (remaining > 0) {
        const stillActive = activeIndices.filter(i => balances[i] > 0)
        for (const i of stillActive) {
          if (remaining <= 0) break
          const payment = Math.min(remaining, balances[i])
          balances[i] -= payment
          totalPaid[i] += payment
          remaining -= payment
        }
      }
    }

    // Record payments
    for (let i = 0; i < debts.length; i++) {
      monthPayments.push({
        lender: debts[i].lender,
        payment: totalPaid[i],
        interest: Math.round(balances[i] * debts[i].monthlyRate),
        balance: Math.max(0, balances[i]),
      })
    }

    const totalBalance = balances.reduce((s, b) => s + Math.max(0, b), 0)
    monthlyBreakdown.push({ month, payments: monthPayments, totalBalance })

    // Check for newly paid-off debts
    for (let i = 0; i < debts.length; i++) {
      if (balances[i] <= 0 && !payoffOrder.find(p => p.lender === debts[i].lender)) {
        payoffOrder.push({ lender: debts[i].lender, month, totalPaid: totalPaid[i] })
      }
    }

    // All debts paid off?
    if (totalBalance <= 0) {
      return NextResponse.json({
        strategy,
        totalMonths: month,
        totalInterestPaid,
        payoffOrder,
        monthlyBreakdown: monthlyBreakdown.slice(0, 24), // Only return first 24 months
      })
    }
  }

  // Hit max months
  return NextResponse.json({
    strategy,
    totalMonths: MAX_MONTHS,
    totalInterestPaid,
    payoffOrder,
    monthlyBreakdown: monthlyBreakdown.slice(0, 24),
  })
}
