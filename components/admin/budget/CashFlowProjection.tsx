'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDollars } from './shared'
import type { RecurringItemRow } from '@/lib/up/types'

interface CashFlowEvent {
  date: string
  label: string
  amount: number
  type: 'income' | 'expense' | 'debt'
}

interface CashFlowProjection {
  date: string
  balance: number
  events: CashFlowEvent[]
}

interface CashFlowData {
  projections: CashFlowProjection[]
  alerts: Array<{ date: string; balance: number; message: string }>
  startingBalance: number
}

const EMPTY_ITEM: Omit<RecurringItemRow, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  type: 'expense',
  amount_cents: 0,
  frequency: 'monthly',
  category_up_id: null,
  account_up_id: null,
  next_due_date: null,
  is_active: true,
  notes: null,
}

export default function CashFlowProjection() {
  const [weeks, setWeeks] = useState(8)
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Recurring items
  const [items, setItems] = useState<RecurringItemRow[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_ITEM)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [flowRes, itemsRes] = await Promise.all([
        fetch(`/api/budget/cash-flow?weeks=${weeks}`),
        fetch('/api/budget/recurring?active=true'),
      ])
      if (!flowRes.ok) throw new Error('Failed to fetch cash flow')
      if (!itemsRes.ok) throw new Error('Failed to fetch recurring items')
      setData(await flowRes.json())
      setItems(await itemsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [weeks])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/budget/recurring', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      setForm(EMPTY_ITEM)
      setShowAdd(false)
      setEditingId(null)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/budget/recurring', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await fetchData()
    } catch {
      // silent
    }
  }

  const handleEdit = (item: RecurringItemRow) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      type: item.type,
      amount_cents: item.amount_cents,
      frequency: item.frequency,
      category_up_id: item.category_up_id,
      account_up_id: item.account_up_id,
      next_due_date: item.next_due_date,
      is_active: item.is_active,
      notes: item.notes,
    })
    setShowAdd(true)
  }

  if (loading) {
    return <div className="card"><p className="text-silver-400">Loading cash flow&hellip;</p></div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="card border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Weeks selector */}
      <div className="flex items-center gap-3">
        <label className="text-silver-400 text-sm">Projection period:</label>
        {[4, 8, 12].map(w => (
          <button
            key={w}
            onClick={() => setWeeks(w)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              weeks === w
                ? 'bg-slate-blue text-white'
                : 'bg-charcoal border border-silver-700/30 text-silver-400 hover:text-white'
            }`}
          >
            {w} weeks
          </button>
        ))}
      </div>

      {/* Alerts */}
      {data && data.alerts.length > 0 && (
        <div className="card border-red-700/30 bg-red-900/10">
          <h3 className="text-red-400 font-semibold text-sm mb-2">Low Balance Alerts</h3>
          <div className="space-y-1">
            {data.alerts.map((a, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-red-300">
                  {new Date(a.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  {' '}&mdash; {a.message}
                </span>
                <span className="text-red-400 font-mono">{formatDollars(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SVG Chart */}
      {data && data.projections.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Projected Balance</h2>
          <BalanceChart projections={data.projections} />
        </div>
      )}

      {/* Upcoming events */}
      {data && data.projections.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming Events</h2>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-silver-400 text-xs border-b border-silver-700/30 sticky top-0 bg-deep-black">
                <tr>
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-left py-2 pr-3">Event</th>
                  <th className="text-right py-2 pr-3">Amount</th>
                  <th className="text-right py-2">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-700/20">
                {data.projections
                  .filter(p => p.events.length > 0)
                  .flatMap(p => p.events.map(e => ({ ...e, balance: p.balance })))
                  .map((event, i) => (
                    <tr key={i} className="hover:bg-charcoal/30 transition-colors">
                      <td className="py-2 pr-3 text-silver-400 whitespace-nowrap">
                        {new Date(event.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', weekday: 'short' })}
                      </td>
                      <td className="py-2 pr-3 text-white">{event.label}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${
                        event.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {event.type === 'income' ? '+' : '-'}{formatDollars(Math.abs(event.amount))}
                      </td>
                      <td className={`py-2 text-right font-mono ${
                        event.balance < 50000 ? 'text-red-400' : 'text-silver-300'
                      }`}>
                        {formatDollars(event.balance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recurring items editor */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Recurring Items ({items.length})
          </h2>
          <button
            onClick={() => {
              setShowAdd(!showAdd)
              if (showAdd) {
                setEditingId(null)
                setForm(EMPTY_ITEM)
              }
            }}
            className="px-3 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-600 transition-colors"
          >
            {showAdd ? 'Cancel' : 'Add Item'}
          </button>
        </div>

        {showAdd && (
          <div className="mb-4 p-4 bg-charcoal/50 rounded border border-silver-700/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-silver-400 text-xs block mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Salary, Rent, Netflix"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={form.amount_cents / 100 || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm(prev => ({ ...prev, frequency: e.target.value as RecurringItemRow['frequency'] }))}
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div>
                <label className="text-silver-400 text-xs block mb-1">Next Due Date</label>
                <input
                  type="date"
                  value={form.next_due_date ?? ''}
                  onChange={(e) => setForm(prev => ({ ...prev, next_due_date: e.target.value || null }))}
                  className="w-full bg-charcoal border border-silver-700/30 rounded px-3 py-1.5 text-white text-sm"
                />
              </div>
              <div>
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
              disabled={saving || !form.name}
              className="mt-3 px-4 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Saving\u2026' : editingId ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        )}

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-silver-400 text-xs border-b border-silver-700/30">
                <tr>
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-right py-2 pr-3">Amount</th>
                  <th className="text-left py-2 pr-3">Frequency</th>
                  <th className="text-left py-2 pr-3">Next Due</th>
                  <th className="text-center py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-700/20">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-charcoal/30 transition-colors">
                    <td className="py-2 pr-3 text-white">
                      {item.name}
                      {item.notes && <span className="text-silver-500 text-xs ml-1">({item.notes})</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        item.type === 'income'
                          ? 'bg-emerald-700/30 text-emerald-400'
                          : 'bg-red-700/30 text-red-400'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className={`py-2 pr-3 text-right font-mono ${
                      item.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatDollars(item.amount_cents)}
                    </td>
                    <td className="py-2 pr-3 text-silver-400 capitalize">{item.frequency}</td>
                    <td className="py-2 pr-3 text-silver-400">
                      {item.next_due_date
                        ? new Date(item.next_due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                        : '-'}
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-xs text-silver-400 hover:text-white transition-colors"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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
          <p className="text-silver-400 text-sm">No recurring items. Add income and expenses to project cash flow.</p>
        )}
      </div>
    </div>
  )
}

// ── Pure SVG balance chart ──
function BalanceChart({ projections }: { projections: CashFlowProjection[] }) {
  const width = 800
  const height = 300
  const padding = { top: 20, right: 60, bottom: 40, left: 80 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const balances = projections.map(p => p.balance)
  const minBal = Math.min(...balances)
  const maxBal = Math.max(...balances)
  const range = maxBal - minBal || 1

  const xScale = (i: number) => padding.left + (i / (projections.length - 1)) * chartWidth
  const yScale = (val: number) => padding.top + chartHeight - ((val - minBal) / range) * chartHeight

  const points = projections.map((p, i) => `${xScale(i)},${yScale(p.balance)}`)
  const polyline = points.join(' ')

  // Area fill
  const areaPath = `M${xScale(0)},${yScale(projections[0].balance)} ${points.map(p => `L${p}`).join(' ')} L${xScale(projections.length - 1)},${padding.top + chartHeight} L${xScale(0)},${padding.top + chartHeight} Z`

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => minBal + (range * i) / 4)

  // X-axis labels (every 7th day roughly)
  const xInterval = Math.max(1, Math.floor(projections.length / 6))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={yScale(tick)}
            x2={width - padding.right}
            y2={yScale(tick)}
            stroke="rgba(148, 163, 184, 0.1)"
          />
          <text
            x={padding.left - 8}
            y={yScale(tick) + 4}
            textAnchor="end"
            fill="rgba(148, 163, 184, 0.6)"
            fontSize="10"
            fontFamily="monospace"
          >
            ${Math.round(tick / 100).toLocaleString()}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="rgba(99, 102, 241, 0.1)" />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="rgb(99, 102, 241)"
        strokeWidth="2"
      />

      {/* Warning line at $500 */}
      {minBal < 50000 && (
        <>
          <line
            x1={padding.left}
            y1={yScale(50000)}
            x2={width - padding.right}
            y2={yScale(50000)}
            stroke="rgba(239, 68, 68, 0.4)"
            strokeDasharray="4 4"
          />
          <text
            x={width - padding.right + 4}
            y={yScale(50000) + 4}
            fill="rgba(239, 68, 68, 0.6)"
            fontSize="9"
          >
            $500
          </text>
        </>
      )}

      {/* X-axis labels */}
      {projections
        .filter((_, i) => i % xInterval === 0 || i === projections.length - 1)
        .map((p, i) => {
          const idx = projections.indexOf(p)
          return (
            <text
              key={i}
              x={xScale(idx)}
              y={height - 8}
              textAnchor="middle"
              fill="rgba(148, 163, 184, 0.6)"
              fontSize="10"
            >
              {new Date(p.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </text>
          )
        })}

      {/* Data points */}
      {projections
        .filter(p => p.events.length > 0)
        .map((p, i) => {
          const idx = projections.indexOf(p)
          return (
            <circle
              key={i}
              cx={xScale(idx)}
              cy={yScale(p.balance)}
              r="3"
              fill={p.balance < 50000 ? 'rgb(239, 68, 68)' : 'rgb(99, 102, 241)'}
            />
          )
        })}
    </svg>
  )
}
