'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UpAccountRow, CategorySpend } from '@/lib/up/types'
import {
  formatCents,
  currentMonth,
  shiftMonth,
  formatMonthLabel,
  AccountCard,
  MonthPicker,
  CategoryBudgetRow,
  TransactionRow,
  handleLimitChange,
  type EnrichedTransaction,
} from './shared'

export default function BudgetOverview() {
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

      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {accounts.map((account) => (
            <AccountCard key={account.up_id} account={account} />
          ))}
        </div>
      )}

      <MonthPicker month={month} onChange={handleMonthChange} />

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
