import * as m from '$lib/paraglide/messages.js'

/** Keep the same tab order as Figma: Collection → ... → Profile → Notes → Guide. */
export const DIARY_LIST_TAB_VALUES = [
  'owned',
  'to_try',
  'liked',
  'neutral',
  'disliked',
  'profile',
  'notes',
  'guide',
] as const

export type DiaryListTabValue = (typeof DIARY_LIST_TAB_VALUES)[number]

/** Tabs shown on desktop (all). Mobile omits profile, notes, guide. */
export const MOBILE_EXCLUDED_TABS: DiaryListTabValue[] = ['profile', 'notes', 'guide']

export function diaryListTabItems(): { value: DiaryListTabValue; label: string }[] {
  return [
    { value: 'owned', label: m.oryxel_tab_collection() },
    { value: 'to_try', label: m.oryxel_tab_try() },
    { value: 'liked', label: m.oryxel_tab_liked() },
    { value: 'neutral', label: m.oryxel_tab_neutral() },
    { value: 'disliked', label: m.oryxel_tab_disliked() },
    { value: 'profile', label: m.oryxel_tab_profile() },
    { value: 'notes', label: m.oryxel_tab_notes() },
    { value: 'guide', label: m.oryxel_tab_guide() },
  ]
}
