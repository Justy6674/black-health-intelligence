import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const gateway = createOpenAICompatible({
  name: 'vercel-ai-gateway',
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY ?? '',
  baseURL: 'https://ai-gateway.vercel.sh/v1',
})

/**
 * Budget assistant — GPT-4o via Vercel AI Gateway.
 * Note: Anthropic models via the OpenAI-compatible endpoint don't support
 * tool calling properly with ai@4.x, so we use GPT-4o for both assistants.
 */
export function budgetModel() {
  return gateway('openai/gpt-4o')
}

/** Xero assistant — GPT-4o via Vercel AI Gateway */
export function xeroModel() {
  return gateway('openai/gpt-4o')
}
