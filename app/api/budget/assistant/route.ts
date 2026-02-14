import { requireAdmin } from '@/lib/xero/auth'
import { budgetAssistantTools } from '@/lib/up/assistant-tools'
import { BUDGET_ASSISTANT_SYSTEM_PROMPT } from '@/lib/up/assistant-knowledge'
import { streamText } from 'ai'
import { budgetModel } from '@/lib/ai/gateway'
import { NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { messages } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array required' },
        { status: 400 }
      )
    }

    const result = streamText({
      model: budgetModel(),
      system: BUDGET_ASSISTANT_SYSTEM_PROMPT,
      messages,
      maxSteps: 5,
      tools: budgetAssistantTools,
    })

    return result.toDataStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[budget/assistant] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
