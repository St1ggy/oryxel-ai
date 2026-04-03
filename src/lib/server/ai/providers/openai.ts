import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider, AnalyzePreferencesRequest } from '../contracts'

import { env } from '$env/dynamic/private'

const MODEL = 'gpt-5-mini'

async function callOpenAI(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? MODEL,
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: buildPrompt(request) },
      ],
      response_format: { type: 'json_object' },
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}`)
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = json.choices?.[0]?.message?.content ?? '{}'

  return parseStructuredPatch(content)
}

export const openaiProvider: AiProvider = {
  name: 'openai',
  async analyze(request, signal, apiKey) {
    const startedAt = Date.now()
    const patch = await callOpenAI(request, signal, apiKey)

    return {
      provider: 'openai',
      model: env.OPENAI_MODEL ?? MODEL,
      patch,
      latencyMs: Date.now() - startedAt,
    }
  },
}
