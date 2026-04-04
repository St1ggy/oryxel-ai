export type OryxelThemeId = 'light-aura' | 'midnight-scent' | 'botanical' | 'rose-blush' | 'lavender-mist'

export const ORYXEL_THEME_STORAGE_KEY = 'oryxel:theme'

export const ORYXEL_THEMES: readonly OryxelThemeId[] = [
  'light-aura',
  'midnight-scent',
  'botanical',
  'rose-blush',
  'lavender-mist',
] as const

export const DEFAULT_THEME: OryxelThemeId = 'light-aura'

export function isOryxelThemeId(value: string | null | undefined): value is OryxelThemeId {
  return (
    value === 'light-aura' ||
    value === 'midnight-scent' ||
    value === 'botanical' ||
    value === 'rose-blush' ||
    value === 'lavender-mist'
  )
}
