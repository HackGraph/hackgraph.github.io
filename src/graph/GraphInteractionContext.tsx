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
  /** On the path from root to the selected node (stays lit while others recede). */
  isNodeActive: (id: NodeId) => boolean;
  /** A direct next step off the selected node — kept visible (not receded) so the
   *  next choice is easy to pick while building a path. Checked by def id. */
  isNextStep: (id: NodeId) => boolean;
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
