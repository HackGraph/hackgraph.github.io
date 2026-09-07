import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateProvenance, provenanceSnapshot, provenanceModule, verifyProvenance } from './source-provenance.mjs';
import { SOURCE_PROVENANCE } from '../src/data/source-provenance.js';
import { MAPS } from '../src/data/index.js';
import { editorialPresentation } from '../src/data/editorial.js';
import { glossaryReview, glossarySnapshot } from '../src/data/glossary-review.js';
import { relationshipReview, relationshipSnapshot } from '../src/data/relationship-review.js';

const fixture = () => ({ scope: 'Publication identity only', groups: [{ id: 'handbook', kind: 'primary',
  reviewedAt: '2026-09-06', reviewedBy: 'Example editor', reviewerType: 'human', scope: 'Publisher and format',
  basis: 'The publisher identifies this document as its own handbook.',
  evidence: [{ url: 'https://example.org/about', title: 'About the handbook', section: 'Publisher' }],
  urls: ['https://example.org/handbook', 'https://example.org/handbook#introduction'] }] });

test('database sources remain distinct across publication, graph and definition review contracts', () => {
  const report = fixture(); report.groups[0].kind = 'database';
  const provenance = provenanceSnapshot(report, '2026-09-07');
  const source = { label: 'Course catalogue', url: report.groups[0].urls[0], section: 'Catalogue entry', kind: 'database' };
  const node = { id: 'lesson', references: [{ label: source.label, url: source.url }] };
  const p = editorialPresentation(node, provenance);
  assert.equal(p.sources[0].kind, 'database');
  assert.equal(p.status, 'unreviewed');
  assert.deepEqual(p.claims, []);

  const term = { term: 'Module', short: 'A group of lessons.', sources: [source] };
  assert.equal(glossaryReview(term, {}).status, 'unreviewed');
  const termRecord = { ...glossarySnapshot(term), comparedAt: '2026-09-07', comparedBy: 'Example editor', reviewerType: 'ai', scope: 'Definition only' };
  assert.equal(glossaryReview(term, { Module: termRecord }, '2026-09-07').status, 'compared');
  assert.equal(glossaryReview({ ...term, sources: [{ ...source, kind: 'primary' }] }, { Module: termRecord }, '2026-09-07').status, 'stale');

  const definition = { label: 'Related reading', description: 'Lessons listed together.', origin: 'source-based', references: [source] };
  assert.equal(relationshipReview('reading', definition, {}).status, 'unreviewed');
  const record = { reviewedAt: '2026-09-07', reviewedBy: 'Example editor', reviewerType: 'ai', scope: 'Definition only', reviewedContent: relationshipSnapshot(definition) };
  assert.equal(relationshipReview('reading', definition, { reading: record }, '2026-09-07').status, 'compared');
  assert.equal(relationshipReview('reading', { ...definition, references: [{ ...source, kind: 'primary' }] }, { reading: record }, '2026-09-07').status, 'stale');
});

test('citation destination records require specific dated evidence and project only reading notices', () => {
  const report = fixture();
  const destination = { url: report.groups[0].urls[0], status: 'chapter-missing', checkedAt: '2026-09-07', reviewedBy: 'Example editor', reviewerType: 'ai',
    observedTitle: 'Catalogue home', finalUrl: 'https://example.org/', basis: 'The chapter URL opened the publication home page.', captureSha256: 'a'.repeat(64) };
  report.destinations = [destination];
  assert.deepEqual(validateProvenance(report, '2026-09-07'), []);
  const module = provenanceModule(report);
  assert.match(module, /export const SOURCE_DESTINATIONS/);
  assert.match(module, /chapter-missing/);
  assert.ok(!module.includes(destination.captureSha256));
  assert.deepEqual(provenanceSnapshot(report), provenanceSnapshot(fixture()));
  for (const patch of [{ url: 'http://example.org/' }, { status: 'verified-claim' }, { checkedAt: '2026-02-30' }, { checkedAt: '2026-09-08' },
    { reviewerType: 'automatic' }, { reviewedBy: '' }, { observedTitle: '' }, { finalUrl: 'https://user:password@example.org/' }, { basis: '' }, { captureSha256: '' }, { captureSha256: ['a'.repeat(64)] }]) {
    assert.ok(validateProvenance({ ...report, destinations: [{ ...destination, ...patch }] }, '2026-09-07').length);
  }
  assert.ok(validateProvenance({ ...report, destinations: [destination, destination] }, '2026-09-07').length);
  assert.ok(validateProvenance({ ...report, destinations: {} }, '2026-09-07').length);
  assert.ok(validateProvenance({ ...report, destinations: null }, '2026-09-07').length);
});

