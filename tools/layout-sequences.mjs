// Sequential generic teaching diagrams, including shared nodes and rank changes.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { GraphEngine as E } from '../src/graph/engine/index.js';
import { currentLayout, metrics } from './layout-lab.mjs';
import { geometryMetrics } from './layout-geometry.mjs';

export function sequenceFixtures() {
  return [3, 7, 11, 23, 47, 83, 149, 503, 997, 2029].map(initial => {
    let seed = initial;
    const rand = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    const layers = [['root'], ...Array.from({ length: 4 }, (_, rank) => Array.from({ length: 3 + rand(5) }, (_, i) => `r${rank + 1}n${i}`))];
    const ids = layers.flat(), pairs = new Set();
    const add = (a, b) => pairs.add(a + '|' + b);
    for (let rank = 1; rank < layers.length; rank++) {
      const prev = layers[rank - 1], next = layers[rank];
      next.forEach((id, i) => add(prev[i % prev.length], id));
      for (const a of prev) for (const b of next) if (rand(5) === 0) add(a, b);
      if (rank > 1) add(layers[rank - 2][rand(layers[rank - 2].length)], next[0]);
    }
    if (initial % 3 === 0) add(layers.at(-1)[0], layers[1][0]);
    const map = { id: 'sequence-' + initial, name: 'Course relationships', rootId: 'root',
      phases: [{ id: 'learn', label: 'Learn', color: '#608ac5' }],
      nodes: ids.map(id => ({ id, label: 'Topic ' + id, group: 'Learn', h: 80 + rand(80) })),
      edges: [...pairs].map(pair => { const [source, target] = pair.split('|'); return { source, target }; }) };
    const model = E.buildModel(map), open = new Set(), steps = [];
    for (let i = 0; i < 15; i++) {
      const res = E.resolveVisible(model, open);
      const available = res.vg.nodeKeys.filter(key => !open.has(key) && E.hasChildren(model, E.defOfKey(res.vg, key)));
      if (!available.length) break;
      const anchor = available[rand(available.length)]; open.add(anchor);
      steps.push({ operation: 'expand', anchor, open: [...open] });
    }
    for (const anchor of [...open].reverse().slice(0, 3)) {
      open.delete(anchor); steps.push({ operation: 'collapse', anchor, open: [...open] });
    }
    return { name: map.id, map, steps };
  });
}

export function runSequence(fixture, incremental = true) {
  let prior = currentLayout(fixture, [], new Map(), .75, incremental);
  return fixture.steps.map((step, index) => {
    const after = currentLayout(fixture, step.open, prior, .75, incremental);
    const anchor = prior.has(step.anchor) && after.has(step.anchor) ? step.anchor : 'root';
    const row = { fixture: fixture.name, step: index, operation: step.operation, anchor,
      ...metrics(prior, after, anchor), ...geometryMetrics(after, after.routes) };
    prior = after;
    return row;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cases = sequenceFixtures(), rows = [];
  for (const fixture of cases) for (const [solver, incremental] of [['previous', false], ['current', true]]) {
    rows.push(...runSequence(fixture, incremental).map(row => ({ solver, ...row })));
  }
  const summary = ['previous', 'current'].flatMap(solver => ['expand', 'collapse'].map(operation => {
    const selected = rows.filter(row => row.solver === solver && row.operation === operation);
    return { solver, operation, steps: selected.length,
      meanStepDisplacement: selected.reduce((sum, row) => sum + row.meanDisplacement, 0) / selected.length,
      maximumDisplacement: Math.max(...selected.map(row => row.maxDisplacement)),
      overlaps: selected.reduce((sum, row) => sum + row.overlaps, 0),
      orderInversions: selected.reduce((sum, row) => sum + row.orderInversions, 0),
      nonIncidentCrossings: selected.reduce((sum, row) => sum + row.nonIncidentCrossings, 0),
      edgesThroughCards: selected.reduce((sum, row) => sum + row.edgesThroughCards, 0),
    };
  }));
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/layout-sequences.json', import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(),
    method: 'Ten deterministic generic course graphs, variable heights, shared topics, skip-rank connections and selected loops. Up to fifteen sequential expansions and three collapses each. Both solvers receive the same disclosure sequence, with their own previous positions. Displacement is relative to the toggled card when it survives, otherwise the root. Geometry uses the sharp-centerline method of layout-geometry.mjs; summed crossings recur across states and are not unique graph defects.',
    fixtures: cases.map(({ name, map, steps }) => ({ name, nodes: map.nodes.length, edges: map.edges.length, steps })), summary, rows,
  }, null, 2) + '\n');
  console.table(summary);
  if (rows.some(row => row.overlaps || row.edgesThroughCards || !Number.isFinite(row.meanDisplacement))) process.exitCode = 1;
}
