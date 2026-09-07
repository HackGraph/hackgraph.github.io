// Shared presentation and validation of editorial evidence. A linked source,
// taxonomy identifier, or HTTP response never implies a reviewed claim.
import { TAXONOMY_STATUS } from './taxonomy-status.js';
import { SOURCE_AVAILABILITY } from './source-availability.js';
import { SOURCE_LOCATIONS } from './source-locations.js';
import { SOURCE_PROVENANCE, SOURCE_DESTINATIONS } from './source-provenance.js';

export const SOURCE_KINDS = ['primary', 'research', 'community', 'taxonomy', 'database', 'unclassified'];
export const UNKNOWN_APPLICABILITY = 'Applicability has not been documented for this entry.';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort()
    .filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  return value;
}

/** Exact authored entry, excluding the review itself; no semantic validation. */
export function editorialSnapshot(entry) {
  const { review, ...content } = entry;
  return canonical(content);
}

const present = value => typeof value === 'string' && !!value.trim();
const STALE = 'Authored content changed since the recorded review';

export function availabilityNotes(sources, snapshot = SOURCE_AVAILABILITY, locations = SOURCE_LOCATIONS, destinations = SOURCE_DESTINATIONS) {
  const seen = new Set();
  const access = sources.flatMap(source => {
    const observation = Object.hasOwn(snapshot.exceptions, source.url) ? snapshot.exceptions[source.url] : null;
    if (!observation || seen.has(source.url)) return [];
    seen.add(source.url);
    const result = observation.status === 'blocked' ? 'blocked the automated request' : observation.status === 'unreachable' ? 'could not be reached by the automated checker'
      : observation.status === 'not-found' ? 'returned a not-found response to the automated checker' : 'returned an unavailable response to the automated checker';
    const error = observation.attempts?.at(-1)?.error;
    const detail = error?.code === 'CERT_HAS_EXPIRED' ? ' TLS validation reported an expired certificate.'
      : error?.name === 'TimeoutError' ? ' The request timed out.' : '';
    const located = Object.hasOwn(locations, source.url) ? locations[source.url] : null;
    const location = located ? ` ${located.reviewedBy} (${located.reviewerType === 'ai' ? 'AI' : 'human'}) located “${located.title}” through the web reader on ${located.checkedAt}. The reader may use indexed content; this does not establish live availability.` : '';
    return [{ label: located ? 'Source located; automated access limited' : 'Source access needs checking',
      text: `${source.label} ${result} on ${observation.checkedAt.slice(0, 10)}.${detail}${location} The citation is retained for inspection; these observations do not establish whether the source supports a claim.` }];
  });
  const destinationSeen = new Set();
  const destinationNotes = sources.flatMap(source => {
    const observation = Object.hasOwn(destinations, source.url) ? destinations[source.url] : null;
    if (!observation || destinationSeen.has(source.url)) return [];
    destinationSeen.add(source.url);
    const descriptions = {
      'chapter-missing': 'The chapter URL opened the publication home page.',
      'relocation-notice': 'The cited file now contains a relocation notice instead of the original chapter text.',
      'unrelated-destination': 'The citation opened a different page from the named publication.',
    };
    return [{ label: 'Citation destination needs checking', text: `${source.label}: ${descriptions[observation.status]} Observed by ${observation.reviewedBy} (${observation.reviewerType === 'ai' ? 'AI' : 'human'}) on ${observation.checkedAt}. Page title: “${observation.observedTitle}”. A source-type label does not resolve this citation problem.` }];
  });
  return [...access, ...destinationNotes];
}

export function sourceKind(reference, provenance = SOURCE_PROVENANCE) {
  return reference?.kind || (Object.hasOwn(provenance, reference?.url) ? provenance[reference.url] : 'unclassified');
}

export function sourceRecords(entry, provenance = SOURCE_PROVENANCE) {
  const refs = (Array.isArray(entry.references) ? entry.references : []).map(r => ({ ...r, kind: sourceKind(r, provenance) }));
  if (entry.mitre?.id) {
    const url = entry.mitre.url || `https://attack.mitre.org/techniques/${entry.mitre.id.replace('.', '/')}/`;
    if (!refs.some(reference => reference.url === url)) {
      refs.unshift({ label: `MITRE ATT&CK · ${entry.mitre.id}`, kind: 'taxonomy', url });
    }
  }
  return refs;
}

