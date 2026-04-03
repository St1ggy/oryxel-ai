<script lang="ts">
  import ProfileStatCard from '$lib/components/app/profile-stat-card.svelte'
  import RadarChart from '$lib/components/app/radar-chart.svelte'
  import PencilIcon from '$lib/components/icons/PencilIcon.svelte'
  import Avatar from '$lib/components/ui/avatar.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { PageData } from './$types'

  const { data }: { data: PageData } = $props()
</script>

<div class="mx-auto max-w-[960px] space-y-8 bg-background px-4 py-8 md:px-8">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <Avatar alt={data.displayName} size="lg" />
      <div>
        <h1 class="oryx-heading text-2xl font-medium tracking-tight">{data.displayName}</h1>
        <p class="mt-1 max-w-md text-sm text-foreground-muted">{data.bio}</p>
      </div>
    </div>
    <Button href="/profile/edit" variant="secondary">
      <PencilIcon class="size-4" />
      {m.oryxel_profile_edit()}
    </Button>
  </header>

  <div class="grid gap-4 md:grid-cols-3">
    <ProfileStatCard label={m.oryxel_stat_total()} value={String(data.totalCount)} />
    <ProfileStatCard label={m.oryxel_stat_note()} value={data.favoriteNote ?? m.oryxel_common_empty()} />
    <ProfileStatCard label={m.oryxel_stat_archetype()} value={data.archetype ?? m.oryxel_common_empty()} />
  </div>

  <div class="flex justify-center">
    <Card class="flex w-full max-w-lg flex-col items-center p-6">
      <h2 class="oryx-heading mb-4 text-sm font-medium tracking-wide text-foreground-muted uppercase">
        {m.oryxel_radar_title()}
      </h2>
      <RadarChart axes={data.radarAxes} />
    </Card>
  </div>
</div>
