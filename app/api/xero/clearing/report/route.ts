import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@supabase/ssr'
import { requireAdmin } from '@/lib/xero/auth'
import type { ClearingSummaryResponse } from '@/lib/xero/types'

const OFFICE_EMAIL = 'office@blackhealthintelligence.com'

/**
 * POST /api/xero/clearing/report
 * Sends a clearing reconciliation summary email to all opted-in admin users.
 * Body: { summary: ClearingSummaryResponse, toleranceDollars: number }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Resend API key not configured' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const summary: ClearingSummaryResponse = body.summary
  const toleranceDollars: number = body.toleranceDollars ?? 5

  if (!summary) {
    return NextResponse.json(
      { error: 'Missing summary data' },
      { status: 400 }
    )
  }

  // Use service role client to read all opted-in users (bypasses RLS)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: prefs, error: prefsError } = await supabaseAdmin
    .from('notification_preferences')
    .select('email')
    .eq('clearing_report', true)

  if (prefsError) {
    console.error('Failed to fetch notification preferences:', prefsError)
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    )
  }

  const recipients = (prefs ?? [])
    .map((p: { email: string }) => p.email)
    .filter(Boolean)

  if (recipients.length === 0) {
    return NextResponse.json({
      sent: 0,
      message: 'No users are opted in to clearing reports',
    })
  }

  // Build email HTML
  const html = buildReportHtml(summary, toleranceDollars, auth.user)

  const resend = new Resend(process.env.RESEND_API_KEY)

  const dateRange =
    summary.fromDate && summary.toDate && summary.fromDate !== summary.toDate
      ? `${summary.fromDate} to ${summary.toDate}`
      : summary.fromDate || summary.date

  await resend.emails.send({
    from: `Clearing Report <${OFFICE_EMAIL}>`,
    to: recipients,
    subject: `Clearing Reconciliation Report — ${dateRange}`,
    html,
  })

  return NextResponse.json({
    sent: recipients.length,
    message: `Report sent to ${recipients.length} recipient(s)`,
  })
}

function buildReportHtml(
  summary: ClearingSummaryResponse,
  toleranceDollars: number,
  sentBy: string
): string {
  const dateRange =
    summary.fromDate && summary.toDate && summary.fromDate !== summary.toDate
      ? `${summary.fromDate} to ${summary.toDate}`
      : summary.fromDate || summary.date

  const totalMatched = summary.deposits.length
  const exactMatches = summary.deposits.filter(
    (m) => m.matchConfidence === 'exact'
  ).length
  const feeAdjusted = summary.deposits.filter(
    (m) => m.matchConfidence === 'fee-adjusted'
  ).length
  const matchedTotal = summary.deposits.reduce((s, m) => s + m.deposit.amount, 0)
  const unmatchedDepositCount = summary.unmatchedDeposits.length
  const unmatchedClearingCount = summary.unmatchedClearing.length

  const matchedRows = summary.deposits
    .map(
      (m) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #333">${m.deposit.date}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">$${m.deposit.amount.toFixed(2)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">${m.deposit.reference || '—'}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">${m.clearingTransactions.length} txn(s)</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">
            <span style="color:${m.matchConfidence === 'exact' ? '#4ade80' : '#fbbf24'}">${m.matchConfidence === 'exact' ? 'Exact' : `Fee $${m.impliedFee.toFixed(2)}`}</span>
          </td>
        </tr>`
    )
    .join('')

  const unmatchedDepositRows = summary.unmatchedDeposits
    .map(
      (d) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #333">${d.date}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">$${d.amount.toFixed(2)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">${d.reference || '—'}</td>
        </tr>`
    )
    .join('')

  const unmatchedClearingRows = summary.unmatchedClearing
    .map(
      (c) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #333">${c.date}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">$${c.amount.toFixed(2)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #333">${c.invoiceNumber || c.reference || '—'}</td>
        </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:700px;margin:0 auto;padding:32px 20px">
    <div style="margin-bottom:24px">
      <h1 style="color:#f7f2d3;font-size:22px;margin:0 0 4px">Clearing Reconciliation Report</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0">${dateRange} &bull; Tolerance: $${toleranceDollars.toFixed(2)}</p>
    </div>

    <!-- Summary stats -->
    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
      <div style="background:#1a1a1a;border:1px solid #334155;border-radius:8px;padding:16px;flex:1;min-width:120px">
        <div style="color:#94a3b8;font-size:12px">Matched</div>
        <div style="color:#4ade80;font-size:24px;font-weight:bold">${totalMatched}</div>
        <div style="color:#64748b;font-size:11px">${exactMatches} exact, ${feeAdjusted} fee-adjusted</div>
      </div>
      <div style="background:#1a1a1a;border:1px solid #334155;border-radius:8px;padding:16px;flex:1;min-width:120px">
        <div style="color:#94a3b8;font-size:12px">Matched Total</div>
        <div style="color:#fff;font-size:24px;font-weight:bold">$${matchedTotal.toFixed(2)}</div>
      </div>
      <div style="background:#1a1a1a;border:1px solid #334155;border-radius:8px;padding:16px;flex:1;min-width:120px">
        <div style="color:#94a3b8;font-size:12px">Unmatched</div>
        <div style="color:#fbbf24;font-size:24px;font-weight:bold">${unmatchedDepositCount + unmatchedClearingCount}</div>
        <div style="color:#64748b;font-size:11px">${unmatchedDepositCount} deposits, ${unmatchedClearingCount} clearing</div>
      </div>
    </div>

    ${totalMatched > 0 ? `
    <!-- Matched deposits -->
    <h2 style="color:#fff;font-size:16px;margin:0 0 8px">Matched Deposits (${totalMatched})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
      <thead>
        <tr style="color:#94a3b8;text-align:left">
          <th style="padding:6px 12px;border-bottom:1px solid #444">Date</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Amount</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Reference</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Clearing</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Match</th>
        </tr>
      </thead>
      <tbody>${matchedRows}</tbody>
    </table>
    ` : ''}

    ${unmatchedDepositCount > 0 ? `
    <!-- Unmatched deposits -->
    <h2 style="color:#fbbf24;font-size:16px;margin:0 0 8px">Unmatched Deposits (${unmatchedDepositCount})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
      <thead>
        <tr style="color:#94a3b8;text-align:left">
          <th style="padding:6px 12px;border-bottom:1px solid #444">Date</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Amount</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Reference</th>
        </tr>
      </thead>
      <tbody>${unmatchedDepositRows}</tbody>
    </table>
    ` : ''}

    ${unmatchedClearingCount > 0 ? `
    <!-- Unmatched clearing -->
    <h2 style="color:#fbbf24;font-size:16px;margin:0 0 8px">Unmatched Clearing Transactions (${unmatchedClearingCount})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
      <thead>
        <tr style="color:#94a3b8;text-align:left">
          <th style="padding:6px 12px;border-bottom:1px solid #444">Date</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Amount</th>
          <th style="padding:6px 12px;border-bottom:1px solid #444">Ref / Invoice</th>
        </tr>
      </thead>
      <tbody>${unmatchedClearingRows}</tbody>
    </table>
    ` : ''}

    <hr style="border:none;border-top:1px solid #333;margin:24px 0">
    <p style="color:#64748b;font-size:12px;margin:0">
      Sent by ${sentBy} via Black Health Intelligence &bull; ${new Date().toLocaleDateString('en-AU')}
    </p>
  </div>
</body>
</html>`
}
