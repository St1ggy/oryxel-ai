<script lang="ts">
  import { Tabs } from 'bits-ui'
  import { tick } from 'svelte'

  import DiaryGuideTab from '$lib/components/app/diary-guide-tab.svelte'
  import DiaryNotesTab from '$lib/components/app/diary-notes-tab.svelte'
  import DiaryProfileSkeleton from '$lib/components/app/diary-profile-skeleton.svelte'
  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import DiaryTableSkeleton from '$lib/components/app/diary-table-skeleton.svelte'
  import ScentDiaryTable from '$lib/components/app/scent-diary-table.svelte'
  import ToTryTable from '$lib/components/app/to-try-table.svelte'
  import { type DiaryListTabValue, MOBILE_EXCLUDED_TABS, diaryListTabItems } from '$lib/diary/diary-tab-items'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { ActivityEntry, DiaryData, DiaryRow, NoteRelationship, RadarAxis } from '$lib/types/diary'
  import type { Snippet } from 'svelte'

  type Props = {
    listTab: DiaryListTabValue
    diaryState: DiaryData
    loading?: boolean
    onRatingChange: (id: number, fragranceId: number, rating: number) => void
    onOpenDetail?: (row: DiaryRow, context: 'diary' | 'to_try') => void
    layout: 'desktop' | 'mobile'
    contentWidthClass?: string
    headerStart?: Snippet
    headerEnd?: Snippet
    statusBanner?: Snippet
    onProfileSync?: () => void
    profile: {
      displayName: string
      totalCount: number
      favoriteNote: string | null
      archetype: string | null
      radarAxes: RadarAxis[]
      suggestions: string[]
    }
    recentActivity?: ActivityEntry[]
    noteRelationships?: NoteRelationship[]
    graphStyle?: string
  }

  let {
    listTab = $bindable(),
    diaryState,
    loading = false,
    onRatingChange,
    onOpenDetail,
    onProfileSync,
    layout,
    contentWidthClass = '',
    headerStart,
    headerEnd,
    statusBanner,
    profile,
    recentActivity,
    noteRelationships = [],
    graphStyle = 'default',
  }: Props = $props()

  /* eslint-disable camelcase */
  const tabCounts = $derived<Partial<Record<DiaryListTabValue, number>>>({
    owned: diaryState.owned.length,
    to_try: diaryState.to_try.length,
    liked: diaryState.liked.length,
    neutral: diaryState.neutral.length,
    disliked: diaryState.disliked.length,
  })
  /* eslint-enable camelcase */

  const tabItems = $derived(
    diaryListTabItems().filter(
      (tab) => !(layout === 'mobile' && (MOBILE_EXCLUDED_TABS as DiaryListTabValue[]).includes(tab.value)),
    ),
  )

  let tabsListElement = $state<HTMLElement | null>(null)
  let mobileTabsListElement = $state<HTMLElement | null>(null)
  let indicatorLeft = $state(0)
  let indicatorWidth = $state(0)
  let indicatorReady = $state(false)
  let desktopCanScrollLeft = $state(false)
  let desktopCanScrollRight = $state(false)
  let mobileCanScrollLeft = $state(false)
  let mobileCanScrollRight = $state(false)

  function checkScrollEdges(element: HTMLElement) {
    return {
      left: element.scrollLeft > 0,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    }
  }

  $effect(() => {
    const element = tabsListElement

    if (!element) return

    const update = () => {
      const edges = checkScrollEdges(element)

      desktopCanScrollLeft = edges.left
      desktopCanScrollRight = edges.right
    }

    requestAnimationFrame(update)
    element.addEventListener('scroll', update, { passive: true })

    return () => element.removeEventListener('scroll', update)
  })

  $effect(() => {
    const element = mobileTabsListElement

    if (!element) return

    const update = () => {
      const edges = checkScrollEdges(element)

      mobileCanScrollLeft = edges.left
      mobileCanScrollRight = edges.right
    }

    requestAnimationFrame(update)
    element.addEventListener('scroll', update, { passive: true })

    return () => element.removeEventListener('scroll', update)
  })

  function scrollMaskStyle(canLeft: boolean, canRight: boolean): string {
    if (!canLeft && !canRight) return ''

    let gradient: string

    if (canLeft && canRight) {
      gradient = 'linear-gradient(to right, transparent, black 36px, black calc(100% - 36px), transparent)'
    } else if (canLeft) {
      gradient = 'linear-gradient(to right, transparent, black 36px)'
    } else {
      gradient = 'linear-gradient(to right, black calc(100% - 36px), transparent)'
    }

    return `-webkit-mask-image: ${gradient}; mask-image: ${gradient};`
  }

  const desktopMaskStyle = $derived(scrollMaskStyle(desktopCanScrollLeft, desktopCanScrollRight))
  const mobileMaskStyle = $derived(scrollMaskStyle(mobileCanScrollLeft, mobileCanScrollRight))

  function updateIndicator() {
    if (!tabsListElement) return

    const active = tabsListElement.querySelector('[data-state="active"]') as HTMLElement | null

    if (active) {
      indicatorLeft = active.offsetLeft
      indicatorWidth = active.offsetWidth
      indicatorReady = true
    }
  }

  $effect(() => {
    // Depend on listTab and tabsListElement so this re-runs on change or first mount.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    listTab
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tabsListElement
    void tick().then(() => requestAnimationFrame(updateIndicator))
  })

  const shellClass = $derived(cn('flex min-h-0 flex-col', layout === 'desktop' ? 'flex-1' : 'gap-3'))

  const listClassMobile = cn('flex gap-1 p-1')

  const triggerMobile = cn(
    'oryx-transition shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium text-foreground-muted data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm',
  )

  const triggerDesktop = cn(
    'oryx-transition relative whitespace-nowrap py-4 text-sm font-medium text-foreground-muted hover:text-foreground data-[state=active]:text-accent',
  )

  const panelClass = $derived(cn('oryx-tab-panel', { 'outline-none': layout === 'desktop' }))
