"use strict";
/* Fan-Out Graph — the ENGINE. Domain-blind by contract: nothing in this file
   may reference a dataset symbol (maps, steps, phases). It consumes any map
   shaped like { id, name, rootId, phases[], nodes[], edges[], relationships{} }
   via buildModel() and knows nothing else. Enforced by layout-test.mjs, which
   runs this file standalone against a handmade map and greps it for dataset
   identifiers. */

/* ---------- layout constants ---------- */

const CARD_W = 262;      // card width
const COL_GAP = 150;     // horizontal gap between columns (edge routing zone)
const COL_PITCH = CARD_W + COL_GAP;
const VGAP = 56;         // vertical gap between sibling cards
const GROUP_GAP = 88;    // vertical gap between unrelated groups in a column
const WAY_GAP = 26;      // vertical clearance around an edge waypoint
const WAY_H = 10;        // vertical footprint an edge crossing a column reserves
const KNOB = 13;         // radius of the round toggle; edges start at its outer rim
const CORNER = 14;       // rounded-corner radius on edge bends
const MAX_UNROLL = 8;    // cap on the unroll fixpoint

/* ---------- runtime model: built once per map, immutable ---------- */

const RESERVED_IN_ID = /[~|]|->/;

function buildModel(map) {
  // `~` separates an instance key from its parent, `|` joins an edge id and `->` an unroll
  // pair. An id carrying one of them resolves to a different def, and the view renders
  // nothing at all — fail loudly here instead, because a blank canvas says nothing.
  for (const n of map.nodes) {
    if (typeof n.id !== 'string' || RESERVED_IN_ID.test(n.id)) {
      throw new Error('buildModel: node id ' + JSON.stringify(n.id)
        + ' is unusable — ids may not contain "~", "|" or "->"');
    }
  }
  const defs = new Map(map.nodes.map(n => [n.id, n]));
  const childrenOf = new Map();   // defId -> [{target, rel}] in edge order
  const parentsOf = new Map();    // defId -> [defId]
  map.edges.forEach(e => {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source).push({ target: e.target, rel: e.rel });
    if (!parentsOf.has(e.target)) parentsOf.set(e.target, []);
    parentsOf.get(e.target).push(e.source);
  });
  const colorOf = new Map(map.phases.map(p => [p.label, p.color]));
  return { map, rootId: map.rootId, defs, childrenOf, parentsOf, colorOf, rels: map.relationships || {} };
}

function hasChildren(model, defId) {
  return (model.childrenOf.get(defId) || []).length > 0;
}

function childCount(model, defId) {
  return (model.childrenOf.get(defId) || []).length;
}

/* ---------- visibility: progressive disclosure over a cyclic DAG ----------
   A render KEY is a def id for a canonical node, or `parentKey~defId` for a
   forward-unrolled loop instance. Each context dedups defs, so convergence is
   an extra edge and ordinary cycles terminate; edges in `unrollSet`
   (`sourceKey->childDefId`) instead spawn a fresh forward instance with its
   own dedup context. Pure: same inputs, same keys — nodes glide, never remount. */

function computeVisible(model, expanded, unrollSet) {
  const nodeKeys = [];            // DFS first-visit order
  const keySet = new Set();
  const edges = [];
  const emitted = new Set();
  const defOf = new Map();        // instance key -> def id (canonical keys omitted)
  const pushEdge = (source, target, rel) => {
    const id = source + '|' + target;
    if (emitted.has(id)) return;
    emitted.add(id);
    edges.push({ id, source, target, rel });
  };
  // Explicit stack, not recursion: a long enough chain of nodes overflows the call stack
  // and takes the whole view down. A frame remembers which child it is on, so each subtree
  // still finishes before its next sibling starts — the dedup map depends on that order.
  const stack = [];
  const enter = (defId, key, prefix, dedup) => {
    keySet.add(key);
    nodeKeys.push(key);
    if (key !== defId) defOf.set(key, defId);
    if (!expanded.has(key)) return;
    stack.push({ key, prefix, dedup, kids: model.childrenOf.get(defId) || [], i: 0 });
  };
  enter(model.rootId, model.rootId, '', new Map([[model.rootId, model.rootId]]));
  while (stack.length) {
    const f = stack[stack.length - 1];
    if (f.i >= f.kids.length) { stack.pop(); continue; }
    const { target: child, rel } = f.kids[f.i++];
    if (unrollSet.has(f.key + '->' + child)) {
      const ck = f.key + '~' + child;
      pushEdge(f.key, ck, rel);
      if (!keySet.has(ck)) enter(child, ck, ck + '~', new Map());
    } else {
      const existing = f.dedup.get(child);
      if (existing !== undefined) {
        pushEdge(f.key, existing, rel);
      } else {
        const ck = f.prefix + child;
        f.dedup.set(child, ck);
        pushEdge(f.key, ck, rel);
        enter(child, ck, f.prefix, f.dedup);
      }
    }
  }
  return { nodeKeys, keySet, edges, defOf };
}

