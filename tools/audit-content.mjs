import { MAPS } from '../src/data/index.js';
import { editorialPresentation, validateEditorial, sourceKind } from '../src/data/editorial.js';
import { TAXONOMY_STATUS } from '../src/data/taxonomy-status.js';
import { GLOSSARY } from '../src/data/glossary.js';
import { glossaryReview, glossaryAnchor } from '../src/data/glossary-review.js';
import { RELATIONSHIPS } from '../src/data/relationships.js';
import { RELATIONSHIP_REVIEWS } from '../src/data/relationship-reviews.js';
import { relationshipReview } from '../src/data/relationship-review.js';
import { GraphEngine } from '../src/graph/engine/index.js';
import { toEngineMap } from '../src/graph/engineAdapter.js';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';

export function contentCoverage(maps = MAPS) {
  return maps.map(map => {
    GraphEngine.buildModel(toEngineMap(map));
    const entries = [...map.nodes, ...map.edges];
    const techniques = map.nodes.filter(n => !n.kind || n.kind === 'technique');
    return { map: map.id, nodes: map.nodes.length, techniques: techniques.length,
      categories: map.nodes.filter(n => n.kind === 'category').length, edges: map.edges.length,
      techniquesWithDedicatedReferences: techniques.filter(n => n.references?.length).length,
      edgesWithDedicatedReferences: map.edges.filter(n => n.references?.length).length,
      documentedApplicability: techniques.filter(n => n.affects).length,
      entriesWithReviewRecords: entries.filter(n => ['source-reviewed', 'historical'].includes(editorialPresentation(n).status)).length,
      claimsWithEvidence: entries.reduce((sum, n) => sum + editorialPresentation(n).claims.length, 0),
      referencesClassifiedByProvenance: entries.reduce((sum, n) => sum + (n.references || []).filter(r => !r.kind && sourceKind(r) !== 'unclassified').length, 0),
      unclassifiedReferences: entries.reduce((sum, n) => sum + (n.references || []).filter(r => sourceKind(r) === 'unclassified').length, 0),
      errors: entries.flatMap(n => validateEditorial(n).map(message => ({ entry: n.id || `${n.source} → ${n.target}`, message }))),
    };
  });
}

export function glossaryCoverage(entries = GLOSSARY) {
  const states = entries.map(entry => ({ term: entry.term, ...glossaryReview(entry) }));
  const errors = states.filter(s => ['invalid', 'stale'].includes(s.status))
    .map(s => ({ term: s.term, message: s.detail }));
  const terms = new Set(), matches = new Set(), anchors = new Set();
  for (const entry of entries) {
    if (!entry.term?.trim() || !entry.short?.trim()) errors.push({ term: entry.term, message: 'A term and definition are required.' });
    if (terms.has(entry.term) || anchors.has(glossaryAnchor(entry.term))) errors.push({ term: entry.term, message: 'Terms and page anchors must be unique.' });
    terms.add(entry.term); anchors.add(glossaryAnchor(entry.term));
    for (const name of [entry.term, ...(entry.aliases || [])]) {
      if (!name?.trim() || matches.has(name)) errors.push({ term: entry.term, message: 'Terms and aliases must be non-empty and globally unique.' });
      matches.add(name);
    }
  }
  return { scope: 'Glossary definitions only; counted separately from graph entries.', terms: entries.length,
    termsWithSources: entries.filter(e => e.sources?.length).length,
    aiCompared: states.filter(s => s.status === 'compared' && s.reviewerType === 'ai').length,
    humanCompared: states.filter(s => s.status === 'compared' && s.reviewerType === 'human').length,
    pending: states.filter(s => s.status !== 'compared').map(({ term, status }) => ({ term, status })), errors };
}

export function relationshipCoverage(definitions = RELATIONSHIPS, reviews = RELATIONSHIP_REVIEWS) {
  const states = Object.entries(definitions).map(([id, definition]) => ({ id, ...relationshipReview(id, definition, reviews) }));
  const errors = states.filter(s => ['invalid', 'stale'].includes(s.status)).map(s => ({ relationship: s.id, message: s.detail }));
  for (const id of Object.keys(reviews)) if (!Object.hasOwn(definitions, id)) errors.push({ relationship: id, message: 'Review has no matching definition.' });
  return { scope: 'Shared definitions only; these reviews never count toward connection claims.', definitions: states.length,
    aiCompared: states.filter(s => s.status === 'compared' && s.reviewerType === 'ai').length,
    humanCompared: states.filter(s => s.status === 'compared' && s.reviewerType === 'human').length,
    projectDefined: states.filter(s => s.status === 'project-defined').length,
    pending: states.filter(s => !['compared', 'project-defined'].includes(s.status)).map(({ id, status }) => ({ id, status })), errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = { scope: 'Content inventory and schema only. No operational procedure or route validation.',
    taxonomyCheckedAt: TAXONOMY_STATUS.checkedAt, maps: contentCoverage(), glossary: glossaryCoverage(), relationships: relationshipCoverage() };
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/content-coverage.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.maps.some(m => m.errors.length) || report.glossary.errors.length || report.relationships.errors.length) process.exitCode = 1;
}
