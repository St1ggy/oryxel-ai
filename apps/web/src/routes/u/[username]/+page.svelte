<script lang="ts">
  import FollowListSheet from '$lib/components/app/profile/follow-list-sheet.svelte'
  import ProfileAboutTab from '$lib/components/app/profile/profile-about-tab.svelte'
  import ProfileHeader from '$lib/components/app/profile/profile-header.svelte'
  import ProfileListsTab from '$lib/components/app/profile/profile-lists-tab.svelte'
  import ProfileOverviewTab from '$lib/components/app/profile/profile-overview-tab.svelte'
  import ProfilePostsTab from '$lib/components/app/profile/profile-posts-tab.svelte'
  import ProfileTabs, { type ProfileTab } from '$lib/components/app/profile/profile-tabs.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { PageData } from './$types'

  import { goto, invalidateAll } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'

  const { data }: { data: PageData } = $props()

  const profile = $derived(data.profile)
  const isSelf = $derived(data.viewerId === profile.userId)

  function parseTab(value: string | null): ProfileTab {
    if (value === 'posts' || value === 'lists' || value === 'about') return value

    return 'overview'
  }

  const activeTab = $derived(parseTab(page.url.searchParams.get('tab')))

  let followersOpen = $state(false)
  let followingOpen = $state(false)

  function setTab(next: ProfileTab) {
    void goto(
      next === 'overview'
        ? resolve(`/u/${profile.username}`)
        : resolve(`/u/${profile.username}?tab=${next}`),
      { replaceState: true, keepFocus: true },
    )
  }

  async function toggleFollow() {
    if (!data.viewerId || isSelf) return

    const method = profile.isFollowing ? 'DELETE' : 'POST'

    await fetch(`/api/users/${profile.username}/follow`, { method })
    await invalidateAll()
  }

  async function refreshPosts() {
    await invalidateAll()
  }
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
  <ProfileHeader
    {profile}
    {isSelf}
    viewerId={data.viewerId}
    onFollowToggle={toggleFollow}
    onOpenFollowers={() => (followersOpen = true)}
    onOpenFollowing={() => (followingOpen = true)}
    onNewPost={() => setTab('posts')}
  />

  <ProfileTabs {activeTab} onTabChange={setTab} />

  {#if activeTab === 'overview'}
    <ProfileOverviewTab
      username={profile.username}
      stats={data.stats}
      posts={data.posts}
      lists={data.lists}
      onSeeAllPosts={() => setTab('posts')}
      onSeeAllLists={() => setTab('lists')}
    />
  {:else if activeTab === 'posts'}
    <ProfilePostsTab posts={data.posts} {isSelf} onPostsChange={refreshPosts} />
  {:else if activeTab === 'lists'}
    <ProfileListsTab username={profile.username} lists={data.lists} />
  {:else}
    <ProfileAboutTab {profile} stats={data.stats} />
  {/if}
</div>

<FollowListSheet
  bind:open={followersOpen}
  username={profile.username}
  direction="followers"
  title={m.oryxel_profile_followers_title({ count: profile.followerCount })}
/>

<FollowListSheet
  bind:open={followingOpen}
  username={profile.username}
  direction="following"
  title={m.oryxel_profile_following_title({ count: profile.followingCount })}
/>
