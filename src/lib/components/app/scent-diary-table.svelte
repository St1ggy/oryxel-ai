<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'

  import PurchaseIndicator from '$lib/components/app/purchase-indicator.svelte'
  import PyramidTooltip from '$lib/components/app/pyramid-tooltip.svelte'
  import Badge from '$lib/components/ui/badge.svelte'
  import NoteTags from '$lib/components/ui/note-tags.svelte'
  import RatingStars from '$lib/components/ui/rating-stars.svelte'
  import RowActionsMenu from '$lib/components/ui/row-actions-menu.svelte'
  import RowSelectIcon from '$lib/components/ui/row-select-icon.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow } from '$lib/types/diary'

  type SortCol = 'brand' | 'fragrance' | 'rating' | 'status'

  type Props = {
    rows: DiaryRow[]
    onRatingChange?: (id: number, fragranceId: number, rating: number) => void
    onDelete?: (id: number) => void
    onEdit?: (row: DiaryRow) => void
  }

  const { rows, onRatingChange, onDelete, onEdit }: Props = $props()

  const selectedRowIds = new SvelteSet<number>()
  let sortCol = $state<SortCol | null>(null)
  let sortDir = $state<'asc' | 'desc'>('asc')

  function isSelected(id: number): boolean {
    return selectedRowIds.has(id)
  }

  function toggleSelection(id: number): void {
    if (selectedRowIds.has(id)) {
      selectedRowIds.delete(id)
    } else {
      selectedRowIds.add(id)
    }
  }

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      sortCol = col
      sortDir = 'asc'
    }
  }

  const sortedRows = $derived.by(() => {
    if (!sortCol) return rows
    return [...rows].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'brand') cmp = a.brand.localeCompare(b.brand)
      else if (sortCol === 'fragrance') cmp = a.fragrance.localeCompare(b.fragrance)
      else if (sortCol === 'rating') cmp = a.rating - b.rating
      else if (sortCol === 'status') cmp = a.statusLabel.localeCompare(b.statusLabel)
      return sortDir === 'asc' ? cmp : -cmp
    })
  })
</script>

{#snippet sortIcon(col: SortCol)}
  <span class="ml-1 inline-block text-[10px] opacity-40" class:opacity-100={sortCol === col}>
    {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
  </span>
{/snippet}

<div
  class="overflow-x-auto rounded-[24px] border border-border bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
>
  <table class="w-full min-w-[720px] border-collapse text-left text-sm">
    <thead>
      <tr class="border-b border-border bg-muted/50 text-xs font-medium tracking-wide text-foreground-muted uppercase">
        <th class="w-14 px-3 py-3"></th>
        <th class="px-4 py-3">
          <button
            type="button"
            class="flex items-center gap-0.5 hover:text-foreground"
            onclick={() => toggleSort('brand')}
          >
            {m.oryxel_table_brand()}
            {@render sortIcon('brand')}
          </button>
        </th>
        <th class="px-4 py-3">
          <button
            type="button"
            class="flex items-center gap-0.5 hover:text-foreground"
            onclick={() => toggleSort('fragrance')}
          >
            {m.oryxel_table_fragrance()}
            {@render sortIcon('fragrance')}
          </button>
        </th>
        <th class="px-4 py-3">{m.oryxel_table_notes()}</th>
        <th class="w-36 px-4 py-3">
          <button
            type="button"
            class="flex items-center gap-0.5 hover:text-foreground"
            onclick={() => toggleSort('rating')}
          >
            {m.oryxel_table_rating()}
            {@render sortIcon('rating')}
          </button>
        </th>
        <th class="px-4 py-3">
          <button
            type="button"
            class="flex items-center gap-0.5 hover:text-foreground"
            onclick={() => toggleSort('status')}
          >
            {m.oryxel_table_status()}
            {@render sortIcon('status')}
          </button>
        </th>
        <th class="w-12 px-4 py-3 text-right">{m.oryxel_table_actions()}</th>
      </tr>
    </thead>
    <tbody>
      {#each sortedRows as row (row.id)}
        <tr class="oryx-transition h-[58px] border-b border-border last:border-0 hover:bg-(--oryx-table-hover)">
          <td class="px-3 text-right align-middle">
            <RowSelectIcon
              selected={isSelected(row.id)}
              ariaLabel={m.oryxel_table_select_row()}
              onToggle={() => toggleSelection(row.id)}
            />
          </td>
          <td class="px-4 align-middle font-semibold text-foreground">{row.brand}</td>
          <td class="px-4 align-middle">
            <div class="flex items-center justify-between gap-3">
              <PyramidTooltip top={row.pyramidTop} mid={row.pyramidMid} base={row.pyramidBase}>
                <span class="text-foreground">{row.fragrance}</span>
              </PyramidTooltip>
              <PurchaseIndicator owned={row.isOwned} label={m.oryxel_owned_hint()} />
            </div>
          </td>
          <td class="px-4 align-middle">
            <NoteTags notes={row.notes} />
          </td>
          <td class="px-4 align-middle">
            <RatingStars
              value={row.rating}
              readonly={false}
              onchange={(v) => onRatingChange?.(row.id, row.fragranceId, v)}
            />
          </td>
          <td class="px-4 align-middle">
            <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
          </td>
          <td class="px-4 text-right align-middle">
            <RowActionsMenu
              items={[
                { label: m.oryxel_action_edit(), onclick: () => onEdit?.(row) },
                { label: m.oryxel_action_remove(), onclick: () => onDelete?.(row.id), danger: true },
              ]}
            />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
