<script lang="ts">
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  const AI_KEY = 'oryxel:ai-personalization'

  let displayName = $state('Alex Rivers')
  let bio = $state('Quiet luxury, tactile woods, and skin-close musks.')
  let tone = $state('Warm, concise')
  let depth = $state('Balanced')
  let rememberContext = $state(true)

  onMount(() => {
    if (!browser) {
      return
    }

    const raw = localStorage.getItem(AI_KEY)

    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as {
        tone?: string
        depth?: string
        rememberContext?: boolean
      }

      if (parsed.tone) {
        tone = parsed.tone
      }

      if (parsed.depth) {
        depth = parsed.depth
      }

      if (typeof parsed.rememberContext === 'boolean') {
        rememberContext = parsed.rememberContext
      }
    } catch {
      /* ignore */
    }
  })

  function save() {
    if (browser) {
      localStorage.setItem(
        AI_KEY,
        JSON.stringify({
          tone,
          depth,
          rememberContext,
        }),
      )
    }
  }
</script>

<div class="mx-auto max-w-[640px] space-y-8 bg-background px-4 py-8 md:px-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_edit_title()}</h1>

  <Card class="space-y-4 p-6">
    <div>
      <Label for="dn">{m.oryxel_display_name()}</Label>
      <Input id="dn" class="mt-1" bind:value={displayName} />
    </div>
    <div>
      <Label for="bio">{m.oryxel_bio()}</Label>
      <Textarea id="bio" class="mt-1" bind:value={bio} />
    </div>
  </Card>

  <Card class="space-y-4 p-6">
    <h2 class="oryx-heading text-lg font-medium">{m.oryxel_ai_section()}</h2>
    <div>
      <Label for="tone">{m.oryxel_ai_tone()}</Label>
      <Input id="tone" class="mt-1" bind:value={tone} />
    </div>
    <div>
      <Label for="depth">{m.oryxel_ai_depth()}</Label>
      <Input id="depth" class="mt-1" bind:value={depth} />
    </div>
    <SwitchField bind:checked={rememberContext} label={m.oryxel_remember_context()} id="remember" />
  </Card>

  <div class="flex flex-wrap gap-2">
    <Button onclick={save}>{m.oryxel_save()}</Button>
    <Button variant="secondary" href="/profile">{m.oryxel_cancel()}</Button>
  </div>
</div>
