import { describe, expect, it } from 'vitest'

import { CANONICAL_LOCALES, getLocaleMapValue, normalizeLocale } from './locale'

describe('normalizeLocale', () => {
  it('normalizes legacy Japanese locale tags', () => {
    expect(normalizeLocale('jp')).toBe('ja')
    expect(normalizeLocale('ja')).toBe('ja')
    expect(normalizeLocale('jp-JP')).toBe('ja-JP')
    expect(normalizeLocale('en')).toBe('en')
  })

  it('defines the canonical locales', () => {
    expect(CANONICAL_LOCALES).toEqual(['en', 'es', 'fr', 'ja', 'ru', 'zh'])
  })
})

describe('getLocaleMapValue', () => {
  it('prefers canonical Japanese content and falls back to legacy maps', () => {
    expect(getLocaleMapValue({ ja: 'canonical', jp: 'legacy' }, 'jp')).toBe('canonical')
    expect(getLocaleMapValue({ jp: 'legacy' }, 'ja')).toBe('legacy')
  })
})
