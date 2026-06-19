<script lang="ts">
  import Select from '$lib/components/ui/select.svelte'
  import { visibilitySelectOptions } from '$lib/social/visibility-label'

  import type { Visibility } from '@oryxel/ai'

  type Props = {
    listId: number
    visibility: Visibility
    onUpdated?: () => void
  }

  const { listId, visibility, onUpdated }: Props = $props()

  const options = $derived(visibilitySelectOptions())

  async function onChange(next: string) {
    if (next === visibility) return

    await fetch(`/api/lists/${listId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: next }),
    })

    onUpdated?.()
  }
</script>

<Select class="w-40" value={visibility} {options} onChange={(next) => void onChange(next)} />
