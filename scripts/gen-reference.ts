/**
 * Static SEO reference generator.
 *
 * HackGraph is a client-rendered SPA: crawlers that render JS see only the
 * collapsed root node (~33 words), and non-JS crawlers see nothing. This emits a
 * plain-HTML, fully-crawlable text version of every technique in every map, so the
 * content is indexable by search engines and AI crawlers without changing the app.
 *
 * Runs AFTER `vite build` (see package.json) and writes into dist/ directly:
 *   dist/reference.html                          — index, links to each map
 *   dist/reference/<slug>.html                   — one page per map (all techniques)
 *   dist/sitemap.xml                             — homepage + every reference page
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAPS } from '../src/data/index.ts';
import type { MapDefinition, TechniqueNodeDef } from '../src/data/schema.ts';

const SITE = 'https://hackgraph.github.io';
const DIST = resolve(import.meta.dirname, '../dist');
const TODAY = '2026-07-22';

// Nice slug + title per map (better than the internal ids for URLs and headings).
const META: Record<string, { slug: string; title: string; blurb: string }> = {
  ad: {
    slug: 'active-directory',
    title: 'Active Directory Attack Paths',
    blurb:
      'Enumerate, capture credentials, escalate, move laterally, and reach Domain Admin: Kerberoasting, AS-REP roasting, NTLM relay, AD CS (ESC1-ESC16), DACL/ACL abuse, delegation, DCSync, and golden/silver tickets.',
  },
  'win-pe': {
    slug: 'windows-privilege-escalation',
    title: 'Windows Privilege Escalation',
    blurb:
      'From a foothold to NT AUTHORITY\\SYSTEM: token privileges (SeImpersonate, Potato), UAC bypass, service and DLL misconfigurations, unquoted paths, stored credentials, privileged groups, and defense evasion (AMSI, EDR, AppLocker).',
  },
  'linux-pe': {
    slug: 'linux-privilege-escalation',
    title: 'Linux Privilege Escalation',
    blurb:
      'From an unprivileged shell to root: sudo abuse and GTFOBins, SUID/SGID and capabilities, cron and systemd jobs, writable files, credential hunting, privileged groups and container escapes, and kernel exploits.',
  },
};

const esc = (s = ''): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Keyword-rich but genuine intro shared across pages — real description of the content. */
const INTRO =
  'HackGraph is an open-source cybersecurity reference and study notes for offensive security. ' +
  'It maps attack paths as interactive, ' +
  'click-to-expand graphs that run from a foothold to Domain Admin or root. Every ' +
  'technique lists the commands to run, the ' +
  'tools it uses, detection and OPSEC notes, and links to primary sources. It works as notes for penetration testing, ' +
  'red teaming, and CTFs, for OSCP, OSEP, CRTP, CRTE, and PNPT prep, and as a detection reference for blue teams.';

const KEYWORDS =
  'cybersecurity, offensive security, penetration testing, red team, OSCP notes, OSEP, CRTP, PNPT, CTF, ' +
  'privilege escalation, Active Directory, Windows privilege escalation, Linux privilege escalation, ' +
  'Kerberoasting, NTLM relay, AD CS ESC1, pass-the-hash, DCSync, ethical hacking, attack path, pentest cheat sheet';

const BRANCH_MARK =
  '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">' +
  '<path d="M9.5 12 H11.5 V5.5 H13.5 M11.5 12 V18.5 H13.5" stroke="#a59699" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<rect x="1" y="8.5" width="8.5" height="7" rx="2.2" fill="#f0eaec"/>' +
  '<rect x="13.5" y="2" width="8.5" height="7" rx="2.2" fill="#a59699"/>' +
  '<rect x="13.5" y="15" width="8.5" height="7" rx="2.2" fill="#f04450"/></svg>';

