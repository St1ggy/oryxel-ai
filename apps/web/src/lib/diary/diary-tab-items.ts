import * as m from '$lib/paraglide/messages.js'

/** Main diary shell: fragrances | notes | profile | guide | chat (mobile tab bar only) */
export const DIARY_PRIMARY_VIEWS = ['fragrances', 'notes', 'profile', 'guide', 'chat'] as const

export type DiaryPrimaryView = (typeof DIARY_PRIMARY_VIEWS)[number]

/** Sub-views inside «Ароматы» (tables). */
export const FRAGRANCE_LIST_TAB_VALUES = ['owned', 'to_try', 'liked', 'neutral', 'disliked'] as const

export type FragranceListTabValue = (typeof FRAGRANCE_LIST_TAB_VALUES)[number]

/** @deprecated Use FRAGRANCE_LIST_TAB_VALUES + DiaryPrimaryView */

export const DIARY_LIST_TAB_VALUES = [...FRAGRANCE_LIST_TAB_VALUES, 'profile', 'notes', 'guide'] as const

/** @deprecated Use FragranceListTabValue */

export type DiaryListTabValue = (typeof DIARY_LIST_TAB_VALUES)[number]

export function diaryPrimaryItems() {
  return [
    { value: 'fragrances' as const, label: () => m.oryxel_nav_fragrances() },
    { value: 'notes' as const, label: () => m.oryxel_tab_notes() },
    { value: 'profile' as const, label: () => m.oryxel_tab_profile() },
    { value: 'guide' as const, label: () => m.oryxel_tab_guide() },
  ]
}

/** Desktop nav omits chat (sidebar assistant). Mobile adds chat as a fifth tab. */
export function diaryPrimaryNavItems(variant: 'desktop' | 'mobile') {
  const base = diaryPrimaryItems()

  if (variant === 'mobile') {
    return [...base, { value: 'chat' as const, label: () => m.oryxel_chat_title() }]
  }

  return base
}

export function fragranceListTabItems() {
  return [
    { value: 'owned', label: m.oryxel_tab_collection() },
    { value: 'to_try', label: m.oryxel_tab_try() },
    { value: 'liked', label: m.oryxel_tab_liked() },
    { value: 'neutral', label: m.oryxel_tab_neutral() },
    { value: 'disliked', label: m.oryxel_tab_disliked() },
  ]
}

/** @deprecated */

export function diaryListTabItems() {
  return [
    ...fragranceListTabItems(),
    { value: 'profile', label: m.oryxel_tab_profile() },
    { value: 'notes', label: m.oryxel_tab_notes() },
    { value: 'guide', label: m.oryxel_tab_guide() },
  ]
}
