// Read Server-Sent Events from a fetch response body.
//
// Yields raw `data:` payloads (one per SSE event). Empty lines, comments,
// and other event fields are dropped. Multi-line `data:` is concatenated with `\n`.
export async function* readSseEvents(body: ReadableStream<Uint8Array>, signal: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read()

      if (done) {
        if (buffer.length > 0) {
          const final = extractDataField(buffer)

          if (final) yield final
        }

        return
      }

      buffer += decoder.decode(value, { stream: true })

      let boundary = buffer.indexOf('\n\n')

      while (boundary !== -1) {
        const block = buffer.slice(0, boundary)

        buffer = buffer.slice(boundary + 2)

        const data = extractDataField(block)

        if (data) yield data

        boundary = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function extractDataField(block: string): string | null {
  const lines = block.split('\n')
  const dataParts: string[] = []

  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trimStart())
    }
  }

  if (dataParts.length === 0) return null

  return dataParts.join('\n')
}
