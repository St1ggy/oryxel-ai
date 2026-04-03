<script lang="ts">
  import InfoIcon from '$lib/components/icons/InfoIcon.svelte'
  import SparklesIcon from '$lib/components/icons/SparklesIcon.svelte'
  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'
  import * as m from '$lib/paraglide/messages.js'

  type ChatInfoMessages = typeof m & {
    oryxel_chat_network_info?: () => string
  }

  type Props = {
    modelLabel: string
  }

  const { modelLabel }: Props = $props()
  const chatInfoMessages = m as ChatInfoMessages
  const networkInfo = $derived(
    chatInfoMessages.oryxel_chat_network_info?.() ?? 'You are interacting with an AI assistant.',
  )
</script>

<header
  class="flex h-[68px] shrink-0 items-center gap-3 border-b border-border px-6 backdrop-blur-sm"
  style="background-color: color-mix(in srgb, var(--oryx-bg-page) 50%, transparent);"
>
  <div
    class="relative flex size-10 shrink-0 items-center justify-center rounded-full text-accent"
    style="background-color: color-mix(in srgb, var(--oryx-accent-solid) 20%, transparent)"
  >
    <SparklesIcon class="size-5" />
    <span
      class="absolute right-0 bottom-0 size-3 rounded-full border-2 bg-success"
      style="border-color: var(--oryx-bg-page);"
      aria-hidden="true"
    ></span>
  </div>
  <div class="min-w-0 flex-1">
    <p class="oryx-heading truncate text-[15px] leading-tight font-semibold text-foreground">{modelLabel}</p>
  </div>
  <TooltipHint content={networkInfo}>
    <button
      type="button"
      class="oryx-transition inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground"
      aria-label={networkInfo}
    >
      <InfoIcon class="size-4.5" />
    </button>
  </TooltipHint>
</header>
