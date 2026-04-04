<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
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

  let syncProgress = $state<SyncProgress>(null)
  let patchProgress = $state<PatchProgress>(null)
  let thinking = $state(false)
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

  function handleSyncLine(line: string) {
    if (!line.startsWith('data: ')) return

    try {
      const event = JSON.parse(line.slice(6)) as
        | { step: number; total: number; phase: 'owned' | 'liked' | 'disliked' | 'profile' | 'recommendations' }
        | { done: true }

      if ('done' in event) {
        syncProgress = null
        void invalidateAll()
      } else {
        syncProgress = event
      }
    } catch {
      // ignore malformed line
    }
  }

  async function triggerProfileSync() {
    const response = await fetch('/api/agent/profile-sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: data.locale }),
    })

    if (!response.body) {
      void invalidateAll()

      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          handleSyncLine(line)
        }
      }
    } finally {
      syncProgress = null
    }
  }

  async function* parsePatchStream(response: Response): AsyncGenerator<Record<string, unknown>> {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue

          try {
            yield JSON.parse(line.slice(6)) as Record<string, unknown>
          } catch {
            // ignore malformed line
          }
        }
      }
    } finally {
      reader.cancel()
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

      if (!response.body) throw new Error('No stream body')

      for await (const event of parsePatchStream(response)) {
        if (event.phase === 'applying') {
          thinking = false
          patchProgress = { step: event.step as number, total: event.total as number }
        } else if (event.done) {
          patchProgress = null
          thinking = false
          autoSync = event.triggerSync === true

          const summary = (event.summary as string | null) ?? ''
          const responseText =
            (event.reply as string | undefined) ??
            (event.requiresConfirmation
              ? m.oryxel_chat_critical_pending({ summary })
              : m.oryxel_chat_patch_applied({ summary }))

          messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: responseText }]
        } else if (event.error) {
          throw new Error('Stream error')
        }
      }
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
          <DiaryProfileTab variant="mobile" profile={profileData} onProfileSync={triggerProfileSync} />
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
