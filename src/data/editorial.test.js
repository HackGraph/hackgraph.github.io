import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from './index.js';
import { editorialPresentation, validateEditorial, editorialSnapshot, availabilityNotes, sourceKind, UNKNOWN_APPLICABILITY } from './editorial.js';
import { toEngineMap } from '../graph/engineAdapter.js';

test('citations alone never become an editorial review or applicability claim', () => {
  const p = editorialPresentation({ id: 'lesson', references: [{ label: 'Manual', url: 'https://example.org/manual' }] });
  assert.equal(p.status, 'unreviewed');
  assert.equal(p.applicability, UNKNOWN_APPLICABILITY);
  assert.equal(p.sources[0].kind, 'unclassified');
});

test('a declared taxonomy reference replaces an identical automatic mapping link without losing its label', () => {
  const url = 'https://attack.mitre.org/techniques/T1606/002/';
  const reference = { label: 'SAML Tokens — taxonomy overview', url, kind: 'taxonomy' };
  const entry = { id: 'lesson', mitre: { id: 'T1606.002', url }, references: [reference] };
  const before = structuredClone(entry);
  const presentation = editorialPresentation(entry);
  assert.deepEqual(presentation.sources, [reference]);
  assert.equal(presentation.status, 'unreviewed');
  assert.deepEqual(presentation.claims, []);
  assert.deepEqual(entry, before);
  assert.deepEqual(editorialPresentation({ ...entry, mitre: { id: 'T1606.002' } }).sources, [reference]);
  const section = { ...reference, url: url + '#mitigations', label: 'Mitigations section' };
  assert.deepEqual(editorialPresentation({ ...entry, references: [section] }).sources.map(source => source.url), [url, section.url]);
  assert.equal(editorialPresentation({ ...entry, references: [] }).sources[0].url, url);
});

test('publication provenance matches exact URLs without assigning review or applicability', () => {
  const url = 'https://example.org/handbook', provenance = { [url]: 'primary' };
  const entry = { id: 'lesson', references: [{ label: 'Handbook', url }] }, before = structuredClone(entry);
  const p = editorialPresentation(entry, provenance);
  assert.equal(p.sources[0].kind, 'primary');
  assert.equal(p.status, 'unreviewed');
  assert.deepEqual(p.claims, []);
  assert.equal(p.applicability, UNKNOWN_APPLICABILITY);
  assert.deepEqual(entry, before);
  for (const other of [url + '/new', url + '/', url + '?version=2', url + '#section', 'https://example.org.evil.test/handbook', 'toString']) {
    assert.equal(sourceKind({ url: other }, provenance), 'unclassified', other);
  }
  assert.equal(sourceKind({ url, kind: 'unclassified' }, provenance), 'unclassified');
  assert.deepEqual(validateEditorial(entry, undefined, provenance), []);
  for (const kind of ['community', 'unclassified']) assert.ok(validateEditorial({ ...entry, references: [{ label: 'Handbook', url, kind }] }, undefined, provenance).includes('Source kind disagrees with recorded publication provenance'));
});

test('publication metadata preserves exact claim snapshots and cannot override stale teaching content', () => {
  const url = 'https://example.org/handbook', provenance = { [url]: 'primary' };
  const entry = { id: 'lesson', summary: 'A module groups lessons.', references: [{ label: 'Handbook', url }] };
  entry.review = { status: 'source-reviewed', reviewedAt: '2026-09-06', reviewedBy: 'Example editor', reviewerType: 'human', scope: 'Summary definition',
    reviewedContent: editorialSnapshot(entry), claims: [{ text: entry.summary, section: 'Module', sources: [url] }] };
  const before = structuredClone(entry);
  assert.equal(editorialPresentation(entry, provenance).status, 'source-reviewed');
  assert.deepEqual(editorialPresentation(entry, provenance).claims, before.review.claims);
  assert.deepEqual(entry, before);
  const changed = editorialPresentation({ ...entry, summary: 'A different claim.' }, provenance);
  assert.equal(changed.status, 'stale');
  assert.deepEqual(changed.claims, []);
});

test('observed source-access failures stay distinct from accuracy and are not inferred for unknown URLs', () => {
  const source = { label: 'Manual', url: 'https://example.org/manual' };
  const snapshot = { exceptions: { [source.url]: { status: 'unreachable', checkedAt: '2026-09-06T00:00:00Z' } } };
  assert.equal(availabilityNotes([source, source], snapshot).length, 1);
  assert.match(availabilityNotes([source], snapshot)[0].text, /could not be reached/);
  assert.deepEqual(availabilityNotes([{ ...source, url: 'https://example.org/new' }], snapshot), []);
});

