import type { Node, Edge } from '@xyflow/react';

/** Minimal per-node render data. Everything else is looked up from the model
 *  via the interaction context, so node objects stay stable across renders. */
export interface TechniqueNodeData extends Record<string, unknown> {
  /** Order among the nodes revealed in the same expansion, for entrance stagger. */
  staggerIndex: number;
  /** Content/model id this node renders. Normally === the React Flow node id; in
   *  an isolated path a repeated node gets a distinct key (`defId__2`) while
   *  `defId` still points at the one content definition. Absent ⇒ id IS the defId. */
  defId?: string;
  /** Which visit this is (1, 2, 3…) for a repeated node (isolate path, or a
   *  main-graph loop unrolled forward). >1 renders a "#n" badge. */
  instanceIndex?: number;
  /** "Isolate path" mode is on and this node is NOT on the lit path → fade it out
   *  (kept mounted, not unmounted, so the toggle glides instead of popping). */
  faded?: boolean;
}

export interface DrawInEdgeData extends Record<string, unknown> {
  label?: string;
  /** Target sits left of / level with the source — a convergence that loops
   *  back to an earlier step; rendered as a distinct dashed "return" edge. */
  backward?: boolean;
  /** Emphasis state, fed through edge DATA (not context) because React Flow does
   *  not reliably re-render edge components on a context change. */
  active?: boolean;
  selected?: boolean;
  /** Something is selected, so non-emphasised edges should recede (focus-dim). */
  dimIdle?: boolean;
  /** Edge OUT of the selected node — a next step; kept visible (not receded). */
  nextStep?: boolean;
  /** "Isolate path" mode is on and this edge is not fully on the lit path → fade
   *  it out (kept mounted so the toggle glides instead of popping). */
  faded?: boolean;
}

export type AppNode = Node<TechniqueNodeData, 'technique'>;
export type AppEdge = Edge<DrawInEdgeData>;
