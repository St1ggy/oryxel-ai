<script lang="ts">
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { Visibility } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  type FeedPost = {
    id: number
    authorUsername: string | null
    authorDisplayName: string | null
    body: string
    visibility: Visibility
    createdAt: string
  }

  let posts = $state<FeedPost[]>([])
  let draft = $state('')
  let posting = $state(false)
  let loading = $state(true)

  async function loadFeed() {
    loading = true

    try {
      const response = await fetch('/api/feed')

      if (response.ok) {
        const data = (await response.json()) as { posts: FeedPost[] }

        posts = data.posts
      }
    } finally {
      loading = false
    }
  }

  async function publish() {
    const body = draft.trim()

    if (!body) return

    posting = true

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })

      if (response.ok) {
        draft = ''
        await loadFeed()
      }
    } finally {
      posting = false
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString()
  }

  onMount(() => {
    void loadFeed()
  })
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_social_feed_title()}</h1>

  <Card class="space-y-3 p-4">
    <Textarea bind:value={draft} rows={3} placeholder={m.oryxel_feed_compose_placeholder()} />
    <Button disabled={posting || !draft.trim()} onclick={() => void publish()}>{m.oryxel_feed_post()}</Button>
  </Card>

  {#if loading}
    <p class="text-sm text-foreground-muted">{m.oryxel_loading()}</p>
  {:else if posts.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_feed_empty()}</p>
  {:else}
    <ul class="space-y-3">
      {#each posts as post (post.id)}
        <li>
          <Card class="space-y-2 p-4">
            <div class="flex flex-wrap items-baseline gap-2 text-sm">
              {#if post.authorUsername}
                <a href={resolve(`/u/${post.authorUsername}`)} class="font-medium hover:text-accent">
                  @{post.authorUsername}
                </a>
              {/if}
              {#if post.authorDisplayName}
                <span class="text-foreground-muted">{post.authorDisplayName}</span>
              {/if}
              <time class="text-xs text-foreground-muted">{formatDate(post.createdAt)}</time>
            </div>
            <p class="text-sm whitespace-pre-wrap">{post.body}</p>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</div>
