import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometryMetrics } from './layout-geometry.mjs';

test('geometry scoring distinguishes crossings from shared trunks and endpoints', () => {
  const route = points => ({ points });
  assert.equal(geometryMetrics(new Map(), [route([[0, 0], [20, 20]]), route([[0, 20], [20, 0]])]).crossings, 1);
  const incident = geometryMetrics(new Map(), [{ source: 'same', ...route([[0, 0], [20, 20]]) }, { source: 'same', ...route([[0, 20], [20, 0]]) }]);
  assert.equal(incident.incidentCrossings, 1); assert.equal(incident.nonIncidentCrossings, 0);
  assert.equal(geometryMetrics(new Map(), [route([[0, 0], [10, 0], [10, 10]]), route([[0, 0], [10, 0], [10, -10]])]).crossings, 0);
  assert.equal(geometryMetrics(new Map(), [route([[0, 0], [10, 0]]), route([[10, -10], [10, 10]])]).crossings, 0);
});

test('geometry scoring counts card interiors while excluding own endpoints and boundary contact', () => {
  const positions = new Map([['card', { x: 10, y: 10, w: 20, h: 20 }]]);
  const metrics = routes => geometryMetrics(positions, routes);
  assert.equal(metrics([{ points: [[0, 10], [40, 10]] }]).edgesThroughCards, 1);
  assert.equal(metrics([{ source: 'card', points: [[0, 10], [40, 10]] }]).edgesThroughCards, 0);
  assert.equal(metrics([{ points: [[0, 0], [40, 0]] }]).edgesThroughCards, 0);
});
