<script lang="ts">
  import { resolve } from '$app/paths'

  import ProfileStatCard from '$lib/components/app/profile-stat-card.svelte'
  import RadarChart from '$lib/components/app/radar-chart.svelte'
  import ActivityIcon from '$lib/components/icons/ActivityIcon.svelte'
  import HeartIcon from '$lib/components/icons/HeartIcon.svelte'
  import SparklesIcon from '$lib/components/icons/SparklesIcon.svelte'
  import Avatar from '$lib/components/ui/avatar.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { RadarAxis } from '$lib/types/diary'

  type ProfileData = {
    displayName: string
    totalCount: number
    favoriteNote: string | null
    archetype: string | null
    radarAxes: RadarAxis[]
    suggestions: string[]
  }

  type Props = {
    variant: 'desktop' | 'mobile'
    profile?: ProfileData
    onProfileSync?: () => void
  }

  const { variant, profile, onProfileSync }: Props = $props()
  const safeProfile = $derived<ProfileData>(
    profile ?? {
      displayName: m.oryxel_profile_default_user(),
      totalCount: 0,
      favoriteNote: null,
      archetype: null,
      radarAxes: [],
      suggestions: [],
    },
  )
</script>

<div class="flex flex-col gap-8">
  <div
    class="flex items-center justify-between rounded-[24px] border border-border bg-surface px-[25px] py-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
  >
    <div class="flex items-center gap-6">
      <Avatar alt={m.oryxel_profile_default_user()} size="lg" class="size-20" />
      <div class="flex flex-col gap-1">
        <h1 class="oryx-heading text-2xl font-semibold tracking-tight text-foreground">{safeProfile.displayName}</h1>
        <p class="flex items-center gap-2 text-base font-medium text-foreground-muted">
          <span class="inline-block size-2 rounded-full bg-(--oryx-online)"></span>
          {m.oryxel_profile_online()}
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      {#if onProfileSync}
        <Button
          variant="secondary"
          class="h-[42px] rounded-full border-subtle bg-subtle px-5 text-sm font-semibold shadow-sm"
          onclick={onProfileSync}
        >
          {m.oryxel_profile_sync()}
        </Button>
      {/if}
      <Button
        variant="secondary"
        class="h-[42px] rounded-full border-subtle bg-subtle px-5 text-sm font-semibold shadow-sm"
        href={resolve('/profile/edit')}
      >
        {m.oryxel_profile_edit()}
      </Button>
    </div>
  </div>

  <div class={variant === 'desktop' ? 'grid grid-cols-3 gap-6' : 'grid grid-cols-1 gap-4'}>
    <ProfileStatCard label={m.oryxel_stat_total()} value={String(safeProfile.totalCount)}>
      {#snippet icon()}
        <ActivityIcon class="size-6" />
      {/snippet}
    </ProfileStatCard>
    <ProfileStatCard label={m.oryxel_stat_note()} value={safeProfile.favoriteNote ?? m.oryxel_common_empty()}>
      {#snippet icon()}
        <HeartIcon class="size-6" />
      {/snippet}
    </ProfileStatCard>
    <ProfileStatCard label={m.oryxel_stat_archetype()} value={safeProfile.archetype ?? m.oryxel_common_empty()}>
      {#snippet icon()}
        <SparklesIcon class="size-6" />
      {/snippet}
    </ProfileStatCard>
  </div>

  <div
    class="rounded-[24px] border border-border bg-surface px-[33px] pt-[33px] pb-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
  >
    <h3 class="oryx-heading mb-6 text-lg font-semibold text-foreground">{m.oryxel_radar_title()}</h3>
    <div class="flex justify-center py-4">
      <RadarChart axes={safeProfile.radarAxes} size={300} />
    </div>
  </div>
</div>
