<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    label: string
    value: string
    icon?: Snippet
  }

  const { label, value, icon }: Props = $props()
</script>

<div
  class="flex min-h-[140px] flex-col justify-between rounded-[24px] border border-border bg-surface px-[25px] py-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
>
  {#if icon}
    <div
      class="flex size-12 items-center justify-center rounded-2xl text-accent"
      style="background-color: color-mix(in srgb, var(--oryx-accent-solid) 10%, transparent)"
    >
      {@render icon()}
    </div>
  {/if}
  <div class="flex flex-col gap-1">
    <p class="text-sm font-medium text-foreground-muted">{label}</p>
    <p class="line-clamp-3 text-xl leading-snug font-semibold tracking-tight text-foreground">{value}</p>
  </div>
</div>
