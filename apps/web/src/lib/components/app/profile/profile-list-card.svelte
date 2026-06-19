<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'
  import { visibilityLabel } from '$lib/social/visibility-label'
  import { cn } from '$lib/utils/cn'

  import type { UserListRow } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  type Props = {
    list: UserListRow
    username: string
    compact?: boolean
  }

  const { list, username, compact = false }: Props = $props()
</script>

<a
  href={resolve(`/u/${username}/lists/${list.slug}`)}
  class={cn(
    'block rounded-xl border border-border bg-surface hover:bg-muted/40',
    compact ? 'p-3' : 'p-4',
  )}
>
  <div class="flex flex-wrap items-start justify-between gap-2">
    <p class="font-medium">{list.title}</p>
    <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground-muted">
      {visibilityLabel(list.visibility)}
    </span>
  </div>
  {#if list.description}
    <p class="mt-1 text-sm text-foreground-muted">{list.description}</p>
  {/if}
  <p class="mt-2 text-xs text-foreground-muted">
    {m.oryxel_list_item_count({ count: list.itemCount ?? 0 })}
  </p>
</a>
