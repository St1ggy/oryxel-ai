import type { AiProviderName } from '../ai/contracts.js'

export type ModelCatalogEntry = {
  id: string
  label: string
}

const OPENAI_MODELS: ModelCatalogEntry[] = [
  { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
]

const ANTHROPIC_MODELS: ModelCatalogEntry[] = [
  { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
]

const GEMINI_MODELS: ModelCatalogEntry[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
]

const GROQ_MODELS: ModelCatalogEntry[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
]

const DEEPSEEK_MODELS: ModelCatalogEntry[] = [
  { id: 'deepseek-chat', label: 'DeepSeek Chat' },
  { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
]

const QWEN_MODELS: ModelCatalogEntry[] = [
  { id: 'qwen-plus', label: 'Qwen Plus' },
  { id: 'qwen-turbo', label: 'Qwen Turbo' },
]

const PERPLEXITY_MODELS: ModelCatalogEntry[] = [
  { id: 'sonar-pro', label: 'Sonar Pro' },
  { id: 'sonar', label: 'Sonar' },
]

export const MODEL_CATALOG: Record<AiProviderName, ModelCatalogEntry[]> = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  gemini: GEMINI_MODELS,
  groq: GROQ_MODELS,
  deepseek: DEEPSEEK_MODELS,
  qwen: QWEN_MODELS,
  perplexity: PERPLEXITY_MODELS,
}

const DEFAULT_MODELS: Record<AiProviderName, string> = {
  openai: 'gpt-5-mini',
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  qwen: 'qwen-plus',
  perplexity: 'sonar-pro',
}

const ENV_MODEL_KEYS: Record<AiProviderName, string> = {
  openai: 'OPENAI_MODEL',
  anthropic: 'ANTHROPIC_MODEL',
  gemini: 'GEMINI_MODEL',
  groq: 'GROQ_MODEL',
  deepseek: 'DEEPSEEK_MODEL',
  qwen: 'QWEN_MODEL',
  perplexity: 'PERPLEXITY_MODEL',
}

export function getDefaultModel(provider: AiProviderName) {
  return DEFAULT_MODELS[provider]
}

export function resolveModel(provider: AiProviderName, override?: string | null) {
  if (override?.trim()) {
    return override.trim()
  }

  const envKey = ENV_MODEL_KEYS[provider]
  const envValue = process.env[envKey]?.trim()

  if (envValue) {
    return envValue
  }

  return getDefaultModel(provider)
}

export function getModelLabel(provider: AiProviderName, modelId: string) {
  const entry = MODEL_CATALOG[provider].find((model) => model.id === modelId)

  return entry?.label ?? modelId
}

export function getModelsForProvider(provider: AiProviderName) {
  return MODEL_CATALOG[provider]
}
