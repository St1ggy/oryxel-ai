<script lang="ts">
  import { PanelLeftOpen, PanelRightOpen } from '@lucide/svelte'
  import { untrack } from 'svelte'
  import { fade } from 'svelte/transition'

  import AiStatusFloat from '$lib/components/app/ai-status-float.svelte'
  import AppChatPanel from '$lib/components/app/app-chat-panel.svelte'
  import DiaryEditModal from '$lib/components/app/diary-edit-modal.svelte'
  import DiaryHeaderControls from '$lib/components/app/diary-header-controls.svelte'
  import DiaryListTabs from '$lib/components/app/diary-list-tabs.svelte'
  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import DiaryTour from '$lib/components/app/diary-tour.svelte'
  import FragranceDetailModal from '$lib/components/app/fragrance-detail-modal.svelte'
  import MobilePrimaryNav from '$lib/components/app/mobile-primary-nav.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Modal from '$lib/components/ui/modal.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { DiaryListTabValue } from '$lib/diary/diary-tab-items'
  import type { ChatMessage, DiaryData, DiaryMobileTab, DiaryRow, FragranceListType } from '$lib/types/diary'
  import type { PageData } from './$types'

  import { browser } from '$app/environment'
  import { invalidateAll } from '$app/navigation'
  import { env } from '$env/dynamic/public'

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
    // Use history.replaceState directly — SvelteKit's goto() re-runs the load function
    // even with replaceState:true, triggering a full server round-trip on every tab switch.
    const url = new URL(location.href)

    url.searchParams.set('tab', listTab)
    history.replaceState({}, '', url)
  })
  let editOpen = $state(false)

  // ── Onboarding tour ────────────────────────────────────────────────────────
  let startTour = $state<(() => void) | null>(null)
  let onboardingCompleted = $state(untrack(() => data.onboardingCompleted))
  let tourAutoStarted = false

  $effect(() => {
    if (onboardingCompleted || !browser || tourAutoStarted) return

    if (diaryLoading || !startTour) return

    tourAutoStarted = true
    const timer = setTimeout(() => {
      chatOpen = true
      startTour?.()
    }, 500)

    return () => clearTimeout(timer)
  })

  /** Local rating edits keyed by fragranceId; reset when fresh server data arrives. */
  let ratingOverrides = $state<Record<number, number>>({})

  // ── Streamed data bridges ─────────────────────────────────────────────────
  // diary / profile / recentActivity arrive as Promises from the server load.
  // We resolve them here so the shell renders immediately with skeletons.
  const EMPTY_DIARY: DiaryData = { to_try: [], liked: [], neutral: [], disliked: [], owned: [] }

  let resolvedDiary = $state<DiaryData>(EMPTY_DIARY)
  let resolvedProfile = $state<Awaited<PageData['profile']> | null>(null)
  let resolvedRecentActivity = $state<Awaited<PageData['recentActivity']>>([])
  let diaryLoading = $state(true)

  let _diarySeq = 0

  $effect(() => {
    const seq = ++_diarySeq

    diaryLoading = true

    void Promise.resolve(data.diary).then((d) => {
      if (_diarySeq !== seq) return

      resolvedDiary = d
      diaryLoading = false
      ratingOverrides = {}
    })

    void Promise.resolve(data.profile).then((p) => {
      resolvedProfile = p
    })

    void Promise.resolve(data.recentActivity).then((ra) => {
      resolvedRecentActivity = ra
    })
  })

  function rowsWithOverrides(rows: DiaryRow[]): DiaryRow[] {
    return rows.map((row) =>
      row.fragranceId in ratingOverrides ? { ...row, rating: ratingOverrides[row.fragranceId] } : row,
    )
  }

  const diaryState = $derived({
    to_try: rowsWithOverrides(resolvedDiary.to_try),
    liked: rowsWithOverrides(resolvedDiary.liked),
    neutral: rowsWithOverrides(resolvedDiary.neutral),
    disliked: rowsWithOverrides(resolvedDiary.disliked),
    owned: rowsWithOverrides(resolvedDiary.owned),
  })
  const profileData = $derived(
    resolvedProfile ?? {
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
  let syncConfirmOpen = $state(false)
  let thinking = $state(false)

  // Aborted when the component is destroyed (navigation away) — stops all in-flight fetches.
  let pageAbort = new AbortController()

  const abortOnDestroy = () => pageAbort.abort()
  $effect(() => abortOnDestroy)

  // Resume polling for jobs that were still running when the page was last closed/refreshed.
  // Uses untrack() so data changes from invalidateAll() don't re-run this effect and re-trigger
  // the cleanup — which would cause an abort → invalidateAll → abort infinite loop.
  let jobsResumed = false

  $effect(() => {
    if (jobsResumed) return

    jobsResumed = true

    // untrack: do NOT let data reads here make this effect reactive to data changes
    const activeJobs = untrack(() => data.activeJobs ?? [])

    const syncJob = activeJobs.find((index) => index.type === 'profile_sync')

    if (syncJob) {
      const latest = syncJob.progress.at(-1)

      syncProgress = latest
        ? { step: latest.step, total: latest.total, phase: latest.phase as NonNullable<SyncProgress>['phase'] }
        : { step: 0, total: 1, phase: 'profile' }
      void waitForJob(syncJob.id, pageAbort.signal, (job) => {
        const last = job.progress.at(-1)

        if (last) {
          syncProgress = {
            step: last.step,
            total: last.total,
            phase: last.phase as NonNullable<SyncProgress>['phase'],
          }
        }
      }).finally(() => {
        syncProgress = null
        void invalidateAll()
      })
    }

    const chatJob = activeJobs.find((index) => index.type === 'agent_chat')

    if (chatJob) {
      thinking = true
      void (async () => {
        try {
          const job = await waitForJob(chatJob.id, pageAbort.signal, (index) => {
            const latest = index.progress.at(-1)

            if (latest?.phase === 'applying') {
              thinking = false
              patchProgress = { step: latest.step, total: latest.total }
            }
          })

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
    // No cleanup return here — abortOnDestroy effect handles pageAbort.abort() on unmount.
    // Returning abort here would call it on every invalidateAll() re-render, killing in-flight polls.
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

  function jobStreamEnabled(): boolean {
    return Boolean(env.PUBLIC_JOB_STREAM_URL?.trim())
  }

  async function streamJobUntilDone(
    jobId: number,
    options: { signal: AbortSignal; onUpdate: (job: JobResult) => void },
  ): Promise<JobResult> {
    return new Promise((resolve, reject) => {
      let settled = false
      let es: EventSource | undefined

      const fail = (error: Error) => {
        if (settled) return

        settled = true
        es?.close()
        reject(error)
      }

      const succeed = (job: JobResult) => {
        if (settled) return

        settled = true
        es?.close()
        resolve(job)
      }

      const onAbort = () => {
        fail(new DOMException('Aborted', 'AbortError'))
      }

      options.signal.addEventListener('abort', onAbort, { once: true })

      void (async () => {
        try {
          const tokenResponse = await fetch(`/api/jobs/${jobId}/stream-token`, {
            method: 'POST',
            signal: options.signal,
          })

          if (!tokenResponse.ok) {
            throw new Error('stream token failed')
          }

          const { token } = (await tokenResponse.json()) as { token: string }
          const base = env.PUBLIC_JOB_STREAM_URL!.trim().replace(/\/$/, '')
          const url = `${base}/stream?jobId=${jobId}&token=${encodeURIComponent(token)}`

          es = new EventSource(url)

          es.addEventListener('message', (event: MessageEvent) => {
            try {
              const job = JSON.parse(event.data) as JobResult

              options.onUpdate(job)

              if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
                options.signal.removeEventListener('abort', onAbort)
                succeed(job)
              }
            } catch (error) {
              fail(error instanceof Error ? error : new Error('parse failed'))
            }
          })

          es.addEventListener('error', () => {
            fail(new Error('EventSource error'))
          })
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)))
        }
      })()
    })
  }

  async function pollJobWithUpdate(
    jobId: number,
    signal: AbortSignal,
    onUpdate: (job: JobResult) => void,
  ): Promise<JobResult> {
    const deadline = Date.now() + 12 * 60 * 1000 // 12-min client-side hard stop

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (Date.now() > deadline) {
        throw new Error('Poll timed out')
      }

      const pollResponse = await fetch(`/api/jobs/${jobId}`, { signal })

      if (!pollResponse.ok) throw new Error(`Job poll failed: ${pollResponse.status}`)

      const job = (await pollResponse.json()) as JobResult

      onUpdate(job)

      if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') return job
    }
  }

  async function waitForJob(
    jobId: number,
    signal: AbortSignal,
    onUpdate: (job: JobResult) => void,
  ): Promise<JobResult> {
    if (jobStreamEnabled()) {
      try {
        return await streamJobUntilDone(jobId, { signal, onUpdate })
      } catch {
        // Gateway unreachable or token misconfigured — fall back to polling.
      }
    }

    return pollJobWithUpdate(jobId, signal, onUpdate)
  }

  function handleProfileSyncClick() {
    if (syncProgress === null) {
      void triggerProfileSync()
    } else {
      syncConfirmOpen = true
    }
  }

  async function triggerProfileSync() {
    syncProgress = { step: 0, total: 1, phase: 'profile' }

    try {
      const response = await fetch('/api/agent/profile-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: data.locale }),
        signal: pageAbort.signal,
      })

      if (!response.ok) throw new Error('Sync failed')

      const { jobId } = (await response.json()) as { jobId: number }

      await waitForJob(jobId, pageAbort.signal, (job) => {
        const latest = job.progress.at(-1)

        if (latest) {
          syncProgress = {
            step: latest.step,
            total: latest.total,
            phase: latest.phase as NonNullable<SyncProgress>['phase'],
          }
        }
      })
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

      const job = await waitForJob(jobId, pageAbort.signal, (index) => {
        const latest = index.progress.at(-1)

        if (latest?.phase === 'applying') {
          thinking = false
          patchProgress = { step: latest.step, total: latest.total }
        }
      })

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

  // Extra bottom padding on mobile when the fixed status bar is visible.
  const mobileStatusVisible = $derived(
    thinking || pendingItems.some((p) => p.status === 'created') || !!patchProgress || !!syncProgress,
  )
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
        loading={diaryLoading}
        {onRatingChange}
        onOpenDetail={openDetail}
        onProfileSync={handleProfileSyncClick}
        profile={profileData}
        recentActivity={resolvedRecentActivity}
        noteRelationships={resolvedProfile?.noteRelationships}
        layout="desktop"
        contentWidthClass={desktopContentWidthClass}
        graphStyle={data.graphStyle}
      >
        {#snippet headerStart()}
          <Button variant="ghost" size="sm" class="shrink-0 p-2" onclick={() => (chatOpen = !chatOpen)}>
            {#if chatOpen}
              <PanelRightOpen class="size-5" />
            {:else}
              <PanelLeftOpen class="size-5" />
            {/if}
            <span class="sr-only">{chatOpen ? m.oryxel_chat_hide() : m.oryxel_chat_show()}</span>
          </Button>
        {/snippet}
        {#snippet headerEnd()}
          <DiaryHeaderControls
            onStartTour={() => {
              chatOpen = true
              startTour?.()
            }}
          />
        {/snippet}
      </DiaryListTabs>
      <!-- Desktop status bar — inline at bottom of right panel, never overlaps chat -->
      <AiStatusFloat {thinking} patches={pendingItems} {syncProgress} {patchProgress} inline />
    </section>
  </div>

  <div
    class={mobileStatusVisible
      ? 'flex min-h-svh flex-1 flex-col pb-28 md:hidden'
      : 'flex min-h-svh flex-1 flex-col pb-16 md:hidden'}
  >
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
            onProfileSync={handleProfileSyncClick}
            recentActivity={resolvedRecentActivity}
            diaryCounts={{
              owned: diaryState.owned.length,
              to_try: diaryState.to_try.length,
              liked: diaryState.liked.length,
              neutral: diaryState.neutral.length,
              disliked: diaryState.disliked.length,
            }}
          />
        </div>
      {:else}
        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3" in:fade={{ duration: 180 }} out:fade={{ duration: 120 }}>
          <DiaryListTabs
            bind:listTab
            {diaryState}
            loading={diaryLoading}
            {onRatingChange}
            onOpenDetail={openDetail}
            onProfileSync={handleProfileSyncClick}
            profile={profileData}
            noteRelationships={resolvedProfile?.noteRelationships}
            layout="mobile"
            graphStyle={data.graphStyle}
          />
        </div>
      {/if}
    {/key}
  </div>

  <MobilePrimaryNav active={mobileTab} onSelect={onMobileNav} />
</div>

<Modal
  bind:open={syncConfirmOpen}
  title={m.oryxel_profile_sync_confirm_title()}
  description={m.oryxel_profile_sync_confirm_desc()}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (syncConfirmOpen = false)}>{m.oryxel_cancel()}</Button>
    <Button
      onclick={() => {
        syncConfirmOpen = false
        void triggerProfileSync()
      }}
    >
      {m.oryxel_profile_sync_confirm_cta()}
    </Button>
  {/snippet}
</Modal>
<DiaryEditModal bind:open={editOpen} row={editRow} onSave={onSaveEdit} />
<FragranceDetailModal
  bind:open={detailOpen}
  row={detailRow}
  {onRatingChange}
  onDelete={detailContext === 'diary' ? onDelete : undefined}
  onEdit={detailContext === 'diary' ? onEdit : undefined}
  onTried={detailContext === 'to_try' ? onTriedRecommendation : undefined}
/>
<!-- Mobile status bar — fixed above bottom nav, only on mobile -->
<div class="md:hidden">
  <AiStatusFloat {thinking} patches={pendingItems} {syncProgress} {patchProgress} />
</div>

<DiaryTour
  completed={onboardingCompleted}
  onComplete={() => {
    onboardingCompleted = true
  }}
  onReady={(function_) => {
    startTour = function_
  }}
/>
