<script lang="ts">
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import { resolve } from '$app/paths'

  type Tab = 'fragrances' | 'users'

  type FragranceHit = {
    fragranceId: number
    brandName: string
    fragranceName: string
    notesSummary: string | null
  }

  type UserHit = {
    userId: string
    username: string
    displayName: string | null
    bio: string | null
  }

  let tab = $state<Tab>('fragrances')
  let query = $state('')
  let fragranceResults = $state<FragranceHit[]>([])
  let userResults = $state<UserHit[]>([])
  let searching = $state(false)

  async function runSearch(activeTab: Tab, searchQuery: string) {
    const q = searchQuery.trim()

    if (q.length < 2) {
      fragranceResults = []
      userResults = []

      return
    }

    searching = true

    try {
      if (activeTab === 'fragrances') {
        const response = await fetch(`/api/search/fragrances?q=${encodeURIComponent(q)}&limit=24`)

        if (response.ok) {
          const data = (await response.json()) as { results: FragranceHit[] }

          fragranceResults = data.results
        }
      } else {
        const response = await fetch(`/api/search/users?q=${encodeURIComponent(q)}`)

        if (response.ok) {
          const data = (await response.json()) as { results: UserHit[] }

          userResults = data.results
        }
      }
    } finally {
      searching = false
    }
  }

  $effect(() => {
    const handle = globalThis.setTimeout(() => {
      runSearch(tab, query).catch(() => {
        /* ignore */
      })
    }, 300)

    return () => globalThis.clearTimeout(handle)
  })
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_social_discover_title()}</h1>

  <div class="flex gap-2">
    <button
      type="button"
      class={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
        tab === 'fragrances'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground-muted hover:text-foreground',
      )}
      onclick={() => (tab = 'fragrances')}
    >
      {m.oryxel_discover_tab_fragrances()}
    </button>
    <button
      type="button"
      class={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
        tab === 'users' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted hover:text-foreground',
      )}
      onclick={() => (tab = 'users')}
    >
      {m.oryxel_discover_tab_users()}
    </button>
  </div>

  <Input
    bind:value={query}
    placeholder={tab === 'fragrances'
      ? m.oryxel_discover_search_placeholder_fragrances()
      : m.oryxel_discover_search_placeholder_users()}
  />

  {#if searching}
    <p class="text-sm text-foreground-muted">{m.oryxel_loading()}</p>
  {:else if tab === 'fragrances'}
    {#if query.trim().length >= 2 && fragranceResults.length === 0}
      <p class="text-sm text-foreground-muted">{m.oryxel_discover_no_results()}</p>
    {:else}
      <ul class="space-y-2">
        {#each fragranceResults as hit (hit.fragranceId)}
          <li>
            <Card class="p-4">
              <p class="font-medium">{hit.brandName} — {hit.fragranceName}</p>
              {#if hit.notesSummary}
                <p class="mt-1 text-sm text-foreground-muted">{hit.notesSummary}</p>
              {/if}
            </Card>
          </li>
        {/each}
      </ul>
    {/if}
  {:else if query.trim().length >= 2 && userResults.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_discover_no_results()}</p>
  {:else}
    <ul class="space-y-2">
      {#each userResults as user (user.userId)}
        <li>
          <a
            href={resolve(`/u/${user.username}`)}
            class="block rounded-xl border border-border bg-surface p-4 hover:bg-muted/40"
          >
            <p class="font-medium">@{user.username}</p>
            {#if user.displayName}
              <p class="text-sm text-foreground-muted">{user.displayName}</p>
            {/if}
            {#if user.bio}
              <p class="mt-1 line-clamp-2 text-sm text-foreground-muted">{user.bio}</p>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
