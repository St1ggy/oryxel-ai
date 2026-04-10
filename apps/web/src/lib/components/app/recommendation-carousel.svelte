<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'

  interface Rec {
    id: string
    brand: string
    name: string
    tag?: string
    notes?: string[]
  }

  interface Props {
    items: Rec[]
    onTried?: (brand: string, name: string) => void
  }

  const { items, onTried }: Props = $props()
</script>

<div class="overflow-x-auto pb-2">
  <table class="w-full min-w-[480px] border-collapse text-left text-sm">
    <thead>
      <tr class="border-b border-border text-xs font-medium tracking-wide text-foreground-muted uppercase">
        <th class="px-4 py-3">{m.oryxel_table_brand()}</th>
        <th class="px-4 py-3">{m.oryxel_table_fragrance()}</th>
        <th class="px-4 py-3">{m.oryxel_table_notes()}</th>
        <th class="w-28 px-4 py-3 text-right">{m.oryxel_table_actions()}</th>
      </tr>
    </thead>
    <tbody>
      {#each items as item (item.id)}
        <tr class="oryx-transition h-[52px] border-b border-border last:border-0 hover:bg-(--oryx-table-hover)">
          <td class="px-4 align-middle font-semibold text-foreground">{item.brand}</td>
          <td class="px-4 align-middle text-foreground">{item.name}</td>
          <td class="px-4 align-middle text-xs text-foreground-muted">{item.tag ?? ''}</td>
          <td class="px-4 text-right align-middle">
            <button
              type="button"
              class="oryx-transition rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted hover:border-accent hover:text-accent"
              onclick={() => onTried?.(item.brand, item.name)}
            >
              {m.oryxel_rec_tried()}
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
