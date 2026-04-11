import { select } from 'd3-selection'
import 'd3-transition'
import { zoomIdentity } from 'd3-zoom'

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

  const svg = select(svgElement)

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

  // Pre-tick so nodes have reasonable positions before first paint.
  // 150 ticks leaves ~3% alpha remaining so the settling animation still plays.
  simulation.tick(150)

  // Compute bounding box from pre-ticked node positions
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity

  for (const node of nodes) {
    const nx = node.x ?? 0
    const ny = node.y ?? 0
    const r = node.size

    if (nx - r < x0) x0 = nx - r

    if (ny - r < y0) y0 = ny - r

    if (nx + r > x1) x1 = nx + r

    if (ny + r > y1) y1 = ny + r
  }

  const PAD = 28
  const bboxW = x1 - x0 + PAD * 2
  const bboxH = y1 - y0 + PAD * 2
  const fitScale = Math.min(width / bboxW, height / bboxH, 1.5)
  const fitTx = width / 2 - ((x0 + x1) / 2) * fitScale
  const fitTy = height / 2 - ((y0 + y1) / 2) * fitScale
  const fitTransform = zoomIdentity.translate(fitTx, fitTy).scale(fitScale)

  // Render pre-ticked positions immediately
  renderer.tick(sel, nodes, links)

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

      select(this)
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

      select(this).select('.node-circle').transition().duration(160).attr('r', d.size).attr('stroke-width', 1.5)

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

  // Override the identity reset from attachZoom with the fit-to-nodes transform
  svg.call(zoomBehavior.transform, fitTransform)

  return makeControls(svgElement, zoomBehavior, simulation)
}

export { type GraphControls, type TooltipState, type GraphStyle } from './types'
