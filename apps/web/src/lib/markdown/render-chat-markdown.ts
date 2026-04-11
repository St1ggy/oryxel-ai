import { sanitize } from 'isomorphic-dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

// Markdown for assistant chat bubbles — parse then sanitize for {@html ...}.
export function renderAssistantMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string

  return sanitize(raw, {
    USE_PROFILES: { html: true },
  })
}
