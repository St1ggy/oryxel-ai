<script lang="ts">
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { PublicDiaryStats, PublicProfile } from '@oryxel/ai'

  type Props = {
    profile: PublicProfile
    stats: PublicDiaryStats | null
  }

  const { profile, stats }: Props = $props()
</script>

<div class="space-y-4">
  {#if profile.bio}
    <Card class="space-y-2 p-4">
      <h2 class="text-sm font-medium">{m.oryxel_profile_about_bio()}</h2>
      <p class="text-sm whitespace-pre-wrap">{profile.bio}</p>
    </Card>
  {/if}

  {#if stats}
    <Card class="space-y-3 p-4">
      <h2 class="text-sm font-medium">{m.oryxel_profile_about_scent()}</h2>
      {#if stats.archetype}
        <p class="text-sm">
          <span class="text-foreground-muted">{m.oryxel_stat_archetype()}:</span>
          {stats.archetype}
        </p>
      {/if}
      {#if stats.favoriteNote}
        <p class="text-sm">
          <span class="text-foreground-muted">{m.oryxel_stat_note()}:</span>
          {stats.favoriteNote}
        </p>
      {/if}
    </Card>
  {:else if !profile.bio}
    <p class="text-sm text-foreground-muted">{m.oryxel_profile_stats_hidden()}</p>
  {/if}
</div>
