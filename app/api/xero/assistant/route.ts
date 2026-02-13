import { requireAdmin } from '@/lib/xero/auth'
import { xeroAssistantTools } from '@/lib/xero/assistant-tools'
import { XERO_ASSISTANT_SYSTEM_PROMPT } from '@/lib/xero/assistant-knowledge'
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
      system: XERO_ASSISTANT_SYSTEM_PROMPT,
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
