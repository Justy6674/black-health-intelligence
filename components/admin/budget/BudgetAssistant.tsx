'use client'

import { useChat } from '@ai-sdk/react'

export default function BudgetAssistant() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/budget/assistant',
  })

  return (
    <div className="card">
      <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-silver-400 text-sm">
            Try: &quot;What did I spend the most on this month?&quot; &bull; &quot;Am I over budget on dining?&quot; &bull;
            &quot;Compare my spending to last month&quot; &bull; &quot;What are my account balances?&quot; &bull;
            &quot;Show me all Uber charges&quot; &bull; &quot;What&apos;s my monthly surplus?&quot; &bull;
            &quot;What business expenses am I paying personally?&quot; &bull;
            &quot;What debts do I have?&quot; &bull; &quot;When will I be debt free?&quot; &bull;
            &quot;What&apos;s my cash flow next month?&quot;
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
            placeholder="Ask about spending, budgets, debts, cash flow..."
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
