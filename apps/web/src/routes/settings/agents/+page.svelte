<script lang="ts">
  import { Accordion } from 'bits-ui'

  import SettingsAgentBehavior from '../settings-agent-behavior.svelte'
  import SettingsAiProviders from '../settings-ai-providers.svelte'
</script>

<div class="space-y-4">
  <Accordion.Root class="space-y-3" type="multiple" value={['providers', 'behavior']}>
    <SettingsAiProviders />
    <SettingsAgentBehavior />
  </Accordion.Root>
</div>
