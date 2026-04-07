<script lang="ts">
  import { Accordion } from 'bits-ui'

  import SettingsPreferences from '../settings-preferences.svelte'
</script>

<div class="space-y-4">
  <Accordion.Root class="space-y-3" type="multiple" value={['theme', 'privacy']}>
    <SettingsPreferences />
  </Accordion.Root>
</div>
