/**
 * Proves the vendored engine can drive THIS app's real data before any renderer changes.
 *
 * This is the port's load-bearing check: if the engine cannot reproduce the shipped maps —
 * every id legal, every phase resolvable, the whole graph reachable from the root — then
 * swapping the renderer would only move the failure somewhere harder to see.
 */
import { describe, expect, it } from 'vitest';
import { MAPS } from '../data';
import { RELATIONSHIPS } from '../data/relationships';
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

  it('folds edge wording into a shared relationship table', () => {
    const map = MAPS[0];
    const engineMap = toEngineMap(map);
    const captioned = map.edges.filter((e) => e.label).length;
    expect(captioned).toBeGreaterThan(0);
    // shared: same-meaning edges reuse an entry rather than each getting one
    expect(Object.keys(engineMap.relationships).length).toBeLessThan(engineMap.edges.length);
    for (const e of engineMap.edges) {
      if (e.rel) expect(engineMap.relationships[e.rel]).toBeDefined();
    }
  });

  /**
   * The adapter once keyed the table on the caption and never read `rel` at all, which threw
   * away the canonical explanation on every edge that relied on it — 172 of 765.
   */
  it('resolves every edge to the wording the data authored', () => {
    for (const map of MAPS) {
      const engineMap = toEngineMap(map);
      engineMap.edges.forEach((out, i) => {
        const src = map.edges[i];
        const canon = src.rel ? RELATIONSHIPS[src.rel] : undefined;
        const summary = src.description ?? canon?.description ?? '';
        const label = src.label ?? canon?.label ?? (summary ? 'transition' : undefined);
        if (!label) {
          expect(out.rel).toBeUndefined();
          return;
        }
        const rel = engineMap.relationships[out.rel!];
        expect(rel.label).toBe(label);
        expect(rel.summary).toBe(summary);
        // only an EXPLICIT caption is drawn on the canvas
        expect(rel.tag !== false).toBe(src.label !== undefined);
      });
    }
  });

  it('gives edges that disagree on wording separate entries', () => {
    const map: Parameters<typeof toEngineMap>[0] = {
      id: 'm',
      name: 'M',
      rootId: 'a',
      phases: [{ id: 'p', label: 'P', color: '#fff' }],
      nodes: [
        { id: 'a', label: 'A', phase: 'p', summary: '' },
        { id: 'b', label: 'B', phase: 'p', summary: '' },
        { id: 'c', label: 'C', phase: 'p', summary: '' },
      ],
      edges: [
        { source: 'a', target: 'b', label: 'same', description: 'one' },
        { source: 'a', target: 'c', label: 'same', description: 'two' },
      ],
    };
    const out = toEngineMap(map);
    expect(out.edges[0].rel).not.toBe(out.edges[1].rel);
    expect(out.relationships[out.edges[0].rel!].summary).toBe('one');
    expect(out.relationships[out.edges[1].rel!].summary).toBe('two');
  });

  it('rejects an edge naming a relationship that does not exist', () => {
    const map = structuredClone(MAPS[0]) as ReturnType<typeof structuredClone<typeof MAPS[0]>>;
    map.edges[0] = { ...map.edges[0], rel: 'no-such-rel' };
    expect(() => toEngineMap(map)).toThrow(/unknown rel/);
  });
});
