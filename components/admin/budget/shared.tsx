'use client'

import { useState } from 'react'
import type { UpAccountRow, CategorySpend, UpTransactionRow } from '@/lib/up/types'

export function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(abs / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1)
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function AccountCard({ account }: { account: UpAccountRow }) {
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

export function MonthPicker({ month, onChange }: { month: string; onChange: (delta: number) => void }) {
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

export function CategoryBudgetRow({
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
      <div className="w-40 flex-shrink-0">
        <div className="text-white text-sm truncate">{category.name}</div>
        {category.parentName && (
          <div className="text-silver-500 text-xs truncate">{category.parentName}</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="h-5 bg-charcoal rounded-full overflow-hidden border border-silver-700/20">
          <div
            className={`h-full ${barColour} rounded-full transition-all duration-300`}
            style={{ width: `${limitCents ? Math.min(percentage, 100) : Math.min(spentCents / 50000 * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="w-32 text-right flex-shrink-0">
        <span className="text-white text-sm font-mono">{formatCents(spentCents)}</span>
        {limitCents && (
          <span className="text-silver-500 text-sm font-mono"> / {formatCents(limitCents)}</span>
        )}
      </div>

      <div className="w-12 text-right flex-shrink-0">
        {displayPercentage !== null && (
          <span className={`text-xs font-medium ${
            displayPercentage <= 75 ? 'text-green-400' : displayPercentage <= 100 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {displayPercentage}%
          </span>
        )}
      </div>

      <div className="w-8 text-right flex-shrink-0">
        <span className="text-silver-500 text-xs">{category.transactionCount}</span>
      </div>

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

export interface EnrichedTransaction extends UpTransactionRow {
  effective_category_id: string | null
  category_name: string | null
  parent_category_name: string | null
}

export function TransactionRow({ transaction: t }: { transaction: EnrichedTransaction }) {
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

export async function handleLimitChange(categoryUpId: string, limitDollars: number | null) {
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
