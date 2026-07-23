import { createContext, useContext } from 'react';
import type { GraphModel, NodeId } from './buildModel';
import type { TechniqueNodeDef } from '../data/schema';
import type { NodeStateStore } from './nodeStateStore';

export interface GraphInteraction {
  model: GraphModel;
  getDef: (id: NodeId) => TechniqueNodeDef | undefined;
  hasChildren: (id: NodeId) => boolean;
  /** Focus mode is active (a node is selected with focus on). The rendered subset is
   *  already the curated neighbourhood (route + siblings + next steps), so nothing in
   *  it should recede — siblings stay fully visible alongside the selected node.
   *
   *  NOTE: keep this context LEAN. Per-graph flags that flip on every click
   *  (hasSelection, focusChildrenShown, …) belong in NodeStateStore or in MapView's
   *  handler wrappers, NOT here — a context identity change re-renders every card and
   *  edge, bypassing their memoization. focusActive earns its place because it shapes
   *  every card's entrance animation and flips only on focus enter/leave. */
  focusActive: boolean;
  /** Resolve a phase id to its color / label from the current map. */
  phaseColor: (phaseId: string) => string;
  phaseLabel: (phaseId: string) => string;
  reduceMotion: boolean;
  /** Current theme. Edge stroke colours are framer-motion `animate` targets, which
   *  only interpolate literal colours (a CSS var string isn't animatable) — so
   *  DrawInEdge picks per-theme literals. Flips are rare, so the one-off full
   *  re-render a context change causes here is fine. */
  theme: 'dark' | 'light';
  toggle: (id: NodeId) => void;
  select: (id: NodeId) => void;
  /** Open an edge's detail panel (clears any node selection). */
  selectEdge: (edgeId: string) => void;
  /** Render note text inline on the card (vs. only on hover). */
  notesInline: boolean;
  /** Open the node context menu at viewport coords (right-click / long-press). `key`
   *  is the render key (drives expand/collapse); `defId` is the content id (notes,
   *  owned, copy-link). */
  openMenu: (key: NodeId, defId: NodeId, x: number, y: number) => void;
  /** View a node's note in a popover at viewport coords (tap/click the note badge).
   *  Keyed by render key. */
  openNote: (key: NodeId, label: string, x: number, y: number) => void;
  /** Per-node VOLATILE state (selected / expanded / active / dimmed / recede / owned /
   *  inapplicable / note). Lives in an external store rather than on this object so a
   *  selection or expansion only re-renders the cards whose own flags changed — not all
   *  of them. Cards read it via `useSyncExternalStore`; see {@link NodeStateStore}. */
  nodeStore: NodeStateStore;
}

const GraphInteractionContext = createContext<GraphInteraction | null>(null);

export const GraphInteractionProvider = GraphInteractionContext.Provider;

/** Custom nodes/edges read live interaction state from here instead of from
 *  node.data, keeping the React Flow node objects referentially stable. The
 *  per-node volatile flags come from `nodeStore` (a selective subscription) so this
 *  context value's identity stays stable across plain selection/expansion changes. */
export function useGraphInteraction(): GraphInteraction {
  const ctx = useContext(GraphInteractionContext);
  if (!ctx) {
    throw new Error('useGraphInteraction must be used within a GraphInteractionProvider');
  }
  return ctx;
}
