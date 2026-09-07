import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtures, currentLayout, metrics } from '../tools/layout-lab.mjs';
import { sequenceFixtures, runSequence } from '../tools/layout-sequences.mjs';

test('prior-coordinate weighting reduces expansion displacement without overlaps or order inversions', () => {
  for (const fixture of fixtures()) {
    const before = currentLayout(fixture, fixture.before, new Map(), .75, false);
    const stable = metrics(before, currentLayout(fixture, fixture.after, before, .75, false), fixture.anchor);
    const free = metrics(before, currentLayout(fixture, fixture.after, before, 0, false), fixture.anchor);
    assert.equal(stable.overlaps, 0, fixture.name);
    assert.equal(stable.orderInversions, 0, fixture.name);
    assert.ok(stable.meanDisplacement < free.meanDisplacement * .9, fixture.name);
  }
});

test('new branches leave established positions unchanged when space can be allocated without moving them', () => {
  for (const fixture of fixtures()) {
    const before = currentLayout(fixture, fixture.before);
    const result = metrics(before, currentLayout(fixture, fixture.after, before), fixture.anchor);
    assert.ok(result.maxDisplacement < 1e-6, fixture.name);
    assert.equal(result.overlaps, 0, fixture.name);
    assert.equal(result.orderInversions, 0, fixture.name);
  }
});

test('collapsing a large branch releases its reserved space', () => {
  const fixture = fixtures().find(f => f.name === 'wide-100');
  let layout = currentLayout(fixture, ['root']);
  layout = currentLayout(fixture, ['root', 'b'], layout);
  layout = currentLayout(fixture, ['root', 'b', 'a'], layout);
  const collapsed = currentLayout(fixture, ['root', 'a'], layout);
  const result = metrics(layout, collapsed, 'b');
  assert.equal(collapsed.size, 8);
  assert.ok(result.height < 1200, `Collapsed height: ${result.height}`);
  assert.equal(result.overlaps, 0);
});

test('sequential shared-node disclosures preserve peer order and keep cards and connectors clear', () => {
  for (const fixture of sequenceFixtures()) for (const row of runSequence(fixture)) {
    const name = `${fixture.name}/${row.step}/${row.operation}`;
    assert.equal(row.overlaps, 0, name);
    assert.equal(row.edgesThroughCards, 0, name);
    assert.equal(row.orderInversions, 0, name);
    assert.ok(Number.isFinite(row.meanDisplacement), name);
  }
});

test('peer-order metrics do not treat nodes in different final columns as reordered peers', () => {
  const before = new Map([['a', { x: 0, y: 0, w: 100, h: 40 }], ['b', { x: 0, y: 100, w: 100, h: 40 }]]);
  const after = new Map([['a', { x: 0, y: 100, w: 100, h: 40 }], ['b', { x: 400, y: 0, w: 100, h: 40 }]]);
  assert.equal(metrics(before, after, 'a').orderInversions, 0);
});
