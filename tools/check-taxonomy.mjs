import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { MAPS } from '../src/data/index.js';
import { GLOSSARY } from '../src/data/glossary.js';
import { RELATIONSHIPS } from '../src/data/relationships.js';

export const SOURCE = 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json';
// Inspect canonical record URLs, never identifiers mentioned in labels or prose.
export function taxonomyIdFromUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'attack.mitre.org' || url.port || url.username || url.password) return null;
  const technique = /^\/techniques\/(T\d{4})(?:\/(\d{3}))?\/?$/.exec(url.pathname);
  if (technique) return technique[1] + (technique[2] ? '.' + technique[2] : '');
  return /^\/tactics\/(TA\d{4})\/?$/.exec(url.pathname)?.[1] || null;
}

export function collectTaxonomyUsage({ maps = MAPS, glossary = GLOSSARY, relationships = RELATIONSHIPS } = {}) {
  const locations = new Map(), mapped = new Set(), cited = new Set();
  const add = (id, location, kind) => {
    if (!id) return;
    if (!locations.has(id)) locations.set(id, []);
    locations.get(id).push(location);
    (kind === 'mapping' ? mapped : cited).add(id);
  };
  const references = (values, owner, field) => {
    for (const [index, ref] of (values || []).entries()) {
      const id = taxonomyIdFromUrl(ref.url);
      if (id) add(id, { ...owner, field: `${field}[${index}].url`, url: ref.url }, 'citation');
    }
  };
  for (const map of maps) for (const kind of ['nodes', 'edges']) for (const entry of map[kind]) {
    const owner = { kind: kind === 'nodes' ? 'node' : 'connection', map: map.id, id: entry.id || `${entry.source} → ${entry.target}` };
    add(entry.mitre?.id, { ...owner, field: 'mitre.id' }, 'mapping');
    references(entry.references, owner, 'references');
  }
  for (const entry of glossary) references(entry.sources, { kind: 'glossary', term: entry.term }, 'sources');
  for (const [id, entry] of Object.entries(relationships)) references(entry.references, { kind: 'definition', id }, 'references');
  return {
    mappedIds: [...mapped].sort(), citedIds: [...cited].sort(),
    citationOnlyIds: [...cited].filter(id => !mapped.has(id)).sort(),
    locations: Object.fromEntries([...locations].sort(([a], [b]) => a.localeCompare(b))),
  };
}

export const usage = collectTaxonomyUsage();
export const usedIds = Object.keys(usage.locations).sort();

const externalRef = o => o.external_references?.find(r => r.source_name === 'mitre-attack');
const objectStatus = o => !o ? 'missing' : o.revoked ? 'revoked' : o.x_mitre_deprecated ? 'deprecated' : 'active';

export function inspectTaxonomy(bundle, ids) {
  const recordTypes = new Set(['attack-pattern', 'x-mitre-tactic']);
  if (!Array.isArray(bundle.objects) || !bundle.objects.some(o => recordTypes.has(o.type))) throw new Error('No ATT&CK techniques or tactics in the supplied bundle');
  // Select the latest version of each STIX object before inspecting revocations.
  // An older relationship must not survive after that relationship is revoked.
  const latest = new Map();
  for (const [index, o] of bundle.objects.entries()) {
    const key = o.id || `anonymous:${index}`;
    if (!latest.has(key) || (o.modified || '') > (latest.get(key).modified || '')) latest.set(key, o);
  }
  const records = new Map();
  for (const o of latest.values()) if (recordTypes.has(o.type)) {
    const id = externalRef(o)?.external_id;
    if (id && (!records.has(id) || o.modified > records.get(id).modified)) records.set(id, o);
  }
  const replacements = new Map();
  for (const r of latest.values()) if (r.type === 'relationship' && r.relationship_type === 'revoked-by' && !r.revoked && !r.x_mitre_deprecated) {
    const from = latest.get(r.source_ref), to = latest.get(r.target_ref), ref = to && externalRef(to);
    if (!recordTypes.has(from?.type) || !from.revoked || to?.type !== from.type || !ref?.external_id) continue;
    const rows = replacements.get(from.id) || [];
    rows.push({ id: ref.external_id, name: to.name, url: ref.url, status: objectStatus(to),
      stixId: to.id, modified: to.modified, relationshipId: r.id, relationshipModified: r.modified });
    replacements.set(from.id, rows);
  }
  return Object.fromEntries(ids.map(id => {
    const o = records.get(id);
    return [id, { status: objectStatus(o),
      ...(o ? { name: o.name, type: o.type, url: externalRef(o)?.url, stixId: o.id, modified: o.modified,
        ...(replacements.has(o.id) ? { revokedBy: replacements.get(o.id).sort((a, b) => a.id.localeCompare(b.id)) } : {}) } : {}) }];
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), input = args[args.indexOf('--input') + 1];
  let raw;
  if (args.includes('--input')) raw = await readFile(input, 'utf8');
  else {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`ATT&CK fetch returned ${res.status}`);
    raw = await res.text();
  }
  const bundle = JSON.parse(raw);
  const collection = bundle.objects?.find(o => o.type === 'x-mitre-collection');
  const report = { checkedAt: new Date().toISOString().slice(0, 10), source: SOURCE,
    scope: 'Structured graph mapping IDs and canonical ATT&CK technique/tactic URLs in graph, glossary and shared-definition references. Identifier status only; excludes free-text mentions, other URL families, mapping suitability and claim accuracy.',
    inputMode: args.includes('--input') ? 'local-file' : 'publisher-download',
    ...(collection ? { collection: { name: collection.name, version: collection.x_mitre_version, modified: collection.modified } } : {}),
    sha256: createHash('sha256').update(raw).digest('hex'),
    coverage: { mapped: usage.mappedIds.length, cited: usage.citedIds.length, citationOnly: usage.citationOnlyIds.length },
    usage, entries: inspectTaxonomy(bundle, usedIds) };
  const issues = Object.entries(report.entries).filter(([, item]) => item.status !== 'active');
  const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : new URL('../reports/taxonomy-status.json', import.meta.url);
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checkedAt: report.checkedAt, identifiers: usedIds.length, issues }, null, 2));
  if (args.includes('--write')) {
    const { usage: reportLocations, ...snapshot } = report;
    await writeFile(new URL('../src/data/taxonomy-status.js', import.meta.url),
      '// Generated by tools/check-taxonomy.mjs. Identifier status only; no content validation.\nexport const TAXONOMY_STATUS = ' + JSON.stringify(snapshot, null, 2) + ';\n');
  }
  // A scheduled audit surfaces outstanding identifiers without silently remapping them.
  if (issues.length && !args.includes('--write')) process.exitCode = 1;
}
