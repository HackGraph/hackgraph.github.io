import dagre from '@dagrejs/dagre';
import type { GraphModel, NodeId } from './buildModel';
import { computeVisible, type VisibleEdge, type VisibleGraph } from './visibility';
import { DEFAULT_NODE_SIZE, type NodeSize } from './sizeCache';

export interface XY {
  x: number;
  y: number;
}

export interface LayoutOptions {
  /** Horizontal gap between ranks (columns). */
  ranksep?: number;
  /** Vertical gap between nodes in a rank. */
  nodesep?: number;
}

/**
 * Compute a left→right hierarchical layout for the currently-visible subgraph.
 *
 * dagre reports node positions as CENTER coordinates; React Flow positions are
 * the node's TOP-LEFT, so we convert. Sizes come from the measured-size lookup
 * so columns pack tightly around real rendered dimensions. Pure function — no
 * React, fully testable.
 */
export function layoutGraph(
  nodeIds: Iterable<NodeId>,
  edges: VisibleEdge[],
  sizeOf: (id: NodeId) => NodeSize = () => DEFAULT_NODE_SIZE,
  options: LayoutOptions = {},
): Map<NodeId, XY> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    ranksep: options.ranksep ?? 130,
    nodesep: options.nodesep ?? 48,
    // network-simplex minimizes total edge length → converging children (everything funnels
    // to the goal/hubs) pack closer vertically and long routing lanes shrink, vs tight-tree's
    // faster-but-looser approximation. Slightly slower to compute; the main layout is memoized.
    ranker: 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = [...nodeIds];
  for (const id of ids) {
    const { width, height } = sizeOf(id);
    g.setNode(id, { width, height });
  }
  for (const e of edges) {
    // Only lay out edges whose endpoints are both present.
    if (!g.hasNode(e.source) || !g.hasNode(e.target)) continue;
    if (e.label) {
      // Give dagre the label's footprint so it reserves space ALONG the edge —
      // labeled edges grow longer and the text lands in a clear gap (à la
      // BloodHound) instead of overlapping the nodes.
      const width = Math.min(208, Math.max(48, e.label.length * 6.2 + 16));
      g.setEdge(e.source, e.target, { width, height: 18, labelpos: 'c' });
    } else {
      g.setEdge(e.source, e.target, {});
    }
  }

  dagre.layout(g);

  const positions = new Map<NodeId, XY>();
  for (const id of ids) {
    const n = g.node(id);
    if (!n) continue;
    positions.set(id, { x: n.x - n.width / 2, y: n.y - n.height / 2 });
  }
  return positions;
}

/** Cap on the unroll/relayout fixpoint. Fresh instances are leaves (collapsed), so
 *  they add no edges and the set converges fast; the cap only soaks up the rare
 *  relayout that flips an edge's direction. */
const MAX_UNROLL_PASSES = 8;

export interface ResolvedUnroll {
  /** Loop edges (`${sourceKey}->${childDefId}`) to unroll into forward instances. */
  unrollSet: Set<string>;
  /** The visible graph computed WITH that unroll set — i.e. exactly what renders. */
  graph: VisibleGraph;
  /** Edge ids that still point backward in the final layout (the dashed loop-backs
   *  into hubs/categories/goals that aren't unrolled). Path-finding skips these so
   *  the lit path / breadcrumb / hover trace stay forward and never sprawl back
   *  across the canvas to reach a convergence hub. */
  backEdges: Set<string>;
}

/**
 * Decide which loop edges to UNROLL into forward instances, and return the
 * resulting visible graph. **Every node is repeatable**: any edge that lands at or
 * left of its source in the layout is a loop back to an earlier step, so we turn it
 * into a fresh FORWARD instance — arrows always point right, never back. (The
 * `repeatable` flag on a node now ONLY drives the ⟲ "primary recurring hub" badge;
 * it no longer gates unrolling.) The root and category folders are the only
 * exclusions: re-instancing the start is meaningless, and a duplicated folder would
 * render without a #n badge and confuse.
 *
 * "Backward" is a LAYOUT property, not a structural one (the AD graph is largely one
 * big strongly-connected component, so reachability can't tell a loop-closer from a
 * forward step), so we lay out, mark the backward edges, and lay out again — a
 * monotonic fixpoint (capped as a backstop).
 *
 * Runs with DEFAULT node sizes on purpose: dagre's RANK assignment (which column a
 * node lands in, hence forward-vs-backward) is determined by graph STRUCTURE, not
 * node dimensions — so the unroll set is size-independent. This makes it the ONE
 * source of truth both `useGraphView` (which re-lays-out with measured sizes for
 * pixel positions) and `MapView` (which highlights along the returned edges) can
 * recompute identically ⇒ the lit path can never diverge from what's drawn. Pure.
 */
