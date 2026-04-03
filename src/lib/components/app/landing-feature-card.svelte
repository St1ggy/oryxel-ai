<script lang="ts">
  import type { Component } from 'svelte'

  let {
    icon: Icon,
    title,
    description,
  }: {
    icon: Component<{ class?: string }>
    title: string
    description: string
  } = $props()
</script>

<div
  class="landing-card-hover group flex flex-col gap-4 rounded-2xl border border-border p-6"
  style="background: var(--landing-card-bg);"
>
  <div class="flex h-11 w-11 items-center justify-center rounded-xl" style="background: var(--landing-gradient-cta);">
    <Icon class="h-5 w-5" />
  </div>
  <div>
    <h3 class="oryx-heading text-lg font-semibold text-foreground">{title}</h3>
    <p class="mt-1.5 text-sm leading-relaxed text-foreground-muted">{description}</p>
  </div>
</div>
