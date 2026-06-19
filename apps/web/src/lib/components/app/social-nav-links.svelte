<script lang="ts">
  import { Bell, Compass, Rss } from '@lucide/svelte'
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import { resolve } from '$app/paths'
  import { page } from '$app/state'

  let unreadCount = $state(0)

  const path = $derived(page.url.pathname)

  async function fetchUnread() {
    try {
      const response = await fetch('/api/notifications?unread=1')

      if (response.ok) {
        const data = (await response.json()) as { count: number }

        unreadCount = data.count
      }
    } catch {
      /* ignore */
    }
  }

  onMount(() => {
    void fetchUnread()

    const interval = globalThis.setInterval(() => void fetchUnread(), 60_000)

    return () => globalThis.clearInterval(interval)
  })

  function navClass(match: string) {
    return cn('size-9 shrink-0 p-0 text-foreground-muted hover:text-accent', path.startsWith(match) && 'text-accent')
  }
</script>

<div class="flex items-center gap-0.5">
  <Button variant="ghost" size="sm" href={resolve('/feed')} class={navClass('/feed')}>
    <Rss class="size-5" />
    <span class="sr-only">{m.oryxel_nav_feed()}</span>
  </Button>
  <Button variant="ghost" size="sm" href={resolve('/discover')} class={navClass('/discover')}>
    <Compass class="size-5" />
    <span class="sr-only">{m.oryxel_nav_discover()}</span>
  </Button>
  <Button variant="ghost" size="sm" href={resolve('/notifications')} class={cn(navClass('/notifications'), 'relative')}>
    <Bell class="size-5" />
    {#if unreadCount > 0}
      <span
        class="text-accent-foreground absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold"
        aria-label={m.oryxel_social_notifications_unread_badge({ count: unreadCount })}
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    {/if}
    <span class="sr-only">{m.oryxel_nav_notifications()}</span>
  </Button>
</div>
