import { createContext, useContext } from 'react';
import type { GraphModel, NodeId } from './buildModel';
import type { TechniqueNodeDef } from '../data/schema';

export interface GraphInteraction {
  model: GraphModel;
  getDef: (id: NodeId) => TechniqueNodeDef | undefined;
  hasChildren: (id: NodeId) => boolean;
  isExpanded: (id: NodeId) => boolean;
  isSelected: (id: NodeId) => boolean;
  /** Whether active filters dim this node (no filter active → never dimmed). */
  isDimmed: (id: NodeId) => boolean;
  /** Any node is currently selected — drives the focus-dim of unrelated nodes. */
  hasSelection: boolean;
  /** Focus mode is active (a node is selected with focus on). The rendered subset is
   *  already the curated neighbourhood (route + siblings + next steps), so nothing in
   *  it should recede — siblings stay fully visible alongside the selected node. */
  focusActive: boolean;
  /** On the path from root to the selected node (stays lit while others recede). */
  isNodeActive: (id: NodeId) => boolean;
  /** A direct next step off the selected node — kept visible (not receded) so the
   *  next choice is easy to pick while building a path. Checked by def id. */
  isNextStep: (id: NodeId) => boolean;
  /** A sibling of the selected node (a peer under the same parent) — kept visible so
   *  selecting a node never dims the alternatives at that step. Checked by def id. */
  isSibling: (id: NodeId) => boolean;
  /** Edge (by `source->target` id) lies on the active path. */
  isEdgeActive: (edgeId: string) => boolean;
  /** This edge is the one currently selected (its detail panel is open). */
  isEdgeSelected: (edgeId: string) => boolean;
  /** Resolve a phase id to its color / label from the current map. */
  phaseColor: (phaseId: string) => string;
  phaseLabel: (phaseId: string) => string;
  reduceMotion: boolean;
  toggle: (id: NodeId) => void;
  select: (id: NodeId) => void;
  /** Open an edge's detail panel (clears any node selection). */
  selectEdge: (edgeId: string) => void;
  /** This node is flagged cleared/owned. Keyed by RENDER KEY, so repeated instances
   *  of a convergence hub are independent. */
  isOwned: (key: NodeId) => boolean;
  /** This node is flagged inapplicable / ruled out (by render key). */
  isInapplicable: (key: NodeId) => boolean;
  /** This node has a non-empty user note (by render key). */
  hasNote: (key: NodeId) => boolean;
  /** The user's note text for this node (by render key; '' if none). */
  getNote: (key: NodeId) => string;
  /** Render note text inline on the card (vs. only on hover). */
  notesInline: boolean;
  /** Open the node context menu at viewport coords (right-click / long-press). `key`
   *  is the render key (drives expand/collapse); `defId` is the content id (notes,
   *  owned, copy-link). */
  openMenu: (key: NodeId, defId: NodeId, x: number, y: number) => void;
  /** View a node's note in a popover at viewport coords (tap/click the note badge).
   *  Keyed by render key. */
  openNote: (key: NodeId, label: string, x: number, y: number) => void;
}

const GraphInteractionContext = createContext<GraphInteraction | null>(null);

export const GraphInteractionProvider = GraphInteractionContext.Provider;

/** Custom nodes/edges read live interaction state from here instead of from
 *  node.data, keeping the React Flow node objects referentially stable. */
export function useGraphInteraction(): GraphInteraction {
  const ctx = useContext(GraphInteractionContext);
  if (!ctx) {
    throw new Error('useGraphInteraction must be used within a GraphInteractionProvider');
  }
  return ctx;
}