function defOfKey(vg, key) {
  return vg.defOf.get(key) || key;
}

/* ---------- ranks ----------
   Longest path from the root over the visible edges, EXCLUDING DFS back edges
   so cycles rank like dagre's acyclic projection (the closing edge is the one
   flagged backward, not an arbitrary victim of traversal order). */

function dfsBackEdges(vg, rootId, protect) {
  const out = new Map();
  vg.edges.forEach(e => {
    if (!out.has(e.source)) out.set(e.source, []);
    out.get(e.source).push(e);
  });
  // which edge of a cycle gets broken (and later unrolled into a #n instance)
  // is a tie-break — dagre picks arbitrarily; we pick DELIBERATELY: traverse
  // protected edges (the user's lit route) first, so a cycle always breaks on
  // an edge the user is NOT standing on. Expanding a loop target then instances
  // the loop's other side instead of duplicating the card under the user.
  if (protect && protect.size) {
    out.forEach(list => list.sort((a, b) =>
      (protect.has(a.id) ? 0 : 1) - (protect.has(b.id) ? 0 : 1)));
  }
  const state = new Map();        // 1 = on stack, 2 = done
  const back = new Set();
  // iterative for the same reason as computeVisible: depth here is graph depth
  const stack = [{ k: rootId, i: 0 }];
  state.set(rootId, 1);
  while (stack.length) {
    const f = stack[stack.length - 1];
    const edges = out.get(f.k) || [];
    if (f.i >= edges.length) { state.set(f.k, 2); stack.pop(); continue; }
    const e = edges[f.i++];
    const s = state.get(e.target) || 0;
    if (s === 1) back.add(e.id);
    else if (s === 0) { state.set(e.target, 1); stack.push({ k: e.target, i: 0 }); }
  }
  return back;
}

function computeRanks(vg, rootId, protect) {
  const skip = dfsBackEdges(vg, rootId, protect);
  const parents = new Map();      // key -> [source keys], back edges excluded
  vg.edges.forEach(e => {
    if (skip.has(e.id)) return;
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target).push(e.source);
  });
  const rank = new Map([[rootId, 0]]);
  const onStack = new Set();
  // Also iterative — this one recurses over PARENTS, so a long chain overflows just as
  // readily. A parent already on the stack is part of a cycle and contributes nothing,
  // which is what returning 0 did before (r starts at 1, so max(r, 0 + 1) was a no-op).
  const get = start => {
    if (rank.has(start)) return rank.get(start);
    const stack = [start];
    onStack.add(start);
    while (stack.length) {
      const k = stack[stack.length - 1];
      let pending = null;
      let r = 1;
      for (const p of parents.get(k) || []) {
        if (rank.has(p)) { r = Math.max(r, rank.get(p) + 1); continue; }
        if (onStack.has(p)) continue;
        pending = p;
        break;
      }
      if (pending !== null) { onStack.add(pending); stack.push(pending); continue; }
      rank.set(k, r);
      onStack.delete(k);
      stack.pop();
    }
    return rank.get(start);
  };
  vg.nodeKeys.forEach(get);
  return rank;
}

/* ---------- loop unrolling ----------
   "Backward" is a layout property: lay out, unroll every edge that lands at or
   left of its source into a fresh forward instance, lay out again — a monotone
   fixpoint (capped). Only the root is never re-instanced. Returns the graph
   that actually renders plus the residual back edges (path finding skips them). */

