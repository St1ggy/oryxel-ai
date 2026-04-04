<script lang="ts">
  import { Tooltip } from 'bits-ui'

  import { DEFAULT_THEME, ORYXEL_THEME_STORAGE_KEY, type OryxelThemeId, isOryxelThemeId } from '$lib/theme/constants'
  import { setThemeContext } from '$lib/theme/context'

  import type { Snippet } from 'svelte'

  import { browser } from '$app/environment'

  const ACCENT_KEY = 'oryxel:accent-custom'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()

  let theme = $state<OryxelThemeId>(DEFAULT_THEME)
  let customAccent = $state<string | null>(null)

  if (browser) {
    const storedTheme = localStorage.getItem(ORYXEL_THEME_STORAGE_KEY)

    if (isOryxelThemeId(storedTheme)) {
      theme = storedTheme
    }

    customAccent = localStorage.getItem(ACCENT_KEY)
  }

  function setTheme(next: OryxelThemeId): void {
    theme = next

    if (browser) {
      localStorage.setItem(ORYXEL_THEME_STORAGE_KEY, next)
    }
  }

  function setCustomAccent(hex: string | null): void {
    customAccent = hex

    if (browser) {
      if (hex) {
        localStorage.setItem(ACCENT_KEY, hex)
      } else {
        localStorage.removeItem(ACCENT_KEY)
      }
    }
  }

  setThemeContext({
    get theme() {
      return theme
    },
    setTheme,
    get customAccent() {
      return customAccent
    },
    setCustomAccent,
  })

  $effect(() => {
    if (!browser) {
      return
    }

    document.documentElement.dataset.theme = theme
    document.documentElement.toggleAttribute('data-accent-custom', Boolean(customAccent))

    if (customAccent) {
      document.documentElement.style.setProperty('--oryx-custom-accent', customAccent)
    } else {
      document.documentElement.style.removeProperty('--oryx-custom-accent')
    }
  })
</script>

<Tooltip.Provider delayDuration={150}>
  {@render children()}
</Tooltip.Provider>
