import type { NodeId } from './buildModel';
import { edgeKey } from './buildModel';
import type { VisibleGraph } from './visibility';
import { pathInRendered } from './visibility';

/** The rendered-graph inputs the hover trace is computed against. */
export interface HoverSource {
  graph: VisibleGraph;
  rootId: NodeId;
  /** The selected node's own route is already lit by the selection highlight —
   *  hovering it must not re-trace the canonical longest route under it. */
  selectedId: string | null;
  /** Backward loop-back edge ids the trace never climbs (see resolveUnroll). */
  backEdges: ReadonlySet<string>;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Hover state as an EXTERNAL store (same pattern as NodeStateStore), so pointing at
 * a node re-renders only the edges whose emphasis actually changed — and, crucially,
 * never re-renders MapView or the overlay panels at all. Previously `hoveredId` was
 * MapView state: every hover enter/leave re-rendered the whole 980-line tree, and the
 * un-memoized context value re-rendered every edge on ANY MapView render.
 *
 * Edges subscribe via `useSyncExternalStore` with a PACKED-NUMBER snapshot
 * (`edgeBits`) — a primitive, so React bails out whenever an edge's bits are
 * unchanged. Moving hover between two nodes now touches only the edges on either
 * trace (bit 1); entering/leaving hover entirely flips the dim bit for all
 * (a genuine visual change — everything not on the trace recedes).
 */
export class HoverStore {
  private listeners = new Set<() => void>();
  private source: HoverSource | null = null;
  private hoveredId: string | null = null;
  private hoverEdges: ReadonlySet<string> = EMPTY_SET;
  // Selecting a node pans the camera, which slides content under a STILL cursor —
  // the browser fires enter events though the pointer never moved. Hover enters are
  // honoured only after genuine movement (armed), and every selection disarms.
  private armed = false;

  /** Stable identity (instance arrow) so `useSyncExternalStore` never re-subscribes. */
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  /** Pointer genuinely moved — hover enters are honoured again. */
  arm = (): void => {
    this.armed = true;
  };

  /** Whether pointer-driven hover should be honoured right now (see `armed`). */
  canHover = (): boolean => this.armed;

  /** Push the rendered graph the trace walks over. Recomputes a live trace in place
   *  (e.g. an expansion changed the drawn edges under the pointer). */
  setSource(source: HoverSource): void {
    this.source = source;
    if (this.hoveredId != null) {
      this.hoverEdges = this.traceOf(this.hoveredId);
      this.emit();
    }
  }

  /** A selection happened: disarm (the camera is about to pan) and drop any trace —
   *  the selection's own lit path wins until the pointer next moves. */
  selectionChanged(): void {
    this.armed = false;
    this.set(null, true);
  }

  /** Hover enter/leave from the canvas. Leave (null) is always honoured; enter only
   *  when the pointer actually moved since the last selection. */
  setHovered = (id: string | null): void => {
    this.set(id, false);
  };

  /** Packed per-edge snapshot: bit 1 — this edge is on the hovered node's trace
   *  (lineage edge, or straight out of the hovered node); bit 2 — some node is
   *  hovered (everything off the trace recedes). */
  edgeBits = (edgeId: string, edgeSource: string): number =>
    ((this.hoverEdges.has(edgeId) || (this.hoveredId != null && edgeSource === this.hoveredId) ? 1 : 0) |
      (this.hoveredId != null ? 2 : 0));

  private set(id: string | null, force: boolean): void {
    if (id !== null && !this.armed && !force) return;
    if (id === this.hoveredId) return;
    this.hoveredId = id;
    this.hoverEdges = id != null ? this.traceOf(id) : EMPTY_SET;
    this.emit();
  }

  /** Edges on the hovered node's lineage (root → node, along the drawn edges), so
   *  hovering traces the whole path back to the start — except the selected node,
   *  whose route the selection highlight already owns. */
  private traceOf(id: string): ReadonlySet<string> {
    const s = this.source;
    if (!s || id === s.selectedId) return EMPTY_SET;
    const lin = pathInRendered(s.graph, s.rootId, id, s.backEdges);
    if (lin.length < 2) return EMPTY_SET;
    const set = new Set<string>();
    for (let i = 1; i < lin.length; i++) set.add(edgeKey(lin[i - 1], lin[i]));
    return set;
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}
