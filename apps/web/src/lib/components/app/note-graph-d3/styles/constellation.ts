import * as d3 from 'd3'

import { buildAdjacency, lightenHex, linkOpacity, linkThickness, truncateLabel } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Constellation style — dark sky, star dots, bezier arc links ──────────────

function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const distribution = Math.hypot(dx, dy)
  const bow = distribution * 0.22

  return `M${x1},${y1} Q${mx},${my - bow} ${x2},${y2}`
}

const init = (context: StyleContext): RenderedSelections => {
  const { g, nodes, links, width, height } = context

  // Background sky
  g.insert('rect', ':first-child').attr('width', width).attr('height', height).attr('fill', '#080b1a')

  // Stars — static, rendered once, no filter
  const starCount = 80

  const stars = Array.from({ length: starCount }, () => ({
    // eslint-disable-next-line sonarjs/pseudo-random
    x: Math.random() * width,
    // eslint-disable-next-line sonarjs/pseudo-random
    y: Math.random() * height,
    // eslint-disable-next-line sonarjs/pseudo-random
    r: 0.8 + Math.random() * 0.7,
    // eslint-disable-next-line sonarjs/pseudo-random
    op: 0.2 + Math.random() * 0.6,
  }))

  g.append('g')
    .attr('class', 'stars')
    .selectAll<SVGCircleElement, (typeof stars)[number]>('circle')
    .data(stars)
    .join('circle')
    .attr('cx', (s) => s.x)
    .attr('cy', (s) => s.y)
    .attr('r', (s) => s.r)
    .attr('fill', 'white')
    .attr('fill-opacity', (s) => s.op)
    .attr('pointer-events', 'none')

  // Links — simple bezier arcs, no expensive filter
  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGPathElement, NoteLink>('path')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (lk) => lightenHex((lk.source as NoteNode).color, 0.35))
    .attr('stroke-width', (lk) => linkThickness(lk.weight))
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))
    .attr('stroke-linecap', 'round')

  const nodeGroupSel = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, NoteNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')

  // 2 concentric glow rings (no filter, just semi-transparent fills)
  const ringRadii = [5, 14] as const
  const ringOpacities = [0.22, 0.08] as const

  for (const [index, ringRadius] of ringRadii.entries()) {
    nodeGroupSel
      .append('circle')
      .attr('class', `node-ring-${index}`)
      .attr('r', (d) => d.size + ringRadius)
      .attr('fill', (d) => lightenHex(d.color, 0.3))
      .attr('fill-opacity', ringOpacities[index])
      .attr('pointer-events', 'none')
  }

  // Main bright circle
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => lightenHex(d.color, 0.4))
    .attr('stroke', 'rgba(255,255,255,0.6)')
    .attr('stroke-width', 1)

  // Spike lines on large nodes
  const largeNodes = nodeGroupSel.filter((d) => d.size >= 50)

  for (let angle = 0; angle < 360; angle += 90) {
    const rad = (angle * Math.PI) / 180

    largeNodes
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d) => Math.cos(rad) * (d.size + 22))
      .attr('y2', (d) => Math.sin(rad) * (d.size + 22))
      .attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none')
  }

  // Labels
  nodeGroupSel
    .filter((d) => d.size >= 24)
    .append('text')
    .text((d) => truncateLabel(d.name, d.size))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'rgba(255,255,255,0.9)')
    .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.26, 13))}px`)
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('font-weight', '400')
    .attr('pointer-events', 'none')

  nodeGroupSel
    .filter((d) => d.size < 24)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => d.size + 12)
    .attr('fill', 'rgba(200,210,255,0.7)')
    .attr('font-size', '9px')
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('pointer-events', 'none')

  const adjacency = buildAdjacency(links)

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkSel: linkSel as any,
    nodeGroupSel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extras: { adjacency: adjacency as any },
  }
}

const tick = (sel: RenderedSelections): void => {
  sel.linkSel.attr('d', (lk) => {
    const s = lk.source as NoteNode
    const t = lk.target as NoteNode

    return arcPath(s.x ?? 0, s.y ?? 0, t.x ?? 0, t.y ?? 0)
  })

  sel.nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
}

const buildSimulation = (
  nodes: NoteNode[],
  links: NoteLink[],
  width: number,
  height: number,
): d3.Simulation<NoteNode, NoteLink> =>
  d3
    .forceSimulation<NoteNode>(nodes)
    .velocityDecay(0.28)
    .force(
      'link',
      d3
        .forceLink<NoteNode, NoteLink>(links)
        .id((d) => d.id)
        .distance((lk) => 100 + ((lk.source as NoteNode).size + (lk.target as NoteNode).size) * 1.2),
    )
    .force(
      'charge',
      d3.forceManyBody<NoteNode>().strength((d) => -(720 + d.size * 10)),
    )
    .force('x', d3.forceX<NoteNode>(width / 2).strength(0.04))
    .force('y', d3.forceY<NoteNode>(height / 2).strength(0.04))
    .force(
      'collide',
      d3.forceCollide<NoteNode>().radius((d) => d.size + 28),
    )

export const constellationRenderer: StyleRenderer = { init, tick, buildSimulation }
