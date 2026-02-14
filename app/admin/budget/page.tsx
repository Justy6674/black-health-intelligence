'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import BudgetOverview from '@/components/admin/budget/BudgetOverview'
import ATOReport from '@/components/admin/budget/ATOReport'
import BusinessExpenses from '@/components/admin/budget/BusinessExpenses'
import BudgetAssistant from '@/components/admin/budget/BudgetAssistant'
import DebtTracker from '@/components/admin/budget/DebtTracker'
import CashFlowProjection from '@/components/admin/budget/CashFlowProjection'

type Tab = 'overview' | 'debts' | 'cash-flow' | 'ato-report' | 'business-expenses' | 'assistant'

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'debts', label: 'Debts' },
  { key: 'cash-flow', label: 'Cash Flow' },
  { key: 'ato-report', label: 'ATO Report' },
  { key: 'business-expenses', label: 'Business Expenses' },
  { key: 'assistant', label: 'AI Assistant' },
]

function BudgetPageContent() {
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
      {activeTab === 'debts' && <DebtTracker />}
      {activeTab === 'cash-flow' && <CashFlowProjection />}
      {activeTab === 'ato-report' && <ATOReport />}
      {activeTab === 'business-expenses' && <BusinessExpenses />}
      {activeTab === 'assistant' && <BudgetAssistant />}
    </div>
  )
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-silver-400">Loading…</div>}>
      <BudgetPageContent />
    </Suspense>
  )
}
