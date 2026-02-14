'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useCallback } from 'react'

function getMessageText(m: { role: string; parts?: Array<{ type: string; text?: string }> }): string {
  return (m.parts ?? [])
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

export default function BudgetAssistant() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/budget/assistant',
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  const copyMessage = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const copyFullConversation = useCallback(async () => {
    const header = `Budget Assistant Report\nGenerated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}\n${'='.repeat(60)}\n\n`

    const body = messages
      .map(m => {
        const role = m.role === 'user' ? 'USER' : 'ASSISTANT'
        const text = getMessageText(m)
        return `[${role}]\n${text}`
      })
      .join('\n\n---\n\n')

    await navigator.clipboard.writeText(header + body)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }, [messages])

  const downloadConversation = useCallback(() => {
    const header = `Budget Assistant Report\nGenerated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}\n${'='.repeat(60)}\n\n`

    const body = messages
      .map(m => {
        const role = m.role === 'user' ? 'USER' : 'ASSISTANT'
        const text = getMessageText(m)
        return `[${role}]\n${text}`
      })
      .join('\n\n---\n\n')

    const blob = new Blob([header + body], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-report-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages])

  return (
    <div className="card">
      {/* Export buttons */}
      {messages.length > 0 && (
        <div className="flex gap-2 mb-4 print:hidden">
          <button
            onClick={copyFullConversation}
            className="px-3 py-1.5 text-xs bg-charcoal border border-silver-700/30 text-silver-300 rounded hover:bg-silver-700/20 transition-colors"
          >
            {copiedAll ? 'Copied!' : 'Copy All to Clipboard'}
          </button>
          <button
            onClick={downloadConversation}
            className="px-3 py-1.5 text-xs bg-charcoal border border-silver-700/30 text-silver-300 rounded hover:bg-silver-700/20 transition-colors"
          >
            Download as .txt
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs bg-charcoal border border-silver-700/30 text-silver-300 rounded hover:bg-silver-700/20 transition-colors"
          >
            Print
          </button>
        </div>
      )}

      <div ref={chatRef} className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-silver-400 text-sm">
            Try: &quot;Give me a budget update&quot; &bull; &quot;How much can I safely send to the ATO?&quot; &bull;
            &quot;Where can I cut spending?&quot; &bull; &quot;When will I be debt free?&quot; &bull;
            &quot;What business expenses am I paying personally?&quot; &bull;
            &quot;What&apos;s my cash flow next month?&quot; &bull;
            &quot;How much is Uber Eats costing me?&quot;
          </p>
        )}
        {messages.map((m) => {
          const text = getMessageText(m)
          return (
            <div
              key={m.id}
              className={`p-3 rounded-lg relative group ${
                m.role === 'user' ? 'bg-slate-blue/20 text-white ml-8' : 'bg-charcoal/50 text-silver-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-silver-500">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </div>
                {text && (
                  <button
                    onClick={() => copyMessage(m.id, text)}
                    className="text-xs text-silver-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                  >
                    {copiedId === m.id ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap">{text}</div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about spending, budgets, debts, cash flow, ATO..."
            disabled={status !== 'ready'}
            className="flex-1 bg-charcoal border border-silver-700/30 rounded px-4 py-2 text-white placeholder-silver-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status !== 'ready'}
            className="px-4 py-2 bg-slate-blue text-white rounded hover:bg-slate-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'streaming' || status === 'submitted' ? '\u2026' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
