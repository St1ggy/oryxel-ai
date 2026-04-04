import { describe, expect, it } from 'vitest'

import { getAiRouterPolicy } from './policy'

describe('getAiRouterPolicy', () => {
  it('supports newly added providers in order', () => {
    process.env.AI_ROUTER_PROVIDER_ORDER = 'qwen,perplexity,openai'

    const policy = getAiRouterPolicy()

    expect(policy.providerOrder).toEqual(['qwen', 'perplexity', 'openai'])
  })

  it('falls back to default provider order when env is invalid', () => {
    process.env.AI_ROUTER_PROVIDER_ORDER = 'unknown-provider'

    const policy = getAiRouterPolicy()

    expect(policy.providerOrder).toEqual(['openai', 'qwen', 'perplexity', 'anthropic', 'gemini'])
  })
})
