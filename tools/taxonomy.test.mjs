import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectTaxonomyUsage, inspectTaxonomy, taxonomyIdFromUrl, usage, usedIds } from './check-taxonomy.mjs';
import { TAXONOMY_STATUS } from '../src/data/taxonomy-status.js';

test('taxonomy audit distinguishes active, revoked, deprecated, and missing identifiers', () => {
  const pattern = (id, fields = {}) => ({ type: 'attack-pattern', external_references: [{ source_name: 'mitre-attack', external_id: id }], ...fields });
  const result = inspectTaxonomy({ objects: [pattern('T0001'), pattern('T0002', { revoked: true }), pattern('T0003', { x_mitre_deprecated: true })] },
    ['T0001', 'T0002', 'T0003', 'T0004']);
  assert.deepEqual(Object.values(result).map(r => r.status), ['active', 'revoked', 'deprecated', 'missing']);
  assert.throws(() => inspectTaxonomy({ objects: [] }, ['T0001']));
});
test('committed taxonomy snapshot covers mapped and cited identifiers', () => {
  assert.deepEqual(Object.keys(TAXONOMY_STATUS.entries).sort(), usedIds);
  assert.match(TAXONOMY_STATUS.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(TAXONOMY_STATUS.coverage, { mapped: usage.mappedIds.length, cited: usage.citedIds.length, citationOnly: usage.citationOnlyIds.length });
  assert.equal(Object.hasOwn(TAXONOMY_STATUS, 'usage'), false);
});

test('taxonomy citations require a canonical publisher technique or tactic URL', () => {
  for (const [url, id] of [
    ['https://attack.mitre.org/techniques/T0001', 'T0001'],
    ['https://attack.mitre.org/techniques/T0001/002/', 'T0001.002'],
    ['https://attack.mitre.org/tactics/TA0001/?ref=guide#definition', 'TA0001'],
  ]) assert.equal(taxonomyIdFromUrl(url), id, url);
  for (const url of [
    'https://example.org/techniques/T0001/', 'https://attack.mitre.org.example.org/techniques/T0001/',
    'https://attack.mitre.org@elsewhere.example/techniques/T0001/', 'https://user@attack.mitre.org/techniques/T0001/',
    'http://attack.mitre.org/techniques/T0001/', 'https://attack.mitre.org:8443/techniques/T0001/',
    'https://attack.mitre.org/techniques/T0001/02/', 'https://attack.mitre.org/techniques/T0001/002/extra',
    'https://attack.mitre.org/techniques/T0001%2F002/', 'https://attack.mitre.org/resources/T0001/',
    'MITRE T0001', '', undefined,
  ]) assert.equal(taxonomyIdFromUrl(url), null, String(url));
});

test('citation-only identifiers are retained with locations across every reference container', () => {
  const ref = id => ({ label: 'A reading source', url: `https://attack.mitre.org/techniques/${id}/` });
  const result = collectTaxonomyUsage({
    maps: [{ id: 'course', nodes: [{ id: 'lesson', mitre: { id: 'T0001' }, references: [ref('T0002/003'), ref('T0001')] }],
      edges: [{ source: 'lesson', target: 'next', references: [ref('T0003')] }] }],
    glossary: [{ term: 'Example', sources: [ref('T0004')] }],
    relationships: { connection: { references: [{ label: 'A tactic', url: 'https://attack.mitre.org/tactics/TA0001/' }] } },
  });
  assert.deepEqual(result.mappedIds, ['T0001']);
  assert.deepEqual(result.citedIds, ['T0001', 'T0002.003', 'T0003', 'T0004', 'TA0001']);
  assert.deepEqual(result.citationOnlyIds, ['T0002.003', 'T0003', 'T0004', 'TA0001']);
  assert.deepEqual(result.locations.T0001.map(row => row.field), ['mitre.id', 'references[1].url']);
  assert.equal(result.locations['T0002.003'][0].id, 'lesson');
  assert.equal(result.locations.T0003[0].kind, 'connection');
  assert.equal(result.locations.T0003[0].id, 'lesson → next');
  assert.equal(result.locations.T0004[0].term, 'Example');
  assert.equal(result.locations.TA0001[0].kind, 'definition');
  assert.deepEqual(collectTaxonomyUsage({ maps: [], glossary: [], relationships: {} }).locations, {});
});

test('techniques and tactics use their latest publisher records and report unavailable IDs', () => {
  const record = (id, type, fields = {}) => ({ id: `${type}--${id}`, type, modified: '2026-01-01',
    external_references: [{ source_name: 'mitre-attack', external_id: id }], ...fields });
  const old = record('TA0001', 'x-mitre-tactic');
  const current = { ...old, modified: '2026-02-01', x_mitre_deprecated: true };
  const objects = [current, record('T0001', 'attack-pattern'), old, record('TA0002', 'x-mitre-tactic', { revoked: true })];
  const result = inspectTaxonomy({ objects }, ['T0001', 'TA0001', 'TA0002', 'TA0003']);
  assert.equal(result.T0001.type, 'attack-pattern');
  assert.equal(result.TA0001.type, 'x-mitre-tactic');
  assert.deepEqual(Object.values(result).map(row => row.status), ['active', 'deprecated', 'revoked', 'missing']);
  assert.deepEqual(inspectTaxonomy({ objects: [...objects].reverse() }, Object.keys(result)), result);
  assert.equal(inspectTaxonomy({ objects: [old] }, ['TA0001']).TA0001.status, 'active');
});

test('replacement evidence comes only from current, explicit MITRE revoked-by relationships', () => {
  const pattern = (id, externalId, fields = {}) => ({ id, type: 'attack-pattern', name: externalId,
    modified: '2026-01-01', external_references: [{ source_name: 'mitre-attack', external_id: externalId,
      url: `https://attack.mitre.org/techniques/${externalId}/` }], ...fields });
  const link = { id: 'relationship--one', type: 'relationship', relationship_type: 'revoked-by',
    source_ref: 'pattern--old', target_ref: 'pattern--new', modified: '2026-01-01' };
  const objects = [pattern('pattern--old', 'T0001', { revoked: true }), pattern('pattern--new', 'T0002'), link];
  const old = inspectTaxonomy({ objects }, ['T0001']).T0001;
  assert.equal(old.status, 'revoked');
  assert.equal(old.revokedBy[0].id, 'T0002');
  assert.equal(old.revokedBy[0].relationshipId, link.id);
  for (const amended of [objects.slice(0, 2), [...objects, { ...link, revoked: true, modified: '2026-02-01' }],
    [...objects.slice(0, 2), { ...link, target_ref: 'missing' }]]) {
    assert.equal(inspectTaxonomy({ objects: amended }, ['T0001']).T0001.revokedBy, undefined);
  }
  // Input order cannot resurrect an older relationship version.
  assert.equal(inspectTaxonomy({ objects: [{ ...link, revoked: true, modified: '2026-02-01' }, ...objects] }, ['T0001']).T0001.revokedBy, undefined);
});
