'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCents, formatDollars } from './shared'

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

export default function BusinessExpenses() {
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

  const exportCSV = () => {
    if (!data) return
    const businessTxns = data.transactions.filter(t => t.isBusiness)
    const header = 'Date,Description,Amount,Category,Matched Rule'
    const rows = businessTxns.map(t => {
      const date = t.settledAt ? new Date(t.settledAt).toLocaleDateString('en-AU') : ''
      const desc = `"${t.description.replace(/"/g, '""')}"`
      const amount = (Math.abs(t.amountCents) / 100).toFixed(2)
      const cat = t.matchedCategory ?? ''
      const rule = t.matchedRule ?? 'Manual'
      return `${date},${desc},${amount},${cat},${rule}`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `business-expenses-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
          <div className="flex items-center justify-between mb-1">
            <div className="text-silver-400 text-xs">YTD Identified</div>
            <button
              onClick={exportCSV}
              className="px-2 py-0.5 text-xs bg-slate-blue/50 text-white rounded hover:bg-slate-blue transition-colors"
            >
              Export CSV
            </button>
          </div>
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
          <p className="text-silver-400 text-sm">No matching transactions found for {new Date().getFullYear()}.</p>
        )}
      </div>
    </div>
  )
}
