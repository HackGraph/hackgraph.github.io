#!/usr/bin/env node
// Liveness check for every reference/tool URL in the technique data.
// FAIL on dead links (404 / 5xx / unreachable); WARN on known bot-blocked
// hosts that 403 automated requests but are valid in a browser.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/data';
const URL_RE = /url:\s*'(https?:\/\/[^']+)'/g;
// Valid pages that reject automated requests (verified manually in-browser).
const BOT_BLOCKED = ['medium.com', 'nvd.nist.gov', 'rapid7.com', 'secureworks.com', 'research.ifcr.dk'];
const UA = 'Mozilla/5.0 (HackGraph link-check)';
const TIMEOUT = 20000;
const CONCURRENCY = 8;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const urls = new Set();
for (const f of walk(ROOT)) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(URL_RE)) urls.add(m[1]);
}
const list = [...urls].sort();
console.log(`Checking ${list.length} unique reference URLs…`);

async function status(url) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const opts = { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA } };
    let res = await fetch(url, { method: 'HEAD', ...opts });
    if ([403, 405, 501, 999].includes(res.status)) res = await fetch(url, { method: 'GET', ...opts });
    // Soft-404: some GitBook sites (e.g. HackTricks) serve a 200 that redirects to /404.html.
    if (res.url && /\/(en\/)?404\.html$/.test(res.url)) return 404;
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(to);
  }
}

const results = [];
let idx = 0;
async function worker() {
  while (idx < list.length) {
    const url = list[idx++];
    results.push({ url, code: await status(url) });
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const fails = [];
const warns = [];
for (const { url, code } of results) {
  if (code >= 200 && code < 400) continue;
  const blocked = BOT_BLOCKED.some((d) => url.includes(d));
  (blocked && (code === 403 || code === 429 || code === 0) ? warns : fails).push({ url, code });
}

if (warns.length) {
  console.log(`\n⚠  ${warns.length} bot-blocked (valid in browser):`);
  for (const w of warns.sort((a, b) => a.url.localeCompare(b.url))) console.log(`   ${w.code}  ${w.url}`);
}
if (fails.length) {
  console.log(`\n✖  ${fails.length} dead/unreachable:`);
  for (const f of fails.sort((a, b) => a.url.localeCompare(b.url))) console.log(`   ${f.code}  ${f.url}`);
  process.exit(1);
}
console.log(`\n✓  All ${list.length} URLs reachable (${warns.length} bot-blocked warnings).`);
