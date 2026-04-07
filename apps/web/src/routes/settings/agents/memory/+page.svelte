<script lang="ts">
  import { AGENT_MEMORY_MAX_ROWS } from '@oryxel/ai'
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  type Row = { id: number; content: string; createdAt: string; updatedAt: string }

  let items = $state<Row[]>([])
  let draft = $state('')
  let editingId = $state<number | null>(null)
  let editText = $state('')
  let busy = $state(false)
  let errorText = $state<string | null>(null)

  async function loadItems() {
    errorText = null

    try {
      const response = await fetch('/api/agent/memory')

      if (!response.ok) {
        throw new Error('load')
      }

      const data = (await response.json()) as { items: Row[] }

      items = data.items
    } catch {
      errorText = m.oryxel_agent_memory_load_error()
    }
  }

  onMount(() => {
    void loadItems()
  })

  async function addItem() {
    const text = draft.trim()

    if (!text) {
      return
    }

    busy = true
    errorText = null

    try {
      const response = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (!response.ok) {
        throw new Error('save')
      }

      draft = ''
      await loadItems()
    } catch {
      errorText = m.oryxel_agent_memory_save_error()
    } finally {
      busy = false
    }
  }

  function startEdit(row: Row) {
    editingId = row.id
    editText = row.content
  }

  function cancelEdit() {
    editingId = null
    editText = ''
  }

  async function saveEdit() {
    if (editingId == null) {
      return
    }

    const text = editText.trim()

    if (!text) {
      return
    }

    busy = true
    errorText = null

    try {
      const response = await fetch(`/api/agent/memory/${editingId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (!response.ok) {
        throw new Error('patch')
      }

      cancelEdit()
      await loadItems()
    } catch {
      errorText = m.oryxel_agent_memory_save_error()
    } finally {
      busy = false
    }
  }

  async function remove(id: number) {
    busy = true
    errorText = null

    try {
      const response = await fetch(`/api/agent/memory/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('delete')
      }

      await loadItems()
    } catch {
      errorText = m.oryxel_agent_memory_delete_error()
    } finally {
      busy = false
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="oryx-heading text-xl font-medium tracking-tight">{m.oryxel_agent_memory_title()}</h2>
    <p class="mt-2 text-sm text-foreground-muted">
      {m.oryxel_agent_memory_hint({ max: String(AGENT_MEMORY_MAX_ROWS) })}
    </p>
  </div>

  {#if errorText}
    <p class="text-sm text-destructive">{errorText}</p>
  {/if}

  <Card class="space-y-3 p-6">
    <Label for="mem-new">{m.oryxel_agent_memory_new()}</Label>
    <Textarea id="mem-new" class="mt-1 min-h-[88px]" bind:value={draft} maxlength={500} />
    <Button
      type="button"
      size="sm"
      disabled={busy || !draft.trim() || items.length >= AGENT_MEMORY_MAX_ROWS}
      onclick={addItem}
    >
      {m.oryxel_agent_memory_add()}
    </Button>
    {#if items.length >= AGENT_MEMORY_MAX_ROWS}
      <p class="text-xs text-foreground-muted">{m.oryxel_agent_memory_limit({ max: String(AGENT_MEMORY_MAX_ROWS) })}</p>
    {/if}
  </Card>

  <div class="space-y-3">
    {#if items.length === 0}
      <p class="text-sm text-foreground-muted">{m.oryxel_agent_memory_empty()}</p>
    {:else}
      {#each items as row (row.id)}
        <Card class="space-y-3 p-4">
          {#if editingId === row.id}
            <Textarea class="min-h-[88px]" bind:value={editText} maxlength={500} />
            <div class="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy} onclick={saveEdit}>{m.oryxel_save()}</Button>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onclick={cancelEdit}>
                {m.oryxel_cancel()}
              </Button>
            </div>
          {:else}
            <p class="text-sm whitespace-pre-wrap">{row.content}</p>
            <div class="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={busy} onclick={() => startEdit(row)}>
                {m.oryxel_agent_memory_edit()}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="text-destructive"
                disabled={busy}
                onclick={() => remove(row.id)}
              >
                {m.oryxel_agent_memory_delete()}
              </Button>
            </div>
          {/if}
        </Card>
      {/each}
    {/if}
  </div>
</div>
