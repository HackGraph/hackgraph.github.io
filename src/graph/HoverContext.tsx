import { createContext, useContext } from 'react';
import type { NodeId } from './buildModel';

/**
 * Hover state lives in its OWN tiny context (separate from GraphInteraction) so
 * moving the mouse over nodes only re-renders the edges that read it — not every
 * node and panel. Hovering a node lights its full lineage back to the root (plus
 * its outgoing edges) so the path to it is easy to trace, with no clutter at rest.
 */
interface HoverState {
  hoveredId: NodeId | null;
  /** Edge keys on the hovered node's lineage (root → node) — lit on hover. */
  hoverEdges: ReadonlySet<string>;
  /**
   * Whether pointer-driven hover should be honoured right now. Selecting a node
   * pans the camera, sliding nodes/edges under a STILL cursor — the browser fires
   * enter events for them though the pointer never moved, spuriously tracing their
   * paths. This returns false from a selection until the pointer genuinely moves,
   * so a pan can't hijack the highlight. Node hover is gated in MapView; edges read
   * this directly (their hover is local state).
   */
  canHover: () => boolean;
}

const HoverContext = createContext<HoverState>({
  hoveredId: null,
  hoverEdges: new Set(),
  canHover: () => true,
});

export const HoverProvider = HoverContext.Provider;
export const useHover = () => useContext(HoverContext);
