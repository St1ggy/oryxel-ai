<script lang="ts">
  import { Send } from '@lucide/svelte'
  import { type ChatAgentMode, type ModeSwitchSuggestion, nextChatMode, shouldSuggestModeSwitch } from '@oryxel/ai'
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  /* eslint-disable import-x/no-duplicates -- svelte/store and svelte/transition resolve to the same .d.ts but are distinct runtime modules */
  import { SvelteSet } from 'svelte/reactivity'
  import { get } from 'svelte/store'
  import { fade, fly } from 'svelte/transition'
  /* eslint-enable import-x/no-duplicates */

  import AiModelHeader from '$lib/components/app/ai-model-header.svelte'
  import ChatBubble from '$lib/components/app/chat-bubble.svelte'
  import ChatComposerToolbar from '$lib/components/app/chat-composer-toolbar.svelte'
  import ChatModeSwitchBanner from '$lib/components/app/chat-mode-switch-banner.svelte'
  import TypingIndicator from '$lib/components/app/typing-indicator.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Chip from '$lib/components/ui/chip.svelte'
  import PhantomUiShell from '$lib/components/ui/phantom-ui-shell.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { ChatMessage } from '$lib/types/diary'

  const CHAT_VIRTUAL_THRESHOLD = 48

  type ModelOption = {
    id: string
    label: string
  }

  type Props = {
    loading?: boolean
    messages: ChatMessage[]
    draft?: string
    thinking?: boolean
    modelLabel?: string
    hasApiKey?: boolean
    addKeyHref?: string
    chatMode?: ChatAgentMode
    modelId?: string
    selectedProvider?: string
    providerOptions?: { value: string; label: string; source?: 'user' | 'platform' }[]
    modelOptions?: ModelOption[]
    suggestions?: string[]
    onSend?: (text: string) => void
    onChatPreferencesChange?: (prefs: {
      chatMode?: ChatAgentMode
      provider?: string
      modelId?: string
    }) => void
  }

  let {
    loading = false,
    messages,
    draft = $bindable(''),
    thinking = false,
    modelLabel = 'GPT-4.1',
    hasApiKey = true,
    addKeyHref = '/settings',
    chatMode = $bindable('agent' as ChatAgentMode),
    modelId = $bindable(''),
    selectedProvider = $bindable(''),
    providerOptions = [],
    modelOptions = [],
    suggestions = [],
    onSend,
    onChatPreferencesChange,
  }: Props = $props()

  const keyRequiredTitle = $derived(m.oryxel_chat_key_required_title())
  const keyRequiredDesc = $derived(m.oryxel_chat_key_required_desc())
  const addKeyCta = $derived(m.oryxel_chat_add_key_cta())

  const fallbackChips = $derived([m.oryxel_chip_analog(), m.oryxel_chip_summer(), m.oryxel_chip_evening()])
  const displayChips = $derived(suggestions.length > 0 ? suggestions : fallbackChips)

  const headerLabel = $derived(`${modeLabelFor(chatMode)} · ${modelLabel}`)

  const placeholder = $derived.by(() => {
    switch (chatMode) {
      case 'ask': {
        return m.oryxel_chat_placeholder_ask()
      }

      case 'add': {
        return m.oryxel_chat_placeholder_add()
      }

      case 'recommend': {
        return m.oryxel_chat_placeholder_recommend()
      }

      default: {
        return m.oryxel_chat_placeholder_agent()
      }
    }
  })

  let pendingSendText = $state<string | null>(null)
  let modeSuggestion = $state<ModeSwitchSuggestion | null>(null)
  let modeBannerKey = $state(0)
  const sessionDismissed = new SvelteSet<string>()

  function modeLabelFor(mode: ChatAgentMode): string {
    switch (mode) {
      case 'ask': {
        return m.oryxel_chat_mode_ask()
      }

      case 'add': {
        return m.oryxel_chat_mode_add()
      }

      case 'recommend': {
        return m.oryxel_chat_mode_recommend()
      }

      default: {
        return m.oryxel_chat_mode_agent()
      }
    }
  }

  function clearModeSuggestion() {
    pendingSendText = null
    modeSuggestion = null
  }

  function dispatchSend(text: string) {
    onSend?.(text)
    draft = ''
    clearModeSuggestion()
  }

  function send() {
    const text = draft.trim()

    if (!text) {
      return
    }

    if (modeSuggestion && pendingSendText === text) {
      modeBannerKey += 1

      return
    }

    const suggestion = shouldSuggestModeSwitch(text, chatMode, sessionDismissed)

    if (suggestion) {
      pendingSendText = text
      modeSuggestion = suggestion
      modeBannerKey += 1

      return
    }

    dispatchSend(text)
  }

  function onModeSwitchAccept() {
    if (!modeSuggestion || !pendingSendText) return

    chatMode = modeSuggestion.suggested
    onChatPreferencesChange?.({ chatMode: modeSuggestion.suggested })
    dispatchSend(pendingSendText)
  }

  function onModeSwitchDismiss() {
    if (!pendingSendText) return

    sessionDismissed.add(pendingSendText)
    dispatchSend(pendingSendText)
  }

  function onModeSwitchTimeout() {
    onModeSwitchAccept()
  }

  function onDraftKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault()
      chatMode = nextChatMode(chatMode)
      onChatPreferencesChange?.({ chatMode })

      return
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const canSend = $derived(draft.trim().length > 0)

  let scrollElement = $state<HTMLDivElement | null>(null)
  let draftElement = $state<HTMLTextAreaElement | null>(null)

  const useVirtualMessages = $derived(messages.length >= CHAT_VIRTUAL_THRESHOLD)

  const messageVirtualizer = createVirtualizer({
    count: 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => 96,
    overscan: 8,
  })

  $effect(() => {
    get(messageVirtualizer).setOptions({
      count: messages.length,
      getItemKey: (index: number) => messages[index]?.id ?? index,
    })
  })

  let chipsElement = $state<HTMLDivElement | null>(null)
  let chipsAtStart = $state(true)
  let chipsAtEnd = $state(true)

  function updateChipsFade() {
    if (!chipsElement) return

    chipsAtStart = chipsElement.scrollLeft <= 2
    chipsAtEnd = chipsElement.scrollLeft + chipsElement.clientWidth >= chipsElement.scrollWidth - 2
  }

  $effect(() => {
    updateChipsFade()
  })

  const MAX_TEXTAREA_HEIGHT = 220

  function resizeDraft() {
    if (!draftElement) return

    draftElement.style.height = 'auto'
    draftElement.style.height = `${Math.min(draftElement.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }

  $effect(() => {
    if (draft.length >= 0 && draftElement) resizeDraft()
  })

  function scrollToBottom() {
    if (!scrollElement) return

    if (useVirtualMessages) {
      const last = messages.length - 1

      if (last >= 0) {
        get(messageVirtualizer).scrollToIndex(last, { align: 'end' })
      }

      return
    }

    scrollElement.scrollTop = scrollElement.scrollHeight
  }

  $effect(() => {
    const _length = messages.length
    const _thinking = thinking

    if (_length >= 0 || !_thinking) scrollToBottom()
  })

  function handleChatModeChange(mode: ChatAgentMode) {
    onChatPreferencesChange?.({ chatMode: mode })
  }

  function handleModelChange(id: string) {
    onChatPreferencesChange?.({ modelId: id })
  }

  function handleProviderChange(provider: string) {
    onChatPreferencesChange?.({ provider })
  }
</script>

<div
  class="flex h-full min-h-0 flex-col bg-[color-mix(in_srgb,var(--oryx-bg-surface)_54%,var(--oryx-bg-page))]"
  data-tour="chat-panel"
>
  {#if loading}
    <PhantomUiShell loading={true} class="flex min-h-0 flex-1 flex-col">
      <div
        class="flex h-[68px] shrink-0 items-center gap-3 border-b border-border px-6"
        style="background-color: color-mix(in srgb, var(--oryx-bg-page) 50%, transparent);"
      >
        <div class="size-10 shrink-0 rounded-full bg-muted/60"></div>
        <div class="h-4 min-w-0 flex-1 rounded-md bg-muted/60"></div>
        <div class="size-8 shrink-0 rounded-lg bg-muted/50"></div>
      </div>
      <div class="min-h-0 flex-1 space-y-4 overflow-hidden px-6 pt-5 pb-6">
        <div class="h-[4.5rem] w-[88%] rounded-2xl bg-muted/50"></div>
        <div class="ml-auto h-12 w-[72%] rounded-2xl bg-muted/40"></div>
        <div class="h-16 w-[80%] rounded-2xl bg-muted/45"></div>
      </div>
      <div
        class="shrink-0 space-y-2 border-t border-border px-4 pt-3 pb-3"
        style="background-color: color-mix(in srgb, var(--oryx-bg-page) 58%, transparent);"
      >
        <div class="flex gap-2">
          <div class="h-8 w-24 shrink-0 rounded-full bg-muted/50"></div>
          <div class="h-8 w-28 shrink-0 rounded-full bg-muted/45"></div>
        </div>
        <div class="flex h-[80px] items-end gap-2 rounded-[20px] border border-border bg-surface px-2 py-2">
          <div class="h-12 min-w-0 flex-1 rounded-md bg-muted/50"></div>
          <div class="size-11 shrink-0 rounded-2xl bg-muted/55"></div>
        </div>
        <div class="flex gap-2">
          <div class="h-7 w-24 rounded-full bg-muted/45"></div>
          <div class="h-7 w-28 rounded-full bg-muted/40"></div>
        </div>
      </div>
    </PhantomUiShell>
  {:else}
    <AiModelHeader modelLabel={headerLabel} />
    {#if hasApiKey}
      <div bind:this={scrollElement} class="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-6">
        {#if useVirtualMessages}
          <div class="relative w-full" style="height: {$messageVirtualizer.getTotalSize()}px;">
            {#each $messageVirtualizer.getVirtualItems() as row (row.key)}
              {@const message = messages[row.index]}
              <div
                class="absolute top-0 left-0 w-[calc(100%-0px)] px-0 py-2.5"
                data-index={row.index}
                style="transform: translateY({row.start}px);"
              >
                <div in:fly={{ y: 8, duration: 280, opacity: 0.9 }}>
                  <ChatBubble
                    role={message.role}
                    text={message.content}
                    contentFormat={message.contentFormat}
                  />
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="space-y-5">
            {#each messages as message (message.id)}
              <div in:fly={{ y: 8, duration: 280, opacity: 0.9 }}>
                <ChatBubble
                  role={message.role}
                  text={message.content}
                  contentFormat={message.contentFormat}
                />
              </div>
            {/each}
          </div>
        {/if}
        {#if thinking}
          <div in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}>
            <TypingIndicator label={m.oryxel_chat_thinking({ model: modelLabel })} variant="bubble" />
          </div>
        {/if}
      </div>
      <div
        class="shrink-0 space-y-2 border-t border-border bg-[color-mix(in_srgb,var(--oryx-bg-page)_58%,transparent)] px-4 pt-3 pb-3 backdrop-blur-sm"
      >
        <div
          bind:this={chipsElement}
          class="scrollbar-hide flex gap-2 overflow-x-auto"
          style="mask-image: linear-gradient(to right, {chipsAtStart
            ? 'black 0'
            : 'transparent 0, black 12px'}, {chipsAtEnd ? 'black 100%' : 'black calc(100% - 28px), transparent 100%'})"
          onscroll={updateChipsFade}
        >
          {#each displayChips as chip, index (chip)}
            <div in:fade={{ duration: 200, delay: index * 40 }} out:fade={{ duration: 150 }}>
              <Chip
                onclick={() => {
                  draft = chip
                }}
              >
                {chip}
              </Chip>
            </div>
          {/each}
        </div>

        {#if modeSuggestion}
          {#key modeBannerKey}
            <ChatModeSwitchBanner
              reasonKey={modeSuggestion.reasonKey}
              modeLabel={modeLabelFor(modeSuggestion.suggested)}
              onAccept={onModeSwitchAccept}
              onDismiss={onModeSwitchDismiss}
              onTimeout={onModeSwitchTimeout}
            />
          {/key}
        {/if}

        <div
          class={cn(
            'flex items-end gap-2 rounded-[20px] border border-border bg-surface px-2 pt-2 pb-2 shadow-sm transition-[box-shadow,border-color]',
            'focus-within:border-border-strong focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--oryx-ring)_22%,transparent)]',
          )}
        >
          <textarea
            bind:this={draftElement}
            bind:value={draft}
            rows={2}
            placeholder={placeholder}
            class="oryx-chat-draft min-h-[64px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-[15px] leading-snug text-foreground outline-none placeholder:text-foreground-muted"
            style="max-height: {MAX_TEXTAREA_HEIGHT}px"
            onkeydown={onDraftKeydown}
            oninput={resizeDraft}
            data-tour="chat-input"
          ></textarea>
          <div class="flex shrink-0 items-end gap-1.5 pb-0.5">
            <button
              type="button"
              class={cn(
                'oryx-transition rounded-2xl p-3 shadow-sm',
                canSend ? 'oryx-btn-primary' : 'cursor-not-allowed bg-muted text-foreground-muted opacity-50',
              )}
              disabled={!canSend}
              onclick={send}
              aria-label={m.oryxel_chat_send()}
            >
              <Send class="size-5" />
            </button>
          </div>
        </div>

        <ChatComposerToolbar
          bind:chatMode
          bind:modelId
          bind:selectedProvider
          {modelOptions}
          {providerOptions}
          onChatModeChange={handleChatModeChange}
          onModelChange={handleModelChange}
          onProviderChange={handleProviderChange}
        />
      </div>
    {:else}
      <div class="flex min-h-0 flex-1 items-center justify-center px-5 py-6">
        <div class="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 text-center shadow-sm">
          <h3 class="oryx-heading text-base font-semibold text-foreground">{keyRequiredTitle}</h3>
          <p class="mt-2 text-sm text-foreground-muted">{keyRequiredDesc}</p>
          <Button class="mt-4 w-full justify-center" href={addKeyHref}>
            {addKeyCta}
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .oryx-chat-draft:focus,
  .oryx-chat-draft:focus-visible {
    outline: none;
    box-shadow: none;
  }
</style>
