import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

import type { IOptions } from 'sanitize-html'

// CJS package attaches `defaults` on the default export; no reliable ESM named import.
const sanitizeDefaults = sanitizeHtml.defaults // eslint-disable-line import-x/no-named-as-default-member -- see above

marked.setOptions({
  gfm: true,
  breaks: true,
})

/** Broad allowlist (defaults are MDN-derived); +img for markdown images; code/pre class for fenced blocks. */
const ASSISTANT_MARKDOWN_SANITIZE: IOptions = {
  allowedTags: [...sanitizeDefaults.allowedTags, 'img'],
  allowedAttributes: {
    ...sanitizeDefaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    code: ['class'],
    pre: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
}

// Markdown for assistant chat bubbles — parse then sanitize for {@html ...}.
export function renderAssistantMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string

  return sanitizeHtml(raw, ASSISTANT_MARKDOWN_SANITIZE)
}