const CSS = `
:root{--bg:#0c0a0b;--panel:#160f11;--ink:#f0eaec;--dim:#a59699;--faint:#8a7d80;--accent:#f04450;--border:rgba(214,168,172,.13)}
@font-face{font-family:'Geist';font-weight:400;font-display:swap;src:url('/fonts/geist-sans-latin-400-normal.woff2') format('woff2')}
@font-face{font-family:'Geist';font-weight:600;font-display:swap;src:url('/fonts/geist-sans-latin-600-normal.woff2') format('woff2')}
@font-face{font-family:'Geist Mono';font-weight:400;font-display:swap;src:url('/fonts/geist-mono-latin-400-normal.woff2') format('woff2')}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:'Geist',system-ui,-apple-system,sans-serif;line-height:1.6;letter-spacing:-.01em;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
header.top{border-bottom:1px solid var(--border);padding:14px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;background:rgba(12,10,11,.85);backdrop-filter:blur(10px)}
header.top .name{font-weight:600;font-size:17px}
header.top .cta{margin-left:auto;font-size:14px;color:var(--dim)}
main{max-width:860px;margin:0 auto;padding:40px 24px 96px}
h1{font-size:30px;font-weight:600;line-height:1.2;margin:0 0 14px}
.lead{color:var(--dim);font-size:17px;margin:0 0 10px}
.toc{margin:20px 0 8px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:10px}
.toc a{border:1px solid var(--border);border-radius:999px;padding:5px 12px;font-size:13px;color:var(--ink)}
section.phase{margin-top:44px}
h2.phase-h{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;padding-bottom:6px;border-bottom:1px solid var(--border)}
article{padding:18px 0;border-bottom:1px solid var(--border)}
article h3{font-size:19px;font-weight:600;margin:0 0 4px;scroll-margin-top:70px}
.kind{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);font-weight:600}
.summary{color:var(--ink);margin:6px 0}
.desc{color:var(--dim);margin:8px 0}
.meta{color:var(--faint);font-size:13px}
h4{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);margin:16px 0 6px}
ul.req{margin:4px 0;padding-left:18px;color:var(--dim);font-size:14px}
pre{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px 14px;overflow:auto;margin:6px 0}
code{font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-size:13px;color:#e7dfe1}
pre .cmt{color:var(--faint)}
ul.links{margin:4px 0;padding-left:18px;font-size:14px}
.opsec{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin:12px 0;color:var(--dim);font-size:14px}
.opsec b{color:var(--ink)}
footer{max-width:860px;margin:0 auto;padding:32px 24px 64px;color:var(--faint);font-size:14px;border-top:1px solid var(--border)}
`;

function page(opts: { title: string; desc: string; url: string; jsonld: object; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.desc)}"/>
<meta name="keywords" content="${esc(KEYWORDS)}"/>
<link rel="canonical" href="${opts.url}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<meta name="theme-color" content="#0c0a0b"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="HackGraph"/>
<meta property="og:title" content="${esc(opts.title)}"/>
<meta property="og:description" content="${esc(opts.desc)}"/>
<meta property="og:url" content="${opts.url}"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${SITE}/og-image.png"/>
<script type="application/ld+json">${JSON.stringify(opts.jsonld)}</script>
<style>${CSS}</style>
</head>
<body>
<header class="top"><a href="/" style="display:flex;align-items:center;gap:10px;color:var(--ink)">${BRANCH_MARK}<span class="name">HackGraph</span></a><a class="cta" href="/">Open the interactive graph &rarr;</a></header>
${opts.body}
<footer>
<p>${esc(INTRO)}</p>
<p><a href="/">Interactive graph</a> &middot; <a href="/reference.html">All references</a> &middot; <a href="https://github.com/HackGraph/hackgraph.github.io">Source on GitHub</a></p>
<p>This is a text mirror of the interactive graph for search engines and offline reading. Techniques are documented for authorized penetration testing, CTFs, certification study, and blue-team detection.</p>
</footer>
</body>
</html>`;
}

function renderTech(n: TechniqueNodeDef): string {
  const parts: string[] = [];
  parts.push(`<article id="${esc(n.id)}">`);
  const kind = n.kind && n.kind !== 'technique' ? `<span class="kind">${esc(n.kind)}</span> ` : '';
  parts.push(`<h3>${kind}${esc(n.label)}</h3>`);
  if (n.summary) parts.push(`<p class="summary">${esc(n.summary)}</p>`);
  if (n.description) parts.push(`<p class="desc">${esc(n.description)}</p>`);
  if (n.affects) parts.push(`<p class="meta"><b>Affects:</b> ${esc(n.affects)}</p>`);
  if (n.requires?.length)
    parts.push(`<h4>Requires</h4><ul class="req">${n.requires.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`);
  if (n.commands?.length) {
    parts.push('<h4>Example commands</h4>');
    for (const c of n.commands) {
      const label = c.label ? `<span class="cmt"># ${esc(c.label)}</span>\n` : '';
      parts.push(`<pre><code>${label}${esc(c.code)}</code></pre>`);
    }
  }
  if (n.tools?.length)
    parts.push(
      `<h4>Tools</h4><ul class="links">${n.tools
        .map((t) => `<li>${t.url ? `<a href="${esc(t.url)}" rel="noopener nofollow">${esc(t.name)}</a>` : esc(t.name)}</li>`)
        .join('')}</ul>`,
    );
  if (n.mitre?.id)
    parts.push(
      `<p class="meta">MITRE ATT&amp;CK: <a href="${esc(n.mitre.url || `https://attack.mitre.org/techniques/${n.mitre.id.replace('.', '/')}/`)}" rel="noopener nofollow">${esc(n.mitre.id)}</a></p>`,
    );
  if (n.references?.length)
    parts.push(
      `<h4>References</h4><ul class="links">${n.references
        .map((rf) => `<li><a href="${esc(rf.url)}" rel="noopener nofollow">${esc(rf.label)}</a></li>`)
        .join('')}</ul>`,
    );
  if (n.opsec) parts.push(`<p class="opsec"><b>OPSEC / detection:</b> ${esc(n.opsec)}</p>`);
  parts.push('</article>');
  return parts.join('\n');
}

