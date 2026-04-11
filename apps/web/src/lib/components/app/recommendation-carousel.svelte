<script lang="ts">

  import * as m from '$lib/paraglide/messages.js'
  import {
    type RecommendationRow,
    createDiaryDataTable,
    functionalUpdate,
    recommendationColumns,
  } from '$lib/table/diary-tanstack'

  import type { SortingState } from '@tanstack/table-core'

  type Props = {
    items: RecommendationRow[]
    onTried?: (brand: string, name: string) => void
  }

  const { items, onTried }: Props = $props()

  let sorting = $state<SortingState>([])

  const table = $derived.by(() =>
    createDiaryDataTable(
      items,
      recommendationColumns,
      sorting,
      (updater) => {
        sorting = functionalUpdate(updater, sorting)
      },
      (row) => row.id,
    ),
  )

  function headerLabel(columnId: string): string {
    switch (columnId) {
      case 'brand': {
        return m.oryxel_table_brand()
      }

      case 'name': {
        return m.oryxel_table_fragrance()
      }

      case 'notes': {
        return m.oryxel_table_notes()
      }

      case 'actions': {
        return m.oryxel_table_actions()
      }

      default: {
        return columnId
      }
    }
  }
</script>

{#snippet sortIcon(columnId: string)}
  {@const sorted = table.getColumn(columnId)?.getIsSorted() ?? false}
  {@const arrow = sorted === 'asc' ? '↑' : '↓'}
  <span class="ml-1 inline-block text-[10px] opacity-40" class:opacity-100={Boolean(sorted)}>
    {sorted ? arrow : '↕'}
  </span>
{/snippet}

<div class="overflow-x-auto pb-2">
  <table class="w-full min-w-[480px] border-collapse text-left text-sm">
    <thead>
      {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
        <tr class="border-b border-border text-xs font-medium tracking-wide text-foreground-muted uppercase">
          {#each headerGroup.headers as header (header.id)}
            {@const columnId = header.column.id}
            <th
              class={columnId === 'actions' ? 'w-28 px-4 py-3 text-right' : 'px-4 py-3'}
            >
              {#if header.column.getCanSort()}
                <button
                  type="button"
                  class="flex items-center gap-0.5 hover:text-foreground {columnId === 'actions'
                    ? 'ml-auto'
                    : ''}"
                  onclick={header.column.getToggleSortingHandler()}
                >
                  {headerLabel(columnId)}
                  <!-- eslint-disable-next-line sonarjs/no-use-of-empty-return-value -->
                  {@render sortIcon(columnId)}
                </button>
              {:else}
                {headerLabel(columnId)}
              {/if}
            </th>
          {/each}
        </tr>
      {/each}
    </thead>
    <tbody>
      {#each table.getRowModel().rows as row (row.id)}
        {@const item = row.original}
        <tr class="oryx-transition h-[52px] border-b border-border last:border-0 hover:bg-(--oryx-table-hover)">
          {#each row.getVisibleCells() as cell (cell.id)}
            {#if cell.column.id === 'brand'}
              <td class="px-4 align-middle font-semibold text-foreground">{item.brand}</td>
            {:else if cell.column.id === 'name'}
              <td class="px-4 align-middle text-foreground">{item.name}</td>
            {:else if cell.column.id === 'notes'}
              <td class="px-4 align-middle text-xs text-foreground-muted">{item.tag ?? ''}</td>
            {:else if cell.column.id === 'actions'}
              <td class="px-4 text-right align-middle">
                <button
                  type="button"
                  class="oryx-transition rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted hover:border-accent hover:text-accent"
                  onclick={() => onTried?.(item.brand, item.name)}
                >
                  {m.oryxel_rec_tried()}
                </button>
              </td>
            {/if}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
