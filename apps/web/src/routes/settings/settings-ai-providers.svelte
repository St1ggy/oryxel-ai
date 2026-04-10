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
  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { getLocale } from '$lib/paraglide/runtime'

  import { browser } from '$app/environment'

  const LEGACY_PROVIDERS_KEY = 'oryxel:providers'

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

  let providers = $state<ProviderRow[]>([])
  let legacyProviders = $state<LegacyProviderRow[]>([])
  let addOpen = $state(false)
  let newProvider = $state<ProviderGuideId>('openai')
  let newKey = $state('')
  let newLabel = $state('')
  let newDefault = $state(false)
  let providersLoading = $state(true)
  let providerError = $state('')
  let providerBusy = $state(false)
  let defaultProvider = $state<ProviderGuideId | ''>('')
  let configuredProviderIds = $state<string[]>([])

  const selectedGuide = $derived(PROVIDER_GUIDES[newProvider])
  const localizedGuide = $derived(getProviderGuideLocalized(newProvider, getLocale()))
  const providerGuideSteps = $derived(localizedGuide.steps)
  const providerGuideNotes = $derived(localizedGuide.notes)

  const providerNames: Record<ProviderGuideId, () => string> = {
    openai: m.oryxel_provider_openai,
    anthropic: m.oryxel_provider_anthropic,
    gemini: m.oryxel_provider_gemini,
    qwen: m.oryxel_provider_qwen,
    perplexity: m.oryxel_provider_perplexity,
    groq: m.oryxel_provider_groq,
    deepseek: m.oryxel_provider_deepseek,
  }

  function providerDisplayName(provider: ProviderGuideId): string {
    return providerNames[provider]()
  }

  const allProviderSelectOptions = $derived(
    (['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek'] as ProviderGuideId[]).map(
      (provider) => ({ value: provider, label: providerDisplayName(provider) }),
    ),
  )

  const configuredProviderSelectOptions = $derived(
    allProviderSelectOptions.filter(
      (option) => configuredProviderIds.length === 0 || configuredProviderIds.includes(option.value),
    ),
  )

  onMount(() => {
    if (!browser) return

    void loadProviders()
    legacyProviders = readLegacyProviders()
  })

  async function loadProviders() {
    providersLoading = true
    providerError = ''

    try {
      const [providersResponse, configuredResponse] = await Promise.all([
        fetch('/api/ai/providers'),
        fetch('/api/ai/providers/configured'),
      ])

      if (!providersResponse.ok) throw new Error(`Failed with ${providersResponse.status}`)

      const payload = (await providersResponse.json()) as {
        providers: ProviderRow[]
        defaultProvider?: ProviderGuideId | null
      }

      providers = payload.providers
      defaultProvider = payload.defaultProvider ?? providers.find((p) => p.active)?.provider ?? ''

      if (configuredResponse.ok) {
        const configuredPayload = (await configuredResponse.json()) as { providers: { id: string; source: string }[] }

        configuredProviderIds = configuredPayload.providers.map((p) => p.id)
      }
    } catch {
      providerError = m.oryxel_settings_error_load_providers()
      providers = []
    } finally {
      providersLoading = false
    }
  }

  function readLegacyProviders(): LegacyProviderRow[] {
    if (!browser) return []

    const raw = localStorage.getItem(LEGACY_PROVIDERS_KEY)

    if (!raw) return []

    try {
      const parsed = JSON.parse(raw) as LegacyProviderRow[]

      return parsed.filter((row) => Boolean(row.key?.trim()))
    } catch {
      return []
    }
  }

  async function importLegacyProviders() {
    if (legacyProviders.length === 0) return

    providerBusy = true
    providerError = ''
    try {
      const response = await fetch('/api/ai/providers/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providers: legacyProviders }),
      })

      if (!response.ok) throw new Error(`Failed with ${response.status}`)

      localStorage.removeItem(LEGACY_PROVIDERS_KEY)
      legacyProviders = []
      await loadProviders()
    } catch {
      providerError = m.oryxel_settings_error_import_keys()
    } finally {
      providerBusy = false
    }
  }

  function openExternal(url: string) {
    if (!browser) return

    globalThis.open(url, '_blank', 'noopener,noreferrer')
  }

  async function addProvider() {
    if (!newKey.trim()) {
      providerError = m.oryxel_settings_error_key_required()

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

      if (!response.ok) throw new Error(`Failed with ${response.status}`)

      await loadProviders()
      newKey = ''
      newLabel = ''
      newDefault = false
      addOpen = false
    } catch {
      providerError = m.oryxel_settings_error_save_provider()
    } finally {
      providerBusy = false
    }
  }

  async function setDefault(id: number) {
    providerBusy = true
    providerError = ''
    try {
      const response = await fetch(`/api/ai/providers/${id}/default`, { method: 'PATCH' })

      if (!response.ok) throw new Error(`Failed with ${response.status}`)

      await loadProviders()
    } catch {
      providerError = m.oryxel_settings_error_default_provider()
    } finally {
      providerBusy = false
    }
  }

  async function saveDefaultProvider() {
    if (!defaultProvider) return

    providerBusy = true
    providerError = ''
    try {
      const response = await fetch('/api/ai/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ defaultProvider }),
      })

      if (!response.ok) throw new Error(`Failed with ${response.status}`)

      await loadProviders()
    } catch {
      providerError = m.oryxel_settings_error_default_provider()
    } finally {
      providerBusy = false
    }
  }

  async function removeProvider(id: number) {
    providerBusy = true
    providerError = ''
    try {
      const response = await fetch(`/api/ai/providers/${id}`, { method: 'DELETE' })

      if (!response.ok) throw new Error(`Failed with ${response.status}`)

      await loadProviders()
    } catch {
      providerError = m.oryxel_settings_error_remove_provider()
    } finally {
      providerBusy = false
    }
  }
</script>

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
        <Button type="button" size="sm" disabled={providerBusy || !defaultProvider} onclick={saveDefaultProvider}>
          {m.oryxel_save()}
        </Button>
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
          {m.oryxel_settings_import_legacy_keys()}
        </Button>
      </div>
    {/if}
    <ul class="space-y-2">
      {#if providersLoading}
        <li class="rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted">{m.oryxel_loading()}</li>
      {:else if providers.length === 0}
        <li class="rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted">
          {m.oryxel_settings_no_providers()}
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
                  {m.oryxel_settings_set_default()}
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
                {m.oryxel_settings_get_key()}
              </button>
            </div>
          </li>
        {/each}
      {/if}
    </ul>
    <Button type="button" variant="secondary" onclick={() => (addOpen = true)}>{m.oryxel_settings_add_key()}</Button>
    {#if providerError}
      <p class="text-xs text-destructive">{providerError}</p>
    {/if}
  </Accordion.Content>
</Accordion.Item>

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
      <p class="text-xs font-semibold text-foreground">{m.oryxel_settings_provider_guide()}</p>
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
          {m.oryxel_settings_signup()}
        </button>
        <button
          type="button"
          class="oryx-transition inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted/40"
          onclick={() => openExternal(selectedGuide.keyConsoleUrl)}
        >
          {m.oryxel_settings_provider_links()}
        </button>
        <button
          type="button"
          class="oryx-transition inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted/40"
          onclick={() => openExternal(selectedGuide.docsUrl)}
        >
          {m.oryxel_settings_docs()}
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
