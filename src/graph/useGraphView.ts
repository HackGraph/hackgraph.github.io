import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useReactFlow,
  useNodesInitialized,
  applyNodeChanges,
  type OnNodesChange,
} from '@xyflow/react';
import type { GraphModel, NodeId } from './buildModel';
import {
  type IsolatePath,
  type RenderInstance,
} from './visibility';
import { layoutGraph, resolveUnrollCached, type XY } from './layout';
import { SizeCache, DEFAULT_NODE_SIZE } from './sizeCache';
import type { AppNode, AppEdge } from './appNode';

interface UseGraphViewParams {
  model: GraphModel;
  expanded: ReadonlySet<NodeId>;
  lastToggled: NodeId;
  /** Currently-selected node (detail panel open) — gets focused in the left space. */
  selectedId: NodeId | null;
  reduceMotion: boolean;
  /** "Isolate path" mode: when set, render ONLY this instanced attack path
   *  (repeated `repeatable` nodes get distinct keys) instead of the
   *  expansion-derived visible set. */
  isolate?: IsolatePath | null;
  /** Signature that changes when inline notes alter card heights; a change forces a
   *  re-measure + re-layout so the taller/shorter cards don't overlap. */
  notesLayoutKey?: string;
  /** Whether the detail panel is currently showing. The focus camera reserves the
   *  space it occupies (right on desktop, bottom on mobile) so the focused node lands
   *  CENTRED in the visible area, not under the panel — and re-centres when it closes. */
  panelOpen?: boolean;
  /** Focus-mode camera intent for the current selection: 'node' (body click — centre on
   *  the node) vs 'children' (chevron — frame the node + its next steps so what's next
   *  comes into view). Lets one selection produce either camera without a second move. */
  focusCam?: 'node' | 'children';
}

/** Width (px) the right-hand desktop detail panel occludes, incl. its margins. */
const PANEL_OFFSET = 384;
/** Stable style object that disables hit-testing on a faded (off-focus) node wrapper. */
const FADED_NODE_STYLE = { pointerEvents: 'none' as const };
/** Fraction of viewport height the mobile panel occludes when selecting. It now
 *  opens as a compact bottom PEEK by default, so only a small shift is needed to
 *  keep the tapped node clear of it (the user expands to read when they choose). */
const PANEL_BOTTOM_FRACTION = 0.16;

interface UseGraphViewResult {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  ready: boolean;
  /** A JS position tween is in flight (isolate enter/leave) — the canvas suppresses
   *  the CSS transform transition meanwhile so the two don't fight. */
  tweening: boolean;
}

/** Bounding rect (top-left + size) of a set of laid-out keys, for camera framing. */
function boundsOf(
  keys: Iterable<string>,
  positions: ReadonlyMap<string, XY>,
  cache: SizeCache,
) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const k of keys) {
    const p = positions.get(k);
    if (!p) continue;
    const s = cache.get(k);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.width);
    maxY = Math.max(maxY, p.y + s.height);
  }
  if (minX === Infinity) return { x: 0, y: 0, width: 1, height: 1 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const samePos = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);

/**
 * Lay out the MAIN graph. `resolveUnroll` (pure, shared with MapView) decides which
 * loop edges become forward instances and returns the exact visible graph that
 * renders — so every arrow points forward AND the lit path computed in MapView can
 * never diverge from what's drawn. Here we just re-run dagre over that resolved
 * graph with the MEASURED size cache for crisp final pixel positions. A fresh
 * instance key (`parent~defId`) inherits its def's cached size for a clean paint.
 */
function resolveMainLayout(
  model: GraphModel,
  expanded: ReadonlySet<string>,
  cache: SizeCache,
) {
  // Cached by (model, expanded) reference — shared with MapView's `rendered`, so the
  // unroll fixpoint (several dagre layouts) runs ONCE per interaction, not per caller.
  const { graph } = resolveUnrollCached(model, expanded);
  const sizeFor = (id: NodeId) => cache.get(id) ?? cache.get(graph.defOf.get(id) ?? '');
  const positions = layoutGraph(graph.nodeIds, graph.edges, sizeFor);
  return { nodeIds: graph.nodeIds, edges: graph.edges, defOf: graph.defOf, positions };
}

/**
 * The reconciliation orchestrator — the ONLY place that writes nodes/edges.
 * Controlled React Flow: we own `nodes`/`edges` in state and feed them back as
 * props (the reliable pattern; imperative store writes race with mount).
 *
 * On every change to the visible subgraph it:
 *   1. absorbs measured sizes from the current nodes into the size cache,
 *   2. recomputes the dagre (left→right) layout,
 *   3. diffs against current nodes — reusing object identity (and `measured`)
 *      for survivors so React Flow's transform update + the CSS
 *      `transition: transform` rule makes them GLIDE, while new nodes mount at
 *      their target slot and fade/scale in via framer-motion (TechniqueNode),
 *   4. gently follows the camera toward newly-revealed nodes if off-screen.
 */
