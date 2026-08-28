import {
  columnVisibilityFeature,
  constructTable,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

import type { DiaryRow } from '$lib/types/diary'
import type { ColumnDef, OnChangeFn, SortingState } from '@tanstack/table-core'

const diaryTableFeatures = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const diaryCol = createColumnHelper<typeof diaryTableFeatures, DiaryRow>()

/** Owned tab — sortable brand, fragrance, rating; notes column is display-only. */
export const ownedDiaryColumns = diaryCol.columns([
  diaryCol.accessor('brand', { id: 'brand' }),
  diaryCol.accessor('fragrance', { id: 'fragrance' }),
  diaryCol.display({ id: 'notes', enableSorting: false }),
  diaryCol.accessor('rating', { id: 'rating' }),
])

export const toTryDiaryColumns = diaryCol.columns([
  diaryCol.accessor('brand', { id: 'brand' }),
  diaryCol.accessor('fragrance', { id: 'fragrance' }),
  diaryCol.display({ id: 'notes', enableSorting: false }),
  diaryCol.display({ id: 'actions', enableSorting: false }),
])

export type RecommendationRow = {
  id: string
  brand: string
  name: string
  tag?: string
  notes?: string[]
}

const recCol = createColumnHelper<typeof diaryTableFeatures, RecommendationRow>()

export const recommendationColumns = recCol.columns([
  recCol.accessor('brand', { id: 'brand', enableSorting: true }),
  recCol.accessor('name', { id: 'name', enableSorting: true }),
  recCol.display({ id: 'notes', enableSorting: false }),
  recCol.display({ id: 'actions', enableSorting: false }),
])

export function createDiaryDataTable<T extends DiaryRow | RecommendationRow>(
  data: T[],
  columns: readonly ColumnDef<typeof diaryTableFeatures, T>[],
  sorting: SortingState,
  onSortingChange: OnChangeFn<SortingState>,
  getRowId: (row: T) => string,
) {
  return constructTable({
    features: diaryTableFeatures,
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getRowId,
  })
}

export { functionalUpdate } from '@tanstack/table-core'
