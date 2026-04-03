<script lang="ts">
  import { Tooltip } from 'bits-ui'

  import * as m from '$lib/paraglide/messages.js'
  import type { Snippet } from 'svelte'

  type Props = {
    top: string | null
    mid: string | null
    base: string | null
    children: Snippet
  }

  const { top, mid, base, children }: Props = $props()

  const hasPyramid = $derived(top || mid || base)
</script>

{#if hasPyramid}
  <Tooltip.Root delayDuration={200}>
    <Tooltip.Trigger class="inline-flex cursor-default text-left">
      {@render children()}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        class="oryx-tooltip z-100 max-w-[260px] min-w-[200px] rounded-2xl border border-border bg-surface-elevated p-4 shadow-card"
        sideOffset={10}
      >
        <div class="flex flex-col gap-2.5">
          {#if top}
            <div>
              <p class="mb-1 text-[10px] font-semibold tracking-wider text-foreground-muted uppercase">
                {m.oryxel_pyramid_top()}
              </p>
              <p class="text-xs leading-relaxed text-foreground">{top}</p>
            </div>
          {/if}
          {#if mid}
            <div class="border-t border-border/60 pt-2">
              <p class="mb-1 text-[10px] font-semibold tracking-wider text-foreground-muted uppercase">
                {m.oryxel_pyramid_mid()}
              </p>
              <p class="text-xs leading-relaxed text-foreground">{mid}</p>
            </div>
          {/if}
          {#if base}
            <div class="border-t border-border/60 pt-2">
              <p class="mb-1 text-[10px] font-semibold tracking-wider text-foreground-muted uppercase">
                {m.oryxel_pyramid_base()}
              </p>
              <p class="text-xs leading-relaxed text-foreground">{base}</p>
            </div>
          {/if}
        </div>
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
{:else}
  {@render children()}
{/if}
