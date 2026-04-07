<script lang="ts">
  import { Accordion } from 'bits-ui'
  import { onMount } from 'svelte'

  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import ThemePreviewCard from '$lib/components/ui/theme-preview-card.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { ORYXEL_THEMES, type OryxelThemeId } from '$lib/theme/constants'
  import { getThemeContext } from '$lib/theme/context'

  import { browser } from '$app/environment'

  const PRIVACY_KEY = 'oryxel:privacy'

  const themeContext = getThemeContext()

  let analytics = $state(false)

  function themeTitle(id: OryxelThemeId): string {
    const titles: Record<OryxelThemeId, () => string> = {
      'light-aura': m.oryxel_theme_light,
      'midnight-scent': m.oryxel_theme_midnight,
      'rose-blush': m.oryxel_theme_rose_blush,
      'lavender-mist': m.oryxel_theme_lavender_mist,
      botanical: m.oryxel_theme_botanical,
    }

    return titles[id]()
  }

  function savePrivacy() {
    if (!browser) return

    queueMicrotask(() => {
      localStorage.setItem(PRIVACY_KEY, JSON.stringify({ analytics }))
    })
  }

  onMount(() => {
    if (!browser) return

    const privacyRaw = localStorage.getItem(PRIVACY_KEY)

    if (privacyRaw) {
      try {
        const parsed = JSON.parse(privacyRaw) as { analytics?: boolean; rememberAi?: unknown }

        if (typeof parsed.analytics === 'boolean') analytics = parsed.analytics
      } catch {
        /* ignore */
      }
    }
  })
</script>

<Accordion.Item value="theme" class="rounded-xl border border-border bg-surface">
  <Accordion.Header>
    <Accordion.Trigger
      class="oryx-transition flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted/30"
    >
      {m.oryxel_settings_theme()}
    </Accordion.Trigger>
  </Accordion.Header>
  <Accordion.Content class="border-t border-border px-4 py-4">
    <div class="grid gap-3 sm:grid-cols-3">
      {#each ORYXEL_THEMES as tid (tid)}
        <ThemePreviewCard
          themeId={tid}
          title={themeTitle(tid)}
          selected={themeContext.theme === tid}
          onclick={() => themeContext.setTheme(tid)}
        />
      {/each}
    </div>
  </Accordion.Content>
</Accordion.Item>

<Accordion.Item value="privacy" class="rounded-xl border border-border bg-surface">
  <Accordion.Header>
    <Accordion.Trigger
      class="oryx-transition flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted/30"
    >
      {m.oryxel_settings_privacy()}
    </Accordion.Trigger>
  </Accordion.Header>
  <Accordion.Content class="space-y-4 border-t border-border px-4 py-4">
    <SwitchField bind:checked={analytics} label={m.oryxel_analytics()} id="analytics" onCheckedChange={savePrivacy} />
    <p class="text-xs text-foreground-muted">{m.oryxel_settings_privacy_chat_context_hint()}</p>
  </Accordion.Content>
</Accordion.Item>
