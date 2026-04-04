import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider, AnalyzePreferencesRequest } from '../contracts'

import { env } from '$env/dynamic/private'

const MODEL = 'gemini-2.5-flash'

async function callGemini(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
  const model = env.GEMINI_MODEL ?? MODEL
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${buildPrompt(request)}\n\nReturn JSON only.` }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
      signal,
    },
  )

  if (!response.ok) {
    throw new Error(`Gemini error ${response.status}`)
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  return parseStructuredPatch(text)
}

export const geminiProvider: AiProvider = {
  name: 'gemini',
  async analyze(request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) {
    const startedAt = Date.now()
    const patch = await callGemini(request, signal, apiKey)

    return {
      provider: 'gemini',
      model: env.GEMINI_MODEL ?? MODEL,
      patch,
      latencyMs: Date.now() - startedAt,
    }
  },
}
