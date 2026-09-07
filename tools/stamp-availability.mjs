// Copy observed access failures into the public source metadata. This never
// changes citations, review records, or claims about source accuracy.
import { readFile, writeFile } from 'node:fs/promises';
import { collectUrls, classify } from './check-refs.mjs';
const report = JSON.parse(await readFile(new URL('../reports/reference-availability.json', import.meta.url), 'utf8'));
if (!Array.isArray(report.results) || Number.isNaN(Date.parse(report.checkedAt))) throw new Error('Invalid availability report');
const observed = new Map(report.results.map(row => [row.url, row]));
if (observed.size !== report.results.length || collectUrls().some(url => !observed.has(url))) throw new Error('Availability report must cover the current references exactly once');
for (const row of report.results) {
  if (row.status !== classify(row.code, row.finalUrl || '') || Number.isNaN(Date.parse(row.checkedAt))) throw new Error('Invalid availability observation');
}
const snapshot = { scope: 'HTTP access observations only; no claim verification.', checkedAt: report.checkedAt,
  checkedUrls: observed.size, counts: report.counts,
  exceptions: Object.fromEntries(report.results.filter(row => row.status !== 'responded')
    .map(({ url, code, status, checkedAt, attempts }) => [url, { code, status, checkedAt, ...(attempts ? { attempts } : {}) }])) };
await writeFile(new URL('../src/data/source-availability.js', import.meta.url),
  '// Explicit snapshot from tools/stamp-availability.mjs; no content verification.\nexport const SOURCE_AVAILABILITY = ' + JSON.stringify(snapshot, null, 2) + ';\n');
console.log(`Recorded ${Object.keys(snapshot.exceptions).length} access exceptions from ${snapshot.checkedUrls} URLs.`);
