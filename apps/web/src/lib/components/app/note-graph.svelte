<script lang="ts">
  import { Disc, Hexagon, Layers, Pen, Sparkles, Star } from '@lucide/svelte'
  import { onDestroy, untrack } from 'svelte'

  import * as m from '$lib/paraglide/messages.js'

  import { type GraphControls, type GraphStyle, type TooltipState, initNoteGraphD3 } from './note-graph-d3'

  import type { DiaryData, DiaryRow } from '$lib/types/diary'
  import type { NoteGraph, NoteNode } from '$lib/utils/note-graph'

  type ListLabel = 'liked' | 'owned' | 'neutral'
  type FragranceEntry = { row: DiaryRow; list: ListLabel }

  type Props = {
    graph: NoteGraph
    diaryData: DiaryData
    onNodeClick?: (node: NoteNode) => void
    height?: number
    initialStyle?: string
  }

  const { graph, diaryData, onNodeClick, height = 480, initialStyle = 'default' }: Props = $props()

  // Families present in the current graph — derived for the legend
  const legendFamilies = $derived(
    [...new Map(graph.nodes.map((n) => [n.family, n.color])).entries()].map(([family, color]) => ({
      family,
      color,
    })),
  )

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

  const STYLES: { style: GraphStyle; icon: typeof Sparkles; label: () => string }[] = [
    { style: 'default', icon: Sparkles, label: m.oryxel_note_graph_style_default },
    { style: 'constellation', icon: Star, label: m.oryxel_note_graph_style_constellation },
    { style: 'bubble', icon: Disc, label: m.oryxel_note_graph_style_bubble },
    { style: 'ink', icon: Pen, label: m.oryxel_note_graph_style_ink },
    { style: 'cluster', icon: Hexagon, label: m.oryxel_note_graph_style_cluster },
    { style: 'timeline', icon: Layers, label: m.oryxel_note_graph_style_timeline },
  ]

  function localFamily(family: string): string {
    return familyLabel[family]?.() ?? family
  }

  function localTier(tier: string): string {
    return tierLabel[tier]?.() ?? tier
  }

  let containerElement: HTMLDivElement | undefined = $state()
  let svgElement: SVGSVGElement | undefined = $state()
  let controls: GraphControls | null = null
  let tooltip: TooltipState | null = $state(null)
  let panelNode: NoteNode | null = $state(null)

  const VALID_STYLES: GraphStyle[] = ['default', 'constellation', 'bubble', 'ink', 'cluster', 'timeline']

  function coerceStyle(s: string): GraphStyle {
    return (VALID_STYLES as string[]).includes(s) ? (s as GraphStyle) : 'default'
  }

  let activeStyle = $state<GraphStyle>(untrack(() => coerceStyle(initialStyle)))

  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  function persistStyle(style: GraphStyle): void {
    if (saveTimeout) clearTimeout(saveTimeout)

    saveTimeout = setTimeout(() => {
      fetch('/api/ai/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ graphStyle: style }),
      }).catch(() => {
        // Non-critical — ignore network errors
      })
    }, 600)
  }

  $effect(() => {
    persistStyle(activeStyle)
  })

  // Fragrances containing the selected note

  const panelFragrances = $derived.by((): FragranceEntry[] => {
    if (!panelNode) return []

    const noteId = panelNode.id
    const results: FragranceEntry[] = []
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const seen = new Set<number>()

    const lists: [DiaryRow[], ListLabel][] = [
      [diaryData.liked, 'liked'],
      [diaryData.owned, 'owned'],
      [diaryData.neutral, 'neutral'],
    ]

    for (const [rows, list] of lists) {
      for (const row of rows) {
        if (seen.has(row.fragranceId)) continue

        const allNotes = [row.pyramidTop, row.pyramidMid, row.pyramidBase]
          .filter(Boolean)
          .flatMap((s) => s!.split(',').map((n) => n.trim().toLowerCase()))

        if (allNotes.includes(noteId)) {
          seen.add(row.fragranceId)
          results.push({ row, list })
        }
      }
    }

    return results
  })

  $effect(() => {
    if (!svgElement || !containerElement || graph.nodes.length === 0) return

    controls?.cleanup()

    const measuredWidth = containerElement.getBoundingClientRect().width || 800

    initNoteGraphD3(
      svgElement,
      graph,
      measuredWidth,
      height,
      (node) => {
        panelNode = node
        onNodeClick?.(node)
      },
      (state) => {
        tooltip = state
      },
      activeStyle,
    ).then((c) => {
      controls = c
    })

    return () => controls?.cleanup()
  })

  onDestroy(() => controls?.cleanup())

  function tooltipStyle(x: number, y: number): string {
    return `left:${x + 14}px;top:${y - 8}px`
  }
