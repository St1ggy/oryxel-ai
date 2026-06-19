<script lang="ts">
  import ProfileListCard from '$lib/components/app/profile/profile-list-card.svelte'
  import ProfilePostCard from '$lib/components/app/profile/profile-post-card.svelte'
  import RadarChart from '$lib/components/app/radar-chart.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { FeedPost, PublicDiaryStats, UserListRow } from '@oryxel/ai'

  type Props = {
    username: string
    stats: PublicDiaryStats | null
    posts: FeedPost[]
    lists: UserListRow[]
    onSeeAllPosts?: () => void
    onSeeAllLists?: () => void
  }

  const { username, stats, posts, lists, onSeeAllPosts, onSeeAllLists }: Props = $props()

  const previewPosts = $derived(posts.slice(0, 3))
  const previewLists = $derived(lists.slice(0, 3))
</script>

<div class="space-y-8">
  {#if stats}
    <section class="space-y-4">
      <Card class="space-y-4 p-4 md:p-6">
        {#if stats.archetype}
          <div>
            <p class="text-xs font-medium tracking-wide text-foreground-muted uppercase">
              {m.oryxel_stat_archetype()}
            </p>
            <p class="mt-1 text-sm">{stats.archetype}</p>
          </div>
        {/if}
        {#if stats.favoriteNote}
          <div>
            <p class="text-xs font-medium tracking-wide text-foreground-muted uppercase">
              {m.oryxel_stat_note()}
            </p>
            <p class="mt-1 text-sm">{stats.favoriteNote}</p>
          </div>
        {/if}
        {#if stats.radarAxes.length > 0}
          <div class="flex justify-center py-2">
            <RadarChart axes={stats.radarAxes} size={280} />
          </div>
        {/if}
        <div class="flex flex-wrap gap-3 text-sm text-foreground-muted">
          <span>{m.oryxel_tab_collection()}: {stats.diaryCounts.owned}</span>
          <span>{m.oryxel_tab_try()}: {stats.diaryCounts.to_try}</span>
          <span>{m.oryxel_tab_liked()}: {stats.diaryCounts.liked}</span>
          <span>{m.oryxel_tab_neutral()}: {stats.diaryCounts.neutral}</span>
          <span>{m.oryxel_tab_disliked()}: {stats.diaryCounts.disliked}</span>
        </div>
      </Card>
    </section>
  {/if}

  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-medium">{m.oryxel_public_profile_posts()}</h2>
      {#if posts.length > previewPosts.length}
        <Button variant="ghost" size="sm" onclick={() => onSeeAllPosts?.()}>{m.oryxel_profile_see_all()}</Button>
      {/if}
    </div>
    {#if previewPosts.length === 0}
      <p class="text-sm text-foreground-muted">{m.oryxel_feed_empty()}</p>
    {:else}
      <ul class="space-y-3">
        {#each previewPosts as post (post.id)}
          <li>
            <ProfilePostCard {post} showAuthor={false} />
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-medium">{m.oryxel_public_profile_lists()}</h2>
      {#if lists.length > previewLists.length}
        <Button variant="ghost" size="sm" onclick={() => onSeeAllLists?.()}>{m.oryxel_profile_see_all()}</Button>
      {/if}
    </div>
    {#if previewLists.length === 0}
      <p class="text-sm text-foreground-muted">{m.oryxel_lists_empty()}</p>
    {:else}
      <ul class="space-y-2">
        {#each previewLists as list (list.id)}
          <li>
            <ProfileListCard {list} {username} compact />
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