function resolveVisible(model, expanded, protect, seedUnroll) {
  // Seeded from a restored session: which side of a cycle got unrolled decides every
  // downstream key, and that decision came from the traversal order of the clicks that
  // built the view. A cold restore has no such history, so without the seed it can break
  // the cycle the other way and every saved `a~b` key then refers to a node that does not
  // exist. Extra seeds are harmless: the fixpoint only ever adds to this set.
  const unroll = new Set(seedUnroll || []);
  let vg = computeVisible(model, expanded, unroll);
  let rank = computeRanks(vg, model.rootId, protect);
  for (let pass = 0; pass < MAX_UNROLL; pass++) {
    let added = false;
    for (const e of vg.edges) {
      if (rank.get(e.target) > rank.get(e.source)) continue;
      const tDef = defOfKey(vg, e.target);
      if (tDef === model.rootId) continue;
      const u = e.source + '->' + tDef;
      if (!unroll.has(u)) { unroll.add(u); added = true; }
    }
    if (!added) break;
    vg = computeVisible(model, expanded, unroll);
    rank = computeRanks(vg, model.rootId, protect);
  }
  const backEdges = new Set();
  const parents = new Map();      // key -> [source keys] over ALL rendered edges
  vg.edges.forEach(e => {
    if (rank.get(e.target) <= rank.get(e.source)) backEdges.add(e.id);
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target).push(e.source);
  });
  return { vg, rank, parents, backEdges, unroll };
}

/* ---------- focus slice ----------
   Keep ONLY the lit route plus the selection's next steps: every ancestor
   collapses to the single node the path runs through, their siblings vanish
   entirely, and the branching choices live at the head of the line. Pure —
   it re-derives ranks, parents and back edges over the reduced graph so the
   rest of the pipeline cannot tell the difference. */

function focusSlice(resolved, rootId, route, protect) {
  const selKey = route[route.length - 1];
  const keep = new Set(route);
  resolved.vg.edges.forEach(e => { if (e.source === selKey) keep.add(e.target); });
  const nodeKeys = resolved.vg.nodeKeys.filter(k => keep.has(k));
  const keySet = new Set(nodeKeys);
  const edges = resolved.vg.edges.filter(e => keySet.has(e.source) && keySet.has(e.target));
  const defOf = new Map();
  resolved.vg.defOf.forEach((def, k) => { if (keySet.has(k)) defOf.set(k, def); });
  const vg = { nodeKeys, keySet, edges, defOf };
  const rank = computeRanks(vg, rootId, protect);
  const parents = new Map();
  const backEdges = new Set();
  edges.forEach(e => {
    if (rank.get(e.target) <= rank.get(e.source)) backEdges.add(e.id);
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target).push(e.source);
  });
  return { vg, rank, parents, backEdges, unroll: resolved.unroll };
}

/* ---------- path finding ---------- */

// longest forward path srcKey -> dstKey over the RENDERED edges, skipping the
// residual back edges; `avoid` nodes may terminate the path but never sit in
// the middle of it; null if dst is not forward-reachable from src
function pathBetween(vg, srcKey, dstKey, skip, avoid) {
  if (srcKey === dstKey) return [srcKey];
  const parents = new Map();
  vg.edges.forEach(e => {
    if (skip.has(e.id)) return;
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target).push(e.source);
  });
  const depth = new Map();
  const via = new Map();
  const onStack = new Set();
  const dist = k => {
    if (k === srcKey) return 0;
    if (avoid && avoid.has(k) && k !== dstKey) return -Infinity;
    if (depth.has(k)) return depth.get(k);
    if (onStack.has(k)) return -Infinity;
    onStack.add(k);
    let best = -Infinity, bestParent;
    for (const p of parents.get(k) || []) {
      const d = dist(p);
      if (d > -Infinity && d + 1 > best) { best = d + 1; bestParent = p; }
    }
    onStack.delete(k);
    depth.set(k, best);
    if (bestParent !== undefined) via.set(k, bestParent);
    return best;
  };
  if (dist(dstKey) === -Infinity) return null;
  const path = [dstKey];
  let cur = dstKey;
  while (cur !== srcKey) { cur = via.get(cur); path.unshift(cur); }
  return path;
}

// stitch a route through the ordered click-trail: each waypoint extends the
// route from the previous one; a stale or unreachable waypoint is skipped,
// falling back to a fresh root route so the trail degrades gracefully
// shortest forward path (BFS) over the rendered edges. The lit route uses
// SHORTEST, not longest: nothing appears between two clicked stops that does
// not have to be there, and the route cannot mutate when an unrelated branch
// expands. If the user wants a node on the path, they click it.
function shortestBetween(vg, srcKey, dstKey, skip, avoid) {
  if (srcKey === dstKey) return [srcKey];
  const out = new Map();
  vg.edges.forEach(e => {
    if (skip.has(e.id)) return;
    if (!out.has(e.source)) out.set(e.source, []);
    out.get(e.source).push(e.target);
  });
  const prev = new Map([[srcKey, null]]);
  const queue = [srcKey];
  while (queue.length) {
    const k = queue.shift();
    for (const n of out.get(k) || []) {
      if (prev.has(n)) continue;
      if (avoid && avoid.has(n) && n !== dstKey) continue;
      prev.set(n, k);
      if (n === dstKey) { queue.length = 0; break; }
      queue.push(n);
    }
  }
  if (!prev.has(dstKey)) return null;
  const path = [];
  for (let k = dstKey; k !== null; k = prev.get(k)) path.unshift(k);
  return path;
}