</script>

{#if graph.nodes.length > 0}
  <!-- Legend -->
  <div
    class="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs"
    style="color:var(--oryx-fg-muted)"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full bg-current opacity-40"></span>
        {m.oryxel_note_graph_legend_size()}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-px w-5 rounded" style="background:currentColor;opacity:0.4"></span>
        {m.oryxel_note_graph_legend_lines()}
      </span>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      {#each legendFamilies as { family, color } (family)}
        <span class="flex items-center gap-1">
          <span class="inline-block h-2 w-2 shrink-0 rounded-full" style="background:{color}"></span>
          {familyLabel[family]?.() ?? family}
        </span>
      {/each}
    </div>
  </div>
{/if}

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

    <!-- Backdrop — closes panel when clicking outside it -->
    {#if panelNode}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute inset-0 z-10" onclick={() => (panelNode = null)}></div>
    {/if}

    <!-- Left slide-in panel -->
    <div
      class="oryx-transition absolute inset-y-0 left-0 z-20 flex w-72 flex-col overflow-hidden border-r border-border bg-surface shadow-lg {panelNode
        ? 'translate-x-0'
        : '-translate-x-full'}"
    >
      {#if panelNode}
        <!-- Header -->
        <div class="flex items-start justify-between border-b border-border px-4 py-3">
          <div class="min-w-0 flex-1 pr-2">
            <div class="truncate text-sm font-semibold" style="color:var(--oryx-fg)">{panelNode.name}</div>
            <div class="mt-0.5 flex items-center gap-1.5 text-xs" style="color:var(--oryx-fg-muted)">
              <span class="h-2 w-2 shrink-0 rounded-full" style="background:{panelNode.color}"></span>
              {localFamily(panelNode.family)} · {localTier(panelNode.tier)}
              · {m.oryxel_note_graph_tooltip_count({ count: panelFragrances.length })}
            </div>
          </div>
          <button
            onclick={() => (panelNode = null)}
            class="oryx-transition flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs hover:bg-muted active:scale-95"
            style="color:var(--oryx-fg-muted)"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <!-- Fragrance list -->
        <div class="flex-1 overflow-y-auto p-3">
          {#if panelFragrances.length === 0}
            <p class="text-xs" style="color:var(--oryx-fg-muted)">{m.oryxel_note_graph_empty()}</p>
          {:else}
            <ul class="flex flex-col gap-2" role="list">
              {#each panelFragrances as { row, list } (row.fragranceId)}
                <li class="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-medium" style="color:var(--oryx-fg)">{row.brand}</div>
                    <div class="truncate text-xs" style="color:var(--oryx-fg-muted)">{row.fragrance}</div>
                  </div>
                  <span
                    class="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    style="background:{listColor[list]}22;color:{listColor[list]}"
                  >
                    {listLabel[list]()}
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Style switcher — top-right, above zoom controls -->
    <div class="absolute top-2 right-2 z-10 flex flex-col gap-1">
      {#each STYLES as { style, icon: Icon, label } (style)}
        <button
          onclick={() => (activeStyle = style)}
          title={label()}
          class="oryx-transition flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface shadow-sm hover:bg-muted active:scale-95 {activeStyle ===
          style
            ? 'bg-muted ring-1 ring-accent'
            : ''}"
          style="color:{activeStyle === style ? 'var(--color-accent, #6366f1)' : 'var(--oryx-fg-muted, #888)'}"
          aria-label={label()}
          aria-pressed={activeStyle === style}
        >
          <Icon size={13} />
        </button>
      {/each}
    </div>

    <!-- Zoom controls — below switcher, same column -->
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

    <!-- Tooltip (hidden when panel is open) -->
    {#if tooltip && !panelNode}
      <div
        class="pointer-events-none absolute z-10 max-w-48 rounded-lg border border-border bg-surface p-3 text-sm shadow-card"
        style={tooltipStyle(tooltip.x, tooltip.y)}
      >
        <div class="oryx-heading font-medium" style="color:var(--oryx-fg)">{tooltip.node.name}</div>
        <div class="mt-1 text-xs" style="color:var(--oryx-fg-muted)">
          {m.oryxel_note_graph_tooltip_count({ count: tooltip.node.fragrances.length })}
        </div>
        <div class="mt-0.5 flex items-center gap-1.5 text-xs" style="color:var(--oryx-fg-muted)">
          <span class="inline-block h-2 w-2 shrink-0 rounded-full" style="background:{tooltip.node.color}"></span>
          {familyLabel[tooltip.node.family]?.() ?? tooltip.node.family}
          ·
          {tierLabel[tooltip.node.tier]?.() ?? tooltip.node.tier}
        </div>
      </div>
    {/if}
  {/if}
</div>
