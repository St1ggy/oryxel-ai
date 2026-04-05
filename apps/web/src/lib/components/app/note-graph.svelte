<script lang="ts">
  import * as d3 from 'd3'
  import { onDestroy } from 'svelte'

  import * as m from '$lib/paraglide/messages.js'

  import type { NoteGraph, NoteLink, NoteNode } from '$lib/utils/note-graph'

  type Props = {
    graph: NoteGraph
    onNodeClick: (node: NoteNode) => void
    height?: number
  }

  const { graph, onNodeClick, height = 480 }: Props = $props()

  let svgElement: SVGSVGElement | undefined = $state()
  let simulation: d3.Simulation<NoteNode, NoteLink> | null = null
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
  let tooltip: { x: number; y: number; node: NoteNode } | null = $state(null)

  function linkThickness(weight: number): number {
    if (weight <= 2) return 1

    if (weight <= 5) return 2

    if (weight <= 10) return 3

    return Math.min(4 + (weight - 10) * 0.2, 6)
  }

  function linkOpacity(weight: number): number {
    if (weight <= 2) return 0.3

    if (weight <= 5) return 0.4

    if (weight <= 10) return 0.5

    return 0.6
  }

  $effect(() => {
    if (!svgElement) return

    if (graph.nodes.length === 0) return

    // Deep-copy so D3 can mutate positions without touching the prop
    const nodes: NoteNode[] = graph.nodes.map((n) => ({ ...n }))
    const links: NoteLink[] = graph.links.map((l) => ({
      ...l,
      source: l.source as string,
      target: l.target as string,
    }))

    simulation?.stop()

    const svg = d3.select(svgElement)

    svg.selectAll('*').remove()

    const width = svgElement.getBoundingClientRect().width || 800
    const h = height

    // Build adjacency set from original string IDs (before D3 resolves them)
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const adjacency = new Set<string>()

    for (const lk of graph.links) {
      const source = typeof lk.source === 'string' ? lk.source : (lk.source as NoteNode).id
      const tgt = typeof lk.target === 'string' ? lk.target : (lk.target as NoteNode).id

      adjacency.add(`${source}|${tgt}`)
      adjacency.add(`${tgt}|${source}`)
    }

    function isConnected(a: string, b: string): boolean {
      return a === b || adjacency.has(`${a}|${b}`)
    }

    // Container group (target of zoom transforms)
    const g = svg.append('g').attr('class', 'graph-root')

    // Zoom behaviour
    zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })
    svg.call(zoomBehavior)
    svg.on('dblclick.zoom', null)

    // Force simulation
    simulation = d3
      .forceSimulation<NoteNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<NoteNode, NoteLink>(links as NoteLink[])
          .id((d) => d.id)
          .distance((lk) => {
            const s = lk.source as NoteNode
            const t = lk.target as NoteNode

            return 50 + (s.size + t.size) * 0.6
          }),
      )
      .force('charge', d3.forceManyBody<NoteNode>().strength(-150))
      .force('center', d3.forceCenter(width / 2, h / 2))
      .force(
        'collide',
        d3.forceCollide<NoteNode>().radius((d) => d.size + 6),
      )

    // Links
    const linkSel = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, NoteLink>('line')
      .data(links as NoteLink[])
      .join('line')
      .attr('stroke', 'var(--oryx-border, #888)')
      .attr('stroke-width', (lk) => linkThickness(lk.weight))
      .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))

    // Node groups
    const nodeGroupSel = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, NoteNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', function (_event, d) {
        tooltip = null
        onNodeClick(d)
      })
      .on('mouseenter', function (event: MouseEvent, d: NoteNode) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(150)
          .attr('r', d.size * 1.12)
          .attr('stroke-width', 3)

        linkSel
          .transition()
          .duration(150)
          .attr('stroke-opacity', (lk) => {
            const s = (lk.source as NoteNode).id
            const t = (lk.target as NoteNode).id

            return s === d.id || t === d.id ? 0.85 : 0.04
          })

        nodeGroupSel
          .transition()
          .duration(150)
          .attr('opacity', (n) => (isConnected(d.id, n.id) ? 1 : 0.2))

        const rect = svgElement!.getBoundingClientRect()

        tooltip = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          node: d,
        }
      })
      .on('mousemove', function (event: MouseEvent) {
        if (!tooltip) return

        const rect = svgElement!.getBoundingClientRect()

        tooltip = { ...tooltip, x: event.clientX - rect.left, y: event.clientY - rect.top }
      })
      .on('mouseleave', function (_event, d: NoteNode) {
        d3.select(this).select('circle').transition().duration(150).attr('r', d.size).attr('stroke-width', 2)

        linkSel
          .transition()
          .duration(150)
          .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))

        nodeGroupSel.transition().duration(150).attr('opacity', 1)
        tooltip = null
      })

    // Circles
    nodeGroupSel
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.82)
      .attr('stroke', 'var(--oryx-bg-surface, white)')
      .attr('stroke-width', 2)

    // Labels inside large nodes (size ≥ 32)
    nodeGroupSel
      .filter((d) => d.size >= 32)
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.27, 13))}px`)
      .attr('font-family', 'var(--font-body, Inter, sans-serif)')
      .attr('paint-order', 'stroke')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 3)
      .attr('pointer-events', 'none')

    // Labels outside small nodes (size < 32)
    nodeGroupSel
      .filter((d) => d.size < 32)
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.size + 11)
      .attr('fill', 'var(--oryx-fg-muted, #888)')
      .attr('font-size', '9px')
      .attr('font-family', 'var(--font-body, Inter, sans-serif)')
      .attr('pointer-events', 'none')

    // Simulation ticks
    simulation.on('tick', () => {
      linkSel
        .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
        .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
        .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
        .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)

      nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // Fade in
    g.attr('opacity', 0).transition().duration(400).attr('opacity', 1)

    return () => {
      simulation?.stop()
    }
  })

  onDestroy(() => {
    simulation?.stop()
  })

  function zoomIn() {
    if (!svgElement || !zoomBehavior) return

    d3.select(svgElement).transition().duration(250).call(zoomBehavior.scaleBy, 1.4)
  }

  function zoomOut() {
    if (!svgElement || !zoomBehavior) return

    d3.select(svgElement)
      .transition()
      .duration(250)
      .call(zoomBehavior.scaleBy, 1 / 1.4)
  }

  function resetView() {
    if (!svgElement || !zoomBehavior) return

    d3.select(svgElement).transition().duration(350).call(zoomBehavior.transform, d3.zoomIdentity)
  }

  // Clamp tooltip so it doesn't overflow the container
  function tooltipStyle(x: number, y: number): string {
    const offsetX = x + 14
    const offsetY = y - 8

    return `left:${offsetX}px;top:${offsetY}px`
  }
</script>

<div class="relative w-full overflow-hidden rounded-lg border border-border bg-surface" style="height:{height}px">
  {#if graph.nodes.length === 0}
    <div class="flex h-full items-center justify-center text-sm" style="color:var(--oryx-fg-muted)">
      {m.oryxel_note_graph_empty()}
    </div>
  {:else}
    <svg bind:this={svgElement} width="100%" {height} class="block select-none" aria-label="Note preference graph"
    ></svg>

    <!-- Zoom controls -->
    <div class="absolute right-2 bottom-2 flex flex-col gap-1">
      {#each [{ label: '+', action: zoomIn }, { label: '⊙', action: resetView }, { label: '−', action: zoomOut }] as button (button.label)}
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
          {tooltip.node.family}
          ·
          {tooltip.node.tier}
        </div>
      </div>
    {/if}
  {/if}
</div>
