<script lang="ts">
  import { PanelLeftOpen, PanelRightOpen } from '@lucide/svelte'
  import { untrack } from 'svelte'

  import AiStatusFloat from '$lib/components/app/ai-status-float.svelte'
  import AppChatPanel from '$lib/components/app/app-chat-panel.svelte'
  import DiaryEditModal from '$lib/components/app/diary-edit-modal.svelte'
  import DiaryFragrancesPanel from '$lib/components/app/diary-fragrances-panel.svelte'
  import DiaryGuideTab from '$lib/components/app/diary-guide-tab.svelte'
  import DiaryHeaderControls from '$lib/components/app/diary-header-controls.svelte'
  import DiaryNotesTab from '$lib/components/app/diary-notes-tab.svelte'
  import DiaryPrimaryNav from '$lib/components/app/diary-primary-nav.svelte'
  import DiaryProfileTab from '$lib/components/app/diary-profile-tab.svelte'
  import DiaryTour from '$lib/components/app/diary-tour.svelte'
  import FragranceDetailModal from '$lib/components/app/fragrance-detail-modal.svelte'
  import PatchAppliedToast from '$lib/components/app/patch-applied-toast.svelte'
  import PatchDetailsModal from '$lib/components/app/patch-details-modal.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Modal from '$lib/components/ui/modal.svelte'
  import PhantomUiShell from '$lib/components/ui/phantom-ui-shell.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { DiaryPrimaryView, FragranceListTabValue } from '$lib/diary/diary-tab-items'
  import type { ChatMessage, DiaryData, DiaryRow, FragranceListType } from '$lib/types/diary'
  import type { PageData } from './$types'

  type DeferredShell = Awaited<NonNullable<PageData['deferredShell']>>

  import { browser } from '$app/environment'
  import { invalidateAll } from '$app/navigation'
  import { env } from '$env/dynamic/public'

  const { data }: { data: PageData } = $props()

  let chatOpen = $state(true)
  let chatDraft = $state('')
  let primaryView = $state<DiaryPrimaryView>(untrack(() => data.initialView ?? 'fragrances'))
  let fragranceTab = $state<FragranceListTabValue>(untrack(() => data.initialFragranceTab ?? 'owned'))
  let editRow = $state<DiaryRow | null>(null)
  let detailOpen = $state(false)
  let detailRow = $state<DiaryRow | null>(null)
  let detailContext = $state<'diary' | 'to_try'>('diary')

  $effect(() => {
    if (!browser) return

    const url = new URL(location.href)

    url.searchParams.set('view', primaryView)

    if (primaryView === 'fragrances') {
      url.searchParams.set('list', fragranceTab)
    } else {
      url.searchParams.delete('list')
    }

    url.searchParams.delete('tab')
    history.replaceState({}, '', url)
  })

  /** Chat is a mobile-only primary tab; normalize URL if the viewport is desktop. */
  $effect(() => {
    if (!browser || primaryView !== 'chat') return

    if (globalThis.matchMedia('(min-width: 768px)').matches) {
      primaryView = 'fragrances'
    }
  })

  function prepareTourChatPanel() {
    chatOpen = true

    if (browser && globalThis.matchMedia('(max-width: 767px)').matches) {
      primaryView = 'chat'
    }
  }
  let editOpen = $state(false)

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

  /** Meta + chat shell: resolves after applyConfirmedPatches; load() returns without awaiting this. */
  let resolvedShell = $state<DeferredShell | null>(null)
  let _shellSeq = 0

  $effect(() => {
    const seq = ++_shellSeq

    void Promise.resolve(data.deferredShell).then((shell) => {
      if (seq !== _shellSeq) return

      resolvedShell = shell
    })
  })

  // ── Onboarding tour ────────────────────────────────────────────────────────
  let startTour = $state<(() => void) | null>(null)
  /** Local completion after tour finishes (server flag arrives via deferredShell). */
  let tourMarkedDone = $state(false)
  let tourAutoStarted = false

  const serverTourCompleted = $derived(resolvedShell?.onboardingCompleted ?? false)

  $effect(() => {
    if (tourMarkedDone || serverTourCompleted || !browser || tourAutoStarted) return

    if (resolvedShell === null || diaryLoading || !startTour) return

    tourAutoStarted = true
    const timer = setTimeout(() => {
      prepareTourChatPanel()
      startTour?.()
    }, 500)

    return () => clearTimeout(timer)
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
  const pendingItems = $derived(resolvedShell?.pendingPatches ?? [])

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

  let messages = $state<ChatMessage[]>([
    {
      id: 'm1',
      role: 'assistant' as const,
      content: m.oryxel_chat_greeting(),
    },
  ])
  let _chatShellSeq = 0

  $effect(() => {
    const seq = ++_chatShellSeq

    void Promise.resolve(data.deferredShell).then((shell) => {
      if (seq !== _chatShellSeq) return

      const chatHistory = shell?.chatHistory ?? []

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
    })
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
  let refreshingRecommendations = $state(false)

  let patchAppliedToast = $state<{ summary: string; payload: Record<string, unknown> } | null>(null)
  let patchDetailsOpen = $state(false)
  let patchDetailsPayload = $state<Record<string, unknown> | null>(null)
  let patchDetailsSubtitle = $state<string | null>(null)

  function openPatchDetailsModal(payload: Record<string, unknown>, subtitle: string | null) {
    patchDetailsPayload = payload
    patchDetailsSubtitle = subtitle
    patchDetailsOpen = true
  }

  function dismissPatchToast() {
    patchAppliedToast = null
  }

  function notifyPatchAppliedFromJobResult(result: Record<string, unknown>) {
    if (result['requiresConfirmation'] === true) return

    const summary = (result['summary'] as string) ?? ''
    const applied = result['appliedPatch']
    const payload =
      applied && typeof applied === 'object' && !Array.isArray(applied)
        ? (applied as Record<string, unknown>)
        : { summary, reply: result['reply'] }

    patchAppliedToast = { summary, payload }
  }

  // Aborted when the component is destroyed (navigation away) — stops all in-flight fetches.
  let pageAbort = new AbortController()

  const abortOnDestroy = () => pageAbort.abort()
  $effect(() => abortOnDestroy)

  // Resume polling for jobs that were still running when the page was last closed/refreshed.
  // Runs once after deferredShell resolves; jobsResumed prevents re-entry on invalidateAll().
  let jobsResumed = false

  $effect(() => {
    if (resolvedShell === null || jobsResumed) return

    jobsResumed = true

    const activeJobs = resolvedShell.activeJobs

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

            notifyPatchAppliedFromJobResult(result)

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
  const hasChatAccess = $derived(resolvedShell?.hasChatAccess ?? false)
  const providerOptions = $derived(resolvedShell?.chatProviders ?? [])
  const graphStyle = $derived(resolvedShell?.graphStyle ?? 'default')
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

  let jobStreamUrlMissingLogged = false

  function jobStreamEnabled(): boolean {
    const url = env.PUBLIC_JOB_STREAM_URL?.trim() ?? ''

    if (!url && browser && !jobStreamUrlMissingLogged) {
      jobStreamUrlMissingLogged = true
      // eslint-disable-next-line no-console -- intentional operator hint when SSE is disabled
      console.info(
        '[oryxel] Job updates use HTTP polling: set PUBLIC_JOB_STREAM_URL to your Railway gateway base URL (https, no trailing slash) in Vercel env and redeploy so the client can open EventSource.',
      )
    }

    return Boolean(url)
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

          const tokenPayload = (await tokenResponse.json().catch(() => null)) as { token?: string } | null

          if (!tokenResponse.ok) {
            throw new Error(`stream token failed: HTTP ${tokenResponse.status}`)
          }

          const token = tokenPayload?.token

          if (!token) {
            throw new Error('stream token missing in response (is JOB_STREAM_JWT_SECRET set on Vercel?)')
          }

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
            fail(
              new Error(
                `EventSource error for ${base}/stream (check gateway is up, STREAM_CORS_ORIGIN matches this site origin, https↔http mixed content)`,
              ),
            )
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
      } catch (error) {
        // eslint-disable-next-line no-console -- intentional diagnostic when SSE falls back
        console.warn(
          '[oryxel] Job SSE failed; falling back to polling. See earlier error or verify PUBLIC_JOB_STREAM_URL, JOB_STREAM_JWT_SECRET, gateway STREAM_CORS_ORIGIN, and redeploy.',
          error,
        )
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

  async function onRefreshRecommendations() {
    if (!hasChatAccess || thinking || refreshingRecommendations) return

    const refreshMessage = m.oryxel_rec_refresh_chat_message()

    messages = [...messages, { id: crypto.randomUUID(), role: 'user', content: refreshMessage }]
    refreshingRecommendations = true

    try {
      const response = await fetch('/api/agent/preferences/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: refreshMessage,
          locale: data.locale,
          scenario: 'recommendation',
          recommendationsOnly: true,
          provider: selectedProvider || undefined,
        }),
        signal: pageAbort.signal,
      })

      if (!response.ok) throw new Error('Agent request failed')

      const { jobId } = (await response.json()) as { jobId: number }

      const job = await waitForJob(jobId, pageAbort.signal, (index) => {
        const latest = index.progress.at(-1)

        if (latest?.phase === 'applying') {
          patchProgress = { step: latest.step, total: latest.total }
        }
      })

      patchProgress = null

      if (job.status === 'failed') throw new Error(job.errorMessage ?? 'Agent failed')

      const result = job.result ?? {}
      const summary = (result.summary as string | null) ?? ''
      const responseText =
        (result.reply as string | undefined) ??
        (result.requiresConfirmation
          ? m.oryxel_chat_critical_pending({ summary })
          : m.oryxel_chat_patch_applied({ summary }))

      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: responseText }]
      notifyPatchAppliedFromJobResult(result)
    } catch {
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: m.oryxel_chat_error_generic() }]
    } finally {
      refreshingRecommendations = false
      patchProgress = null
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
      notifyPatchAppliedFromJobResult(result)
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

  function onTriedRecommendation(brand: string, name: string) {
    chatDraft = m.oryxel_rec_tried_draft({ brand, name })
    chatOpen = true

    if (browser && globalThis.matchMedia('(max-width: 767px)').matches) {
      primaryView = 'chat'
    }
  }

  /** Desktop layout has no chat tab; treat chat like fragrances for main content. */
  const desktopShellView = $derived(primaryView === 'chat' ? ('fragrances' as const) : primaryView)

  const desktopContentWidthClass = $derived(desktopShellView === 'profile' ? 'mx-auto w-full max-w-[880px]' : 'w-full')

  function selectPrimaryView(view: DiaryPrimaryView) {
    primaryView = view
  }

  // Extra bottom padding on mobile when the fixed status bar is visible.
  const mobileStatusVisible = $derived(
    thinking ||
      refreshingRecommendations ||
      pendingItems.some((p) => p.status === 'created') ||
      !!patchProgress ||
      !!syncProgress,
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
      <div
        class="flex h-[68px] shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:gap-4 md:px-10"
        data-tour="diary-shell-header"
      >
        <Button variant="ghost" size="sm" class="shrink-0 p-2" onclick={() => (chatOpen = !chatOpen)}>
          {#if chatOpen}
            <PanelRightOpen class="size-5" />
          {:else}
            <PanelLeftOpen class="size-5" />
          {/if}
          <span class="sr-only">{chatOpen ? m.oryxel_chat_hide() : m.oryxel_chat_show()}</span>
        </Button>
        <DiaryPrimaryNav variant="desktop" active={desktopShellView} onSelect={selectPrimaryView} />
        <DiaryHeaderControls
          onStartTour={() => {
            prepareTourChatPanel()
            startTour?.()
          }}
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-9">
        <div class={cn('w-full', desktopContentWidthClass)}>
          {#if desktopShellView === 'fragrances'}
            <DiaryFragrancesPanel
              bind:fragranceTab
              {diaryState}
              loading={diaryLoading}
              {onRatingChange}
              onOpenDetail={openDetail}
              {onRefreshRecommendations}
              {refreshingRecommendations}
              canRefreshRecommendations={hasChatAccess && !thinking}
              layout="desktop"
            />
          {:else if desktopShellView === 'notes'}
            <div data-tour="primary-notes">
              <DiaryNotesTab
                diaryData={diaryState}
                noteRelationships={resolvedProfile?.noteRelationships ?? []}
                layout="desktop"
                {graphStyle}
              />
            </div>
          {:else if desktopShellView === 'profile'}
            <PhantomUiShell loading={diaryLoading}>
              <DiaryProfileTab
                variant="desktop"
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
            </PhantomUiShell>
          {:else}
            <DiaryGuideTab layout="desktop" />
          {/if}
        </div>
      </div>
      <AiStatusFloat
        thinking={thinking || refreshingRecommendations}
        patches={pendingItems}
        {syncProgress}
        {patchProgress}
        inline
        onOpenPatchDetails={(payload, summary) => openPatchDetailsModal(payload, summary)}
        onPatchApplied={(summary, payload) => {
          patchAppliedToast = { summary, payload }
        }}
      />
    </section>
  </div>

  <div
    class={mobileStatusVisible
      ? 'flex min-h-svh flex-1 flex-col pb-28 md:hidden'
      : 'flex min-h-svh flex-1 flex-col pb-16 md:hidden'}
  >
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center justify-end gap-2 border-b border-border bg-surface px-3 py-2">
        <DiaryHeaderControls
          onStartTour={() => {
            prepareTourChatPanel()
            startTour?.()
          }}
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {#if primaryView === 'fragrances'}
          <DiaryFragrancesPanel
            bind:fragranceTab
            {diaryState}
            loading={diaryLoading}
            {onRatingChange}
            onOpenDetail={openDetail}
            {onRefreshRecommendations}
            {refreshingRecommendations}
            canRefreshRecommendations={hasChatAccess && !thinking}
            layout="mobile"
          />
        {:else if primaryView === 'notes'}
          <div data-tour="primary-notes">
            <DiaryNotesTab
              diaryData={diaryState}
              noteRelationships={resolvedProfile?.noteRelationships ?? []}
              layout="mobile"
              {graphStyle}
            />
          </div>
        {:else if primaryView === 'profile'}
          <PhantomUiShell loading={diaryLoading}>
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
          </PhantomUiShell>
        {:else if primaryView === 'chat'}
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
        {:else}
          <DiaryGuideTab layout="mobile" />
        {/if}
      </div>
    </div>
  </div>

  <DiaryPrimaryNav variant="mobile" active={primaryView} onSelect={selectPrimaryView} />
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
  <AiStatusFloat
    thinking={thinking || refreshingRecommendations}
    patches={pendingItems}
    {syncProgress}
    {patchProgress}
    onOpenPatchDetails={(payload, summary) => openPatchDetailsModal(payload, summary)}
    onPatchApplied={(summary, payload) => {
      patchAppliedToast = { summary, payload }
    }}
  />
</div>

<PatchAppliedToast
  toast={patchAppliedToast}
  onDismiss={dismissPatchToast}
  onViewDetails={(payload, summary) => openPatchDetailsModal(payload, summary)}
/>
<PatchDetailsModal bind:open={patchDetailsOpen} payload={patchDetailsPayload} subtitle={patchDetailsSubtitle} />

<DiaryTour
  completed={tourMarkedDone || (resolvedShell?.onboardingCompleted ?? false)}
  prepareChatPanel={prepareTourChatPanel}
  onComplete={() => {
    tourMarkedDone = true
  }}
  onReady={(function_) => {
    startTour = function_
  }}
/>
