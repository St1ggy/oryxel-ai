import { type Simulation, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'

import { linkDistanceFactor, linkOpacity, linkThickness, truncateLabel } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Timeline style — tier-based Y lanes, quadratic bezier cross-tier links ────

type TierKey = 'top' | 'heart' | 'base' | 'unknown'

function tierY(tier: string, height: number): number {
  const map: Record<TierKey, number> = {
    top: height * 0.18,
    heart: height * 0.5,
    base: height * 0.82,
    unknown: height * 0.5,
  }

  return map[tier as TierKey] ?? height * 0.5
}

function bezierPath(x1: number, y1: number, x2: number, y2: number, sameRow: boolean): string {
  if (sameRow) {
    // bow upward for same-tier
    const mx = (x1 + x2) / 2
    const my = Math.min(y1, y2) - 28

    return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`
  }

  // cross-tier: bow sideways
  const cx = (x1 + x2) / 2 + (y2 - y1) * 0.35
  const cy = (y1 + y2) / 2

  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`
}

const TIERS: TierKey[] = ['top', 'heart', 'base']

const init = (context: StyleContext): RenderedSelections => {
  const { g, nodes, links, width, height } = context

  // Tier band heights
  const bandHeight = height * 0.26

  const tierColors: Record<TierKey, string> = {
    top: '#f59e0b',
    heart: '#ec4899',
    base: '#8b5cf6',
    unknown: '#6b7280',
  }

  const tierLabels: Record<TierKey, string> = {
    top: 'Top',
    heart: 'Heart',
    base: 'Base',
    unknown: '',
  }

  // Pre-position nodes to their tier Y so the simulation starts in the right lane
  for (const node of nodes) {
    node.y = tierY(node.tier, height)
  }

  // Horizontal bands
  const bandG = g.append('g').attr('class', 'bands')

  for (const tier of TIERS) {
    const cy = tierY(tier, height)

    bandG
      .append('rect')
      .attr('x', 0)
      .attr('y', cy - bandHeight / 2)
      .attr('width', width)
      .attr('height', bandHeight)
      .attr('fill', tierColors[tier])
      .attr('fill-opacity', 0.04)
      .attr('pointer-events', 'none')

    bandG
      .append('text')
      .text(tierLabels[tier])
      .attr('x', 12)
      .attr('y', cy - bandHeight / 2 + 14)
      .attr('fill', tierColors[tier])
      .attr('fill-opacity', 0.55)
      .attr('font-size', '10px')
      .attr('font-family', 'var(--font-body, Inter, sans-serif)')
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.08em')
      .attr('text-transform', 'uppercase')
      .attr('pointer-events', 'none')
  }

  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGPathElement, NoteLink>('path')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (lk) => (lk.source as NoteNode).color)
    .attr('stroke-width', (lk) => linkThickness(lk.weight))
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight) * 0.7)
    .attr('stroke-linecap', 'round')

  const nodeGroupSel = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, NoteNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')

  // Main circle — semi-transparent flat fill
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.75)
    .attr('stroke', (d) => d.color)
    .attr('stroke-opacity', 0.9)
    .attr('stroke-width', (d) => (d.tier === 'unknown' ? 0 : 1.5))
    // Dashed stroke for unknown tier nodes
    .attr('stroke-dasharray', (d) => (d.tier === 'unknown' ? '4 3' : null))

  // Labels
  nodeGroupSel
    .filter((d) => d.size >= 28)
    .append('text')
    .text((d) => truncateLabel(d.name, d.size))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'white')
    .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.26, 13))}px`)
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('font-weight', '500')
    .attr('pointer-events', 'none')

  nodeGroupSel
    .filter((d) => d.size < 28)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => d.size + 12)
    .attr('fill', 'var(--oryx-fg-muted, #888)')
    .attr('font-size', '9px')
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('pointer-events', 'none')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { linkSel: linkSel as any, nodeGroupSel }
}

const tick = (sel: RenderedSelections): void => {
  sel.linkSel.attr('d', (lk) => {
    const s = lk.source as NoteNode
    const t = lk.target as NoteNode
    const sameRow = s.tier === t.tier

    return bezierPath(s.x ?? 0, s.y ?? 0, t.x ?? 0, t.y ?? 0, sameRow)
  })

  sel.nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
}

const buildSimulation = (
  nodes: NoteNode[],
  links: NoteLink[],
  width: number,
  height: number,
): Simulation<NoteNode, NoteLink> =>
  forceSimulation<NoteNode>(nodes)
    .velocityDecay(0.32)
    .force(
      'link',
      forceLink<NoteNode, NoteLink>(links)
        .id((d) => d.id)
        .distance(
          (lk) =>
            (80 + ((lk.source as NoteNode).size + (lk.target as NoteNode).size) * 1) * linkDistanceFactor(lk.weight),
        ),
    )
    .force(
      'charge',
      forceManyBody<NoteNode>().strength((d) => -(450 + d.size * 6)),
    )
    .force('x', forceX<NoteNode>(width / 2).strength(0.04))
    .force('y', forceY<NoteNode>((d) => tierY(d.tier, height)).strength(0.55))
    .force(
      'collide',
      forceCollide<NoteNode>().radius((d) => d.size + 32),
    )

export const timelineRenderer: StyleRenderer = { init, tick, buildSimulation }
