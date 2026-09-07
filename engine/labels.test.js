import { test } from 'node:test';
import assert from 'node:assert/strict';
import './engine.js';

const { visibleLabels } = globalThis.GraphEngine;
test('caption placement prioritizes interaction and leaves clearance around cards', () => {
  const labels = [
    { id: 'quiet', x: 100, y: 80, w: 80, h: 30 },
    { id: 'selected', x: 105, y: 80, w: 80, h: 30, priority: 2 },
    { id: 'hovered', x: 110, y: 80, w: 80, h: 30, priority: 3 },
    { id: 'on-card', x: 250, y: 30, w: 80, h: 30, priority: 4 },
    { id: 'separate', x: 100, y: 120, w: 80, h: 30 },
  ];
  const before = structuredClone(labels);
  assert.deepEqual([...visibleLabels(labels, [{ x: 260, y: 0, w: 100, h: 100 }])], ['hovered', 'separate']);
  assert.deepEqual(labels, before);
});

test('caption collision detection works across grid boundaries and negative coordinates', () => {
  const labels = [
    { id: 'first', x: -50, y: -10, w: 40, h: 20 },
    { id: 'gap-too-small', x: -8, y: -10, w: 40, h: 20 },
    { id: 'boundary', x: 155, y: 0, w: 20, h: 20 },
    { id: 'next-cell', x: 174, y: 0, w: 20, h: 20 },
    { id: 'enough-gap', x: 180, y: 0, w: 20, h: 20 },
    { id: 'unmeasured', x: 0, y: 0, w: 0, h: 20 },
  ];
  assert.deepEqual([...visibleLabels(labels)], ['first', 'boundary', 'enough-gap']);
});
