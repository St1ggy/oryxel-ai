import { tryParsePartial } from './partial-json'
import { readSseEvents } from './sse'

import type { StructuredPreferencePatch } from '../contracts'

const PARTIAL_EMIT_INTERVAL_MS = 1000

export type OpenAiCompatStreamInput = {
  url: string
  apiKey: string
  body: Record<string, unknown>
  signal: AbortSignal
  errorPrefix: string
  onPartial?: (partial: Partial<StructuredPreferencePatch>) => void
  onTokenProgress?: (info: { tokensOut: number; durationMs: number }) => void
  extraHeaders?: Record<string, string>
}

/** Streams an OpenAI-compatible chat completion (openai, groq, deepseek). Returns the full content text. */
export async function streamOpenAiCompatible(input: OpenAiCompatStreamInput) {
  const response = await fetch(input.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${input.apiKey}`,
      ...input.extraHeaders,
    },
    body: JSON.stringify({ ...input.body, stream: true }),
    signal: input.signal,
  })

  if (!response.ok) {
    throw new Error(`${input.errorPrefix} error ${response.status}`)
  }

  if (!response.body) {
    throw new Error(`${input.errorPrefix} empty stream body`)
  }

  const startedAt = Date.now()
  let buffer = ''
  let lastEmit = 0

  for await (const data of readSseEvents(response.body, input.signal)) {
    if (data === '[DONE]') break

    let parsed: { choices?: { delta?: { content?: string } }[] }

    try {
      parsed = JSON.parse(data) as typeof parsed
    } catch {
      continue
    }

    const delta = parsed.choices?.[0]?.delta?.content

    if (!delta) continue

    buffer += delta

    const now = Date.now()

    if (now - lastEmit >= PARTIAL_EMIT_INTERVAL_MS) {
      if (input.onPartial) emitPartial(buffer, input.onPartial)

      input.onTokenProgress?.({ tokensOut: estimateTokens(buffer), durationMs: now - startedAt })
      lastEmit = now
    }
  }

  if (input.onPartial) emitPartial(buffer, input.onPartial)

  input.onTokenProgress?.({ tokensOut: estimateTokens(buffer), durationMs: Date.now() - startedAt })

  return buffer
}

function estimateTokens(buffer: string) {
  return Math.ceil(buffer.length / 4)
}

function emitPartial(buffer: string, onPartial: (partial: Partial<StructuredPreferencePatch>) => void) {
  const { value } = tryParsePartial<Partial<StructuredPreferencePatch>>(buffer)

  if (value && typeof value === 'object') {
    onPartial(value)
  }
}
