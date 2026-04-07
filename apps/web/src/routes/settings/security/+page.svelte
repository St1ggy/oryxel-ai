<script lang="ts">
  import SettingsSecurity from '../settings-security.svelte'

  import type { PageData } from './$types'

  const { data }: { data: PageData } = $props()
</script>

<SettingsSecurity configured={data.configuredOAuthProviders} />
