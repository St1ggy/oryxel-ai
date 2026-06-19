<script lang="ts">
  import ProfileAvatar from '$lib/components/app/profile/profile-avatar.svelte'
  import Modal from '$lib/components/ui/modal.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { FollowProfileHit } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  type Props = {
    open?: boolean
    username: string
    direction: 'followers' | 'following'
    title: string
  }

  let { open = $bindable(false), username, direction, title }: Props = $props()

  let profiles = $state<FollowProfileHit[]>([])
  let loading = $state(false)
  let nextCursor = $state<number | null>(null)

  async function loadProfiles(reset = false) {
    loading = true

    try {
      let url = `/api/users/${username}/${direction}?limit=30`

      if (!reset && nextCursor) {
        url += `&cursor=${nextCursor}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        if (reset) profiles = []

        return
      }

      const data = (await response.json()) as { profiles: FollowProfileHit[]; nextCursor: number | null }

      profiles = reset ? data.profiles : [...profiles, ...data.profiles]
      nextCursor = data.nextCursor
    } finally {
      loading = false
    }
  }

  $effect(() => {
    if (!open) {
      profiles = []
      nextCursor = null

      return
    }

    void loadProfiles(true)
  })
</script>

<Modal bind:open {title} surfaceClass="w-[min(100%-2rem,32rem)]">
  {#if loading && profiles.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_loading()}</p>
  {:else if profiles.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_profile_follow_list_empty()}</p>
  {:else}
    <ul class="space-y-2">
      {#each profiles as profile (profile.userId)}
        <li>
          <a
            href={resolve(`/u/${profile.username}`)}
            class="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/40"
            onclick={() => (open = false)}
          >
            <ProfileAvatar
              displayName={profile.displayName}
              username={profile.username}
              src={profile.avatarUrl}
              size="sm"
            />
            <div class="min-w-0">
              <p class="truncate font-medium">@{profile.username}</p>
              {#if profile.displayName}
                <p class="truncate text-sm text-foreground-muted">{profile.displayName}</p>
              {/if}
            </div>
          </a>
        </li>
      {/each}
    </ul>
    {#if nextCursor}
      <button
        type="button"
        class="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40 disabled:opacity-50"
        disabled={loading}
        onclick={() => void loadProfiles(false)}
      >
        {loading ? m.oryxel_loading() : m.oryxel_profile_see_all()}
      </button>
    {/if}
  {/if}
</Modal>
