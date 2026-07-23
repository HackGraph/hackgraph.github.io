import { describe, it, expect } from 'vitest';
import { buildModel } from './buildModel';
import { computeVisible, pathInRendered, activeRoute, type VisibleGraph } from './visibility';
import type { AttackEdge, MapDefinition, TechniqueNodeDef } from '../data/schema';
import { adMap } from '../data/maps/ad';
import { windowsPeMap } from '../data/maps/windows-pe';

/** Build a tiny test model: every node is a recon-phase stub. */
function model(ids: string[], edges: AttackEdge[], rootId = 'root') {
  const def: MapDefinition = {
    id: 'test',
    name: 'test',
    rootId,
    phases: [{ id: 'recon', label: 'Recon', color: '#5e9bff' }],
    nodes: ids.map((id) => ({ id, label: id, phase: 'recon' })),
    edges,
  };
  return buildModel(def);
}

/**
 *        root
 *        /  \
 *       a    b
 *       |\   /
 *       e c-+      (c has two parents: a, b)
 *       |  |
 *       f  d
 */
const diamond = model(
  ['root', 'a', 'b', 'c', 'd', 'e', 'f'],
  [
    { source: 'root', target: 'a' },
    { source: 'root', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'b', target: 'c' },
    { source: 'c', target: 'd' },
    { source: 'a', target: 'e' },
    { source: 'e', target: 'f' },
  ],
);

const ids = (s: Set<string>) => [...s].sort();
const edgeIds = (es: { id: string }[]) => es.map((e) => e.id).sort();

describe('computeVisible', () => {
  it('shows only the root when nothing is expanded', () => {
    const v = computeVisible(diamond, new Set());
    expect(ids(v.nodeIds)).toEqual(['root']);
    expect(v.edges).toHaveLength(0);
  });

  it('reveals direct children of an expanded node', () => {
    const v = computeVisible(diamond, new Set(['root']));
    expect(ids(v.nodeIds)).toEqual(['a', 'b', 'root']);
    expect(edgeIds(v.edges)).toEqual(['root->a', 'root->b']);
  });

  it('reveals a multi-parent node when ANY parent is expanded', () => {
    const v = computeVisible(diamond, new Set(['root', 'a']));
    expect(v.nodeIds.has('c')).toBe(true); // via a
    expect(v.nodeIds.has('e')).toBe(true);
    expect(v.nodeIds.has('d')).toBe(false); // c not expanded
  });

  it('draws BOTH incoming edges of a convergent node when both parents expand', () => {
    const v = computeVisible(diamond, new Set(['root', 'a', 'b']));
    expect(edgeIds(v.edges)).toContain('a->c');
    expect(edgeIds(v.edges)).toContain('b->c');
    // c is only added to the node set once.
    expect([...v.nodeIds].filter((id) => id === 'c')).toHaveLength(1);
  });

  it('keeps a node visible after collapsing one of two expanded parents', () => {
    const v = computeVisible(diamond, new Set(['root', 'b'])); // a collapsed
    expect(v.nodeIds.has('c')).toBe(true); // still reachable via b
    expect(v.nodeIds.has('e')).toBe(false); // only reachable via collapsed a
    expect(edgeIds(v.edges)).toContain('b->c');
    expect(edgeIds(v.edges)).not.toContain('a->c');
  });

  it('hides descendants reachable ONLY through a collapsed node', () => {
    const expanded = computeVisible(diamond, new Set(['root', 'a', 'c']));
    expect(expanded.nodeIds.has('d')).toBe(true);
    const collapsed = computeVisible(diamond, new Set(['root', 'a'])); // c collapsed
    expect(collapsed.nodeIds.has('d')).toBe(false);
  });

  it('remembers expansion: a hidden-but-expanded node pops back with its subtree', () => {
    // e is "expanded" but a is collapsed -> e (and f) hidden.
    const hidden = computeVisible(diamond, new Set(['root', 'e']));
    expect(hidden.nodeIds.has('e')).toBe(false);
    expect(hidden.nodeIds.has('f')).toBe(false);
    // Re-expand a -> e reappears AND its child f comes with it.
    const restored = computeVisible(diamond, new Set(['root', 'a', 'e']));
    expect(restored.nodeIds.has('e')).toBe(true);
    expect(restored.nodeIds.has('f')).toBe(true);
  });

  it('terminates safely on cycles', () => {
    const cyclic = model(
      ['root', 'x', 'y'],
      [
        { source: 'root', target: 'x' },
        { source: 'x', target: 'y' },
        { source: 'y', target: 'x' },
      ],
    );
    const v = computeVisible(cyclic, new Set(['root', 'x', 'y']));
    expect(ids(v.nodeIds)).toEqual(['root', 'x', 'y']);
    expect(edgeIds(v.edges)).toEqual(['root->x', 'x->y', 'y->x']);
  });
});

