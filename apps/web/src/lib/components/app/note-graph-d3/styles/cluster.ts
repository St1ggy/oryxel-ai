import * as d3 from 'd3'

import { buildShadowFilter, lightenHex, linkDistanceFactor, linkOpacity, linkThickness, truncateLabel } from '../common'

import type { NoteLink, NoteNode, RenderedSelections, StyleContext, StyleRenderer } from '../types'

// ── Cluster style — family-grouped layout with halos and mixed link styles ────

type FamilyCenter = { x: number; y: number; color: string; count: number }

function buildFamilyCenters(nodes: NoteNode[], width: number, height: number): Map<string, FamilyCenter> {
  const families = [...new Map(nodes.map((n) => [n.family, n.color])).entries()]
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.28
  const centers = new Map<string, FamilyCenter>()

  for (const [index, [family, color]] of families.entries()) {
    const angle = (index / families.length) * 2 * Math.PI - Math.PI / 2
    const count = nodes.filter((n) => n.family === family).length

    centers.set(family, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      color,
      count,
    })
  }

  return centers
}

const init = (context: StyleContext): RenderedSelections => {
  const { g, defs, nodes, links, width, height, uid } = context

  buildShadowFilter(defs, uid)

  const familyCenters = buildFamilyCenters(nodes, width, height)

  // Halo filter
  const haloFilter = defs
    .append('filter')
    .attr('id', `${uid}-halo`)
    .attr('x', '-60%')
    .attr('y', '-60%')
    .attr('width', '220%')
    .attr('height', '220%')

  haloFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 28)

  // Family halos (behind everything)
  const haloData = [...familyCenters.entries()]

  g.append('g')
    .attr('class', 'halos')
    .selectAll<SVGCircleElement, [string, FamilyCenter]>('circle')
    .data(haloData)
    .join('circle')
    .attr('cx', ([, c]) => c.x)
    .attr('cy', ([, c]) => c.y)
    .attr('r', ([, c]) => 70 + c.count * 10)
    .attr('fill', ([, c]) => c.color)
    .attr('fill-opacity', ([, c]) => Math.min(0.03 + c.count * 0.018, 0.22))
    .attr('filter', `url(#${uid}-halo)`)
    .attr('pointer-events', 'none')

  // Classify links
  const intraLinks = links.filter((lk) => (lk.source as NoteNode).family === (lk.target as NoteNode).family)
  const crossLinks = links.filter((lk) => (lk.source as NoteNode).family !== (lk.target as NoteNode).family)

  const linkG = g.append('g').attr('class', 'links')

  // Cross-family links (dashed, thinner)
  const crossSel = linkG
    .selectAll<SVGLineElement, NoteLink>('line.cross')
    .data(crossLinks)
    .join('line')
    .attr('class', 'cross')
    .attr('stroke', (lk) => (lk.source as NoteNode).color)
    .attr('stroke-width', (lk) => linkThickness(lk.weight) * 0.7)
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight) * 0.55)
    .attr('stroke-dasharray', '5 4')
    .attr('stroke-linecap', 'round')

  // Intra-family links (solid, full thickness)
  const intraSel = linkG
    .selectAll<SVGLineElement, NoteLink>('line.intra')
    .data(intraLinks)
    .join('line')
    .attr('class', 'intra')
    .attr('stroke', (lk) => lightenHex((lk.source as NoteNode).color, 0.15))
    .attr('stroke-width', (lk) => linkThickness(lk.weight) * 1.1)
    .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))
    .attr('stroke-linecap', 'round')

  // Merge into a single linkSel that index.ts can drive (all lines)
  // We return the full union selection
  const allLinks = [...crossLinks, ...intraLinks]
  const linkSel = linkG.selectAll<SVGLineElement, NoteLink>('line').data(allLinks)

  const nodeGroupSel = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, NoteNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')

  // Glow ring
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-glow')
    .attr('r', (d) => d.size + 5)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.14)
    .attr('pointer-events', 'none')

  // Main circle
  nodeGroupSel
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => d.size)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', 0.82)
    .attr('stroke', (d) => lightenHex(d.color, 0.2))
    .attr('stroke-width', 1.5)
    .attr('filter', `url(#${uid}-shadow)`)

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

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkSel: linkSel as any,
    nodeGroupSel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extras: { intraSel: intraSel as any, crossSel: crossSel as any, familyCenters: familyCenters as any },
  }
}

const tick = (sel: RenderedSelections): void => {
  function updateLines(lineSel: d3.Selection<SVGLineElement, NoteLink, SVGGElement, unknown>): void {
    lineSel
      .attr('x1', (lk) => (lk.source as NoteNode).x ?? 0)
      .attr('y1', (lk) => (lk.source as NoteNode).y ?? 0)
      .attr('x2', (lk) => (lk.target as NoteNode).x ?? 0)
      .attr('y2', (lk) => (lk.target as NoteNode).y ?? 0)
  }

  const { intraSel, crossSel } = sel.extras ?? {}

  if (intraSel) updateLines(intraSel as d3.Selection<SVGLineElement, NoteLink, SVGGElement, unknown>)

  if (crossSel) updateLines(crossSel as d3.Selection<SVGLineElement, NoteLink, SVGGElement, unknown>)

  sel.nodeGroupSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
}

const buildSimulation = (
  nodes: NoteNode[],
  links: NoteLink[],
  width: number,
  height: number,
): d3.Simulation<NoteNode, NoteLink> => {
  const familyCenters = buildFamilyCenters(nodes, width, height)

  return (
    d3
      .forceSimulation<NoteNode>(nodes)
      .velocityDecay(0.3)
      .force(
        'link',
        d3
          .forceLink<NoteNode, NoteLink>(links)
          .id((d) => d.id)
          .distance((lk) => {
            const s = lk.source as NoteNode
            const t = lk.target as NoteNode
            const sameFam = s.family === t.family
            const base = sameFam ? 60 + (s.size + t.size) * 0.8 : 140 + (s.size + t.size) * 1.4

            return base * linkDistanceFactor(lk.weight)
          }),
      )
      .force(
        'charge',
        d3.forceManyBody<NoteNode>().strength((d) => -(500 + d.size * 7)),
      )
      // Stronger pull toward family center so clusters stay compact and distinct
      .force('x', d3.forceX<NoteNode>((d) => familyCenters.get(d.family)?.x ?? width / 2).strength(0.28))
      .force('y', d3.forceY<NoteNode>((d) => familyCenters.get(d.family)?.y ?? height / 2).strength(0.28))
      .force(
        'collide',
        d3.forceCollide<NoteNode>().radius((d) => d.size + 22),
      )
  )
}

export const clusterRenderer: StyleRenderer = { init, tick, buildSimulation }
