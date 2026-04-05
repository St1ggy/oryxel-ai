<script lang="ts">
  import Modal from '$lib/components/ui/modal.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryData, DiaryRow } from '$lib/types/diary'
  import type { NoteNode } from '$lib/utils/note-graph'

  type ListLabel = 'liked' | 'owned' | 'neutral'

  type FragranceEntry = {
    row: DiaryRow
    list: ListLabel
  }

  type Props = {
    open: boolean
    node: NoteNode | null
    diaryData: DiaryData
    onClose: () => void
  }

  let { open = $bindable(false), node, diaryData, onClose }: Props = $props()

  const fragrances = $derived.by((): FragranceEntry[] => {
    if (!node) return []

    const noteId = node.id
    const results: FragranceEntry[] = []
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const seen = new Set<number>()

    const lists: [DiaryRow[], ListLabel][] = [
      [diaryData.liked, 'liked'],
      [diaryData.owned, 'owned'],
      [diaryData.neutral, 'neutral'],
    ]

    for (const [rows, label] of lists) {
      for (const row of rows) {
        if (seen.has(row.fragranceId)) continue

        const allNotes = [row.pyramidTop, row.pyramidMid, row.pyramidBase]
          .filter(Boolean)
          .flatMap((string_) => string_!.split(',').map((n) => n.trim().toLowerCase()))

        if (allNotes.includes(noteId)) {
          seen.add(row.fragranceId)
          results.push({ row, list: label })
        }
      }
    }

    return results
  })

  const listColor: Record<ListLabel, string> = {
    liked: 'var(--color-success, #22c55e)',
    owned: 'var(--color-accent, #6366f1)',
    neutral: 'var(--oryx-fg-muted, #888)',
  }

  const listLabel: Record<ListLabel, () => string> = {
    liked: m.oryxel_note_graph_list_liked,
    owned: m.oryxel_note_graph_list_owned,
    neutral: m.oryxel_note_graph_list_neutral,
  }
</script>

<Modal bind:open title={node ? m.oryxel_note_graph_modal_title({ note: node.name }) : ''}>
  {#if node}
    <!-- Note meta row -->
    <div class="mb-4 flex items-center gap-2">
      <span class="h-3 w-3 shrink-0 rounded-full" style="background:{node.color}"></span>
      <span class="text-sm" style="color:var(--oryx-fg-muted)">
        {node.family} · {node.tier} · {m.oryxel_note_graph_tooltip_count({ count: fragrances.length })}
      </span>
    </div>

    {#if fragrances.length === 0}
      <p class="text-sm" style="color:var(--oryx-fg-muted)">{m.oryxel_note_graph_empty()}</p>
    {:else}
      <ul class="flex flex-col gap-2" role="list">
        {#each fragrances as { row, list } (row.fragranceId)}
          <li class="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <div class="min-w-0">
              <div class="truncate font-medium" style="color:var(--oryx-fg)">{row.brand}</div>
              <div class="truncate text-xs" style="color:var(--oryx-fg-muted)">{row.fragrance}</div>
            </div>
            <span
              class="ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
              style="background:{listColor[list]}22;color:{listColor[list]}"
            >
              {listLabel[list]()}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}

  {#snippet footer()}
    <button
      onclick={onClose}
      class="oryx-transition rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted active:scale-95"
      style="color:var(--oryx-fg-muted)"
    >
      {m.oryxel_cancel()}
    </button>
  {/snippet}
</Modal>
