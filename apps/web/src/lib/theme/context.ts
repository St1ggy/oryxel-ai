import { getContext, setContext } from 'svelte'

import type { OryxelThemeId } from './constants'

export type ThemeContextValue = {
  readonly theme: OryxelThemeId
  setTheme: (next: OryxelThemeId) => void
}

const THEME_CONTEXT_KEY = Symbol('oryxel-theme')

export function setThemeContext(value: ThemeContextValue): void {
  setContext(THEME_CONTEXT_KEY, value)
}

export function getThemeContext(): ThemeContextValue {
  const value = getContext<ThemeContextValue | undefined>(THEME_CONTEXT_KEY)

  if (!value) {
    throw new Error('Theme context is not available')
  }

  return value
}
