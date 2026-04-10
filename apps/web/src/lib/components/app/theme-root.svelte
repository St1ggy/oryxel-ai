<script lang="ts">
  import { Tooltip } from 'bits-ui'

  import { DEFAULT_THEME, ORYXEL_THEME_STORAGE_KEY, type OryxelThemeId, isOryxelThemeId } from '$lib/theme/constants'
  import { setThemeContext } from '$lib/theme/context'

  import type { Snippet } from 'svelte'

  import { browser } from '$app/environment'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()

  let theme = $state<OryxelThemeId>(DEFAULT_THEME)

  if (browser) {
    const storedTheme = localStorage.getItem(ORYXEL_THEME_STORAGE_KEY)

    if (isOryxelThemeId(storedTheme)) {
      theme = storedTheme
    }
  }

  function setTheme(next: OryxelThemeId): void {
    theme = next

    if (browser) {
      localStorage.setItem(ORYXEL_THEME_STORAGE_KEY, next)
    }
  }

  setThemeContext({
    get theme() {
      return theme
    },
    setTheme,
  })

  $effect(() => {
    if (!browser) {
      return
    }

    document.documentElement.dataset.theme = theme
  })
</script>

<Tooltip.Provider delayDuration={150}>
  {@render children()}
</Tooltip.Provider>
