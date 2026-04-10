<script lang="ts">
  import { Sparkles, User } from '@lucide/svelte'

  import { PROVIDER_DISPLAY_NAME } from '$lib/ai/provider-guides'
  import * as m from '$lib/paraglide/messages.js'

  import type { ActivityEntry } from '$lib/types/diary'

  type Props = {
    entries: ActivityEntry[]
  }

  const { entries }: Props = $props()

  const INITIAL_VISIBLE = 5

  let showAll = $state(false)

  const visible = $derived(showAll ? entries : entries.slice(0, INITIAL_VISIBLE))
  const hasMore = $derived(entries.length > INITIAL_VISIBLE)

  function relativeTime(date: Date): string {
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)

    if (minutes < 1) return '< 1 min'

    if (minutes < 60) return `${minutes} min`

    if (hours < 24) return `${hours} h`

    if (days < 30) return `${days} d`

    return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  }

  function providerLabel(provider: string | null): string {
    if (!provider) return ''

    return PROVIDER_DISPLAY_NAME[provider as keyof typeof PROVIDER_DISPLAY_NAME] ?? provider
  }
</script>

{#if entries.length === 0}
  <p class="py-4 text-center text-sm text-foreground-muted">{m.oryxel_activity_empty()}</p>
{:else}
  <ul class="divide-y divide-border">
    {#each visible as entry (entry.id)}
      <li class="flex items-start gap-3 py-3">
        <div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          {#if entry.actor === 'agent'}
            <Sparkles class="size-3.5 text-accent" />
          {:else}
            <User class="size-3.5 text-foreground-muted" />
          {/if}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm leading-snug text-foreground">{entry.summary}</p>
          <p class="mt-0.5 flex items-center gap-1.5 text-xs text-foreground-muted">
            {#if entry.actor === 'agent'}
              <span class="font-medium text-accent">{m.oryxel_activity_actor_ai()}</span>
              {#if entry.provider}
                <span>·</span>
                <span>{providerLabel(entry.provider)}</span>
              {/if}
            {:else}
              <span>{m.oryxel_activity_actor_you()}</span>
            {/if}
            <span>·</span>
            <time datetime={new Date(entry.createdAt).toISOString()}>{relativeTime(entry.createdAt)}</time>
          </p>
        </div>
      </li>
    {/each}
  </ul>
  {#if hasMore && !showAll}
    <button
      type="button"
      class="mt-1 w-full py-2 text-xs font-medium text-foreground-muted hover:text-foreground"
      onclick={() => (showAll = true)}
    >
      {m.oryxel_activity_show_all()} ({entries.length - INITIAL_VISIBLE})
    </button>
  {/if}
{/if}
