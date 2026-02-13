'use client'

import Link from 'next/link'
import { useChat } from '@ai-sdk/react'

export default function XeroAssistantPage() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/xero/assistant',
  })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-silver-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Xero AI Assistant</h1>
          <p className="text-silver-400 text-sm">
            Ask about P&L, balance sheet, invoices, Halaxy-Xero sync, clearing accounts
          </p>
        </div>
      </div>

      <div className="card">
        <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-silver-400 text-sm">
              Try: &quot;What&apos;s my P&L for this quarter?&quot; &bull; &quot;Show overdue invoices&quot; &bull;
              &quot;How does Halaxy sync to Xero?&quot; &bull; &quot;Explain the clearing account pattern&quot; &bull;
              &quot;Why might I see duplicate payments?&quot;
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-lg ${
                m.role === 'user' ? 'bg-slate-blue/20 text-white ml-8' : 'bg-charcoal/50 text-silver-300'
              }`}
            >
              <div className="text-xs font-medium text-silver-500 mb-1">
                {m.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {m.parts
                  ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map((p, i) => (
                    <span key={i}>{p.text}</span>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your Xero data..."
              disabled={status !== 'ready'}
              className="flex-1 bg-charcoal border border-silver-700/30 rounded px-4 py-2 text-white placeholder-silver-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status !== 'ready'}
              className="px-4 py-2 bg-slate-blue text-white rounded hover:bg-slate-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'streaming' || status === 'submitted' ? '…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
