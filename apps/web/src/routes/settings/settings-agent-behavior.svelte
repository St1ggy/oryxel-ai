<script lang="ts">
  import { Accordion } from 'bits-ui'
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import { browser } from '$app/environment'

  let tone = $state('')
  let depth = $state('')
  let rememberContext = $state(true)
  let minPyramidNotes = $state('1')
  let maxPyramidNotes = $state('5')
  let minRecommendations = $state('5')
  let maxRecommendations = $state('20')
  let saveBusy = $state(false)

  let systemPromptMode = $state<'default' | 'append' | 'replace'>('default')
  let systemPromptAppend = $state('')
  let systemPromptReplace = $state('')
  let previewScenario = $state('command')
  let previewBusy = $state(false)
  let previewError = $state<string | null>(null)
  let previewSections = $state<
    { key: string; label: string; chars: number; tokensApprox: number; content: string }[]
  >([])
  let previewBuiltinFull = $state('')
  let previewResolvedFull = $state('')
  let previewTotalChars = $state(0)
  let previewTotalTokens = $state(0)
  let prefsHydrated = $state(false)

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

  const promptModeOptions = $derived([
    { value: 'default', label: m.oryxel_ai_system_prompt_mode_default() },
    { value: 'append', label: m.oryxel_ai_system_prompt_mode_append() },
    { value: 'replace', label: m.oryxel_ai_system_prompt_mode_replace() },
  ])

  const scenarioPreviewOptions = $derived([
    { value: 'command', label: 'command' },
    { value: 'recommendation', label: 'recommendation' },
    { value: 'analog', label: 'analog' },
    { value: 'pyramid', label: 'pyramid' },
    { value: 'comparison', label: 'comparison' },
    { value: 'profile_sync', label: 'profile_sync' },
  ])

  function sectionTitle(key: string): string {
    if (key === 'base') return m.oryxel_prompt_section_base()

    if (key === 'limits') return m.oryxel_prompt_section_limits()

    if (key === 'context') return m.oryxel_prompt_section_context()

    if (key === 'scenario') return m.oryxel_prompt_section_scenario()

    if (key === 'user_message') return m.oryxel_prompt_section_user_message()

    return key
  }

  let previewDebounce: ReturnType<typeof setTimeout> | undefined

  async function refreshPromptPreview() {
    if (!browser) return

    previewBusy = true
    previewError = null

    try {
      const response = await fetch('/api/ai/prompt-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenario: previewScenario,
          minPyramidNotes: Number(minPyramidNotes),
          maxPyramidNotes: Number(maxPyramidNotes),
          minRecommendations: Number(minRecommendations),
          maxRecommendations: Number(maxRecommendations),
          tone: tone || null,
          depth: depth || null,
          systemPromptMode,
          systemPromptAppend: systemPromptAppend || null,
          systemPromptReplace: systemPromptReplace || null,
        }),
      })

      if (!response.ok) {
        previewError = 'Preview failed'

        return
      }

      const data = (await response.json()) as {
        sections: typeof previewSections
        builtinFull: string
        resolvedFull: string
        totalCharsResolved: number
        totalTokensApproxResolved: number
      }

      previewSections = data.sections
      previewBuiltinFull = data.builtinFull
      previewResolvedFull = data.resolvedFull
      previewTotalChars = data.totalCharsResolved
      previewTotalTokens = data.totalTokensApproxResolved
    } catch {
      previewError = 'Preview failed'
    } finally {
      previewBusy = false
    }
  }

  function schedulePreviewRefresh() {
    if (!browser) return

    clearTimeout(previewDebounce)
    previewDebounce = setTimeout(() => {
      void refreshPromptPreview()
    }, 400)
  }

  onMount(() => {
    if (!browser) return

    void (async () => {
      try {
        const response = await fetch('/api/ai/preferences')

        if (!response.ok) return

        const data = (await response.json()) as {
          tone: string | null
          depth: string | null
          rememberContext: boolean
          minPyramidNotes: number
          maxPyramidNotes: number
          minRecommendations: number
          maxRecommendations: number
          systemPromptMode?: 'default' | 'append' | 'replace' | null
          systemPromptAppend?: string | null
          systemPromptReplace?: string | null
        }

        tone = data.tone ?? ''
        depth = data.depth ?? ''
        rememberContext = data.rememberContext
        minPyramidNotes = String(data.minPyramidNotes)
        maxPyramidNotes = String(data.maxPyramidNotes)
        minRecommendations = String(data.minRecommendations)
        maxRecommendations = String(data.maxRecommendations)
        systemPromptMode = data.systemPromptMode ?? 'default'
        systemPromptAppend = data.systemPromptAppend ?? ''
        systemPromptReplace = data.systemPromptReplace ?? ''
      } catch {
        /* ignore */
      } finally {
        prefsHydrated = true
      }

      void refreshPromptPreview()
    })()
  })

  $effect(() => {
    if (!browser || !prefsHydrated) return

    const previewDepsKey = [
      systemPromptMode,
      systemPromptAppend,
      systemPromptReplace,
      previewScenario,
      minPyramidNotes,
      maxPyramidNotes,
      minRecommendations,
      maxRecommendations,
      tone,
      depth,
    ].join('\0')

    if (previewDepsKey.length >= 0) schedulePreviewRefresh()
  })

  async function save() {
    saveBusy = true

    try {
      await fetch('/api/ai/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tone,
          depth,
          rememberContext,
          minPyramidNotes: Number(minPyramidNotes),
          maxPyramidNotes: Number(maxPyramidNotes),
          minRecommendations: Number(minRecommendations),
          maxRecommendations: Number(maxRecommendations),
          systemPromptMode,
          systemPromptAppend,
          systemPromptReplace,
        }),
      })
      void refreshPromptPreview()
    } catch {
      /* ignore */
    } finally {
      saveBusy = false
    }
  }
