<script lang="ts">
  interface Props {
    label: string
    variant?: 'inline' | 'bubble'
  }

  const { label, variant = 'bubble' }: Props = $props()
</script>

{#if variant === 'inline'}
  <div class="flex items-center gap-2 text-xs text-foreground-muted" aria-live="polite">
    <span class="flex gap-1">
      {#each [0, 1, 2] as index (index)}
        <span class="size-1.5 animate-pulse rounded-full bg-accent opacity-60" style="animation-delay: {index * 0.15}s"
        ></span>
      {/each}
    </span>
    <span>{label}</span>
  </div>
{:else}
  <div class="flex justify-start" aria-live="polite">
    <div
      class="flex gap-1 rounded-tl-[8px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px] px-5 py-4 text-foreground shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
      style="background-color: var(--oryx-bg-chat-ai);"
      aria-label={label}
    >
      {#each [0, 1, 2] as index (index)}
        <span
          class="size-1.5 animate-bounce rounded-full"
          style="animation-delay: {index *
            0.2}s; background-color: color-mix(in srgb, var(--oryx-fg-muted) 50%, transparent);"
        ></span>
      {/each}
    </div>
  </div>
{/if}
