<script lang="ts">
  import { untrack } from 'svelte'
  import { fade } from 'svelte/transition'

  import AiStatusFloat from '$lib/components/app/ai-status-float.svelte'
  import AppChatPanel from '$lib/components/app/app-chat-panel.svelte'
  import DiaryEditModal from '$lib/components/app/diary-edit-modal.svelte'
  import DiaryHeaderControls from '$lib/components/app/diary-header-controls.svelte'
  import DiaryListTabs from '$lib/components/app/diary-list-tabs.svelte'
  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import FragranceDetailModal from '$lib/components/app/fragrance-detail-modal.svelte'
  import MobilePrimaryNav from '$lib/components/app/mobile-primary-nav.svelte'
  import ChevronPanelLeftIcon from '$lib/components/icons/ChevronPanelLeftIcon.svelte'
  import ChevronPanelRightIcon from '$lib/components/icons/ChevronPanelRightIcon.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { DiaryListTabValue } from '$lib/diary/diary-tab-items'
  import type { ChatMessage, DiaryMobileTab, DiaryRow, FragranceListType } from '$lib/types/diary'
  import type { PageData } from './$types'

  import { goto, invalidateAll } from '$app/navigation'

  const { data }: { data: PageData } = $props()

  let chatOpen = $state(true)
  let chatDraft = $state('')
  let mobileTab = $state<DiaryMobileTab>('lists')
  let listTab = $state<DiaryListTabValue>(untrack(() => data.initialTab ?? 'owned'))
  let editRow = $state<DiaryRow | null>(null)
  let detailOpen = $state(false)
  let detailRow = $state<DiaryRow | null>(null)
  let detailContext = $state<'diary' | 'to_try'>('diary')

  $effect(() => {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(`?tab=${listTab}`, { replaceState: true, noScroll: true, keepFocus: true })
  })
  let editOpen = $state(false)

  /** Local rating edits keyed by fragranceId; reset when fresh server data arrives. */
  let ratingOverrides = $state<Record<number, number>>({})

  let lastDiaryRef: PageData['diary'] | null = null

  $effect(() => {
    const diary = data.diary

    if (diary !== lastDiaryRef) {
      lastDiaryRef = diary
      ratingOverrides = {}
    }
  })

  function rowsWithOverrides(rows: DiaryRow[]): DiaryRow[] {
    return rows.map((row) =>
      row.fragranceId in ratingOverrides ? { ...row, rating: ratingOverrides[row.fragranceId] } : row,
    )
  }

  const diaryState = $derived({
    to_try: rowsWithOverrides(data.diary.to_try),
    liked: rowsWithOverrides(data.diary.liked),
    neutral: rowsWithOverrides(data.diary.neutral),
    disliked: rowsWithOverrides(data.diary.disliked),
    owned: rowsWithOverrides(data.diary.owned),
  })
  const profileData = $derived(
    data.profile ?? {
      displayName: m.oryxel_profile_default_user(),
      totalCount: 0,
      favoriteNote: null,
      archetype: null,
      radarAxes: [],
      suggestions: [],
    },
  )
  const pendingItems = $derived(data.pendingPatches ?? [])

  function renderAssistantMessage(content: string): string {
    if (content.startsWith('CRITICAL_PENDING:')) {
      return m.oryxel_chat_critical_pending({
        summary: content.replace('CRITICAL_PENDING:', '').trim(),
      })
    }

    if (content.startsWith('PATCH_APPLIED:')) {
      return m.oryxel_chat_patch_applied({
        summary: content.replace('PATCH_APPLIED:', '').trim(),
      })
    }

    return content
  }

  let messages = $state<ChatMessage[]>([])
  let initializedMessages = $state(false)

  $effect(() => {
    if (initializedMessages) {
      return
    }

    const chatHistory = data.chatHistory ?? []

    messages =
      chatHistory.length > 0
        ? chatHistory.map((message) => ({
            ...message,
            content: message.role === 'assistant' ? renderAssistantMessage(message.content) : message.content,
          }))
        : [
            {
              id: 'm1',
              role: 'assistant' as const,
              content: m.oryxel_chat_greeting(),
            },
          ]
    initializedMessages = true
  })

  type SyncProgress = {
    step: number
    total: number
    phase: 'owned' | 'liked' | 'disliked' | 'profile' | 'recommendations' | 'to_try'
  } | null

  type PatchProgress = { step: number; total: number } | null

  type JobResult = {
    id: number
    status: string
    progress: { step: number; total: number; phase: string }[]
    result: Record<string, unknown> | null
    errorMessage: string | null
  }

  let syncProgress = $state<SyncProgress>(null)
  let patchProgress = $state<PatchProgress>(null)
  let thinking = $state(false)

  // Resume polling for jobs that were still running when the page was last closed/refreshed
  let jobsResumed = false

  $effect(() => {
    if (jobsResumed) return

    jobsResumed = true

    const syncJob = (data.activeJobs ?? []).find((index) => index.type === 'profile_sync')

    if (syncJob) {
      const latest = syncJob.progress.at(-1)

      syncProgress = latest
        ? { step: latest.step, total: latest.total, phase: latest.phase as NonNullable<SyncProgress>['phase'] }
        : { step: 0, total: 1, phase: 'profile' }
      void pollJob(syncJob.id).finally(() => {
        syncProgress = null
        void invalidateAll()
      })
    }

    const chatJob = (data.activeJobs ?? []).find((index) => index.type === 'agent_chat')

    if (chatJob) {
      thinking = true
      void (async () => {
        try {
          const job = await (async () => {
            while (true) {
              await new Promise((resolve) => setTimeout(resolve, 1500))
              const r = await fetch(`/api/jobs/${chatJob.id}`)

              if (!r.ok) throw new Error('poll failed')

              const index = (await r.json()) as JobResult

              if (index.status === 'done' || index.status === 'failed') return index

              const latest = index.progress.at(-1)

              if (latest?.phase === 'applying') {
                thinking = false
                patchProgress = { step: latest.step, total: latest.total }
              }
            }
          })()

          patchProgress = null
          thinking = false

          if (job.status !== 'failed') {
            const result = job.result ?? {}

            if (result.triggerSync) void triggerProfileSync()
          }
        } catch {
          // silently ignore
        } finally {
          thinking = false
          patchProgress = null
          void invalidateAll()
        }
      })()
    }
  })
  const hasChatAccess = $derived(data.hasChatAccess)
  const providerOptions = $derived(data.chatProviders ?? [])
  let selectedProvider = $state<string>('')

  $effect(() => {
    if (providerOptions.length === 0) {
      selectedProvider = ''

      return
    }

    if (!providerOptions.some((provider) => provider.value === selectedProvider)) {
      selectedProvider = providerOptions.find((provider) => provider.active)?.value ?? providerOptions[0]?.value ?? ''
    }
  })

  async function pollJob(jobId: number, intervalMs = 2000): Promise<JobResult> {
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))

      const pollResponse = await fetch(`/api/jobs/${jobId}`)

      if (!pollResponse.ok) throw new Error(`Job poll failed: ${pollResponse.status}`)

      const job = (await pollResponse.json()) as JobResult

      if (job.status === 'done' || job.status === 'failed') return job

      // Update progress from latest event in progress array
      const latest = job.progress.at(-1)

      if (latest) {
        syncProgress = {
          step: latest.step,
          total: latest.total,
          phase: latest.phase as NonNullable<SyncProgress>['phase'],
        }
      }
    }
  }

  async function triggerProfileSync() {
    syncProgress = { step: 0, total: 1, phase: 'profile' }

    try {
      const response = await fetch('/api/agent/profile-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: data.locale }),
      })

      if (!response.ok) throw new Error('Sync failed')

      const { jobId } = (await response.json()) as { jobId: number }

      await pollJob(jobId)
    } catch {
      // silently ignore — diary still reloads
    } finally {
      syncProgress = null
      void invalidateAll()
    }
  }

  async function onSend(text: string) {
    messages = [...messages, { id: crypto.randomUUID(), role: 'user', content: text }]
    thinking = true

    let autoSync = false

    try {
      const response = await fetch('/api/agent/preferences/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, locale: data.locale, provider: selectedProvider || undefined }),
      })

      if (!response.ok) throw new Error('Agent request failed')

      const { jobId } = (await response.json()) as { jobId: number }

      // Poll for completion, updating patchProgress from job progress events
      const job = await (async () => {
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 1500))

          const pollResponse = await fetch(`/api/jobs/${jobId}`)

          if (!pollResponse.ok) throw new Error(`Job poll failed: ${pollResponse.status}`)

          const index = (await pollResponse.json()) as JobResult

          if (index.status === 'done' || index.status === 'failed') return index

          const latest = index.progress.at(-1)

          if (latest?.phase === 'applying') {
            thinking = false
            patchProgress = { step: latest.step, total: latest.total }
          }
        }
      })()

      patchProgress = null
      thinking = false

      if (job.status === 'failed') throw new Error(job.errorMessage ?? 'Agent failed')

      const result = job.result ?? {}

      autoSync = result.triggerSync === true

      const summary = (result.summary as string | null) ?? ''
      const responseText =
        (result.reply as string | undefined) ??
        (result.requiresConfirmation
          ? m.oryxel_chat_critical_pending({ summary })
          : m.oryxel_chat_patch_applied({ summary }))

      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: responseText }]
    } catch {
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: m.oryxel_chat_error_generic() }]
    } finally {
      thinking = false
      patchProgress = null
      void invalidateAll()

      if (autoSync) {
        void triggerProfileSync()
      }
    }
  }

  async function onRatingChange(id: number, fragranceId: number, rating: number) {
    ratingOverrides = { ...ratingOverrides, [fragranceId]: rating }
    await fetch(`/api/diary/entries/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating }),
    })
    void invalidateAll()
  }

  async function onDelete(id: number) {
    await fetch(`/api/diary/entries/${id}`, { method: 'DELETE' })
    void invalidateAll()
  }

  function onEdit(row: DiaryRow) {
    editRow = row
    editOpen = true
  }

  function openDetail(row: DiaryRow, context: 'diary' | 'to_try') {
    detailRow = row
    detailContext = context
    detailOpen = true
  }

  async function onSaveEdit(
    id: number,
    updates: { listType: FragranceListType; userComment: string; isOwned: boolean },
  ) {
    const response = await fetch(`/api/diary/entries/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) throw new Error('save failed')

    void invalidateAll()
  }

  function onMobileNav(tab: DiaryMobileTab) {
    if (tab === 'lists' && mobileTab === 'profile' && listTab === 'profile') {
      listTab = 'owned'
    }

    mobileTab = tab
  }

  function onTriedRecommendation(brand: string, name: string) {
    chatDraft = m.oryxel_rec_tried_draft({ brand, name })
    chatOpen = true

    if (mobileTab !== 'chat') mobileTab = 'chat'
  }

  const desktopContentWidthClass = $derived(listTab === 'profile' ? 'mx-auto w-full max-w-[880px]' : 'w-full')
