<script lang="ts">
  import { LogOut } from '@lucide/svelte'

  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'

  const { children } = $props()

  const path = $derived(page.url.pathname)

  const tabs = $derived([
    { href: resolve('/settings/profile'), label: m.oryxel_settings_nav_profile(), match: '/settings/profile' as const },
    {
      href: resolve('/settings/appearance'),
      label: m.oryxel_settings_nav_appearance(),
      match: '/settings/appearance' as const,
    },
    {
      href: resolve('/settings/security'),
      label: m.oryxel_settings_nav_security(),
      match: '/settings/security' as const,
    },
    { href: resolve('/settings/agents'), label: m.oryxel_settings_nav_agents(), match: '/settings/agents' as const },
    {
      href: resolve('/settings/agents/memory'),
      label: m.oryxel_settings_nav_agent_memory(),
      match: '/settings/agents/memory' as const,
    },
  ])

  function tabActive(match: string): boolean {
    if (match === '/settings/agents') {
      return path.includes('/settings/agents') && !path.includes('/settings/agents/memory')
    }

    return path.includes(match)
  }

  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    await goto(resolve('/'))
  }
</script>

<div class="mx-auto flex w-full max-w-[720px] flex-col gap-6 bg-background px-4 py-8 md:px-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_settings_title()}</h1>

  <nav class="flex flex-wrap gap-2 border-b border-border pb-3" aria-label={m.oryxel_settings_title()}>
    {#each tabs as tab (tab.href)}
      <a
        href={tab.href}
        class={cn(
          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          tabActive(tab.match)
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground-muted hover:bg-muted/60 hover:text-foreground',
        )}
      >
        {tab.label}
      </a>
    {/each}
  </nav>

  <div class="min-h-0 flex-1">
    {@render children()}
  </div>

  <div class="pt-2">
    <Button
      variant="ghost"
      class="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
      onclick={signOut}
    >
      <LogOut class="size-4" />
      {m.oryxel_signout()}
    </Button>
  </div>
</div>
