<script lang="ts">
  import { Bookmark, Circle, Heart, Package, RefreshCw, ThumbsDown } from '@lucide/svelte'

  import DiaryTableSkeleton from '$lib/components/app/diary-table-skeleton.svelte'
  import ScentDiaryTable from '$lib/components/app/scent-diary-table.svelte'
  import ToTryTable from '$lib/components/app/to-try-table.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { FragranceListTabValue } from '$lib/diary/diary-tab-items'
  import type { DiaryData, DiaryRow } from '$lib/types/diary'

  type Props = {
    fragranceTab: FragranceListTabValue
    diaryState: DiaryData
    loading?: boolean
    onRatingChange: (id: number, fragranceId: number, rating: number) => void
    onOpenDetail?: (row: DiaryRow, context: 'diary' | 'to_try') => void
    onRefreshRecommendations?: () => void | Promise<void>
    refreshingRecommendations?: boolean
    canRefreshRecommendations?: boolean
    layout: 'desktop' | 'mobile'
  }

  let {
    fragranceTab = $bindable(),
    diaryState,
    loading = false,
    onRatingChange,
    onOpenDetail,
    onRefreshRecommendations,
    refreshingRecommendations = false,
    canRefreshRecommendations = true,
    layout,
  }: Props = $props()

  const recommendationRows = $derived(diaryState.to_try.filter((r) => r.isRecommendation === true))
  const wishlistRows = $derived(diaryState.to_try.filter((r) => r.isRecommendation !== true))

  const tabCounts = $derived({
    owned: diaryState.owned.length,
    // eslint-disable-next-line camelcase -- matches FragranceListType / URL param `list`
    to_try: diaryState.to_try.length,
    liked: diaryState.liked.length,
    neutral: diaryState.neutral.length,
    disliked: diaryState.disliked.length,
  })

  const iconToggles: {
    value: FragranceListTabValue
    icon: typeof Package
    label: () => string
    tour: string
  }[] = [
    { value: 'owned', icon: Package, label: () => m.oryxel_tab_collection(), tour: 'fragrance-list-owned' },
    { value: 'to_try', icon: Bookmark, label: () => m.oryxel_tab_try(), tour: 'fragrance-list-to_try' },
    { value: 'liked', icon: Heart, label: () => m.oryxel_tab_liked(), tour: 'fragrance-list-liked' },
    { value: 'neutral', icon: Circle, label: () => m.oryxel_tab_neutral(), tour: 'fragrance-list-neutral' },
    {
      value: 'disliked',
      icon: ThumbsDown,
      label: () => m.oryxel_tab_disliked(),
      tour: 'fragrance-list-disliked',
    },
  ]

  const activeListToggle = $derived(iconToggles.find((t) => t.value === fragranceTab))
</script>

<div class={cn('flex min-h-0 flex-col', layout === 'desktop' ? 'flex-1' : '')}>
  <div class="mb-3 flex flex-wrap items-center justify-between gap-3" data-tour="fragrance-list-toggle">
    <div class="flex min-h-[2.25rem] min-w-0 items-center">
      {#if loading}
        <span class="text-sm text-foreground-muted">{m.oryxel_loading()}</span>
      {:else if activeListToggle}
        <p class="text-sm text-foreground-muted">
          <span class="font-semibold text-foreground">{activeListToggle.label()}</span>
          <span class="ml-2 text-foreground tabular-nums">{tabCounts[fragranceTab]}</span>
        </p>
      {/if}
    </div>
    <div class="flex shrink-0 gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {#each iconToggles as { value, icon: Icon, label, tour } (value)}
        <button
          type="button"
          data-tour={tour}
          aria-label={`${label()} (${tabCounts[value]})`}
          title={`${label()} (${tabCounts[value]})`}
          aria-pressed={fragranceTab === value}
          onclick={() => (fragranceTab = value)}
          class={cn(
            'oryx-transition flex min-h-10 min-w-9 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-1 md:min-h-11 md:min-w-10',
            fragranceTab === value
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground',
          )}
        >
          <Icon size={layout === 'desktop' ? 16 : 15} strokeWidth={1.75} class="shrink-0" />
          {#if !loading}
            <span
              class="text-[10px] leading-none font-semibold tabular-nums md:text-[11px]"
              class:text-foreground={fragranceTab === value}
              class:text-foreground-muted={fragranceTab !== value}
            >
              {tabCounts[value]}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="min-h-0 flex-1" data-tour="diary-table">
    {#if fragranceTab === 'owned'}
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <ScentDiaryTable
          rows={diaryState.owned}
          {onRatingChange}
          onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
          emptyTitle={m.oryxel_empty_owned_title()}
          emptyHint={m.oryxel_empty_owned_hint()}
        />
      {/if}
    {:else if fragranceTab === 'to_try'}
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <div class="flex flex-col gap-8">
          <div>
            <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 class="oryx-heading text-base font-semibold text-foreground">{m.oryxel_recommendations()}</h3>
              {#if onRefreshRecommendations}
                <Button
                  variant="secondary"
                  size="sm"
                  class="h-9 shrink-0 gap-2 rounded-full border-subtle bg-subtle px-4 text-sm font-semibold shadow-sm"
                  disabled={refreshingRecommendations || !canRefreshRecommendations}
                  onclick={() => {
                    const result = onRefreshRecommendations?.()

                    if (result instanceof Promise) {
                      void result.catch(() => false)
                    }
                  }}
                >
                  <RefreshCw class={cn('size-4', refreshingRecommendations && 'animate-spin')} aria-hidden="true" />
                  {m.oryxel_rec_refresh()}
                </Button>
              {/if}
            </div>
            <ToTryTable
              rows={recommendationRows}
              onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')}
              emptyTitle={m.oryxel_rec_empty_title()}
              emptyHint={m.oryxel_rec_empty_hint()}
            />
          </div>
          {#if wishlistRows.length > 0}
            <div>
              <h3 class="oryx-heading mb-3 text-base font-semibold text-foreground">{m.oryxel_wishlist_title()}</h3>
              <ToTryTable
                rows={wishlistRows}
                onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')}
                emptyTitle={m.oryxel_empty_to_try_title()}
                emptyHint={m.oryxel_empty_to_try_hint()}
              />
            </div>
          {/if}
        </div>
      {/if}
    {:else if fragranceTab === 'liked'}
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <ScentDiaryTable
          rows={diaryState.liked}
          {onRatingChange}
          onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
          emptyTitle={m.oryxel_empty_liked_title()}
          emptyHint={m.oryxel_empty_liked_hint()}
        />
      {/if}
    {:else if fragranceTab === 'neutral'}
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <ScentDiaryTable
          rows={diaryState.neutral}
          {onRatingChange}
          onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
          emptyTitle={m.oryxel_empty_neutral_title()}
          emptyHint={m.oryxel_empty_neutral_hint()}
        />
      {/if}
    {:else if fragranceTab === 'disliked'}
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <ScentDiaryTable
          rows={diaryState.disliked}
          {onRatingChange}
          onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
          emptyTitle={m.oryxel_empty_disliked_title()}
          emptyHint={m.oryxel_empty_disliked_hint()}
        />
      {/if}
    {/if}
  </div>
</div>
