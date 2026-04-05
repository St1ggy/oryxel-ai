import * as d3 from 'd3'

import {
  buildLinkGradients,
  buildNodeGradients,
  buildShadowFilter,
  lightenHex,
  linkOpacity,
  linkThickness,
} from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Default style — gradient bubbles with radial fills ────────────────────────

const init = (ctx: StyleContext): RenderedSelections => {
  const { g, defs, nodes, links, uid } = ctx

  buildShadowFilter(defs, uid)
  const linkGrads = buildLinkGradients(defs, links, uid)
  buildNodeGradients(defs, nodes, uid)

  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGLineElement, NoteLink>('line')
    .data(links)
    .join('line')
    .attr('stroke', (_lk, index) => `url(#${uid}-lg-${index})`)
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

  // Outer glow ring
  nodeGroupSel.append('circle').attr('class', 'node-glow').attr('r', (d) => d.size + 5).attr('fill', (d) => d.color).attr('fill-opacity', 0.12).attr('pointer-events', 'none')

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

  // Inner highlight
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

  // Labels
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { linkSel: linkSel as any, nodeGroupSel, extras: { linkGrads: linkGrads as any } }
}

const tick = (sel: RenderedSelections, nodes: NoteNode[], links: NoteLink[]): void => {
  const linkGrads = sel.extras?.['linkGrads']

  if (linkGrads) {
    linkGrads
      .attr('x1', (_lk: NoteLink, index: number) => (links[index].source as NoteNode).x ?? 0)
      .attr('y1', (_lk: NoteLink, index: number) => (links[index].source as NoteNode).y ?? 0)
      .attr('x2', (_lk: NoteLink, index: number) => (links[index].target as NoteNode).x ?? 0)
      .attr('y2', (_lk: NoteLink, index: number) => (links[index].target as NoteNode).y ?? 0)
  }

  sel.linkSel
    .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
    .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
    .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
    .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)

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
    .force('charge', d3.forceManyBody<NoteNode>().strength((d) => -(600 + d.size * 8)))
    .force('x', d3.forceX<NoteNode>(width / 2).strength(0.04))
    .force('y', d3.forceY<NoteNode>(height / 2).strength(0.04))
    .force('collide', d3.forceCollide<NoteNode>().radius((d) => d.size + 28))

export const defaultRenderer: StyleRenderer = { init, tick, buildSimulation }
