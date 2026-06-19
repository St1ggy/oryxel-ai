import { resolveModel } from '../../types/model-catalog.js'
import { streamOpenAiCompatible } from '../streaming/openai-stream.js'

import { buildPrompt, parseStructuredPatch } from './shared.js'

import type { AiProvider } from '../contracts.js'

export const openaiProvider: AiProvider = {
  name: 'openai',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = resolveModel('openai', request.model)
    const content = await streamOpenAiCompatible({
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey,
      signal,
      errorPrefix: 'OpenAI',
      onPartial: options?.onPartial,
      onTokenProgress: options?.onTokenProgress,
      body: {
        model,
        messages: [
          { role: 'system', content: 'Return valid JSON only.' },
          { role: 'user', content: buildPrompt(request) },
        ],

        response_format: { type: 'json_object' },

        max_tokens: 8192,
      },
    })

    return {
      provider: 'openai',
      model,
      patch: parseStructuredPatch(content),
      latencyMs: Date.now() - startedAt,
    }
  },
}
