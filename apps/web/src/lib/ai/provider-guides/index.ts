import { anthropic } from './anthropic'
import { deepseek } from './deepseek'
import { gemini } from './gemini'
import { groq } from './groq'
import { openai } from './openai'
import { perplexity } from './perplexity'
import { qwen } from './qwen'

export type { ProviderGuide, ProviderGuideId } from './types'

export const PROVIDER_GUIDES = { openai, anthropic, gemini, qwen, perplexity, groq, deepseek }

export const PROVIDER_DISPLAY_NAME: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  qwen: 'Qwen',
  perplexity: 'Perplexity',
  groq: 'Groq',
  deepseek: 'DeepSeek',
}

export function getProviderGuideLocalized(id: string, locale: string): { steps: string[]; notes: string[] } {
  const guide = PROVIDER_GUIDES[id as keyof typeof PROVIDER_GUIDES]

  if (!guide) return { steps: [], notes: [] }

  const lang = locale in guide.steps ? locale : 'en'

  return { steps: guide.steps[lang] ?? guide.steps['en'], notes: guide.notes[lang] ?? guide.notes['en'] }
}