describe('buildModel validation', () => {
  it('throws on a duplicate node id', () => {
    expect(() =>
      buildModel({
        id: 'd',
        name: 'd',
        rootId: 'a',
        phases: [],
        nodes: [
          { id: 'a', label: 'a', phase: 'recon' },
          { id: 'a', label: 'a2', phase: 'recon' },
        ],
        edges: [],
      }),
    ).toThrow(/duplicate node id/);
  });

  it('throws on a dangling edge endpoint', () => {
    expect(() =>
      buildModel({
        id: 'd',
        name: 'd',
        rootId: 'a',
        phases: [],
        nodes: [{ id: 'a', label: 'a', phase: 'recon' }],
        edges: [{ source: 'a', target: 'ghost' }],
      }),
    ).toThrow(/edge target "ghost"/);
  });

  it('throws when the root is not a defined node', () => {
    expect(() =>
      buildModel({ id: 'd', name: 'd', rootId: 'missing', phases: [], nodes: [], edges: [] }),
    ).toThrow(/rootId "missing"/);
  });
});

describe('AD map integrity', () => {
  const ad = buildModel(adMap);
  const fullyExpanded = computeVisible(ad, new Set(ad.nodes.keys()));

  it('builds without errors and every node is reachable from the root', () => {
    // Canonical key for every model node is present; the fully-expanded graph
    // additionally contains forward loop-instances of the repeatable hubs.
    for (const id of ad.nodes.keys()) expect(fullyExpanded.nodeIds.has(id)).toBe(true);
    expect(fullyExpanded.nodeIds.size).toBeGreaterThanOrEqual(ad.nodes.size);
  });

  it('converges on Domain Admin from multiple paths (incl. the core three)', () => {
    const parents = ad.parentsOf.get('domain-admin') ?? [];
    for (const core of ['acl-addself-group', 'dcsync', 'golden-ticket']) {
      expect(parents).toContain(core);
    }
    expect(parents.length).toBeGreaterThanOrEqual(3);
  });

  it('converges on valid-domain-creds from multiple routes', () => {
    expect(ad.parentsOf.get('valid-domain-creds')?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Windows PE map integrity', () => {
  const pe = buildModel(windowsPeMap);
  const fullyExpanded = computeVisible(pe, new Set(pe.nodes.keys()));

  it('builds without errors and is fully reachable from pe-start', () => {
    expect(fullyExpanded.nodeIds.size).toBe(pe.nodes.size);
  });

  it('every node carries a phase defined by the map', () => {
    for (const node of pe.nodes.values()) {
      expect(pe.phases.has(node.phase)).toBe(true);
    }
  });

  it('reaches the SYSTEM goal from many vectors', () => {
    expect(pe.parentsOf.get('nt-system')?.length ?? 0).toBeGreaterThanOrEqual(8);
  });
});

describe('computeVisible (main-graph forward loop unroll)', () => {
  // root → hub(repeatable) → a → b → hub   (b→hub closes a loop: the hub reaches b)
  // plus x → hub, a FORWARD convergence the hub cannot reach.
  function hubModel() {
    const nodes: TechniqueNodeDef[] = [
      { id: 'root', label: 'root', phase: 'recon' },
      { id: 'hub', label: 'hub', phase: 'recon' },
      { id: 'a', label: 'a', phase: 'recon' },
      { id: 'b', label: 'b', phase: 'recon' },
      { id: 'x', label: 'x', phase: 'recon' },
    ];
    const edges: AttackEdge[] = [
      { source: 'root', target: 'hub' },
      { source: 'root', target: 'x' },
      { source: 'x', target: 'hub' }, // forward convergence (hub can't reach x)
      { source: 'hub', target: 'a' },
      { source: 'a', target: 'b' },
      { source: 'b', target: 'hub' }, // loop-back (hub reaches b) → unrolls forward
    ];
    return buildModel({ id: 't', name: 't', rootId: 'root', phases: [{ id: 'recon', label: 'R', color: '#000' }], nodes, edges });
  }
  const all = new Set(['root', 'hub', 'a', 'b', 'x']);
  // The caller designates b->hub as a (layout-)backward loop edge to unroll;
  // x->hub is a forward convergence and is NOT in the set.
  const unroll = new Set(['b->hub']);

  it('without an unroll-set it is a plain DAG: the loop is a back edge, no instance', () => {
    const v = computeVisible(hubModel(), all);
    expect(v.nodeIds.has('b~hub')).toBe(false);
    expect(edgeIds(v.edges)).toContain('b->hub'); // ordinary back edge to the canonical hub
  });

  it('unrolls a designated loop edge into a forward instance, never pointing back', () => {
    const v = computeVisible(hubModel(), all, unroll);
    expect(v.nodeIds.has('b~hub')).toBe(true);
    expect(v.defOf.get('b~hub')).toBe('hub');
    expect(edgeIds(v.edges)).toContain('b->b~hub'); // forward into the instance
    expect(edgeIds(v.edges)).not.toContain('b->hub'); // the back edge is gone
  });

  it('leaves a forward convergence merged onto the one canonical hub', () => {
    const v = computeVisible(hubModel(), all, unroll);
    expect(edgeIds(v.edges)).toContain('x->hub');
    expect([...v.nodeIds].filter((k) => k === 'hub')).toHaveLength(1);
  });

  it('the forward instance is itself expandable and continues forward', () => {
    const v = computeVisible(hubModel(), new Set([...all, 'b~hub']), unroll);
    expect(v.nodeIds.has('b~hub~a')).toBe(true); // expanding the instance reveals fresh children
    expect(edgeIds(v.edges)).toContain('b~hub->b~hub~a');
  });
});

describe('pathInRendered (highlight follows the drawn edges)', () => {
  const graphOf = (nodeIds: string[], es: [string, string][]): VisibleGraph => ({
    nodeIds: new Set(nodeIds),
    edges: es.map(([source, target]) => ({ id: `${source}->${target}`, source, target })),
    defOf: new Map(),
  });

  it('walks THROUGH an instance context, never synthesizing a missing step', () => {
    // The exact bug shape: a multi-segment instance key `s~H~deep` whose node is
    // reached inside its context via `s~H~mid` — NOT a direct `s~H → s~H~deep` edge.
    const g = graphOf(
      ['root', 's', 's~H', 's~H~mid', 's~H~deep'],
      [['root', 's'], ['s', 's~H'], ['s~H', 's~H~mid'], ['s~H~mid', 's~H~deep']],
    );
    const path = pathInRendered(g, 'root', 's~H~deep');
    expect(path).toEqual(['root', 's', 's~H', 's~H~mid', 's~H~deep']);
    // every consecutive pair is an edge that is ACTUALLY drawn (no gaps).
    const drawn = new Set(g.edges.map((e) => e.id));
    for (let i = 1; i < path.length; i++) expect(drawn.has(`${path[i - 1]}->${path[i]}`)).toBe(true);
  });

  it('prefers the deepest drilled route over a shortcut edge that happens to be drawn', () => {
    const g = graphOf(
      ['root', 's', 's~H', 's~H~mid', 's~H~deep'],
      [
        ['root', 's'], ['s', 's~H'], ['s~H', 's~H~mid'], ['s~H~mid', 's~H~deep'],
        ['s~H', 's~H~deep'], // a shortcut straight to the deep node
      ],
    );
    expect(pathInRendered(g, 'root', 's~H~deep')).toEqual(['root', 's', 's~H', 's~H~mid', 's~H~deep']);
  });

  it('returns just the target when it is not drawn', () => {
    const g = graphOf(['root', 's'], [['root', 's']]);
    expect(pathInRendered(g, 'root', 'ghost')).toEqual(['ghost']);
  });

  it('cuts in-context cycles instead of looping forever', () => {
    const g = graphOf(['root', 'x', 'y'], [['root', 'x'], ['x', 'y'], ['y', 'x']]);
    expect(pathInRendered(g, 'root', 'y')).toEqual(['root', 'x', 'y']);
  });
});

describe('activeRoute (lit path honors the branch actually clicked)', () => {
  const graphOf = (nodeIds: string[], es: [string, string][]): VisibleGraph => ({
    nodeIds: new Set(nodeIds),
    edges: es.map(([source, target]) => ({ id: `${source}->${target}`, source, target })),
    defOf: new Map(),
  });
  // The repro topology: a target (`valid`) that CONVERGES from two branches —
  // the long web-app branch (root→cat→webapp→userctx→valid) and a direct legacy-
  // services edge (weak→valid).
  const g = graphOf(
    ['root', 'cat', 'webapp', 'userctx', 'weak', 'valid'],
    [
      ['root', 'cat'],
      ['cat', 'webapp'],
      ['cat', 'weak'],
      ['webapp', 'userctx'],
      ['userctx', 'valid'],
      ['weak', 'valid'], // the direct "looted creds" edge
    ],
  );

  it('a clean forward trail stitches through its waypoints', () => {
    // clicked userctx, then valid → lit path runs THROUGH userctx, not via weak
    expect(activeRoute(g, 'root', ['userctx', 'valid'])).toEqual(['root', 'cat', 'webapp', 'userctx', 'valid']);
  });

  it('re-anchors at the last good waypoint when the trail went stale (the bug)', () => {
    // The exact broken trail after: click userctx, click valid, click weak, click valid.
    // `valid→weak` runs backward and can't stitch; the route must NOT revert to the
    // web-app branch — it must light the direct weak→valid edge just clicked.
    expect(activeRoute(g, 'root', ['userctx', 'valid', 'weak', 'valid'])).toEqual(['root', 'cat', 'weak', 'valid']);
  });

  it('a plain single-node selection lights the longest root→target route', () => {
    expect(activeRoute(g, 'root', ['valid'])).toEqual(['root', 'cat', 'webapp', 'userctx', 'valid']);
  });

  it('falls back to root→target when even the final hop is undrawn', () => {
    expect(activeRoute(g, 'root', ['ghost'])).toEqual(['ghost']);
  });
});
