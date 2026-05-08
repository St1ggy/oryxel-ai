import { tryParsePartial } from './partial-json'
import { readSseEvents } from './sse'

import type { StructuredPreferencePatch } from '../contracts'

const PARTIAL_EMIT_INTERVAL_MS = 1000

export type AnthropicStreamInput = {
  apiKey: string
  body: Record<string, unknown>
  signal: AbortSignal
  onPartial?: (partial: Partial<StructuredPreferencePatch>) => void
  onTokenProgress?: (info: { tokensOut: number; durationMs: number }) => void
}

export async function streamAnthropic(input: AnthropicStreamInput): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ ...input.body, stream: true }),
    signal: input.signal,
  })

  if (!response.ok) {
    throw new Error(`Anthropic error ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Anthropic empty stream body')
  }

  const startedAt = Date.now()
  let buffer = ''
  let lastEmit = 0

  for await (const data of readSseEvents(response.body, input.signal)) {
    let event: { type?: string; delta?: { type?: string; text?: string } }

    try {
      event = JSON.parse(data) as typeof event
    } catch {
      continue
    }

    if (event.type !== 'content_block_delta') continue

    const text = event.delta?.text

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

function estimateTokens(buffer: string): number {
  return Math.ceil(buffer.length / 4)
}

function emitPartial(buffer: string, onPartial: (partial: Partial<StructuredPreferencePatch>) => void): void {
  const { value } = tryParsePartial<Partial<StructuredPreferencePatch>>(buffer)

  if (value && typeof value === 'object') {
    onPartial(value)
  }
}
