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
}: UseGraphViewParams): UseGraphViewResult {
  const rf = useReactFlow<AppNode, AppEdge>();
  const sizeCacheRef = useRef(new SizeCache());
  // Last expansion Set we reconciled — to fire the "focus children" camera only on
  // a genuine expand toggle, not on a re-measure reconcile (Set ref unchanged).
  const prevExpandedRef = useRef<ReadonlySet<string> | null>(null);
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
  const [tweening, setTweening] = useState(false);
  const tweenPositions = useCallback((targets: ReadonlyMap<NodeId, XY>, duration: number) => {
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
      }
    };
    tweenRaf.current = requestAnimationFrame(step);
  }, []);
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
    if (isolate) {
      pathKeys = new Set(isolate.nodes.map((n) => n.key));
      const sizeFor = (id: NodeId) => cache.get(id) ?? cache.get(defOf.get(id) ?? '');
      const straight = layoutGraph(isolate.nodes.map((n) => n.key), isolate.edges, sizeFor);
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
        // An edge fades unless BOTH endpoints are on the lit path.
        const faded = pathKeys ? !(pathKeys.has(e.source) && pathKeys.has(e.target)) : false;
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
    if (isolateOn && pathKeys) {
      // Frame the isolated subset (lit path, or the focus neighbourhood). Re-fit on
      // EVERY reconcile while it's active — not just the on/off toggle — so the frame
      // corrects after off-expansion focus nodes (siblings / downstream) get measured
      // and re-laid-out, instead of staying stuck on the provisional first layout.
      if (isolateChanged && tween) {
        const targets = new Map<NodeId, XY>();
        for (const id of nodeIds) targets.set(id, positions.get(id) ?? { x: 0, y: 0 });
        tweenPositions(targets, 640);
      }
      const rect = boundsOf(pathKeys, positions, cache);
      const dur = reduceMotion ? 0 : isolateChanged ? 660 : 300;
      requestAnimationFrame(() => void rf.fitBounds(rect, { padding: 0.22, duration: dur }));
    } else if (isolateChanged) {
      // Leaving isolate/focus → fit the whole graph.
      requestAnimationFrame(() => rf.fitView({ padding: 0.28, duration: reduceMotion ? 0 : 660, maxZoom: 1.1 }));
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
  }, [visible, maybeFollow, lastToggled, reduceMotion, rf, tweenPositions]);

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
    if (isolate) return;
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
