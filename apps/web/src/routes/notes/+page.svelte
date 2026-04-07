<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'

  import type { NoteRelationship, NoteRelationshipSentiment } from '$lib/types/diary'
  import type { PageData } from './$types'

  const { data }: { data: PageData } = $props()

  let relationships = $state<NoteRelationship[]>([])

  $effect(() => {
    void Promise.resolve(data.noteRelationships).then((rows) => {
      relationships = [...rows]
    })
  })
  let editingLabel = $state<string | null>(null)
  let editingValue = $state('')

  const sentimentOptions: NoteRelationshipSentiment[] = ['love', 'like', 'neutral', 'dislike', 'redflag']

  function sentimentLabel(s: NoteRelationshipSentiment): string {
    switch (s) {
      case 'love': {
        return m.oryxel_notes_sentiment_love()
      }

      case 'like': {
        return m.oryxel_notes_sentiment_like()
      }

      case 'neutral': {
        return m.oryxel_notes_sentiment_neutral()
      }

      case 'dislike': {
        return m.oryxel_notes_sentiment_dislike()
      }

      case 'redflag': {
        return m.oryxel_notes_sentiment_redflag()
      }
    }
  }

  function sentimentColor(s: NoteRelationshipSentiment): string {
    switch (s) {
      case 'love': {
        return 'bg-accent/20 text-accent border-accent/30'
      }

      case 'like': {
        return 'bg-success/15 text-success border-success/30'
      }

      case 'neutral': {
        return 'bg-muted text-foreground-muted border-border'
      }

      case 'dislike': {
        return 'bg-warning/15 text-warning border-warning/30'
      }

      case 'redflag': {
        return 'bg-destructive/15 text-destructive border-destructive/30'
      }
    }
  }

  async function patchNote(note: string, updates: { sentiment?: NoteRelationshipSentiment; label?: string }) {
    const index = relationships.findIndex((r) => r.note === note)

    if (index !== -1) {
      relationships[index] = { ...relationships[index], ...updates }
    }

    await fetch('/api/profile/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, ...updates }),
    })
  }

  function startEditLabel(r: NoteRelationship) {
    editingLabel = r.note
    editingValue = r.label
  }

  async function commitLabel(note: string) {
    if (editingLabel !== note) return

    await patchNote(note, { label: editingValue })
    editingLabel = null
  }

  function onLabelKeydown(event: KeyboardEvent, note: string) {
    if (event.key === 'Enter') void commitLabel(note)

    if (event.key === 'Escape') editingLabel = null
  }
</script>

<div class="mx-auto max-w-[720px] space-y-6 px-4 py-8 md:px-8">
  <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_notes_title()}</h1>

  {#if relationships.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_notes_empty()}</p>
  {:else}
    <div class="overflow-x-auto rounded-xl border border-border bg-surface">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-xs text-foreground-muted">
            <th class="px-4 py-3 font-medium">{m.oryxel_notes_col_note()}</th>
            <th class="px-4 py-3 font-medium">{m.oryxel_notes_col_sentiment()}</th>
            <th class="px-4 py-3 font-medium">{m.oryxel_notes_col_label()}</th>
          </tr>
        </thead>
        <tbody>
          {#each relationships as r (r.note)}
            <tr class="border-b border-border/50 last:border-0 hover:bg-muted/20">
              <td class="px-4 py-3 font-mono text-xs text-foreground">{r.note}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  {#each sentimentOptions as s (s)}
                    <button
                      type="button"
                      class="oryx-transition rounded-full border px-2 py-0.5 text-xs font-medium {s === r.sentiment
                        ? sentimentColor(s)
                        : 'border-border bg-transparent text-foreground-muted hover:bg-muted'}"
                      onclick={() => patchNote(r.note, { sentiment: s })}
                    >
                      {sentimentLabel(s)}
                    </button>
                  {/each}
                </div>
              </td>
              <td class="px-4 py-3">
                {#if editingLabel === r.note}
                  <input
                    class="oryx-input w-full rounded-md px-2 py-1 text-sm"
                    bind:value={editingValue}
                    onblur={() => commitLabel(r.note)}
                    onkeydown={(event) => onLabelKeydown(event, r.note)}
                  />
                {:else}
                  <button
                    type="button"
                    class="oryx-transition w-full rounded-md px-2 py-1 text-left hover:bg-muted"
                    onclick={() => startEditLabel(r)}
                  >
                    {r.label}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
