<script lang="ts">
  import { Tabs } from 'bits-ui'
  import { tick, untrack } from 'svelte'

  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import ScentDiaryTable from '$lib/components/app/scent-diary-table.svelte'
  import ToTryTable from '$lib/components/app/to-try-table.svelte'
  import { type DiaryListTabValue, MOBILE_EXCLUDED_TABS, diaryListTabItems } from '$lib/diary/diary-tab-items'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type {
    ActivityEntry,
    DiaryData,
    DiaryRow,
    NoteRelationship,
    NoteRelationshipSentiment,
    RadarAxis,
  } from '$lib/types/diary'
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
    recentActivity?: ActivityEntry[]
    noteRelationships?: NoteRelationship[]
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
    recentActivity,
    noteRelationships = [],
  }: Props = $props()

  const tabItems = $derived(
    diaryListTabItems().filter(
      (tab) => !(layout === 'mobile' && (MOBILE_EXCLUDED_TABS as DiaryListTabValue[]).includes(tab.value)),
    ),
  )

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

  // --- Notes tab state ---
  let lastNoteRelationshipsRef: NoteRelationship[] | null = null
  let localNotes = $state<NoteRelationship[]>(untrack(() => [...noteRelationships]))

  $effect(() => {
    if (noteRelationships !== lastNoteRelationshipsRef) {
      lastNoteRelationshipsRef = noteRelationships
      localNotes = [...noteRelationships]
    }
  })

  let editingLabel = $state<string | null>(null)
  let editingValue = $state('')

  const sentimentOptions: NoteRelationshipSentiment[] = ['love', 'like', 'neutral', 'dislike', 'redflag']

  function sentimentLabel(s: NoteRelationshipSentiment): string {
    switch (s) {
      case 'love': {
        return m.oryxel_notes_sentiment_love()
      }

      case 'like': {
        return m.oryxel_notes_sentiment_like()
      }

      case 'neutral': {
        return m.oryxel_notes_sentiment_neutral()
      }

      case 'dislike': {
        return m.oryxel_notes_sentiment_dislike()
      }

      case 'redflag': {
        return m.oryxel_notes_sentiment_redflag()
      }
    }
  }

  function sentimentColor(s: NoteRelationshipSentiment): string {
    switch (s) {
      case 'love': {
        return 'bg-accent/20 text-accent border-accent/30'
      }

      case 'like': {
        return 'bg-success/15 text-success border-success/30'
      }

      case 'neutral': {
        return 'bg-muted text-foreground-muted border-border'
      }

      case 'dislike': {
        return 'bg-warning/15 text-warning border-warning/30'
      }

      case 'redflag': {
        return 'bg-destructive/15 text-destructive border-destructive/30'
      }
    }
  }

  async function patchNote(note: string, updates: { sentiment?: NoteRelationshipSentiment; label?: string }) {
    const index = localNotes.findIndex((r) => r.note === note)

    if (index !== -1) {
      localNotes[index] = { ...localNotes[index], ...updates }
    }

    await fetch('/api/profile/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, ...updates }),
    })
  }

  function startEditLabel(r: NoteRelationship) {
    editingLabel = r.note
    editingValue = r.label
  }

  async function commitLabel(note: string) {
    if (editingLabel !== note) return

    await patchNote(note, { label: editingValue })
    editingLabel = null
  }

  function onLabelKeydown(event: KeyboardEvent, note: string) {
    if (event.key === 'Enter') void commitLabel(note)

    if (event.key === 'Escape') editingLabel = null
  }

  // --- Guide tab data ---
  const concentrations = [
    {
      name: 'Extrait de Parfum',
      abbr: 'EdP+',
      range: '20–40%',
      longevity: '8–12+ h',
      sillage: 'Low',
      strength: 100,
      desc: () => m.oryxel_guide_extrait_desc(),
    },
    {
      name: 'Eau de Parfum',
      abbr: 'EdP',
      range: '15–20%',
      longevity: '6–8 h',
      sillage: 'Medium',
      strength: 75,
      desc: () => m.oryxel_guide_edp_desc(),
    },
    {
      name: 'Eau de Toilette',
      abbr: 'EdT',
      range: '10–15%',
      longevity: '4–6 h',
      sillage: 'Light',
      strength: 55,
      desc: () => m.oryxel_guide_edt_desc(),
    },
    {
      name: 'Eau de Cologne',
      abbr: 'EdC',
      range: '2–4%',
      longevity: '2–3 h',
      sillage: 'Very light',
      strength: 25,
      desc: () => m.oryxel_guide_edc_desc(),
    },
    {
      name: 'Eau Fraîche',
      abbr: 'EF',
      range: '1–3%',
      longevity: '1–2 h',
      sillage: 'Minimal',
      strength: 12,
      desc: () => m.oryxel_guide_fraiche_desc(),
    },
  ] as const
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
        <Tabs.Content value="neutral" class={panelClass}>
          <ScentDiaryTable
            rows={diaryState.neutral}
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
          <DiaryProfileTab variant="desktop" {profile} {onProfileSync} {recentActivity} />
        </Tabs.Content>
        <Tabs.Content value="notes" class={panelClass}>
          {#if localNotes.length === 0}
            <p class="text-sm text-foreground-muted">{m.oryxel_notes_empty()}</p>
          {:else}
            <div class="overflow-x-auto rounded-xl border border-border bg-surface">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border text-left text-xs text-foreground-muted">
                    <th class="px-4 py-3 font-medium">{m.oryxel_notes_col_note()}</th>
                    <th class="px-4 py-3 font-medium">{m.oryxel_notes_col_sentiment()}</th>
                    <th class="px-4 py-3 font-medium">{m.oryxel_notes_col_label()}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each localNotes as r (r.note)}
                    <tr class="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td class="px-4 py-3 font-mono text-xs text-foreground">{r.note}</td>
                      <td class="px-4 py-3">
                        <div class="flex flex-wrap gap-1">
                          {#each sentimentOptions as s (s)}
                            <button
                              type="button"
                              class="oryx-transition rounded-full border px-2 py-0.5 text-xs font-medium {s ===
                              r.sentiment
                                ? sentimentColor(s)
                                : 'border-border bg-transparent text-foreground-muted hover:bg-muted'}"
                              onclick={() => patchNote(r.note, { sentiment: s })}
                            >
                              {sentimentLabel(s)}
                            </button>
                          {/each}
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        {#if editingLabel === r.note}
                          <input
                            class="oryx-input w-full rounded-md px-2 py-1 text-sm"
                            bind:value={editingValue}
                            onblur={() => commitLabel(r.note)}
                            onkeydown={(event) => onLabelKeydown(event, r.note)}
                          />
                        {:else}
                          <button
                            type="button"
                            class="oryx-transition w-full rounded-md px-2 py-1 text-left hover:bg-muted"
                            onclick={() => startEditLabel(r)}
                          >
                            {r.label}
                          </button>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </Tabs.Content>
        <Tabs.Content value="guide" class={panelClass}>
          <div class="max-w-[720px] space-y-3">
            {#each concentrations as c (c.abbr)}
              <div class="rounded-xl border border-border bg-surface p-4 md:p-5">
                <div class="mb-3 flex flex-wrap items-baseline gap-2">
                  <h2 class="oryx-heading text-base font-semibold">{c.name}</h2>
                  <span
                    class="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground-muted"
                    >{c.abbr}</span
                  >
                  <span class="text-xs text-foreground-muted">{c.range}</span>
                </div>
                <div class="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-accent" style="width: {c.strength}%"></div>
                </div>
                <div class="mb-3 flex flex-wrap gap-4 text-xs text-foreground-muted">
                  <span>⏱ {c.longevity}</span>
                  <span>💨 {c.sillage}</span>
                </div>
                <p class="text-sm text-foreground-muted">{c.desc()}</p>
              </div>
            {/each}
          </div>
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
    <Tabs.Content value="neutral" class={panelClass}>
      <ScentDiaryTable
        rows={diaryState.neutral}
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
      <DiaryProfileTab variant="mobile" {profile} {onProfileSync} {recentActivity} />
    </Tabs.Content>
  {/if}
</Tabs.Root>
