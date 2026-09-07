import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewInventory, inventoryCsv } from './review-inventory.mjs';
import { MAPS } from '../src/data/index.js';
import { GLOSSARY } from '../src/data/glossary.js';
import { RELATIONSHIPS } from '../src/data/relationships.js';
import { editorialSnapshot } from '../src/data/editorial.js';
import { SOURCE_PROVENANCE } from '../src/data/source-provenance.js';

test('the editorial inventory covers all entries once and never turns availability into review', () => {
  const inventory = reviewInventory(MAPS, GLOSSARY);
  assert.equal(inventory.items.length, MAPS.reduce((n, m) => n + m.nodes.length + m.edges.length, 0) + GLOSSARY.length + Object.keys(RELATIONSHIPS).length);
  assert.equal(new Set(inventory.items.map(i => i.key)).size, inventory.items.length);
  const map = { id: 'course', nodes: [{ id: 'intro', label: 'Introduction', references: [{ label: 'Manual', url: 'https://example.org/manual' }] }], edges: [] };
  const source = { url: 'https://example.org/manual', status: 'responded', checkedAt: '2026-09-06' };
  const [item] = reviewInventory([map], [], [source]).items;
  assert.equal(item.reviewStatus, 'unreviewed');
  assert.equal(item.humanReviewRecorded, false);
  assert.deepEqual(item.sourceAccessIssues, []);
  assert.equal(reviewInventory([map], [], [{ ...source, status: 'unreachable' }]).items[0].sourceAccessIssues[0].status, 'unreachable');
});

test('spreadsheet export preserves punctuation and neutralizes formula-like labels', () => {
  const csv = inventoryCsv({ items: [{ key: 'one', label: '=HYPERLINK("example")\nSecond line', sourceAccessIssues: [], taxonomy: null }] });
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")\nSecond line"'));
});

test('handoff includes publication classifications without manufacturing claim or access evidence', () => {
  const known = ['primary', 'community', 'taxonomy'].map(kind => Object.entries(SOURCE_PROVENANCE).find(([, value]) => value === kind));
  const map = { id: 'course', nodes: [{ id: 'reading', label: 'Reading', references: known.map(([url, kind]) => ({ label: `${kind} example`, url })) }], edges: [] };
  const [item] = reviewInventory([map], [], [], {}).items;
  assert.deepEqual(item.sources.map(s => s.kind), ['primary', 'community', 'taxonomy']);
  assert.ok(item.sources.every(s => s.availability === 'not-checked'));
  assert.equal(item.reviewStatus, 'unreviewed');
  assert.equal(item.review, null);
  assert.equal(item.humanReviewRecorded, false);
});

test('handoff preserves citation destination problems even when the HTTP request responded', () => {
  const url = 'https://example.org/publication';
  const observation = { status: 'unrelated-destination', checkedAt: '2026-09-07',
    reviewedBy: 'Example editor', reviewerType: 'ai', observedTitle: 'Unrelated catalogue page' };
  const map = { id: 'course', nodes: [{ id: 'reading', label: 'Reading', references: [{ label: 'Publication', url }] }], edges: [] };
  const availability = [{ url, status: 'responded', checkedAt: '2026-09-07' }];
  const report = reviewInventory([map], [], availability, {}, { [url]: observation });
  const [item] = report.items;
  assert.deepEqual(item.sourceAccessIssues, []);
  assert.equal(report.totals.withCitationDestinationIssues, 1);
  assert.equal(item.citationDestinationIssues[0].status, observation.status);
  assert.equal(item.sources[0].destinationObservation.observedTitle, observation.observedTitle);
  assert.equal(item.reviewStatus, 'unreviewed');
  assert.equal(item.review, null);
  assert.ok(inventoryCsv(report).includes('citation_destination_issues'));
  assert.ok(inventoryCsv(report).includes(`${observation.status}: ${url}`));
  assert.equal(reviewInventory([map], [], availability, {}, {}).totals.withCitationDestinationIssues, 0);
});

test('handoff preserves selected-claim scope and suppresses stale comparison evidence', () => {
  const node = { id: 'intro', label: 'Introduction', summary: 'Course introduction.',
    references: [{ label: 'Manual', url: 'https://example.org/manual', kind: 'primary' }] };
  node.review = { status: 'source-reviewed', reviewedAt: '2026-09-06', reviewedBy: 'Example reviewer', reviewerType: 'ai',
    scope: 'Introduction wording only.', reviewedContent: editorialSnapshot(node),
    claims: [{ text: 'The course has an introduction.', section: 'Overview', sources: ['https://example.org/manual'] }] };
  const map = { id: 'course', nodes: [node], edges: [] };
  const inventory = reviewInventory([map], [], [], {}), item = inventory.items[0];
  assert.equal(item.humanReviewRecorded, false);
  assert.deepEqual(item.review.claims, node.review.claims);
  assert.equal(item.review.scope, node.review.scope);
  assert.ok(inventoryCsv(inventory).includes('Introduction wording only.'));
  node.summary = 'A different explanation.';
  const stale = reviewInventory([map], [], [], {}).items[0];
  assert.equal(stale.reviewStatus, 'stale');
  assert.equal(stale.review, null);
});

test('connection inventory records endpoint kinds without inferring relationship meaning', () => {
  const map = { id: 'course', nodes: [{ id: 'group', kind: 'category' }, { id: 'lesson' }],
    edges: [{ source: 'group', target: 'lesson', description: 'Read this topic.' }] };
  const edge = reviewInventory([map], []).items.find(i => i.type === 'edge');
  assert.equal(edge.connection.sourceKind, 'category');
  assert.equal(edge.connection.targetKind, 'technique');
  assert.equal(edge.connection.declaredRelationship, null);
  assert.equal(edge.connection.hasAuthoredDescription, true);
  assert.equal(edge.reviewStatus, 'unreviewed');
});
