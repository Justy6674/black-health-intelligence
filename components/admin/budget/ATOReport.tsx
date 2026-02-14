'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDollars } from './shared'

interface ATOReportData {
  period: { from: string; to: string; months: number }
  income: {
    justin: { weekly: number; monthly: number; annual: number }
    bec: { weekly: number; monthly: number; annual: number }
    totalMonthly: number
    totalAnnual: number
  }
  expenses: {
    categories: Array<{ name: string; monthlyAverage: number }>
    totalMonthly: number
  }
  businessExpenses: {
    totalMonthly: number
    categories: Array<{ category: string; monthlyAverage: number }>
  }
  debts?: {
    totalBalanceCents: number
    totalMinPaymentsCents: number
    count: number
  }
  summary: {
    monthlyIncome: number
    monthlyExpenses: number
    businessExpenseSavings: number
    monthlySurplus: number
    weeklySurplus: number
  }
}

export default function ATOReport() {
  const [data, setData] = useState<ATOReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState(3)
  const [debtAmount, setDebtAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const fmtDollars = (cents: number) => {
    const abs = Math.abs(cents)
    const sign = cents < 0 ? '-' : ''
    return `${sign}$${(abs / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const copyReportToClipboard = useCallback(async () => {
    if (!data) return
    const lines: string[] = [
      'STATEMENT OF FINANCIAL POSITION',
      `Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      `Period: ${data.period.months}-month average (${data.period.from} to ${data.period.to})`,
      '='.repeat(60),
      '',
      'INCOME',
      `Justin (BLACK HEALTH INTELLI PTY LTD): ${fmtDollars(data.income.justin.weekly)}/wk | ${fmtDollars(data.income.justin.monthly)}/mo | ${fmtDollars(data.income.justin.annual)}/yr`,
      `Bec (BLACK HEALTH INTELLI PTY LTD):    ${fmtDollars(data.income.bec.weekly)}/wk | ${fmtDollars(data.income.bec.monthly)}/mo | ${fmtDollars(data.income.bec.annual)}/yr`,
      `Total Household Income:                ${fmtDollars(data.income.totalMonthly)}/mo | ${fmtDollars(data.income.totalAnnual)}/yr`,
      '',
      'MONTHLY EXPENSES (Average)',
      ...data.expenses.categories.map(c => `  ${c.name}: ${fmtDollars(c.monthlyAverage)}`),
      `  TOTAL: ${fmtDollars(data.expenses.totalMonthly)}`,
    ]

    if (data.businessExpenses.totalMonthly > 0) {
      lines.push('', 'BUSINESS EXPENSES (Reclaimable from PTY LTD)')
      for (const c of data.businessExpenses.categories) {
        lines.push(`  ${c.category}: ${fmtDollars(c.monthlyAverage)}`)
      }
      lines.push(`  TOTAL RECLAIMABLE: ${fmtDollars(data.businessExpenses.totalMonthly)}`)
    }

    if (data.debts && data.debts.count > 0) {
      lines.push('', 'OUTSTANDING DEBTS')
      lines.push(`  Total Debt Balance: ${fmtDollars(data.debts.totalBalanceCents)}`)
      lines.push(`  Total Min Payments (monthly): ${fmtDollars(data.debts.totalMinPaymentsCents)}`)
      lines.push(`  Number of Debts: ${data.debts.count}`)
    }

    lines.push(
      '', 'SUMMARY',
      `  Monthly Income:              ${fmtDollars(data.summary.monthlyIncome)}`,
      `  Monthly Expenses:           -${fmtDollars(data.summary.monthlyExpenses)}`,
    )
    if (data.summary.businessExpenseSavings > 0) {
      lines.push(`  Business Expense Savings:   +${fmtDollars(data.summary.businessExpenseSavings)}`)
    }
    lines.push(
      `  Monthly Surplus:             ${fmtDollars(data.summary.monthlySurplus)}`,
      `  Weekly Surplus:              ${fmtDollars(data.summary.weeklySurplus)}`,
    )

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [data])

  const downloadReport = useCallback(() => {
    if (!data) return
    // Trigger copy first to build the text, then download
    const lines: string[] = [
      'STATEMENT OF FINANCIAL POSITION',
      `Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      `Period: ${data.period.months}-month average (${data.period.from} to ${data.period.to})`,
      '='.repeat(60),
      '',
      'INCOME',
      `Justin (BLACK HEALTH INTELLI PTY LTD): ${fmtDollars(data.income.justin.weekly)}/wk | ${fmtDollars(data.income.justin.monthly)}/mo | ${fmtDollars(data.income.justin.annual)}/yr`,
      `Bec (BLACK HEALTH INTELLI PTY LTD):    ${fmtDollars(data.income.bec.weekly)}/wk | ${fmtDollars(data.income.bec.monthly)}/mo | ${fmtDollars(data.income.bec.annual)}/yr`,
      `Total Household Income:                ${fmtDollars(data.income.totalMonthly)}/mo | ${fmtDollars(data.income.totalAnnual)}/yr`,
      '',
      'MONTHLY EXPENSES (Average)',
      ...data.expenses.categories.map(c => `  ${c.name}: ${fmtDollars(c.monthlyAverage)}`),
      `  TOTAL: ${fmtDollars(data.expenses.totalMonthly)}`,
    ]

    if (data.businessExpenses.totalMonthly > 0) {
      lines.push('', 'BUSINESS EXPENSES (Reclaimable from PTY LTD)')
      for (const c of data.businessExpenses.categories) {
        lines.push(`  ${c.category}: ${fmtDollars(c.monthlyAverage)}`)
      }
      lines.push(`  TOTAL RECLAIMABLE: ${fmtDollars(data.businessExpenses.totalMonthly)}`)
    }

    if (data.debts && data.debts.count > 0) {
      lines.push('', 'OUTSTANDING DEBTS')
      lines.push(`  Total Debt Balance: ${fmtDollars(data.debts.totalBalanceCents)}`)
      lines.push(`  Total Min Payments (monthly): ${fmtDollars(data.debts.totalMinPaymentsCents)}`)
      lines.push(`  Number of Debts: ${data.debts.count}`)
    }

    lines.push(
      '', 'SUMMARY',
      `  Monthly Income:              ${fmtDollars(data.summary.monthlyIncome)}`,
      `  Monthly Expenses:           -${fmtDollars(data.summary.monthlyExpenses)}`,
    )
    if (data.summary.businessExpenseSavings > 0) {
      lines.push(`  Business Expense Savings:   +${fmtDollars(data.summary.businessExpenseSavings)}`)
    }
    lines.push(
      `  Monthly Surplus:             ${fmtDollars(data.summary.monthlySurplus)}`,
      `  Weekly Surplus:              ${fmtDollars(data.summary.weeklySurplus)}`,
    )

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ato-financial-statement-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  const fetchReport = useCallback(async (m: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/budget/ato-report?months=${m}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch report')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport(months)
  }, [months, fetchReport])

  if (loading) {
    return <div className="card"><p className="text-silver-400">Loading report&hellip;</p></div>
  }

  if (error) {
    return (
      <div className="card border-red-500/50 bg-red-900/20">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const debtCents = parseFloat(debtAmount) * 100 || 0

  return (
    <div ref={reportRef} className="space-y-6 print:space-y-4">
      {/* Controls (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <label className="text-silver-400 text-sm">Average over:</label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value, 10))}
            className="bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
          >
            {[1, 2, 3, 6, 12].map(m => (
              <option key={m} value={m}>{m} month{m !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyReportToClipboard}
            className="px-4 py-2 bg-charcoal border border-silver-700/30 text-silver-300 rounded hover:bg-silver-700/20 text-sm font-medium transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-charcoal border border-silver-700/30 text-silver-300 rounded hover:bg-silver-700/20 text-sm font-medium transition-colors"
          >
            Download .txt
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-blue text-white rounded hover:bg-slate-blue/80 text-sm font-medium"
          >
            Print
          </button>
        </div>
      </div>

      {/* Report header */}
      <div className="card print:border-0 print:shadow-none">
        <h2 className="text-xl font-bold text-white mb-1 print:text-black">
          Statement of Financial Position
        </h2>
        <p className="text-silver-400 text-sm print:text-gray-600">
          Based on {data.period.months}-month average ({data.period.from} to {data.period.to})
        </p>
      </div>

      {/* Income section */}
      <div className="card print:border-0 print:shadow-none">
        <h3 className="text-lg font-semibold text-white mb-4 print:text-black">Income</h3>
        <table className="w-full text-sm">
          <thead className="text-silver-400 text-xs border-b border-silver-700/30 print:text-gray-500 print:border-gray-300">
            <tr>
              <th className="text-left py-2">Source</th>
              <th className="text-right py-2">Weekly</th>
              <th className="text-right py-2">Monthly</th>
              <th className="text-right py-2">Annual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-700/20 print:divide-gray-200">
            <tr>
              <td className="py-2 text-white print:text-black">Justin (BLACK HEALTH INTELLI PTY LTD)</td>
              <td className="py-2 text-right text-white font-mono print:text-black">{formatDollars(data.income.justin.weekly)}</td>
              <td className="py-2 text-right text-white font-mono print:text-black">{formatDollars(data.income.justin.monthly)}</td>
              <td className="py-2 text-right text-white font-mono print:text-black">{formatDollars(data.income.justin.annual)}</td>
            </tr>
            <tr>
              <td className="py-2 text-white print:text-black">Bec (BLACK HEALTH INTELLI PTY LTD)</td>
              <td className="py-2 text-right text-white font-mono print:text-black">{formatDollars(data.income.bec.weekly)}</td>
              <td className="py-2 text-right text-white font-mono print:text-black">{formatDollars(data.income.bec.monthly)}</td>
              <td className="py-2 text-right text-white font-mono print:text-black">{formatDollars(data.income.bec.annual)}</td>
            </tr>
            <tr className="font-semibold border-t-2 border-silver-600/50 print:border-gray-400">
              <td className="py-2 text-white print:text-black">Total Household Income</td>
              <td className="py-2 text-right text-emerald-400 font-mono print:text-green-700">
                {formatDollars(data.income.justin.weekly + data.income.bec.weekly)}
              </td>
              <td className="py-2 text-right text-emerald-400 font-mono print:text-green-700">
                {formatDollars(data.income.totalMonthly)}
              </td>
              <td className="py-2 text-right text-emerald-400 font-mono print:text-green-700">
                {formatDollars(data.income.totalAnnual)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expenses section */}
      <div className="card print:border-0 print:shadow-none">
        <h3 className="text-lg font-semibold text-white mb-4 print:text-black">Monthly Expenses (Average)</h3>
        <table className="w-full text-sm">
          <thead className="text-silver-400 text-xs border-b border-silver-700/30 print:text-gray-500 print:border-gray-300">
            <tr>
              <th className="text-left py-2">Category</th>
              <th className="text-right py-2">Monthly Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-700/20 print:divide-gray-200">
            {data.expenses.categories.map((cat) => (
              <tr key={cat.name}>
                <td className="py-2 text-white print:text-black">{cat.name}</td>
                <td className="py-2 text-right text-red-400 font-mono print:text-red-700">
                  {formatDollars(cat.monthlyAverage)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold border-t-2 border-silver-600/50 print:border-gray-400">
              <td className="py-2 text-white print:text-black">Total Monthly Expenses</td>
              <td className="py-2 text-right text-red-400 font-mono print:text-red-700">
                {formatDollars(data.expenses.totalMonthly)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Business expense savings */}
      {data.businessExpenses.totalMonthly > 0 && (
        <div className="card border-amber-700/30 print:border-0 print:shadow-none">
          <h3 className="text-lg font-semibold text-white mb-4 print:text-black">
            Business Expenses (Reclaimable from PTY LTD)
          </h3>
          <table className="w-full text-sm">
            <thead className="text-silver-400 text-xs border-b border-silver-700/30 print:text-gray-500 print:border-gray-300">
              <tr>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Monthly Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-700/20 print:divide-gray-200">
              {data.businessExpenses.categories.map((cat) => (
                <tr key={cat.category}>
                  <td className="py-2 text-white print:text-black">{cat.category}</td>
                  <td className="py-2 text-right text-amber-400 font-mono print:text-amber-700">
                    {formatDollars(cat.monthlyAverage)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold border-t-2 border-silver-600/50 print:border-gray-400">
                <td className="py-2 text-white print:text-black">Total Reclaimable</td>
                <td className="py-2 text-right text-amber-400 font-mono print:text-amber-700">
                  {formatDollars(data.businessExpenses.totalMonthly)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Debt position */}
      {data.debts && data.debts.count > 0 && (
        <div className="card border-purple-700/30 print:border-0 print:shadow-none">
          <h3 className="text-lg font-semibold text-white mb-4 print:text-black">
            Outstanding Debts
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-silver-300 print:text-gray-600">Total Debt Balance</span>
              <span className="text-purple-400 font-mono font-semibold print:text-purple-700">
                {formatDollars(data.debts.totalBalanceCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-silver-300 print:text-gray-600">Total Minimum Payments (monthly)</span>
              <span className="text-purple-400 font-mono print:text-purple-700">
                {formatDollars(data.debts.totalMinPaymentsCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-silver-300 print:text-gray-600">Number of Debts</span>
              <span className="text-white font-mono print:text-black">{data.debts.count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="card border-emerald-700/30 print:border-0 print:shadow-none">
        <h3 className="text-lg font-semibold text-white mb-4 print:text-black">Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-silver-300 print:text-gray-600">Monthly Income</span>
            <span className="text-emerald-400 font-mono font-semibold print:text-green-700">
              {formatDollars(data.summary.monthlyIncome)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-silver-300 print:text-gray-600">Monthly Expenses</span>
            <span className="text-red-400 font-mono font-semibold print:text-red-700">
              -{formatDollars(data.summary.monthlyExpenses)}
            </span>
          </div>
          {data.summary.businessExpenseSavings > 0 && (
            <div className="flex justify-between">
              <span className="text-silver-300 print:text-gray-600">Business Expense Savings</span>
              <span className="text-amber-400 font-mono font-semibold print:text-amber-700">
                +{formatDollars(data.summary.businessExpenseSavings)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t-2 border-silver-600/50 print:border-gray-400">
            <span className="text-white font-semibold print:text-black">Monthly Surplus</span>
            <span className={`font-mono font-bold text-lg ${
              data.summary.monthlySurplus >= 0 ? 'text-emerald-400 print:text-green-700' : 'text-red-400 print:text-red-700'
            }`}>
              {formatDollars(data.summary.monthlySurplus)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-silver-400 print:text-gray-500">Weekly Surplus</span>
            <span className={`font-mono font-semibold ${
              data.summary.weeklySurplus >= 0 ? 'text-emerald-400 print:text-green-700' : 'text-red-400 print:text-red-700'
            }`}>
              {formatDollars(data.summary.weeklySurplus)}
            </span>
          </div>
        </div>
      </div>

      {/* Proposed ATO Repayment Calculator */}
      <div className="card print:border-0 print:shadow-none">
        <h3 className="text-lg font-semibold text-white mb-4 print:text-black">
          Proposed ATO Repayment Plan
        </h3>
        <div className="mb-4 print:hidden">
          <label className="text-silver-400 text-sm block mb-1">ATO Debt Amount ($)</label>
          <input
            type="number"
            value={debtAmount}
            onChange={(e) => setDebtAmount(e.target.value)}
            placeholder="e.g. 25000"
            className="bg-charcoal border border-silver-700/30 rounded px-4 py-2 text-white w-48 font-mono"
          />
        </div>
        {debtCents > 0 && data.summary.monthlySurplus > 0 && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-silver-300 print:text-gray-600">Total Debt</span>
              <span className="text-white font-mono font-semibold print:text-black">{formatDollars(debtCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-silver-300 print:text-gray-600">Available Monthly Surplus</span>
              <span className="text-emerald-400 font-mono print:text-green-700">{formatDollars(data.summary.monthlySurplus)}</span>
            </div>
            <div className="pt-3 border-t border-silver-700/30 space-y-2 print:border-gray-300">
              <p className="text-silver-400 text-xs mb-2 print:text-gray-500">Repayment options (interest-free):</p>
              {[
                { label: 'Weekly', amount: Math.round(data.summary.monthlySurplus * 12 / 52), months: Math.ceil(debtCents / data.summary.monthlySurplus) },
                { label: 'Fortnightly', amount: Math.round(data.summary.monthlySurplus * 12 / 26), months: Math.ceil(debtCents / data.summary.monthlySurplus) },
                { label: 'Monthly', amount: data.summary.monthlySurplus, months: Math.ceil(debtCents / data.summary.monthlySurplus) },
              ].map(opt => (
                <div key={opt.label} className="flex justify-between">
                  <span className="text-white print:text-black">{opt.label}</span>
                  <span className="text-white font-mono print:text-black">
                    {formatDollars(opt.amount)} ({opt.months} months to repay)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {debtCents > 0 && data.summary.monthlySurplus <= 0 && (
          <p className="text-red-400 text-sm">
            No surplus available for repayments. Review expenses to free up funds.
          </p>
        )}
      </div>
    </div>
  )
}