// the nearest forward INSTANCE of w's def reachable from src — where the
// unroll carried a looped-back waypoint
function instanceSeg(vg, src, w, skip, avoid) {
  const wDef = defOfKey(vg, w);
  let best = null;
  vg.defOf.forEach((def, key) => {
    if (def !== wDef || key === w) return;
    const seg = shortestBetween(vg, src, key, skip, avoid);
    if (seg && (!best || seg.length < best.length)) best = seg;
  });
  return best;
}

/* ---------- trail: literal click tracking ----------
   The trail is exactly the clicked sequence. Each click is judged FROM THE
   PREVIOUS CLICK — or its unrolled #n instance, the route's current end —
   never from anywhere else. Pure: the UI applies the returned decision and
   can announce it; tests pin every branch. Actions:
   extend  — key is forward of the previous click (directly or via instance)
   reveal  — the data connects previous→key but the edge is hidden because
             the previous click is collapsed: expand it, then extend
   restart — no forward connection: the path starts over at key
   start   — first click of a trail
   rewind  — clicked an earlier waypoint: cut back to it
   clear   — re-clicked the selection: deselect
   resume  — the trail was cleared but the last committed path (`memory`) is
             remembered: clicking a node ON it restores the record up to that
             node; clicking forward of its end continues the record */
function trailStep(model, vg, backEdges, expanded, trail, route, key, memory) {
  const last = k => { const j = k.lastIndexOf('~'); return j === -1 ? k : k.slice(j + 1); };
  if (trail.length && key === route[route.length - 1] && key !== trail[trail.length - 1]) {
    return { trail: [], action: 'clear' };     // re-click on the selected #n instance
  }
  const i = trail.indexOf(key);
  if (i >= 0) {
    return i === trail.length - 1
      ? { trail: [], action: 'clear' }
      : { trail: trail.slice(0, i + 1), action: 'rewind' };
  }
  const from = route[route.length - 1] || trail[trail.length - 1] || null;
  if (!from) {
    if (memory && memory.length) {
      const mi = memory.indexOf(key);
      if (mi >= 0) return { trail: memory.slice(0, mi + 1), action: 'resume' };
      const memEnd = memory[memory.length - 1];
      if (shortestBetween(vg, memEnd, key, backEdges) || instanceSeg(vg, memEnd, key, backEdges)) {
        return { trail: [...memory, key], action: 'resume', from: memEnd };
      }
    }
    return { trail: [key], action: 'start' };
  }
  if (shortestBetween(vg, from, key, backEdges) || instanceSeg(vg, from, key, backEdges)) {
    return { trail: [...trail, key], action: 'extend', from };
  }
  if (!expanded.has(from) &&
      (model.childrenOf.get(last(from)) || []).some(c => c.target === last(key))) {
    return { trail: [...trail, key], action: 'reveal', from };
  }
  return { trail: [key], action: 'restart', from };
}

function activeRoute(vg, rootId, trail, skip) {
  const route = [rootId];
  for (const w of trail) {
    if (!vg.keySet.has(w)) continue;
    if (w === rootId) { route.length = 1; continue; }
    const cur = route[route.length - 1];
    // a segment may never cross a LATER trail waypoint: routing ahead through
    // a stop you have not reached yet is what reorders clicks. EARLIER stops
    // stay traversable — a restarted leg may legitimately pass back through.
    const avoid = new Set(trail.slice(trail.indexOf(w) + 1).filter(t => t !== cur));
    let seg = shortestBetween(vg, cur, w, skip, avoid)
           || instanceSeg(vg, cur, w, skip, avoid);   // waypoint unrolled away: hop to its #n copy
    if (!seg) {
      seg = shortestBetween(vg, rootId, w, skip, avoid)
         || instanceSeg(vg, rootId, w, skip, avoid);
      if (!seg) continue;
      route.length = 1;
    }
    route.push(...seg.slice(1));
  }
  return route;
}