export function editorialPresentation(entry, provenance = SOURCE_PROVENANCE) {
  const review = entry.review;
  const errors = validateEditorial(entry, undefined, provenance);
  const status = errors.includes(STALE) ? 'stale' : errors.length ? 'invalid' : review?.status || 'unreviewed';
  const labels = { unreviewed: 'Review not recorded', 'source-reviewed': 'Selected claims source-reviewed', historical: 'Historical context',
    stale: 'Content changed since review', invalid: 'Evidence record needs correction' };
  const text = status === 'stale' ? 'The authored text or its references changed after review. A new comparison is needed.'
    : status === 'invalid' ? 'The evidence record is incomplete or invalid. Its claims are not presented as reviewed.'
    : status === 'unreviewed'
    ? 'References are reading sources. No claim-level editorial review has been recorded.'
    : `${review.reviewedAt} · ${review.reviewedBy} (${review.reviewerType === 'ai' ? 'AI' : 'human'}). Scope: ${review.scope}`;
  const taxonomy = TAXONOMY_STATUS.entries[entry.mitre?.id];
  const notes = [{ label: labels[status] || labels.unreviewed, text }];
  if (taxonomy && taxonomy.status !== 'active') notes.push({ label: 'Taxonomy needs review',
    text: `${entry.mitre.id} is ${taxonomy.status} in the ATT&CK snapshot checked ${TAXONOMY_STATUS.checkedAt}. This check concerns the identifier, not the accuracy of this entry.` });
  notes.push(...availabilityNotes(sourceRecords(entry, provenance)));
  return {
    status, notes, claims: ['source-reviewed', 'historical'].includes(status) ? review.claims : [], sources: sourceRecords(entry, provenance),
    applicability: entry.affects || ((!entry.kind || entry.kind === 'technique') && entry.id ? UNKNOWN_APPLICABILITY : undefined),
  };
}

export function validateEditorial(entry, today = new Date().toISOString().slice(0, 10), provenance = SOURCE_PROVENANCE) {
  const errors = [], refs = sourceRecords(entry, provenance), urls = new Set(refs.map(r => r.url));
  if (entry.references !== undefined && !Array.isArray(entry.references)) errors.push('References must be an array');
  for (const r of Array.isArray(entry.references) ? entry.references : []) {
    if (r?.kind && Object.hasOwn(provenance, r.url) && r.kind !== provenance[r.url]) errors.push('Source kind disagrees with recorded publication provenance');
  }
  for (const r of refs) {
    if (!present(r.label)) errors.push('Source label is required');
    if (!SOURCE_KINDS.includes(r.kind)) errors.push('Unknown source kind');
    try { if (new URL(r.url).protocol !== 'https:') errors.push('Source must use HTTPS'); }
    catch { errors.push('Invalid source URL'); }
  }
  const review = entry.review;
  if (!review) return errors;
  if (!['unreviewed', 'source-reviewed', 'historical'].includes(review.status)) errors.push('Unknown review status');
  if (review.status !== 'unreviewed') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt || '') ||
        Number.isNaN(Date.parse(review.reviewedAt)) || new Date(review.reviewedAt).toISOString().slice(0, 10) !== review.reviewedAt ||
        review.reviewedAt > today) errors.push('Review date must be a real date, not in the future');
    if (!present(review.reviewedBy) || !present(review.scope)) errors.push('Reviewer and review scope are required');
    if (!['ai', 'human'].includes(review.reviewerType)) errors.push('Reviewer type must identify AI or human review');
    if (!review.reviewedContent || typeof review.reviewedContent !== 'object' || Array.isArray(review.reviewedContent)) errors.push('Record an exact snapshot of the authored content');
    else if (JSON.stringify(canonical(review.reviewedContent)) !== JSON.stringify(editorialSnapshot(entry))) errors.push(STALE);
    if (!Array.isArray(review.claims) || !review.claims.length) errors.push('Reviewed status requires documented claims');
  } else if (review.reviewedAt || review.reviewedBy || review.reviewerType || review.reviewedContent || review.claims?.length) errors.push('Unreviewed status cannot claim a completed review');
  for (const claim of Array.isArray(review.claims) ? review.claims : []) {
    if (!present(claim?.text) || !present(claim?.section)) errors.push('Claim text and source section are required');
    if (!Array.isArray(claim?.sources) || !claim.sources.length || claim.sources.some(u => !urls.has(u))) errors.push('Every claim must cite declared sources');
  }
  return errors;
}
