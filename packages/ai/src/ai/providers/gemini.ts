import { resolveModel } from '../../types/model-catalog.js'
import { streamGemini } from '../streaming/gemini-stream.js'

import { buildPrompt, parseStructuredPatch } from './shared.js'

import type { AiProvider } from '../contracts.js'

export const geminiProvider: AiProvider = {
  name: 'gemini',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = resolveModel('gemini', request.model)
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