// shortest def-id ancestry root -> defId (reveals a search hit's path)
function keyLineage(model, defId) {
  if (defId === model.rootId) return [model.rootId];
  const next = new Map();
  const seen = new Set([defId]);
  const queue = [defId];
  let reached = false;
  while (queue.length) {
    const n = queue.shift();
    if (n === model.rootId) { reached = true; break; }
    for (const p of model.parentsOf.get(n) || []) {
      if (!seen.has(p)) { seen.add(p); next.set(p, n); queue.push(p); }
    }
  }
  if (!reached) return [defId];
  const path = [model.rootId];
  let cur = model.rootId;
  while (cur !== defId) { cur = next.get(cur); path.push(cur); }
  return path;
}

// instance-aware lineage: the render KEYS to expand so `key` materialises —
// the canonical base takes the shortest def route, instance segments append
function keyLineageKeys(model, key) {
  const segs = key.split('~');
  const lineage = keyLineage(model, segs[0]);
  let cur = segs[0];
  for (let i = 1; i < segs.length; i++) {
    cur = cur + '~' + segs[i];
    lineage.push(cur);
  }
  return lineage;
}

/* ---------- layout pipeline ----------
   Items are view/waypoint objects carrying {h, rank, cyDisp, targetCy, isWay,
   pks (parent keys, real nodes only)}. Packed columns: barycenter ordering
   sweeps then PAVA least-squares coordinate assignment, order-preserving. */

function syncWays(ways, edgeList, rankOf, keep, spawnYOf) {
  const used = new Set();
  const wsOf = new Map();
  edgeList.forEach(e => {
    const span = rankOf(e.target) - rankOf(e.source);
    const list = [];
    for (let k = 1; k < span; k++) {
      const wid = e.id + '@' + k;
      const r = rankOf(e.source) + k;
      let w = ways.get(wid);
      if (!w) {
        const y = spawnYOf(e.source);
        w = { id: wid, isWay: true, h: WAY_H, rank: r,
              cyDisp: y, targetCy: y,
              xDisp: r * COL_PITCH, targetX: r * COL_PITCH };
        ways.set(wid, w);
      }
      w.rank = r;
      w.targetX = r * COL_PITCH;
      used.add(wid);
      list.push(w);
    }
    if (list.length) wsOf.set(e.id, list);
  });
  ways.forEach((w, wid) => {
    if (!used.has(wid) && !keep.has(wid)) ways.delete(wid);
  });
  return wsOf;
}

function buildColumns(items) {
  const cols = [];
  items.forEach(it => {
    (cols[it.rank] || (cols[it.rank] = [])).push(it);
  });
  // initial order = current on-screen vertical order (warm start; new items sit
  // at their spawn parent's y, so the stable sort keeps insertion order on ties)
  cols.forEach(col => col && col.sort((a, b) => a.cyDisp - b.cyDisp));
  return cols;
}

// hop-by-hop adjacency through waypoints: every link is between adjacent ranks
function buildAdj(chains) {
  const inN = new Map(), outN = new Map();
  const link = (a, b) => {
    if (!outN.has(a)) outN.set(a, []);
    outN.get(a).push(b);
    if (!inN.has(b)) inN.set(b, []);
    inN.get(b).push(a);
  };
  chains.forEach(chain => {
    for (let i = 0; i < chain.length - 1; i++) link(chain[i], chain[i + 1]);
  });
  return { inN, outN };
}

// the def id a render key points at (instance keys end `…~def`)
function keyDef(k) {
  const i = k.lastIndexOf('~');
  return i === -1 ? k : k.slice(i + 1);
}

// child position within a parent's DECLARED edge order, cached per model
function childIndexOf(model) {
  if (!model._childIndex) {
    const m = new Map();
    model.childrenOf.forEach((kids, pid) => {
      kids.forEach((c, i) => m.set(pid + '|' + c.target, i));
    });
    model._childIndex = m;
  }
  return model._childIndex;
}

