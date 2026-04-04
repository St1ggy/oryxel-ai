<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'

  import * as m from '$lib/paraglide/messages.js'
  import { deLocalizeHref } from '$lib/paraglide/runtime'
  import { cn } from '$lib/utils/cn'

  const path = $derived(deLocalizeHref(page.url.pathname))

  const links = [
    { href: '/diary', label: () => m.oryxel_nav_diary() },
    { href: '/profile', label: () => m.oryxel_nav_profile() },
    { href: '/settings', label: () => m.oryxel_nav_settings() },
  ] as const
</script>

<header
  class="sticky top-0 z-30 border-b border-border bg-[color-mix(in_srgb,var(--oryx-bg-surface)_88%,transparent)] backdrop-blur-md"
>
  <div class="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
    <a
      href={resolve('/diary')}
      class="oryx-heading oryx-transition text-sm font-semibold tracking-tight text-foreground hover:opacity-85 active:scale-[0.98]"
    >
      {m.oryxel_brand()}
    </a>
    <nav class="flex flex-wrap items-center gap-1 md:gap-3">
      {#each links as link (link.href)}
        <a
          href={resolve(link.href)}
          class={cn(
            'oryx-transition rounded-md px-2 py-1.5 text-xs font-medium text-foreground-muted hover:bg-muted hover:text-foreground active:scale-[0.98] md:text-sm',
            { 'bg-muted text-foreground': path === link.href },
          )}
        >
          {link.label()}
        </a>
      {/each}
    </nav>
  </div>
</header>
