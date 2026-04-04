import type { analyzePreferencesRequestSchema, structuredPreferencePatchSchema, tableOperationSchema } from './schemas'
import type { z } from 'zod'

export type AnalyzePreferencesRequest = z.infer<typeof analyzePreferencesRequestSchema>
export type TableOperation = z.infer<typeof tableOperationSchema>
export type StructuredPreferencePatch = z.infer<typeof structuredPreferencePatchSchema>

export type AiProviderName = 'openai' | 'anthropic' | 'gemini' | 'qwen' | 'perplexity' | 'groq' | 'deepseek'

export type AiProviderResult = {
  provider: AiProviderName
  model: string
  rawText?: string
  patch: StructuredPreferencePatch
  latencyMs: number
}

export type AiProvider = {
  name: AiProviderName
  analyze: (request: AnalyzePreferencesRequest, signal: AbortSignal, apiKey: string) => Promise<AiProviderResult>
}

export type AiRouterPolicy = {
  timeoutMs: number
  maxRetriesPerProvider: number
  maxAttemptsTotal: number
  providerOrder: AiProviderName[]
}

export type AiRouterResult = {
  result: AiProviderResult
  attempts: {
    provider: AiProviderName
    ok: boolean
    latencyMs: number
    keySource?: 'user' | 'env' | 'platform'
    keyLabel?: string
    error?: string
  }[]
}
