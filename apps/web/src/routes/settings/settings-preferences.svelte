<script lang="ts">
  import { Accordion } from 'bits-ui'
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import ThemePreviewCard from '$lib/components/ui/theme-preview-card.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { ORYXEL_THEMES, type OryxelThemeId } from '$lib/theme/constants'
  import { getThemeContext } from '$lib/theme/context'

  import { browser } from '$app/environment'

  const PRIVACY_KEY = 'oryxel:privacy'

  const themeContext = getThemeContext()

  let analytics = $state(false)
  let rememberAi = $state(true)
  let accentHex = $state('#c4a982')

  let minPyramidNotes = $state('1')
  let maxPyramidNotes = $state('5')
  let minRecommendations = $state('5')
  let maxRecommendations = $state('20')
  let displayBusy = $state(false)

  const pyramidMinOptions = $derived(
    Array.from({ length: 5 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
  )
  const pyramidMaxOptions = $derived(
    Array.from({ length: 8 }, (_, index) => ({ value: String(index + 3), label: String(index + 3) })),
  )
  const recMinOptions = $derived(
    Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
  )
  const recMaxOptions = $derived(
    Array.from({ length: 6 }, (_, index) => ({ value: String((index + 1) * 5), label: String((index + 1) * 5) })),
  )

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

  function applyAccent() {
    themeContext.setCustomAccent(accentHex)
  }

  function clearAccent() {
    themeContext.setCustomAccent(null)
  }

  function savePrivacy() {
    if (!browser) return

    queueMicrotask(() => {
      localStorage.setItem(PRIVACY_KEY, JSON.stringify({ analytics, rememberAi }))
    })
  }

  async function loadDisplayPrefs() {
    try {
      const response = await fetch('/api/ai/preferences')

      if (response.ok) {
        const data = (await response.json()) as {
          minPyramidNotes: number
          maxPyramidNotes: number
          minRecommendations: number
          maxRecommendations: number
        }

        minPyramidNotes = String(data.minPyramidNotes)
        maxPyramidNotes = String(data.maxPyramidNotes)
        minRecommendations = String(data.minRecommendations)
        maxRecommendations = String(data.maxRecommendations)
      }
    } catch {
      /* ignore */
    }
  }

  async function saveDisplayPrefs() {
    displayBusy = true

    try {
      await fetch('/api/ai/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          minPyramidNotes: Number(minPyramidNotes),
          maxPyramidNotes: Number(maxPyramidNotes),
          minRecommendations: Number(minRecommendations),
          maxRecommendations: Number(maxRecommendations),
        }),
      })
    } catch {
      /* ignore */
    } finally {
      displayBusy = false
    }
  }

  onMount(() => {
    if (!browser) return

    void loadDisplayPrefs()

    const privacyRaw = localStorage.getItem(PRIVACY_KEY)

    if (privacyRaw) {
      try {
        const parsed = JSON.parse(privacyRaw) as { analytics?: boolean; rememberAi?: boolean }

        if (typeof parsed.analytics === 'boolean') analytics = parsed.analytics

        if (typeof parsed.rememberAi === 'boolean') rememberAi = parsed.rememberAi
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
    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <Label for="accent">{m.oryxel_settings_accent()}</Label>
        <div class="mt-1 flex gap-2">
          <input
            id="accent"
            type="color"
            class="h-9 w-14 cursor-pointer rounded border border-border bg-surface"
            bind:value={accentHex}
          />
          <Button type="button" size="sm" onclick={applyAccent}>{m.oryxel_save()}</Button>
          <Button type="button" variant="ghost" size="sm" onclick={clearAccent}>{m.oryxel_cancel()}</Button>
        </div>
      </div>
    </div>
  </Accordion.Content>
</Accordion.Item>

<Accordion.Item value="display" class="rounded-xl border border-border bg-surface">
  <Accordion.Header>
    <Accordion.Trigger
      class="oryx-transition flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted/30"
    >
      {m.oryxel_settings_display()}
    </Accordion.Trigger>
  </Accordion.Header>
  <Accordion.Content class="space-y-4 border-t border-border px-4 py-4">
    <div class="space-y-2">
      <Label>{m.oryxel_settings_pyramid_notes()}</Label>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-foreground-muted">{m.oryxel_settings_min_label()}</span>
          <Select bind:value={minPyramidNotes} options={pyramidMinOptions} class="w-20" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-foreground-muted">{m.oryxel_settings_max_label()}</span>
          <Select bind:value={maxPyramidNotes} options={pyramidMaxOptions} class="w-20" />
        </div>
      </div>
    </div>
    <div class="space-y-2">
      <Label>{m.oryxel_settings_recommendations_count()}</Label>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-foreground-muted">{m.oryxel_settings_min_label()}</span>
          <Select bind:value={minRecommendations} options={recMinOptions} class="w-20" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-foreground-muted">{m.oryxel_settings_max_label()}</span>
          <Select bind:value={maxRecommendations} options={recMaxOptions} class="w-20" />
        </div>
      </div>
    </div>
    <Button type="button" size="sm" disabled={displayBusy} onclick={saveDisplayPrefs}>{m.oryxel_save()}</Button>
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
    <SwitchField
      bind:checked={rememberAi}
      label={m.oryxel_remember_context()}
      id="rememberAi"
      onCheckedChange={savePrivacy}
    />
  </Accordion.Content>
</Accordion.Item>
