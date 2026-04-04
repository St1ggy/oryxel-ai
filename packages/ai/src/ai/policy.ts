import type { AiProviderName, AiRouterPolicy } from './contracts'

const providerNameSet = new Set<AiProviderName>([
  'openai',
  'anthropic',
  'gemini',
  'qwen',
  'perplexity',
  'groq',
  'deepseek',
])

function parseProviderOrder(raw: string | undefined): AiProviderName[] {
  if (!raw) {
    return ['groq', 'openai', 'qwen', 'deepseek', 'perplexity', 'anthropic', 'gemini']
  }

  const parsed = raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter((v): v is AiProviderName => providerNameSet.has(v as AiProviderName))

  return parsed.length > 0 ? parsed : ['groq', 'openai', 'qwen', 'deepseek', 'perplexity', 'anthropic', 'gemini']
}

export function getAiRouterPolicy(): AiRouterPolicy {
  return {
    timeoutMs: Number(process.env.AI_ROUTER_TIMEOUT_MS ?? 120_000),
    maxRetriesPerProvider: Number(process.env.AI_ROUTER_MAX_RETRIES ?? 0),
    maxAttemptsTotal: Number(process.env.AI_ROUTER_MAX_ATTEMPTS ?? 4),
    providerOrder: parseProviderOrder(process.env.AI_ROUTER_PROVIDER_ORDER),
  }
}
