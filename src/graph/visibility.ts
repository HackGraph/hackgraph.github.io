import type { GraphModel, NodeId } from './buildModel';
import { edgeKey } from './buildModel';

const EMPTY_SET: ReadonlySet<string> = new Set();

export interface VisibleEdge {
  id: string;
  source: NodeId;
  target: NodeId;
  label?: string;
}

export interface VisibleGraph {
  /** Render keys of all nodes to draw. A key is the plain node id for a canonical
   *  node, or a path-key (`parent~defId`) for a forward-unrolled loop instance. */
  nodeIds: Set<string>;
  /** Edges to render (keyed by source/target RENDER keys). */
  edges: VisibleEdge[];
  /** Render key → content def id, ONLY for unrolled instance keys (key !== defId). */
  defOf: Map<string, NodeId>;
}

/**
 * Derive the visible subgraph from the static model + the set of expanded keys.
 *
 * It is a depth-first reveal from the root that descends ONLY through expanded
 * keys, and is two things at once:
 *
 *  - A DAG projection: a node appears once per context, every qualifying edge is
 *    emitted (so convergent nodes show all incoming edges), collapsing a node
 *    hides descendants reachable only through it, and ordinary cycles terminate
 *    (a revisited node in the same context just gets an edge, no re-descent).
 *
 *  - A lazy forward UNROLL of loops: every edge named in `unrollSet` (keyed
 *    `${sourceKey}->${childDefId}`) does NOT merge/point back — it spawns a fresh
 *    forward INSTANCE (`sourceKey~childDefId`) that the user can expand to keep
 *    exploring. Each instance opens its own dedup context, so its subtree unrolls
 *    forward rather than merging back to canonical nodes. WHICH edges to unroll is
 *    decided by the caller from actual layout positions (a loop-back is an edge
 *    that lands left of its source) — see useGraphView — because "backward" is a
 *    layout property, not a structural one (the graph is largely one big SCC).
 *
 * Pure. Same (model, expanded, unrollSet) ⇒ same keys ⇒ nodes glide, never remount.
 */
export function computeVisible(
  model: GraphModel,
  expanded: ReadonlySet<string>,
  unrollSet: ReadonlySet<string> = new Set(),
): VisibleGraph {
  const nodeIds = new Set<string>();
  const edges: VisibleEdge[] = [];
  const defOf = new Map<string, NodeId>();
  const emitted = new Set<string>();

  const pushEdge = (source: string, target: string, label?: string) => {
    const id = edgeKey(source, target);
    if (emitted.has(id)) return;
    emitted.add(id);
    edges.push({ id, source, target, label });
  };

  // `prefix` namespaces a context's keys (''= canonical/root); `dedup` maps a
  // def id to the key it already has IN THIS CONTEXT (convergence + cycle merge).
  const visit = (
    defId: NodeId,
    key: string,
    prefix: string,
    dedup: Map<NodeId, string>,
  ) => {
    nodeIds.add(key);
    if (key !== defId) defOf.set(key, defId);
    if (!expanded.has(key)) return;

    for (const child of model.childrenOf.get(defId) ?? []) {
      // On-graph caption: explicit labels only (generic relationship defaults are
      // kept off the canvas for readability; they still show in the edge panel).
      const label = model.edgeGraphLabels.get(edgeKey(defId, child));
      if (unrollSet.has(`${key}->${child}`)) {
        // A layout-backward edge → fresh forward instance + new dedup context.
        const childKey = `${key}~${child}`;
        pushEdge(key, childKey, label);
        if (!nodeIds.has(childKey)) visit(child, childKey, `${childKey}~`, new Map());
      } else {
        const existing = dedup.get(child);
        if (existing !== undefined) {
          pushEdge(key, existing, label); // convergence / ordinary cycle: just an edge
        } else {
          const childKey = prefix + child;
          dedup.set(child, childKey);
          pushEdge(key, childKey, label);
          visit(child, childKey, prefix, dedup);
        }
      }
    }
  };

  visit(model.rootId, model.rootId, '', new Map([[model.rootId, model.rootId]]));
  return { nodeIds, edges, defOf };
}

/** Whether a node has any children (drives the expand/collapse chevron). */
export function hasChildren(model: GraphModel, id: NodeId): boolean {
  return (model.childrenOf.get(id)?.length ?? 0) > 0;
}

/** The content def id a render key points at — the segment after the last `~`
 *  (`a~b~c` → `c`); a plain id is its own def. */
export function defIdOf(key: string): NodeId {
  const i = key.lastIndexOf('~');
  return i === -1 ? key : key.slice(i + 1);
}

/**
 * The chain of render keys to EXPAND in order to reveal `key` — used to open a
 * search result or a breadcrumb target (not to draw the highlight). The canonical
 * base takes the shortest route to the root; instance segments (`s1~s2~s3`) are
 * appended as the keys whose contexts must be expanded for the instance to
 * materialise.
 *
 * NOTE: the lit / hovered / breadcrumb path is NOT computed here — it comes from
 * `pathInRendered`, which walks the ACTUAL rendered edges so it can never invent a
 * step that isn't drawn (the old gap bug, where this split-by-`~` synthesized a
 * direct edge between an instance context's root and a node deep inside it).
 */
export function keyLineage(model: GraphModel, key: string): string[] {
  const segs = key.split('~');
  const lineage = pathToRoot(model, segs[0]);
  let cur = segs[0];
  for (let i = 1; i < segs.length; i++) {
    cur = `${cur}~${segs[i]}`;
    lineage.push(cur);
  }
  return lineage;
}

