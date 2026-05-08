import { streamGemini } from '../streaming/gemini-stream'

import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider } from '../contracts'

const MODEL = 'gemini-2.5-flash'

export const geminiProvider: AiProvider = {
  name: 'gemini',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = process.env.GEMINI_MODEL ?? MODEL
    const text = await streamGemini({
      model,
      apiKey,
      signal,
      onPartial: options?.onPartial,
      onTokenProgress: options?.onTokenProgress,
      body: {
        contents: [{ parts: [{ text: `${buildPrompt(request)}\n\nReturn JSON only.` }] }],
        generationConfig: { maxOutputTokens: 8192 },
      },
    })

    return {
      provider: 'gemini',
      model,
      patch: parseStructuredPatch(text),
      latencyMs: Date.now() - startedAt,
    }
  },
}
