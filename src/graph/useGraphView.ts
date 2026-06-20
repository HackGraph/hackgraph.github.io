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
import { layoutGraph, resolveUnroll, type XY } from './layout';
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
}

/** Width (px) the right-hand desktop detail panel occludes, incl. its margins. */
const PANEL_OFFSET = 384;
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
  const { graph } = resolveUnroll(model, expanded);
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
}: UseGraphViewParams): UseGraphViewResult {
  const rf = useReactFlow<AppNode, AppEdge>();
  const sizeCacheRef = useRef(new SizeCache());
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
    () => ({ model, expanded, isolate: isolate ?? null }),
    [model, expanded, isolate],
  );

  const onNodesChange = useCallback<OnNodesChange<AppNode>>((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const maybeFollow = useCallback(
    (focusIds: NodeId[]) => {
      if (!readyRef.current || focusIds.length === 0) return;
      // Gently lead the camera to the newly-revealed frontier. Always recenter
      // (rather than only when off-screen) so new nodes never end up stranded in
      // a corner behind the minimap/controls, and exploration feels guided.
      requestAnimationFrame(() => {
        rf.fitView({
          nodes: focusIds.map((id) => ({ id })),
          duration: reduceMotion ? 0 : 460,
          padding: 0.4,
          maxZoom: 1.1,
        });
      });
    },
    [rf, reduceMotion],
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
    void rf.fitBounds(boundsOf(keys, pos, sizeCacheRef.current), {
      padding: 0.22,
      duration: reduceMotion ? 0 : 320,
      // Pan/zoom in a straight line. The default 'smooth' interpolation is d3's fly-zoom
      // (zoom OUT to travel, then back IN), which on the tight focus frame reads as the
      // camera bouncing/flickering between selections.
      interpolate: 'linear',
    });
  }, [rf, reduceMotion]);
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
    const main = resolveMainLayout(model, expanded, cache);
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
      // (it alone has children). Reassign the rank's Y positions in natural order so
      // the selected node stays in its own slot, and shift its next-steps to follow.
      if (isolate.reorder) {
        const present = isolate.reorder.keys.filter((k) => straight.has(k));
        if (present.length > 1) {
          const slots = present.map((k) => straight.get(k)!.y).sort((a, b) => a - b);
          const oldSelY = straight.get(isolate.reorder.selKey)?.y;
          present.forEach((k, i) => {
            const p = straight.get(k)!;
            straight.set(k, { x: p.x, y: slots[i] });
          });
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
    const tween = isolateChanged && !reduceMotion; // glide positions on the toggle
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
                data: { ...existing.data, faded },
              },
        );
      } else {
        const inst = meta.get(id);
        next.push({
          id,
          type: 'technique',
          position: target,
          draggable: false,
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
      // On leave, reconcile once more when the glide ends to un-fade the off-focus edges
      // (now settled, all forward). On enter, the settle-fit below handles the camera.
      tweenPositions(targets, 640, leaving ? () => reconcileRef.current() : undefined);
    }
    if (isolateOn && pathKeys) {
      // The frame to fit. On a NARROW (mobile) viewport, fitting the whole neighbourhood
      // (route + every sibling + next steps) zooms too far out — so frame just the
      // selected node and its next steps (where you are + where you can go). A leaf with
      // no next steps falls back to its sibling rank so a single card doesn't over-zoom.
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      let frameKeys: string[] = [...pathKeys];
      if (isMobile && isolate?.reorder) {
        const { selKey, next, keys } = isolate.reorder;
        frameKeys = next.length > 0 ? [selKey, ...next] : [...keys];
      }
      camFrameRef.current = frameKeys;
      camPositionsRef.current = positions;
      const sig = frameKeys.join('|');
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
          lastFitFrameRef.current = camFrameRef.current ? camFrameRef.current.join('|') : null;
        };
        camFitTimerRef.current = window.setTimeout(tick, 110);
      }
    } else if (isolateChanged) {
      // Leaving isolate/focus → frame the whole graph. Fit the COMPUTED target bounds
      // (not the live node positions, which are mid-tween) so the camera lands right.
      if (camFitTimerRef.current) clearTimeout(camFitTimerRef.current);
      lastFitFrameRef.current = null;
      const rect = boundsOf(nodeIds, positions, cache);
      requestAnimationFrame(() => void rf.fitBounds(rect, { padding: 0.16, duration: reduceMotion ? 0 : 660 }));
    } else {
      // On a fresh EXPANSION, refocus onto the expanded node's CHILDREN — the next
      // steps — whether or not they were already on screen. The `expanded` Set is a
      // fresh reference per toggle, so a re-measure reconcile never moves the camera.
      // Skip only the very first reconcile (initial load); a genuine expand after
      // that — including expanding the now-collapsible root — follows its children.
      const expandedChanged = expanded !== prevExpandedRef.current;
      const firstReconcile = prevExpandedRef.current === null;
      if (expandedChanged && !firstReconcile && expanded.has(lastToggled)) {
        const kids = edges.filter((e) => e.source === lastToggled).map((e) => e.target);
        if (kids.length > 0) maybeFollow(kids);
      }
    }
    prevExpandedRef.current = expanded;
    prevIsolateRef.current = isolateOn;
    prevIsolateEdgesRef.current = isolateEdgeIds;
  }, [visible, maybeFollow, lastToggled, reduceMotion, rf, tweenPositions, fitFocusFrame]);

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

  // First paint: wait for measurement + fonts, then reveal + fit the whole map.
  useEffect(() => {
    if (!initialized || readyRef.current) return;
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      reconcileRef.current();
      rf.fitView({ duration: 0, padding: 0.28, maxZoom: 1.1 });
      setReady(true);
    };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    (fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(reveal));
    return () => {
      cancelled = true;
    };
  }, [initialized, rf]);

  // (Isolate enter/leave camera framing now happens inside `reconcile`, in lockstep
  //  with the node-position glide — see step 4 there.)

  // Selecting a node opens the right-hand detail panel — pan (and gently zoom in
  // if far out) so the selected node is centered in the space LEFT of the panel.
  // Depends on `nodes` too: a search result is selected before its ancestors
  // finish laying out, so we retry centering once the node actually exists.
  const focusedSelRef = useRef<NodeId | null>(null);
  useEffect(() => {
    if (selectedId == null) {
      focusedSelRef.current = null;
      return;
    }
    // In isolate/focus mode the camera is owned by the isolate fit (which frames the
    // whole subset); don't also centre on the selected node or the two cameras fight.
    // Keep the ref in sync with the live selection so that when isolate turns OFF the
    // (then unchanged) selection doesn't re-fire setCenter against the whole-graph fit.
    if (isolate) {
      focusedSelRef.current = selectedId;
      return;
    }
    if (!readyRef.current || focusedSelRef.current === selectedId) return;
    const node = rf.getNode(selectedId);
    if (!node) return; // not laid out yet — a later `nodes` update will retry
    const w = node.measured?.width ?? DEFAULT_NODE_SIZE.width;
    const h = node.measured?.height ?? DEFAULT_NODE_SIZE.height;
    const cx = node.position.x + w / 2;
    const cy = node.position.y + h / 2;
    const zoom = Math.max(rf.getZoom(), 0.85);
    // The panel docks to the right on desktop and to the bottom on mobile, so
    // center the node in the remaining space: shift right on desktop, down on
    // mobile (centering a shifted point makes the node land off-center the
    // opposite way, clear of the panel).
    const isMobile = window.innerWidth < 640;
    const offsetX = isMobile ? 0 : PANEL_OFFSET;
    const offsetY = isMobile ? window.innerHeight * PANEL_BOTTOM_FRACTION : 0;
    rf.setCenter(cx + offsetX / 2 / zoom, cy + offsetY / 2 / zoom, {
      zoom,
      duration: reduceMotion ? 0 : 450,
    });
    focusedSelRef.current = selectedId;
  }, [selectedId, nodes, rf, reduceMotion, isolate]);

  return { nodes, edges, onNodesChange, ready, tweening };
}
