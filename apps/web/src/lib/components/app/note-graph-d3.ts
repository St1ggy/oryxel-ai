import * as d3 from 'd3'

import type { NoteGraph, NoteLink, NoteNode } from '$lib/utils/note-graph'

export type TooltipState = { x: number; y: number; node: NoteNode }

export type GraphControls = {
  cleanup: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}

function linkThickness(weight: number): number {
  if (weight <= 2) return 1.5

  if (weight <= 6) return 2.5

  if (weight <= 12) return 3.5

  return Math.min(4.5 + (weight - 12) * 0.15, 7)
}

function linkOpacity(weight: number): number {
  if (weight <= 2) return 0.35

  if (weight <= 6) return 0.45

  if (weight <= 12) return 0.55

  return 0.65
}

function lightenHex(hex: string, amount: number): string {
  const color = d3.hsl(hex)

  color.l = Math.min(0.97, color.l + amount)

  return color.formatHex()
}

function buildAdjacency(links: NoteLink[]): Set<string> {
  const adjacency = new Set<string>()

  for (const lk of links) {
    const source = typeof lk.source === 'string' ? lk.source : (lk.source as NoteNode).id
    const tgt = typeof lk.target === 'string' ? lk.target : (lk.target as NoteNode).id

    adjacency.add(`${source}|${tgt}`)
    adjacency.add(`${tgt}|${source}`)
  }

  return adjacency
}

