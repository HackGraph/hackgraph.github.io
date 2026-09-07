import { GLOSSARY_REVIEWS } from './glossary-reviews.js';

// This snapshot contains authored text and source locators, never a build date.
// A new definition, alias, or citation requires a new, explicit comparison.
export function glossarySnapshot(entry) {
  return {
    short: entry.short,
    aliases: [...(entry.aliases || [])].sort(),
    sources: (entry.sources || []).map(({ label, url, section, kind }) => ({ label, url, section, kind }))
      .sort((a, b) => String(a.url).localeCompare(String(b.url))),
  };
}

const realDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const hasText = value => typeof value === 'string' && !!value.trim();

export function glossaryReview(entry, reviews = GLOSSARY_REVIEWS, today = new Date().toISOString().slice(0, 10)) {
  const record = reviews[entry.term];
  if (!record) return { status: 'unreviewed', label: 'Source comparison not recorded',
    detail: 'This definition needs a documented comparison with a supporting source.' };
  const errors = [];
  if (!realDate(record.comparedAt) || record.comparedAt > today) errors.push('Comparison date must be a real YYYY-MM-DD date, not in the future.');
  if (!hasText(record.comparedBy) || !['ai', 'human'].includes(record.reviewerType)) errors.push('Identify the reviewer and reviewer type.');
  if (!hasText(record.scope)) errors.push('Describe the limited review scope.');
  if (!hasText(record.short) || !Array.isArray(record.aliases) || record.aliases.some(a => !hasText(a)) || !Array.isArray(record.sources) || !record.sources.length) errors.push('Record the exact definition, aliases and supporting sources.');
  for (const source of Array.isArray(record.sources) ? record.sources : []) {
    if (!hasText(source?.label) || !hasText(source?.section) || !['primary', 'taxonomy', 'research', 'community', 'database'].includes(source?.kind)) errors.push('Each source needs a label, section and explicit provenance.');
    try { if (new URL(source?.url).protocol !== 'https:') throw new Error(); }
    catch { errors.push('Source URLs must use HTTPS.'); }
  }
  if (errors.length) return { status: 'invalid', label: 'Source record needs correction', detail: errors.join(' '), errors };
  if (JSON.stringify(glossarySnapshot(entry)) !== JSON.stringify(glossarySnapshot(record))) {
    return { status: 'stale', label: 'Definition changed since comparison',
      detail: `The definition, aliases or citations have changed since ${record.comparedAt}; a new source comparison is needed.` };
  }
  const label = record.reviewerType === 'ai' ? 'AI source comparison' : 'Human source comparison';
  return { status: 'compared', label, date: record.comparedAt, reviewer: record.comparedBy, reviewerType: record.reviewerType,
    scope: record.scope, detail: `${record.comparedBy} · ${record.comparedAt} · Definition only.` };
}

export function glossaryAnchor(term) {
  return 'term-' + term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
