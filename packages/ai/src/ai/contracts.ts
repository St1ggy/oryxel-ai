import type {
  agentMemoryOpSchema,
  analyzePreferencesRequestSchema,
  listOpSchema,
  structuredPreferencePatchSchema,
  tableOperationSchema,
} from './schemas.js'
import type { z } from 'zod'

export type AnalyzePreferencesRequest = z.infer<typeof analyzePreferencesRequestSchema>
export type TableOperation = z.infer<typeof tableOperationSchema>
export type AgentMemoryOp = z.infer<typeof agentMemoryOpSchema>
export type ListOp = z.infer<typeof listOpSchema>
export type StructuredPreferencePatch = z.infer<typeof structuredPreferencePatchSchema>

export type AiProviderName = 'openai' | 'anthropic' | 'gemini' | 'qwen' | 'perplexity' | 'groq' | 'deepseek'

export type AiProviderResult = {
  provider: AiProviderName
  model: string
  rawText?: string
  patch: StructuredPreferencePatch
  latencyMs: number
}

export type AiCallOptions = {
  /** Called repeatedly with partial parsed JSON during streaming. Providers without streaming may ignore. */
  onPartial?: (partial: Partial<StructuredPreferencePatch>) => void
  /** Called periodically while streaming with an approx tokens-emitted count and elapsed time. */
  onTokenProgress?: (info: { tokensOut: number; durationMs: number }) => void
}

export type AiProvider = {
  name: AiProviderName
  analyze: (
    request: AnalyzePreferencesRequest,
    signal: AbortSignal,
    apiKey: string,
    options?: AiCallOptions,
  ) => Promise<AiProviderResult>
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
