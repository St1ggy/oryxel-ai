import { tryParsePartial } from './partial-json'
import { readSseEvents } from './sse'

import type { StructuredPreferencePatch } from '../contracts'

const PARTIAL_EMIT_INTERVAL_MS = 200

export type GeminiStreamInput = {
  model: string
  apiKey: string
  body: Record<string, unknown>
  signal: AbortSignal
  onPartial?: (partial: Partial<StructuredPreferencePatch>) => void
}

export async function streamGemini(input: GeminiStreamInput): Promise<string> {
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
