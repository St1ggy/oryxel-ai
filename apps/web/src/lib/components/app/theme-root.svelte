<script lang="ts">
  import { Tooltip } from 'bits-ui'

  import { persistedThemeAtom } from '$lib/prefs/client-stores'
  import { DEFAULT_THEME, type OryxelThemeId } from '$lib/theme/constants'
  import { setThemeContext } from '$lib/theme/context'

  import type { Snippet } from 'svelte'

  import { browser } from '$app/environment'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()

  let theme = $state<OryxelThemeId>(DEFAULT_THEME)

  $effect(() => {
    if (!browser) {
      return
    }

    theme = persistedThemeAtom.get()

    return persistedThemeAtom.subscribe((value) => {
      theme = value
    })
  })

  function setTheme(next: OryxelThemeId): void {
    persistedThemeAtom.set(next)
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
