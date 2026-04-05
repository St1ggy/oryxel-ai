export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'qwen' | 'perplexity' | 'groq' | 'deepseek'

export type ProviderKeyListItem = {
  id: number
  provider: ProviderId
  label: string
  active: boolean
  keyHint: string
}

export type ProviderApiKeyCandidate = {
  key: string
  source: 'user' | 'env' | 'platform'
  keyId: number | null
  label: string
  isDefault: boolean
}

export type ConfiguredProvider = {
  id: ProviderId
  source: 'user' | 'env' | 'platform'
}

export const DEFAULT_LABEL_BY_PROVIDER: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  qwen: 'Qwen',
  perplexity: 'Perplexity',
  groq: 'Groq',
  deepseek: 'DeepSeek',
}

export const ALL_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek']

export function toKeyHint(rawKey: string): string {
  const normalized = rawKey.trim()

  if (normalized.length <= 4) {
    return '••••'
  }

  return `••••${normalized.slice(-4)}`
}

export function assertProvider(provider: string): asserts provider is ProviderId {
  if (!ALL_PROVIDERS.includes(provider as ProviderId)) {
    throw new Error(`Unsupported provider: ${provider}`)
  }
}
