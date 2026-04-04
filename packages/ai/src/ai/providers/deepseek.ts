import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider, AnalyzePreferencesRequest } from '../contracts'

const MODEL = 'deepseek-chat'

async function callDeepSeek(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? MODEL,
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: buildPrompt(request) },
      ],
      // eslint-disable-next-line camelcase
      response_format: { type: 'json_object' },
      // eslint-disable-next-line camelcase
      max_tokens: 8192,
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`DeepSeek error ${response.status}`)
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = json.choices?.[0]?.message?.content ?? '{}'

  return parseStructuredPatch(content)
}

export const deepseekProvider: AiProvider = {
  name: 'deepseek',
  async analyze(request, signal, apiKey) {
    const startedAt = Date.now()
    const patch = await callDeepSeek(request, signal, apiKey)

    return {
      provider: 'deepseek',
      model: process.env.DEEPSEEK_MODEL ?? MODEL,
      patch,
      latencyMs: Date.now() - startedAt,
    }
  },
}
