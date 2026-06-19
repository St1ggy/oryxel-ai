<script lang="ts">
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { visibilitySelectOptions } from '$lib/social/visibility-label'

  import type { NotificationType, Visibility } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  let defaultListVisibility = $state<Visibility>('private')
  let defaultPostVisibility = $state<Visibility>('followers')
  let showDiaryStats = $state(false)
  let notificationPrefs = $state<{ type: NotificationType; enabled: boolean }[]>([
    { type: 'new_post', enabled: true },
    { type: 'new_follower', enabled: true },
    { type: 'new_list', enabled: true },
  ])

  const visibilityOptions = $derived(visibilitySelectOptions())

  function notificationLabel(type: NotificationType) {
    switch (type) {
      case 'new_post': {
        return m.oryxel_notification_type_new_post()
      }

      case 'new_follower': {
        return m.oryxel_notification_type_new_follower()
      }

      case 'new_list': {
        return m.oryxel_notification_type_new_list()
      }
    }
  }

  onMount(async () => {
    const [profileResponse, prefsResponse] = await Promise.all([
      fetch('/api/profile'),
      fetch('/api/notification-preferences'),
    ])

    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as {
        defaultListVisibility: Visibility
        defaultPostVisibility: Visibility
        showDiaryStats: boolean
      }

      defaultListVisibility = profile.defaultListVisibility
      defaultPostVisibility = profile.defaultPostVisibility
      showDiaryStats = profile.showDiaryStats
    }

    if (prefsResponse.ok) {
      const data = (await prefsResponse.json()) as {
        preferences: { type: NotificationType; enabled: boolean }[]
      }

      for (const pref of data.preferences) {
        const row = notificationPrefs.find((entry) => entry.type === pref.type)

        if (row) row.enabled = pref.enabled
      }
    }
  })

  async function saveProfile() {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultListVisibility,
        defaultPostVisibility,
        showDiaryStats,
      }),
    })
  }

  async function toggleNotification(type: NotificationType, enabled: boolean) {
    const row = notificationPrefs.find((entry) => entry.type === type)

    if (row) row.enabled = enabled

    await fetch('/api/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, enabled }),
    })
  }
</script>

<div class="space-y-8">
  <h2 class="oryx-heading text-xl font-medium tracking-tight">{m.oryxel_settings_social_title()}</h2>

  <Card class="space-y-4 p-6">
    <div>
      <Label>{m.oryxel_settings_social_default_list_visibility()}</Label>
      <Select class="mt-1 w-full" bind:value={defaultListVisibility} options={visibilityOptions} />
    </div>
    <div>
      <Label>{m.oryxel_settings_social_default_post_visibility()}</Label>
      <Select class="mt-1 w-full" bind:value={defaultPostVisibility} options={visibilityOptions} />
    </div>
    <SwitchField
      id="show-diary-stats"
      bind:checked={showDiaryStats}
      label={m.oryxel_settings_social_show_diary_stats()}
    />
  </Card>

  <Card class="space-y-4 p-6">
    <h3 class="text-sm font-medium">{m.oryxel_settings_social_notification_prefs()}</h3>
    {#each notificationPrefs as pref (pref.type)}
      <SwitchField
        id={`notify-${pref.type}`}
        checked={pref.enabled}
        onCheckedChange={(enabled) => void toggleNotification(pref.type, enabled)}
        label={notificationLabel(pref.type)}
      />
    {/each}
  </Card>

  <div class="flex flex-wrap gap-2">
    <Button onclick={() => void saveProfile()}>{m.oryxel_save()}</Button>
    <Button variant="secondary" href={resolve('/lists')}>{m.oryxel_nav_lists()}</Button>
  </div>
</div>
