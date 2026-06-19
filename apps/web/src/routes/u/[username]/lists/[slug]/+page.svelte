<script lang="ts">
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { visibilityLabel } from '$lib/social/visibility-label'

  import type { PageData } from './$types'

  import { resolve } from '$app/paths'

  const { data }: { data: PageData } = $props()
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
  <header class="space-y-2">
    <a href={resolve(`/u/${data.profile.username}`)} class="text-sm text-accent hover:underline">
      @{data.profile.username}
    </a>
    <h1 class="oryx-heading text-2xl font-medium tracking-tight">{data.list.title}</h1>
    {#if data.list.description}
      <p class="text-sm text-foreground-muted">{data.list.description}</p>
    {/if}
    <p class="text-xs text-foreground-muted">
      {visibilityLabel(data.list.visibility)} · {m.oryxel_list_item_count({ count: data.items.length })}
    </p>
  </header>

  {#if data.items.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_lists_empty()}</p>
  {:else}
    <ul class="space-y-2">
      {#each data.items as item (item.id)}
        <li>
          <Card class="p-4">
            <p class="font-medium">{item.brandName} — {item.fragranceName}</p>
            {#if item.note}
              <p class="mt-1 text-sm text-foreground-muted">{item.note}</p>
            {/if}
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</div>
