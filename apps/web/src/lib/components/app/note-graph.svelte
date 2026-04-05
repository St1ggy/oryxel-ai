<script lang="ts">
  import { onDestroy } from 'svelte'

  import * as m from '$lib/paraglide/messages.js'

  import { type GraphControls, type TooltipState, initNoteGraphD3 } from './note-graph-d3'

  import type { NoteGraph, NoteNode } from '$lib/utils/note-graph'

  const familyLabel: Record<string, () => string> = {
    citrus: m.oryxel_note_family_citrus,
    floral: m.oryxel_note_family_floral,
    woody: m.oryxel_note_family_woody,
    spicy: m.oryxel_note_family_spicy,
    fresh: m.oryxel_note_family_fresh,
    musky: m.oryxel_note_family_musky,
    green: m.oryxel_note_family_green,
    leather: m.oryxel_note_family_leather,
    other: m.oryxel_note_family_other,
  }

  const tierLabel: Record<string, () => string> = {
    top: m.oryxel_note_tier_top,
    heart: m.oryxel_note_tier_heart,
    base: m.oryxel_note_tier_base,
    unknown: m.oryxel_note_tier_unknown,
  }

  type Props = {
    graph: NoteGraph
    onNodeClick: (node: NoteNode) => void
    height?: number
  }

  const { graph, onNodeClick, height = 480 }: Props = $props()

  let containerElement: HTMLDivElement | undefined = $state()
  let svgElement: SVGSVGElement | undefined = $state()
  let controls: GraphControls | null = null
  let tooltip: TooltipState | null = $state(null)

  $effect(() => {
    if (!svgElement || !containerElement || graph.nodes.length === 0) return

    controls?.cleanup()

    const measuredWidth = containerElement.getBoundingClientRect().width || 800

    controls = initNoteGraphD3(svgElement, graph, measuredWidth, height, onNodeClick, (state) => {
      tooltip = state
    })

    return () => controls?.cleanup()
  })

  onDestroy(() => controls?.cleanup())

  function tooltipStyle(x: number, y: number): string {
    return `left:${x + 14}px;top:${y - 8}px`
  }
</script>

<div
  bind:this={containerElement}
  class="relative w-full overflow-hidden rounded-lg border border-border bg-surface"
  style="height:{height}px"
>
  {#if graph.nodes.length === 0}
    <div class="flex h-full items-center justify-center text-sm" style="color:var(--oryx-fg-muted)">
      {m.oryxel_note_graph_empty()}
    </div>
  {:else}
    <svg bind:this={svgElement} width="100%" {height} class="block select-none" aria-label="Note preference graph"
    ></svg>

    <!-- Zoom controls -->
    <div class="absolute right-2 bottom-2 flex flex-col gap-1">
      {#each [{ label: '+', action: () => controls?.zoomIn() }, { label: '⊙', action: () => controls?.resetView() }, { label: '−', action: () => controls?.zoomOut() }] as button (button.label)}
        <button
          onclick={button.action}
          class="oryx-transition flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-sm shadow-sm hover:bg-muted active:scale-95"
          style="color:var(--oryx-fg-muted)"
          aria-label={button.label}
        >
          {button.label}
        </button>
      {/each}
    </div>

    <!-- Tooltip -->
    {#if tooltip}
      <div
        class="pointer-events-none absolute z-10 max-w-48 rounded-lg border border-border bg-surface p-3 text-sm shadow-[var(--oryx-shadow-md)]"
        style={tooltipStyle(tooltip.x, tooltip.y)}
      >
        <div class="oryx-heading font-medium" style="color:var(--oryx-fg)">{tooltip.node.name}</div>
        <div class="mt-1 text-xs" style="color:var(--oryx-fg-muted)">
          {m.oryxel_note_graph_tooltip_count({ count: tooltip.node.fragrances.length })}
        </div>
        <div class="mt-0.5 flex items-center gap-1.5 text-xs" style="color:var(--oryx-fg-muted)">
          <span class="inline-block h-2 w-2 flex-shrink-0 rounded-full" style="background:{tooltip.node.color}"></span>
          {familyLabel[tooltip.node.family]?.() ?? tooltip.node.family}
          ·
          {tierLabel[tooltip.node.tier]?.() ?? tooltip.node.tier}
        </div>
      </div>
    {/if}
  {/if}
</div>