// Sibling order is DATA order: a parent's children always render in the order
// their edges are declared — the sweeps arrange GROUPS by barycenter but never
// shuffle brothers. Multi-parent nodes (shared gates) and waypoints have no
// single home group, so they float alone between the fixed runs.
function orderColumns(cols, inN, outN, model) {
  const idx = model ? childIndexOf(model) : new Map();
  const pos = new Map();
  const setPos = col => col.forEach((it, i) => pos.set(it, i));
  cols.forEach(c => c && setPos(c));
  const sweep = downward => {
    const start = downward ? 1 : cols.length - 2;
    const end = downward ? cols.length : -1;
    const step = downward ? 1 : -1;
    for (let r = start; r !== end; r += step) {
      const col = cols[r];
      if (!col || col.length < 2) continue;
      const neigh = downward ? inN : outN;
      const bary = new Map(col.map(it => {
        const ns = neigh.get(it);
        if (!ns || !ns.length) return [it, pos.get(it)];
        return [it, ns.reduce((a, x) => a + pos.get(x), 0) / ns.length];
      }));
      const groups = new Map();
      col.forEach(it => {
        const gk = (!it.isWay && it.pks && it.pks.length === 1)
          ? it.pks[0]
          : '#' + (it.key || it.id);
        if (!groups.has(gk)) groups.set(gk, []);
        groups.get(gk).push(it);
      });
      const units = [...groups.entries()].map(([gk, items]) => {
        if (!gk.startsWith('#')) {
          const pdef = keyDef(gk);
          items.sort((a, b) =>
            (idx.get(pdef + '|' + keyDef(a.key)) ?? 0) -
            (idx.get(pdef + '|' + keyDef(b.key)) ?? 0));
        }
        const g = items.reduce((a, it) => a + bary.get(it), 0) / items.length;
        return { g, items };
      });
      units.sort((a, b) => a.g - b.g);
      col.length = 0;
      units.forEach(u => col.push(...u.items));
      setPos(col);
    }
  };
  sweep(true); sweep(false); sweep(true);
}

function sharesParent(a, b) {
  if (a.isWay || b.isWay || !a.pks || !b.pks) return false;
  return a.pks.some(k => b.pks.includes(k));
}

function gapsFor(arr) {
  return arr.map((n, i) => {
    if (i === 0) return 0;
    const prev = arr[i - 1];
    if (n.isWay || prev.isWay) return WAY_GAP;
    return sharesParent(prev, n) ? VGAP : GROUP_GAP;
  });
}

function blockResolve(arr, desired) {
  if (!arr.length) return;
  const gaps = gapsFor(arr);
  const n = arr.length;
  // A block is a CONTIGUOUS run of items, so an item's offset inside it is a prefix-sum
  // difference: D[j] - D[lo]. Deriving it that way keeps each merge O(1). The previous
  // form re-walked every item already in the block to bump its offset and copied both
  // item arrays to concatenate them, which is quadratic — a 5,000-wide fan-out blocked
  // the host's main thread for ~29s.
  const D = new Float64Array(n);
  for (let j = 1; j < n; j++) D[j] = D[j - 1] + arr[j - 1].h + gaps[j];
  const heightOf = (lo, hi) => D[hi] - D[lo] + arr[hi].h;

  const blocks = [];
  for (let i = 0; i < n; i++) {
    let lo = i, top = desired[i] - arr[i].h / 2, weight = 1;
    while (blocks.length) {
      const p = blocks[blocks.length - 1];
      const gap = gaps[lo];
      const pHeight = heightOf(p.lo, p.hi);
      if (p.top + pHeight + gap <= top) break;
      const off = pHeight + gap;
      top = (p.top * p.weight + (top - off) * weight) / (p.weight + weight);
      weight = p.weight + weight;
      lo = p.lo;
      blocks.pop();
    }
    blocks.push({ lo, hi: i, top, weight });
  }
  blocks.forEach(b => {
    for (let j = b.lo; j <= b.hi; j++) {
      arr[j].targetCy = b.top + (D[j] - D[b.lo]) + arr[j].h / 2;
    }
  });
}

function assignCoords(cols, inN, outN) {
  cols.forEach(col => col && col.forEach(it => { it.targetCy = it.cyDisp; }));
  const sweep = downward => {
    const start = downward ? 1 : cols.length - 2;
    const end = downward ? cols.length : -1;
    const step = downward ? 1 : -1;
    for (let r = start; r !== end; r += step) {
      const col = cols[r];
      if (!col) continue;
      const neigh = downward ? inN : outN;
      const desired = col.map(it => {
        const ns = neigh.get(it);
        if (!ns || !ns.length) return it.targetCy;
        return ns.reduce((a, x) => a + x.targetCy, 0) / ns.length;
      });
      blockResolve(col, desired);
    }
  };
  sweep(true); sweep(false); sweep(true); sweep(false);
}