function renderMapPage(map: MapDefinition): string {
  const m = META[map.id];
  const url = `${SITE}/reference/${m.slug}.html`;
  const desc = `${m.title}: ${m.blurb}`.slice(0, 300);
  const byPhase = map.phases.map((ph) => ({
    ph,
    nodes: map.nodes.filter((n) => n.phase === ph.id),
  }));
  const orphans = map.nodes.filter((n) => !map.phases.some((p) => p.id === n.phase));
  const body = `<main>
<h1>${esc(m.title)}</h1>
<p class="lead">${esc(m.blurb)}</p>
<p class="meta">${map.nodes.length} techniques and steps. <a href="/">Explore this map interactively &rarr;</a></p>
<ul class="toc">${byPhase.filter((s) => s.nodes.length).map((s) => `<li><a href="#ph-${esc(s.ph.id)}">${esc(s.ph.label)}</a></li>`).join('')}</ul>
${byPhase
  .filter((s) => s.nodes.length)
  .map(
    (s) =>
      `<section class="phase" id="ph-${esc(s.ph.id)}"><h2 class="phase-h" style="color:${esc(s.ph.color)}">${esc(s.ph.label)}</h2>${s.nodes.map(renderTech).join('\n')}</section>`,
  )
  .join('\n')}
${orphans.length ? `<section class="phase"><h2 class="phase-h">Other</h2>${orphans.map(renderTech).join('\n')}</section>` : ''}
</main>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: m.title,
    name: `${m.title} | HackGraph Reference`,
    url,
    description: desc,
    inLanguage: 'en',
    author: { '@type': 'Organization', name: 'HackGraph' },
    publisher: { '@type': 'Organization', name: 'HackGraph' },
    isPartOf: { '@type': 'WebSite', name: 'HackGraph', url: `${SITE}/` },
  };
  return page({ title: `${m.title} | HackGraph Reference`, desc, url, jsonld, body });
}

function renderIndex(): string {
  const url = `${SITE}/reference.html`;
  const desc =
    'HackGraph reference: text version of the interactive Active Directory, Windows, and Linux privilege-escalation attack-path graphs. Offensive-security study notes for OSCP, OSEP, CRTP, PNPT, and CTFs.';
  const body = `<main>
<h1>HackGraph Reference</h1>
<p class="lead">${esc(INTRO)}</p>
<p class="meta">A plain-text mirror of the <a href="/">interactive graph</a>, for search and offline reading. ${MAPS.reduce((n, mp) => n + mp.nodes.length, 0)} techniques across ${MAPS.length} maps.</p>
${MAPS.map((mp) => {
  const m = META[mp.id];
  return `<article><h3><a href="/reference/${m.slug}.html">${esc(m.title)}</a></h3><p class="summary">${esc(m.blurb)}</p><p class="meta">${mp.nodes.length} techniques &middot; <a href="/reference/${m.slug}.html">Read the reference &rarr;</a></p></article>`;
}).join('\n')}
</main>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'HackGraph Reference',
    url,
    description: desc,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'HackGraph', url: `${SITE}/` },
    hasPart: MAPS.map((mp) => ({ '@type': 'TechArticle', name: META[mp.id].title, url: `${SITE}/reference/${META[mp.id].slug}.html` })),
  };
  return page({ title: 'HackGraph Reference | AD, Windows & Linux Privilege Escalation', desc, url, jsonld, body });
}

function sitemap(): string {
  const urls = [
    { loc: `${SITE}/`, pri: '1.0' },
    { loc: `${SITE}/reference.html`, pri: '0.9' },
    ...MAPS.map((mp) => ({ loc: `${SITE}/reference/${META[mp.id].slug}.html`, pri: '0.8' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`)
  .join('\n')}
</urlset>
`;
}

// ── write ──────────────────────────────────────────────────────────────────
mkdirSync(resolve(DIST, 'reference'), { recursive: true });
writeFileSync(resolve(DIST, 'reference.html'), renderIndex());
for (const map of MAPS) writeFileSync(resolve(DIST, 'reference', `${META[map.id].slug}.html`), renderMapPage(map));
writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap());

const total = MAPS.reduce((n, m) => n + m.nodes.length, 0);
console.log(`[reference] wrote reference.html + ${MAPS.length} map pages (${total} techniques) + sitemap.xml`);
