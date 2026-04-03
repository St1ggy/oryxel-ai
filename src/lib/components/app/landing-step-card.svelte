<script lang="ts">
  import type { Component } from 'svelte'

  let {
    step,
    title,
    description,
    illustration: Illustration,
  }: {
    step: number
    title: string
    description: string
    illustration: Component<{ class?: string }>
  } = $props()
</script>

<div
  class="landing-card-hover flex flex-col items-center gap-4 rounded-2xl border border-border p-6 text-center"
  style="background: var(--landing-card-bg);"
>
  <!-- Illustration -->
  <div class="relative w-full max-w-[180px]">
    <Illustration class="w-full" />
  </div>

  <!-- Step number -->
  <div
    class="oryx-heading flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
    style="background: var(--landing-gradient-cta); color: var(--oryx-btn-primary-fg);"
  >
    {step}
  </div>

  <!-- Text -->
  <div>
    <h3 class="oryx-heading text-xl font-semibold text-foreground">{title}</h3>
    <p class="mt-2 text-sm leading-relaxed text-foreground-muted">{description}</p>
  </div>
</div>
