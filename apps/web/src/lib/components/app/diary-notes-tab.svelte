<script lang="ts">
  import {
    AlertTriangle,
    ChevronDown,
    Heart,
    LayoutList,
    Lock,
    Minus,
    Network,
    ThumbsDown,
    ThumbsUp,
  } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'
  import { onMount, untrack } from 'svelte'

  import NoteFragrancesModal from '$lib/components/app/note-fragrances-modal.svelte'
  import NoteGraph from '$lib/components/app/note-graph.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { buildNoteGraph } from '$lib/utils/note-graph'

  import type { DiaryData, NoteRelationship, NoteRelationshipSentiment } from '$lib/types/diary'
  import type { FamilyDefinition, NoteNode } from '$lib/utils/note-graph'

  type Props = {
    diaryData: DiaryData
    noteRelationships: NoteRelationship[]
    layout: 'desktop' | 'mobile'
  }

  let { diaryData, noteRelationships, layout }: Props = $props()

  let lastNoteRelationshipsRef: NoteRelationship[] | null = null
  let localNotes = $state<NoteRelationship[]>(untrack(() => [...noteRelationships]))
  let notesViewMode = $state<'list' | 'graph'>('list')
  let graphModalOpen = $state(false)
  let graphModalNode = $state<NoteNode | null>(null)
  let databaseFamilies = $state<FamilyDefinition[] | undefined>()

  const noteGraph = $derived(buildNoteGraph(diaryData, localNotes, databaseFamilies))

  onMount(async () => {
    try {
      const response = await fetch('/api/note-families')

      if (response.ok) {
        const data = (await response.json()) as {
          name: string
          color: string
          keywords: string[]
          translations: Record<string, string>
        }[]

        databaseFamilies = data.map((f) => ({
          family: f.name,
          color: f.color,
          keywords: f.keywords,
          translations: f.translations,
        }))
      }
    } catch {
      // falls back to built-in FAMILY_DEFS via undefined families param
    }
  })

  $effect(() => {
    if (noteRelationships !== lastNoteRelationshipsRef) {
      lastNoteRelationshipsRef = noteRelationships
      localNotes = [...noteRelationships]
    }
  })

  function handleGraphNodeClick(node: NoteNode) {
    graphModalNode = node
    graphModalOpen = true
  }

  const sentimentOptions: NoteRelationshipSentiment[] = ['love', 'like', 'neutral', 'dislike', 'redflag']

  function sentimentLabel(s: NoteRelationshipSentiment): string {
    const labels: Record<NoteRelationshipSentiment, () => string> = {
      love: m.oryxel_notes_sentiment_love,
      like: m.oryxel_notes_sentiment_like,
      neutral: m.oryxel_notes_sentiment_neutral,
      dislike: m.oryxel_notes_sentiment_dislike,
      redflag: m.oryxel_notes_sentiment_redflag,
    }

    return labels[s]()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function sentimentIcon(s: NoteRelationshipSentiment): any {
    const icons = { love: Heart, like: ThumbsUp, neutral: Minus, dislike: ThumbsDown, redflag: AlertTriangle }

    return icons[s]
  }

  function sentimentIconColor(s: NoteRelationshipSentiment): string {
    const colors: Record<NoteRelationshipSentiment, string> = {
      love: 'text-accent',
      like: 'text-success',
      neutral: 'text-foreground-muted',
      dislike: 'text-warning',
      redflag: 'text-destructive',
    }

    return colors[s]
  }

  function sentimentColor(s: NoteRelationshipSentiment): string {
    const colors: Record<NoteRelationshipSentiment, string> = {
      love: 'bg-accent/20 text-accent border-accent/30',
      like: 'bg-success/15 text-success border-success/30',
      neutral: 'bg-muted text-foreground-muted border-border',
      dislike: 'bg-warning/15 text-warning border-warning/30',
      redflag: 'bg-destructive/15 text-destructive border-destructive/30',
    }

    return colors[s]
  }

  async function patchNote(note: string, updates: { sentiment?: NoteRelationshipSentiment; label?: string }) {
    const index = localNotes.findIndex((r) => r.note === note)

    if (index !== -1) {
      localNotes[index] = {
        ...localNotes[index],
        ...updates,
        ...(updates.sentiment === undefined ? {} : { lockedByUser: true }),
      }
    }

    await fetch('/api/profile/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, ...updates }),
    })
  }
