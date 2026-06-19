<script lang="ts">
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { NotificationType } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  type NotificationRow = {
    id: number
    type: NotificationType
    actorUsername: string | null
    actorDisplayName: string | null
    payload: Record<string, unknown> | null
    readAt: string | null
    createdAt: string
  }

  let notifications = $state<NotificationRow[]>([])
  let loading = $state(true)

  function typeLabel(type: NotificationType) {
    switch (type) {
      case 'new_post': {
        return m.oryxel_notification_type_new_post()
      }

      case 'new_follower': {
        return m.oryxel_notification_type_new_follower()
      }

      case 'new_list': {
        return m.oryxel_notification_type_new_list()
      }
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString()
  }

  async function loadNotifications() {
    loading = true

    try {
      const response = await fetch('/api/notifications')

      if (response.ok) {
        const data = (await response.json()) as { notifications: NotificationRow[] }

        notifications = data.notifications
      }
    } finally {
      loading = false
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    await loadNotifications()
  }

  onMount(() => {
    void loadNotifications()
  })
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_social_notifications_title()}</h1>
    {#if notifications.some((n) => !n.readAt)}
      <Button variant="secondary" onclick={() => void markAllRead()}>{m.oryxel_social_notifications_mark_read()}</Button
      >
    {/if}
  </div>

  {#if loading}
    <p class="text-sm text-foreground-muted">{m.oryxel_loading()}</p>
  {:else if notifications.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_social_notifications_empty()}</p>
  {:else}
    <ul class="space-y-2">
      {#each notifications as notification (notification.id)}
        <li>
          <Card class={notification.readAt ? 'p-4 opacity-70' : 'border-accent/30 p-4'}>
            <p class="text-sm font-medium">{typeLabel(notification.type)}</p>
            {#if notification.actorUsername}
              <a href={resolve(`/u/${notification.actorUsername}`)} class="text-sm text-accent hover:underline">
                @{notification.actorUsername}
              </a>
            {/if}
            {#if notification.actorDisplayName}
              <span class="text-sm text-foreground-muted"> — {notification.actorDisplayName}</span>
            {/if}
            <time class="mt-1 block text-xs text-foreground-muted">{formatDate(notification.createdAt)}</time>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</div>
