<script lang="ts">
  import SettingsAccountData from '../settings-account-data.svelte'
  import SettingsSecurity from '../settings-security.svelte'

  import type { PageData } from './$types'

  const { data }: { data: PageData } = $props()
</script>

<div class="space-y-6">
  <SettingsSecurity configured={data.configuredOAuthProviders} />
  <SettingsAccountData />
</div>