</script>

<div class="flex min-h-0 w-full flex-1 flex-col">
  <div class="hidden min-h-0 flex-1 md:flex">
    <section
      class={cn(
        'flex min-w-0 shrink-0 flex-col overflow-hidden border-r bg-[color-mix(in_srgb,var(--oryx-bg-surface)_88%,var(--oryx-bg-page))]',
        'transition-[flex-basis,opacity,border-color] duration-(--oryx-motion-normal) ease-(--oryx-ease-out)',
        chatOpen ? 'basis-[35%] border-border opacity-100' : 'pointer-events-none basis-0 border-transparent opacity-0',
      )}
    >
      <AppChatPanel
        {messages}
        {thinking}
        {onSend}
        hasApiKey={hasChatAccess}
        bind:selectedProvider
        bind:draft={chatDraft}
        {providerOptions}
        suggestions={profileData.suggestions}
      />
    </section>
    <section class="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <DiaryListTabs
        bind:listTab
        {diaryState}
        {onRatingChange}
        onOpenDetail={openDetail}
        onProfileSync={triggerProfileSync}
        profile={profileData}
        recentActivity={data.recentActivity}
        noteRelationships={data.profile?.noteRelationships}
        layout="desktop"
        contentWidthClass={desktopContentWidthClass}
      >
        {#snippet headerStart()}
          <Button variant="ghost" size="sm" class="shrink-0 p-2" onclick={() => (chatOpen = !chatOpen)}>
            {#if chatOpen}
              <ChevronPanelRightIcon class="size-5" />
            {:else}
              <ChevronPanelLeftIcon class="size-5" />
            {/if}
            <span class="sr-only">{chatOpen ? m.oryxel_chat_hide() : m.oryxel_chat_show()}</span>
          </Button>
        {/snippet}
        {#snippet headerEnd()}
          <DiaryHeaderControls />
        {/snippet}
      </DiaryListTabs>
    </section>
  </div>

  <div class="flex min-h-svh flex-1 flex-col pb-16 md:hidden">
    {#key mobileTab}
      {#if mobileTab === 'chat'}
        <div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: 180 }} out:fade={{ duration: 120 }}>
          <AppChatPanel
            {messages}
            {thinking}
            {onSend}
            hasApiKey={hasChatAccess}
            bind:selectedProvider
            bind:draft={chatDraft}
            {providerOptions}
          />
        </div>
      {:else if mobileTab === 'profile'}
        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3" in:fade={{ duration: 180 }} out:fade={{ duration: 120 }}>
          <DiaryProfileTab
            variant="mobile"
            profile={profileData}
            onProfileSync={triggerProfileSync}
            recentActivity={data.recentActivity}
          />
        </div>
      {:else}
        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3" in:fade={{ duration: 180 }} out:fade={{ duration: 120 }}>
          <DiaryListTabs
            bind:listTab
            {diaryState}
            {onRatingChange}
            onOpenDetail={openDetail}
            onProfileSync={triggerProfileSync}
            profile={profileData}
            layout="mobile"
          />
        </div>
      {/if}
    {/key}
  </div>

  <MobilePrimaryNav active={mobileTab} onSelect={onMobileNav} />
</div>

<DiaryEditModal bind:open={editOpen} row={editRow} onSave={onSaveEdit} />
<FragranceDetailModal
  bind:open={detailOpen}
  row={detailRow}
  {onRatingChange}
  onDelete={detailContext === 'diary' ? onDelete : undefined}
  onEdit={detailContext === 'diary' ? onEdit : undefined}
  onTried={detailContext === 'to_try' ? onTriedRecommendation : undefined}
/>
<AiStatusFloat {thinking} patches={pendingItems} {syncProgress} {patchProgress} />
