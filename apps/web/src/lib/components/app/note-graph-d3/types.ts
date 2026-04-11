import type { NoteLink, NoteNode } from '$lib/utils/note-graph'
import type { Simulation } from 'd3-force'
import type { Selection } from 'd3-selection'

export type GraphStyle = 'default' | 'constellation' | 'bubble' | 'ink' | 'cluster' | 'timeline'

export type TooltipState = { x: number; y: number; node: NoteNode }

export type GraphControls = {
  cleanup: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}

export type StyleContext = {
  g: Selection<SVGGElement, unknown, null, undefined>
  defs: Selection<SVGDefsElement, unknown, null, undefined>
  nodes: NoteNode[]
  links: NoteLink[]
  width: number
  height: number
  uid: string
  svgElement: SVGSVGElement
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySelection = Selection<any, any, any, any>

export type RenderedSelections = {
  linkSel: Selection<SVGElement, NoteLink, SVGGElement, unknown>
  nodeGroupSel: Selection<SVGGElement, NoteNode, SVGGElement, unknown>
  extras?: Record<string, AnySelection>
}

export type StyleRenderer = {
  init(context: StyleContext): RenderedSelections
  tick(sel: RenderedSelections, nodes: NoteNode[], links: NoteLink[]): void
  buildSimulation(nodes: NoteNode[], links: NoteLink[], width: number, height: number): Simulation<NoteNode, NoteLink>
}

export { type NoteLink, type NoteNode } from '$lib/utils/note-graph'
