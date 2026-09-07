import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RELATIONSHIPS } from './relationships.js';
import { RELATIONSHIP_REVIEWS } from './relationship-reviews.js';
import { relationshipReview } from './relationship-review.js';
import { connectionPresentation } from './connections.js';
import { editorialPresentation, sourceRecords } from './editorial.js';
import { relationshipCoverage, contentCoverage } from '../../tools/audit-content.mjs';
import { toEngineMap } from '../graph/engineAdapter.js';

test('shared comparisons and project conventions are distinct from connection review', () => {
  const coverage = relationshipCoverage();
  assert.equal(coverage.aiCompared, 3);
  assert.equal(coverage.projectDefined, 1);
  assert.deepEqual(coverage.pending, []);
  assert.deepEqual(coverage.errors, []);
  const edge = { source: 'a', target: 'b', rel: 'host-exec', description: 'An authored association.' };
  assert.equal(relationshipReview(edge.rel).status, 'compared');
  assert.equal(editorialPresentation(edge).status, 'unreviewed');
  assert.deepEqual(sourceRecords(edge), []);
  assert.equal(connectionPresentation(edge).description, edge.description);
  assert.equal(connectionPresentation({ ...edge, description: undefined }).description, '');
  const map = { id: 'course', name: 'Course', rootId: 'a', phases: [{ id: 'p', label: 'P', color: '#608ac5' }],
    nodes: [{ id: 'a', label: 'Overview', phase: 'p', kind: 'start' }, { id: 'b', label: 'Lesson', phase: 'p' }], edges: [edge] };
  const adapted = toEngineMap(map), details = adapted.relationships[adapted.edges[0].rel].details;
  assert.equal(details.definitions[0].review.status, 'compared');
  assert.equal(details.refs, undefined);
  assert.deepEqual(details.claims, []);
  assert.equal(contentCoverage([map])[0].entriesWithReviewRecords, 0);
});

test('changed definition wording, sources, sections and origin cannot retain a completed comparison', () => {
  const original = RELATIONSHIPS['host-exec'];
  for (const change of [{ label: 'Another meaning' }, { description: 'Another claim.' }, { origin: 'project-convention' },
    { references: original.references.map((r, i) => i ? r : { ...r, section: 'Different section' }) }]) {
    const definition = { ...original, ...change };
    assert.equal(relationshipReview('host-exec', definition).status, 'stale');
    assert.ok(relationshipCoverage({ 'host-exec': definition }, { 'host-exec': RELATIONSHIP_REVIEWS['host-exec'] }).errors.length);
  }
  assert.equal(relationshipReview('host-exec', { ...original, references: [] }).status, 'invalid');
});

test('missing and malformed definition records cannot become reviews', () => {
  const definition = RELATIONSHIPS['host-exec'], record = RELATIONSHIP_REVIEWS['host-exec'];
  assert.equal(relationshipReview('host-exec', definition, {}).status, 'unreviewed');
  for (const change of [{ reviewedAt: '2026-02-30' }, { reviewedAt: '2099-01-01' }, { reviewedBy: '' },
    { reviewerType: 'unknown' }, { scope: '' }, { reviewedContent: null }]) {
    assert.equal(relationshipReview('host-exec', definition, { 'host-exec': { ...record, ...change } }).status, 'invalid');
  }
  assert.equal(relationshipReview('missing').status, 'invalid');
  assert.throws(() => connectionPresentation({ rel: 'missing' }), /Unknown relationship/);
});

test('untyped connections and explicit captions do not acquire inferred causal meaning', () => {
  assert.equal(connectionPresentation({ source: 'folder', target: 'topic' }).label, 'connection');
  assert.equal(connectionPresentation({ requires: ['A teaching context.'] }).label, 'connection');
  assert.equal(connectionPresentation({ rel: 'enables', label: 'Course reading', description: 'Read together.' }).label, 'Course reading');
  assert.equal(connectionPresentation({ rel: 'enables' }).definition.review.status, 'project-defined');
});
