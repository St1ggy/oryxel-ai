import {
  DIARY_PRIMARY_VIEWS,
  FRAGRANCE_LIST_TAB_VALUES,
  type DiaryPrimaryView,
  type FragranceListTabValue,
} from './diary-tab-items'

export function parseDiaryUrlParams(searchParams: URLSearchParams): {
  view: DiaryPrimaryView
  list: FragranceListTabValue
} {
  const viewParam = searchParams.get('view')
  const listParam = searchParams.get('list')
  const tabLegacy = searchParams.get('tab')

  if (viewParam && (DIARY_PRIMARY_VIEWS as readonly string[]).includes(viewParam)) {
    const view = viewParam as DiaryPrimaryView
    const list =
      listParam && (FRAGRANCE_LIST_TAB_VALUES as readonly string[]).includes(listParam)
        ? (listParam as FragranceListTabValue)
        : 'owned'

    return { view, list: view === 'fragrances' ? list : 'owned' }
  }

  if (tabLegacy) {
    if (tabLegacy === 'profile') return { view: 'profile', list: 'owned' }

    if (tabLegacy === 'notes') return { view: 'notes', list: 'owned' }

    if (tabLegacy === 'guide') return { view: 'guide', list: 'owned' }

    if ((FRAGRANCE_LIST_TAB_VALUES as readonly string[]).includes(tabLegacy)) {
      return { view: 'fragrances', list: tabLegacy as FragranceListTabValue }
    }
  }

  return { view: 'fragrances', list: 'owned' }
}
