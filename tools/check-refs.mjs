// HTTP availability only. This does not verify page content or cited claims.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { MAPS } from '../src/data/index.js';
import { GLOSSARY } from '../src/data/glossary.js';
import { sourceRecords } from '../src/data/editorial.js';
import { RELATIONSHIPS } from '../src/data/relationships.js';

export function collectUrls(maps = MAPS) {
  const urls = new Set();
  for (const m of maps) for (const entry of [...m.nodes, ...m.edges]) {
    for (const r of [...sourceRecords(entry), ...(entry.tools || [])]) if (/^https?:/.test(r.url)) urls.add(r.url);
  }
  for (const term of GLOSSARY) for (const s of term.sources || []) urls.add(s.url);
  for (const definition of Object.values(RELATIONSHIPS)) for (const s of definition.references || []) urls.add(s.url);
  return [...urls].sort();
}

export function classify(code, finalUrl = '') {
  if (code === 0) return 'unreachable';
  if ([401, 403, 429, 999].includes(code)) return 'blocked';
  if ([404, 410].includes(code) || /\/(?:en\/)?404\.html(?:[?#]|$)/.test(finalUrl)) return 'not-found';
  if (code >= 200 && code < 400) return 'responded';
  return 'unavailable';
}

export async function checkUrl(url, { fetcher = fetch, timeout = 20000 } = {}) {
  const attempts = [];
  async function once(method) {
    try {
      const response = await fetcher(url, { method, redirect: 'follow', signal: AbortSignal.timeout(timeout), headers: { 'user-agent': 'HackGraph source availability check' } });
      const result = { code: response.status, finalUrl: response.url || url };
      await response.body?.cancel();
      attempts.push({ method, ...result });
      return result;
    } catch (error) {
      attempts.push({ method, code: 0, error: { name: error.name || 'Error',
        code: error.cause?.code || error.code || null, message: String(error.message || error).slice(0, 300) } });
      throw error;
    }
  }
  let result;
  try { result = await once('HEAD'); } catch { /* GET gets its own timeout */ }
  if (!result || result.code >= 400) {
    try { result = await once('GET'); } catch { result = { code: 0, finalUrl: null }; }
  }
  return { url, ...result, status: classify(result.code, result.finalUrl || ''), attempts, checkedAt: new Date().toISOString() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const urls = collectUrls();
  if (!urls.length) throw new Error('No source URLs found');
  console.log(`Checking ${urls.length} URLs (HTTP availability only)…`);
  let next = 0;
  const results = [];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < urls.length) results.push(await checkUrl(urls[next++]));
  }));
  results.sort((a, b) => a.url.localeCompare(b.url));
  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  const report = { checkedAt: new Date().toISOString(), scope: 'HTTP availability, not source accuracy or claim verification', counts, results };
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/reference-availability.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(counts));
  for (const r of results.filter(r => r.status !== 'responded')) console.log(`${r.status} (${r.code}) ${r.url}`);
  if (results.some(r => !['responded', 'blocked'].includes(r.status))) process.exitCode = 1;
}
