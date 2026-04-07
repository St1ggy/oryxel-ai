<script lang="ts">
  import favicon from '$lib/assets/favicon.svg'
  import SecondaryHeader from '$lib/components/app/secondary-header.svelte'
  import ThemeRoot from '$lib/components/app/theme-root.svelte'
  import '$lib/locale.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { deLocalizeHref, locales, localizeHref } from '$lib/paraglide/runtime'

  import { browser } from '$app/environment'
  import { onNavigate } from '$app/navigation'
  import { page } from '$app/state'

  import './layout.css'

  const { children } = $props()

  const path = $derived(deLocalizeHref(page.url.pathname))
  const isDiary = $derived(path === '/diary')
  const showSecondaryHeader = $derived(!isDiary && path !== '/' && !path.startsWith('/login'))

  const secondaryTitle = $derived.by((): string => {
    if (path.startsWith('/login')) return m.oryxel_login_title_signin()

    if (path.startsWith('/settings/profile')) return m.oryxel_settings_nav_profile()

    if (path.startsWith('/settings/appearance')) return m.oryxel_settings_nav_appearance()

    if (path.startsWith('/settings/security')) return m.oryxel_settings_security_title()

    if (path.startsWith('/settings/agents/memory')) return m.oryxel_settings_nav_agent_memory()

    if (path.startsWith('/settings/agents')) return m.oryxel_settings_nav_agents()

    if (path.startsWith('/settings')) return m.oryxel_settings_title()

    if (path.startsWith('/profile')) return m.oryxel_nav_profile()

    return ''
  })
  const secondaryBackHref = $derived(path.startsWith('/login') ? '/' : '/diary')

  onNavigate((navigation) => {
    if (!browser) {
      return
    }

    if (typeof document === 'undefined' || !document.startViewTransition) {
      return
    }

    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    return new Promise<void>((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  {#each locales as locale (locale)}
    <link rel="alternate" hrefLang={locale} href={localizeHref(page.url.pathname + page.url.search, { locale })} />
  {/each}
</svelte:head>

<ThemeRoot>
  <div
    class={isDiary
      ? 'flex h-dvh flex-col overflow-hidden bg-background text-foreground'
      : 'flex min-h-svh flex-col bg-background text-foreground'}
  >
    {#if showSecondaryHeader}
      <SecondaryHeader title={secondaryTitle} backHref={secondaryBackHref} />
    {/if}
    <main class="oryx-view-transition-main flex min-h-0 flex-1 flex-col overflow-hidden">
      {@render children()}
    </main>
  </div>
</ThemeRoot>
