import { tool } from 'ai'
import { z } from 'zod'
import {
  getProfitAndLoss,
  getBalanceSheet,
  getTrialBalance,
  getBankSummary,
  listInvoices,
  listContacts,
  getOrganisation,
} from './client'

// ── Helpers to condense Xero report JSON ──

function summariseReportRows(
  data: Record<string, unknown>,
  maxSections = 8,
  maxRowsPerSection = 12
): string {
  const reports = (data.Reports as Array<Record<string, unknown>>) ?? []
  const parts: string[] = []

  for (const report of reports.slice(0, 1)) {
    const rows = (report.Rows as Array<Record<string, unknown>>) ?? []
    let sectionTitle = ''
    let sectionRows: string[] = []

    for (const row of rows) {
      const rowType = row.RowType as string
      const title = row.Title as string
      const cells = (row.Cells as Array<{ Value?: string }>) ?? []
      const values = cells.map((c) => c.Value ?? '').filter(Boolean)

      if (rowType === 'Section' && title) {
        if (sectionRows.length > 0) {
          parts.push(`${sectionTitle}\n${sectionRows.slice(0, maxRowsPerSection).join('\n')}`)
        }
        sectionTitle = String(title)
        sectionRows = []
      } else if ((rowType === 'Row' || rowType === 'SummaryRow') && values.length >= 2) {
        const label = values[0]
        const amount = values.slice(1).join(' | ')
        if (label && amount) sectionRows.push(`  ${label}: ${amount}`)
      }
    }
    if (sectionRows.length > 0) {
      parts.push(`${sectionTitle}\n${sectionRows.slice(0, maxRowsPerSection).join('\n')}`)
    }
  }

  return parts.slice(0, maxSections).join('\n\n') || JSON.stringify(data).slice(0, 1500)
}

function summariseInvoices(data: Record<string, unknown>): string {
  const invoices = (data.Invoices as Array<Record<string, unknown>>) ?? []
  if (invoices.length === 0) return 'No invoices found.'
  const lines = invoices.slice(0, 25).map((inv) => {
    const num = inv.InvoiceNumber ?? inv.Number ?? '?'
    const status = inv.Status ?? '?'
    const total = inv.Total ?? 0
    const due = inv.DueDate ? String(inv.DueDate).slice(0, 10) : ''
    const contact = (inv.Contact as Record<string, unknown>)?.Name ?? ''
    return `#${num} | ${status} | $${Number(total).toFixed(2)} | Due ${due} | ${contact}`
  })
  const total = invoices.reduce((s, i) => s + Number(i.Total ?? 0), 0)
  return lines.join('\n') + `\n\n(${invoices.length} invoice(s), total $${total.toFixed(2)})`
}

function summariseContacts(data: Record<string, unknown>): string {
  const contacts = (data.Contacts as Array<Record<string, unknown>>) ?? []
  if (contacts.length === 0) return 'No contacts found.'
  const lines = contacts.slice(0, 30).map((c) => {
    const name = c.Name ?? '?'
    const email = (c.EmailAddress as string) ?? ''
    return `- ${name}${email ? ` (${email})` : ''}`
  })
  return lines.join('\n') + `\n\n(${contacts.length} contact(s) total)`
}

// ── Tool definitions ──

export const xeroAssistantTools = {
  getProfitAndLoss: tool({
    description:
      'Get the Profit and Loss (P&L) report for a date range. Use for questions about revenue, expenses, profit.',
    parameters: z.object({
      fromDate: z
        .string()
        .optional()
        .describe('Start date YYYY-MM-DD (e.g. 2025-10-01 for Q4)'),
      toDate: z
        .string()
        .optional()
        .describe('End date YYYY-MM-DD (e.g. 2025-12-31 for Q4)'),
    }),
    execute: async ({ fromDate, toDate }) => {
      const data = await getProfitAndLoss(fromDate, toDate)
      return summariseReportRows(data)
    },
  }),

  getBalanceSheet: tool({
    description:
      'Get the Balance Sheet report as at a specific date. Shows assets, liabilities, equity.',
    parameters: z.object({
      date: z
        .string()
        .optional()
        .describe('Date YYYY-MM-DD (defaults to current month end)'),
    }),
    execute: async ({ date }) => {
      const data = await getBalanceSheet(date)
      return summariseReportRows(data)
    },
  }),

  getTrialBalance: tool({
    description:
      'Get the Trial Balance report as at a date. Shows all account balances to verify books balance.',
    parameters: z.object({
      date: z
        .string()
        .optional()
        .describe('Date YYYY-MM-DD (defaults to current)'),
    }),
    execute: async ({ date }) => {
      const data = await getTrialBalance(date)
      return summariseReportRows(data)
    },
  }),

  getBankSummary: tool({
    description:
      'Get the Bank Summary report - balances and cash movements for each bank account.',
    parameters: z.object({
      fromDate: z.string().optional().describe('Start date YYYY-MM-DD'),
      toDate: z.string().optional().describe('End date YYYY-MM-DD'),
    }),
    execute: async ({ fromDate, toDate }) => {
      const data = await getBankSummary(fromDate, toDate)
      return summariseReportRows(data)
    },
  }),

  listInvoices: tool({
    description:
      'List invoices. Use status AUTHORISED for outstanding, or filter by overdue with a where clause.',
    parameters: z.object({
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED'])
        .optional()
        .describe('Invoice status filter'),
      where: z
        .string()
        .optional()
        .describe(
          'Xero where filter e.g. Status=="AUTHORISED" AND DueDate<DateTime(2025,2,1) for overdue'
        ),
    }),
    execute: async ({ status, where }) => {
      const data = await listInvoices({ status, where })
      return summariseInvoices(data)
    },
  }),

  listContacts: tool({
    description: 'List contacts (customers and suppliers).',
    parameters: z.object({
      where: z.string().optional().describe('Optional Xero where filter'),
    }),
    execute: async ({ where }) => {
      const data = await listContacts({ where })
      return summariseContacts(data)
    },
  }),

  getOrganisation: tool({
    description: 'Get organisation details (name, legal name, base currency).',
    parameters: z.object({}),
    execute: async () => {
      const data = await getOrganisation()
      const orgs = (data.Organisations as Array<Record<string, unknown>>) ?? []
      const o = orgs[0]
      if (!o) return 'Organisation details not found.'
      return `Name: ${o.Name ?? '?'}\nLegal Name: ${o.LegalName ?? '?'}\nBase Currency: ${o.BaseCurrency ?? '?'}\nCountry: ${o.CountryCode ?? '?'}`
    },
  }),
}
