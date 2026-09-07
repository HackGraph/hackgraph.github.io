import { RELATIONSHIPS } from './relationships.js';
import { RELATIONSHIP_REVIEWS } from './relationship-reviews.js';
import { editorialSnapshot, availabilityNotes } from './editorial.js';

const text = value => typeof value === 'string' && !!value.trim();
const realDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** Snapshot the shared definition, never the connections that use its label. */
export const relationshipSnapshot = editorialSnapshot;

export function relationshipReview(id, definition = RELATIONSHIPS[id], reviews = RELATIONSHIP_REVIEWS, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  if (!definition || !text(definition.label) || !text(definition.description)) errors.push('A label and definition are required.');
  if (!['source-based', 'project-convention'].includes(definition?.origin)) errors.push('Declare a source-based definition or project convention.');
  if (!Array.isArray(definition?.references) || (definition.origin === 'source-based' && !definition.references.length)) errors.push('Source-based definitions need supporting references.');
  for (const source of Array.isArray(definition?.references) ? definition.references : []) {
    if (!text(source?.label) || !text(source?.section) || !['primary', 'taxonomy', 'research', 'community', 'database'].includes(source?.kind)) errors.push('Each source needs a label, section, and explicit provenance.');
    try { if (new URL(source?.url).protocol !== 'https:') throw new Error(); }
    catch { errors.push('Source URLs must use HTTPS.'); }
  }
  const record = reviews[id];
  if (record) {
    if (!realDate(record.reviewedAt) || record.reviewedAt > today) errors.push('The review date must be real and not in the future.');
    if (!text(record.reviewedBy) || !['ai', 'human'].includes(record.reviewerType) || !text(record.scope)) errors.push('Identify the reviewer, type, and limited scope.');
    if (!record.reviewedContent || typeof record.reviewedContent !== 'object' || Array.isArray(record.reviewedContent)) errors.push('Record the exact reviewed definition.');
  }
  if (errors.length) return { status: 'invalid', label: 'Definition record needs correction', detail: errors.join(' '), errors };
  if (!record) return { status: 'unreviewed', label: 'Definition review not recorded', detail: 'This shared definition needs an editorial comparison.' };
  if (JSON.stringify(relationshipSnapshot(definition)) !== JSON.stringify(relationshipSnapshot(record.reviewedContent))) {
    return { status: 'stale', label: 'Definition changed since review', detail: `The wording or sources changed after ${record.reviewedAt}. A new comparison is needed.` };
  }
  const convention = definition.origin === 'project-convention';
  return { status: convention ? 'project-defined' : 'compared',
    label: convention ? 'Project-defined meaning' : record.reviewerType === 'ai' ? 'AI source comparison' : 'Human source comparison',
    detail: `${record.reviewedBy} (${record.reviewerType === 'ai' ? 'AI' : 'human'}) · ${record.reviewedAt} · Shared definition only.`,
    scope: record.scope, reviewerType: record.reviewerType, date: record.reviewedAt };
}

export function relationshipDefinition(id) {
  const definition = RELATIONSHIPS[id];
  if (!definition) throw new Error(`Unknown relationship "${id}"`);
  const review = relationshipReview(id);
  return { id, label: definition.label, description: definition.description, review,
    refs: definition.references.map(r => [r.label, r.url, r.kind, r.section]),
    accessNotes: availabilityNotes(definition.references) };
}
