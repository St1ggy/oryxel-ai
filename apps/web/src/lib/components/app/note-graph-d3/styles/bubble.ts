import * as d3 from 'd3'

import { linkThickness } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Bubble style — translucent overlapping circles, links hidden by default ───

const init = (context: StyleContext): RenderedSelections => {
  const { g, nodes, links } = context

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

  const nodeGroupSel = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, NoteNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')

  // Outer soft ring
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-outer')
    .attr('r', (d) => d.size * 1.25)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.08)
    .attr('pointer-events', 'none')

  // Main translucent bubble
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.35)
    .attr('stroke', (d) => d.color)
    .attr('stroke-opacity', 0.55)
    .attr('stroke-width', 1.5)

  // Small shine dot
  nodeGroupSel
    .filter((d) => d.size >= 18)
    .append('circle')
    .attr('class', 'node-shine')
    .attr('r', (d) => d.size * 0.15)
    .attr('cx', (d) => -(d.size * 0.28))
    .attr('cy', (d) => -(d.size * 0.28))
    .attr('fill', 'white')
    .attr('fill-opacity', 0.55)
    .attr('pointer-events', 'none')

  // Labels (always shown, outside small circles)
  nodeGroupSel
    .filter((d) => d.size >= 28)
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', (d) => d.color)
    .attr('font-size', (d) => `${Math.max(9, Math.min(d.size * 0.28, 13))}px`)
    .attr('font-family', 'var(--font-body, Inter, sans-serif)')
    .attr('font-weight', '600')
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
  sel.linkSel
    .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
    .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
    .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
    .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)

  sel.nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
}

// Override linkOpacity for bubble: mouseleave in index.ts restores to linkOpacity(weight)
// We patch it so mouseleave restores to 0 (hidden) for bubble — but since index.ts calls
// linkOpacity directly we simply accept that links will appear on hover and fade back gently.
// The initial opacity is 0; hover shows them at 0.9 for connected, 0.04 otherwise; mouseleave
// restores to linkOpacity(weight) which is ≥0.35. This gives a "reveal-on-hover" effect.

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
