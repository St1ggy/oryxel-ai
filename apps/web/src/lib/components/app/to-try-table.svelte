<script lang="ts">
  import { Inbox } from '@lucide/svelte'


  import AgentCommentIcon from '$lib/components/app/agent-comment-icon.svelte'
  import GenderIcon from '$lib/components/app/gender-icon.svelte'
  import PyramidTooltip from '$lib/components/app/pyramid-tooltip.svelte'
  import SeasonIcon from '$lib/components/app/season-icon.svelte'
  import TimeOfDayIcon from '$lib/components/app/time-of-day-icon.svelte'
  import NoteTags from '$lib/components/ui/note-tags.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { createDiaryDataTable, functionalUpdate, toTryDiaryColumns } from '$lib/table/diary-tanstack'

  import type { DiaryRow } from '$lib/types/diary'
  import type { SortingState } from '@tanstack/table-core'

  type Props = {
    rows: DiaryRow[]
    onOpenDetail?: (row: DiaryRow) => void
    emptyTitle?: string
    emptyHint?: string
  }

  const { rows, onOpenDetail, emptyTitle, emptyHint }: Props = $props()

  let sorting = $state<SortingState>([])

  const table = $derived.by(() =>
    createDiaryDataTable(
      rows,
      toTryDiaryColumns,
      sorting,
      (updater) => {
        sorting = functionalUpdate(updater, sorting)
      },
      (row) => String(row.id),
    ),
  )

  function headerLabel(columnId: string): string {
    switch (columnId) {
      case 'brand': {
        return m.oryxel_table_brand()
      }

      case 'fragrance': {
        return m.oryxel_table_fragrance()
      }

      case 'notes': {
        return m.oryxel_table_notes()
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

{#if rows.length === 0}
  <div
    class="flex flex-col items-center justify-center rounded-[24px] border border-border bg-surface px-8 py-16 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
  >
    <Inbox class="size-9 opacity-30" />
    <p class="mt-3 text-sm font-medium text-foreground">{emptyTitle ?? m.oryxel_empty_to_try_title()}</p>
    <p class="mt-1.5 text-xs text-foreground-muted">{emptyHint ?? m.oryxel_empty_to_try_hint()}</p>
  </div>
{:else}
  <div
    class="overflow-x-auto rounded-[24px] border border-border bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
  >
    <table class="w-full min-w-[480px] border-collapse text-left text-sm">
      <thead>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <tr
            class="border-b border-border bg-muted/50 text-xs font-medium tracking-wide text-foreground-muted uppercase"
          >
            {#each headerGroup.headers as header (header.id)}
              {@const columnId = header.column.id}
              <th class="px-5 py-4">
                {#if header.column.getCanSort()}
                  <button
                    type="button"
                    class="flex items-center gap-0.5 hover:text-foreground"
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
          {@const diaryRow = row.original}
          <tr
            class="oryx-transition cursor-pointer border-b border-border last:border-0 hover:bg-(--oryx-table-hover)"
            onclick={() => onOpenDetail?.(diaryRow)}
          >
            {#each row.getVisibleCells() as cell (cell.id)}
              {#if cell.column.id === 'brand'}
                <td class="px-5 py-4 align-middle font-semibold text-foreground">{diaryRow.brand}</td>
              {:else if cell.column.id === 'fragrance'}
                <td class="px-5 py-4 align-middle">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-foreground">{diaryRow.fragrance}</span>
                    <div class="flex shrink-0 items-center gap-1.5">
                      {#if diaryRow.pyramidTop || diaryRow.pyramidMid || diaryRow.pyramidBase}
                        <PyramidTooltip
                          top={diaryRow.pyramidTop}
                          mid={diaryRow.pyramidMid}
                          base={diaryRow.pyramidBase}
                        />
                      {/if}
                      <SeasonIcon value={diaryRow.season} />
                      <TimeOfDayIcon value={diaryRow.timeOfDay} />
                      <GenderIcon value={diaryRow.gender} />
                      {#if diaryRow.agentComment}
                        <AgentCommentIcon comment={diaryRow.agentComment} />
                      {/if}
                    </div>
                  </div>
                </td>
              {:else if cell.column.id === 'notes'}
                <td class="px-5 py-4 align-middle">
                  <NoteTags notes={diaryRow.notes} />
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
