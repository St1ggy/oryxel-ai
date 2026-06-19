<script lang="ts">
  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { PageData } from './$types'

  import { invalidateAll } from '$app/navigation'
  import { resolve } from '$app/paths'

  const { data }: { data: PageData } = $props()

  const profile = $derived(data.profile)
  const isSelf = $derived(data.viewerId === profile.userId)

  async function toggleFollow() {
    if (!data.viewerId || isSelf) return

    const method = profile.isFollowing ? 'DELETE' : 'POST'

    await fetch(`/api/users/${profile.username}/follow`, { method })
    await invalidateAll()
  }
</script>

<div class="mx-auto w-full max-w-2xl space-y-8 p-4 md:p-8">
  <header class="space-y-3">
    <h1 class="oryx-heading text-2xl font-medium tracking-tight">
      {profile.displayName ?? `@${profile.username}`}
    </h1>
    <p class="text-sm text-foreground-muted">@{profile.username}</p>
    {#if profile.bio}
      <p class="text-sm">{profile.bio}</p>
    {/if}
    <div class="flex flex-wrap gap-4 text-sm text-foreground-muted">
      <span>{m.oryxel_public_profile_followers({ count: profile.followerCount })}</span>
      <span>{m.oryxel_public_profile_following({ count: profile.followingCount })}</span>
      {#if profile.totalCount !== null}
        <span>{m.oryxel_public_profile_fragrances({ count: profile.totalCount })}</span>
      {/if}
    </div>
    {#if profile.archetype}
      <p class="text-sm text-foreground-muted">{profile.archetype}</p>
    {/if}
    {#if data.viewerId && !isSelf}
      <Button variant={profile.isFollowing ? 'secondary' : 'primary'} onclick={() => void toggleFollow()}>
        {profile.isFollowing ? m.oryxel_public_profile_unfollow() : m.oryxel_public_profile_follow()}
      </Button>
    {/if}
  </header>

  <section class="space-y-3">
    <h2 class="text-lg font-medium">{m.oryxel_public_profile_lists()}</h2>
    {#if data.lists.length === 0}
      <p class="text-sm text-foreground-muted">{m.oryxel_lists_empty()}</p>
    {:else}
      <ul class="space-y-2">
        {#each data.lists as list (list.id)}
          <li>
            <a
              href={resolve(`/u/${profile.username}/lists/${list.slug}`)}
              class="block rounded-xl border border-border bg-surface p-4 hover:bg-muted/40"
            >
              <p class="font-medium">{list.title}</p>
              {#if list.description}
                <p class="mt-1 text-sm text-foreground-muted">{list.description}</p>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="space-y-3">
    <h2 class="text-lg font-medium">{m.oryxel_public_profile_posts()}</h2>
    {#if data.posts.length === 0}
      <p class="text-sm text-foreground-muted">{m.oryxel_feed_empty()}</p>
    {:else}
      <ul class="space-y-2">
        {#each data.posts as post (post.id)}
          <li>
            <Card class="p-4">
              <p class="text-sm whitespace-pre-wrap">{post.body}</p>
            </Card>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
