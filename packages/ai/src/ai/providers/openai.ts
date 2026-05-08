import { streamOpenAiCompatible } from '../streaming/openai-stream'

import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider } from '../contracts'

const MODEL = 'gpt-5-mini'

export const openaiProvider: AiProvider = {
  name: 'openai',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = process.env.OPENAI_MODEL ?? MODEL
    const content = await streamOpenAiCompatible({
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey,
      signal,
      errorPrefix: 'OpenAI',
      onPartial: options?.onPartial,
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
