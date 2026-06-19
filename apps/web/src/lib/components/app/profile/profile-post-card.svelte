<script lang="ts">
  import ProfileAvatar from '$lib/components/app/profile/profile-avatar.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import { visibilityLabel } from '$lib/social/visibility-label'

  import type { FeedPost } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  type Props = {
    post: FeedPost
    showAuthor?: boolean
  }

  const { post, showAuthor = true }: Props = $props()

  function formatDate(value: Date | string) {
    return new Date(value).toLocaleString()
  }
</script>

<Card class="space-y-2 p-4">
  {#if showAuthor}
    <div class="flex items-start gap-3">
      <ProfileAvatar
        displayName={post.authorDisplayName}
        username={post.authorUsername ?? ''}
        size="sm"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline gap-2 text-sm">
          {#if post.authorUsername}
            <a href={resolve(`/u/${post.authorUsername}`)} class="font-medium hover:text-accent">
              @{post.authorUsername}
            </a>
          {/if}
          {#if post.authorDisplayName}
            <span class="text-foreground-muted">{post.authorDisplayName}</span>
          {/if}
        </div>
        <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          <time>{formatDate(post.createdAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{visibilityLabel(post.visibility)}</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
      <time>{formatDate(post.createdAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{visibilityLabel(post.visibility)}</span>
    </div>
  {/if}
  <p class="text-sm whitespace-pre-wrap">{post.body}</p>
</Card>
