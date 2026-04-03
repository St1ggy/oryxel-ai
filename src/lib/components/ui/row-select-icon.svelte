<script lang="ts">
  import CheckIcon from '$lib/components/icons/CheckIcon.svelte'
  import { cn } from '$lib/utils/cn'

  type Props = {
    selected: boolean
    ariaLabel: string
    disabled?: boolean
    onToggle?: () => void
  }

  const { selected, ariaLabel, disabled = false, onToggle }: Props = $props()

  function handleToggle() {
    if (disabled) {
      return
    }

    onToggle?.()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }
</script>

<button
  type="button"
  aria-label={ariaLabel}
  aria-pressed={selected}
  {disabled}
  onclick={handleToggle}
  onkeydown={handleKeydown}
  class={cn(
    'oryx-transition relative inline-flex size-7 items-center justify-center rounded-full',
    'border border-border bg-surface text-foreground-muted hover:border-accent/70 hover:text-accent',
    'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    selected && 'border-accent bg-[color-mix(in_srgb,var(--color-accent)_16%,var(--color-surface))] text-accent',
  )}
>
  {#if selected}
    <CheckIcon class="size-3.5" />
  {:else}
    <span class="size-2 rounded-full bg-current opacity-45"></span>
  {/if}
</button>
