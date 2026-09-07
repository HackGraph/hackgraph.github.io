// A content inventory for editorial handoff. No semantic route assessment.
import { MAPS } from '../src/data/index.js';
import { GLOSSARY } from '../src/data/glossary.js';
import { editorialPresentation } from '../src/data/editorial.js';
import { glossaryReview } from '../src/data/glossary-review.js';
import { TAXONOMY_STATUS } from '../src/data/taxonomy-status.js';
import { SOURCE_LOCATIONS } from '../src/data/source-locations.js';
import { SOURCE_DESTINATIONS } from '../src/data/source-provenance.js';
import { RELATIONSHIPS } from '../src/data/relationships.js';
import { relationshipReview } from '../src/data/relationship-review.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function reviewInventory(maps, glossary, availability = [], definitions = RELATIONSHIPS, destinations = SOURCE_DESTINATIONS) {
  const links = new Map(availability.map(source => [source.url, source]));
  const items = [];
  function add(item, sources) {
    item.sources = sources.map(source => ({ label: source.label, url: source.url, kind: source.kind || 'unclassified',
      availability: links.get(source.url)?.status || 'not-checked', checkedAt: links.get(source.url)?.checkedAt || null,
      publicationLocation: SOURCE_LOCATIONS[source.url] || null,
      destinationObservation: Object.hasOwn(destinations, source.url) ? destinations[source.url] : null }));
    item.sourceAccessIssues = item.sources.filter(s => s.availability !== 'responded').map(s => ({ url: s.url, status: s.availability }));
    item.citationDestinationIssues = item.sources.filter(s => s.destinationObservation).map(s => ({ url: s.url, ...s.destinationObservation }));
    items.push(item);
  }
  for (const map of maps) {
    const nodes = new Map(map.nodes.map(n => [n.id, n]));
    for (const type of ['node', 'edge']) for (const [index, entry] of (type === 'node' ? map.nodes : map.edges).entries()) {
      const id = type === 'node' ? entry.id : `${entry.source} → ${entry.target}`;
      const p = editorialPresentation(entry);
      add({ key: JSON.stringify([map.id, type, id]), map: map.id, type, id,
        label: entry.label || id, pointer: `${map.id}/${type === 'node' ? 'nodes' : 'edges'}/${index}`,
        nodeKind: type === 'node' ? entry.kind || 'technique' : null,
        connection: type === 'edge' ? { sourceKind: nodes.has(entry.source) ? nodes.get(entry.source).kind || 'technique' : 'unknown',
          targetKind: nodes.has(entry.target) ? nodes.get(entry.target).kind || 'technique' : 'unknown', declaredRelationship: entry.rel || null,
          hasAuthoredLabel: !!entry.label?.trim(), hasAuthoredDescription: !!entry.description?.trim(),
          hasAuthoredConditions: !!entry.requires?.length,
          sharedDefinitionReview: entry.rel ? relationshipReview(entry.rel).status : null } : null,
        reviewStatus: p.status, humanReviewRecorded: ['source-reviewed', 'historical'].includes(p.status) && entry.review?.reviewerType === 'human',
        review: ['source-reviewed', 'historical'].includes(p.status) ? {
          reviewer: entry.review.reviewedBy, reviewerType: entry.review.reviewerType, date: entry.review.reviewedAt,
          scope: entry.review.scope, claims: p.claims,
        } : null,
        dedicatedReferences: entry.references?.length || 0,
        taxonomy: entry.mitre?.id ? { id: entry.mitre.id, status: TAXONOMY_STATUS.entries[entry.mitre.id]?.status || 'not-checked' } : null,
      }, p.sources);
    }
  }
  for (const [index, entry] of glossary.entries()) {
    const p = glossaryReview(entry);
    add({ key: JSON.stringify(['glossary', entry.term]), map: 'glossary', type: 'definition', id: entry.term, label: entry.term,
      pointer: `glossary/${index}`, reviewStatus: p.status, humanReviewRecorded: p.status === 'compared' && p.reviewerType === 'human',
      dedicatedReferences: entry.sources?.length || 0, taxonomy: null }, entry.sources || []);
  }
  for (const [id, entry] of Object.entries(definitions)) {
    const p = relationshipReview(id, entry);
    add({ key: JSON.stringify(['relationships', id]), map: 'relationships', type: 'relationship-definition', id, label: entry.label,
      pointer: `relationships/${id}`, reviewStatus: p.status, origin: entry.origin, scope: p.scope || null,
      humanReviewRecorded: ['compared', 'project-defined'].includes(p.status) && p.reviewerType === 'human',
      dedicatedReferences: entry.references.length, taxonomy: null }, entry.references);
  }
  return { scope: 'Editorial inventory and source-access status only. No assessment of procedures or graph feasibility.',
    totals: { items: items.length, humanReviewRecorded: items.filter(i => i.humanReviewRecorded).length,
      withoutDedicatedReferences: items.filter(i => !i.dedicatedReferences).length,
      withSourceAccessIssues: items.filter(i => i.sourceAccessIssues.length).length,
      withCitationDestinationIssues: items.filter(i => i.citationDestinationIssues.length).length,
      withUnlocatedSourceAccessIssues: items.filter(i => i.sources.some(s => s.availability !== 'responded' && !s.publicationLocation)).length }, items };
}

// Quote all cells and neutralize spreadsheet formulas in authored labels.
export function inventoryCsv(report) {
  const cell = value => '"' + String(value ?? '').replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""') + '"';
  const rows = [['key', 'map', 'type', 'id', 'label', 'review_status', 'human_review_recorded', 'dedicated_references', 'source_access_issues', 'taxonomy_status',
    'node_kind', 'source_kind', 'target_kind', 'relationship_id', 'has_authored_description', 'review_scope', 'compared_claims_count', 'citation_destination_issues']];
  for (const i of report.items) rows.push([i.key, i.map, i.type, i.id, i.label, i.reviewStatus, i.humanReviewRecorded, i.dedicatedReferences,
    i.sourceAccessIssues.map(s => `${s.status}: ${s.url}`).join('\n'), i.taxonomy ? `${i.taxonomy.id}: ${i.taxonomy.status}` : '',
    i.nodeKind, i.connection?.sourceKind, i.connection?.targetKind, i.connection?.declaredRelationship, i.connection?.hasAuthoredDescription,
    i.review?.scope || i.scope, i.review?.claims.length,
    (i.citationDestinationIssues || []).map(s => `${s.status}: ${s.url}`).join('\n')]);
  return rows.map(row => row.map(cell).join(',')).join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = JSON.parse(await readFile(new URL('../reports/reference-availability.json', import.meta.url), 'utf8'));
  const report = reviewInventory(MAPS, GLOSSARY, audit.results);
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/review-inventory.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  await writeFile(new URL('../reports/review-inventory.csv', import.meta.url), inventoryCsv(report));
  console.log(JSON.stringify(report.totals, null, 2));
}
