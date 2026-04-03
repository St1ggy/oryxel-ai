<script lang="ts">
  import { fade, fly } from 'svelte/transition'

  import { providerPlanKind } from '$lib/ai/provider-plans'
  import AiModelHeader from '$lib/components/app/ai-model-header.svelte'
  import ChatBubble from '$lib/components/app/chat-bubble.svelte'
  import TypingIndicator from '$lib/components/app/typing-indicator.svelte'
  import SendIcon from '$lib/components/icons/SendIcon.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Chip from '$lib/components/ui/chip.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { ChatMessage } from '$lib/types/diary'

  type Props = {
    messages: ChatMessage[]
    draft?: string
    thinking?: boolean
    modelLabel?: string
    hasApiKey?: boolean
    addKeyHref?: string
    selectedProvider?: string
    providerOptions?: { value: string; label: string }[]
    suggestions?: string[]
    onSend?: (text: string) => void
  }

  let {
    messages,
    draft = $bindable(''),
    thinking = false,
    modelLabel = 'GPT-4.1',
    hasApiKey = true,
    addKeyHref = '/settings',
    selectedProvider = $bindable(''),
    providerOptions = [],
    suggestions = [],
    onSend,
  }: Props = $props()
  const keyRequiredTitle = $derived(m.oryxel_chat_key_required_title())
  const keyRequiredDesc = $derived(m.oryxel_chat_key_required_desc())
  const addKeyCta = $derived(m.oryxel_chat_add_key_cta())

  const fallbackChips = $derived([m.oryxel_chip_analog(), m.oryxel_chip_summer(), m.oryxel_chip_evening()])
  const displayChips = $derived(suggestions.length > 0 ? suggestions : fallbackChips)

  function send() {
    const t = draft.trim()

    if (!t) {
      return
    }

    onSend?.(t)
    draft = ''
  }

  function onDraftKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  function providerPlanLabel(provider: string): string {
    return providerPlanKind(provider) === 'free'
      ? m.oryxel_provider_plan_free_short()
      : m.oryxel_provider_plan_paid_short()
  }

  const providerSelectOptions = $derived(
    providerOptions.map((provider) => ({
      value: provider.value,
      label: provider.label,
      meta: providerPlanLabel(provider.value),
      tone: providerPlanKind(provider.value),
    })),
  )

  const canSend = $derived(draft.trim().length > 0)

  let scrollEl = $state<HTMLDivElement | null>(null)

  function scrollToBottom() {
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight
  }

  $effect(() => {
    // Re-run whenever messages or thinking change
    messages
    thinking
    scrollToBottom()
  })
</script>

<div class="flex h-full min-h-0 flex-col bg-[color-mix(in_srgb,var(--oryx-bg-surface)_54%,var(--oryx-bg-page))]">
  <AiModelHeader modelLabel={m.oryxel_chat_model()} />
  {#if hasApiKey}
    <div bind:this={scrollEl} class="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pt-5 pb-6">
      {#each messages as message (message.id)}
        <div in:fly={{ y: 8, duration: 280, opacity: 0.9 }}>
          <ChatBubble role={message.role}>
            {message.content}
          </ChatBubble>
        </div>
      {/each}
      {#if thinking}
        <div in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}>
          <TypingIndicator label={m.oryxel_chat_thinking({ model: modelLabel })} variant="bubble" />
        </div>
      {/if}
    </div>
    <div
      class="shrink-0 space-y-2 border-t border-border bg-[color-mix(in_srgb,var(--oryx-bg-page)_58%,transparent)] px-4 pt-3 pb-3 backdrop-blur-sm"
    >
      <div class="scrollbar-hide flex gap-2 overflow-x-auto">
        {#each displayChips as chip, i (chip)}
          <div in:fade={{ duration: 200, delay: i * 40 }} out:fade={{ duration: 150 }}>
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
      <div
        class={cn(
          'flex items-end gap-2 rounded-[20px] border border-border bg-surface px-2 pt-px pb-2 shadow-sm transition-[box-shadow,border-color]',
          'focus-within:border-border-strong focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--oryx-ring)_22%,transparent)]',
        )}
      >
        <textarea
          bind:value={draft}
          rows={1}
          placeholder={m.oryxel_chat_placeholder()}
          class="oryx-chat-draft max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-foreground-muted"
          onkeydown={onDraftKeydown}
        ></textarea>
        <button
          type="button"
          class={cn(
            'oryx-transition shrink-0 rounded-2xl p-3 shadow-sm',
            canSend ? 'oryx-btn-primary' : 'cursor-not-allowed bg-muted text-foreground-muted opacity-50',
          )}
          disabled={!canSend}
          onclick={send}
          aria-label={m.oryxel_chat_send()}
        >
          <SendIcon class="size-5" />
        </button>
      </div>
      {#if providerOptions.length >= 1}
        <div class="flex items-center gap-2 px-1 pt-0.5">
          <label for="chat-provider-select" class="shrink-0 text-xs text-foreground-muted">
            {m.oryxel_settings_providers()}:
          </label>
          <Select
            id="chat-provider-select"
            class="h-7 min-w-0 flex-1 text-xs"
            options={providerSelectOptions}
            bind:value={selectedProvider}
            triggerAriaLabel={m.oryxel_settings_providers()}
          />
        </div>
      {/if}
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
</div>

<style>
  .oryx-chat-draft:focus,
  .oryx-chat-draft:focus-visible {
    outline: none;
    box-shadow: none;
  }
</style>
