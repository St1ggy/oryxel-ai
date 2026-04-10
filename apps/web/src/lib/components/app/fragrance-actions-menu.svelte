<script lang="ts">
  import { Ellipsis } from '@lucide/svelte'

  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow } from '$lib/types/diary'

  type Props = {
    row: DiaryRow | null
    onEdit?: (row: DiaryRow) => void
    onDelete?: (id: number) => void
    onTried?: (brand: string, name: string) => void
    onClose: () => void
  }

  const { row, onEdit, onDelete, onTried, onClose }: Props = $props()

  let menuOpen = $state(false)
</script>

<div class="relative">
  <button
    type="button"
    class="oryx-transition rounded-lg p-1.5 text-foreground-muted/60 hover:bg-muted hover:text-foreground"
    onclick={() => (menuOpen = !menuOpen)}
    aria-label="Actions"
  >
    <Ellipsis size={16} strokeWidth={1.75} />
  </button>

  {#if menuOpen}
    <div
      class="absolute top-full right-0 z-10 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
      role="menu"
    >
      {#if onTried}
        <button
          type="button"
          role="menuitem"
          class="oryx-transition w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-muted"
          onclick={() => {
            onTried!(row!.brand, row!.fragrance)
            menuOpen = false
            onClose()
          }}
        >
          {m.oryxel_rec_tried()}
        </button>
      {:else}
        {#if onEdit}
          <button
            type="button"
            role="menuitem"
            class="oryx-transition w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
            onclick={() => {
              onEdit!(row!)
              menuOpen = false
              onClose()
            }}
          >
            {m.oryxel_action_edit()}
          </button>
        {/if}
        {#if onDelete}
          <button
            type="button"
            role="menuitem"
            class="oryx-transition w-full px-4 py-2.5 text-left text-sm text-rose-500 hover:bg-rose-500/8"
            onclick={() => {
              onDelete!(row!.id)
              menuOpen = false
              onClose()
            }}
          >
            {m.oryxel_action_remove()}
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>