export function initNoteGraphD3(
  svgElement: SVGSVGElement,
  graph: NoteGraph,
  height: number,
  onNodeClick: (node: NoteNode) => void,
  onTooltipChange: (state: TooltipState | null) => void,
): GraphControls {
  const nodes: NoteNode[] = graph.nodes.map((n) => ({ ...n }))
  const links: NoteLink[] = graph.links.map((l) => ({
    ...l,
    source: l.source as string,
    target: l.target as string,
  }))

  const svg = d3.select(svgElement)

  svg.selectAll('*').remove()

  const width = svgElement.getBoundingClientRect().width || 800
  const adjacency = buildAdjacency(graph.links)
  let hoveredNode: NoteNode | null = null

  // Unique prefix to avoid gradient ID collisions between multiple graph instances
  // eslint-disable-next-line sonarjs/pseudo-random
  const uid = `g${Math.random().toString(36).slice(2, 8)}`

  function isConnected(a: string, b: string): boolean {
    return a === b || adjacency.has(`${a}|${b}`)
  }

  const g = svg.append('g').attr('class', 'graph-root')

  const zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 6])
    .on('zoom', (event) => {
      g.attr('transform', event.transform.toString())
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)

  // ── Force simulation ──────────────────────────────────────────────────
  const simulation = d3
    .forceSimulation<NoteNode>(nodes)
    .force(
      'link',
      d3
        .forceLink<NoteNode, NoteLink>(links as NoteLink[])
        .id((d) => d.id)
        .distance((lk) => {
          const s = lk.source as NoteNode
          const t = lk.target as NoteNode

          return 70 + (s.size + t.size) * 0.9
        }),
    )
    .force(
      'charge',
      d3.forceManyBody<NoteNode>().strength((d) => -(300 + d.size * 4)),
    )
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
    .force(
      'collide',
      d3.forceCollide<NoteNode>().radius((d) => d.size + 22),
    )

  // ── Defs: gradients (inside <g> so userSpaceOnUse = simulation coords) ──
  const defs = g.append('defs')

  // Drop shadow filter
  const shadow = defs
    .append('filter')
    .attr('id', `${uid}-shadow`)
    .attr('x', '-40%')
    .attr('y', '-40%')
    .attr('width', '180%')
    .attr('height', '180%')

  shadow
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 2)
    .attr('stdDeviation', 5)
    .attr('flood-color', 'rgba(0,0,0,0.18)')

  // Per-link linear gradients (userSpaceOnUse → coords updated on tick)
  const linkGrads = defs
    .selectAll<SVGLinearGradientElement, NoteLink>('linearGradient')
    .data(links)
    .join('linearGradient')
    .attr('id', (_lk, index) => `${uid}-lg-${index}`)
    .attr('gradientUnits', 'userSpaceOnUse')

  linkGrads
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', (lk) => (lk.source as NoteNode).color)
    .attr('stop-opacity', 0.8)

  linkGrads
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', (lk) => (lk.target as NoteNode).color)
    .attr('stop-opacity', 0.8)

  // Per-node radial gradients (objectBoundingBox → no tick update needed)
  const nodeGrads = defs
    .selectAll<SVGRadialGradientElement, NoteNode>('radialGradient')
    .data(nodes)
    .join('radialGradient')
    .attr('id', (_d, index) => `${uid}-ng-${index}`)
    .attr('cx', '38%')
    .attr('cy', '32%')
    .attr('r', '70%')
    .attr('gradientUnits', 'objectBoundingBox')

  nodeGrads
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', (d) => lightenHex(d.color, 0.38))
    .attr('stop-opacity', 1)

  nodeGrads
    .append('stop')
    .attr('offset', '65%')
    .attr('stop-color', (d) => d.color)
    .attr('stop-opacity', 0.92)

  nodeGrads
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', (d) => lightenHex(d.color, -0.12))
    .attr('stop-opacity', 1)

  // ── Links ──────────────────────────────────────────────────────────────
  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGLineElement, NoteLink>('line')
    .data(links as NoteLink[])
    .join('line')
    .attr('stroke', (_lk, index) => `url(#${uid}-lg-${index})`)
    .attr('stroke-width', (lk) => linkThickness(lk.weight))
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))
    .attr('stroke-linecap', 'round')

  // ── Nodes ──────────────────────────────────────────────────────────────
  const nodeGroupSel = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, NoteNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')
    .on('click', function (_event, d) {
      onTooltipChange(null)
      onNodeClick(d)
    })
    .on('mouseenter', function (event: MouseEvent, d: NoteNode) {
      hoveredNode = d

      d3.select(this)
        .select('.node-circle')
        .transition()
        .duration(160)
        .attr('r', d.size * 1.13)
        .attr('stroke-width', 2.5)

      linkSel
        .transition()
        .duration(160)
        .attr('stroke-opacity', (lk) => {
          const s = (lk.source as NoteNode).id
          const t = (lk.target as NoteNode).id

          return s === d.id || t === d.id ? 0.9 : 0.04
        })

      nodeGroupSel
        .transition()
        .duration(160)
        .attr('opacity', (n) => (isConnected(d.id, n.id) ? 1 : 0.18))

      const rect = svgElement.getBoundingClientRect()

      onTooltipChange({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d })
    })
    .on('mousemove', function (event: MouseEvent) {
      if (!hoveredNode) return

      const rect = svgElement.getBoundingClientRect()

      onTooltipChange({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: hoveredNode })
    })
    .on('mouseleave', function (_event, d: NoteNode) {
      hoveredNode = null

      d3.select(this).select('.node-circle').transition().duration(160).attr('r', d.size).attr('stroke-width', 1.5)

      linkSel
        .transition()
        .duration(160)
        .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))

      nodeGroupSel.transition().duration(160).attr('opacity', 1)
      onTooltipChange(null)
    })

  // Outer glow ring
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-glow')
    .attr('r', (d) => d.size + 5)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.12)
    .attr('pointer-events', 'none')

  // Main circle with radial gradient + shadow
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (_d, index) => `url(#${uid}-ng-${index})`)
    .attr('stroke', (d) => lightenHex(d.color, 0.2))
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('filter', `url(#${uid}-shadow)`)

  // Inner highlight spot (top-left shimmer)
  nodeGroupSel
    .filter((d) => d.size >= 22)
    .append('ellipse')
    .attr('class', 'node-shine')
    .attr('rx', (d) => d.size * 0.28)
    .attr('ry', (d) => d.size * 0.18)
    .attr('cx', (d) => -(d.size * 0.22))
    .attr('cy', (d) => -(d.size * 0.28))
    .attr('fill', 'white')
    .attr('fill-opacity', 0.32)
    .attr('pointer-events', 'none')

  // Label inside large nodes
  nodeGroupSel
    .filter((d) => d.size >= 32)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'white')
    .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.26, 13))}px`)
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('font-weight', '500')
    .attr('paint-order', 'stroke')
    .attr('stroke', (d) => lightenHex(d.color, -0.15))
    .attr('stroke-width', 3)
    .attr('pointer-events', 'none')

  // Label below small nodes
  nodeGroupSel
    .filter((d) => d.size < 32)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => d.size + 12)
    .attr('fill', 'var(--oryx-fg-muted, #888)')
    .attr('font-size', '9px')
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('pointer-events', 'none')

  // ── Tick ──────────────────────────────────────────────────────────────
  simulation.on('tick', () => {
    // Update link gradient endpoints to follow nodes
    linkGrads
      .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
      .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
      .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
      .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)

    linkSel
      .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
      .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
      .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
      .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)

    nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
  })

  g.attr('opacity', 0).transition().duration(450).attr('opacity', 1)

  return {
    cleanup: () => simulation.stop(),
    zoomIn: () => d3.select(svgElement).transition().duration(250).call(zoomBehavior.scaleBy, 1.4),
    zoomOut: () =>
      d3
        .select(svgElement)
        .transition()
        .duration(250)
        .call(zoomBehavior.scaleBy, 1 / 1.4),
    resetView: () => d3.select(svgElement).transition().duration(350).call(zoomBehavior.transform, d3.zoomIdentity),
  }
}
