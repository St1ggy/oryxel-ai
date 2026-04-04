import { listConfiguredProviderIds, listProviderApiKeyCandidates } from './keys/service'
import { getAiRouterPolicy } from './policy'
import { anthropicProvider } from './providers/anthropic'
import { deepseekProvider } from './providers/deepseek'
import { geminiProvider } from './providers/gemini'
import { groqProvider } from './providers/groq'
import { openaiProvider } from './providers/openai'
import { perplexityProvider } from './providers/perplexity'
import { qwenProvider } from './providers/qwen'
import { analyzePreferencesRequestSchema } from './schemas'

import type { AiProvider, AiProviderName, AiRouterResult, AnalyzePreferencesRequest } from './contracts'

const providers: Record<AiProviderName, AiProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  qwen: qwenProvider,
  perplexity: perplexityProvider,
  groq: groqProvider,
  deepseek: deepseekProvider,
}

async function callWithTimeout<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await work(controller.signal)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function tryProviderAttempt(input: {
  request: AnalyzePreferencesRequest
  providerName: AiProviderName
  apiKey: string
  timeoutMs: number
  startedAt: number
}) {
  const provider = providers[input.providerName]

  const result = await callWithTimeout(
    (signal) => provider.analyze(input.request, signal, input.apiKey),
    input.timeoutMs,
  )

  return {
    result,
    latencyMs: Date.now() - input.startedAt,
  }
}

function shouldRotateKey(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const httpStatusRegex = /\b(\d{3})\b/u
  const match = httpStatusRegex.exec(error.message)
  const status = Number(match?.[1] ?? Number.NaN)

  if (!Number.isFinite(status)) {
    return false
  }

  return status === 401 || status === 429 || status >= 500
}

function getOrderedProviders(policyOrder: AiProviderName[], preferredProvider?: AiProviderName): AiProviderName[] {
  if (!preferredProvider) {
    return policyOrder
  }

  const withoutPreferred = policyOrder.filter((provider) => provider !== preferredProvider)

  return [preferredProvider, ...withoutPreferred]
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function analyzePreferences(rawInput: unknown): Promise<AiRouterResult> {
  const request = analyzePreferencesRequestSchema.parse(rawInput) as AnalyzePreferencesRequest
  const policy = getAiRouterPolicy()
  const attempts: AiRouterResult['attempts'] = []

  const configuredIds = await listConfiguredProviderIds(request.userId)

  if (configuredIds.length === 0) {
    throw new Error('No AI providers configured')
  }

  // Sort configured providers by policy preference; providers not in policy come last
  const policyOrdered = policy.providerOrder.filter((p) => configuredIds.includes(p))
  const notInPolicy = configuredIds.filter((p) => !policy.providerOrder.includes(p))
  const providerOrder = getOrderedProviders([...policyOrdered, ...notInPolicy], request.preferredProvider)

  let totalAttempts = 0

  for (const providerName of providerOrder) {
    const keyPool = await listProviderApiKeyCandidates(request.userId, providerName, 5)

    if (keyPool.length === 0) {
      attempts.push({
        provider: providerName,
        ok: false,
        latencyMs: 0,
        error: `${providerName} API key is not configured`,
      })
      continue
    }

    for (let retryIndex = 0; retryIndex <= policy.maxRetriesPerProvider; retryIndex += 1) {
      if (totalAttempts >= policy.maxAttemptsTotal) {
        break
      }

      for (let keyIndex = 0; keyIndex < keyPool.length; keyIndex += 1) {
        if (totalAttempts >= policy.maxAttemptsTotal) {
          break
        }

        totalAttempts += 1
        const startedAt = Date.now()
        const candidate = keyPool[keyIndex]

        try {
          const { result, latencyMs } = await tryProviderAttempt({
            request,
            providerName,
            apiKey: candidate.key,
            timeoutMs: policy.timeoutMs,
            startedAt,
          })

          attempts.push({
            provider: providerName,
            ok: true,
            latencyMs,
            keyLabel: candidate.label,
            keySource: candidate.source,
          })

          return { result, attempts }
        } catch (error) {
          const rotate = shouldRotateKey(error) && keyIndex < keyPool.length - 1

          attempts.push({
            provider: providerName,
            ok: false,
            latencyMs: Date.now() - startedAt,
            keyLabel: candidate.label,
            keySource: candidate.source,
            error: error instanceof Error ? error.message : 'Unknown router error',
          })

          if (rotate) {
            continue
          }

          break
        }
      }
    }
  }

  const summary = attempts.map((a) => `${a.provider}: ${a.ok ? 'ok' : (a.error ?? 'failed')}`).join(', ')

  console.error('[ai-router] All providers failed:', summary)

  throw new Error(`All AI providers failed. Attempts: ${summary}`)
}
