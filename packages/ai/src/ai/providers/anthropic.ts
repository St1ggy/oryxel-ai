import { streamAnthropic } from '../streaming/anthropic-stream'

import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider } from '../contracts'

const MODEL = 'claude-3-5-haiku-latest'

export const anthropicProvider: AiProvider = {
  name: 'anthropic',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = process.env.ANTHROPIC_MODEL ?? MODEL
    const text = await streamAnthropic({
      apiKey,
      signal,
      onPartial: options?.onPartial,
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
