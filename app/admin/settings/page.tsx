'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { NotificationPreference } from '@/lib/types'

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchPrefs()
  }, [])

  const fetchPrefs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/notifications')
      if (!res.ok) throw new Error('Failed to load preferences')
      const data: NotificationPreference = await res.json()
      setPrefs(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const toggleClearingReport = async () => {
    if (!prefs) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearing_report: !prefs.clearing_report }),
      })
      if (!res.ok) throw new Error('Failed to update preference')
      const data: NotificationPreference = await res.json()
      setPrefs(data)
      setSuccess(
        data.clearing_report
          ? 'You will now receive clearing reports by email.'
          : 'You have been unsubscribed from clearing reports.'
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          &larr; Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-silver-400 text-sm">Manage your notification preferences</p>
        </div>
      </div>

      {error && (
        <div className="card mb-6 border-red-500/50 bg-red-900/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="card mb-6 border-green-500/50 bg-green-900/20">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Email Notifications</h2>

        {loading ? (
          <p className="text-silver-400 text-sm">Loading preferences...</p>
        ) : prefs ? (
          <div className="space-y-4">
            <div className="text-sm text-silver-400">
              Signed in as <span className="text-white">{prefs.email}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-charcoal/50 rounded-lg border border-silver-700/30">
              <div>
                <h3 className="font-medium text-white">Clearing reconciliation reports</h3>
                <p className="text-sm text-silver-400 mt-1">
                  Receive email summaries when a clearing report is sent from the reconciliation tool.
                </p>
              </div>
              <button
                onClick={toggleClearingReport}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                  prefs.clearing_report ? 'bg-green-600' : 'bg-silver-700'
                }`}
                role="switch"
                aria-checked={prefs.clearing_report}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
                    prefs.clearing_report ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
