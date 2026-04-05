<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow } from '$lib/types/diary'

  type Props = {
    row: DiaryRow | null
  }

  const { row }: Props = $props()

  const tiers = $derived(
    row
      ? [
          { label: m.oryxel_pyramid_top(), value: row.pyramidTop, symbol: '◦' },
          { label: m.oryxel_pyramid_mid(), value: row.pyramidMid, symbol: '◈' },
          { label: m.oryxel_pyramid_base(), value: row.pyramidBase, symbol: '◉' },
        ].filter((t) => t.value)
      : [],
  )
</script>

{#if tiers.length > 0}
  <div class="px-5 pt-4 pb-2">
    <p class="mb-3 text-[10px] font-semibold tracking-widest text-foreground-muted/50 uppercase">
      {m.oryxel_detail_pyramid_title()}
    </p>
    <div class="flex flex-col gap-3">
      {#each tiers as tier (tier.label)}
        <div class="flex items-start gap-3">
          <span class="mt-0.5 w-4 shrink-0 text-center text-[10px] text-foreground-muted/40">{tier.symbol}</span>
          <div class="min-w-0 flex-1">
            <span class="mr-2 text-[10px] font-semibold tracking-wider text-foreground-muted/50 uppercase"
              >{tier.label}</span
            >
            <span class="text-sm text-foreground">{tier.value}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="mx-5 mt-4 h-px bg-border/60"></div>
{/if}
