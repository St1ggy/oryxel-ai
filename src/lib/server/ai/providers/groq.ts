import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider, AnalyzePreferencesRequest } from '../contracts'

import { env } from '$env/dynamic/private'

const MODEL = 'llama-3.3-70b-versatile'

async function callGroq(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL ?? MODEL,
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
    throw new Error(`Groq error ${response.status}`)
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = json.choices?.[0]?.message?.content ?? '{}'

  return parseStructuredPatch(content)
}

export const groqProvider: AiProvider = {
  name: 'groq',
  async analyze(request, signal, apiKey) {
    const startedAt = Date.now()
    const patch = await callGroq(request, signal, apiKey)

    return {
      provider: 'groq',
      model: env.GROQ_MODEL ?? MODEL,
      patch,
      latencyMs: Date.now() - startedAt,
    }
  },
}
