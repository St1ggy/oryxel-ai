<script lang="ts">
  import PostComposer from '$lib/components/app/profile/post-composer.svelte'
  import ProfilePostCard from '$lib/components/app/profile/profile-post-card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { FeedPost } from '@oryxel/ai'

  type Props = {
    posts: FeedPost[]
    isSelf: boolean
    onPostsChange?: () => void | Promise<void>
  }

  const { posts, isSelf, onPostsChange }: Props = $props()
</script>

<div class="space-y-6">
  {#if isSelf}
    <PostComposer onPosted={onPostsChange} />
  {/if}

  {#if posts.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_feed_empty()}</p>
  {:else}
    <ul class="space-y-3">
      {#each posts as post (post.id)}
        <li>
          <ProfilePostCard {post} showAuthor={false} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
