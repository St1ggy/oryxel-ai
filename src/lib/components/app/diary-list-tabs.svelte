<script lang="ts">
  import { Tabs } from 'bits-ui'
  import { tick } from 'svelte'

  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import ScentDiaryTable from '$lib/components/app/scent-diary-table.svelte'
  import ToTryTable from '$lib/components/app/to-try-table.svelte'
  import { type DiaryListTabValue, diaryListTabItems } from '$lib/diary/diary-tab-items'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { DiaryData, DiaryRow, RadarAxis } from '$lib/types/diary'
  import type { Snippet } from 'svelte'

  type Props = {
    listTab: DiaryListTabValue
    diaryState: DiaryData
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
  }

  let {
    listTab = $bindable(),
    diaryState,
    onRatingChange,
    onOpenDetail,
    onProfileSync,
    layout,
    contentWidthClass = '',
    headerStart,
    headerEnd,
    statusBanner,
    profile,
  }: Props = $props()

  const tabItems = $derived(diaryListTabItems())

  // Animated indicator state
  let tabsListElement = $state<HTMLElement | null>(null)
  let indicatorLeft = $state(0)
  let indicatorWidth = $state(0)
  let indicatorReady = $state(false)

  $effect(() => {
    // Depend on listTab so this re-runs on every change
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    listTab
    void tick().then(() => {
      if (!tabsListElement) return

      const active = tabsListElement.querySelector('[data-state="active"]') as HTMLElement | null

      if (active) {
        indicatorLeft = active.offsetLeft
        indicatorWidth = active.offsetWidth
        indicatorReady = true
      }
    })
  })

  const shellClass = $derived(cn('flex min-h-0 flex-col', layout === 'desktop' ? 'flex-1' : 'gap-3'))

  const listClassMobile = cn(
    'flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 scrollbar-hide',
  )

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
    <div class="flex h-[68px] shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:gap-4 md:px-10">
      {@render headerStart?.()}
      <div
        bind:this={tabsListElement}
        class="scrollbar-hide relative flex min-w-0 flex-1 items-center gap-5 overflow-x-auto md:gap-7"
      >
        <Tabs.List class="contents" aria-label={m.oryxel_diary_lists_aria()}>
          {#each tabItems as { value, label } (value)}
            <Tabs.Trigger {value} class={triggerDesktop}>{label}</Tabs.Trigger>
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
        <Tabs.Content value="owned" class={panelClass}>
          <ScentDiaryTable
            rows={diaryState.owned}
            {onRatingChange}
            onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
          />
        </Tabs.Content>
        <Tabs.Content value="to_try" class={panelClass}>
          <ToTryTable rows={diaryState.to_try} onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')} />
        </Tabs.Content>
        <Tabs.Content value="liked" class={panelClass}>
          <ScentDiaryTable
            rows={diaryState.liked}
            {onRatingChange}
            onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
          />
        </Tabs.Content>
        <Tabs.Content value="disliked" class={panelClass}>
          <ScentDiaryTable
            rows={diaryState.disliked}
            {onRatingChange}
            onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
          />
        </Tabs.Content>
        <Tabs.Content value="profile" class={panelClass}>
          <DiaryProfileTab variant="desktop" {profile} {onProfileSync} />
        </Tabs.Content>
      </div>
    </div>
  {:else}
    <Tabs.List class={listClassMobile}>
      {#each tabItems as { value, label } (value)}
        <Tabs.Trigger {value} class={triggerMobile}>{label}</Tabs.Trigger>
      {/each}
    </Tabs.List>
    <Tabs.Content value="owned" class={panelClass}>
      <ScentDiaryTable rows={diaryState.owned} {onRatingChange} onOpenDetail={(row) => onOpenDetail?.(row, 'diary')} />
    </Tabs.Content>
    <Tabs.Content value="to_try" class={panelClass}>
      <ToTryTable rows={diaryState.to_try} onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')} />
    </Tabs.Content>
    <Tabs.Content value="liked" class={panelClass}>
      <ScentDiaryTable rows={diaryState.liked} {onRatingChange} onOpenDetail={(row) => onOpenDetail?.(row, 'diary')} />
    </Tabs.Content>
    <Tabs.Content value="disliked" class={panelClass}>
      <ScentDiaryTable
        rows={diaryState.disliked}
        {onRatingChange}
        onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
      />
    </Tabs.Content>
    <Tabs.Content value="profile" class={panelClass}>
      <DiaryProfileTab variant="mobile" {profile} {onProfileSync} />
    </Tabs.Content>
  {/if}
</Tabs.Root>