</script>

<!-- View toggle -->
<div class="mb-3 flex items-center justify-end">
  <div class="flex gap-0.5 rounded-lg border border-border bg-muted p-0.5">
    <button
      onclick={() => (notesViewMode = 'list')}
      aria-label={m.oryxel_notes_view_list()}
      title={m.oryxel_notes_view_list()}
      class="oryx-transition flex h-7 w-8 items-center justify-center rounded-md {notesViewMode === 'list'
        ? 'bg-surface text-foreground shadow-sm'
        : 'text-foreground-muted hover:text-foreground'}"
    >
      <LayoutList size={14} strokeWidth={1.75} />
    </button>
    <button
      onclick={() => (notesViewMode = 'graph')}
      aria-label={m.oryxel_notes_view_graph()}
      title={m.oryxel_notes_view_graph()}
      class="oryx-transition flex h-7 w-8 items-center justify-center rounded-md {notesViewMode === 'graph'
        ? 'bg-surface text-foreground shadow-sm'
        : 'text-foreground-muted hover:text-foreground'}"
    >
      <Network size={14} strokeWidth={1.75} />
    </button>
  </div>
</div>

{#if notesViewMode === 'list'}
  {#if localNotes.length === 0}
    <p class="text-sm text-foreground-muted">{m.oryxel_notes_empty()}</p>
  {:else}
    <div class="overflow-x-auto rounded-xl border border-border bg-surface">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-xs text-foreground-muted">
            <th class="{layout === 'desktop' ? 'w-[200px]' : 'w-[160px]'} px-4 py-3 font-medium"
              >{m.oryxel_notes_col_note()}</th
            >
            <th class="w-[160px] px-4 py-3 font-medium">{m.oryxel_notes_col_sentiment()}</th>
            <th class="px-4 py-3 font-medium">{m.oryxel_notes_col_comment()}</th>
          </tr>
        </thead>
        <tbody>
          {#each localNotes as r (r.note)}
            {@const SentIcon = sentimentIcon(r.sentiment)}
            <tr class="border-b border-border/50 last:border-0{layout === 'desktop' ? ' hover:bg-muted/20' : ''}">
              <td class="px-4 py-3">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-medium text-foreground">{r.translatedNote ?? r.note}</span>
                  {#if r.translatedNote}
                    <span class="font-mono text-[11px] text-foreground-muted">{r.note}</span>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger
                    class="oryx-transition flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none {sentimentColor(
                      r.sentiment,
                    )} hover:opacity-80"
                  >
                    <SentIcon class="size-3.5 shrink-0" />
                    <span>{sentimentLabel(r.sentiment)}</span>
                    {#if r.lockedByUser}
                      <Lock class="size-3 shrink-0 opacity-60" />
                    {:else}
                      <ChevronDown class="size-3 shrink-0 opacity-50" />
                    {/if}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      class="oryx-dropdown-content z-50 min-w-40 rounded-lg border border-border bg-surface p-1 shadow-card"
                      sideOffset={4}
                    >
                      {#each sentimentOptions as s (s)}
                        {@const Ico = sentimentIcon(s)}
                        <DropdownMenu.Item
                          class="oryx-transition flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground outline-none select-none hover:bg-muted data-highlighted:bg-muted"
                          onSelect={() => patchNote(r.note, { sentiment: s })}
                        >
                          <Ico class="size-4 shrink-0 {sentimentIconColor(s)}" />
                          {sentimentLabel(s)}
                        </DropdownMenu.Item>
                      {/each}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </td>
              <td
                class="{layout === 'desktop'
                  ? 'max-w-[260px]'
                  : 'max-w-[200px]'} px-4 py-3 text-xs leading-relaxed text-foreground-muted"
              >
                {r.agentComment ?? ''}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
{:else}
  <NoteGraph graph={noteGraph} onNodeClick={handleGraphNodeClick} height={layout === 'desktop' ? 820 : 520} />
{/if}

<NoteFragrancesModal
  bind:open={graphModalOpen}
  node={graphModalNode}
  {diaryData}
  onClose={() => {
    graphModalOpen = false
    graphModalNode = null
  }}
/>
