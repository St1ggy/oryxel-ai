<script lang="ts">
  import { Accordion } from 'bits-ui'
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
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
        }

        tone = data.tone ?? ''
        depth = data.depth ?? ''
        rememberContext = data.rememberContext
        minPyramidNotes = String(data.minPyramidNotes)
        maxPyramidNotes = String(data.maxPyramidNotes)
        minRecommendations = String(data.minRecommendations)
        maxRecommendations = String(data.maxRecommendations)
      } catch {
        /* ignore */
      }
    })()
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
        }),
      })
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

      <Button type="button" size="sm" disabled={saveBusy} onclick={save}>{m.oryxel_save()}</Button>
    </Card>
  </Accordion.Content>
</Accordion.Item>
