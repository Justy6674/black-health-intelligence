'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import Link from 'next/link'
import type { UpAccountRow, UpTransactionRow, CategorySpend } from '@/lib/up/types'

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(abs / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1)
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type Tab = 'overview' | 'ato-report' | 'business-expenses' | 'assistant'

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'ato-report', label: 'ATO Report' },
  { key: 'business-expenses', label: 'Business Expenses' },
  { key: 'assistant', label: 'AI Assistant' },
]

// ── Main page ──

export default function BudgetPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get('tab') as Tab) || 'overview'

  const setTab = (tab: Tab) => {
    router.replace(`/admin/budget${tab === 'overview' ? '' : `?tab=${tab}`}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          &larr; Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Budget</h1>
          <p className="text-silver-400 text-sm">Up Bank spending overview</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-silver-700/30 overflow-x-auto">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-slate-blue/20 text-white border border-silver-700/30 border-b-transparent -mb-px'
                : 'bg-charcoal/50 text-silver-400 hover:text-white border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <BudgetOverview />}
      {activeTab === 'ato-report' && <ATOReport />}
      {activeTab === 'business-expenses' && <BusinessExpenses />}
      {activeTab === 'assistant' && <BudgetAssistant />}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ── ATO Report (Statement of Financial Position) ──
// ══════════════════════════════════════════════════════

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
  summary: {
    monthlyIncome: number
    monthlyExpenses: number
    businessExpenseSavings: number
    monthlySurplus: number
    weeklySurplus: number
  }
}

function ATOReport() {
  const [data, setData] = useState<ATOReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState(3)
  const [debtAmount, setDebtAmount] = useState('')

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
    <div className="space-y-6 print:space-y-4">
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
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-blue text-white rounded hover:bg-slate-blue/80 text-sm font-medium"
        >
          Print Report
        </button>
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

// ══════════════════════════════════════════════════════
// ── Business Expenses ──
// ══════════════════════════════════════════════════════

interface BusinessExpenseRule {
  id: string
  pattern: string
  merchant_name: string
  category: string
  is_active: boolean
}

interface MatchedTransaction {
  upId: string
  description: string
  amountCents: number
  settledAt: string | null
  matchedRule: string | null
  matchedCategory: string | null
  isBusiness: boolean
  flagOverride: boolean
  notes: string | null
}

interface BusinessExpensesData {
  period: { from: string; to: string }
  rules: BusinessExpenseRule[]
  transactions: MatchedTransaction[]
  summary: {
    totalIdentifiedCents: number
    transactionCount: number
    categories: Array<{ category: string; totalCents: number }>
  }
}

function BusinessExpenses() {
  const [data, setData] = useState<BusinessExpensesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flagging, setFlagging] = useState<string | null>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState({ pattern: '', merchant_name: '', category: 'Software' })
  const [addingRule, setAddingRule] = useState(false)

  const currentYear = new Date().getFullYear()
  const from = `${currentYear}-01-01`
  const to = new Date().toISOString().slice(0, 10)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/budget/business-expenses?from=${from}&to=${to}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch data')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFlag = async (upId: string, isBusiness: boolean) => {
    setFlagging(upId)
    try {
      await fetch('/api/budget/business-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionUpId: upId, isBusiness }),
      })
      await fetchData()
    } catch {
      // silent
    } finally {
      setFlagging(null)
    }
  }

  const handleAddRule = async () => {
    if (!newRule.pattern || !newRule.merchant_name) return
    setAddingRule(true)
    try {
      // Use the Supabase client via a simple POST (we'll add the rule directly)
      const res = await fetch('/api/budget/business-expenses/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      })
      if (res.ok) {
        setNewRule({ pattern: '', merchant_name: '', category: 'Software' })
        setShowAddRule(false)
        await fetchData()
      }
    } catch {
      // silent
    } finally {
      setAddingRule(false)
    }
  }

  if (loading) {
    return <div className="card"><p className="text-silver-400">Loading business expenses&hellip;</p></div>
  }

  if (error) {
    return (
      <div className="card border-red-500/50 bg-red-900/20">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border-amber-700/30">
          <div className="text-silver-400 text-xs mb-1">YTD Identified</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {formatDollars(data.summary.totalIdentifiedCents)}
          </div>
          <div className="text-silver-500 text-xs mt-1">{data.summary.transactionCount} transactions</div>
        </div>
        {data.summary.categories.map((cat) => (
          <div key={cat.category} className="card">
            <div className="text-silver-400 text-xs mb-1">{cat.category}</div>
            <div className="text-lg font-bold text-white font-mono">
              {formatDollars(cat.totalCents)}
            </div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Matching Rules ({data.rules.length})
          </h2>
          <button
            onClick={() => setShowAddRule(!showAddRule)}
            className="px-3 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-600 transition-colors"
          >
            {showAddRule ? 'Cancel' : 'Add Rule'}
          </button>
        </div>

        {showAddRule && (
          <div className="mb-4 p-3 bg-charcoal/50 rounded border border-silver-700/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-silver-400 text-xs block mb-1">ILIKE Pattern</label>
                <input
                  type="text"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule(prev => ({ ...prev, pattern: e.target.value }))}
                  placeholder="%PATTERN%"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Merchant Name</label>
                <input
                  type="text"
                  value={newRule.merchant_name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, merchant_name: e.target.value }))}
                  placeholder="e.g. Netlify"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Category</label>
                <select
                  value={newRule.category}
                  onChange={(e) => setNewRule(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                >
                  {['Software', 'Marketing', 'Insurance', 'Utilities', 'General'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleAddRule}
              disabled={addingRule || !newRule.pattern || !newRule.merchant_name}
              className="mt-3 px-4 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {addingRule ? 'Adding\u2026' : 'Add Rule'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {data.rules.map((rule) => (
            <span
              key={rule.id}
              className={`inline-block px-2.5 py-1 text-xs rounded border ${
                rule.is_active
                  ? 'bg-slate-blue/20 text-white border-silver-700/30'
                  : 'bg-charcoal/30 text-silver-500 border-silver-700/10 line-through'
              }`}
            >
              {rule.merchant_name}
              <span className="text-silver-500 ml-1">({rule.category})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Transaction matches */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">
          Matched Transactions ({data.transactions.length})
        </h2>
        {data.transactions.length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-silver-400 text-xs border-b border-silver-700/30 sticky top-0 bg-deep-black">
                <tr>
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-left py-2 pr-3">Description</th>
                  <th className="text-right py-2 pr-3">Amount</th>
                  <th className="text-left py-2 pr-3">Matched Rule</th>
                  <th className="text-center py-2">Business?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-700/20">
                {data.transactions.map((txn) => (
                  <tr key={txn.upId} className="hover:bg-charcoal/30 transition-colors">
                    <td className="py-2 pr-3 text-silver-400 whitespace-nowrap">
                      {txn.settledAt
                        ? new Date(txn.settledAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                        : ''}
                    </td>
                    <td className="py-2 pr-3 text-white truncate max-w-[250px]">{txn.description}</td>
                    <td className="py-2 pr-3 text-right text-red-400 font-mono whitespace-nowrap">
                      {formatCents(txn.amountCents)}
                    </td>
                    <td className="py-2 pr-3">
                      {txn.matchedRule ? (
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-silver-700/30 text-silver-300 border border-silver-700/20">
                          {txn.matchedRule}
                        </span>
                      ) : (
                        <span className="text-silver-600 text-xs">manual</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => handleFlag(txn.upId, !txn.isBusiness)}
                        disabled={flagging === txn.upId}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          txn.isBusiness
                            ? 'bg-emerald-700/30 text-emerald-400 hover:bg-red-700/30 hover:text-red-400'
                            : 'bg-red-700/30 text-red-400 hover:bg-emerald-700/30 hover:text-emerald-400'
                        } disabled:opacity-50`}
                      >
                        {flagging === txn.upId ? '\u2026' : txn.isBusiness ? 'Yes' : 'No'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-silver-400 text-sm">No matching transactions found for {currentYear}.</p>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ── Budget Overview (existing content) ──
// ══════════════════════════════════════════════════════

function BudgetOverview() {
  const [month, setMonth] = useState(currentMonth)
  const [accounts, setAccounts] = useState<UpAccountRow[]>([])
  const [categories, setCategories] = useState<CategorySpend[]>([])
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchData = useCallback(async (m: string) => {
    setLoading(true)
    setError('')
    try {
      const [accRes, catRes, txnRes] = await Promise.all([
        fetch('/api/budget/accounts'),
        fetch(`/api/budget/categories?month=${m}`),
        fetch(`/api/budget/transactions?month=${m}`),
      ])

      if (!accRes.ok || !catRes.ok || !txnRes.ok) {
        const errData = await (accRes.ok ? catRes.ok ? txnRes : catRes : accRes).json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch data')
      }

      const [accData, catData, txnData] = await Promise.all([
        accRes.json(),
        catRes.json(),
        txnRes.json(),
      ])

      setAccounts(accData)
      setCategories(catData)
      setTransactions(txnData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(month)
  }, [month, fetchData])

  // Load last synced from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('up_last_synced')
    if (saved) setLastSynced(saved)
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    try {
      const res = await fetch('/api/budget/sync', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Sync failed (${res.status})`)
      }
      const data = await res.json()
      const ts = data.syncedAt
      setLastSynced(ts)
      localStorage.setItem('up_last_synced', ts)
      await fetchData(month)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleMonthChange = (delta: number) => {
    setMonth((prev) => shiftMonth(prev, delta))
  }

  const totalSpent = categories.reduce((sum, c) => sum + c.totalSpentCents, 0)
  const totalBudget = categories.reduce((sum, c) => sum + (c.monthlyLimitCents ?? 0), 0)

  return (
    <>
      {/* Sync bar */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-silver-400 text-sm">
          {lastSynced && (
            <span>
              Last synced {new Date(lastSynced).toLocaleString('en-AU')}
            </span>
          )}
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {syncing ? 'Syncing\u2026' : 'Sync'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Account balances */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {accounts.map((account) => (
            <AccountCard key={account.up_id} account={account} />
          ))}
        </div>
      )}

      {/* Month picker */}
      <MonthPicker month={month} onChange={handleMonthChange} />

      {/* Summary bar */}
      {categories.length > 0 && (
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-silver-400">Total spent: </span>
              <span className="text-white font-semibold">{formatCents(totalSpent)}</span>
            </div>
            {totalBudget > 0 && (
              <div>
                <span className="text-silver-400">Total budget: </span>
                <span className="text-white font-semibold">{formatCents(totalBudget)}</span>
              </div>
            )}
            <div>
              <span className="text-silver-400">Categories: </span>
              <span className="text-white font-semibold">{categories.length}</span>
            </div>
            <div>
              <span className="text-silver-400">Transactions: </span>
              <span className="text-white font-semibold">{transactions.length}</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="text-silver-400">Loading&hellip;</p>
        </div>
      ) : (
        <>
          {/* Category budget grid */}
          {categories.length > 0 ? (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Spending by Category</h2>
              <div className="space-y-3">
                {categories.map((cat) => (
                  <CategoryBudgetRow
                    key={cat.effectiveId}
                    category={cat}
                    onLimitChange={(newLimit) => handleLimitChange(cat.effectiveId, newLimit)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="card mb-6">
              <p className="text-silver-400">No spending data for {formatMonthLabel(month)}</p>
            </div>
          )}

          {/* Transaction list */}
          {transactions.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">
                Transactions ({transactions.length})
              </h2>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-silver-400 text-xs border-b border-silver-700/30 sticky top-0 bg-deep-black">
                    <tr>
                      <th className="text-left py-2 pr-3">Date</th>
                      <th className="text-left py-2 pr-3">Description</th>
                      <th className="text-right py-2 pr-3">Amount</th>
                      <th className="text-left py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-silver-700/20">
                    {transactions.map((txn) => (
                      <TransactionRow key={txn.up_id} transaction={txn} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════
// ── Budget AI Assistant ──
// ══════════════════════════════════════════════════════

function BudgetAssistant() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/budget/assistant',
  })

  return (
    <div className="card">
      <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-silver-400 text-sm">
            Try: &quot;What did I spend the most on this month?&quot; &bull; &quot;Am I over budget on dining?&quot; &bull;
            &quot;Compare my spending to last month&quot; &bull; &quot;What are my account balances?&quot; &bull;
            &quot;Show me all Uber charges&quot; &bull; &quot;What&apos;s my monthly surplus?&quot; &bull;
            &quot;What business expenses am I paying personally?&quot;
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.role === 'user' ? 'bg-slate-blue/20 text-white ml-8' : 'bg-charcoal/50 text-silver-300'
            }`}
          >
            <div className="text-xs font-medium text-silver-500 mb-1">
              {m.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="text-sm whitespace-pre-wrap">
              {m.parts
                ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p, i) => (
                  <span key={i}>{p.text}</span>
                ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your spending, budgets, or transactions..."
            disabled={status !== 'ready'}
            className="flex-1 bg-charcoal border border-silver-700/30 rounded px-4 py-2 text-white placeholder-silver-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status !== 'ready'}
            className="px-4 py-2 bg-slate-blue text-white rounded hover:bg-slate-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'streaming' || status === 'submitted' ? '\u2026' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ── Shared sub-components ──
// ══════════════════════════════════════════════════════

async function handleLimitChange(categoryUpId: string, limitDollars: number | null) {
  if (limitDollars === null) return
  const cents = Math.round(limitDollars * 100)
  try {
    await fetch('/api/budget/limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryUpId, monthlyLimitCents: cents }),
    })
  } catch {
    // silent — limit will show on next reload
  }
}

function AccountCard({ account }: { account: UpAccountRow }) {
  const borderColour = account.account_type === 'TRANSACTIONAL'
    ? 'border-green-700/30'
    : account.account_type === 'SAVER'
      ? 'border-blue-700/30'
      : 'border-amber-700/30'

  const textColour = account.account_type === 'TRANSACTIONAL'
    ? 'text-green-400'
    : account.account_type === 'SAVER'
      ? 'text-blue-400'
      : 'text-amber-400'

  return (
    <div className={`card border ${borderColour}`}>
      <div className="text-silver-400 text-xs mb-1">{account.account_type}</div>
      <div className="text-white font-medium text-sm truncate mb-2">{account.display_name}</div>
      <div className={`text-xl font-bold ${textColour}`}>
        {formatCents(account.balance_cents)}
      </div>
    </div>
  )
}

function MonthPicker({ month, onChange }: { month: string; onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={() => onChange(-1)}
        className="px-3 py-1.5 bg-charcoal border border-silver-700/30 rounded text-silver-300 hover:text-white hover:bg-charcoal/80 transition-colors text-sm"
      >
        &larr;
      </button>
      <span className="text-white font-semibold text-lg min-w-[180px] text-center">
        {formatMonthLabel(month)}
      </span>
      <button
        onClick={() => onChange(1)}
        className="px-3 py-1.5 bg-charcoal border border-silver-700/30 rounded text-silver-300 hover:text-white hover:bg-charcoal/80 transition-colors text-sm"
      >
        &rarr;
      </button>
    </div>
  )
}

function CategoryBudgetRow({
  category,
  onLimitChange,
}: {
  category: CategorySpend
  onLimitChange: (limit: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [limitInput, setLimitInput] = useState(
    category.monthlyLimitCents ? String(category.monthlyLimitCents / 100) : ''
  )

  const limitCents = category.monthlyLimitCents
  const spentCents = category.totalSpentCents
  const percentage = limitCents ? Math.min((spentCents / limitCents) * 100, 150) : 0
  const displayPercentage = limitCents ? Math.round((spentCents / limitCents) * 100) : null

  const barColour = !limitCents
    ? 'bg-silver-600'
    : percentage <= 75
      ? 'bg-green-500'
      : percentage <= 100
        ? 'bg-amber-500'
        : 'bg-red-500'

  const handleSave = () => {
    const val = parseFloat(limitInput)
    if (!isNaN(val) && val > 0) {
      onLimitChange(val)
    }
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Category name */}
      <div className="w-40 flex-shrink-0">
        <div className="text-white text-sm truncate">{category.name}</div>
        {category.parentName && (
          <div className="text-silver-500 text-xs truncate">{category.parentName}</div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="h-5 bg-charcoal rounded-full overflow-hidden border border-silver-700/20">
          <div
            className={`h-full ${barColour} rounded-full transition-all duration-300`}
            style={{ width: `${limitCents ? Math.min(percentage, 100) : Math.min(spentCents / 50000 * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Spent / Limit */}
      <div className="w-32 text-right flex-shrink-0">
        <span className="text-white text-sm font-mono">{formatCents(spentCents)}</span>
        {limitCents && (
          <span className="text-silver-500 text-sm font-mono"> / {formatCents(limitCents)}</span>
        )}
      </div>

      {/* Percentage */}
      <div className="w-12 text-right flex-shrink-0">
        {displayPercentage !== null && (
          <span className={`text-xs font-medium ${
            displayPercentage <= 75 ? 'text-green-400' : displayPercentage <= 100 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {displayPercentage}%
          </span>
        )}
      </div>

      {/* Count */}
      <div className="w-8 text-right flex-shrink-0">
        <span className="text-silver-500 text-xs">{category.transactionCount}</span>
      </div>

      {/* Limit editor */}
      <div className="w-24 flex-shrink-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              onBlur={handleSave}
              autoFocus
              className="w-16 bg-charcoal border border-silver-700/30 rounded px-1.5 py-0.5 text-white text-xs font-mono"
              placeholder="0"
              step="10"
              min="0"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-silver-500 hover:text-silver-300 transition-colors"
          >
            {limitCents ? 'edit' : 'set limit'}
          </button>
        )}
      </div>
    </div>
  )
}

interface EnrichedTransaction extends UpTransactionRow {
  effective_category_id: string | null
  category_name: string | null
  parent_category_name: string | null
}

function TransactionRow({ transaction: t }: { transaction: EnrichedTransaction }) {
  const isDebit = t.amount_cents < 0
  const dateStr = t.settled_at
    ? new Date(t.settled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : ''

  return (
    <tr className="hover:bg-charcoal/30 transition-colors">
      <td className="py-2 pr-3 text-silver-400 whitespace-nowrap">{dateStr}</td>
      <td className="py-2 pr-3 text-white truncate max-w-[300px]">
        {t.description}
        {t.message && (
          <span className="text-silver-500 ml-1 text-xs">&middot; {t.message}</span>
        )}
      </td>
      <td className={`py-2 pr-3 text-right font-mono whitespace-nowrap ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
        {formatCents(t.amount_cents)}
      </td>
      <td className="py-2">
        {t.category_name ? (
          <span className="inline-block px-2 py-0.5 text-xs rounded bg-silver-700/30 text-silver-300 border border-silver-700/20">
            {t.category_name}
          </span>
        ) : (
          <span className="text-silver-600 text-xs">uncategorised</span>
        )}
      </td>
    </tr>
  )
}
