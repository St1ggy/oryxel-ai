<script lang="ts">
  import { Accordion } from 'bits-ui'
  import { onMount } from 'svelte'

  import { PROVIDER_GUIDES, type ProviderGuideId, getProviderGuideLocalized } from '$lib/ai/provider-guides'
  import Button from '$lib/components/ui/button.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import MaskedInput from '$lib/components/ui/masked-input.svelte'
  import Modal from '$lib/components/ui/modal.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import ThemePreviewCard from '$lib/components/ui/theme-preview-card.svelte'
  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { getLocale } from '$lib/paraglide/runtime'
  import { ORYXEL_THEMES, type OryxelThemeId } from '$lib/theme/constants'
  import { getThemeContext } from '$lib/theme/context'

  import { browser } from '$app/environment'

  const LEGACY_PROVIDERS_KEY = 'oryxel:providers'
  const PRIVACY_KEY = 'oryxel:privacy'

  type ProviderRow = {
    id: number
    provider: ProviderGuideId
    label: string
    active: boolean
    keyHint: string
  }

  type LegacyProviderRow = {
    provider: string
    label?: string
    active?: boolean
    key?: string
  }

  const themeContext = getThemeContext()

  let providers = $state<ProviderRow[]>([])
  let legacyProviders = $state<LegacyProviderRow[]>([])
  let analytics = $state(false)
  let rememberAi = $state(true)
  let addOpen = $state(false)
  let newProvider = $state<ProviderGuideId>('openai')
  let newKey = $state('')
  let newLabel = $state('')
  let newDefault = $state(false)
  let accentHex = $state('#c4a982')
  let providersLoading = $state(true)
  let providerError = $state('')
  let providerBusy = $state(false)
  let defaultProvider = $state<ProviderGuideId | ''>('')
  let configuredProviderIds = $state<string[]>([])

  const selectedGuide = $derived(PROVIDER_GUIDES[newProvider])
  const providerGuideTitle = $derived(m.oryxel_settings_provider_guide())
  const getKeyLabel = $derived(m.oryxel_settings_get_key())
  const importLegacyLabel = $derived(m.oryxel_settings_import_legacy_keys())
  const emptyProvidersLabel = $derived(m.oryxel_settings_no_providers())
  const setDefaultLabel = $derived(m.oryxel_settings_set_default())
  const providerLinksLabel = $derived(m.oryxel_settings_provider_links())
  const loadingLabel = $derived(m.oryxel_loading())
  const signupLabel = $derived(m.oryxel_settings_signup())
  const documentationLabel = $derived(m.oryxel_settings_docs())
  const loadProvidersErrorLabel = $derived(m.oryxel_settings_error_load_providers())
  const importKeysErrorLabel = $derived(m.oryxel_settings_error_import_keys())
  const keyRequiredErrorLabel = $derived(m.oryxel_settings_error_key_required())
  const saveProviderErrorLabel = $derived(m.oryxel_settings_error_save_provider())
  const defaultProviderErrorLabel = $derived(m.oryxel_settings_error_default_provider())
  const removeProviderErrorLabel = $derived(m.oryxel_settings_error_remove_provider())
  const providerLabelOpenAi = $derived(m.oryxel_provider_openai())
  const providerLabelAnthropic = $derived(m.oryxel_provider_anthropic())
  const providerLabelGemini = $derived(m.oryxel_provider_gemini())
  const providerLabelQwen = $derived(m.oryxel_provider_qwen())
  const providerLabelPerplexity = $derived(m.oryxel_provider_perplexity())
  const providerLabelGroq = $derived(m.oryxel_provider_groq())
  const providerLabelDeepSeek = $derived(m.oryxel_provider_deepseek())

  function themeTitle(id: OryxelThemeId): string {
    switch (id) {
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

  onMount(() => {
    if (!browser) {
      return
    }

    void loadProviders()
    legacyProviders = readLegacyProviders()

    const pr = localStorage.getItem(PRIVACY_KEY)

    if (pr) {
      try {
        const o = JSON.parse(pr) as { analytics?: boolean; rememberAi?: boolean }

        if (typeof o.analytics === 'boolean') {
          analytics = o.analytics
        }

        if (typeof o.rememberAi === 'boolean') {
          rememberAi = o.rememberAi
        }
      } catch {
        /* ignore */
      }
    }
  })

  async function loadProviders() {
    providersLoading = true
    providerError = ''

    try {
      const [providersResponse, configuredResponse] = await Promise.all([
        fetch('/api/ai/providers'),
        fetch('/api/ai/providers/configured'),
      ])

      if (!providersResponse.ok) {
        throw new Error(`Failed with ${providersResponse.status}`)
      }

      const payload = (await providersResponse.json()) as {
        providers: ProviderRow[]
        defaultProvider?: ProviderGuideId | null
      }

      providers = payload.providers
      defaultProvider = payload.defaultProvider ?? providers.find((provider) => provider.active)?.provider ?? ''

      if (configuredResponse.ok) {
        const configuredPayload = (await configuredResponse.json()) as {
          providers: { id: string; source: string }[]
        }

        configuredProviderIds = configuredPayload.providers.map((p) => p.id)
      }
    } catch {
      providerError = loadProvidersErrorLabel
      providers = []
    } finally {
      providersLoading = false
    }
  }

  function readLegacyProviders(): LegacyProviderRow[] {
    if (!browser) {
      return []
    }

    const raw = localStorage.getItem(LEGACY_PROVIDERS_KEY)

    if (!raw) {
      return []
    }

    try {
      const parsed = JSON.parse(raw) as LegacyProviderRow[]

      return parsed.filter((row) => Boolean(row.key?.trim()))
    } catch {
      return []
    }
  }

  async function importLegacyProviders() {
    if (legacyProviders.length === 0) {
      return
    }

    providerBusy = true
    providerError = ''

    try {
      const response = await fetch('/api/ai/providers/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providers: legacyProviders }),
      })

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      localStorage.removeItem(LEGACY_PROVIDERS_KEY)
      legacyProviders = []
      await loadProviders()
    } catch {
      providerError = importKeysErrorLabel
    } finally {
      providerBusy = false
    }
  }

  function savePrivacy() {
    if (!browser) {
      return
    }

    queueMicrotask(() => {
      localStorage.setItem(PRIVACY_KEY, JSON.stringify({ analytics, rememberAi }))
    })
  }

  function applyAccent() {
    themeContext.setCustomAccent(accentHex)
  }

  function clearAccent() {
    themeContext.setCustomAccent(null)
  }

  function openExternal(url: string) {
    if (!browser) {
      return
    }

    globalThis.open(url, '_blank', 'noopener,noreferrer')
  }

  async function addProvider() {
    if (!newKey.trim()) {
      providerError = keyRequiredErrorLabel

      return
    }

    providerBusy = true
    providerError = ''

    try {
      const response = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: newProvider,
          key: newKey,
          label: newLabel || undefined,
          setDefault: newDefault,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      await loadProviders()
      newKey = ''
      newLabel = ''
      newDefault = false
      addOpen = false
    } catch {
      providerError = saveProviderErrorLabel
    } finally {
      providerBusy = false
    }
  }

  async function setDefault(id: number) {
    providerBusy = true
    providerError = ''

    try {
      const response = await fetch(`/api/ai/providers/${id}/default`, { method: 'PATCH' })

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      await loadProviders()
    } catch {
      providerError = defaultProviderErrorLabel
    } finally {
      providerBusy = false
    }
  }

  async function saveDefaultProvider() {
    if (!defaultProvider) {
      return
    }

    providerBusy = true
    providerError = ''

    try {
      const response = await fetch('/api/ai/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ defaultProvider }),
      })

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      await loadProviders()
    } catch {
      providerError = defaultProviderErrorLabel
    } finally {
      providerBusy = false
    }
  }

  async function removeProvider(id: number) {
    providerBusy = true
    providerError = ''

    try {
      const response = await fetch(`/api/ai/providers/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      await loadProviders()
    } catch {
      providerError = removeProviderErrorLabel
    } finally {
      providerBusy = false
    }
  }

  async function exportData(format: 'json' | 'md') {
    providerBusy = true
    providerError = ''
    const exportErrorLabel =
      format === 'json' ? m.oryxel_settings_error_export_json() : m.oryxel_settings_error_export_md()

    try {
      const response = await fetch(`/api/account/export?format=${format}`)

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = format === 'json' ? 'oryxel-export.json' : 'oryxel-export.md'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      providerError = exportErrorLabel
    } finally {
      providerBusy = false
    }
  }

  async function deleteAllData() {
    const confirmDelete = globalThis.confirm(m.oryxel_delete_confirm())

    if (!confirmDelete) {
      return
    }

    providerBusy = true
    providerError = ''

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmText: 'DELETE' }),
      })

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      globalThis.location.href = '/login'
    } catch {
      providerError = m.oryxel_settings_error_delete_all()
    } finally {
      providerBusy = false
    }
  }

  function providerDisplayName(provider: ProviderGuideId): string {
    switch (provider) {
      case 'openai': {
        return providerLabelOpenAi
      }

      case 'anthropic': {
        return providerLabelAnthropic
      }

      case 'gemini': {
        return providerLabelGemini
      }

      case 'qwen': {
        return providerLabelQwen
      }

      case 'perplexity': {
        return providerLabelPerplexity
      }

      case 'groq': {
        return providerLabelGroq
      }

      case 'deepseek': {
        return providerLabelDeepSeek
      }
    }
  }

  const allProviderSelectOptions = $derived(
    (['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek'] as ProviderGuideId[]).map(
      (provider) => ({
        value: provider,
        label: providerDisplayName(provider),
      }),
    ),
  )

  const configuredProviderSelectOptions = $derived(
    allProviderSelectOptions.filter(
      (o) => configuredProviderIds.length === 0 || configuredProviderIds.includes(o.value),
    ),
  )

  const localizedGuide = $derived(getProviderGuideLocalized(newProvider, getLocale()))
  const providerGuideSteps = $derived(localizedGuide.steps)
  const providerGuideNotes = $derived(localizedGuide.notes)

  let accordionValue = $state(['theme', 'providers', 'display', 'data', 'privacy'])

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

  onMount(() => {
    void loadDisplayPrefs()
  })

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
</script>

<div class="mx-auto max-w-[720px] space-y-6 bg-background px-4 py-8 md:px-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_settings_title()}</h1>

  <Accordion.Root class="space-y-3" type="multiple" bind:value={accordionValue}>
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

    <Accordion.Item value="providers" class="rounded-xl border border-border bg-surface">
      <Accordion.Header>
        <Accordion.Trigger
          class="oryx-transition flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted/30"
        >
          {m.oryxel_settings_providers()}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content class="space-y-3 border-t border-border px-4 py-4">
        <p class="flex items-start gap-2 text-xs text-foreground-muted">
          <TooltipHint content={m.oryxel_keys_tooltip()}>
            <span class="cursor-help border-b border-dotted border-foreground-muted">🔒</span>
          </TooltipHint>
          {m.oryxel_keys_local()}
        </p>
        <div class="space-y-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
          <Label for="default-provider">{m.oryxel_settings_default_provider()}</Label>
          <div class="flex flex-wrap items-center gap-2">
            <Select
              id="default-provider"
              options={configuredProviderSelectOptions}
              bind:value={defaultProvider}
              triggerAriaLabel={m.oryxel_settings_default_provider()}
            />
            <Button type="button" size="sm" disabled={providerBusy || !defaultProvider} onclick={saveDefaultProvider}
              >{m.oryxel_save()}</Button
            >
          </div>
        </div>
        {#if legacyProviders.length > 0}
          <div class="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p class="text-xs text-foreground-muted">{m.oryxel_keys_local()}</p>
            <Button
              class="mt-2"
              type="button"
              size="sm"
              variant="secondary"
              disabled={providerBusy}
              onclick={importLegacyProviders}
            >
              {importLegacyLabel}
            </Button>
          </div>
        {/if}
        <ul class="space-y-2">
          {#if providersLoading}
            <li class="rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted">{loadingLabel}</li>
          {:else if providers.length === 0}
            <li class="rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted">
              {emptyProvidersLabel}
            </li>
          {:else}
            {#each providers as p (p.id)}
              <li class="rounded-lg border border-border px-3 py-2 text-sm">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-foreground">{p.label}</p>
                    <p class="text-xs text-foreground-muted">{p.keyHint}</p>
                  </div>
                  {#if p.active}
                    <span class="text-xs font-medium text-success">{m.oryxel_provider_active()}</span>
                  {/if}
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  {#if !p.active}
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      disabled={providerBusy}
                      onclick={() => setDefault(p.id)}
                    >
                      {setDefaultLabel}
                    </Button>
                  {/if}
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={providerBusy}
                    onclick={() => removeProvider(p.id)}
                  >
                    {m.oryxel_action_remove()}
                  </Button>
                  <button
                    type="button"
                    class="oryx-transition inline-flex h-8 items-center rounded-md px-2 text-xs text-accent hover:bg-muted/30"
                    onclick={() => openExternal(PROVIDER_GUIDES[p.provider].docsUrl)}
                  >
                    {getKeyLabel}
                  </button>
                </div>
              </li>
            {/each}
          {/if}
        </ul>
        <Button type="button" variant="secondary" onclick={() => (addOpen = true)}>{m.oryxel_settings_add_key()}</Button
        >
        {#if providerError}
          <p class="text-xs text-destructive">{providerError}</p>
        {/if}
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="data" class="rounded-xl border border-border bg-surface">
      <Accordion.Header>
        <Accordion.Trigger
          class="oryx-transition flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted/30"
        >
          {m.oryxel_settings_data()}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content class="flex flex-wrap gap-2 border-t border-border px-4 py-4">
        <Button type="button" variant="secondary" disabled={providerBusy} onclick={() => exportData('json')}
          >{m.oryxel_export_json()}</Button
        >
        <Button type="button" variant="secondary" disabled={providerBusy} onclick={() => exportData('md')}
          >{m.oryxel_export_md()}</Button
        >
        <Button type="button" variant="secondary">{m.oryxel_import_csv()}</Button>
        <Button type="button" variant="destructive" disabled={providerBusy} onclick={deleteAllData}
          >{m.oryxel_delete_all()}</Button
        >
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
        <SwitchField
          bind:checked={analytics}
          label={m.oryxel_analytics()}
          id="analytics"
          onCheckedChange={savePrivacy}
        />
        <SwitchField
          bind:checked={rememberAi}
          label={m.oryxel_remember_context()}
          id="rememberAi"
          onCheckedChange={savePrivacy}
        />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</div>

<Modal bind:open={addOpen} title={m.oryxel_settings_add_key()} description={m.oryxel_keys_local()}>
  <div class="space-y-3">
    <div>
      <Label for="pv">{m.oryxel_provider_field()}</Label>
      <Select
        id="pv"
        class="mt-1"
        options={allProviderSelectOptions}
        bind:value={newProvider}
        triggerAriaLabel={m.oryxel_provider_field()}
      />
    </div>
    <div class="rounded-xl border border-border bg-muted/20 p-3">
      <p class="text-xs font-semibold text-foreground">{providerGuideTitle}</p>
      <p class="mt-1 text-xs text-foreground-muted">{providerDisplayName(selectedGuide.id)}</p>
      <ol class="mt-2 list-decimal space-y-1 pl-4 text-xs text-foreground-muted">
        {#each providerGuideSteps as step (step)}
          <li>{step}</li>
        {/each}
      </ol>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="oryx-transition inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted/40"
          onclick={() => openExternal(selectedGuide.signupUrl)}
        >
          {signupLabel}
        </button>
        <button
          type="button"
          class="oryx-transition inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted/40"
          onclick={() => openExternal(selectedGuide.keyConsoleUrl)}
        >
          {providerLinksLabel}
        </button>
        <button
          type="button"
          class="oryx-transition inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted/40"
          onclick={() => openExternal(selectedGuide.docsUrl)}
        >
          {documentationLabel}
        </button>
      </div>
      <ul class="mt-2 space-y-1 text-xs text-foreground-muted">
        {#each providerGuideNotes as note (note)}
          <li>- {note}</li>
        {/each}
      </ul>
    </div>
    <div>
      <Label for="pk">{m.oryxel_api_key_field()}</Label>
      <div class="mt-1">
        <MaskedInput id="pk" bind:value={newKey} placeholder="sk-…" />
      </div>
    </div>
    <div>
      <Label for="pl">{m.oryxel_provider_label()}</Label>
      <Input id="pl" class="mt-1" bind:value={newLabel} />
    </div>
    <SwitchField bind:checked={newDefault} label={m.oryxel_settings_make_default()} id="def" />
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (addOpen = false)}>{m.oryxel_cancel()}</Button>
    <Button disabled={providerBusy} onclick={addProvider}>{m.oryxel_save()}</Button>
  {/snippet}
</Modal>
