<script lang="ts">
  import { Accordion } from 'bits-ui'

  import * as m from '$lib/paraglide/messages.js'

  import SettingsAiProviders from './settings-ai-providers.svelte'
  import SettingsPreferences from './settings-preferences.svelte'

  let accordionValue = $state(['theme', 'providers', 'display', 'data', 'privacy'])
</script>

<div class="mx-auto max-w-[720px] space-y-6 bg-background px-4 py-8 md:px-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_settings_title()}</h1>

  <Accordion.Root class="space-y-3" type="multiple" bind:value={accordionValue}>
    <SettingsPreferences />
    <SettingsAiProviders />
  </Accordion.Root>
</div>
