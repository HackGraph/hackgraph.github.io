// Reproducible generic layout experiment. No domain data or operational routes.
import ELK from 'elkjs/lib/elk.bundled.js';
import { GraphEngine as E } from '../src/graph/engine/index.js';
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function fixtures() {
  return ['tree', 'convergence', 'cycle', 'variable-height', 'wide-100'].map(name => {
    const ids = ['root', 'a', 'b', 'c', ...Array.from({ length: 4 }, (_, i) => `a${i}`),
      ...Array.from({ length: name === 'wide-100' ? 100 : 6 }, (_, i) => `b${i}`), 'join'];
    const edges = [['root', 'a'], ['root', 'b'], ['root', 'c'], ...ids.filter(id => /^a\d/.test(id)).map(id => ['a', id]),
      ...ids.filter(id => /^b\d/.test(id)).map(id => ['b', id])];
    if (name === 'convergence' || name === 'cycle') edges.push(['a0', 'join'], ['b0', 'join']);
    if (name === 'cycle') edges.push(['join', 'a']);
    return { name, anchor: 'b', before: ['root', 'a', 'a0'], after: ['root', 'a', 'a0', 'b', 'b0', ...(name === 'cycle' ? ['join'] : [])],
      map: { id: name, name, rootId: 'root', phases: [{ id: 'learn', label: 'Learn', color: '#aaa' }],
        nodes: ids.map((id, i) => ({ id, label: id, group: 'Learn', h: name === 'variable-height' ? 78 + (i % 5) * 35 : 112 })),
        edges: edges.map(([source, target]) => ({ source, target })) } };
  });
}

function inputs(fixture, open, prior = new Map()) {
  const model = E.buildModel(fixture.map), res = E.resolveVisible(model, new Set(open));
  const nodes = new Map(res.vg.nodeKeys.map(key => {
    const old = prior.get(key), parent = (res.parents.get(key) || []).map(k => prior.get(k)).find(Boolean);
    return [key, { key, h: model.defs.get(E.defOfKey(res.vg, key)).h, rank: res.rank.get(key),
      pks: res.parents.get(key) || [], previousCy: old?.y, previousRank: old ? old.x / E.COL_PITCH : undefined, cyDisp: old?.y ?? parent?.y ?? 0,
      targetX: res.rank.get(key) * E.COL_PITCH }];
  }));
  return { model, nodes, edges: res.vg.edges.filter(e => !res.backEdges.has(e.id)), rank: res.rank };
}

export function currentLayout(fixture, open, prior = new Map(), stability = 0.75, incremental = true) {
  const { model, nodes, edges, rank } = inputs(fixture, open, prior);
  const ways = new Map();
  const ws = E.syncWays(ways, edges, k => rank.get(k), new Set(), k => nodes.get(k).cyDisp);
  const cols = E.buildColumns([...nodes.values(), ...ways.values()]);
  const adj = E.buildAdj(edges.map(e => [nodes.get(e.source), ...(ws.get(e.id) || []), nodes.get(e.target)]));
  const priorEdges = new Set(prior.routes?.map(e => e.id) || []);
  const adding = [...nodes.keys()].some(k => !prior.has(k)) || edges.some(e => !priorEdges.has(e.id));
  E.orderColumns(cols, adj.inN, adj.outN, model, { incremental });
  const edgeIds = new Set(edges.map(e => e.id));
  const removing = [...prior.keys()].some(k => !nodes.has(k)) || [...priorEdges].some(id => !edgeIds.has(id));
  E.assignCoords(cols, adj.inN, adj.outN, { stability: incremental && removing && !adding ? 0 : stability, incremental: incremental && adding });
  const positions = new Map([...nodes].map(([key, v]) => [key, { x: v.targetX, y: v.targetCy, w: E.CARD_W, h: v.h }]));
  const trunks = new Map();
  const firstTargets = new Map();
  edges.forEach(e => {
    if (!firstTargets.has(e.source)) firstTargets.set(e.source, []);
    firstTargets.get(e.source).push((ws.get(e.id)?.[0] || nodes.get(e.target)).targetCy);
  });
  for (let rank = 0; rank < cols.length - 1; rank++) {
    const parents = (cols[rank] || []).filter(it => !it.isWay && open.includes(it.key));
    const spacing = parents.length > 1 ? Math.min(16, 90 / (parents.length - 1)) : 0;
    const ordered = incremental ? E.orderTrunks(parents.map(p => ({ item: p, y: p.targetCy, targets: firstTargets.get(p.key) || [] }))).map(f => f.item) : parents;
    ordered.forEach((p, i) => trunks.set(p.key, (rank + 1) * E.COL_PITCH - E.COL_GAP / 2 + (i - (parents.length - 1) / 2) * spacing));
  }
  const routes = edges.map(edge => {
    const p = nodes.get(edge.source), c = nodes.get(edge.target);
    const points = [[p.targetX + E.CARD_W + E.KNOB, p.targetCy]];
    const hop = (x, y, trunk) => {
      const previous = points.at(-1);
      if (Math.abs(y - previous[1]) >= 1) points.push([trunk, previous[1]], [trunk, y]);
      points.push([x, y]);
    };
    let first = true;
    for (const way of ws.get(edge.id) || []) {
      hop(way.targetX, way.targetCy, first ? trunks.get(p.key) : way.targetX - 28);
      points.push([way.targetX + E.CARD_W, way.targetCy]); first = false;
    }
    hop(c.targetX - 2, c.targetCy, first ? trunks.get(p.key) : c.targetX - 28);
    return { id: edge.id, source: edge.source, target: edge.target, points };
  });
  // Diagnostic metadata; callers that only need card positions retain the Map API.
  Object.defineProperty(positions, 'routes', { value: routes });
  return positions;
}

