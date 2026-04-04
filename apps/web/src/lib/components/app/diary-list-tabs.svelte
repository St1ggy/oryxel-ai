<script lang="ts">
  import { Clock, Droplets, Flame, Layers, Leaf, MapPin, Minimize2, Sprout, Sun, Waves } from '@lucide/svelte'
  import { Tabs } from 'bits-ui'
  import { tick, untrack } from 'svelte'

  import DiaryProfileSkeleton from '$lib/components/app/diary-profile-skeleton.svelte'
  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import DiaryTableSkeleton from '$lib/components/app/diary-table-skeleton.svelte'
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
      sillage: 'Intimate',
      strength: 100,
      color: 'text-accent',
      desc: () => m.oryxel_guide_extrait_desc(),
    },
    {
      name: 'Eau de Parfum',
      abbr: 'EdP',
      range: '15–20%',
      longevity: '6–8 h',
      sillage: 'Noticeable',
      strength: 75,
      color: 'text-accent/80',
      desc: () => m.oryxel_guide_edp_desc(),
    },
    {
      name: 'Eau de Toilette',
      abbr: 'EdT',
      range: '10–15%',
      longevity: '4–6 h',
      sillage: 'Light',
      strength: 55,
      color: 'text-accent/60',
      desc: () => m.oryxel_guide_edt_desc(),
    },
    {
      name: 'Eau de Cologne',
      abbr: 'EdC',
      range: '2–4%',
      longevity: '2–3 h',
      sillage: 'Subtle',
      strength: 25,
      color: 'text-accent/40',
      desc: () => m.oryxel_guide_edc_desc(),
    },
    {
      name: 'Eau Fraîche',
      abbr: 'EF',
      range: '1–3%',
      longevity: '1–2 h',
      sillage: 'Minimal',
      strength: 12,
      color: 'text-accent/25',
      desc: () => m.oryxel_guide_fraiche_desc(),
    },
  ] as const

  const tips = [
    {
      icon: MapPin,
      title: () => m.oryxel_guide_tip_pulse_title(),
      desc: () => m.oryxel_guide_tip_pulse_desc(),
    },
    {
      icon: Minimize2,
      title: () => m.oryxel_guide_tip_less_title(),
      desc: () => m.oryxel_guide_tip_less_desc(),
    },
    {
      icon: Clock,
      title: () => m.oryxel_guide_tip_drydown_title(),
      desc: () => m.oryxel_guide_tip_drydown_desc(),
    },
    {
      icon: Layers,
      title: () => m.oryxel_guide_tip_layer_title(),
      desc: () => m.oryxel_guide_tip_layer_desc(),
    },
  ] as const

  const families = [
    {
      icon: Sun,
      bg: 'bg-yellow-400/10',
      iconColor: 'text-yellow-500',
      name: () => m.oryxel_guide_family_citrus_name(),
      desc: () => m.oryxel_guide_family_citrus_desc(),
    },
    {
      icon: Sprout,
      bg: 'bg-pink-400/10',
      iconColor: 'text-pink-500',
      name: () => m.oryxel_guide_family_floral_name(),
      desc: () => m.oryxel_guide_family_floral_desc(),
    },
    {
      icon: Leaf,
      bg: 'bg-amber-400/10',
      iconColor: 'text-amber-600',
      name: () => m.oryxel_guide_family_woody_name(),
      desc: () => m.oryxel_guide_family_woody_desc(),
    },
    {
      icon: Flame,
      bg: 'bg-orange-400/10',
      iconColor: 'text-orange-500',
      name: () => m.oryxel_guide_family_oriental_name(),
      desc: () => m.oryxel_guide_family_oriental_desc(),
    },
    {
      icon: Waves,
      bg: 'bg-sky-400/10',
      iconColor: 'text-sky-500',
      name: () => m.oryxel_guide_family_fresh_name(),
      desc: () => m.oryxel_guide_family_fresh_desc(),
    },
    {
      icon: Droplets,
      bg: 'bg-violet-400/10',
      iconColor: 'text-violet-500',
      name: () => m.oryxel_guide_family_gourmand_name(),
      desc: () => m.oryxel_guide_family_gourmand_desc(),
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
          {#if loading}
            <DiaryTableSkeleton />
          {:else}
            <ScentDiaryTable
              rows={diaryState.owned}
              {onRatingChange}
              onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
            />
          {/if}
        </Tabs.Content>
        <Tabs.Content value="to_try" class={panelClass}>
          {#if loading}
            <DiaryTableSkeleton />
          {:else}
            <ToTryTable rows={diaryState.to_try} onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')} />
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
            />
          {/if}
        </Tabs.Content>
        <Tabs.Content value="profile" class={panelClass}>
          {#if loading}
            <DiaryProfileSkeleton variant="desktop" />
          {:else}
            <DiaryProfileTab variant="desktop" {profile} {onProfileSync} {recentActivity} />
          {/if}
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
          <div class="max-w-[720px] space-y-8">
            <!-- Concentrations -->
            <section>
              <div class="mb-4 space-y-1">
                <h2 class="oryx-heading text-base font-semibold">{m.oryxel_guide_subtitle()}</h2>
              </div>
              <div class="space-y-3">
                {#each concentrations as c (c.abbr)}
                  <div class="rounded-xl border border-border bg-surface p-4 md:p-5">
                    <div class="flex items-start gap-4">
                      <!-- Strength dot cluster -->
                      <div class="mt-0.5 flex shrink-0 flex-col items-center gap-1">
                        {#each [100, 75, 55, 25, 12] as level (level)}
                          <div
                            class="size-2 rounded-full transition-colors"
                            style="background-color: {c.strength >= level
                              ? 'var(--color-accent)'
                              : 'var(--oryx-bg-muted)'}"
                          ></div>
                        {/each}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="mb-1.5 flex flex-wrap items-baseline gap-2">
                          <h3 class="oryx-heading text-sm font-semibold">{c.name}</h3>
                          <span
                            class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground-muted"
                            >{c.abbr}</span
                          >
                          <span class="text-xs text-foreground-muted">{c.range}</span>
                        </div>
                        <!-- Strength bar -->
                        <div class="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            class="h-full rounded-full bg-accent transition-[width]"
                            style="width: {c.strength}%"
                          ></div>
                        </div>
                        <!-- Stats -->
                        <div class="mb-2.5 flex flex-wrap gap-4 text-xs text-foreground-muted">
                          <span class="flex items-center gap-1">
                            <Clock class="size-3.5 shrink-0 opacity-60" />
                            {c.longevity}
                          </span>
                          <span class="flex items-center gap-1">
                            <Waves class="size-3.5 shrink-0 opacity-60" />
                            {c.sillage}
                          </span>
                        </div>
                        <p class="text-sm leading-relaxed text-foreground-muted">{c.desc()}</p>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </section>

            <!-- Application Tips -->
            <section>
              <h2 class="oryx-heading mb-4 text-base font-semibold">{m.oryxel_guide_tips_title()}</h2>
              <div class="grid gap-3 sm:grid-cols-2">
                {#each tips as tip (tip.title())}
                  <div class="flex gap-3 rounded-xl border border-border bg-surface p-4">
                    <div class="mt-0.5 shrink-0 rounded-lg bg-accent/10 p-2">
                      <tip.icon class="size-4 text-accent" />
                    </div>
                    <div>
                      <p class="mb-1 text-sm font-medium text-foreground">{tip.title()}</p>
                      <p class="text-xs leading-relaxed text-foreground-muted">{tip.desc()}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </section>

            <!-- Fragrance Families -->
            <section>
              <h2 class="oryx-heading mb-4 text-base font-semibold">{m.oryxel_guide_families_title()}</h2>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {#each families as fam (fam.name())}
                  <div class="flex gap-3 rounded-xl border border-border bg-surface p-4">
                    <div class="mt-0.5 shrink-0 rounded-lg p-2 {fam.bg}">
                      <fam.icon class="size-4 {fam.iconColor}" />
                    </div>
                    <div>
                      <p class="mb-1 text-sm font-medium text-foreground">{fam.name()}</p>
                      <p class="text-xs leading-relaxed text-foreground-muted">{fam.desc()}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </section>
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
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <ScentDiaryTable
          rows={diaryState.owned}
          {onRatingChange}
          onOpenDetail={(row) => onOpenDetail?.(row, 'diary')}
        />
      {/if}
    </Tabs.Content>
    <Tabs.Content value="to_try" class={panelClass}>
      {#if loading}
        <DiaryTableSkeleton />
      {:else}
        <ToTryTable rows={diaryState.to_try} onOpenDetail={(row) => onOpenDetail?.(row, 'to_try')} />
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
        />
      {/if}
    </Tabs.Content>
    <Tabs.Content value="profile" class={panelClass}>
      {#if loading}
        <DiaryProfileSkeleton variant="mobile" />
      {:else}
        <DiaryProfileTab variant="mobile" {profile} {onProfileSync} {recentActivity} />
      {/if}
    </Tabs.Content>
  {/if}
</Tabs.Root>
