'use client'

import { useState } from 'react'
import Link from 'next/link'

interface PurgeResult {
  paymentsFound: number
  paymentsDeleted: number
  bankTxnsFound: number
  bankTxnsDeleted: number
  errors: Array<{ id: string; message: string }>
  dryRun: boolean
}

type AccountKey = 'savings' | 'clearing' | 'nab'

const ACCOUNTS: { key: AccountKey; label: string; description: string }[] = [
  { key: 'savings', label: 'Savings Account', description: 'Medicare bulk bill deposits & Halaxy payment entries' },
  { key: 'clearing', label: 'Clearing Account', description: 'Halaxy-synced invoice payments (card & Medicare)' },
  { key: 'nab', label: 'NAB Account', description: 'Bank feed deposits from card settlements' },
]

export default function AccountPurgePage() {
  const [cutoffDate, setCutoffDate] = useState('2026-01-01')
  const [dryRun, setDryRun] = useState(true)
  const [purging, setPurging] = useState<AccountKey | null>(null)
  const [results, setResults] = useState<Record<string, PurgeResult>>({})

  async function handlePurge(accountKey: AccountKey) {
    setPurging(accountKey)
    try {
      const res = await fetch('/api/xero/clearing/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountKey,
          cutoffDate,
          dryRun,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResults((prev) => ({
          ...prev,
          [accountKey]: {
            paymentsFound: 0,
            paymentsDeleted: 0,
            bankTxnsFound: 0,
            bankTxnsDeleted: 0,
            errors: [{ id: 'api', message: data.error || 'Unknown error' }],
            dryRun,
          },
        }))
      } else {
        setResults((prev) => ({ ...prev, [accountKey]: data }))
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [accountKey]: {
          paymentsFound: 0,
          paymentsDeleted: 0,
          bankTxnsFound: 0,
          bankTxnsDeleted: 0,
          errors: [{ id: 'fetch', message: err instanceof Error ? err.message : 'Network error' }],
          dryRun,
        },
      }))
    } finally {
      setPurging(null)
    }
  }

  async function handlePurgeAll() {
    for (const account of ACCOUNTS) {
      await handlePurge(account.key)
    }
  }

  const totalFound = Object.values(results).reduce(
    (acc, r) => ({
      payments: acc.payments + r.paymentsFound,
      bankTxns: acc.bankTxns + r.bankTxnsFound,
    }),
    { payments: 0, bankTxns: 0 }
  )

  const totalDeleted = Object.values(results).reduce(
    (acc, r) => ({
      payments: acc.payments + r.paymentsDeleted,
      bankTxns: acc.bankTxns + r.bankTxnsDeleted,
    }),
    { payments: 0, bankTxns: 0 }
  )

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin" className="text-silver-400 hover:text-white text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="heading-lg text-white mb-2">Account Purge</h1>
        <p className="text-silver-400">
          Delete old Payments and BankTransactions before a cutoff date across all three Xero accounts.
        </p>
        <p className="text-silver-500 text-sm mt-1">
          Uses Xero API: Payments → <code>Status: DELETED</code>, BankTransactions → <code>Status: DELETED</code> (unreconciled only).
          Reconciled transactions must be unreconciled in Xero first.
        </p>
      </div>

      {/* Controls */}
      <div className="card mb-8">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-sm text-silver-400 mb-1">Cutoff Date</label>
            <input
              type="date"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              className="bg-charcoal border border-silver-700/30 text-white px-3 py-2 rounded-lg"
            />
            <p className="text-xs text-silver-500 mt-1">Entries <strong>before</strong> this date will be deleted</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="accent-blue-500 w-4 h-4"
              />
              <span className="text-white font-medium">Dry Run</span>
            </label>
            <p className="text-xs text-silver-500 mt-1">
              {dryRun
                ? 'Preview only — nothing will be deleted'
                : '⚠️ LIVE — entries will be permanently deleted'}
            </p>
          </div>

          <button
            onClick={handlePurgeAll}
            disabled={purging !== null}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
              dryRun
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50`}
          >
            {purging ? `Purging ${purging}...` : dryRun ? 'Preview All 3 Accounts' : 'Purge All 3 Accounts'}
          </button>
        </div>
      </div>

      {/* Account cards */}
      <div className="space-y-6">
        {ACCOUNTS.map((account) => {
          const r = results[account.key]
          const isRunning = purging === account.key

          return (
            <div
              key={account.key}
              className="card border border-silver-700/30"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{account.label}</h2>
                  <p className="text-sm text-silver-400">{account.description}</p>
                </div>
                <button
                  onClick={() => handlePurge(account.key)}
                  disabled={purging !== null}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    dryRun
                      ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30'
                      : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30'
                  } disabled:opacity-50`}
                >
                  {isRunning ? 'Running...' : dryRun ? 'Preview' : 'Purge'}
                </button>
              </div>

              {isRunning && (
                <div className="flex items-center gap-2 text-silver-400 text-sm">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
                  Scanning {account.label}...
                </div>
              )}

              {r && !isRunning && (
                <div className="space-y-3">
                  {/* Counts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-charcoal/50 rounded-lg p-3">
                      <div className="text-xs text-silver-500">Payments Found</div>
                      <div className="text-xl font-bold text-white">{r.paymentsFound}</div>
                    </div>
                    <div className="bg-charcoal/50 rounded-lg p-3">
                      <div className="text-xs text-silver-500">Payments Deleted</div>
                      <div className={`text-xl font-bold ${r.paymentsDeleted > 0 ? 'text-green-400' : 'text-silver-500'}`}>
                        {r.dryRun ? '—' : r.paymentsDeleted}
                      </div>
                    </div>
                    <div className="bg-charcoal/50 rounded-lg p-3">
                      <div className="text-xs text-silver-500">Bank Txns Found</div>
                      <div className="text-xl font-bold text-white">{r.bankTxnsFound}</div>
                    </div>
                    <div className="bg-charcoal/50 rounded-lg p-3">
                      <div className="text-xs text-silver-500">Bank Txns Deleted</div>
                      <div className={`text-xl font-bold ${r.bankTxnsDeleted > 0 ? 'text-green-400' : 'text-silver-500'}`}>
                        {r.dryRun ? '—' : r.bankTxnsDeleted}
                      </div>
                    </div>
                  </div>

                  {r.dryRun && (r.paymentsFound > 0 || r.bankTxnsFound > 0) && (
                    <p className="text-sm text-amber-400">
                      Dry run — {r.paymentsFound + r.bankTxnsFound} entries found. Turn off Dry Run and run again to delete.
                    </p>
                  )}

                  {r.dryRun && r.paymentsFound === 0 && r.bankTxnsFound === 0 && (
                    <p className="text-sm text-green-400">
                      No deletable entries found before {cutoffDate}. Account is clean.
                    </p>
                  )}

                  {!r.dryRun && (
                    <p className="text-sm text-green-400">
                      Deleted {r.paymentsDeleted} payments + {r.bankTxnsDeleted} bank transactions.
                      {r.errors.length > 0 && ` ${r.errors.length} errors.`}
                    </p>
                  )}

                  {r.errors.length > 0 && (
                    <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                      <p className="text-xs text-red-400 font-semibold mb-1">Errors ({r.errors.length})</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {r.errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-300 font-mono">
                            {e.id}: {e.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {Object.keys(results).length > 0 && (
        <div className="card mt-8 border border-silver-700/30">
          <h2 className="text-lg font-bold text-white mb-3">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-charcoal/50 rounded-lg p-3">
              <div className="text-xs text-silver-500">Total Payments Found</div>
              <div className="text-xl font-bold text-white">{totalFound.payments}</div>
            </div>
            <div className="bg-charcoal/50 rounded-lg p-3">
              <div className="text-xs text-silver-500">Total Payments Deleted</div>
              <div className="text-xl font-bold text-green-400">{totalDeleted.payments}</div>
            </div>
            <div className="bg-charcoal/50 rounded-lg p-3">
              <div className="text-xs text-silver-500">Total Bank Txns Found</div>
              <div className="text-xl font-bold text-white">{totalFound.bankTxns}</div>
            </div>
            <div className="bg-charcoal/50 rounded-lg p-3">
              <div className="text-xs text-silver-500">Total Bank Txns Deleted</div>
              <div className="text-xl font-bold text-green-400">{totalDeleted.bankTxns}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