</script>

<Accordion.Item value="behavior" class="rounded-xl border border-border bg-surface">
  <Accordion.Header>
    <Accordion.Trigger
      class="oryx-transition flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted/30"
    >
      {m.oryxel_ai_section()}
    </Accordion.Trigger>
  </Accordion.Header>
  <Accordion.Content class="border-t border-border px-4 py-4">
    <Card class="space-y-6 p-4">
      <div class="space-y-4">
        <div>
          <Label for="agent-tone">{m.oryxel_ai_tone()}</Label>
          <Input id="agent-tone" class="mt-1" bind:value={tone} />
        </div>
        <div>
          <Label for="agent-depth">{m.oryxel_ai_depth()}</Label>
          <Input id="agent-depth" class="mt-1" bind:value={depth} />
        </div>
        <SwitchField bind:checked={rememberContext} label={m.oryxel_remember_context()} id="agent-remember" />
      </div>

      <div class="border-t border-border pt-4">
        <h4 class="mb-3 text-xs font-semibold tracking-wide text-foreground-muted uppercase">
          {m.oryxel_settings_display()}
        </h4>
        <div class="space-y-4">
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
        </div>
      </div>

      <div class="border-t border-border pt-4">
        <h4 class="mb-2 text-sm font-semibold text-foreground">{m.oryxel_ai_system_prompt_block()}</h4>
        <p class="mb-4 text-xs text-foreground-muted">{m.oryxel_ai_system_prompt_intro()}</p>

        <div class="mb-4 flex flex-wrap items-end gap-3">
          <div class="min-w-[160px] flex-1">
            <Label class="text-xs">{m.oryxel_ai_system_prompt_scenario_sample()}</Label>
            <Select bind:value={previewScenario} options={scenarioPreviewOptions} class="mt-1 w-full" />
          </div>
          <div class="text-xs text-foreground-muted">
            {#if previewBusy}
              {m.oryxel_ai_system_prompt_refreshing()}
            {:else if previewError}
              {previewError}
            {:else}
              {m.oryxel_ai_system_prompt_total()}: {previewTotalChars} {m.oryxel_ai_system_prompt_chars()} / ~
              {previewTotalTokens}
              {m.oryxel_ai_system_prompt_tokens()}
            {/if}
          </div>
        </div>

        <div class="mb-4 overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[320px] text-left text-xs">
            <thead class="bg-muted/40 text-foreground-muted">
              <tr>
                <th class="px-2 py-2 font-medium">{m.oryxel_ai_system_prompt_map()}</th>
                <th class="px-2 py-2 font-medium">{m.oryxel_ai_system_prompt_chars()}</th>
                <th class="px-2 py-2 font-medium">{m.oryxel_ai_system_prompt_tokens()}</th>
              </tr>
            </thead>
            <tbody>
              {#each previewSections as row (row.key)}
                <tr class="border-t border-border">
                  <td class="px-2 py-1.5 align-top">{sectionTitle(row.key)}</td>
                  <td class="px-2 py-1.5 tabular-nums">{row.chars}</td>
                  <td class="px-2 py-1.5 tabular-nums">~{row.tokensApprox}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="space-y-3">
          <div>
            <Label for="prompt-mode">{m.oryxel_ai_system_prompt_mode()}</Label>
            <Select
              id="prompt-mode"
              class="mt-1 w-full max-w-md"
              bind:value={systemPromptMode}
              options={promptModeOptions}
            />
          </div>

          {#if systemPromptMode === 'append'}
            <div>
              <Label for="prompt-append">{m.oryxel_ai_system_prompt_append_label()}</Label>
              <Textarea id="prompt-append" class="mt-1 min-h-[100px] font-mono text-xs" bind:value={systemPromptAppend} />
            </div>
          {/if}

          {#if systemPromptMode === 'replace'}
            <p class="text-xs text-amber-700 dark:text-amber-400">{m.oryxel_ai_system_prompt_replace_warn()}</p>
            <div>
              <Label for="prompt-replace">{m.oryxel_ai_system_prompt_replace_label()}</Label>
              <Textarea
                id="prompt-replace"
                class="mt-1 min-h-[180px] font-mono text-xs"
                bind:value={systemPromptReplace}
              />
            </div>
          {/if}
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label class="text-xs font-medium">{m.oryxel_ai_system_prompt_preview_builtin()}</Label>
            <pre
              class="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-muted/20 p-2 text-[11px] leading-snug whitespace-pre-wrap font-mono text-foreground-muted"
              >{previewBuiltinFull}</pre
            >
          </div>
          <div>
            <Label class="text-xs font-medium">{m.oryxel_ai_system_prompt_preview_resolved()}</Label>
            <pre
              class="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-muted/20 p-2 text-[11px] leading-snug whitespace-pre-wrap font-mono"
              >{previewResolvedFull}</pre
            >
          </div>
        </div>
      </div>

      <Button type="button" size="sm" disabled={saveBusy} onclick={save}>{m.oryxel_save()}</Button>
    </Card>
  </Accordion.Content>
</Accordion.Item>
