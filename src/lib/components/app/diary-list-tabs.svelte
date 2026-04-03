<script lang="ts">
  import { Tabs } from 'bits-ui'

  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import ScentDiaryTable from '$lib/components/app/scent-diary-table.svelte'
  import ToTryTable from '$lib/components/app/to-try-table.svelte'
  import { type DiaryListTabValue, diaryListTabItems } from '$lib/diary/diary-tab-items'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { DiaryRow, FragranceListType } from '$lib/types/diary'
  import type { Snippet } from 'svelte'

  type DiaryTables = Record<FragranceListType, DiaryRow[]>

  type Props = {
    listTab: DiaryListTabValue
    diaryState: DiaryTables
    onRatingChange: (id: number, fragranceId: number, rating: number) => void
    onDelete?: (id: number) => void
    onEdit?: (row: DiaryRow) => void
    onTriedRecommendation?: (brand: string, name: string) => void
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
      radarAxes: import('$lib/types/diary').RadarAxis[]
      suggestions: string[]
    }
  }

  let {
    listTab = $bindable(),
    diaryState,
    onRatingChange,
    onDelete,
    onEdit,
    onTriedRecommendation,
    onProfileSync,
    layout,
    contentWidthClass = '',
    headerStart,
    headerEnd,
    statusBanner,
    profile,
  }: Props = $props()

  const tabItems = $derived(diaryListTabItems())

  const shellClass = $derived(cn('flex min-h-0 flex-col', layout === 'desktop' ? 'flex-1' : 'gap-3'))

  const listClassMobile = cn(
    'flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 scrollbar-hide',
  )

  const triggerMobile = cn(
    'oryx-transition shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium text-foreground-muted data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm',
  )

  const triggerDesktop = cn(
    'oryx-transition relative whitespace-nowrap py-4 text-sm font-medium text-foreground-muted hover:text-foreground data-[state=active]:text-accent',
    'after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100',
    'after:bg-[var(--oryx-accent-solid)]',
  )

  const panelClass = $derived(cn('oryx-tab-panel', { 'outline-none': layout === 'desktop' }))
</script>

<Tabs.Root class={shellClass} bind:value={listTab}>
  {#if layout === 'desktop'}
    <div class="flex h-[68px] shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:gap-4 md:px-10">
      {@render headerStart?.()}
      <Tabs.List
        class="scrollbar-hide flex min-w-0 flex-1 items-center gap-5 overflow-x-auto md:gap-7"
        aria-label={m.oryxel_diary_lists_aria()}
      >
        {#each tabItems as { value, label } (value)}
          <Tabs.Trigger {value} class={triggerDesktop}>{label}</Tabs.Trigger>
        {/each}
      </Tabs.List>
      {@render headerEnd?.()}
    </div>
    {@render statusBanner?.()}
    <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-9">
      <div class={cn('w-full', contentWidthClass)}>
        <Tabs.Content value="owned" class={panelClass}>
          <ScentDiaryTable rows={diaryState.owned} {onRatingChange} {onDelete} {onEdit} />
        </Tabs.Content>
        <Tabs.Content value="to_try" class={panelClass}>
          <ToTryTable rows={diaryState.to_try} {onRatingChange} {onDelete} {onEdit} onTried={onTriedRecommendation} />
        </Tabs.Content>
        <Tabs.Content value="liked" class={panelClass}>
          <ScentDiaryTable rows={diaryState.liked} {onRatingChange} {onDelete} {onEdit} />
        </Tabs.Content>
        <Tabs.Content value="disliked" class={panelClass}>
          <ScentDiaryTable rows={diaryState.disliked} {onRatingChange} {onDelete} {onEdit} />
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
      <ScentDiaryTable rows={diaryState.owned} {onRatingChange} {onDelete} {onEdit} />
    </Tabs.Content>
    <Tabs.Content value="to_try" class={panelClass}>
      <ToTryTable rows={diaryState.to_try} {onRatingChange} {onDelete} {onEdit} onTried={onTriedRecommendation} />
    </Tabs.Content>
    <Tabs.Content value="liked" class={panelClass}>
      <ScentDiaryTable rows={diaryState.liked} {onRatingChange} {onDelete} {onEdit} />
    </Tabs.Content>
    <Tabs.Content value="disliked" class={panelClass}>
      <ScentDiaryTable rows={diaryState.disliked} {onRatingChange} {onDelete} {onEdit} />
    </Tabs.Content>
    <Tabs.Content value="profile" class={panelClass}>
      <DiaryProfileTab variant="mobile" {profile} {onProfileSync} />
    </Tabs.Content>
  {/if}
</Tabs.Root>
