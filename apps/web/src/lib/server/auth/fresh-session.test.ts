import { describe, expect, it } from 'vitest'

import { SENSITIVE_ACTION_FRESH_AGE_SECONDS, isSessionFresh } from './fresh-session'

describe('isSessionFresh', () => {
  const now = Date.parse('2026-08-29T12:00:00.000Z')

  it('accepts sessions younger than the sensitive-action limit', () => {
    expect(isSessionFresh(new Date(now - (SENSITIVE_ACTION_FRESH_AGE_SECONDS - 1) * 1000), now)).toBe(true)
  })

  it('rejects sessions at or beyond the sensitive-action limit', () => {
    expect(isSessionFresh(new Date(now - SENSITIVE_ACTION_FRESH_AGE_SECONDS * 1000), now)).toBe(false)
  })

  it('rejects invalid timestamps', () => {
    expect(isSessionFresh('invalid', now)).toBe(false)
  })
})
