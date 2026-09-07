// Explicit publication provenance. This neither visits URLs nor reviews graph claims.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const kinds = ['primary', 'research', 'community', 'taxonomy', 'database'];
const present = value => typeof value === 'string' && !!value.trim();
function validUrl(value) {
  if (!present(value) || value !== value.trim()) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
}
function validDate(value, today) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today;
}

export function validateProvenance(report, today = new Date().toISOString().slice(0, 10)) {
  const errors = [], ids = new Set(), urls = new Set();
  if (!present(report?.scope)) errors.push('State the provenance review scope');
  if (!Array.isArray(report?.groups)) return [...errors, 'Provenance groups must be an array'];
  for (const [index, group] of report.groups.entries()) {
    const label = group?.id || `group ${index}`;
    const error = message => errors.push(`${label}: ${message}`);
    if (!present(group?.id) || ids.has(group.id)) error('Group ID must be nonempty and unique');
    ids.add(group?.id);
    if (!kinds.includes(group?.kind)) error('Record a supported publication kind');
    if (!validDate(group?.reviewedAt, today)) error('Review date must be real and not in the future');
    if (!present(group?.reviewedBy) || !['ai', 'human'].includes(group?.reviewerType)) error('Identify the reviewer and reviewer type');
    if (!present(group?.scope) || !present(group?.basis)) error('State the classification scope and supporting observation');
    if (!Array.isArray(group?.evidence) || !group.evidence.length) error('Record publisher evidence');
    else for (const evidence of group.evidence) {
      if (!validUrl(evidence?.url) || !present(evidence?.title) || !present(evidence?.section)) error('Publisher evidence requires an HTTPS URL, title and section');
    }
    if (!Array.isArray(group?.urls) || !group.urls.length) error('List the exact classified citation URLs');
    else for (const url of group.urls) {
      if (!validUrl(url)) error('Citation URLs must use HTTPS without credentials or surrounding whitespace');
      if (urls.has(url)) error(`Duplicate citation URL: ${url}`);
      urls.add(url);
    }
  }
  const destinations = report.destinations === undefined ? [] : report.destinations;
  if (!Array.isArray(destinations)) errors.push('Citation destinations must be an array');
  else {
    const seen = new Set();
    for (const destination of destinations) {
      if (!validUrl(destination?.url) || seen.has(destination.url)) errors.push('Citation destination URLs must be safe and unique');
      seen.add(destination?.url);
      if (!['chapter-missing', 'relocation-notice', 'unrelated-destination'].includes(destination?.status)) errors.push('Record a supported citation destination status');
      if (!validDate(destination?.checkedAt, today) || !present(destination?.reviewedBy) || !['ai', 'human'].includes(destination?.reviewerType)) errors.push('Identify the citation destination reviewer and a real observation date');
      if (!present(destination?.observedTitle) || !validUrl(destination?.finalUrl) || !present(destination?.basis)) errors.push('Describe the observed citation destination');
      if (typeof destination?.captureSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(destination.captureSha256)) errors.push('Citation destination evidence requires a capture hash');
    }
  }
  return errors;
}

export function provenanceSnapshot(report, today) {
  const errors = validateProvenance(report, today);
  if (errors.length) throw new Error(errors.join('\n'));
  return Object.fromEntries(report.groups.flatMap(group => group.urls.map(url => [url, group.kind]))
    .sort(([a], [b]) => a.localeCompare(b)));
}

export function provenanceModule(report) {
  const snapshot = provenanceSnapshot(report);
  const destinations = Object.fromEntries((report.destinations || []).map(({ url, status, checkedAt, reviewedBy, reviewerType, observedTitle }) =>
    [url, { status, checkedAt, reviewedBy, reviewerType, observedTitle }]).sort(([a], [b]) => a.localeCompare(b)));
  return '// Generated from reports/source-provenance.json by tools/source-provenance.mjs --write.\n'
    + '// Exact citation URLs only; publication type does not establish claim accuracy or applicability.\n'
    + 'export const SOURCE_PROVENANCE = Object.freeze(' + JSON.stringify(snapshot, null, 2) + ');\n'
    + '// Observed citation destination problems; independent of HTTP availability and publication type.\n'
    + 'export const SOURCE_DESTINATIONS = Object.freeze(' + JSON.stringify(destinations, null, 2) + ');\n';
}

export async function verifyProvenance(root = new URL('../', import.meta.url)) {
  const report = JSON.parse(await readFile(new URL('reports/source-provenance.json', root), 'utf8'));
  const actual = await readFile(new URL('src/data/source-provenance.js', root), 'utf8');
  if (actual !== provenanceModule(report)) throw new Error('Source provenance snapshot differs from its records; inspect the records, then run node tools/source-provenance.mjs --write');
  return { groups: report.groups.length, urls: Object.keys(provenanceSnapshot(report)).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--write')) throw new Error('Usage: node tools/source-provenance.mjs [--write]');
  if (args.includes('--write')) {
    const report = JSON.parse(await readFile(new URL('../reports/source-provenance.json', import.meta.url), 'utf8'));
    await writeFile(new URL('../src/data/source-provenance.js', import.meta.url), provenanceModule(report));
  }
  console.log(JSON.stringify(await verifyProvenance(), null, 2));
}
