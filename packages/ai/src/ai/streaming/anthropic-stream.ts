import { tryParsePartial } from './partial-json'
import { readSseEvents } from './sse'

import type { StructuredPreferencePatch } from '../contracts'

const PARTIAL_EMIT_INTERVAL_MS = 200

export type AnthropicStreamInput = {
  apiKey: string
  body: Record<string, unknown>
  signal: AbortSignal
  onPartial?: (partial: Partial<StructuredPreferencePatch>) => void
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

    if (input.onPartial) {
      const now = Date.now()

      if (now - lastEmit >= PARTIAL_EMIT_INTERVAL_MS) {
        emitPartial(buffer, input.onPartial)
        lastEmit = now
      }
    }
  }

  if (input.onPartial) emitPartial(buffer, input.onPartial)

  return buffer
}

function emitPartial(buffer: string, onPartial: (partial: Partial<StructuredPreferencePatch>) => void): void {
  const { value } = tryParsePartial<Partial<StructuredPreferencePatch>>(buffer)

  if (value && typeof value === 'object') {
    onPartial(value)
  }
}
