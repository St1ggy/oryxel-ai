<script lang="ts">
  import { resolve } from '$app/paths'

  import ArrowLeftIcon from '$lib/components/icons/ArrowLeftIcon.svelte'
  import * as m from '$lib/paraglide/messages.js'

  type Props = {
    title?: string
    backHref?: string
  }

  const { title, backHref = '/diary' }: Props = $props()

  const resolvedBackHref = $derived(resolve(backHref as '/'))
</script>

<header
  class="sticky top-0 z-30 border-b border-border bg-[color-mix(in_srgb,var(--oryx-bg-surface)_88%,transparent)] backdrop-blur-md"
>
  <div class="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 md:px-8">
    <!-- svelte/no-navigation-without-resolve: resolve() is used inside resolvedBackHref computed above -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      href={resolvedBackHref}
      class="oryx-transition flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground active:scale-[0.96]"
      aria-label={m.oryxel_back()}
    >
      <ArrowLeftIcon class="size-5" />
    </a>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
    {#if title}
      <h1 class="oryx-heading truncate text-sm font-semibold tracking-tight text-foreground">{title}</h1>
    {/if}
  </div>
</header>
