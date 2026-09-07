import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GraphEngine as E } from '../src/graph/engine/index.js';
import { geometryMetrics } from '../tools/layout-geometry.mjs';

function score(fans) {
  const routes = fans.flatMap((f, i) => f.targets.map((y, j) => ({ source: f.id, target: `${f.id}-${j}`,
    points: [[0, f.y], [30 + i * 10, f.y], [30 + i * 10, y], [200, y]] })));
  return geometryMetrics(new Map(), routes).nonIncidentCrossings;
}

test('downward fans can keep cards still without crossing each other', () => {
  const fans = [{ id: 'a', y: 0, targets: [-100, 30, 90] }, { id: 'b', y: 50, targets: [200, 300, 400] }];
  const before = structuredClone(fans), ordered = E.orderTrunks(fans);
  assert.ok(score(fans) > 0); assert.equal(score(ordered), 0);
  assert.deepEqual(fans, before);
});

test('lane ordering preserves ties and never increases the measured first-hop crossing count', () => {
  const ties = [{ id: 'a', y: 0, targets: [0] }, { id: 'b', y: 100, targets: [100] }];
  assert.deepEqual(E.orderTrunks(ties), ties);
  let seed = 82931;
  const rand = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let repeat = 0; repeat < 50; repeat++) {
    const fans = Array.from({ length: 2 + rand(9) }, (_, i) => ({ id: String(i), y: rand(1000),
      targets: Array.from({ length: 1 + rand(8) }, () => rand(1000)) }));
    const ordered = E.orderTrunks(fans);
    assert.deepEqual(new Set(ordered), new Set(fans));
    assert.ok(score(ordered) <= score(fans), `Sample ${repeat}`);
  }
});
