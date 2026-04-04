import type { ProviderGuideId } from './provider-guides'

export type ProviderPlanKind = 'free' | 'paid'

export function providerPlanKind(provider: ProviderGuideId | string): ProviderPlanKind {
  switch (provider) {
    case 'gemini': {
      return 'free'
    }

    case 'qwen': {
      return 'free'
    }

    case 'groq': {
      return 'free'
    }

    case 'deepseek': {
      return 'free'
    }
    default: {
      return 'paid'
    }
  }
}