const elk = new ELK();
export async function elkLayout(fixture, open, prior = new Map(), options = {}) {
  const { nodes, edges } = inputs(fixture, open, prior);
  const out = await elk.layout({ id: 'course', layoutOptions: {
    'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.edgeRouting': 'ORTHOGONAL',
    'elk.spacing.nodeNode': '56', 'elk.layered.spacing.nodeNodeBetweenLayers': '150',
    'elk.partitioning.activate': 'true', 'elk.randomSeed': '1',
    'elk.layered.crossingMinimization.semiInteractive': 'true',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    ...options,
  }, children: [...nodes].map(([id, v]) => ({ id, width: E.CARD_W, height: v.h,
    x: v.targetX, y: v.cyDisp - v.h / 2, layoutOptions: {
      'elk.partitioning.partition': String(v.rank), 'elk.position': `(${v.targetX},${v.cyDisp - v.h / 2})`,
    } })), edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })) });
  const positions = new Map(out.children.map(n => [n.id, { x: n.x, y: n.y + n.height / 2, w: n.width, h: n.height }]));
  Object.defineProperty(positions, 'routes', { value: out.edges.flatMap(edge => (edge.sections || []).map((section, i) => ({
    id: edge.id + ':' + i, source: edge.sources[0], target: edge.targets[0],
    points: [section.startPoint, ...(section.bendPoints || []), section.endPoint].map(p => [p.x, p.y]),
  }))) });
  return positions;
}

export function metrics(before, after, anchor) {
  const start = before.get(anchor), end = after.get(anchor);
  const dx = end.x - start.x, dy = end.y - start.y;
  const displacements = [...before].filter(([key]) => after.has(key)).map(([key, v]) => {
    const n = after.get(key); return Math.hypot(n.x - v.x - dx, n.y - v.y - dy);
  }).sort((a, b) => a - b);
  const boxes = [...after.values()]; let overlaps = 0, orderInversions = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > .1 && Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2) > .1) overlaps++;
  }
  const common = [...before.keys()].filter(k => after.has(k));
  for (let i = 0; i < common.length; i++) for (let j = i + 1; j < common.length; j++) {
    const a = before.get(common[i]), b = before.get(common[j]), c = after.get(common[i]), d = after.get(common[j]);
    if (Math.abs(a.x - b.x) < 1 && Math.abs(c.x - d.x) < 1 && (a.y - b.y) * (c.y - d.y) < 0) orderInversions++;
  }
  return { nodes: after.size, overlaps, orderInversions,
    meanDisplacement: displacements.reduce((a, b) => a + b, 0) / displacements.length,
    maxDisplacement: displacements.at(-1),
    width: Math.max(...boxes.map(n => n.x + n.w)) - Math.min(...boxes.map(n => n.x)),
    height: Math.max(...boxes.map(n => n.y + n.h / 2)) - Math.min(...boxes.map(n => n.y - n.h / 2)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = [];
  for (const fixture of fixtures()) for (const solver of ['previous-0', 'previous-0.75', 'current', 'elk-0.12.0']) {
    const run = solver.startsWith('elk') ? elkLayout : (f, o, p) => currentLayout(f, o, p, solver === 'previous-0' ? 0 : .75, solver === 'current');
    let result; const times = [];
    for (let repeat = 0; repeat < 6; repeat++) {
      const before = await run(fixture, fixture.before);
      const t = performance.now(); const after = await run(fixture, fixture.after, before);
      if (repeat) times.push(performance.now() - t);
      result = metrics(before, after, fixture.anchor);
    }
    times.sort((a, b) => a - b);
    rows.push({ fixture: fixture.name, solver, ...result, medianSolveMs: times[2], maxSolveMs: times.at(-1) });
  }
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/layout-comparison.json', import.meta.url), JSON.stringify({
    node: process.version, measuredAt: new Date().toISOString(),
    method: 'Same generic visible graph and card dimensions; six runs per case, first discarded. Displacement normalized to expanded parent. ELK layered with prior positions, semi-interactive crossing reduction and rank partitions. Timing includes input/adapter work. Node overlap and order are measured; edge/label geometry is not scored.', rows,
  }, null, 2) + '\n');
  console.table(rows.map(r => ({ fixture: r.fixture, solver: r.solver, overlap: r.overlaps, inversions: r.orderInversions,
    meanMove: +r.meanDisplacement.toFixed(1), maxMove: +r.maxDisplacement.toFixed(1), ms: +r.medianSolveMs.toFixed(2) })));
}
