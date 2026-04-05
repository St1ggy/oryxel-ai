import * as d3 from 'd3'

import { attachZoom, buildAdjacency, linkOpacity, makeControls } from './common'
import { defaultRenderer } from './styles/default'

import type { NoteGraph } from '$lib/utils/note-graph'
import type { GraphControls, GraphStyle, NoteLink, NoteNode, StyleRenderer, TooltipState } from './types'

// Lazy-load style renderers to keep initial bundle tight
const RENDERERS: Record<GraphStyle, StyleRenderer> = {
  default: defaultRenderer,
  // remaining styles are registered dynamically below
  constellation: defaultRenderer,
  bubble: defaultRenderer,
  ink: defaultRenderer,
  cluster: defaultRenderer,
  timeline: defaultRenderer,
}

async function loadRenderer(style: GraphStyle): Promise<StyleRenderer> {
  if (style === 'default') return defaultRenderer

  switch (style) {
    case 'constellation': {
      const { constellationRenderer } = await import('./styles/constellation')

      return constellationRenderer
    }

    case 'bubble': {
      const { bubbleRenderer } = await import('./styles/bubble')

      return bubbleRenderer
    }

    case 'ink': {
      const { inkRenderer } = await import('./styles/ink')

      return inkRenderer
    }

    case 'cluster': {
      const { clusterRenderer } = await import('./styles/cluster')

      return clusterRenderer
    }

    case 'timeline': {
      const { timelineRenderer } = await import('./styles/timeline')

      return timelineRenderer
    }
  }
}

export async function initNoteGraphD3(
  svgElement: SVGSVGElement,
  graph: NoteGraph,
  canvasWidth: number,
  height: number,
  onNodeClick: (node: NoteNode) => void,
  onTooltipChange: (state: TooltipState | null) => void,
  style: GraphStyle = 'default',
): Promise<GraphControls> {
  const nodes: NoteNode[] = graph.nodes.map((n) => ({ ...n }))

  // Pre-resolve link sources/targets to NoteNode objects so that renderers
  // can read .color in their init() before the simulation starts.
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const links: NoteLink[] = graph.links.map((l) => ({
    ...l,
    source: nodeMap.get(l.source as string) ?? (l.source as NoteNode),
    target: nodeMap.get(l.target as string) ?? (l.target as NoteNode),
  }))

  const svg = d3.select(svgElement)

  svg.selectAll('*').remove()

  const width = canvasWidth || svgElement.getBoundingClientRect().width || 800

  // eslint-disable-next-line sonarjs/pseudo-random
  const uid = `g${Math.random().toString(36).slice(2, 8)}`

  const g = svg.append('g').attr('class', 'graph-root')
  const defs = g.append('defs')

  const renderer =
    RENDERERS[style] !== defaultRenderer || style === 'default' ? RENDERERS[style] : await loadRenderer(style)

  // Cache for future calls
  RENDERERS[style] = renderer

  const context = { g, defs, nodes, links, width, height, uid, svgElement }
  const sel = renderer.init(context)
  const simulation = renderer.buildSimulation(nodes, links, width, height)

  // ── Hover and click wiring ─────────────────────────────────────────────────
  const adjacency = buildAdjacency(graph.links)
  let hoveredNode: NoteNode | null = null

  function isConnected(a: string, b: string): boolean {
    return a === b || adjacency.has(`${a}|${b}`)
  }

  sel.nodeGroupSel
    .on('click', function (_event, d) {
      onTooltipChange(null)
      onNodeClick(d)
    })
    .on('mouseenter', function (event: MouseEvent, d: NoteNode) {
      hoveredNode = d

      d3.select(this)
        .select('.node-circle')
        .transition()
        .duration(160)
        .attr('r', d.size * 1.13)
        .attr('stroke-width', 2.5)

      sel.linkSel
        .transition()
        .duration(160)
        .attr('stroke-opacity', (lk) => {
          const s = (lk.source as NoteNode).id
          const t = (lk.target as NoteNode).id

          return s === d.id || t === d.id ? 0.9 : 0.04
        })

      sel.nodeGroupSel
        .transition()
        .duration(160)
        .attr('opacity', (n) => (isConnected(d.id, n.id) ? 1 : 0.18))

      const rect = svgElement.getBoundingClientRect()

      onTooltipChange({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d })
    })
    .on('mousemove', function (event: MouseEvent) {
      if (!hoveredNode) return

      const rect = svgElement.getBoundingClientRect()

      onTooltipChange({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: hoveredNode })
    })
    .on('mouseleave', function (_event, d: NoteNode) {
      hoveredNode = null

      d3.select(this).select('.node-circle').transition().duration(160).attr('r', d.size).attr('stroke-width', 1.5)

      sel.linkSel
        .transition()
        .duration(160)
        .attr('stroke-opacity', (lk) => linkOpacity(lk.weight))

      sel.nodeGroupSel.transition().duration(160).attr('opacity', 1)
      onTooltipChange(null)
    })

  simulation.on('tick', () => renderer.tick(sel, nodes, links))

  g.attr('opacity', 0).transition().duration(450).attr('opacity', 1)

  const zoomBehavior = attachZoom(svg, g)

  return makeControls(svgElement, zoomBehavior, simulation)
}

export { type GraphControls, type TooltipState, type GraphStyle } from './types'
