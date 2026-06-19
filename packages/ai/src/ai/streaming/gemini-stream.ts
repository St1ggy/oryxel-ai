import { tryParsePartial } from './partial-json'
import { readSseEvents } from './sse'

import type { StructuredPreferencePatch } from '../contracts'

const PARTIAL_EMIT_INTERVAL_MS = 1000

export type GeminiStreamInput = {
  model: string
  apiKey: string
  body: Record<string, unknown>
  signal: AbortSignal
  onPartial?: (partial: Partial<StructuredPreferencePatch>) => void
  onTokenProgress?: (info: { tokensOut: number; durationMs: number }) => void
}

export async function streamGemini(input: GeminiStreamInput) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:streamGenerateContent?alt=sse&key=${input.apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input.body),
    signal: input.signal,
  })

  if (!response.ok) {
    throw new Error(`Gemini error ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Gemini empty stream body')
  }

  const startedAt = Date.now()
  let buffer = ''
  let lastEmit = 0

  for await (const data of readSseEvents(response.body, input.signal)) {
    let event: { candidates?: { content?: { parts?: { text?: string }[] } }[] }

    try {
      event = JSON.parse(data) as typeof event
    } catch {
      continue
    }

    const text = event.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) continue

    buffer += text

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