/* ---------- search: tiered index built once per map ---------- */

function buildSearchIndex(model) {
  return [...model.defs.values()]
    .filter(d => d.kind !== 'start')
    .map(d => ({
      id: d.id, label: d.label, group: d.group,
      l: d.label.toLowerCase(),
      s: (d.summary || '').toLowerCase(),
      g: (d.group || '').toLowerCase(),
    }));
}

function scoreEntry(e, q) {
  const bonus = (hay, i, base, prefix, word) => {
    if (i < 0) return 0;
    if (i === 0) return prefix;
    return /[\s.]/.test(hay[i - 1]) ? word : base;
  };
  let sc = bonus(e.l, e.l.indexOf(q), 55, 100, 80);        // label outranks…
  sc = Math.max(sc, bonus(e.s, e.s.indexOf(q), 12, 35, 25)); // …summary…
  sc = Math.max(sc, e.g.startsWith(q) ? 20 : 0);             // …group
  return sc;
}

function searchMap(index, query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index
    .map(e => [scoreEntry(e, q), e])
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0] || a[1].label.localeCompare(b[1].label))
    .slice(0, limit)
    .map(([, e]) => e);
}

/* ---------- share tokens ----------
   The state is a set of `~`-delimited render keys sharing long common prefixes, so a
   deep exploration balloons the URL. We serialise to a `map=…&open=…&sel=…` query
   string (no JSON quoting, and empty fields simply absent), DEFLATE it, and base64url
   it into one opaque token. Readable links (no `s=` token) still parse, which keeps
   old shares working and leaves a format you can eyeball while debugging.

   Pure and environment-agnostic (browser and Node both provide the streams), so the
   round-trip is testable headlessly. */

// chunked on purpose: String.fromCharCode(...bytes) spreads the whole array as arguments
// and blows the stack on a large state, which surfaces as the URL silently ceasing to
// update and copy-link doing nothing
const b64url = bytes => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};
const unb64url = str => Uint8Array.from(
  atob(str.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));

// A share link is a few KB of attacker-controlled deflate. Left unbounded it is a
// classic zip bomb: a 10 KB token expands ~770x, and the millions of ids it decodes to
// cost far more again in split/map/Set. Read the stream in chunks and give up early
// rather than materialising the whole thing.
const MAX_TOKEN_BYTES = 256 * 1024;
const MAX_LIST_ITEMS = 20000;

// Response.body is a ReadableStream in browsers AND in jsdom, where Blob.prototype.stream
// is absent — so the codec stays testable in the same environment the app is tested in.
function byteStream(bytes) {
  if (typeof Response !== 'undefined') return new Response(bytes).body;
  return new Blob([bytes]).stream();
}

async function pipeBytes(bytes, stream, limit) {
  const reader = byteStream(bytes).pipeThrough(stream).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (limit && total > limit) {
      await reader.cancel();
      throw new Error('token expands past the limit');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

const csv = v => (v || []).map(String).map(x => x.trim()).filter(Boolean);
// the cap belongs on the way IN (a hostile link), never on the way out (our own state)
const splitCsv = v => csv((v || '').split(',')).slice(0, MAX_LIST_ITEMS);

// URLSearchParams percent-encodes the separators themselves — every comma becomes %2C,
// which on a 500-key open set costs more than the JSON quoting it was meant to save. So
// escape the VALUES and keep the separators literal. encodeURIComponent leaves
// alphanumerics and - _ . ! ~ * ' ( ) alone, and render keys are built from those.
const encList = list => csv(list).map(encodeURIComponent).join(',');
const decList = v => splitCsv(v).map(decodeURIComponent);
// an unroll entry is `sourceKey->childDefId`; `!` survives encoding, `>` does not
const encPart = v => encodeURIComponent(v).replaceAll('!', '%21');   // '!' is our separator
const encPairs = list => csv(list).map(u => {
  const i = u.indexOf('->');
  return i < 0 ? encPart(u) : encPart(u.slice(0, i)) + '!' + encPart(u.slice(i + 2));
}).join(',');
const decPairs = v => splitCsv(v).map(u => {
  const i = u.indexOf('!');
  return i < 0 ? decodeURIComponent(u)
    : decodeURIComponent(u.slice(0, i)) + '->' + decodeURIComponent(u.slice(i + 1));
});

/* state -> the inner query string. Anything empty is omitted rather than encoded. */
function serializeState(state) {
  const parts = [];
  if (state.m) parts.push('map=' + encodeURIComponent(state.m));
  if (state.o && state.o.length) parts.push('open=' + encList(state.o));
  const trail = csv(state.t);
  // a single selection is just `sel`; only a genuine multi-hop trail is worth storing
  if (trail.length) parts.push('sel=' + encodeURIComponent(trail[trail.length - 1]));
  if (trail.length > 1) parts.push('trail=' + encList(trail));
  if (state.u && state.u.length) parts.push('unroll=' + encPairs(state.u));
  return parts.join('&');
}

/* the inner query string -> state */
function deserializeState(query) {
  // Read the RAW value and split before decoding. URLSearchParams would turn a %2C back
  // into a comma first, and an id that legitimately contains one would then split in two.
  const raw = key => {
    for (const part of String(query || '').split('&')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i) === key) return part.slice(i + 1);
    }
    return null;
  };
  const sel = raw('sel');
  const trail = raw('trail');
  return {
    m: raw('map') ? decodeURIComponent(raw('map')) : null,
    o: decList(raw('open')),
    t: trail ? decList(trail) : (sel ? [decodeURIComponent(sel)] : []),
    u: decPairs(raw('unroll')),
  };
}