/**
 * The path of RENDER KEYS from the root down to `target`, walked over the edges of
 * an already-computed visible graph (`computeVisible`'s output) — i.e. EXACTLY the
 * edges currently drawn. `computeVisible` only emits an edge out of an EXPANDED
 * node, so the graph is precisely what's revealed; of the possible revealed routes
 * this returns the LONGEST — the deepest chain the user actually drilled — so it
 * doesn't collapse onto a shortcut edge that merely happens to be open (e.g. the
 * `valid-domain-creds → local-admin-host` "(Pwn3d!)" edge skipping a chain).
 *
 * Because it follows the REAL rendered edges (including forward loop-instances),
 * the highlight can never synthesize an edge that isn't drawn — the cause of the
 * old gaps, where a multi-segment instance key (`a~b~c`) was naively split into
 * direct steps `a~b → a~b~c` that don't exist inside the instance's own context.
 * Pure; bounded to the visible subgraph. Returns `[target]` if it isn't drawn.
 */
export function pathInRendered(
  graph: VisibleGraph,
  rootId: NodeId,
  target: string,
  skip: ReadonlySet<string> = EMPTY_SET,
): string[] {
  if (target === rootId || !graph.nodeIds.has(target)) return [target];
  // Reverse adjacency over the rendered edges (render key → its drawn parents).
  // `skip` drops backward loop-back edges so the route stays forward — it never
  // climbs a loop-back to reach a convergence hub (the long cross-canvas curve).
  const parents = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (skip.has(e.id)) continue;
    const arr = parents.get(e.target);
    if (arr) arr.push(e.source);
    else parents.set(e.target, [e.source]);
  }
  // Longest distance from the root to each key + the parent on that route.
  // Memoised DFS; a key currently on the stack returns -∞ so in-context cycles
  // (residual loop-backs that weren't unrolled) are cut, never traversed.
  const depth = new Map<string, number>();
  const parent = new Map<string, string>();
  const onStack = new Set<string>();
  const dist = (n: string): number => {
    if (n === rootId) return 0;
    const memo = depth.get(n);
    if (memo !== undefined) return memo;
    if (onStack.has(n)) return -Infinity;
    onStack.add(n);
    let best = -Infinity;
    let bestParent: string | undefined;
    for (const p of parents.get(n) ?? []) {
      const d = dist(p);
      if (d > -Infinity && d + 1 > best) {
        best = d + 1;
        bestParent = p;
      }
    }
    onStack.delete(n);
    if (best > -Infinity) {
      depth.set(n, best);
      if (bestParent !== undefined) parent.set(n, bestParent);
    }
    return best;
  };

  if (dist(target) === -Infinity) return [target]; // not connected in the drawn graph
  const path: string[] = [target];
  let cur = target;
  while (cur !== rootId) {
    const p = parent.get(cur);
    if (p === undefined) break;
    path.unshift(p);
    cur = p;
  }
  return path;
}

/** Render metadata for a key that isn't a plain model id: the content `defId` it
 *  renders, plus (for an isolate-path visit) which numbered visit it is. */
export interface RenderInstance {
  defId: NodeId;
  /** Which visit (isolate path / main-graph loop): >1 renders a "#n" badge. */
  instanceIndex?: number;
}

/** One node in an isolated path. `key` is its render identity (unique within the
 *  path); `defId` is the single content definition it renders. They differ only
 *  for the 2nd+ visit of a `repeatable` node. */
export interface IsolateInstance extends RenderInstance {
  key: string;
  instanceIndex: number;
}

/** The instanced projection of the click-trail for "isolate path" mode. */
export interface IsolatePath {
  nodes: IsolateInstance[];
  edges: VisibleEdge[];
  /** FOCUS mode only: keep the selected node in its natural slot among its siblings
   *  instead of letting dagre pull it to the top (it has children; its siblings
   *  don't). `keys` = the sibling-rank node keys in natural (childrenOf) order; after
   *  layout their Y positions are reassigned in that order, and `next` (the selected
   *  node's next-step keys) shift by the same delta so they follow it. */
  reorder?: { keys: string[]; selKey: string; next: string[] };
}

// NOTE: the isolated path is no longer rebuilt from the trail here — it is just
// the already-computed highlighted `activePath` (render keys + edges) rendered on
// its own and laid out straight (see MapView). `IsolatePath`/`IsolateInstance`
// describe that structure.

/**
 * A shortest path of node ids from the root down to `id` (inclusive), via the
 * reverse adjacency. Module-private helper for `keyLineage` (reveal a node's
 * ancestors on search/breadcrumb jumps). Returns just `[id]` if unreachable.
 */
function pathToRoot(model: GraphModel, id: NodeId): NodeId[] {
  if (id === model.rootId) return [model.rootId];
  // BFS upward from id; `next.get(p)` = the node one step closer to id.
  const next = new Map<NodeId, NodeId>();
  const seen = new Set<NodeId>([id]);
  const queue: NodeId[] = [id];
  let reached = false;
  while (queue.length > 0) {
    const n = queue.shift()!;
    if (n === model.rootId) {
      reached = true;
      break;
    }
    for (const p of model.parentsOf.get(n) ?? []) {
      if (!seen.has(p)) {
        seen.add(p);
        next.set(p, n);
        queue.push(p);
      }
    }
  }
  if (!reached) return [id];
  const path: NodeId[] = [model.rootId];
  let cur = model.rootId;
  while (cur !== id) {
    cur = next.get(cur)!;
    path.push(cur);
  }
  return path;
}
