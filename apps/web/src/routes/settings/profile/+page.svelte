<script lang="ts">
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import { resolve } from '$app/paths'

  let displayName = $state('')
  let bio = $state('')
  let preferences = $state('')
  let gender = $state<string>('__none__')

  const genderOptions = $derived([
    { value: '__none__', label: m.oryxel_gender_not_specified() },
    { value: 'male', label: m.oryxel_gender_male() },
    { value: 'female', label: m.oryxel_gender_female() },
  ])

  onMount(async () => {
    try {
      const profileResponse = await fetch('/api/profile')

      if (profileResponse.ok) {
        const data = (await profileResponse.json()) as {
          gender: string | null
          displayName: string | null
          bio: string | null
          preferences: string | null
        }

        gender = data.gender ?? '__none__'
        displayName = data.displayName ?? ''
        bio = data.bio ?? ''
        preferences = data.preferences ?? ''
      }
    } catch {
      /* ignore */
    }
  })

  async function save() {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gender: gender === '__none__' ? null : gender,
        displayName,
        bio,
        preferences,
      }),
    })
  }
</script>

<div class="space-y-8">
  <h2 class="oryx-heading text-xl font-medium tracking-tight">{m.oryxel_settings_nav_profile()}</h2>

  <Card class="space-y-4 p-6">
    <div>
      <Label for="dn">{m.oryxel_display_name()}</Label>
      <Input id="dn" class="mt-1" bind:value={displayName} />
    </div>
    <div>
      <Label for="bio">{m.oryxel_bio()}</Label>
      <Textarea id="bio" class="mt-1" bind:value={bio} />
    </div>
    <div>
      <Label for="preferences">{m.oryxel_profile_preferences()}</Label>
      <p class="mt-1 text-sm text-foreground-muted">{m.oryxel_profile_preferences_hint()}</p>
      <Textarea id="preferences" class="mt-2" bind:value={preferences} rows={5} />
    </div>
    <div>
      <Label for="gender">{m.oryxel_profile_gender()}</Label>
      <Select id="gender" class="mt-1 w-full" bind:value={gender} options={genderOptions} />
    </div>
  </Card>

  <div class="flex flex-wrap gap-2">
    <Button onclick={save}>{m.oryxel_save()}</Button>
    <Button variant="secondary" href={resolve('/diary?view=profile')}>{m.oryxel_cancel()}</Button>
  </div>
</div>
