'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { HalaxyInvoice, HalaxyPayment } from '@/lib/halaxy/types'

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface DashboardData {
  invoices: {
    total: number
    totalGross: number
    outstanding: HalaxyInvoice[]
  }
  payments: {
    total: number
    totalAmount: number
    byMethod: Record<string, { count: number; amount: number }>
    failed: HalaxyPayment[]
  }
}

export default function HalaxyDashboardPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [dateRange, setDateRange] = useState<'today' | '7days'>('today')

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    setData(null)

    const today = new Date()
    const fromDate = dateRange === 'today'
      ? formatDate(today)
      : formatDate(new Date(today.getTime() - 6 * 86400000))
    const toDate = formatDate(today)

    try {
      // Fetch invoices and payments in parallel
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/halaxy/invoices?fromDate=${fromDate}&toDate=${toDate}`),
        fetch(`/api/halaxy/payments?fromDate=${fromDate}&toDate=${toDate}&enrich=true`),
      ])

      // Invoices might not have an endpoint yet — use payments data
      let invoices: HalaxyInvoice[] = []
      if (invRes.ok) {
        const invData = await invRes.json()
        invoices = invData.invoices ?? []
      }

      let payments: HalaxyPayment[] = []
      if (payRes.ok) {
        const payData = await payRes.json()
        payments = payData.payments ?? []
      } else {
        const errData = await payRes.json().catch(() => ({}))
        throw new Error(errData.error || `Payments request failed (${payRes.status})`)
      }

      // Process data
      const byMethod: Record<string, { count: number; amount: number }> = {}
      for (const p of payments) {
        if (p.type !== 'Payment') continue
        const method = p.method || 'Unknown'
        if (!byMethod[method]) byMethod[method] = { count: 0, amount: 0 }
        byMethod[method].count++
        byMethod[method].amount += p.amount
      }

      const successfulPayments = payments.filter((p) => p.type === 'Payment')
      const failedPayments = payments.filter((p) => p.type === 'Failed')

      setData({
        invoices: {
          total: invoices.length,
          totalGross: invoices.reduce((s, inv) => s + inv.totalGross, 0),
          outstanding: invoices.filter((inv) => inv.totalBalance > 0),
        },
        payments: {
          total: successfulPayments.length,
          totalAmount: successfulPayments.reduce((s, p) => s + p.amount, 0),
          byMethod,
          failed: failedPayments,
        },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          &larr; Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Halaxy Overview</h1>
          <p className="text-silver-400 text-sm">
            Practice management snapshot &mdash; invoices, payments, and sync status
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('today')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                dateRange === 'today'
                  ? 'bg-slate-blue/40 text-white'
                  : 'bg-silver-700/30 text-silver-300 hover:bg-silver-700/50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('7days')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                dateRange === '7days'
                  ? 'bg-slate-blue/40 text-white'
                  : 'bg-silver-700/30 text-silver-300 hover:bg-silver-700/50'
              }`}
            >
              Last 7 days
            </button>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="px-4 py-2 bg-slate-blue/20 text-white rounded hover:bg-slate-blue/40 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Loading\u2026' : 'Load Dashboard'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Dashboard data */}
      {data && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="text-silver-400 text-sm mb-1">Invoices</div>
              <div className="text-2xl font-bold text-white">{data.invoices.total}</div>
              <div className="text-silver-500 text-xs mt-1">
                ${data.invoices.totalGross.toFixed(2)} gross
              </div>
            </div>
            <div className="card">
              <div className="text-silver-400 text-sm mb-1">Payments</div>
              <div className="text-2xl font-bold text-green-400">{data.payments.total}</div>
              <div className="text-silver-500 text-xs mt-1">
                ${data.payments.totalAmount.toFixed(2)} received
              </div>
            </div>
            <div className="card">
              <div className="text-silver-400 text-sm mb-1">Outstanding</div>
              <div className="text-2xl font-bold text-yellow-400">{data.invoices.outstanding.length}</div>
              <div className="text-silver-500 text-xs mt-1">
                ${data.invoices.outstanding.reduce((s, inv) => s + inv.totalBalance, 0).toFixed(2)} owed
              </div>
            </div>
            <div className="card">
              <div className="text-silver-400 text-sm mb-1">Failed Payments</div>
              <div className={`text-2xl font-bold ${data.payments.failed.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {data.payments.failed.length}
              </div>
              <div className="text-silver-500 text-xs mt-1">
                {data.payments.failed.length > 0
                  ? `$${data.payments.failed.reduce((s, p) => s + p.amount, 0).toFixed(2)} failed`
                  : 'No failures'}
              </div>
            </div>
          </div>

          {/* Payment methods breakdown */}
          {Object.keys(data.payments.byMethod).length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">Payments by Method</h2>
              <div className="space-y-2">
                {Object.entries(data.payments.byMethod)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([method, stats]) => (
                    <div key={method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <PaymentMethodBadge method={method} />
                        <span className="text-silver-300">{stats.count} payment{stats.count !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-white font-mono">${stats.amount.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Outstanding invoices */}
          {data.invoices.outstanding.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-yellow-400 mb-3">
                Outstanding Invoices ({data.invoices.outstanding.length})
              </h2>
              <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                {data.invoices.outstanding.map((inv) => (
                  <div key={inv.id} className="text-silver-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-silver-500">{inv.identifier}</span>
                      <span>{inv.title}</span>
                    </div>
                    <span className="text-yellow-400 font-mono">${inv.totalBalance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed payments */}
          {data.payments.failed.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-red-400 mb-3">
                Failed Payments ({data.payments.failed.length})
              </h2>
              <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                {data.payments.failed.map((p) => (
                  <div key={p.id} className="text-silver-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-silver-500">{p.invoiceNumber || p.invoiceId}</span>
                      <span className="text-purple-400">{p.patientName || '(unknown)'}</span>
                      <PaymentMethodBadge method={p.method} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-mono">${p.amount.toFixed(2)}</span>
                      <span className="text-silver-500 text-xs">{p.created.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-3">Quick Links</h2>
            <div className="space-y-2">
              <Link
                href="/admin/xero/clearing-helper"
                className="block p-3 bg-charcoal/50 rounded-lg hover:bg-charcoal transition-colors border border-blue-700/30"
              >
                <h3 className="font-semibold text-white text-sm">Clearing Account Reconciliation</h3>
                <p className="text-xs text-silver-400">Match NAB deposits to Halaxy payments with enriched context</p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PaymentMethodBadge({ method }: { method: string }) {
  const colours: Record<string, string> = {
    braintree: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30',
    cash: 'bg-green-900/40 text-green-300 border-green-500/30',
    eft: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/30',
    eftpos: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/30',
  }
  const key = method.toLowerCase()
  const cls = colours[key] ?? 'bg-silver-800/40 text-silver-300 border-silver-600/30'

  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${cls}`}>
      {method}
    </span>
  )
}
