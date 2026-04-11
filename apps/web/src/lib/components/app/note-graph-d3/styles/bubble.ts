import { type Simulation, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'

import { lightenHex, linkDistanceFactor, linkOpacity, linkThickness, truncateLabel } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Bubble style — crisp translucent circles, links trimmed to circle edge ────

// Returns the point on the src→tgt ray at distance `trim` from src.
function trimmedEnd(sx: number, sy: number, tx: number, ty: number, trim: number): [number, number] {
  const dx = tx - sx
  const dy = ty - sy
  const length = Math.hypot(dx, dy) || 1

  return [sx + (dx / length) * trim, sy + (dy / length) * trim]
}

const init = (context: StyleContext): RenderedSelections => {
  const { g, nodes, links } = context

  // Links trimmed to node-circle edge so they appear to dissolve into nodes.
  // Actual coordinates are set every tick in trimmedEnd().
  const linkSel = g
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGLineElement, NoteLink>('line')
    .data(links)
    .join('line')
    .attr('stroke', (lk) => (lk.source as NoteNode).color)
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

  // Labels
  nodeGroupSel
    .filter((d) => d.size >= 28)
    .append('text')
    .text((d) => truncateLabel(d.name, d.size))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', (d) => lightenHex(d.color, -0.1))
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
    .attr('x1', (lk) => {
      const s = lk.source as NoteNode
      const t = lk.target as NoteNode

      return trimmedEnd(s.x ?? 0, s.y ?? 0, t.x ?? 0, t.y ?? 0, s.size * 0.92)[0]
    })
    .attr('y1', (lk) => {
      const s = lk.source as NoteNode
      const t = lk.target as NoteNode

      return trimmedEnd(s.x ?? 0, s.y ?? 0, t.x ?? 0, t.y ?? 0, s.size * 0.92)[1]
    })
    .attr('x2', (lk) => {
      const s = lk.source as NoteNode
      const t = lk.target as NoteNode

      return trimmedEnd(t.x ?? 0, t.y ?? 0, s.x ?? 0, s.y ?? 0, t.size * 0.92)[0]
    })
    .attr('y2', (lk) => {
      const s = lk.source as NoteNode
      const t = lk.target as NoteNode

      return trimmedEnd(t.x ?? 0, t.y ?? 0, s.x ?? 0, s.y ?? 0, t.size * 0.92)[1]
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
      forceManyBody<NoteNode>().strength((d) => -(400 + d.size * 5)),
    )
    .force('x', forceX<NoteNode>(width / 2).strength(0.05))
    .force('y', forceY<NoteNode>(height / 2).strength(0.05))
    .force(
      'collide',
      forceCollide<NoteNode>().radius((d) => d.size + 18),
    )

export const bubbleRenderer: StyleRenderer = { init, tick, buildSimulation }
