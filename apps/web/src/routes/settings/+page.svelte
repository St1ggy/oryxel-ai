<script lang="ts">
  import { LogOut } from '@lucide/svelte'
  import { Accordion } from 'bits-ui'

  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import SettingsAiProviders from './settings-ai-providers.svelte'
  import SettingsPreferences from './settings-preferences.svelte'

  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  let accordionValue = $state(['theme', 'providers', 'display', 'data', 'privacy'])

  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    await goto(resolve('/'))
  }
</script>

<div class="mx-auto max-w-[720px] space-y-6 bg-background px-4 py-8 md:px-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_settings_title()}</h1>

  <Accordion.Root class="space-y-3" type="multiple" bind:value={accordionValue}>
    <SettingsPreferences />
    <SettingsAiProviders />
  </Accordion.Root>

  <div class="pt-2">
    <Button
      variant="ghost"
      class="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
      onclick={signOut}
    >
      <LogOut class="size-4" />
      {m.oryxel_signout()}
    </Button>
  </div>
</div>
