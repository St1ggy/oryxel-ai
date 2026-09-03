import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Better Auth storage configuration', () => {
  it('keeps sessions out of secondary storage', async () => {
    const source = await readFile(new URL('auth.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/\bsecondaryStorage\b/)
    expect(source).toContain('storeSessionInDatabase: true')
    expect(source).toContain('customStorage: authRateLimitStorage')
  })
})
