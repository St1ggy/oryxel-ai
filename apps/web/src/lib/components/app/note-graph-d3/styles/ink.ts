import * as d3 from 'd3'

import { lightenHex, linkOpacity, linkThickness } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Ink style — hand-drawn feel, feTurbulence displacement, muted palette ────

// Fixed wobble offsets per link (computed once, reused in tick)
const wobbleCache = new Map<string, number>()

function wobbleFor(index: number): number {
  const key = String(index)

  if (!wobbleCache.has(key)) wobbleCache.set(key, Math.sin(index * 2.7) * 12)

  return wobbleCache.get(key)!
}

function desaturate(hex: string): string {
  const c = d3.hsl(hex)

  c.s *= 0.45

  return c.formatHex()
}

function inkPath(x1: number, y1: number, x2: number, y2: number, wobble: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  // perpendicular unit vector
  const px = (-dy / length) * wobble
  const py = (dx / length) * wobble

  return `M${x1},${y1} Q${mx + px},${my + py} ${x2},${y2}`
}

const init = (context: StyleContext): RenderedSelections => {
  const { g, defs, nodes, links, uid } = context

  // Ink distortion filter
  const inkFilter = defs
    .append('filter')
    .attr('id', `${uid}-ink`)
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')

  inkFilter
    .append('feTurbulence')
    .attr('type', 'turbulence')
    .attr('baseFrequency', 0.04)
    .attr('numOctaves', 3)
    .attr('seed', 7)
    .attr('result', 'noise')

  inkFilter
    .append('feDisplacementMap')
    .attr('in', 'SourceGraphic')
    .attr('in2', 'noise')
    .attr('scale', 8)
    .attr('xChannelSelector', 'R')
    .attr('yChannelSelector', 'G')

  // Paper background
  g.insert('rect', ':first-child')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'var(--oryx-surface, #fdfaf5)')
    .attr('opacity', 0.6)

  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGPathElement, NoteLink>('path')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (lk) => desaturate((lk.source as NoteNode).color))
    .attr('stroke-width', (lk) => linkThickness(lk.weight) * 0.9)
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight) * 0.7)
    .attr('stroke-linecap', 'round')

  const nodeGroupSel = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, NoteNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')

  // Main circle with ink filter
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => desaturate(d.color))
    .attr('fill-opacity', 0.72)
    .attr('stroke', (d) => lightenHex(desaturate(d.color), -0.1))
    .attr('stroke-width', 1.5)
    .attr('filter', `url(#${uid}-ink)`)

  // Labels
  nodeGroupSel
    .filter((d) => d.size >= 28)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'var(--oryx-fg, #333)')
    .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.25, 13))}px`)
    .attr('font-family', '"Georgia", "Palatino", serif')
    .attr('font-style', 'italic')
    .attr('pointer-events', 'none')

  nodeGroupSel
    .filter((d) => d.size < 28)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => d.size + 12)
    .attr('fill', 'var(--oryx-fg-muted, #888)')
    .attr('font-size', '9px')
    .attr('font-family', '"Georgia", serif')
    .attr('font-style', 'italic')
    .attr('pointer-events', 'none')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { linkSel: linkSel as any, nodeGroupSel }
}

const tick = (sel: RenderedSelections): void => {
  sel.linkSel.attr('d', (lk, index) => {
    const s = lk.source as NoteNode
    const t = lk.target as NoteNode

    return inkPath(s.x ?? 0, s.y ?? 0, t.x ?? 0, t.y ?? 0, wobbleFor(index))
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
    .velocityDecay(0.3)
    .force(
      'link',
      d3
        .forceLink<NoteNode, NoteLink>(links)
        .id((d) => d.id)
        .distance((lk) => 90 + ((lk.source as NoteNode).size + (lk.target as NoteNode).size) * 1.1),
    )
    .force(
      'charge',
      d3.forceManyBody<NoteNode>().strength((d) => -(500 + d.size * 7)),
    )
    .force('x', d3.forceX<NoteNode>(width / 2).strength(0.04))
    .force('y', d3.forceY<NoteNode>(height / 2).strength(0.04))
    .force(
      'collide',
      d3.forceCollide<NoteNode>().radius((d) => d.size + 24),
    )

export const inkRenderer: StyleRenderer = { init, tick, buildSimulation }
