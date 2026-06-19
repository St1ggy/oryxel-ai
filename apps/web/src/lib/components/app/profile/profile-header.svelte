<script lang="ts">
  import ProfileAvatar from '$lib/components/app/profile/profile-avatar.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { PublicProfile } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  type Props = {
    profile: PublicProfile
    isSelf: boolean
    viewerId: string | null
    onFollowToggle?: () => void | Promise<void>
    onOpenFollowers?: () => void
    onOpenFollowing?: () => void
    onNewPost?: () => void
  }

  const {
    profile,
    isSelf,
    viewerId,
    onFollowToggle,
    onOpenFollowers,
    onOpenFollowing,
    onNewPost,
  }: Props = $props()
</script>

<header class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
    <ProfileAvatar
      displayName={profile.displayName}
      username={profile.username}
      src={profile.avatarUrl}
      size="lg"
      class="size-20 shrink-0 sm:size-24"
    />
    <div class="min-w-0 flex-1 space-y-2">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="oryx-heading text-2xl font-medium tracking-tight">
            {profile.displayName ?? `@${profile.username}`}
          </h1>
          <p class="text-sm text-foreground-muted">@{profile.username}</p>
        </div>
        {#if viewerId && !isSelf}
          <Button
            variant={profile.isFollowing ? 'secondary' : 'primary'}
            onclick={() => void onFollowToggle?.()}
          >
            {profile.isFollowing ? m.oryxel_public_profile_unfollow() : m.oryxel_public_profile_follow()}
          </Button>
        {/if}
      </div>

      {#if profile.bio}
        <p class="text-sm whitespace-pre-wrap">{profile.bio}</p>
      {/if}

      <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-muted">
        <button
          type="button"
          class={cn('hover:text-foreground', profile.followerCount > 0 && 'cursor-pointer')}
          disabled={profile.followerCount === 0}
          onclick={() => onOpenFollowers?.()}
        >
          {m.oryxel_public_profile_followers({ count: profile.followerCount })}
        </button>
        <button
          type="button"
          class={cn('hover:text-foreground', profile.followingCount > 0 && 'cursor-pointer')}
          disabled={profile.followingCount === 0}
          onclick={() => onOpenFollowing?.()}
        >
          {m.oryxel_public_profile_following({ count: profile.followingCount })}
        </button>
        {#if profile.totalCount !== null}
          <span>{m.oryxel_public_profile_fragrances({ count: profile.totalCount })}</span>
        {/if}
      </div>
    </div>
  </div>

  {#if isSelf}
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" href={resolve('/settings/profile')}>{m.oryxel_profile_edit()}</Button>
      <Button variant="secondary" onclick={() => onNewPost?.()}>{m.oryxel_profile_new_post()}</Button>
    </div>
  {/if}
</header>