test('publication records reject absent evidence, invalid dates and duplicate or unsafe citation URLs', () => {
  const valid = fixture();
  assert.deepEqual(validateProvenance(valid, '2026-09-07'), []);
  for (const change of [null, { id: '' }, { kind: 'unclassified' }, { reviewedAt: '2026-02-30' }, { reviewedAt: '2026-09-08' },
    { reviewedAt: ['2026-09-06'] }, { reviewedBy: '' }, { reviewerType: 'automated' }, { scope: '' }, { basis: '' },
    { evidence: [] }, { evidence: [{ url: 'https://example.org/about', title: 'About' }] }, { urls: [] },
    { urls: ['https://user:password@example.org/handbook'] }, { urls: ['http://example.org/handbook'] },
    { urls: [' https://example.org/handbook'] }, { urls: [valid.groups[0].urls[0], valid.groups[0].urls[0]] }]) {
    const report = { ...valid, groups: [change === null ? null : { ...valid.groups[0], ...change }] };
    assert.ok(validateProvenance(report, '2026-09-07').length, JSON.stringify(change));
    assert.throws(() => provenanceSnapshot(report, '2026-09-07'));
  }
  assert.ok(validateProvenance(null).length);
  assert.ok(validateProvenance({ scope: 'Missing groups' }).length);
  assert.ok(validateProvenance({ ...valid, groups: [valid.groups[0], { ...valid.groups[0], id: 'other', kind: 'community' }] }).some(e => e.includes('Duplicate citation URL')));
  assert.ok(validateProvenance({ ...valid, groups: [valid.groups[0], { ...valid.groups[0], urls: ['https://example.org/other'] }] }).some(e => e.includes('Group ID')));
});

test('the public publication snapshot agrees with scoped records and contains only currently cited URLs', async () => {
  const report = JSON.parse(await readFile(new URL('../reports/source-provenance.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateProvenance(report), []);
  assert.deepEqual(SOURCE_PROVENANCE, provenanceSnapshot(report));
  assert.ok(Object.isFrozen(SOURCE_PROVENANCE));
  const references = new Set(MAPS.flatMap(map => [...map.nodes, ...map.edges].flatMap(entry => (entry.references || []).map(r => r.url))));
  for (const url of Object.keys(SOURCE_PROVENANCE)) assert.ok(references.has(url), url);
  const reversed = { ...report, groups: [...report.groups].reverse().map(g => ({ ...g, urls: [...g.urls].reverse() })) };
  assert.equal(provenanceModule(report), provenanceModule(reversed));
  await verifyProvenance();
});

test('publication verification rejects snapshot drift and malformed evidence without rewriting either file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hackgraph-provenance-'));
  try {
    await mkdir(join(dir, 'reports')); await mkdir(join(dir, 'src/data'), { recursive: true });
    const report = fixture(), reportFile = join(dir, 'reports/source-provenance.json'), moduleFile = join(dir, 'src/data/source-provenance.js');
    const original = JSON.stringify(report), module = provenanceModule(report), root = pathToFileURL(dir + '/');
    await writeFile(reportFile, original); await writeFile(moduleFile, module);
    assert.deepEqual(await verifyProvenance(root), { groups: 1, urls: 2 });
    await writeFile(moduleFile, module + '// changed\n');
    await assert.rejects(verifyProvenance(root), /snapshot differs/);
    assert.equal(await readFile(moduleFile, 'utf8'), module + '// changed\n');
    assert.equal(await readFile(reportFile, 'utf8'), original);
    await writeFile(moduleFile, module);
    const invalid = fixture(); invalid.groups[0].evidence = [];
    await writeFile(reportFile, JSON.stringify(invalid));
    await assert.rejects(verifyProvenance(root), /publisher evidence/);
    assert.equal(await readFile(moduleFile, 'utf8'), module);
    assert.equal(await readFile(reportFile, 'utf8'), JSON.stringify(invalid));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
