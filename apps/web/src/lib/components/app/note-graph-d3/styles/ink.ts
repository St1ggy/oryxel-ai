import * as d3 from 'd3'

import { lightenHex, linkDistanceFactor, linkOpacity, linkThickness, truncateLabel } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Ink / watercolour style ───────────────────────────────────────────────────
// Nodes and links are rendered inside a goo/metaball group so they dissolve
// into each other like wet ink.  A feTurbulence filter adds an irregular
// hand-drawn edge to every circle.

// Fixed wobble offsets per link (computed once, reused in tick)
const wobbleCache = new Map<string, number>()

function wobbleFor(index: number): number {
  const key = String(index)

  if (!wobbleCache.has(key)) wobbleCache.set(key, Math.sin(index * 2.7) * 20)

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
  const px = (-dy / length) * wobble
  const py = (dx / length) * wobble

  return `M${x1},${y1} Q${mx + px},${my + py} ${x2},${y2}`
}

const init = (context: StyleContext): RenderedSelections => {
  const { g, defs, nodes, links, uid, width, height, svgElement } = context

  // Paper background — outside zoom group so it stays fixed when panning/zooming
  const svgSel = d3.select(svgElement)
  const bgGroup = svgSel.insert('g', ':first-child').attr('class', 'ink-bg')

  bgGroup
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'var(--oryx-surface, #fdfaf5)')
    .attr('opacity', 0.6)

  // ── Ink distortion filter (edges only) ────────────────────────────────────
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

  // ── Goo (metaball) filter — merges circles and lines into paint blobs ─────
  const gooFilter = defs
    .append('filter')
    .attr('id', `${uid}-goo`)
    .attr('x', '-40%')
    .attr('y', '-40%')
    .attr('width', '180%')
    .attr('height', '180%')

  gooFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 10).attr('result', 'blur')

  gooFilter
    .append('feColorMatrix')
    .attr('in', 'blur')
    .attr('mode', 'matrix')
    // Alpha ×18 − 6: areas with blurred alpha > 0.33 become fully opaque blobs
    .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -6')

  // ── Goo group: links + circles rendered together so they merge ────────────
  const gooG = g.append('g').attr('class', 'ink-goo').attr('filter', `url(#${uid}-goo)`)

  // Links inside the goo group so they dissolve into adjacent circles
  const linkSel = gooG
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGPathElement, NoteLink>('path')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (lk) => desaturate((lk.source as NoteNode).color))
    .attr('stroke-width', (lk) => linkThickness(lk.weight) * 2.5)
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight) * 1.4)
    .attr('stroke-linecap', 'round')

  const nodeGroupSel = gooG
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, NoteNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')

  // Circle with ink-distortion filter on top of the goo blob shape
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => desaturate(d.color))
    .attr('fill-opacity', 0.9)
    .attr('stroke', (d) => lightenHex(desaturate(d.color), -0.1))
    .attr('stroke-width', 1.5)
    .attr('filter', `url(#${uid}-ink)`)

  // ── Unfiltered labels above the goo group ─────────────────────────────────
  const labelsG = g.append('g').attr('class', 'ink-labels').attr('pointer-events', 'none')

  const labelGroupSel = labelsG.selectAll<SVGGElement, NoteNode>('g').data(nodes).join('g')

  labelGroupSel
    .filter((d) => d.size >= 28)
    .append('text')
    .text((d) => truncateLabel(d.name, d.size))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'var(--oryx-fg, #333)')
    .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.25, 13))}px`)
    .attr('font-family', '"Georgia", "Palatino", serif')
    .attr('font-style', 'italic')

  labelGroupSel
    .filter((d) => d.size < 28)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => d.size + 12)
    .attr('fill', 'var(--oryx-fg-muted, #888)')
    .attr('font-size', '9px')
    .attr('font-family', '"Georgia", serif')
    .attr('font-style', 'italic')

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkSel: linkSel as any,
    nodeGroupSel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extras: { labelsG: labelGroupSel as any },
  }
}

const tick = (sel: RenderedSelections): void => {
  sel.linkSel.attr('d', (lk, index) => {
    const s = lk.source as NoteNode
    const t = lk.target as NoteNode

    return inkPath(s.x ?? 0, s.y ?? 0, t.x ?? 0, t.y ?? 0, wobbleFor(index))
  })

  sel.nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
  sel.extras?.labelsG?.attr('transform', (d: NoteNode) => `translate(${d.x ?? 0},${d.y ?? 0})`)
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
        .distance(
          (lk) =>
            (90 + ((lk.source as NoteNode).size + (lk.target as NoteNode).size) * 1.1) * linkDistanceFactor(lk.weight),
        ),
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
