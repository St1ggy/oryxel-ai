import { listConfiguredProviderIds, listProviderApiKeyCandidates } from '../ai/keys/service'
import { getAiRouterPolicy } from '../ai/policy'

import type { AiProviderName } from '../ai/contracts'

/** Phrase index → English phrase.  Input encoding for the translate prompt. */
type IndexedPhrases = Record<string, string>

const OPENAI_COMPAT_URLS: Partial<Record<AiProviderName, string>> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  perplexity: 'https://api.perplexity.ai/chat/completions',
}

function modelForProvider(name: AiProviderName): string {
  switch (name) {
    case 'openai': {
      return process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    }

    case 'groq': {
      return process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
    }

    case 'qwen': {
      return process.env.QWEN_MODEL ?? 'qwen-plus'
    }

    case 'deepseek': {
      return process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'
    }

    case 'perplexity': {
      return process.env.PERPLEXITY_MODEL ?? 'sonar-pro'
    }

    case 'anthropic': {
      return process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest'
    }

    case 'gemini': {
      return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
    }
  }
}

function languageForLocale(locale: string): string {
  if (locale.startsWith('es')) return 'Spanish'

  if (locale.startsWith('fr')) return 'French'

  if (locale === 'ru') return 'Russian'

  if (locale.startsWith('jp') || locale.startsWith('ja')) return 'Japanese'

  if (locale.startsWith('zh')) return 'Chinese'

  return locale
}

function buildTranslatePrompt(indexed: IndexedPhrases, locale: string): string {
  const language = languageForLocale(locale)

  return [
    `Translate these fragrance-related phrases to ${language}.`,
    'Return a JSON object with the same numeric string keys and translated string values.',
    'No extra text outside the JSON.',
    JSON.stringify(indexed),
  ].join('\n')
}

async function callOpenAICompat(url: string, model: string, prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      // eslint-disable-next-line camelcase
      response_format: { type: 'json_object' },
      // eslint-disable-next-line camelcase
      max_tokens: 2048,
    }),
  })

  if (!response.ok) throw new Error(`${url.split('/')[2]} error ${response.status}`)

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] }

  return json.choices?.[0]?.message?.content ?? '{}'
}

async function callAnthropic(model: string, prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      // eslint-disable-next-line camelcase
      max_tokens: 2048,
      system: 'Return JSON only.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Anthropic error ${response.status}`)

  const json = (await response.json()) as { content?: { type: string; text?: string }[] }

  return json.content?.find((c) => c.type === 'text')?.text ?? '{}'
}

async function callGemini(model: string, prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nReturn JSON only.` }] }],

        generationConfig: { maxOutputTokens: 2048 },
      }),
    },
  )

  if (!response.ok) throw new Error(`Gemini error ${response.status}`)

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
}

async function callProvider(providerName: AiProviderName, prompt: string, apiKey: string): Promise<string> {
  const model = modelForProvider(providerName)

  if (providerName === 'anthropic') return callAnthropic(model, prompt, apiKey)

  if (providerName === 'gemini') return callGemini(model, prompt, apiKey)

  const url = OPENAI_COMPAT_URLS[providerName]

  if (!url) throw new Error(`No URL for provider ${providerName}`)

  return callOpenAICompat(url, model, prompt, apiKey)
}

function parseTranslationResponse(raw: string, phrases: string[]): Map<string, string> {
  const result = new Map<string, string>()

  let parsed: Record<string, unknown>

  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return result
  }

  for (const [indexString, value] of Object.entries(parsed)) {
    const index = Number(indexString)

    if (Number.isNaN(index) || index < 0 || index >= phrases.length) continue

    if (typeof value !== 'string' || value.length === 0) continue

    const original = phrases[index]

    if (original) result.set(original, value)
  }

  return result
}

// Translates a batch of English phrases into the target locale using
// the first available AI provider configured for the user.
// Returns a Map of English phrase → translated phrase.
// Returns an empty map if all providers fail or locale === 'en'.
export async function translateBatch(userId: string, phrases: string[], locale: string): Promise<Map<string, string>> {
  if (phrases.length === 0 || locale === 'en') return new Map()

  const policy = getAiRouterPolicy()
  const configuredIds = await listConfiguredProviderIds(userId)

  if (configuredIds.length === 0) {
    console.warn('[translate] No AI providers configured for user')

    return new Map()
  }

  // Mirror analyzePreferences: policy-ordered providers first, then any configured-but-out-of-policy ones
  const policyOrdered = policy.providerOrder.filter((p) => configuredIds.includes(p))
  const notInPolicy = configuredIds.filter((p) => !policy.providerOrder.includes(p))
  const providerOrder: AiProviderName[] = [...policyOrdered, ...notInPolicy]

  const indexed: IndexedPhrases = Object.fromEntries(phrases.map((p, index) => [String(index), p]))
  const prompt = buildTranslatePrompt(indexed, locale)

  for (const providerName of providerOrder) {
    const candidates = await listProviderApiKeyCandidates(userId, providerName, 1)

    if (candidates.length === 0) continue

    const candidate = candidates[0]

    try {
      const raw = await callProvider(providerName, prompt, candidate.key)

      return parseTranslationResponse(raw, phrases)
    } catch (error) {
      console.error(`[translate] ${providerName} failed:`, error instanceof Error ? error.message : error)
    }
  }

  console.warn('[translate] All providers failed for translation batch')

  return new Map()
}
