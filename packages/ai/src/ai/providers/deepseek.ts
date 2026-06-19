import { streamOpenAiCompatible } from '../streaming/openai-stream'
import { resolveModel } from '../../types/model-catalog'

import { buildPrompt, parseStructuredPatch } from './shared'

import type { AiProvider } from '../contracts'

export const deepseekProvider: AiProvider = {
  name: 'deepseek',
  async analyze(request, signal, apiKey, options) {
    const startedAt = Date.now()
    const model = resolveModel('deepseek', request.model)
    const content = await streamOpenAiCompatible({
      url: 'https://api.deepseek.com/v1/chat/completions',
      apiKey,
      signal,
      errorPrefix: 'DeepSeek',
      onPartial: options?.onPartial,
      onTokenProgress: options?.onTokenProgress,
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
      provider: 'deepseek',
      model,
      patch: parseStructuredPatch(content),
      latencyMs: Date.now() - startedAt,
    }
  },
}