export function useGraphView({
  model,
  expanded,
  lastToggled,
  selectedId,
  reduceMotion,
  isolate,
  notesLayoutKey,
  panelOpen = false,
  focusCam = 'node',
}: UseGraphViewParams): UseGraphViewResult {
  const rf = useReactFlow<AppNode, AppEdge>();
  const sizeCacheRef = useRef(new SizeCache());
  // Focus-mode camera intent ('node' vs 'children'); read at fit time. Also part of the
  // `visible` memo (so a chevron press on the ALREADY-focused node — no selection change —
  // still re-runs the reconcile) and the fit `sig` (so the re-fit actually fires).
  const focusCamRef = useRef(focusCam);
  focusCamRef.current = focusCam;
  // Live panel-open flag the focus fit reads to decide how much of the viewport the
  // detail panel occludes (so it never frames a node UNDER the panel).
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
  // Last expansion Set we reconciled — to fire the "focus children" camera only on
  // a genuine expand toggle, not on a re-measure reconcile (Set ref unchanged).
  const prevExpandedRef = useRef<ReadonlySet<string> | null>(null);
  // Last reconcile's isolate edge-id set — so a LEAVE glide keeps the off-focus edges
  // faded (as they were during focus) until the nodes have slid back home, instead of
  // snapping them to full opacity mid-morph where they briefly point backward (an
  // off-focus node still gliding out of the focus column). It's the isolate's intended
  // edges (route + parent→siblings + sel→next); focus mode lights ONLY those and fades
  // every other rendered edge, incl. a sibling→sibling shortcut ("saved DA creds"
  // between two peers) that isn't part of the focus story and would render backward.
  const prevIsolateEdgesRef = useRef<Set<string> | null>(null);
  // Memoized MAIN (full-graph) dagre result. Recomputing it is the dominant reconcile
  // cost; a pure selection/focus switch doesn't change topology, so reuse the cached
  // layout whenever the expansion Set and the measured-size generation are unchanged.
  const mainLayoutRef = useRef<{
    model: GraphModel;
    expanded: ReadonlySet<string>;
    gen: number;
    result: ReturnType<typeof resolveMainLayout>;
  } | null>(null);
  const [nodes, setNodes] = useState<AppNode[]>([]);
  const [edges, setEdges] = useState<AppEdge[]>([]);
  const nodesRef = useRef<AppNode[]>(nodes);
  nodesRef.current = nodes;

  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  readyRef.current = ready;

  // Reconcile keys off this token. It ALWAYS carries the main inputs (layout +
  // loop-unroll run in reconcile, which needs the measured-size cache). In isolate
  // mode it additionally carries the lit path — but the node SET never shrinks:
  // reconcile keeps every node mounted, fades the off-path ones, and lays the lit
  // path out straight. So toggling isolate is a glide, never a pop-and-snap.
  const visible = useMemo(
    // panelOpen is carried so a panel open/close re-runs reconcile → the focus fit
    // re-seats for the changed occlusion (the main layout is memoized, so it's cheap).
    () => ({ model, expanded, isolate: isolate ?? null, panelOpen, focusCam }),
    [model, expanded, isolate, panelOpen, focusCam],
  );

  const onNodesChange = useCallback<OnNodesChange<AppNode>>((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // ── Camera primitives ──────────────────────────────────────────────────────────
  // EVERY camera move goes through one of these three so (a) the panel-reserve math
  // lives in ONE place and focus/non-focus frame a node identically, and (b) zoom is
  // bounded consistently. INVARIANT that keeps focus mode well-behaved: the two FIT
  // primitives CAP zoom, so a tiny visible set can never slam to maxZoom — which in turn
  // means `frameNode` (which keeps the current zoom) never inherits a slammed-in zoom.
  // Callers own the position SOURCE (live `rf.getNode` vs the reconcile's computed
  // targets) and the TIMING (debounce / tween); the primitive only performs the move.
  // The ONE deliberate exception is `fitFocusFrame` below (the focus frame-fit), which
  // needs a node-centred SYMMETRIC fit-zoom that none of these express; it clamps its own
  // zoom to the same readable band. Any OTHER new camera move MUST use a primitive.

  // Centre a node in the area the detail panel leaves free, keeping the current zoom
  // (floor 0.85, only zooms IN if far out). Used for every node SELECTION, focus or not.
  const frameNode = useCallback(
    (pos: XY, size: { width: number; height: number }, opts: { duration?: number; interpolate?: 'smooth' | 'linear' } = {}) => {
      const isMobile = window.innerWidth < 640;
      const open = panelOpenRef.current;
      // Panel docks right (desktop) / bottom (mobile); reserve it so the node lands in the
      // VISIBLE half (and re-centres when the panel closes). Shift the camera target toward
      // the reserved band by half its size; the content then lands the opposite way, clear.
      const offsetX = !isMobile && open ? PANEL_OFFSET : 0;
      const offsetY = isMobile && open ? window.innerHeight * PANEL_BOTTOM_FRACTION : 0;
      const cx = pos.x + size.width / 2;
      const cy = pos.y + size.height / 2;
      const zoom = Math.max(rf.getZoom(), 0.85);
      void rf.setCenter(cx + offsetX / 2 / zoom, cy + offsetY / 2 / zoom, {
        zoom,
        duration: reduceMotion ? 0 : (opts.duration ?? 450),
        ...(opts.interpolate ? { interpolate: opts.interpolate } : {}),
      });
    },
    [rf, reduceMotion],
  );

  // Fit a COMPUTED bounding rect (the caller passes the reconcile's target positions when
  // a tween is mid-flight), centred, with zoom CAPPED at `maxZoom`. Used for overview fits
  // (leaving focus, collapse-to-root) — the cap is what stops a 1–2 node set slamming in.
  const frameBounds = useCallback(
    (rect: { x: number; y: number; width: number; height: number }, opts: { maxZoom?: number; padding?: number; duration?: number } = {}) => {
      const { maxZoom = 0.9, padding = 0.18, duration = 660 } = opts;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const zoom = Math.max(0.18, Math.min(maxZoom, vw / (rect.width * (1 + 2 * padding)), vh / (rect.height * (1 + 2 * padding))));
      void rf.setCenter(rect.x + rect.width / 2, rect.y + rect.height / 2, { zoom, duration: reduceMotion ? 0 : duration });
    },
    [rf, reduceMotion],
  );

  // Fit LIVE node positions (React Flow's own fitView), zoom CAPPED at `maxZoom`. Used when
  // positions are already settled: the first-paint whole-graph reveal, and the expand-follow
  // onto freshly-revealed children. Pass `null` ids to fit the whole graph.
  const frameLiveNodes = useCallback(
    (ids: NodeId[] | null, opts: { maxZoom?: number; padding?: number; duration?: number } = {}) => {
      const { maxZoom = 1.1, padding = 0.4, duration = 460 } = opts;
      void rf.fitView({ ...(ids ? { nodes: ids.map((id) => ({ id })) } : {}), padding, maxZoom, duration: reduceMotion ? 0 : duration });
    },
    [rf, reduceMotion],
  );

  const maybeFollow = useCallback(
    (focusIds: NodeId[]) => {
      if (!readyRef.current || focusIds.length === 0) return;
      // Gently lead the camera to the newly-revealed frontier. Always recenter
      // (rather than only when off-screen) so new nodes never end up stranded in
      // a corner behind the minimap/controls, and exploration feels guided.
      requestAnimationFrame(() => frameLiveNodes(focusIds, { maxZoom: 1.1, padding: 0.4, duration: 460 }));
    },
    [frameLiveNodes],
  );

  // ── Isolate enter/leave glide ──────────────────────────────────────────────
  // Animate node POSITIONS in state (a short rAF tween) on the isolate toggle.
  // Moving positions in STATE (vs the CSS-transform glide used for expand) makes
  // React Flow recompute every edge each frame, so arrows stay GLUED to their
  // boxes as the path straightens — instead of snapping to the destination ahead
  // of the boxes (the old "a pile of arrows pre-drawn in the middle" look).
  const prevIsolateRef = useRef(false);
  const tweenRaf = useRef<number | null>(null);
  // Focus-mode camera: the frame to fit, and a debounce timer. A single selection fires
  // several reconciles (isolate change, lineage expand, re-measure); without coalescing,
  // each one calls fitBounds and the overlapping animations reverse mid-flight (flicker).
  const camFrameRef = useRef<string[] | null>(null);
  const camPositionsRef = useRef<ReadonlyMap<NodeId, XY> | null>(null);
  // The SELECTED node's key — the focus fit centres on it (not the frame midpoint) so the
  // node you picked sits in the middle of the visible area.
  const camSelRef = useRef<string | null>(null);
  // The selected node's NEXT-STEP keys (its children in the frame) — the 'children' camera
  // intent centres on THESE (empty for a leaf → falls back to centring on the node).
  const camNextRef = useRef<string[]>([]);
  const camFitTimerRef = useRef(0);
  const lastFitFrameRef = useRef<string | null>(null);
  const [tweening, setTweening] = useState(false);
  const tweenPositions = useCallback((targets: ReadonlyMap<NodeId, XY>, duration: number, onDone?: () => void) => {
    if (tweenRaf.current != null) cancelAnimationFrame(tweenRaf.current);
    const from = new Map(nodesRef.current.map((n) => [n.id, n.position]));
    const t0 = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    setTweening(true);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const k = ease(p);
      setNodes((nds) =>
        nds.map((n) => {
          const to = targets.get(n.id);
          if (!to) return n;
          const f = from.get(n.id);
          if (!f) return samePos(n.position, to) ? n : { ...n, position: to };
          // Most nodes don't move on an isolate toggle (only the lit path straightens).
          // Reusing their identity keeps React Flow from reprocessing every node and
          // recomputing every edge on each of the tween's ~40 frames.
          if (samePos(f, to)) return n;
          return { ...n, position: { x: f.x + (to.x - f.x) * k, y: f.y + (to.y - f.y) * k } };
        }),
      );
      if (p < 1) {
        tweenRaf.current = requestAnimationFrame(step);
      } else {
        tweenRaf.current = null;
        setTweening(false);
        onDone?.();
      }
    };
    tweenRaf.current = requestAnimationFrame(step);
  }, []);
  // Fit the camera to the current focus frame (`camFrameRef`) using the reconcile's
  // COMPUTED isolate positions (`camPositionsRef`), not live `rf.getNodes()`. A frame
  // node can be a convergence hub shared with the main graph; its live position is
  // briefly the far-away MAIN position before the isolate override commits, which makes
  // the bounds explode and the camera zoom way out then snap back. The computed isolate
  // layout has every frame node at its in-focus slot, so the fit is stable.
  const fitFocusFrame = useCallback(() => {
    const keys = camFrameRef.current;
    const pos = camPositionsRef.current;
    if (!keys || keys.length === 0 || !pos || tweenRaf.current != null) return;
    const cache = sizeCacheRef.current;
    const selKey = camSelRef.current && keys.includes(camSelRef.current) ? camSelRef.current : keys[0];
    const sp = pos.get(selKey); // computed isolate position (a hub's LIVE position is briefly off)
    if (!sp) return;
    const ss = cache.get(selKey) ?? DEFAULT_NODE_SIZE;
    // BODY click ('node', also a leaf with no next steps): centre on the selected node
    // only, keeping the current readable zoom — "focused on what I clicked", nothing moves.
    const nextKeys = camNextRef.current;
    if (focusCamRef.current === 'node' || nextKeys.length === 0) {
      frameNode(sp, ss, { duration: 320, interpolate: 'linear' });
      return;
    }
    // CHEVRON ('children'): move the camera ONTO the next steps (children, to the right in
    // the LR layout) — centre on THEIR bounds, not the node, so it visibly differs from a
    // body click. Zoom to fit them, FLOORED at 0.8 so many/spread children can't zoom out to
    // unreadable text on mobile (nearest children show; pan for the rest). Panel-reserved.
    const rect = boundsOf(nextKeys, pos, cache);
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const isMobile = vw < 640;
    const open = panelOpenRef.current;
    const rightReserve = !isMobile && open ? PANEL_OFFSET : 0;
    const bottomReserve = isMobile && open ? Math.min(vh * 0.32, 300) : 0;
    const availW = Math.max(1, vw - rightReserve);
    const availH = Math.max(1, vh - bottomReserve);
    const pad = isMobile ? 0.16 : 0.2;
    const zoom = Math.max(0.8, Math.min(1.1, availW / (rect.width * (1 + 2 * pad)), availH / (rect.height * (1 + 2 * pad))));
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    void rf.setCenter(cx + rightReserve / 2 / zoom, cy + bottomReserve / 2 / zoom, {
      zoom,
      duration: reduceMotion ? 0 : 320,
      interpolate: 'linear', // straight pan/zoom; d3 'smooth' fly-zoom reads as bouncing between drills
    });
  }, [rf, reduceMotion, frameNode]);
  useEffect(
    () => () => {
      if (tweenRaf.current != null) cancelAnimationFrame(tweenRaf.current);
    },
    [],
  );

  const reconcile = useCallback(() => {
    const cache = sizeCacheRef.current;
    const current = new Map(nodesRef.current.map((n) => [n.id, n]));

    // 1. absorb the latest measured sizes
    for (const n of current.values()) {
      const w = n.measured?.width;
      const h = n.measured?.height;
      if (w && h) cache.set(n.id, { width: w, height: h });
    }

    // 2. Always resolve the FULL main graph (loops unrolled forward, every arrow
    //    pointing right). Isolate mode does NOT swap to a smaller set — it keeps
    //    every node mounted, lays the lit path out STRAIGHT (overriding just those
    //    positions), and fades the rest. So entering/leaving is a glide, not a
    //    remount. A fresh instance key inherits its def's cached size on first paint.
    const { model, expanded, isolate } = visible;
    // Reuse the cached full-graph layout when neither the expansion set nor any
    // measured size has changed (the common case when only the selection/focus moves).
    const cached = mainLayoutRef.current;
    const main =
      cached && cached.model === model && cached.expanded === expanded && cached.gen === cache.generation
        ? cached.result
        : resolveMainLayout(model, expanded, cache);
    if (main !== cached?.result) {
      mainLayoutRef.current = { model, expanded, gen: cache.generation, result: main };
    }
    const { nodeIds, edges, defOf } = main;
    let positions: Map<NodeId, XY> = main.positions;
    let pathKeys: Set<string> | null = null;
    let isolateEdgeIds: Set<string> | null = null;
    if (isolate) {
      pathKeys = new Set(isolate.nodes.map((n) => n.key));
      isolateEdgeIds = new Set(isolate.edges.map((e) => e.id));
      const sizeFor = (id: NodeId) => cache.get(id) ?? cache.get(defOf.get(id) ?? '');
      const straight = layoutGraph(isolate.nodes.map((n) => n.key), isolate.edges, sizeFor);
      // FOCUS mode: dagre lifts the selected node to the top of the sibling rank
      // (it alone has children). Re-stack the rank in natural order so the selected
      // node sits in its own slot, and shift its next-steps to follow.
      if (isolate.reorder) {
        const present = isolate.reorder.keys.filter((k) => straight.has(k));
        if (present.length > 1) {
          // Vertical gap between nodes in a rank — matches layoutGraph's `nodesep` default.
          const NODESEP = 48;
          const oldSelY = straight.get(isolate.reorder.selKey)?.y;
          // Re-stack TOP-DOWN in natural order using each card's REAL height. (Reusing
          // dagre's sorted Y-tops as fixed slots overlaps tall cards: dagre sizes the gap
          // after a slot for whatever node it placed there, so a tall card — e.g. a 2-line
          // title — moved into a short card's slot spills into the next one. Stacking with
          // measured heights keeps natural order AND reserves each card's true height.)
          let y = Math.min(...present.map((k) => straight.get(k)!.y)); // top of the rank
          for (const k of present) {
            const p = straight.get(k)!;
            straight.set(k, { x: p.x, y });
            y += sizeFor(k).height + NODESEP;
          }
          const newSelY = straight.get(isolate.reorder.selKey)?.y;
          if (oldSelY != null && newSelY != null && newSelY !== oldSelY) {
            const dy = newSelY - oldSelY;
            for (const nk of isolate.reorder.next) {
              const p = straight.get(nk);
              if (p) straight.set(nk, { x: p.x, y: p.y + dy });
            }
          }
        }
      }
      positions = new Map(main.positions);
      for (const [k, p] of straight) positions.set(k, p); // lit path straightened; rest stays put
    }

    // Number repeated instances of a def (#2, #3…); the canonical one (no defOf
    // entry) is unnumbered. Computed over the full graph, so badges are identical
    // in isolate mode and the main graph.
    const meta = new Map<string, RenderInstance>();
    const counter = new Map<NodeId, number>();
    for (const key of nodeIds) {
      const d = defOf.get(key);
      if (d === undefined) continue;
      const n = (counter.get(d) ?? 1) + 1;
      counter.set(d, n);
      meta.set(key, { defId: d, instanceIndex: n });
    }

    const isolateOn = !!isolate;
    const isolateChanged = isolateOn !== prevIsolateRef.current;
    // Glide positions on a USER focus toggle. Never on the initial (pre-ready) load:
    // entering focus from a deep-link, the first reconcile runs before nodes are
    // measured, so the tween would capture DEFAULT-size targets (a uniform-gap layout)
    // and then clobber the correct measured layout the re-measure reconcile produces —
    // leaving tall cards overlapping. Skipping it pre-ready lets the measured layout
    // apply cleanly (the canvas fades in over it, so there's nothing to animate anyway).
    const tween = isolateChanged && !reduceMotion && readyRef.current;
    const leaving = isolateChanged && !isolateOn;
    // Edge fade follows the lit path while focus is on. While LEAVING (during the
    // glide) keep using the PREVIOUS focus path-keys so off-focus edges stay faded
    // until the nodes settle — a post-tween reconcile then clears it. Without this an
    // off-focus edge to a node still sliding out of the focus column flashes at full
    // opacity pointing backward.
    const edgeFadeEdges = isolateEdgeIds ?? (leaving && tween ? prevIsolateEdgesRef.current : null);

    // 3. diff: reuse identity for survivors, mint fresh nodes for newcomers. On the
    //    isolate toggle, survivors KEEP their current position here and the JS tween
    //    (below) moves them to target so edges follow; otherwise the target is set
    //    directly and the CSS transform glides. `faded` flips per off-path node.
    const next: AppNode[] = [];
    let stagger = 0;
    for (const id of nodeIds) {
      const target = positions.get(id) ?? { x: 0, y: 0 };
      const faded = pathKeys ? !pathKeys.has(id) : false;
      // A faded node is invisible but its React Flow WRAPPER still hit-tests, so a faded
      // node parked over a lit one (its far main-graph slot in focus mode) silently
      // swallows clicks. Kill pointer events on the whole faded wrapper.
      const style = faded ? FADED_NODE_STYLE : undefined;
      const existing = current.get(id);
      if (existing) {
        const startPos = tween ? existing.position : target;
        const posChanged = !samePos(existing.position, startPos);
        const fadedChanged = (existing.data?.faded ?? false) !== faded;
        next.push(
          !posChanged && !fadedChanged
            ? existing
            : {
                ...existing,
                position: posChanged ? startPos : existing.position,
                style,
                // Preserve the data object's IDENTITY when only the position moved (a
                // relayout): the card renders nothing from position, so a stable `data`
                // lets its memo skip the content re-render — an expand/collapse repositions
                // the graph without re-rendering every card. Mint new data only when
                // `faded` actually flipped (focus enter/leave).
                data: fadedChanged ? { ...existing.data, faded } : existing.data,
              },
        );
      } else {
        const inst = meta.get(id);
        next.push({
          id,
          type: 'technique',
          position: target,
          draggable: false,
          style,
          data: { staggerIndex: stagger++, defId: inst?.defId, instanceIndex: inst?.instanceIndex, faded },
        });
      }
    }

    setNodes(next);
    setEdges(
      edges.map((e) => {
        // In an LR layout a forward edge runs left→right; if the target ends up
        // at/left of the source it's a convergence that loops back to an earlier
        // step — flag it so the edge renders as a distinct dashed return curve.
        const sp = positions.get(e.source);
        const tp = positions.get(e.target);
        const backward = !!(sp && tp && tp.x <= sp.x);
        // In focus/isolate mode an edge shows only if it's one of the slice's own
        // edges (the route, parent→siblings, sel→next); everything else fades, so no
        // stray shortcut between two lit peers renders backward.
        const faded = edgeFadeEdges ? !edgeFadeEdges.has(e.id) : false;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'drawin',
          data: { label: e.label, backward, faded },
        };
      }),
    );

    // 4. Camera + the isolate position glide.
    // The toggle (either direction) glides node POSITIONS via the JS tween: on enter
    // the diff loop pinned survivors at their current spot so they'd slide to the
    // straightened path; on LEAVE it pinned them at their focus spot so they slide
    // BACK to the full-graph layout. Either way the move must be driven here — without
    // it, leaving focus left the straightened nodes frozen at their focus positions
    // (the rest at full-layout positions) → a mangled graph.
    if (isolateChanged && tween) {
      const targets = new Map<NodeId, XY>();
      for (const id of nodeIds) targets.set(id, positions.get(id) ?? { x: 0, y: 0 });
      // Reconcile once more when the glide ends: on LEAVE it un-fades the off-focus edges
      // (now settled, all forward); on ENTER it re-applies the MEASURED layout, since the
      // tween captured its targets before any freshly-revealed card was measured (so it
      // animated to default-size slots) — without this re-apply, tall cards in a dense
      // column settle a few px overlapped. The reconcile is a no-op when targets were
      // already correct (positions unchanged → identity reused, no glide).
      tweenPositions(targets, 640, () => reconcileRef.current());
    }
    if (isolateOn && pathKeys) {
      // The frame to fit. On a NARROW (mobile) viewport, fitting the whole neighbourhood
      // (route + every sibling + next steps) zooms too far out — so frame just the
      // selected node and its next steps (where you are + where you can go). A leaf with
      // no next steps falls back to its sibling rank so a single card doesn't over-zoom.
      // Frame the SELECTED node + its next steps (where you are + where you can go) on
      // both desktop and mobile — that is the "focus" the user wants, not the whole
      // neighbourhood. A leaf with no next steps falls back to its sibling rank so a
      // single card doesn't over-zoom.
      let frameKeys: string[] = [...pathKeys];
      if (isolate?.reorder) {
        const { selKey, next, keys } = isolate.reorder;
        frameKeys = next.length > 0 ? [selKey, ...next] : [...keys];
      }
      camFrameRef.current = frameKeys;
      camPositionsRef.current = positions;
      camSelRef.current = isolate?.reorder?.selKey ?? frameKeys[0] ?? null;
      camNextRef.current = isolate?.reorder?.next ?? []; // the selected node's next steps
      // Panel state is part of the signature: opening/closing the panel changes the
      // occluded area, so the frame must re-seat even when the framed keys are identical.
      const sig = frameKeys.join('|') + (panelOpenRef.current ? '|p' : '') + '|' + focusCamRef.current;
      // ALL focus camera moves go through one debounced fit — entering focus, selecting a
      // sibling, and drilling into a next step. A single action fires a BURST of reconciles
      // (selection, lineage expand, re-measure) and may flip isolate off→on (a deselect
      // then reselect); firing a fit per reconcile stacks overlapping fitBounds that reverse
      // mid-flight (the flicker). Instead: keep re-arming while the frame still changes or a
      // position tween is running, then do ONE fit on the settled layout, recording the
      // frame so a late re-measure for the SAME frame doesn't re-animate.
      if (sig !== lastFitFrameRef.current) {
        if (camFitTimerRef.current) clearTimeout(camFitTimerRef.current);
        const tick = () => {
          if (tweenRaf.current != null) {
            camFitTimerRef.current = window.setTimeout(tick, 80); // wait out the glide
            return;
          }
          fitFocusFrame();
          // Record the SAME signature form `sig` uses (frame keys + panel state + camera
          // intent) so a later panel open/close OR a body↔chevron intent flip on the same
          // node still re-fits, but an idempotent re-measure does not.
          lastFitFrameRef.current = camFrameRef.current
            ? camFrameRef.current.join('|') + (panelOpenRef.current ? '|p' : '') + '|' + focusCamRef.current
            : null;
        };
        // Short debounce: long enough to coalesce the (now atomic) selection+expansion
        // reconcile and a follow-up re-measure, short enough that the camera re-frames
        // CONCURRENTLY with the cards fading in — not 100ms+ later, which made the new
        // cards appear at the old zoom then visibly shrink as the camera caught up.
        camFitTimerRef.current = window.setTimeout(tick, 45);
      }
    } else if (isolateChanged) {
      // Isolate turned OFF — either focus mode was switched off (whole graph now visible)
      // or the selection was dropped INSIDE focus mode (collapse to the root baseline, so
      // only a node or two are visible). Fit the COMPUTED bounds (live positions are
      // mid-tween), but CAP the zoom at 0.9: an uncapped fit of a 1–2 node set zooms to
      // maxZoom (1.6) and slams onto a single card — the "deselect zooms way in" bug — and
      // that inflated zoom then leaked into the next focus. Leaving focus entirely shows the
      // whole graph, whose fit zoom is far below the cap, so it is unaffected.
      if (camFitTimerRef.current) clearTimeout(camFitTimerRef.current);
      lastFitFrameRef.current = null;
      const rect = boundsOf(nodeIds, positions, cache);
      requestAnimationFrame(() => frameBounds(rect, { maxZoom: 0.9, padding: 0.18, duration: 660 }));
    } else {
      // On a fresh EXPANSION, refocus onto the expanded node's CHILDREN — the next
      // steps — whether or not they were already on screen. The `expanded` Set is a
      // fresh reference per toggle, so a re-measure reconcile never moves the camera.
      // Skip only the very first reconcile (initial load); a genuine expand after
      // that — including expanding the now-collapsible root — follows its children.
      const expandedChanged = expanded !== prevExpandedRef.current;
      const firstReconcile = prevExpandedRef.current === null;
      // Only a CHEVRON expand (intent 'children') chases the frontier. A search / breadcrumb
      // JUMP (intent 'node') also expands a lineage, but wants to land ON the node — so it
      // leaves the camera to the selection centre below; otherwise maybeFollow frames the
      // node's children and the picked node ends up off to the side ("focuses somewhere else").
      if (expandedChanged && !firstReconcile && focusCamRef.current === 'children' && expanded.has(lastToggled)) {
        const kids = edges.filter((e) => e.source === lastToggled).map((e) => e.target);
        if (kids.length > 0) maybeFollow(kids);
      }
    }
    prevExpandedRef.current = expanded;
    prevIsolateRef.current = isolateOn;
    prevIsolateEdgesRef.current = isolateEdgeIds;
  }, [visible, maybeFollow, lastToggled, reduceMotion, tweenPositions, fitFocusFrame, frameBounds]);

  const reconcileRef = useRef(reconcile);
  reconcileRef.current = reconcile;

  // Reconcile whenever the visible set changes.
  useLayoutEffect(() => {
    reconcileRef.current();
  }, [visible]);

  // Refine layout once freshly-added nodes have been measured.
  const initialized = useNodesInitialized();
  useEffect(() => {
    if (!initialized) return;
    reconcileRef.current();
  }, [initialized]);

  // Inline notes change card heights. Once the resized cards have been re-measured
  // (a short beat after the toggle/edit), re-layout so they don't overlap. Skipped
  // before first paint — the initial layout already measures notes that load with it.
  useEffect(() => {
    if (!readyRef.current) return;
    const id = window.setTimeout(() => reconcileRef.current(), 90);
    return () => window.clearTimeout(id);
  }, [notesLayoutKey]);

  // First paint: wait for measurement + fonts, then reveal + fit.
  useEffect(() => {
    if (!initialized || readyRef.current) return;
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      if (isolate) {
        // Focus deep-link: the reconcile schedules its own debounced fit that frames
        // the slice. Reset the fit guard so it re-runs now that sizes are MEASURED, and
        // skip the whole-graph fitView — it would zoom out and clobber the focus frame.
        lastFitFrameRef.current = null;
        reconcileRef.current();
      } else {
        reconcileRef.current();
        frameLiveNodes(null, { maxZoom: 1.1, padding: 0.28, duration: 0 });
      }
      setReady(true);
    };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    (fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(reveal));
    return () => {
      cancelled = true;
    };
  }, [initialized, isolate, frameLiveNodes]);

  // (Isolate enter/leave camera framing now happens inside `reconcile`, in lockstep
  //  with the node-position glide — see step 4 there.)

  // Selecting a node opens the right-hand detail panel — pan (and gently zoom in
  // if far out) so the selected node is centered in the space LEFT of the panel.
  // Depends on `nodes` too: a search result is selected before its ancestors
  // finish laying out, so we retry centering once the node actually exists.
  const focusedSelRef = useRef<NodeId | null>(null);
  // The position we last framed this selection at. `null` marks a selection whose camera
  // is owned elsewhere (isolate/focus fit, or a just-left focus) — never node-centre it.
  const framedPosRef = useRef<XY | null>(null);
  useEffect(() => {
    if (selectedId == null) {
      focusedSelRef.current = null;
      framedPosRef.current = null;
      return;
    }
    // In isolate/focus mode the camera is owned by the isolate fit (which frames the whole
    // subset); mark it (framedPos = null) so a later relayout — including the leave-focus
    // glide — never node-centres and fights the whole-graph fit.
    if (isolate) {
      focusedSelRef.current = selectedId;
      framedPosRef.current = null;
      return;
    }
    if (!readyRef.current) return;
    const node = rf.getNode(selectedId);
    if (!node) return; // not laid out yet — a later `nodes` update will retry
    // Re-centre when this node became the selection OR a relayout MOVED it. A search /
    // breadcrumb jump reveals the node's ancestors, which relayouts the graph AFTER the
    // first centre; without re-centring on the moved (finally-measured) position the camera
    // stays on the stale pre-expand spot. A `null` framedPos (isolate-owned selection) is
    // left to the fit that owns it; `samePos` gates out idempotent re-measure reconciles so
    // a settled node never re-animates.
    const already =
      focusedSelRef.current === selectedId &&
      (framedPosRef.current == null || samePos(framedPosRef.current, node.position));
    if (already) return;
    // Same camera as focus mode (frameNode): centre the LIVE node position in the area the
    // panel leaves free, at a readable zoom. The panel-reserve and zoom math live in the
    // primitive, so focus and non-focus selections frame a node identically.
    const w = node.measured?.width ?? DEFAULT_NODE_SIZE.width;
    const h = node.measured?.height ?? DEFAULT_NODE_SIZE.height;
    frameNode(node.position, { width: w, height: h }, { duration: 450 });
    focusedSelRef.current = selectedId;
    framedPosRef.current = { x: node.position.x, y: node.position.y };
  }, [selectedId, nodes, rf, isolate, frameNode]);

  return { nodes, edges, onNodesChange, ready, tweening };
}
