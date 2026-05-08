// Tolerant JSON parser for incremental streams.
//
// Closes unbalanced brackets, drops trailing partial tokens, and attempts JSON.parse.
// Returns `complete: true` only if the input parsed without repair.

const MAX_REPAIR_BACKTRACK = 512

export type PartialParseResult<T = unknown> = {
  value: T | undefined
  complete: boolean
}

export function tryParsePartial<T = unknown>(buffer: string): PartialParseResult<T> {
  const trimmed = buffer.trim()

  if (!trimmed) {
    return { value: undefined, complete: false }
  }

  try {
    return { value: JSON.parse(trimmed) as T, complete: true }
  } catch {
    // fall through to repair
  }

  const limit = Math.min(trimmed.length, MAX_REPAIR_BACKTRACK)

  for (let drop = 0; drop <= limit; drop += 1) {
    const sliced = trimmed.slice(0, trimmed.length - drop)
    const closed = closeBrackets(sliced)

    try {
      return { value: JSON.parse(closed) as T, complete: false }
    } catch {
      // try next drop
    }
  }

  return { value: undefined, complete: false }
}

function closeBrackets(input: string): string {
  const state = scanStructure(input)

  let result = input

  if (state.escape) {
    result = result.slice(0, -1)
  }

  if (state.inString) {
    result = stripIncompleteEscape(result)
    result += '"'
  }

  while (state.stack.length > 0) {
    result += state.stack.pop()
  }

  return result
}

type ScanState = { stack: string[]; inString: boolean; escape: boolean }

function scanStructure(input: string): ScanState {
  const state: ScanState = { stack: [], inString: false, escape: false }

  for (const c of input) {
    if (state.escape) {
      state.escape = false
      continue
    }

    if (state.inString) {
      handleStringChar(c, state)
      continue
    }

    handleOuterChar(c, state)
  }

  return state
}

function handleStringChar(c: string, state: ScanState): void {
  if (c === '\\') {
    state.escape = true
  } else if (c === '"') {
    state.inString = false
  }
}

const OPEN_TO_CLOSE: Record<string, string> = { '[': ']', '{': '}' }
const CLOSERS = new Set(['}', ']'])

function handleOuterChar(c: string, state: ScanState): void {
  if (c === '"') {
    state.inString = true

    return
  }

  const close = OPEN_TO_CLOSE[c]

  if (close) {
    state.stack.push(close)
  } else if (CLOSERS.has(c)) {
    state.stack.pop()
  }
}

function stripIncompleteEscape(s: string): string {
  const trail = /\\u[0-9a-fA-F]{0,3}$|\\$/u.exec(s)

  if (trail) {
    return s.slice(0, trail.index)
  }

  return s
}
