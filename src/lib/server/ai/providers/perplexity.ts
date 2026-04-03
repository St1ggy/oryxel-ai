import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider, AnalyzePreferencesRequest } from '../contracts'

import { env } from '$env/dynamic/private'

const MODEL = 'sonar-pro'

async function callPerplexity(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.PERPLEXITY_MODEL ?? MODEL,
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: buildPrompt(request) },
      ],
      // eslint-disable-next-line camelcase
      response_format: { type: 'json_object' },
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Perplexity error ${response.status}`)
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = json.choices?.[0]?.message?.content ?? '{}'

  return parseStructuredPatch(content)
}

export const perplexityProvider: AiProvider = {
  name: 'perplexity',
  async analyze(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
    const startedAt = Date.now()
    const patch = await callPerplexity(request, signal, apiKey)

    return {
      provider: 'perplexity',
      model: env.PERPLEXITY_MODEL ?? MODEL,
      patch,
      latencyMs: Date.now() - startedAt,
    }
  },
}
