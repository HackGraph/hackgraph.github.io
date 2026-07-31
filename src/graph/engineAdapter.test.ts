/**
 * Proves the vendored engine can drive THIS app's real data before any renderer changes.
 *
 * This is the port's load-bearing check: if the engine cannot reproduce the shipped maps —
 * every id legal, every phase resolvable, the whole graph reachable from the root — then
 * swapping the renderer would only move the failure somewhere harder to see.
 */
import { describe, expect, it } from 'vitest';
import { MAPS } from '../data';
import { toEngineMap } from './engineAdapter';
import { GraphEngine } from './engine';

/**
 * Open every CANONICAL node, which is what "show the whole map" means here.
 *
 * Deliberately not every rendered key: expanding an unrolled `#n` instance can unroll its
 * own loop again, so on a map with cycles — which all of ours have — that set does not
 * converge. Canonical keys are bounded by the node count.
 */
function expandAll(model: ReturnType<typeof GraphEngine.buildModel>) {
  const open = new Set<string>([model.rootId]);
  for (let pass = 0; pass < 40; pass++) {
    const res = GraphEngine.resolveVisible(model, open, new Set());
    const before = open.size;
    for (const key of res.vg.nodeKeys) {
      if (key.includes('~')) continue;                       // an instance, not a def
      if (GraphEngine.hasChildren(model, key)) open.add(key);
    }
    if (open.size === before) break;
  }
  return GraphEngine.resolveVisible(model, open, new Set());
}

describe.each(MAPS.map((m) => [m.id, m] as const))('engine drives the %s map', (_id, map) => {
  const engineMap = toEngineMap(map);

  it('every node id is legal for the engine key scheme', () => {
    // buildModel throws on `~`, `|` or `->`, which would silently resolve to another node
    expect(() => GraphEngine.buildModel(engineMap)).not.toThrow();
  });

  it('every node resolves to a phase colour', () => {
    const model = GraphEngine.buildModel(engineMap);
    const missing = engineMap.nodes.filter((n) => !model.colorOf.has(n.group));
    expect(missing.map((n) => n.id)).toEqual([]);
  });

  it('reaches every authored node from the root', () => {
    const model = GraphEngine.buildModel(engineMap);
    const res = expandAll(model);
    const reached = new Set(res.vg.nodeKeys.map((k) => GraphEngine.defOfKey(res.vg, k)));
    const unreachable = engineMap.nodes.map((n) => n.id).filter((id) => !reached.has(id));
    expect(unreachable).toEqual([]);
  });

  it('ranks strictly increase across every forward edge', () => {
    const model = GraphEngine.buildModel(engineMap);
    const res = expandAll(model);
    const backwards = res.vg.edges.filter(
      (e) => !res.backEdges.has(e.id) && (res.rank.get(e.target) ?? 0) <= (res.rank.get(e.source) ?? 0),
    );
    expect(backwards.map((e) => e.id)).toEqual([]);
  });

  it('round-trips its view state through the share codec', async () => {
    const model = GraphEngine.buildModel(engineMap);
    const res = expandAll(model);
    const state = { m: map.id, o: [...res.vg.nodeKeys], t: [], u: [...res.unroll] };
    const back = (await GraphEngine.decodeToken(await GraphEngine.encodeToken(state))) as typeof state;
    expect(back.m).toBe(map.id);
    expect(back.o).toEqual(state.o);
    expect(back.u).toEqual(state.u);
  });
});

describe('adapter', () => {
  it('maps phase ids to the labels the engine colours by', () => {
    const map = MAPS[0];
    const engineMap = toEngineMap(map);
    const labels = new Set(map.phases.map((p) => p.label));
    expect(engineMap.nodes.every((n) => labels.has(n.group))).toBe(true);
  });

  it('folds edge captions into a shared relationship table', () => {
    const map = MAPS[0];
    const engineMap = toEngineMap(map);
    const captioned = map.edges.filter((e) => e.label).length;
    expect(captioned).toBeGreaterThan(0);
    // one entry per distinct caption, not one per edge
    expect(Object.keys(engineMap.relationships).length).toBeLessThanOrEqual(captioned);
    for (const e of engineMap.edges) {
      if (e.rel) expect(engineMap.relationships[e.rel]).toBeDefined();
    }
  });
});
