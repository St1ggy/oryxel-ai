<script lang="ts">
  import { Check, Globe, HelpCircle, Palette } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'

  import Button from '$lib/components/ui/button.svelte'
  import { localeStore } from '$lib/locale.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { getLocale, locales } from '$lib/paraglide/runtime'
  import { ORYXEL_THEMES, type OryxelThemeId } from '$lib/theme/constants'
  import { getThemeContext } from '$lib/theme/context'
  import { cn } from '$lib/utils/cn'

  import { invalidateAll } from '$app/navigation'

  interface Props {
    onStartTour?: () => void
  }

  const { onStartTour }: Props = $props()

  const themeContext = getThemeContext()
  function themeLabel(themeId: OryxelThemeId): string {
    switch (themeId) {
      case 'light-aura': {
        return m.oryxel_theme_light()
      }

      case 'midnight-scent': {
        return m.oryxel_theme_midnight()
      }

      case 'rose-blush': {
        return m.oryxel_theme_rose_blush()
      }

      case 'lavender-mist': {
        return m.oryxel_theme_lavender_mist()
      }

      case 'botanical': {
        return m.oryxel_theme_botanical()
      }
    }
  }

  function localeLabel(locale: (typeof locales)[number]): string {
    switch (locale) {
      case 'en': {
        return 'English'
      }

      case 'es': {
        return 'Español'
      }

      case 'fr': {
        return 'Français'
      }

      case 'jp': {
        return '日本語'
      }

      case 'ru': {
        return 'Русский'
      }

      case 'zh': {
        return '中文'
      }
    }
  }

  async function onLocaleSelect(locale: (typeof locales)[number]): Promise<void> {
    localeStore.set(locale)
    await invalidateAll()
  }

  const activeLocale = $derived(getLocale())
</script>

<div class="flex items-center gap-1.5">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button variant="ghost" size="sm" class="size-9 shrink-0 p-0 text-foreground-muted hover:text-accent">
        <Globe class="size-5" />
        <span class="sr-only">{m.oryxel_locale_switcher_label()}</span>
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class="oryx-dropdown-content z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-card"
        sideOffset={6}
        align="end"
      >
        {#each locales as locale (locale)}
          <DropdownMenu.Item
            class={cn(
              'oryx-transition flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none select-none hover:bg-muted data-highlighted:bg-muted',
              activeLocale === locale ? 'text-foreground' : 'text-foreground-muted',
            )}
            onSelect={() => onLocaleSelect(locale)}
          >
            {localeLabel(locale)}
            {#if activeLocale === locale}
              <Check class="size-4" />
            {/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button variant="ghost" size="sm" class="size-9 shrink-0 p-0 text-foreground-muted hover:text-accent">
        <Palette class="size-5" />
        <span class="sr-only">{m.oryxel_settings_theme()}</span>
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class="oryx-dropdown-content z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-card"
        sideOffset={6}
        align="end"
      >
        {#each ORYXEL_THEMES as theme (theme)}
          <DropdownMenu.Item
            class={cn(
              'oryx-transition flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none select-none hover:bg-muted data-highlighted:bg-muted',
              themeContext.theme === theme ? 'text-foreground' : 'text-foreground-muted',
            )}
            onSelect={() => themeContext.setTheme(theme)}
          >
            {themeLabel(theme)}
            {#if themeContext.theme === theme}
              <Check class="size-4" />
            {/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>

  {#if onStartTour}
    <Button
      variant="ghost"
      size="sm"
      class="size-9 shrink-0 p-0 text-foreground-muted hover:text-accent"
      onclick={onStartTour}
    >
      <HelpCircle class="size-5" />
      <span class="sr-only">{m.oryxel_tour_help()}</span>
    </Button>
  {/if}
</div>
