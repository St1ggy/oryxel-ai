<script lang="ts">
  type Props = {
    notes: string[]
  }

  const { notes }: Props = $props()

  // Dedupe (case-insensitive trim) so the model emitting the same note twice does not break {#each} keys.
  const uniqueNotes = $derived.by(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive helper consuming a snapshot
    const seen = new Set<string>()
    const result: string[] = []

    for (const note of notes) {
      const key = note.trim().toLowerCase()

      if (!key || seen.has(key)) continue

      seen.add(key)
      result.push(note)
    }

    return result
  })
</script>

<div class="flex flex-wrap gap-1">
  {#each uniqueNotes as note (note)}
    <span class="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-foreground-muted">
      {note}
    </span>
  {/each}
</div>
