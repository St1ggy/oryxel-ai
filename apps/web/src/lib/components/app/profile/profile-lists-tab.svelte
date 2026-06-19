<script lang="ts">
  import ProfileListCard from '$lib/components/app/profile/profile-list-card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { UserListRow } from '@oryxel/ai'

  type Props = {
    username: string
    lists: UserListRow[]
  }

  const { username, lists }: Props = $props()
</script>

{#if lists.length === 0}
  <p class="text-sm text-foreground-muted">{m.oryxel_lists_empty()}</p>
{:else}
  <ul class="space-y-2">
    {#each lists as list (list.id)}
      <li>
        <ProfileListCard {list} {username} />
      </li>
    {/each}
  </ul>
{/if}
