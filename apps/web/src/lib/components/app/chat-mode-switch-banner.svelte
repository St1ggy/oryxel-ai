<script lang="ts">
  import { ArrowRightLeft } from '@lucide/svelte'
  /* eslint-disable import-x/no-duplicates -- svelte and svelte/transition resolve to the same .d.ts but are distinct runtime modules */
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  /* eslint-enable import-x/no-duplicates */
  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { ModeSwitchReasonKey } from '@oryxel/ai'

  const COUNTDOWN_MS = 8000
  const TICK_MS = 100

  type Props = {
    reasonKey: ModeSwitchReasonKey
    modeLabel: string
    onAccept: () => void
    onDismiss: () => void
    onTimeout: () => void
  }

  const { reasonKey, modeLabel, onAccept, onDismiss, onTimeout }: Props = $props()

  let remainingMs = $state(COUNTDOWN_MS)
  let timerId = $state<ReturnType<typeof setInterval> | undefined>()

  const progress = $derived(Math.max(0, Math.min(100, (remainingMs / COUNTDOWN_MS) * 100)))
  const secondsLeft = $derived(Math.ceil(remainingMs / 1000))

  const reasonText = $derived.by(() => {
    switch (reasonKey) {
      case 'add_intent': {
        return m.oryxel_chat_mode_switch_reason_add_intent()
      }

      case 'ask_intent': {
        return m.oryxel_chat_mode_switch_reason_ask_intent()
      }

      case 'recommend_intent': {
        return m.oryxel_chat_mode_switch_reason_recommend_intent()
      }

      case 'agent_intent': {
        return m.oryxel_chat_mode_switch_reason_agent_intent()
      }
    }
  })

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onDismiss()
    }
  }

  function clearTimer() {
    if (timerId !== undefined) {
      clearInterval(timerId)
      timerId = undefined
    }
  }

  function tickCountdown() {
    remainingMs -= TICK_MS

    if (remainingMs <= 0) {
      clearTimer()
      onTimeout()
    }
  }

  function startCountdown() {
    clearTimer()
    remainingMs = COUNTDOWN_MS
    timerId = setInterval(tickCountdown, TICK_MS)
  }

  function cleanupCountdown() {
    clearTimer()
  }

  onMount(() => {
    startCountdown()

    return cleanupCountdown
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="rounded-xl border border-accent/30 bg-[color-mix(in_srgb,var(--oryx-accent-solid)_8%,var(--oryx-bg-surface))] px-3 py-2.5 shadow-sm"
  in:fade={{ duration: 160 }}
  out:fade={{ duration: 120 }}
  role="status"
  aria-live="polite"
>
  <div class="flex flex-wrap items-start gap-2 sm:items-center">
    <div class="flex min-w-0 flex-1 items-start gap-2">
      <ArrowRightLeft class="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-foreground">
          {m.oryxel_chat_mode_switch_title({ mode: modeLabel })}
        </p>
        <p class="mt-0.5 text-xs text-foreground-muted">{reasonText}</p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1.5">
      <Button size="sm" class="h-7 px-2.5 text-xs" onclick={onAccept}>
        {m.oryxel_chat_mode_switch_accept()}
      </Button>
      <Button size="sm" variant="ghost" class="h-7 px-2.5 text-xs" onclick={onDismiss}>
        {m.oryxel_chat_mode_switch_stay()}
      </Button>
      <span class="w-8 text-right text-[11px] tabular-nums text-foreground-muted">
        {m.oryxel_chat_mode_switch_countdown({ seconds: secondsLeft })}
      </span>
    </div>
  </div>
  <div
    class="mt-2 h-1 overflow-hidden rounded-full bg-muted/60"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={progress}
  >
    <div
      class="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear"
      style="width: {progress}%"
    ></div>
  </div>
</div>
