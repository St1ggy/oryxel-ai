<script lang="ts">
  import { Globe } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'

  import * as m from '$lib/paraglide/messages.js'
  import { getLocale, locales, setLocale } from '$lib/paraglide/runtime'
  import { cn } from '$lib/utils/cn'

  let menuOpen = $state(false)

  const currentLocale = $derived(getLocale())

  const localeLabels: Record<string, string> = {
    en: 'EN',
    ru: 'RU',
    es: 'ES',
    fr: 'FR',
    jp: 'JP',
    zh: 'ZH',
  }

  const navLinks = $derived([
    { href: '#features', label: m.oryxel_public_nav_features() },
    { href: '#privacy', label: m.oryxel_public_nav_privacy() },
    { href: '#faq', label: m.oryxel_public_nav_faq() },
    { href: 'https://github.com', label: m.oryxel_public_nav_github(), external: true },
  ])
</script>

<header
  class="fixed top-0 right-0 left-0 z-50 border-b border-border/50 backdrop-blur-md"
  style="background: var(--landing-nav-bg); view-transition-name: landing-nav;"
>
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-2 no-underline">
      <span class="oryx-heading text-xl font-semibold tracking-wide" style="color: var(--landing-gold-text);">
        Oryxel
      </span>
    </a>

    <!-- Desktop nav -->
    <nav class="hidden items-center gap-6 md:flex" aria-label="Landing navigation">
      {#each navLinks as link (link.href)}
        <a
          href={link.href}
          target={link.external ? '_blank' : undefined}
          rel={link.external ? 'noreferrer noopener' : undefined}
          class="text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <!-- Right side: locale + CTA -->
    <div class="flex items-center gap-2">
      <!-- Locale switcher -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
            'border border-border text-foreground-muted transition-colors hover:border-accent hover:text-foreground',
          )}
          aria-label={m.oryxel_locale_switcher_label()}
        >
          <span class="hidden sm:block">{localeLabels[currentLocale] ?? currentLocale.toUpperCase()}</span>
          <Globe class="block h-4 w-4 sm:hidden" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          class={cn('oryx-dropdown-content z-50 min-w-28 rounded-xl border border-border', 'bg-surface p-1 shadow-xl')}
        >
          {#each locales as locale (locale)}
            <DropdownMenu.Item
              class={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm',
                'hover:bg-muted',
                locale === currentLocale && 'font-medium text-foreground',
              )}
              onSelect={() => setLocale(locale as (typeof locales)[number])}
            >
              {localeLabels[locale] ?? locale.toUpperCase()}
              {#if locale === currentLocale}
                <span class="ml-auto h-1.5 w-1.5 rounded-full" style="background: var(--landing-accent-gold);"></span>
              {/if}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <!-- CTA -->
      <a
        href="/login?redirectTo=/diary&intent=signup"
        class={cn(
          'hidden rounded-full px-4 py-1.5 text-sm font-medium sm:inline-flex',
          'transition-all hover:opacity-90 active:scale-[0.98]',
        )}
        style="background: var(--landing-gradient-cta); color: var(--oryx-btn-primary-fg);"
      >
        {m.oryxel_public_cta_start_free()}
      </a>

      <!-- Mobile hamburger -->
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-border md:hidden"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onclick={() => (menuOpen = !menuOpen)}
      >
        <span class="sr-only">Toggle menu</span>
        <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" stroke="currentColor" stroke-width="1.5">
          {#if menuOpen}
            <path d="M3 3 L13 13 M13 3 L3 13" stroke-linecap="round" />
          {:else}
            <path d="M2 4h12 M2 8h12 M2 12h12" stroke-linecap="round" />
          {/if}
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile menu -->
  {#if menuOpen}
    <div class="border-t border-border/50 px-4 py-3 md:hidden">
      <nav class="flex flex-col gap-1">
        {#each navLinks as link (link.href)}
          <a
            href={link.href}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noreferrer noopener' : undefined}
            class="rounded-lg px-3 py-2 text-sm text-foreground-muted hover:bg-muted hover:text-foreground"
            onclick={() => (menuOpen = false)}
          >
            {link.label}
          </a>
        {/each}
        <a
          href="/login?redirectTo=/diary&intent=signup"
          class="mt-2 rounded-full px-4 py-2 text-center text-sm font-medium"
          style="background: var(--landing-gradient-cta); color: var(--oryx-btn-primary-fg);"
          onclick={() => (menuOpen = false)}
        >
          {m.oryxel_public_cta_start_free()}
        </a>
      </nav>
    </div>
  {/if}
</header>

<!-- Spacer to prevent content from going behind fixed nav -->
<div class="h-[57px]"></div>
