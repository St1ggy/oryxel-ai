import { describe, expect, it } from 'vitest'

import { sanitizeRedirectTarget } from './redirect'

describe('sanitizeRedirectTarget', () => {
  it('allows local absolute paths', () => {
    expect(sanitizeRedirectTarget('/profile')).toBe('/profile')
    expect(sanitizeRedirectTarget('/diary')).toBe('/diary')
    expect(sanitizeRedirectTarget('/diary?tab=owned')).toBe('/diary?tab=owned')
  })

  it('blocks external URLs', () => {
    expect(sanitizeRedirectTarget('https://evil.example')).toBe('/')
  })

  it('blocks protocol-relative redirects', () => {
    expect(sanitizeRedirectTarget('//evil.example/path')).toBe('/')
  })
})
