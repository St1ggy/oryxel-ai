<script lang="ts">
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import { resolve } from '$app/paths'

  let displayName = $state('')
  let bio = $state('')
  let tone = $state('')
  let depth = $state('')
  let rememberContext = $state(true)
  let gender = $state<string>('__none__')

  const genderOptions = $derived([
    { value: '__none__', label: m.oryxel_gender_not_specified() },
    { value: 'male', label: m.oryxel_gender_male() },
    { value: 'female', label: m.oryxel_gender_female() },
  ])

  onMount(async () => {
    try {
      const [profileResponse, aiPrefsResponse] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/ai/preferences'),
      ])

      if (profileResponse.ok) {
        const data = (await profileResponse.json()) as {
          gender: string | null
          displayName: string | null
          bio: string | null
        }

        gender = data.gender ?? '__none__'
        displayName = data.displayName ?? ''
        bio = data.bio ?? ''
      }

      if (aiPrefsResponse.ok) {
        const data = (await aiPrefsResponse.json()) as {
          tone: string | null
          depth: string | null
          rememberContext: boolean
        }

        tone = data.tone ?? ''
        depth = data.depth ?? ''
        rememberContext = data.rememberContext
      }
    } catch {
      /* ignore */
    }
  })

  async function save() {
    await Promise.all([
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: gender === '__none__' ? null : gender, displayName, bio }),
      }),
      fetch('/api/ai/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, depth, rememberContext }),
      }),
    ])
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
      <Label for="gender">{m.oryxel_profile_gender()}</Label>
      <Select id="gender" class="mt-1 w-full" bind:value={gender} options={genderOptions} />
    </div>
  </Card>

  <Card class="space-y-4 p-6">
    <h3 class="oryx-heading text-lg font-medium">{m.oryxel_ai_section()}</h3>
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
    <Button variant="secondary" href={resolve('/diary?view=profile')}>{m.oryxel_cancel()}</Button>
  </div>
</div>