/**
 * Reference-keyed memo over `resolveUnroll`. The fixpoint runs up to
 * `MAX_UNROLL_PASSES` dagre layouts, and THREE call sites need the same result per
 * interaction (MapView's `rendered`, useGraphView's reconcile, and `nextSteps`) —
 * without sharing, one expand toggle runs the whole fixpoint several times over,
 * synchronously, which is the dominant interaction cost. `useExpansion` already
 * preserves the Set's identity when its contents are unchanged, so keying by
 * (model, expanded) REFERENCE is sound. A few entries are kept per model so the
 * `nextSteps` lookahead set doesn't evict the main graph's entry.
 */
const unrollCache = new WeakMap<GraphModel, { expanded: ReadonlySet<string>; result: ResolvedUnroll }[]>();
const UNROLL_CACHE_SIZE = 4;

export function resolveUnrollCached(model: GraphModel, expanded: ReadonlySet<string>): ResolvedUnroll {
  let entries = unrollCache.get(model);
  if (!entries) {
    entries = [];
    unrollCache.set(model, entries);
  }
  const i = entries.findIndex((e) => e.expanded === expanded);
  if (i >= 0) {
    const [hit] = entries.splice(i, 1);
    entries.unshift(hit); // move-to-front LRU
    return hit.result;
  }
  const result = resolveUnroll(model, expanded);
  entries.unshift({ expanded, result });
  if (entries.length > UNROLL_CACHE_SIZE) entries.pop();
  return result;
}

export function resolveUnroll(model: GraphModel, expanded: ReadonlySet<string>): ResolvedUnroll {
  const unrollSet = new Set<string>();
  let graph = computeVisible(model, expanded);
  let positions = layoutGraph(graph.nodeIds, graph.edges);

  for (let pass = 0; pass < MAX_UNROLL_PASSES; pass++) {
    let added = false;
    for (const e of graph.edges) {
      const tgtDef = graph.defOf.get(e.target) ?? e.target;
      const tdef = model.nodes.get(tgtDef);
      // Unroll any backward edge — every node is repeatable — into a fresh FORWARD
      // instance so arrows always point right. The only exclusions are the root (no
      // point re-instancing the start) and category folders (a duplicated folder has
      // no #n badge and would confuse). Hubs (Valid Domain Credentials) and goals
      // (Domain Admin) DO unroll: a technique that yields creds/DA gets its own
      // forward "⟲2" re-entry copy instead of a long dashed arrow back to the hub.
      if (!tdef || tgtDef === model.rootId || tdef.kind === 'category') continue;
      const sp = positions.get(e.source);
      const tp = positions.get(e.target);
      if (sp && tp && tp.x <= sp.x) {
        const ukey = `${e.source}->${tgtDef}`;
        if (!unrollSet.has(ukey)) {
          unrollSet.add(ukey);
          added = true;
        }
      }
    }
    if (!added) break;
    graph = computeVisible(model, expanded, unrollSet);
    positions = layoutGraph(graph.nodeIds, graph.edges);
  }
  // Edges still pointing backward (target at/left of source) in the final layout —
  // the dashed loop-backs into hubs/categories/goals. Path-finding skips them.
  const backEdges = new Set<string>();
  for (const e of graph.edges) {
    const sp = positions.get(e.source);
    const tp = positions.get(e.target);
    if (sp && tp && tp.x <= sp.x) backEdges.add(e.id);
  }
  return { unrollSet, graph, backEdges };
}
