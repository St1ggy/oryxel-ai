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

  function isConnected(a: string, b: string): boolean {
    return a === b || adjacency.has(`${a}|${b}`)
  }

  const g = svg.append('g').attr('class', 'graph-root')

  const zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.25, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform.toString())
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)

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

          return 50 + (s.size + t.size) * 0.6
        }),
    )
    .force('charge', d3.forceManyBody<NoteNode>().strength(-150))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force(
      'collide',
      d3.forceCollide<NoteNode>().radius((d) => d.size + 6),
    )

  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGLineElement, NoteLink>('line')
    .data(links as NoteLink[])
    .join('line')
    .attr('stroke', 'var(--oryx-border, #888)')
    .attr('stroke-width', (lk) => linkThickness(lk.weight))
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))

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

      d3.select(this).select('circle').transition().duration(150).attr('r', d.size).attr('stroke-width', 2)

      linkSel
        .transition()
        .duration(150)
        .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))

      nodeGroupSel.transition().duration(150).attr('opacity', 1)
      onTooltipChange(null)
    })

  nodeGroupSel
    .append('circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.82)
    .attr('stroke', 'var(--oryx-bg-surface, white)')
    .attr('stroke-width', 2)

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

  simulation.on('tick', () => {
    linkSel
      .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
      .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
      .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
      .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)

    nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
  })

  g.attr('opacity', 0).transition().duration(400).attr('opacity', 1)

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
