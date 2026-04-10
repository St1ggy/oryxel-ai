import {
  DIARY_PRIMARY_VIEWS,
  type DiaryPrimaryView,
  FRAGRANCE_LIST_TAB_VALUES,
  type FragranceListTabValue,
} from './diary-tab-items'

/* eslint-disable sonarjs/cognitive-complexity -- explicit URL parsing branches */
export function parseDiaryUrlParams(searchParams: URLSearchParams): {
  view: DiaryPrimaryView
  list: FragranceListTabValue
} {
  const viewParameter = searchParams.get('view')
  const listParameter = searchParams.get('list')
  const tabLegacy = searchParams.get('tab')

  if (viewParameter && (DIARY_PRIMARY_VIEWS as readonly string[]).includes(viewParameter)) {
    const view = viewParameter as DiaryPrimaryView
    const list =
      listParameter && (FRAGRANCE_LIST_TAB_VALUES as readonly string[]).includes(listParameter)
        ? (listParameter as FragranceListTabValue)
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
/* eslint-enable sonarjs/cognitive-complexity */
