import { test } from 'node:test';
import assert from 'node:assert/strict';
import './engine.js';

const E = globalThis.GraphEngine;
const fixture = () => ({
  id: 'course', rootId: 'root', phases: [{ id: 'learn', label: 'Learn', color: '#688' }],
  nodes: [{ id: 'root', label: 'Course', group: 'Learn' }, { id: 'topic', label: 'A topic', group: 'Learn' }],
  edges: [{ source: 'root', target: 'topic' }],
});

test('model validation rejects broken identities and endpoints before rendering', () => {
  for (const [mutate, error] of [
    [m => m.nodes.push({ ...m.nodes[0] }), /duplicate node/],
    [m => { m.rootId = 'absent'; }, /root does not exist/],
    [m => { m.edges[0].target = 'absent'; }, /endpoint/],
    [m => { m.edges[0].source = 'absent'; }, /endpoint/],
    [m => m.edges.push({ ...m.edges[0] }), /duplicate edge/],
    [m => { m.nodes[1].id = ''; }, /node id/],
    [m => { m.nodes[1] = null; }, /node id/],
    [m => { m.edges[0].rel = 'absent'; }, /unknown relationship/],
  ]) {
    const map = fixture(); mutate(map);
    assert.throws(() => E.buildModel(map), error);
  }
  assert.doesNotThrow(() => E.buildModel(fixture()));
});

test('an exact authored alias is discoverable ahead of incidental prose matches', () => {
  const map = fixture();
  map.nodes[1].aliases = ['Personal study notes'];
  map.nodes.push({ id: 'other', label: 'Personal study notes archive', group: 'Learn' });
  const results = E.searchMap(E.buildSearchIndex(E.buildModel(map)), 'personal study notes');
  assert.equal(results[0].id, 'topic');
  assert.equal(results[0].via, 'alias');
});
