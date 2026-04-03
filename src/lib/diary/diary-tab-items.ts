import * as m from '$lib/paraglide/messages.js'

/** Keep the same tab order as Figma: Collection → ... → Profile. */
export const DIARY_LIST_TAB_VALUES = ['owned', 'to_try', 'liked', 'disliked', 'profile'] as const

export type DiaryListTabValue = (typeof DIARY_LIST_TAB_VALUES)[number]

export function diaryListTabItems(): { value: DiaryListTabValue; label: string }[] {
  return [
    { value: 'owned', label: m.oryxel_tab_collection() },
    { value: 'to_try', label: m.oryxel_tab_try() },
    { value: 'liked', label: m.oryxel_tab_liked() },
    { value: 'disliked', label: m.oryxel_tab_disliked() },
    { value: 'profile', label: m.oryxel_tab_profile() },
  ]
}
