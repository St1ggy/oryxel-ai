<script lang="ts">
  import { onMount } from 'svelte'

  import ListVisibilitySelect from '$lib/components/app/list-visibility-select.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { visibilityLabel, visibilitySelectOptions } from '$lib/social/visibility-label'

  import type { Visibility } from '@oryxel/ai'

  import { resolve } from '$app/paths'

  type UserList = {
    id: number
    slug: string
    title: string
    description: string | null
    visibility: Visibility
    itemCount?: number
  }

  let lists = $state<UserList[]>([])
  let username = $state<string | null>(null)
  let showCreate = $state(false)
  let newTitle = $state('')
  let newDescription = $state('')
  let newVisibility = $state<Visibility>('private')
  let loading = $state(true)

  const visibilityOptions = $derived(visibilitySelectOptions())

  async function loadLists() {
    loading = true

    try {
      const [listsResponse, profileResponse] = await Promise.all([fetch('/api/lists'), fetch('/api/profile')])

      if (listsResponse.ok) {
        const data = (await listsResponse.json()) as { lists: UserList[] }

        lists = data.lists
      }

      if (profileResponse.ok) {
        const profile = (await profileResponse.json()) as { username: string | null }

        username = profile.username
      }
    } finally {
      loading = false
    }
  }

  async function createList() {
    if (!newTitle.trim()) return

    const response = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        visibility: newVisibility,
      }),
    })

    if (response.ok) {
      newTitle = ''
      newDescription = ''
      newVisibility = 'private'
      showCreate = false
      await loadLists()
    }
  }

  onMount(() => {
    void loadLists()
  })
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_social_lists_title()}</h1>
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" href={resolve('/diary?view=chat')}>{m.oryxel_lists_create_with_agent()}</Button>
      <Button onclick={() => (showCreate = !showCreate)}>{m.oryxel_lists_create()}</Button>
    </div>
  </div>

  {#if showCreate}
    <Card class="space-y-4 p-6">
      <h2 class="text-lg font-medium">{m.oryxel_lists_create_title()}</h2>
      <div>
        <Label for="list-title">{m.oryxel_lists_create_title()}</Label>
        <Input id="list-title" class="mt-1" bind:value={newTitle} />
      </div>
      <div>
        <Label for="list-desc">{m.oryxel_bio()}</Label>
        <Textarea id="list-desc" class="mt-1" bind:value={newDescription} rows={3} />
      </div>
      <div>
        <Label for="list-vis">{m.oryxel_lists_visibility()}</Label>
        <Select id="list-vis" class="mt-1 w-full" bind:value={newVisibility} options={visibilityOptions} />
      </div>
      <Button onclick={() => void createList()}>{m.oryxel_save()}</Button>
    </Card>
  {/if}

  {#if loading}
    <p class="text-sm text-foreground-muted">{m.oryxel_loading()}</p>
  {:else if lists.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_lists_empty()}</p>
  {:else}
    <ul class="space-y-3">
      {#each lists as list (list.id)}
        <li>
          <Card class="space-y-3 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                {#if username}
                  <a href={resolve(`/u/${username}/lists/${list.slug}`)} class="font-medium hover:text-accent">
                    {list.title}
                  </a>
                {:else}
                  <p class="font-medium">{list.title}</p>
                {/if}
                {#if list.description}
                  <p class="mt-1 text-sm text-foreground-muted">{list.description}</p>
                {/if}
                <p class="mt-1 text-xs text-foreground-muted">
                  {m.oryxel_list_item_count({ count: list.itemCount ?? 0 })}
                </p>
              </div>
              <ListVisibilitySelect listId={list.id} visibility={list.visibility} onUpdated={loadLists} />
            </div>
            <p class="text-xs text-foreground-muted">{visibilityLabel(list.visibility)}</p>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</div>
