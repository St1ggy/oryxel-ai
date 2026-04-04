import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider, AnalyzePreferencesRequest } from '../contracts'

const MODEL = 'claude-3-5-haiku-latest'

async function callAnthropic(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? MODEL,

      max_tokens: 8192,
      system: 'Return JSON only.',
      messages: [{ role: 'user', content: buildPrompt(request) }],
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Anthropic error ${response.status}`)
  }

  const json = (await response.json()) as {
    content?: { type: string; text?: string }[]
  }
  const text = json.content?.find((c) => c.type === 'text')?.text ?? '{}'

  return parseStructuredPatch(text)
}

export const anthropicProvider: AiProvider = {
  name: 'anthropic',
  async analyze(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
    const startedAt = Date.now()
    const patch = await callAnthropic(request, signal, apiKey)

    return {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL ?? MODEL,
      patch,
      latencyMs: Date.now() - startedAt,
    }
  },
}
