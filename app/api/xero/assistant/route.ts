import { requireAdmin } from '@/lib/xero/auth'
import { xeroAssistantTools } from '@/lib/xero/assistant-tools'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const { messages } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array required' },
        { status: 400 }
      )
    }

    const result = streamText({
      model: openai('gpt-4o'),
      system: `You are a Xero accounting assistant for Downscale (Australian telehealth clinic). Use the provided tools to answer questions about:
- Profit and Loss (P&L), Balance Sheet, Trial Balance
- Bank summary and cash flow
- Invoices (outstanding, overdue)
- Contacts (customers/suppliers)

When the user asks about P&L, balance sheet, trial balance, or bank summary, always call the relevant tool. Summarise results clearly in Australian dollars (AUD). Use Australian date format (DD/MM/YYYY) when mentioning dates.
Do not make up data — only use what the tools return.`,
      messages,
      maxSteps: 5,
      tools: xeroAssistantTools,
    })

    return result.toDataStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[xero/assistant] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