</script>

<Tabs.Root class={shellClass} bind:value={listTab}>
  {#if layout === 'desktop'}
    <div
      class="flex h-[68px] shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:gap-4 md:px-10"
      data-tour="diary-tabs"
    >
      {@render headerStart?.()}
      <div
        bind:this={tabsListElement}
        class="scrollbar-hide relative flex min-w-0 flex-1 items-center gap-5 overflow-x-auto md:gap-7"
        style={desktopMaskStyle}
      >
        <Tabs.List class="contents" aria-label={m.oryxel_diary_lists_aria()}>
          {#each tabItems as { value, label } (value)}
            <Tabs.Trigger {value} class={triggerDesktop} data-tour={value === 'profile' ? 'profile-tab' : undefined}>
              {label}
              {#if !loading && tabCounts[value] !== undefined}
                <span
                  class="ml-1.5 rounded-full bg-muted px-1.5 py-px font-mono text-[10px] text-foreground-muted tabular-nums"
                  >{tabCounts[value]}</span
                >
              {/if}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
        {#if indicatorReady}
          <div
            class="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-accent transition-[left,width] duration-200 ease-out"
            style="left: {indicatorLeft}px; width: {indicatorWidth}px"
          ></div>
        {/if}
      </div>
      {@render headerEnd?.()}
    </div>
    {@render statusBanner?.()}
    <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-9">
      <div class={cn('w-full', contentWidthClass)}>
        <Tabs.Content value="owned" class={panelClass} data-tour="diary-table">
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
        </Tabs.Content>
        <Tabs.Content value="to_try" class={panelClass}>
          {#if loading}
            <DiaryTableSkeleton />
          {:else}
            <ToTryTable
              rows={diaryState.to_try}
              onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')}
              emptyTitle={m.oryxel_empty_to_try_title()}
              emptyHint={m.oryxel_empty_to_try_hint()}
            />
          {/if}
        </Tabs.Content>
        <Tabs.Content value="liked" class={panelClass}>
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
        </Tabs.Content>
        <Tabs.Content value="neutral" class={panelClass}>
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
        </Tabs.Content>
        <Tabs.Content value="disliked" class={panelClass}>
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
        </Tabs.Content>
        <Tabs.Content value="profile" class={panelClass}>
          {#if loading}
            <DiaryProfileSkeleton variant="desktop" />
          {:else}
            <DiaryProfileTab
              variant="desktop"
              {profile}
              {onProfileSync}
              {recentActivity}
              diaryCounts={tabCounts as {
                owned: number
                to_try: number
                liked: number
                neutral: number
                disliked: number
              }}
            />
          {/if}
        </Tabs.Content>
        <Tabs.Content value="notes" class={panelClass}>
          <DiaryNotesTab diaryData={diaryState} {noteRelationships} layout="desktop" {graphStyle} />
        </Tabs.Content>
        <Tabs.Content value="guide" class={panelClass}>
          <DiaryGuideTab layout="desktop" />
        </Tabs.Content>
      </div>
    </div>
  {:else}
    <div
      bind:this={mobileTabsListElement}
      class="scrollbar-hide overflow-x-auto rounded-lg border border-border bg-muted/50"
      style={mobileMaskStyle}
    >
      <Tabs.List class={listClassMobile}>
        {#each tabItems as { value, label } (value)}
          <Tabs.Trigger {value} class={triggerMobile}>
            {label}
            {#if !loading && tabCounts[value] !== undefined}
              <span class="ml-1 font-mono text-[10px] tabular-nums opacity-60">{tabCounts[value]}</span>
            {/if}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
    </div>
    <Tabs.Content value="owned" class={panelClass}>
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
    </Tabs.Content>
    <Tabs.Content value="to_try" class={panelClass}>
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <ToTryTable
          rows={diaryState.to_try}
          onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')}
          emptyTitle={m.oryxel_empty_to_try_title()}
          emptyHint={m.oryxel_empty_to_try_hint()}
        />
      {/if}
    </Tabs.Content>
    <Tabs.Content value="liked" class={panelClass}>
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
    </Tabs.Content>
    <Tabs.Content value="neutral" class={panelClass}>
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
    </Tabs.Content>
    <Tabs.Content value="disliked" class={panelClass}>
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
    </Tabs.Content>
    <Tabs.Content value="profile" class={panelClass}>
      {#if loading}
        <DiaryProfileSkeleton variant="mobile" />
      {:else}
        <DiaryProfileTab
          variant="mobile"
          {profile}
          {onProfileSync}
          {recentActivity}
          diaryCounts={tabCounts as { owned: number; to_try: number; liked: number; neutral: number; disliked: number }}
        />
      {/if}
    </Tabs.Content>
    <Tabs.Content value="notes" class={panelClass}>
      <DiaryNotesTab diaryData={diaryState} {noteRelationships} layout="mobile" {graphStyle} />
    </Tabs.Content>
    <Tabs.Content value="guide" class={panelClass}>
      <DiaryGuideTab layout="mobile" />
    </Tabs.Content>
  {/if}
</Tabs.Root>
