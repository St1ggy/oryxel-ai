import { type ProviderId, assertProvider } from './types'

import { env } from '$env/dynamic/private'

export function getPlatformKeyConfig(): { provider: ProviderId; key: string } | null {
  const provider = env.PLATFORM_AI_PROVIDER?.trim()
  const key = env.PLATFORM_AI_KEY?.trim()

  if (!provider || !key) return null

  try {
    assertProvider(provider)

    return { provider: provider as ProviderId, key }
  } catch {
    return null
  }
}

export function fallbackProviderKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case 'openai': {
      return env.OPENAI_API_KEY
    }

    case 'anthropic': {
      return env.ANTHROPIC_API_KEY
    }

    case 'gemini': {
      return env.GEMINI_API_KEY
    }

    case 'qwen': {
      return env.QWEN_API_KEY
    }

    case 'perplexity': {
      return env.PERPLEXITY_API_KEY
    }

    case 'groq': {
      return env.GROQ_API_KEY
    }

    case 'deepseek': {
      return env.DEEPSEEK_API_KEY
    }
  }
}

export function hasAnyFallbackKey(): boolean {
  return ['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek'].some((provider) =>
    Boolean(fallbackProviderKey(provider as ProviderId)?.trim()),
  )
}
