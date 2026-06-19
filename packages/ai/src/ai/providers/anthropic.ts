import { streamAnthropic } from '../streaming/anthropic-stream'
import { resolveModel } from '../../types/model-catalog'

import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider } from '../contracts'

export const anthropicProvider: AiProvider = {
  name: 'anthropic',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = resolveModel('anthropic', request.model)
    const text = await streamAnthropic({
      apiKey,
      signal,
      onPartial: options?.onPartial,
      onTokenProgress: options?.onTokenProgress,
      body: {
        model,

        max_tokens: 8192,
        system: 'Return JSON only.',
        messages: [{ role: 'user', content: buildPrompt(request) }],
      },
    })

    return {
      provider: 'anthropic',
      model,
      patch: parseStructuredPatch(text),
      latencyMs: Date.now() - startedAt,
    }
  },
}
