'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDollars } from './shared'
import type { DebtRow } from '@/lib/up/types'

interface DebtSimulationResult {
  strategy: 'snowball' | 'avalanche'
  totalMonths: number
  totalInterestPaid: number
  payoffOrder: Array<{ lender: string; month: number; totalPaid: number }>
  monthlyBreakdown: Array<{
    month: number
    payments: Array<{ lender: string; payment: number; interest: number; balance: number }>
    totalBalance: number
  }>
}

const EMPTY_DEBT: Omit<DebtRow, 'id' | 'created_at' | 'updated_at'> = {
  lender: '',
  balance_cents: 0,
  interest_rate: 0,
  compounding: 'monthly',
  min_payment_cents: 0,
  payment_frequency: 'monthly',
  due_day: null,
  priority: 0,
  account_up_id: null,
  notes: null,
  is_active: true,
}

export default function DebtTracker() {
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_DEBT)
  const [simulation, setSimulation] = useState<{ snowball: DebtSimulationResult; avalanche: DebtSimulationResult } | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [extraPayment, setExtraPayment] = useState('')

  const fetchDebts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/budget/debts?active=true')
      if (!res.ok) throw new Error('Failed to fetch debts')
      setDebts(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDebts()
  }, [fetchDebts])

  const handleSave = async () => {
    if (!form.lender) return
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/budget/debts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save debt')
      setForm(EMPTY_DEBT)
      setShowAdd(false)
      setEditingId(null)
      await fetchDebts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/budget/debts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await fetchDebts()
    } catch {
      // silent
    }
  }

  const handleEdit = (debt: DebtRow) => {
    setEditingId(debt.id)
    setForm({
      lender: debt.lender,
      balance_cents: debt.balance_cents,
      interest_rate: debt.interest_rate,
      compounding: debt.compounding,
      min_payment_cents: debt.min_payment_cents,
      payment_frequency: debt.payment_frequency,
      due_day: debt.due_day,
      priority: debt.priority,
      account_up_id: debt.account_up_id,
      notes: debt.notes,
      is_active: debt.is_active,
    })
    setShowAdd(true)
  }

  const runSimulation = async () => {
    setSimLoading(true)
    try {
      const extraCents = Math.round((parseFloat(extraPayment) || 0) * 100)
      const [snowballRes, avalancheRes] = await Promise.all([
        fetch(`/api/budget/debts/simulation?strategy=snowball&extraCents=${extraCents}`),
        fetch(`/api/budget/debts/simulation?strategy=avalanche&extraCents=${extraCents}`),
      ])
      if (!snowballRes.ok || !avalancheRes.ok) throw new Error('Simulation failed')
      setSimulation({
        snowball: await snowballRes.json(),
        avalanche: await avalancheRes.json(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setSimLoading(false)
    }
  }

  const totalBalance = debts.reduce((s, d) => s + d.balance_cents, 0)
  const totalMinPayments = debts.reduce((s, d) => {
    // Normalise to monthly
    const monthly = d.payment_frequency === 'weekly'
      ? d.min_payment_cents * (52 / 12)
      : d.payment_frequency === 'fortnightly'
        ? d.min_payment_cents * (26 / 12)
        : d.min_payment_cents
    return s + monthly
  }, 0)
  const weightedRate = totalBalance > 0
    ? debts.reduce((s, d) => s + d.interest_rate * d.balance_cents, 0) / totalBalance
    : 0

  if (loading) {
    return <div className="card"><p className="text-silver-400">Loading debts&hellip;</p></div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="card border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-purple-700/30">
          <div className="text-silver-400 text-xs mb-1">Total Debt</div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {formatDollars(totalBalance)}
          </div>
          <div className="text-silver-500 text-xs mt-1">{debts.length} debt{debts.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card border-red-700/30">
          <div className="text-silver-400 text-xs mb-1">Total Min Payments (monthly)</div>
          <div className="text-xl font-bold text-red-400 font-mono">
            {formatDollars(Math.round(totalMinPayments))}
          </div>
        </div>
        <div className="card border-amber-700/30">
          <div className="text-silver-400 text-xs mb-1">Weighted Avg Rate</div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {weightedRate.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Debt list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Debts</h2>
          <button
            onClick={() => {
              setShowAdd(!showAdd)
              if (showAdd) {
                setEditingId(null)
                setForm(EMPTY_DEBT)
              }
            }}
            className="px-3 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-600 transition-colors"
          >
            {showAdd ? 'Cancel' : 'Add Debt'}
          </button>
        </div>

        {/* Add/Edit form */}
        {showAdd && (
          <div className="mb-4 p-4 bg-charcoal/50 rounded border border-silver-700/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-silver-400 text-xs block mb-1">Lender</label>
                <input
                  type="text"
                  value={form.lender}
                  onChange={(e) => setForm(prev => ({ ...prev, lender: e.target.value }))}
                  placeholder="e.g. ATO, NAB, Afterpay"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Balance ($)</label>
                <input
                  type="number"
                  value={form.balance_cents / 100 || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, balance_cents: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  value={form.interest_rate || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, interest_rate: parseFloat(e.target.value || '0') }))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Min Payment ($)</label>
                <input
                  type="number"
                  value={form.min_payment_cents / 100 || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, min_payment_cents: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Payment Frequency</label>
                <select
                  value={form.payment_frequency}
                  onChange={(e) => setForm(prev => ({ ...prev, payment_frequency: e.target.value as 'weekly' | 'fortnightly' | 'monthly' }))}
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Priority</label>
                <input
                  type="number"
                  value={form.priority || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: parseInt(e.target.value || '0', 10) }))}
                  placeholder="0"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-silver-400 text-xs block mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value || null }))}
                  placeholder="Optional notes"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !form.lender}
              className="mt-3 px-4 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Saving\u2026' : editingId ? 'Update Debt' : 'Add Debt'}
            </button>
          </div>
        )}

        {/* Debt table */}
        {debts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-silver-400 text-xs border-b border-silver-700/30">
                <tr>
                  <th className="text-left py-2 pr-3">Lender</th>
                  <th className="text-right py-2 pr-3">Balance</th>
                  <th className="text-right py-2 pr-3">Rate</th>
                  <th className="text-right py-2 pr-3">Min Payment</th>
                  <th className="text-left py-2 pr-3">Frequency</th>
                  <th className="text-center py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-700/20">
                {debts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-charcoal/30 transition-colors">
                    <td className="py-2 pr-3 text-white">
                      {debt.lender}
                      {debt.notes && <span className="text-silver-500 text-xs ml-1">({debt.notes})</span>}
                    </td>
                    <td className="py-2 pr-3 text-right text-purple-400 font-mono">
                      {formatDollars(debt.balance_cents)}
                    </td>
                    <td className="py-2 pr-3 text-right text-amber-400 font-mono">
                      {debt.interest_rate}%
                    </td>
                    <td className="py-2 pr-3 text-right text-red-400 font-mono">
                      {formatDollars(debt.min_payment_cents)}
                    </td>
                    <td className="py-2 pr-3 text-silver-400 capitalize">
                      {debt.payment_frequency}
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(debt)}
                          className="text-xs text-silver-400 hover:text-white transition-colors"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => handleDelete(debt.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-silver-400 text-sm">No debts tracked. Add your first debt above.</p>
        )}
      </div>

      {/* Payoff simulation */}
      {debts.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Payoff Simulation</h2>
          <div className="flex items-end gap-3 mb-4">
            <div>
              <label className="text-silver-400 text-xs block mb-1">Extra monthly payment ($)</label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="0"
                step="50"
                className="bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm font-mono w-32"
              />
            </div>
            <button
              onClick={runSimulation}
              disabled={simLoading}
              className="px-4 py-1.5 bg-purple-700 text-white rounded text-sm hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {simLoading ? 'Simulating\u2026' : 'Run Simulation'}
            </button>
          </div>

          {simulation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SimulationCard title="Snowball (lowest balance first)" result={simulation.snowball} />
              <SimulationCard title="Avalanche (highest rate first)" result={simulation.avalanche} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SimulationCard({ title, result }: { title: string; result: DebtSimulationResult }) {
  const years = Math.floor(result.totalMonths / 12)
  const remainingMonths = result.totalMonths % 12

  return (
    <div className="p-4 bg-charcoal/50 rounded border border-silver-700/20">
      <h3 className="text-white font-medium text-sm mb-3">{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-silver-400">Time to debt-free</span>
          <span className="text-white font-mono">
            {years > 0 ? `${years}y ` : ''}{remainingMonths}m ({result.totalMonths} months)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-silver-400">Total interest paid</span>
          <span className="text-red-400 font-mono">{formatDollars(result.totalInterestPaid)}</span>
        </div>
        <div className="pt-2 border-t border-silver-700/20">
          <div className="text-silver-400 text-xs mb-1">Payoff order:</div>
          {result.payoffOrder.map((d, i) => (
            <div key={d.lender} className="flex justify-between text-xs">
              <span className="text-silver-300">{i + 1}. {d.lender}</span>
              <span className="text-silver-400">Month {d.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
