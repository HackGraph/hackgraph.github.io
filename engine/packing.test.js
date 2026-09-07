import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GraphEngine as E } from '../src/graph/engine/index.js';

const item = h => ({ h, pks: ['root'] });
const assertClear = items => items.slice(1).forEach((it, i) => {
  assert.ok(it.targetCy - it.h / 2 >= items[i].targetCy + items[i].h / 2 + E.VGAP - 1e-6);
});

test('fresh items use available space before, between, and after established positions', () => {
  const items = [item(20), item(40), item(30), item(50), item(20)];
  E.blockResolve(items, [0, 0, 0, 300, 300], [0, 1, 0, 1, 0]);
  assert.equal(items[1].targetCy, 0);
  assert.equal(items[3].targetCy, 300);
  assertClear(items);
});

test('an insertion moves established positions only when their gap cannot contain it', () => {
  const items = [item(40), item(120), item(40)];
  E.blockResolve(items, [0, 50, 100], [1, 0, 1]);
  assertClear(items);
  assert.ok(items[0].targetCy < 0 && items[2].targetCy > 100);
  assert.equal((items[0].targetCy + items[2].targetCy) / 2, 50);
});

test('all-new columns preserve the ordinary balanced layout with finite coordinates', () => {
  const weighted = [item(35), item(80), item(20), item(95)], ordinary = structuredClone(weighted);
  E.blockResolve(weighted, [0, 0, 0, 0], [0, 0, 0, 0]); E.blockResolve(ordinary, [0, 0, 0, 0]);
  assert.deepEqual(weighted, ordinary); assertClear(weighted);
  assert.ok(weighted.every(it => Number.isFinite(it.targetCy)));
});
