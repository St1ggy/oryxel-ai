import { streamOpenAiCompatible } from '../streaming/openai-stream'

import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider } from '../contracts'

const MODEL = 'llama-3.3-70b-versatile'

export const groqProvider: AiProvider = {
  name: 'groq',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = process.env.GROQ_MODEL ?? MODEL
    const content = await streamOpenAiCompatible({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      signal,
      errorPrefix: 'Groq',
      onPartial: options?.onPartial,
      body: {
        model,
        messages: [
          { role: 'system', content: 'Return valid JSON only.' },
          { role: 'user', content: buildPrompt(request) },
        ],
        // eslint-disable-next-line camelcase
        response_format: { type: 'json_object' },
        // eslint-disable-next-line camelcase
        max_tokens: 8192,
      },
    })

    return {
      provider: 'groq',
      model,
      patch: parseStructuredPatch(content),
      latencyMs: Date.now() - startedAt,
    }
  },
}