/* An empty state encodes to '' so the caller can drop the hash entirely rather than
   park a token that says nothing. */
async function encodeToken(state) {
  const query = serializeState(state);
  if (!query) return '';
  const bytes = new TextEncoder().encode(query);
  if (typeof CompressionStream === 'undefined') return 'j:' + b64url(bytes);
  return 'z:' + b64url(await pipeBytes(bytes, new CompressionStream('deflate-raw')));
}

// Whatever shape a token arrives in — query string, compressed, or the legacy JSON blob —
// it ends here. The JSON branch used to bypass deserializeState and with it the item cap
// and the string rule, so 25,001 entries walked straight in.
function normalizeState(st) {
  if (!st || typeof st !== 'object' || Array.isArray(st)) return null;
  const list = v => (Array.isArray(v) ? v : [])
    .filter(x => typeof x === 'string').slice(0, MAX_LIST_ITEMS);
  return {
    m: typeof st.m === 'string' ? st.m : null,
    o: list(st.o),
    t: list(st.t),
    u: list(st.u),
  };
}

async function decodeToken(token) {
  if (!token) return null;
  // a hash longer than any state we would ever write is a bomb, not a link
  if (token.length > MAX_TOKEN_BYTES) return null;
  try {
    const kind = token.slice(0, 2);
    // no prefix: a readable link, or an old JSON payload from before this format
    if (kind !== 'z:' && kind !== 'j:') {
      if (token.trimStart().startsWith('{')) return normalizeState(JSON.parse(token));
      return normalizeState(deserializeState(token));
    }
    const body = unb64url(token.slice(2));
    const bytes = kind === 'z:'
      ? await pipeBytes(body, new DecompressionStream('deflate-raw'), MAX_TOKEN_BYTES)
      : body;
    if (bytes.length > MAX_TOKEN_BYTES) return null;
    const text = new TextDecoder().decode(bytes);
    return normalizeState(
      text.trimStart().startsWith('{') ? JSON.parse(text) : deserializeState(text));
  } catch {
    return null;                    // malformed link: caller falls back to defaults
  }
}

/* ---------- module surface ----------
   The engine is consumable three ways: a classic <script> (window.GraphEngine),
   CommonJS (require), or bundled. It never touches the DOM, so it also runs in
   Node for tests, static builds and server-side path queries. */

const GraphEngine = {
  // layout constants (a renderer needs these to place cards and route edges)
  CARD_W, COL_GAP, COL_PITCH, VGAP, GROUP_GAP, WAY_GAP, WAY_H, KNOB, CORNER, MAX_UNROLL,
  // model
  buildModel, hasChildren, childCount,
  // visibility, unrolling, focus
  computeVisible, computeRanks, resolveVisible, focusSlice, defOfKey,
  // paths and the click trail
  pathBetween, shortestBetween, instanceSeg, activeRoute, trailStep,
  keyLineage, keyLineageKeys,
  // layout pipeline
  syncWays, buildColumns, buildAdj, orderColumns, assignCoords, blockResolve,
  // search and sharing
  buildSearchIndex, searchMap, encodeToken, decodeToken, serializeState, deserializeState,
};

if (typeof module !== 'undefined' && module.exports) module.exports = GraphEngine;
globalThis.GraphEngine = GraphEngine;
