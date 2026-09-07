import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GraphEngine as E } from '../src/graph/engine/index.js';

function model(children) {
  return E.buildModel({ rootId: 'root', phases: [], nodes: ['root', 'other', ...children].map(id => ({ id })),
    edges: children.map(target => ({ source: 'root', target })) });
}

test('a newly shared topic stays between its established peers', () => {
  const map = model(['x', 'fresh', 'y', 'z']);
  const items = ['x', 'fresh', 'y', 'z'].map((key, i) => ({ key, rank: 1, previousRank: 1,
    pks: key === 'y' ? ['root', 'other'] : ['root'], cyDisp: i * 100,
    previousCy: key === 'fresh' ? undefined : i * 100 }));
  const cols = [[], items];
  E.orderColumns(cols, new Map(), new Map(), map, { incremental: true });
  const keys = cols[1].map(it => it.key);
  assert.ok(keys.indexOf('x') < keys.indexOf('y') && keys.indexOf('y') < keys.indexOf('z'));
  assert.ok(keys.indexOf('x') < keys.indexOf('fresh') && keys.indexOf('fresh') < keys.indexOf('z'));
});

test('conflicting history falls back to the authored sibling order without losing items', () => {
  const map = model(['a', 'b']);
  const items = [{ key: 'b', rank: 1, cyDisp: 0, previousCy: 0, pks: ['root'] },
    { key: 'a', rank: 1, cyDisp: 100, previousCy: 100, pks: ['root'] }];
  const cols = [[], items];
  E.orderColumns(cols, new Map(), new Map(), map, { incremental: true });
  assert.deepEqual(cols[1].map(it => it.key), ['a', 'b']);
});
