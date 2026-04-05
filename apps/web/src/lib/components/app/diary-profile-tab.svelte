<script lang="ts">
  import { Activity, ChevronDown, ChevronRight, Heart, Sparkles } from '@lucide/svelte'

  import ActivityLog from '$lib/components/app/activity-log.svelte'
  import DiaryHeaderControls from '$lib/components/app/diary-header-controls.svelte'
  import RadarChart from '$lib/components/app/radar-chart.svelte'
  import Avatar from '$lib/components/ui/avatar.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { ActivityEntry, RadarAxis } from '$lib/types/diary'

  type DiaryCounts = { owned: number; to_try: number; liked: number; neutral: number; disliked: number }

  import { resolve } from '$app/paths'

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
    recentActivity?: ActivityEntry[]
    diaryCounts?: DiaryCounts
  }

  const { variant, profile, onProfileSync, recentActivity = [], diaryCounts }: Props = $props()
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

  const isMobile = $derived(variant === 'mobile')
  let activityOpen = $state(false)
  let countOpen = $state(false)
</script>

<div class="flex flex-col gap-5">
  {#if isMobile}
    <!-- Mobile header: stacked layout -->
    <div class="rounded-[20px] border border-border bg-surface px-5 py-5 shadow-sm">
      <div class="flex items-center gap-3">
        <Avatar alt={m.oryxel_profile_default_user()} size="md" class="size-14 shrink-0" />
        <div class="min-w-0 flex-1">
          <h1 class="oryx-heading truncate text-xl font-semibold tracking-tight text-foreground">
            {safeProfile.displayName}
          </h1>
          <p class="mt-0.5 flex items-center gap-2 text-sm font-medium text-foreground-muted">
            <span class="inline-block size-2 shrink-0 rounded-full bg-(--oryx-online)"></span>
            {m.oryxel_profile_online()}
          </p>
        </div>
        <div class="shrink-0">
          <DiaryHeaderControls />
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        {#if onProfileSync}
          <Button
            variant="secondary"
            class="h-9 flex-1 rounded-full border-subtle bg-subtle text-sm font-semibold shadow-sm"
            onclick={onProfileSync}
          >
            {m.oryxel_profile_sync()}
          </Button>
        {/if}
        <Button
          variant="secondary"
          class="h-9 flex-1 rounded-full border-subtle bg-subtle text-sm font-semibold shadow-sm"
          href={resolve('/profile/edit')}
        >
          {m.oryxel_profile_edit()}
        </Button>
      </div>
    </div>
  {:else}
    <!-- Desktop header: side-by-side layout -->
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
  {/if}

  <!-- Radar + stats card -->
  <div
    class={isMobile
      ? 'rounded-[20px] border border-border bg-surface px-5 pt-5 pb-2 shadow-sm'
      : 'rounded-[24px] border border-border bg-surface px-[33px] pt-[33px] pb-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'}
  >
    <h3
      class={isMobile
        ? 'oryx-heading mb-4 text-base font-semibold text-foreground'
        : 'oryx-heading mb-6 text-lg font-semibold text-foreground'}
    >
      {m.oryxel_radar_title()}
    </h3>
    <div class="flex justify-center py-4">
      <RadarChart axes={safeProfile.radarAxes} size={isMobile ? 240 : 300} />
    </div>
    <div class="mt-4 mb-2 divide-y divide-border">
      <div class="py-1">
        <button
          type="button"
          class="oryx-transition flex w-full items-center gap-3 rounded-md py-2 hover:bg-muted/50"
          onclick={() => (countOpen = !countOpen)}
          aria-expanded={countOpen}
        >
          <Activity class="size-4 shrink-0 text-foreground-muted" />
          <span class="text-sm text-foreground-muted">{m.oryxel_stat_total()}</span>
          <span class="ml-auto text-sm font-semibold text-foreground">{safeProfile.totalCount}</span>
          {#if diaryCounts}
            <ChevronDown
              class={cn('size-3.5 shrink-0 text-foreground-muted transition-transform', countOpen && 'rotate-180')}
            />
          {/if}
        </button>
        {#if countOpen && diaryCounts}
          <div class="ml-7 space-y-1.5 pr-[26px] pb-2 text-xs text-foreground-muted">
            <div class="flex justify-between">
              <span>{m.oryxel_tab_collection()}</span><span class="font-medium text-foreground tabular-nums"
                >{diaryCounts.owned}</span
              >
            </div>
            <div class="flex justify-between">
              <span>{m.oryxel_tab_liked()}</span><span class="font-medium text-foreground tabular-nums"
                >{diaryCounts.liked}</span
              >
            </div>
            <div class="flex justify-between">
              <span>{m.oryxel_tab_neutral()}</span><span class="font-medium text-foreground tabular-nums"
                >{diaryCounts.neutral}</span
              >
            </div>
            <div class="flex justify-between">
              <span>{m.oryxel_tab_disliked()}</span><span class="font-medium text-foreground tabular-nums"
                >{diaryCounts.disliked}</span
              >
            </div>
            <div class="flex justify-between">
              <span>{m.oryxel_tab_try()}</span><span class="font-medium text-foreground tabular-nums"
                >{diaryCounts.to_try}</span
              >
            </div>
          </div>
        {/if}
      </div>
      <div class="flex items-center gap-3 py-3">
        <Heart class="size-4 shrink-0 text-foreground-muted" />
        <span class="text-sm text-foreground-muted">{m.oryxel_stat_note()}</span>
        <span class="ml-auto text-sm font-semibold text-foreground"
          >{safeProfile.favoriteNote ?? m.oryxel_common_empty()}</span
        >
      </div>
      <div class="flex items-center gap-3 py-3">
        <Sparkles class="size-4 shrink-0 text-foreground-muted" />
        <span class="text-sm text-foreground-muted">{m.oryxel_stat_archetype()}</span>
        <span class="ml-auto text-sm font-semibold text-foreground"
          >{safeProfile.archetype ?? m.oryxel_common_empty()}</span
        >
      </div>
    </div>
  </div>

  <!-- Activity log (collapsible) -->
  <div
    class={isMobile
      ? 'rounded-[20px] border border-border bg-surface shadow-sm'
      : 'rounded-[24px] border border-border bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'}
  >
    <button
      type="button"
      class="flex w-full items-center justify-between px-5 py-4"
      onclick={() => (activityOpen = !activityOpen)}
      aria-expanded={activityOpen}
    >
      <h3
        class={isMobile
          ? 'oryx-heading text-base font-semibold text-foreground'
          : 'oryx-heading text-lg font-semibold text-foreground'}
      >
        {m.oryxel_activity_title()}
      </h3>
      <ChevronRight class={cn('size-4 text-foreground-muted transition-transform', activityOpen && 'rotate-90')} />
    </button>
    {#if activityOpen}
      <div class="px-5 pb-4">
        <ActivityLog entries={recentActivity} />
      </div>
    {/if}
  </div>
</div>
