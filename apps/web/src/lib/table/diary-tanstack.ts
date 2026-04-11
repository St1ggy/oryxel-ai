import { createColumnHelper, createTable, getCoreRowModel, getSortedRowModel } from '@tanstack/table-core'

import type { DiaryRow } from '$lib/types/diary'
import type { ColumnDef, OnChangeFn, SortingState, Table, TableOptionsResolved } from '@tanstack/table-core'

const diaryCol = createColumnHelper<DiaryRow>()

/** Owned tab — sortable brand, fragrance, rating; notes column is display-only. */
export const ownedDiaryColumns = [
  diaryCol.accessor('brand', { id: 'brand' }),
  diaryCol.accessor('fragrance', { id: 'fragrance' }),
  diaryCol.display({ id: 'notes', enableSorting: false }),
  diaryCol.accessor('rating', { id: 'rating' }),
] as ColumnDef<DiaryRow>[]

export const toTryDiaryColumns = [
  diaryCol.accessor('brand', { id: 'brand' }),
  diaryCol.accessor('fragrance', { id: 'fragrance' }),
  diaryCol.display({ id: 'notes', enableSorting: false }),
] as ColumnDef<DiaryRow>[]

export type RecommendationRow = {
  id: string
  brand: string
  name: string
  tag?: string
  notes?: string[]
}

const recCol = createColumnHelper<RecommendationRow>()

export const recommendationColumns = [
  recCol.accessor('brand', { id: 'brand', enableSorting: true }),
  recCol.accessor('name', { id: 'name', enableSorting: true }),
  recCol.display({ id: 'notes', enableSorting: false }),
  recCol.display({ id: 'actions', enableSorting: false }),
] as ColumnDef<RecommendationRow>[]

export function createDiaryDataTable<T extends DiaryRow | RecommendationRow>(
  data: T[],
  columns: ColumnDef<T>[],
  sorting: SortingState,
  onSortingChange: OnChangeFn<SortingState>,
  getRowId: (row: T) => string,
): Table<T> {
  return createTable<T>({
    data,
    columns,
    // Partial controlled `state` replaces the whole slice; without `columnPinning`,
    // `getHeaderGroups` reads `getState().columnPinning.left` and throws.
    state: {
      sorting,
      columnPinning: { left: [], right: [] },
    },
    onSortingChange,
    // Controlled sorting via `onSortingChange`; full table state is not mirrored here.
    onStateChange: () => {
      /* no-op — sorting is the only controlled slice */
    },
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  } as TableOptionsResolved<T>)
}

export { functionalUpdate } from '@tanstack/table-core'
