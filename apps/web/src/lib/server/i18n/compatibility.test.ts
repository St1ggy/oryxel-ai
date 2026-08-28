import { describe, expect, it } from 'vitest'

import { getLegacyLocaleRedirect, rewriteLegacyLocaleCookieHeader } from './compatibility'

describe('getLegacyLocaleRedirect', () => {
  it('permanently redirects legacy locale paths without changing the suffix or query', () => {
    const response = getLegacyLocaleRedirect(new URL('https://oryxel.test/jp/diary?page=2'))

    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toBe('https://oryxel.test/ja/diary?page=2')
  })

  it('matches only the legacy locale path segment', () => {
    expect(getLegacyLocaleRedirect(new URL('https://oryxel.test/jp'))?.headers.get('location')).toBe(
      'https://oryxel.test/ja',
    )
    expect(getLegacyLocaleRedirect(new URL('https://oryxel.test/jpegs'))).toBeNull()
    expect(getLegacyLocaleRedirect(new URL('https://oryxel.test/ja/diary'))).toBeNull()
  })
})

describe('rewriteLegacyLocaleCookieHeader', () => {
  it('rewrites only an exact legacy Paraglide locale cookie', () => {
    expect(rewriteLegacyLocaleCookieHeader('session=abc; PARAGLIDE_LOCALE=jp', 'PARAGLIDE_LOCALE')).toBe(
      'session=abc; PARAGLIDE_LOCALE=ja',
    )
    expect(rewriteLegacyLocaleCookieHeader('PARAGLIDE_LOCALE=jp-JP', 'PARAGLIDE_LOCALE')).toBe('PARAGLIDE_LOCALE=jp-JP')
    expect(rewriteLegacyLocaleCookieHeader('other=jp', 'PARAGLIDE_LOCALE')).toBe('other=jp')
  })
})
