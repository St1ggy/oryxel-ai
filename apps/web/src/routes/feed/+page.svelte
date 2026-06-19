<script lang="ts">
  import { onMount } from 'svelte'

  import PostComposer from '$lib/components/app/profile/post-composer.svelte'
  import ProfilePostCard from '$lib/components/app/profile/profile-post-card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { FeedPost } from '@oryxel/ai'

  type FeedPostView = FeedPost & { createdAt: string }

  let posts = $state<FeedPostView[]>([])
  let loading = $state(true)

  async function loadFeed() {
    loading = true

    try {
      const response = await fetch('/api/feed')

      if (response.ok) {
        const data = (await response.json()) as { posts: FeedPostView[] }

        posts = data.posts
      }
    } finally {
      loading = false
    }
  }

  onMount(() => {
    void loadFeed()
  })
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_social_feed_title()}</h1>

  <PostComposer onPosted={loadFeed} />

  {#if loading}
    <p class="text-sm text-foreground-muted">{m.oryxel_loading()}</p>
  {:else if posts.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_feed_empty()}</p>
  {:else}
    <ul class="space-y-3">
      {#each posts as post (post.id)}
        <li>
          <ProfilePostCard {post} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
