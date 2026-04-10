<script lang="ts">
  import { Triangle } from '@lucide/svelte'
  import { Tooltip } from 'bits-ui'

  import * as m from '$lib/paraglide/messages.js'

  interface Props {
    top: string | null
    mid: string | null
    base: string | null
  }

  const { top, mid, base }: Props = $props()
</script>

<Tooltip.Root delayDuration={150}>
  <Tooltip.Trigger
    class="oryx-transition inline-flex items-center justify-center text-foreground-muted/50 hover:text-foreground-muted"
  >
    <Triangle size={11} strokeWidth={1.5} />
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
