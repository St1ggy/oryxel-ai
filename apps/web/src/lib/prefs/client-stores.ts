import { persistentAtom, persistentJSON } from '@nanostores/persistent'

import { DEFAULT_THEME, ORYXEL_THEME_STORAGE_KEY, type OryxelThemeId, isOryxelThemeId } from '$lib/theme/constants'

export const persistedThemeAtom = persistentAtom<OryxelThemeId>(ORYXEL_THEME_STORAGE_KEY, DEFAULT_THEME, {
  encode: (v) => v,
  decode: (raw) => (isOryxelThemeId(raw) ? raw : DEFAULT_THEME),
})

export type PrivacyPrefs = {
  analytics: boolean
}

/** Mirrors legacy `oryxel:privacy` JSON shape; extra keys are ignored at read sites. */
export const privacyPrefsAtom = persistentJSON<PrivacyPrefs>('oryxel:privacy', { analytics: false })
