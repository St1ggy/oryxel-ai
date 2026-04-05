import * as d3 from 'd3'

import type { GraphControls, NoteLink, NoteNode } from './types'

// ── Color utilities ──────────────────────────────────────────────────────────

export function lightenHex(hex: string, amount: number): string {
  const color = d3.hsl(hex)

  color.l = Math.min(0.97, color.l + amount)

  return color.formatHex()
}

// ── Link weight helpers ───────────────────────────────────────────────────────

export function linkThickness(weight: number): number {
  if (weight <= 2) return 1

  if (weight <= 6) return 1.5

  if (weight <= 12) return 2.5

  return Math.min(3.5 + (weight - 12) * 0.12, 5.5)
}

export function linkOpacity(weight: number): number {
  if (weight <= 2) return 0.1

  if (weight <= 6) return 0.2

  if (weight <= 12) return 0.32

  return 0.48
}

// ── Label truncation ──────────────────────────────────────────────────────────

// Truncates a node label to fit inside a circle of `size` radius.
// Uses an approximate char-width heuristic; avoids SVG clipPath overhead.
export function truncateLabel(name: string, size: number): string {
  const fontSize = Math.max(9, Math.min(size * 0.26, 13))
  // usable diameter minus padding
  const maxWidth = size * 1.7
  // average character width ≈ 55% of font-size for Inter
  const charWidth = fontSize * 0.55
  const maxChars = Math.floor(maxWidth / charWidth)

  if (name.length <= maxChars) return name

  return `${name.slice(0, Math.max(1, maxChars - 1))}…`
}

// ── Adjacency ─────────────────────────────────────────────────────────────────

export function buildAdjacency(links: NoteLink[]): Set<string> {
  const adjacency = new Set<string>()

  for (const lk of links) {
    const source = typeof lk.source === 'string' ? lk.source : (lk.source as NoteNode).id
    const tgt = typeof lk.target === 'string' ? lk.target : (lk.target as NoteNode).id

    adjacency.add(`${source}|${tgt}`)
    adjacency.add(`${tgt}|${source}`)
  }

  return adjacency
}

// ── SVG defs builders ─────────────────────────────────────────────────────────

export function buildShadowFilter(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>, uid: string): void {
  const shadow = defs
    .append('filter')
    .attr('id', `${uid}-shadow`)
    .attr('x', '-40%')
    .attr('y', '-40%')
    .attr('width', '180%')
    .attr('height', '180%')

  shadow
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 2)
    .attr('stdDeviation', 5)
    .attr('flood-color', 'rgba(0,0,0,0.18)')
}

export function buildNodeGradients(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  nodes: NoteNode[],
  uid: string,
): d3.Selection<SVGRadialGradientElement, NoteNode, SVGDefsElement, unknown> {
  const nodeGrads = defs
    .selectAll<SVGRadialGradientElement, NoteNode>('radialGradient')
    .data(nodes)
    .join('radialGradient')
    .attr('id', (_d, index) => `${uid}-ng-${index}`)
    .attr('cx', '38%')
    .attr('cy', '32%')
    .attr('r', '70%')
    .attr('gradientUnits', 'objectBoundingBox')

  nodeGrads
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', (d) => lightenHex(d.color, 0.38))
    .attr('stop-opacity', 1)
  nodeGrads
    .append('stop')
    .attr('offset', '65%')
    .attr('stop-color', (d) => d.color)
    .attr('stop-opacity', 0.92)
  nodeGrads
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', (d) => lightenHex(d.color, -0.12))
    .attr('stop-opacity', 1)

  return nodeGrads
}

export function buildLinkGradients(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  links: NoteLink[],
  uid: string,
): d3.Selection<SVGLinearGradientElement, NoteLink, SVGDefsElement, unknown> {
  const linkGrads = defs
    .selectAll<SVGLinearGradientElement, NoteLink>('linearGradient')
    .data(links)
    .join('linearGradient')
    .attr('id', (_lk, index) => `${uid}-lg-${index}`)
    .attr('gradientUnits', 'userSpaceOnUse')

  linkGrads
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', (lk) => (lk.source as NoteNode).color)
    .attr('stop-opacity', 0.8)
  linkGrads
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', (lk) => (lk.target as NoteNode).color)
    .attr('stop-opacity', 0.8)

  return linkGrads
}

// ── Zoom ──────────────────────────────────────────────────────────────────────

export function attachZoom(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
): d3.ZoomBehavior<SVGSVGElement, unknown> {
  const zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 6])
    .on('zoom', (event) => {
      g.attr('transform', event.transform.toString())
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)

  return zoomBehavior
}

// ── Controls ──────────────────────────────────────────────────────────────────

export function makeControls(
  svgElement: SVGSVGElement,
  zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>,
  simulation: d3.Simulation<NoteNode, NoteLink>,
): GraphControls {
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
