import { persistentAtom, persistentJSON } from '@nanostores/persistent'

import { DEFAULT_THEME, ORYXEL_THEME_STORAGE_KEY, type OryxelThemeId, isOryxelThemeId } from '$lib/theme/constants'

const CHAT_PANEL_WIDTH_STORAGE_KEY = 'oryxel:chat-panel-width-pct'

/** Desktop diary split: chat column width as % of the shell row (min…max clamped on read/write). */
export const CHAT_PANEL_WIDTH_MIN_PCT = 22
export const CHAT_PANEL_WIDTH_MAX_PCT = 58
export const CHAT_PANEL_WIDTH_DEFAULT_PCT = 35

export function clampChatPanelWidthPct(value: number): number {
  if (!Number.isFinite(value)) return CHAT_PANEL_WIDTH_DEFAULT_PCT

  return Math.min(CHAT_PANEL_WIDTH_MAX_PCT, Math.max(CHAT_PANEL_WIDTH_MIN_PCT, Math.round(value)))
}

export const chatPanelWidthPctAtom = persistentAtom<number>(
  CHAT_PANEL_WIDTH_STORAGE_KEY,
  CHAT_PANEL_WIDTH_DEFAULT_PCT,
  {
    encode: String,
    decode: (raw) => clampChatPanelWidthPct(Number.parseFloat(raw)),
  },
)

export const persistedThemeAtom = persistentAtom<OryxelThemeId>(ORYXEL_THEME_STORAGE_KEY, DEFAULT_THEME, {
  encode: (v) => v,
  decode: (raw) => (isOryxelThemeId(raw) ? raw : DEFAULT_THEME),
})

export type PrivacyPrefs = {
  analytics: boolean
}

/** Mirrors legacy `oryxel:privacy` JSON shape; extra keys are ignored at read sites. */
export const privacyPrefsAtom = persistentJSON<PrivacyPrefs>('oryxel:privacy', { analytics: false })