test('citation destination observations remain visible independently of HTTP availability and source type', () => {
  const source = { label: 'Catalogue chapter', url: 'https://example.org/chapter', kind: 'database' };
  for (const status of ['chapter-missing', 'relocation-notice', 'unrelated-destination']) {
    const destination = { status, checkedAt: '2026-09-07', reviewedBy: 'Example editor', reviewerType: 'ai', observedTitle: 'Catalogue home' };
    const notes = availabilityNotes([source, source, { label: 'Other', url: 'https://example.org/new' }, { url: 'toString' }], { exceptions: {} }, {}, { [source.url]: destination });
    assert.equal(notes.length, 1);
    assert.equal(notes[0].label, 'Citation destination needs checking');
    assert.match(notes[0].text, /Catalogue home/);
    assert.match(notes[0].text, /Example editor \(AI\)/);
    assert.match(notes[0].text, /does not resolve/);
  }
});

test('locating a publication explains an access exception without certifying its claims', () => {
  const url = 'https://example.org/manual', source = { label: 'Manual', url };
  const snapshot = { exceptions: { [url]: { status: 'unreachable', checkedAt: '2026-09-06T00:00:00Z',
    attempts: [{ error: { code: 'CERT_HAS_EXPIRED' } }] } } };
  const notes = availabilityNotes([source], snapshot, { [url]: { title: 'Manual', checkedAt: '2026-09-06', reviewedBy: 'Example', reviewerType: 'ai' } });
  assert.match(notes[0].label, /Source located/);
  assert.match(notes[0].text, /expired certificate/);
  assert.match(notes[0].text, /indexed content/);
  assert.equal(editorialPresentation({ references: [source] }).status, 'unreviewed');
});

test('review records require a named reviewer, real date, scoped claims and declared citations', () => {
  const entry = { references: [{ label: 'Manual', url: 'https://example.org/manual', kind: 'primary' }], review: {
    status: 'source-reviewed', reviewedAt: '2026-09-06', reviewedBy: 'Example reviewer', reviewerType: 'human', scope: 'Definition only',
    claims: [{ text: 'A sample definition.', section: 'Introduction', sources: ['https://example.org/manual'] }],
  } };
  entry.review.reviewedContent = editorialSnapshot(entry);
  assert.deepEqual(validateEditorial(entry, '2026-09-06'), []);
  for (const change of [{ reviewedAt: '2026-02-30' }, { reviewedAt: '2027-01-01' }, { reviewedBy: '' }, { reviewerType: '' }, { reviewedContent: null }, { scope: '' }, { claims: [] },
    { claims: [{ text: 'Sample', section: 'Intro', sources: ['https://example.org/other'] }] }]) {
    assert.ok(validateEditorial({ ...entry, review: { ...entry.review, ...change } }, '2026-09-06').length);
  }
});

test('changed teaching content cannot keep a completed review label', () => {
  const entry = { id: 'lesson', summary: 'A module groups lessons.', references: [{ label: 'Handbook', url: 'https://example.org/handbook', kind: 'primary' }] };
  entry.review = { status: 'source-reviewed', reviewedAt: '2026-09-06', reviewedBy: 'Example editor', reviewerType: 'human', scope: 'Summary definition',
    reviewedContent: editorialSnapshot(entry), claims: [{ text: entry.summary, section: 'Module', sources: ['https://example.org/handbook'] }] };
  assert.equal(editorialPresentation(entry).status, 'source-reviewed');
  for (const change of [{ summary: 'Changed claim.' }, { references: [] }, { aliases: ['Different meaning'] }]) {
    const presentation = editorialPresentation({ ...entry, ...change });
    assert.equal(presentation.status, 'stale');
    assert.deepEqual(presentation.claims, []);
  }
  const malformed = { ...entry, review: { ...entry.review, claims: 'not an array' } };
  assert.equal(editorialPresentation(malformed).status, 'invalid');
  assert.deepEqual(editorialPresentation(malformed).claims, []);
});

test('all entries validate and both presentations share editorial wording and sources', () => {
  for (const map of MAPS) {
    const adapted = toEngineMap(map);
    for (const [i, node] of map.nodes.entries()) {
      assert.deepEqual(validateEditorial(node), [], node.id);
      const p = editorialPresentation(node), d = adapted.nodes[i].details;
      assert.deepEqual(d.editorial, p.notes);
      assert.equal(d.applicability, p.applicability);
      assert.deepEqual(d.refs, p.sources.length ? p.sources.map(r => [r.label, r.url, r.kind]) : undefined);
    }
    for (const edge of map.edges) assert.deepEqual(validateEditorial(edge), [], `${edge.source} → ${edge.target}`);
  }
});
