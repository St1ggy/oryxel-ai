<script lang="ts">
  import { Accordion } from 'bits-ui'
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import { browser } from '$app/environment'

  let tone = $state('')
  let depth = $state('')
  let rememberContext = $state(true)
  let saveBusy = $state(false)

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
        }

        tone = data.tone ?? ''
        depth = data.depth ?? ''
        rememberContext = data.rememberContext
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
        body: JSON.stringify({ tone, depth, rememberContext }),
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
    <Card class="space-y-4 p-4">
      <div>
        <Label for="agent-tone">{m.oryxel_ai_tone()}</Label>
        <Input id="agent-tone" class="mt-1" bind:value={tone} />
      </div>
      <div>
        <Label for="agent-depth">{m.oryxel_ai_depth()}</Label>
        <Input id="agent-depth" class="mt-1" bind:value={depth} />
      </div>
      <SwitchField bind:checked={rememberContext} label={m.oryxel_remember_context()} id="agent-remember" />
      <Button type="button" size="sm" disabled={saveBusy} onclick={save}>{m.oryxel_save()}</Button>
    </Card>
  </Accordion.Content>
</Accordion.Item>
