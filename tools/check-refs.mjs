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

// One fetch with its own timeout, so a HEAD stall does not eat the GET's budget.
async function fetchOnce(url, method) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA } });
  } finally {
    clearTimeout(to);
  }
}

async function status(url) {
  // HEAD is cheap, but plenty of CDNs and blogs stall it, reject it, or 404 it
  // while a real browser GET returns 200 (e.g. dirkjanm.io). So fall back to GET
  // on ANY error or non-2xx/3xx before calling a link dead, instead of trusting a
  // single HEAD. Failures are rare, so the extra request costs little.
  let res = null;
  try {
    res = await fetchOnce(url, 'HEAD');
  } catch {
    // HEAD timed out or the connection failed; the GET retry below decides.
  }
  if (!res || res.status >= 400 || [403, 405, 501, 999].includes(res.status)) {
    try {
      res = await fetchOnce(url, 'GET');
    } catch {
      return 0;
    }
  }
  // Soft-404: some GitBook sites (e.g. HackTricks) serve a 200 that redirects to /404.html.
  if (res.url && /\/(en\/)?404\.html$/.test(res.url)) return 404;
  return res.status;
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
