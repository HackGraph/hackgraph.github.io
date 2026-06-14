import { describe, it, expect } from 'vitest';
import { buildModel } from './buildModel';
import { computeVisible, pathInRendered } from './visibility';
import { layoutGraph, resolveUnroll } from './layout';
import type { AttackEdge, TechniqueNodeDef } from '../data/schema';
import { adMap } from '../data/maps/ad';

describe('layoutGraph (left→right)', () => {
  const model = buildModel(adMap);
  const visible = computeVisible(model, new Set(model.nodes.keys()));
  const pos = layoutGraph(visible.nodeIds, visible.edges);

  it('positions every visible node (incl. forward-unrolled loop instances)', () => {
    // Every canonical node is positioned; the fully-expanded graph also carries
    // forward instances of repeatable hubs (loop-backs unrolled), so size ≥ nodes.
    for (const id of model.nodes.keys()) expect(pos.has(id)).toBe(true);
    expect(pos.size).toBeGreaterThanOrEqual(model.nodes.size);
  });

  it('lays the start node left of its descendants', () => {
    const start = pos.get('start')!;
    const da = pos.get('domain-admin')!;
    const persistence = pos.get('adminsdholder')!;
    expect(start.x).toBeLessThan(da.x);
    expect(da.x).toBeLessThanOrEqual(persistence.x);
  });

  it('keeps the root at the leftmost rank', () => {
    const startX = pos.get('start')!.x;
    for (const [, p] of pos) {
      expect(p.x).toBeGreaterThanOrEqual(startX);
    }
  });

  // Every attack path should flow toward Domain Admin → persistence. The ONLY
  // legitimate terminal (leaf) nodes are persistence techniques; any other
  // childless node is an accidental dead-end.
  it('only persistence nodes are terminal (no dead-ends)', () => {
    const deadEnds: string[] = [];
    for (const [id, def] of model.nodes) {
      if (def.kind === 'category') continue;
      const children = model.childrenOf.get(id) ?? [];
      if (children.length === 0 && def.phase !== 'persistence') {
        deadEnds.push(`${id} (${def.phase})`);
      }
    }
    expect(deadEnds).toEqual([]);
  });
});

describe('resolveUnroll + pathInRendered (highlight matches the drawn graph)', () => {
  // root → start → H(repeatable) → c → m1 → m2, with m2 → H closing a loop. The
  // loop makes H unroll into a forward instance under m2 (`m2~H`); inside that
  // instance the chain repeats (`m2~H~c → m2~H~m1 → m2~H~m2`). Selecting the deep
  // `m2~H~m2` used to synthesize a bogus `m2~H → m2~H~m2` edge (gap + weird route).
  function loopModel() {
    const nodes: TechniqueNodeDef[] = [
      { id: 'root', label: 'root', phase: 'recon' },
      { id: 'start', label: 'start', phase: 'recon' },
      { id: 'H', label: 'H', phase: 'recon' },
      { id: 'c', label: 'c', phase: 'recon' },
      { id: 'm1', label: 'm1', phase: 'recon' },
      { id: 'm2', label: 'm2', phase: 'recon' },
    ];
    const edges: AttackEdge[] = [
      { source: 'root', target: 'start' },
      { source: 'start', target: 'H' },
      { source: 'H', target: 'c' },
      { source: 'c', target: 'm1' },
      { source: 'm1', target: 'm2' },
      { source: 'm2', target: 'H' }, // loop-back → unrolls H forward
    ];
    return buildModel({ id: 't', name: 't', rootId: 'root', phases: [{ id: 'recon', label: 'R', color: '#000' }], nodes, edges });
  }

  it('auto-discovers the loop-back from layout and unrolls it forward', () => {
    const model = loopModel();
    const { unrollSet, graph } = resolveUnroll(model, new Set(['root', 'start', 'H', 'c', 'm1', 'm2', 'm2~H', 'm2~H~c', 'm2~H~m1']));
    expect(unrollSet.has('m2->H')).toBe(true);
    expect(graph.nodeIds.has('m2~H~m2')).toBe(true);
    // the canonical loop-back edge is gone, replaced by a forward edge into the instance.
    const ids = graph.edges.map((e) => e.id);
    expect(ids).toContain('m2->m2~H');
    expect(ids).not.toContain('m2->H');
  });

  it('lights the deep instance node along ONLY real edges, through the intermediates', () => {
    const model = loopModel();
    const { graph } = resolveUnroll(model, new Set(['root', 'start', 'H', 'c', 'm1', 'm2', 'm2~H', 'm2~H~c', 'm2~H~m1']));
    const path = pathInRendered(graph, 'root', 'm2~H~m2');
    expect(path[0]).toBe('root');
    expect(path[path.length - 1]).toBe('m2~H~m2');
    // passes THROUGH the in-context intermediates (no shortcut, no gap)…
    expect(path).toContain('m2~H~c');
    expect(path).toContain('m2~H~m1');
    // …and every consecutive pair is an edge that is actually drawn.
    const drawn = new Set(graph.edges.map((e) => e.id));
    for (let i = 1; i < path.length; i++) expect(drawn.has(`${path[i - 1]}->${path[i]}`)).toBe(true);
  });
});
