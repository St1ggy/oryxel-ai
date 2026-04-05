import * as d3 from 'd3'

import { linkThickness, truncateLabel } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Bubble / watercolour style ────────────────────────────────────────────────
// Circles use a goo/metaball SVG filter so nearby nodes visually dissolve into
// each other.  Labels are rendered in a separate unfiltered group so they stay
// readable.

const init = (context: StyleContext): RenderedSelections => {
  const { g, defs, nodes, links, uid } = context

  // ── Goo (metaball) filter ──────────────────────────────────────────────────
  // Blur all circles together, then threshold the alpha — circles that are
  // close enough overlap in the blurred image and merge into a single blob.
  const gooFilter = defs
    .append('filter')
    .attr('id', `${uid}-goo`)
    .attr('x', '-40%')
    .attr('y', '-40%')
    .attr('width', '180%')
    .attr('height', '180%')

  gooFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 14).attr('result', 'blur')

  gooFilter
    .append('feColorMatrix')
    .attr('in', 'blur')
    .attr('mode', 'matrix')
    // Keep RGB as-is; amplify alpha (×20) then subtract 8 — only areas where
    // blurred alpha > 0.4 survive, creating sharp merged blobs.
    .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8')

  // Links — shown on hover only
  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGLineElement, NoteLink>('line')
    .data(links)
    .join('line')
    .attr('stroke', (lk) => (lk.source as NoteNode).color)
    .attr('stroke-width', (lk) => linkThickness(lk.weight))
    .attr('stroke-opacity', 0)
    .attr('stroke-linecap', 'round')

  // ── Goo-filtered node circles ──────────────────────────────────────────────
  // The filter is on the parent <g> so all circles are blurred together before
  // the threshold, producing the metaball merge effect.
  const gooG = g.append('g').attr('class', 'nodes-goo').attr('filter', `url(#${uid}-goo)`)

  const nodeGroupSel = gooG.selectAll<SVGGElement, NoteNode>('g').data(nodes).join('g').style('cursor', 'pointer')

  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.82)

  // ── Unfiltered labels (sibling of goo group, not inside it) ───────────────
  const labelsG = g.append('g').attr('class', 'nodes-labels').attr('pointer-events', 'none')

  const labelGroupSel = labelsG.selectAll<SVGGElement, NoteNode>('g').data(nodes).join('g')

  labelGroupSel
    .filter((d) => d.size >= 28)
    .append('text')
    .text((d) => truncateLabel(d.name, d.size))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'white')
    .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.28, 13))}px`)
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('font-weight', '600')

  labelGroupSel
    .filter((d) => d.size < 28)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => d.size + 12)
    .attr('fill', 'var(--oryx-fg-muted, #888)')
    .attr('font-size', '9px')
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkSel: linkSel as any,
    nodeGroupSel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extras: { labelsG: labelGroupSel as any },
  }
}

const tick = (sel: RenderedSelections): void => {
  sel.linkSel
    .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
    .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
    .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
    .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)

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
    .velocityDecay(0.35)
    .force(
      'link',
      d3
        .forceLink<NoteNode, NoteLink>(links)
        .id((d) => d.id)
        .distance((lk) => 60 + ((lk.source as NoteNode).size + (lk.target as NoteNode).size) * 0.9),
    )
    .force(
      'charge',
      d3.forceManyBody<NoteNode>().strength((d) => -(300 + d.size * 4)),
    )
    .force('x', d3.forceX<NoteNode>(width / 2).strength(0.05))
    .force('y', d3.forceY<NoteNode>(height / 2).strength(0.05))
    .force(
      'collide',
      d3.forceCollide<NoteNode>().radius((d) => d.size * 0.7 + 8),
    )

export const bubbleRenderer: StyleRenderer = { init, tick, buildSimulation }

export { linkOpacity } from '../common'
