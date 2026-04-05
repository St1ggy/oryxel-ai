import type * as d3 from 'd3'

import type { NoteLink, NoteNode } from '$lib/utils/note-graph'

export type { NoteLink, NoteNode }

export type GraphStyle = 'default' | 'constellation' | 'bubble' | 'ink' | 'cluster' | 'timeline'

export type TooltipState = { x: number; y: number; node: NoteNode }

export type GraphControls = {
  cleanup: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}

export type StyleContext = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>
  nodes: NoteNode[]
  links: NoteLink[]
  width: number
  height: number
  uid: string
  svgElement: SVGSVGElement
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySelection = d3.Selection<any, any, any, any>

export type RenderedSelections = {
  linkSel: d3.Selection<SVGElement, NoteLink, SVGGElement, unknown>
  nodeGroupSel: d3.Selection<SVGGElement, NoteNode, SVGGElement, unknown>
  extras?: Record<string, AnySelection>
}

export type StyleRenderer = {
  init(ctx: StyleContext): RenderedSelections
  tick(sel: RenderedSelections, nodes: NoteNode[], links: NoteLink[]): void
  buildSimulation(
    nodes: NoteNode[],
    links: NoteLink[],
    width: number,
    height: number,
  ): d3.Simulation<NoteNode, NoteLink>
}
