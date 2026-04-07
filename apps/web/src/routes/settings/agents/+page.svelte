<script lang="ts">
  import { Accordion } from 'bits-ui'

  import SettingsAiProviders from '../settings-ai-providers.svelte'
</script>

<div class="space-y-4">
  <Accordion.Root class="space-y-3" type="multiple" value={['providers', 'data']}>
    <SettingsAiProviders />
  </Accordion.Root>
</div>
