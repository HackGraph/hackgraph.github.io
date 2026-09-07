import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, tokenizeGlossary } from './glossary.js';
import { GLOSSARY_REVIEWS } from './glossary-reviews.js';
import { glossaryReview } from './glossary-review.js';
import { MAPS } from './index.js';
import { glossaryCoverage, contentCoverage } from '../../tools/audit-content.mjs';

test('changed definitions, aliases and citations cannot retain an old comparison', () => {
  const entry = GLOSSARY.find(e => e.term === 'LDAP');
  assert.equal(glossaryReview(entry).status, 'compared');
  for (const changed of [
    { ...entry, short: entry.short + ' An additional claim.' },
    { ...entry, aliases: ['LDAPS'] },
    { ...entry, sources: [] },
    { ...entry, sources: entry.sources.map(s => ({ ...s, url: 'https://example.org/different-source' })) },
    { ...entry, sources: entry.sources.map(s => ({ ...s, section: 'Another section' })) },
    { ...entry, sources: entry.sources.map(s => ({ ...s, kind: 'community' })) },
  ]) assert.equal(glossaryReview(changed).status, 'stale');
});

test('source links alone never create a comparison or imply human review', () => {
  const entry = GLOSSARY.find(e => e.term === 'LDAP');
  assert.equal(glossaryReview({ ...entry, term: 'New term' }).status, 'unreviewed');
  assert.equal(glossaryReview(entry).reviewerType, 'ai');
  assert.equal(glossaryReview(entry).label, 'AI source comparison');
});

test('malformed comparison records fail closed', () => {
  const entry = GLOSSARY.find(e => e.term === 'LDAP'), record = GLOSSARY_REVIEWS.LDAP;
  for (const patch of [{ comparedAt: '2026-02-30' }, { comparedAt: 'yesterday' }, { comparedAt: '2027-01-01' },
    { comparedBy: '' }, { reviewerType: 'automatically verified' }, { scope: '' },
    { sources: [] }, { sources: 'not a source array' }, { sources: [null] },
    { aliases: [null] }, { sources: [{ ...record.sources[0], url: 'javascript:alert(1)' }] }]) {
    assert.equal(glossaryReview(entry, { LDAP: { ...record, ...patch } }, '2026-09-06').status, 'invalid');
  }
});

test('related but different concepts are never folded into aliases', () => {
  const text = 'LDAP, LDAPS; AS-REP and AS-REP roasting; LOLBIN and LOLBAS.';
  assert.deepEqual(tokenizeGlossary(text).filter(s => s.type === 'term').map(s => s.term),
    ['LDAP', 'LDAPS', 'AS-REP', 'AS-REP roasting', 'LOLBIN', 'LOLBAS']);
  assert.equal(tokenizeGlossary(text).map(s => s.value).join(''), text);
});

test('the audit rejects stale content and ambiguous aliases without inflating graph review counts', () => {
  const coverage = glossaryCoverage();
  assert.deepEqual(coverage.errors, []);
  assert.equal(coverage.aiCompared, GLOSSARY.length);
  assert.equal(coverage.humanCompared, 0);
  assert.deepEqual(coverage.pending, []);
  const withoutGraphReviews = MAPS.map(map => ({ ...map,
    nodes: map.nodes.map(({ review, ...node }) => node),
    edges: map.edges.map(({ review, ...edge }) => edge),
  }));
  assert.equal(contentCoverage(withoutGraphReviews).reduce((n, m) => n + m.entriesWithReviewRecords, 0), 0);
  assert.ok(glossaryCoverage([{ ...GLOSSARY[0], short: 'An edited definition.' }]).errors.length);
  assert.ok(glossaryCoverage([{ term: 'A', short: 'First', aliases: ['B'] }, { term: 'B', short: 'Second' }]).errors.length);
});
