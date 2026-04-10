<script lang="ts">
  import { Inbox } from '@lucide/svelte'

  import AgentCommentIcon from '$lib/components/app/agent-comment-icon.svelte'
  import GenderIcon from '$lib/components/app/gender-icon.svelte'
  import PurchaseIndicator from '$lib/components/app/purchase-indicator.svelte'
  import PyramidTooltip from '$lib/components/app/pyramid-tooltip.svelte'
  import SeasonIcon from '$lib/components/app/season-icon.svelte'
  import TimeOfDayIcon from '$lib/components/app/time-of-day-icon.svelte'
  import NoteTags from '$lib/components/ui/note-tags.svelte'
  import RatingStars from '$lib/components/ui/rating-stars.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow } from '$lib/types/diary'

  type SortCol = 'brand' | 'fragrance' | 'rating'

  interface Props {
    rows: DiaryRow[]
    onRatingChange?: (id: number, fragranceId: number, rating: number) => void
    onOpenDetail?: (row: DiaryRow) => void
    emptyTitle?: string
    emptyHint?: string
  }

  const { rows, onRatingChange, onOpenDetail, emptyTitle, emptyHint }: Props = $props()

  let sortCol = $state<SortCol | null>(null)
  let sortDirection = $state<'asc' | 'desc'>('asc')

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      sortCol = col
      sortDirection = 'asc'
    }
  }

  const sortedRows = $derived.by(() => {
    if (!sortCol) return rows

    const col = sortCol

    return rows.toSorted((a, b) => {
      let cmp = 0

      switch (col) {
        case 'brand': {
          cmp = a.brand.localeCompare(b.brand)
          break
        }

        case 'fragrance': {
          cmp = a.fragrance.localeCompare(b.fragrance)
          break
        }

        case 'rating': {
          cmp = a.rating - b.rating
          break
        }
      }

      return sortDirection === 'asc' ? cmp : -cmp
    })
  })
</script>

{#snippet sortIcon(col: SortCol)}
  {@const arrow = sortDirection === 'asc' ? '↑' : '↓'}
  <span class="ml-1 inline-block text-[10px] opacity-40" class:opacity-100={sortCol === col}>
    {sortCol === col ? arrow : '↕'}
  </span>
{/snippet}

{#if rows.length === 0}
  <div
    class="flex flex-col items-center justify-center rounded-[24px] border border-border bg-surface px-8 py-16 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
  >
    <Inbox class="size-9 opacity-30" />
    <p class="mt-3 text-sm font-medium text-foreground">{emptyTitle ?? m.oryxel_empty_owned_title()}</p>
    <p class="mt-1.5 text-xs text-foreground-muted">{emptyHint ?? m.oryxel_empty_owned_hint()}</p>
  </div>
{:else}
  <div
    class="overflow-x-auto rounded-[24px] border border-border bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
  >
    <table class="w-full min-w-[560px] border-collapse text-left text-sm">
      <thead>
        <tr
          class="border-b border-border bg-muted/50 text-xs font-medium tracking-wide text-foreground-muted uppercase"
        >
          <th class="px-5 py-4">
            <button
              type="button"
              class="flex items-center gap-0.5 hover:text-foreground"
              onclick={() => toggleSort('brand')}
            >
              {m.oryxel_table_brand()}
              <!-- eslint-disable-next-line sonarjs/no-use-of-empty-return-value -->
              {@render sortIcon('brand')}
            </button>
          </th>
          <th class="px-5 py-4">
            <button
              type="button"
              class="flex items-center gap-0.5 hover:text-foreground"
              onclick={() => toggleSort('fragrance')}
            >
              {m.oryxel_table_fragrance()}
              <!-- eslint-disable-next-line sonarjs/no-use-of-empty-return-value -->
              {@render sortIcon('fragrance')}
            </button>
          </th>
          <th class="px-5 py-4">{m.oryxel_table_notes()}</th>
          <th class="w-36 px-5 py-4">
            <button
              type="button"
              class="flex items-center gap-0.5 hover:text-foreground"
              onclick={() => toggleSort('rating')}
            >
              {m.oryxel_table_rating()}
              <!-- eslint-disable-next-line sonarjs/no-use-of-empty-return-value -->
              {@render sortIcon('rating')}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each sortedRows as row (row.id)}
          <tr
            class="oryx-transition cursor-pointer border-b border-border last:border-0 hover:bg-(--oryx-table-hover)"
            onclick={() => onOpenDetail?.(row)}
          >
            <td class="px-5 py-4 align-middle font-semibold text-foreground">{row.brand}</td>
            <td class="px-5 py-4 align-middle">
              <div class="flex items-center justify-between gap-3">
                <span class="text-foreground">{row.fragrance}</span>
                <div class="flex shrink-0 items-center gap-1.5">
                  <PurchaseIndicator owned={row.isOwned} label={m.oryxel_owned_hint()} />
                  {#if row.pyramidTop || row.pyramidMid || row.pyramidBase}
                    <PyramidTooltip top={row.pyramidTop} mid={row.pyramidMid} base={row.pyramidBase} />
                  {/if}
                  <SeasonIcon value={row.season} />
                  <TimeOfDayIcon value={row.timeOfDay} />
                  <GenderIcon value={row.gender} />
                  {#if row.agentComment}
                    <AgentCommentIcon comment={row.agentComment} />
                  {/if}
                </div>
              </div>
            </td>
            <td class="px-5 py-4 align-middle">
              <NoteTags notes={row.notes} />
            </td>
            <td class="px-5 py-4 align-middle" onclick={(event) => event.stopPropagation()}>
              <RatingStars
                value={row.rating}
                readonly={false}
                onchange={(v) => onRatingChange?.(row.id, row.fragranceId, v)}
              />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
