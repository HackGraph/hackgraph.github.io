/**
 * Static SEO reference generator.
 *
 * HackGraph is a client-rendered SPA: crawlers that render JS see only the
 * collapsed root node (~33 words), and non-JS crawlers see nothing. This emits a
 * plain-HTML, fully-crawlable text version of every technique in every map, so the
 * content is indexable by search engines and AI crawlers without changing the app.
 *
 * The static site is staged from explicit public assets. This generator writes into
 * the repo and its output is committed and checked for parity. Re-run it whenever the content changes:
 *   reference.html                               — index, links to each map
 *   reference/<slug>.html                        — one page per map (all techniques)
 *   sitemap.xml                                  — homepage + every reference page
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAPS } from '../src/data/index.js';
import { BUILD_DATE } from '../src/buildInfo.js';
import { editorialPresentation, availabilityNotes } from '../src/data/editorial.js';
import { contentCoverage, glossaryCoverage, relationshipCoverage } from './audit-content.mjs';
import { TAXONOMY_STATUS } from '../src/data/taxonomy-status.js';
import { GLOSSARY } from '../src/data/glossary.js';
import { glossaryReview, glossaryAnchor } from '../src/data/glossary-review.js';
import { SOURCE_AVAILABILITY } from '../src/data/source-availability.js';
import { SOURCE_LOCATIONS } from '../src/data/source-locations.js';

const SITE = 'https://hackgraph.github.io';
const OUT = resolve(import.meta.dirname, '..');
// The committed build stamp, NOT today's date. These pages are generated and committed,
// and CI regenerates them to prove they match the content — so anything that changes on
// every run makes that check fail on the first day nobody touched the repo.
const TODAY = BUILD_DATE;

// Nice slug + title per map (better than the internal ids for URLs and headings).
const META = {
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

const esc = (s ='' ) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Keyword-rich but genuine intro shared across pages — real description of the content. */
const INTRO = 'HackGraph is an open-source collection of security study notes, organized as expandable graphs. Use the graph to explore connections, or read the reference pages at your own pace. Source coverage and editorial review status are shown separately.';

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
@font-face{font-family:'Geist';font-weight:400;font-display:swap;src:url('/engine/fonts/geist-sans-latin-400-normal.woff2') format('woff2')}
@font-face{font-family:'Geist';font-weight:600;font-display:swap;src:url('/engine/fonts/geist-sans-latin-600-normal.woff2') format('woff2')}
@font-face{font-family:'Geist Mono';font-weight:400;font-display:swap;src:url('/engine/fonts/geist-mono-latin-400-normal.woff2') format('woff2')}
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
article{padding:18px 0;border-bottom:1px solid var(--border);scroll-margin-top:78px;overflow-wrap:anywhere}
section.phase>h2{scroll-margin-top:78px}
article h3{font-size:19px;font-weight:600;margin:0 0 4px;scroll-margin-top:70px}
.kind{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);font-weight:600}
.summary{color:var(--ink);margin:6px 0}
.desc{color:var(--dim);margin:8px 0}
.meta{color:var(--faint);font-size:13px}
h4{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);margin:16px 0 6px}
ul.req{margin:4px 0;padding-left:18px;color:var(--dim);font-size:14px}
pre{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px 14px;overflow:auto;overflow-wrap:normal;margin:6px 0}
code{font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-size:13px;color:#e7dfe1}
pre .cmt{color:var(--faint)}
ul.links{margin:4px 0;padding-left:18px;font-size:14px}
.claim-list{padding-left:18px;font-size:14px;line-height:1.6}
.claim-list>li+li{margin-top:18px}.claim-list p{margin:0;overflow-wrap:anywhere}
.claim-list .claim-section{margin-top:6px;font-size:13px;color:var(--dim)}
.claim-sources{display:grid;gap:4px;margin-top:6px}
.claim-sources a{display:block;width:fit-content;max-width:100%;padding:2px 0;color:var(--ink);overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:.18em;border-radius:2px}
.claim-sources a:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.opsec{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin:12px 0;color:var(--dim);font-size:14px}
.opsec b{color:var(--ink)}
.editorial{border-left:2px solid var(--dim);padding:6px 12px;margin:12px 0;color:var(--dim);font-size:13px}.editorial p{margin:4px 0}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;padding:8px;border-bottom:1px solid var(--border)}.table-wrap{overflow:auto}.table-wrap:focus-visible{outline:2px solid var(--ink);outline-offset:4px}
footer{max-width:860px;margin:0 auto;padding:32px 24px 64px;color:var(--faint);font-size:14px;border-top:1px solid var(--border)}
`;

function page(opts) {
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
<p><a href="/">Interactive graph</a> &middot; <a href="/reference.html">All references</a> &middot; <a href="/glossary.html">Glossary</a> &middot; <a href="/about.html">About the sources</a> &middot; <a href="https://github.com/HackGraph/hackgraph.github.io">Source on GitHub</a></p>
<p>Reading pages accompany the interactive graph. Material is intended for authorized security study and blue-team detection.</p>
</footer>
</body>
</html>`;
}

function renderTech(n) {
  const parts = [];
  parts.push(`<article id="${esc(n.id)}">`);
  const kind = n.kind && n.kind !== 'technique' ? `<span class="kind">${esc(n.kind)}</span> ` : '';
  parts.push(`<h3>${kind}${esc(n.label)}</h3>`);
  if (n.summary) parts.push(`<p class="summary">${esc(n.summary)}</p>`);
  if (n.aliases?.length) parts.push(`<p class="meta"><b>Also known as:</b> ${n.aliases.map(esc).join(', ')}</p>`);
  if (n.description) parts.push(`<p class="desc">${esc(n.description)}</p>`);
  const evidence = editorialPresentation(n);
  for (const note of evidence.notes) parts.push(`<div class="editorial"><b>${esc(note.label)}</b><p>${esc(note.text)}</p></div>`);
  if (evidence.applicability) parts.push(`<p class="meta applicability"><b>Applicability:</b> ${esc(evidence.applicability)}</p>`);
  if (evidence.claims.length) {
    const sourceLabels = new Map(evidence.sources.map(source => [source.url, source.label]));
    parts.push(`<h4>Reviewed claims</h4><ul class="claim-list">${evidence.claims.map(claim => `<li><p class="claim-text">${esc(claim.text)}</p><p class="claim-section">${esc(claim.section)}</p><div class="claim-sources">${claim.sources.map(url => `<a href="${esc(url)}">${esc(sourceLabels.get(url) || url)}</a>`).join('')}</div></li>`).join('')}</ul>`);
  }
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
  if (evidence.sources.length) parts.push(`<h4>References</h4><ul class="links">${evidence.sources.map(r => `<li><a href="${esc(r.url)}" rel="noopener nofollow">${esc(r.label)}</a> <span class="meta">· ${esc(r.kind === 'unclassified' ? 'Source type not classified' : r.kind + ' source')}</span></li>`).join('')}</ul>`);
  if (n.opsec) parts.push(`<p class="opsec"><b>OPSEC / detection:</b> ${esc(n.opsec)}</p>`);
  parts.push('</article>');
  return parts.join('\n');
}

function renderMapPage(map) {
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
<p class="meta">${map.nodes.length} topics, including techniques, categories, and endpoints. <a href="/">Explore this map interactively &rarr;</a></p>
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

function renderIndex() {
  const url = `${SITE}/reference.html`;
  const desc =
    'HackGraph reference: text version of the interactive Active Directory, Windows, and Linux privilege-escalation attack-path graphs. Offensive-security study notes for OSCP, OSEP, CRTP, PNPT, and CTFs.';
  const body = `<main>
<h1>HackGraph Reference</h1>
<p class="lead">${esc(INTRO)}</p>
<p><a href="/about.html">How to read the graph and assess its sources</a></p>
<p><a href="/glossary.html">Security glossary with definition sources</a></p>
<p class="meta">A plain-text mirror of the <a href="/">interactive graph</a>, for search and offline reading. ${MAPS.reduce((n, mp) => n + mp.nodes.length, 0)} topics across ${MAPS.length} maps.</p>
${MAPS.map((mp) => {
  const m = META[mp.id];
  return `<article><h3><a href="/reference/${m.slug}.html">${esc(m.title)}</a></h3><p class="summary">${esc(m.blurb)}</p><p class="meta">${mp.nodes.length} topics &middot; <a href="/reference/${m.slug}.html">Read the reference &rarr;</a></p></article>`;
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

function renderAbout() {
  const coverage = contentCoverage();
  const glossary = glossaryCoverage();
  const relationships = relationshipCoverage();
  const body = `<main>
<h1>Reading HackGraph</h1>
<p class="lead">A visual notebook for learning how security concepts connect.</p>
<h2>Explore at reading scale</h2>
<p>Open a card to read its notes. Use the plus button to reveal connected topics. Large branches offer a list so you can choose the next topic without shrinking the text. Overview shows the arrangement; Return to reading restores readable detail.</p>
<p>Tab to the graph, use Right to expand and visit a child, Left for a parent, and Up or Down for nearby topics in the same column. Space expands or collapses a branch; Enter opens its notes. Escape closes details. Search also matches alternate names and your locally saved notes.</p>
<h2>Connections and browsing history</h2>
<p>The trail records the topics you visited. It is navigation history, not evidence that those topics form a feasible sequence. Categories organize subjects; start and goal cards provide context. A repeated card is another visual instance of the same underlying topic, used to keep loops readable. Open “About this connection” in a topic's connected-topics list to read the authored relationship.</p>
<p>HackGraph's connections are authored study relationships. They are not imported ATT&amp;CK relationships. MITRE distinguishes associations such as technique hierarchy, observed use, mitigation, and detection in its <a href="https://mitre-attack.github.io/attack-data-model/schemas/relationship-types/">relationship model</a>. A classification link on a card does not establish the meaning of an arrow connected to it.</p>
<p>The shared relationship definitions in the graph panels explain recurring labels. They appear separately from each connection's explanation and evidence. ${relationships.aiCompared} definitions have AI source comparisons; ${relationships.projectDefined} is a project-defined convention. These records cover the vocabulary, and do not count as reviews of the connections using it.</p>
<h2>What the source labels mean</h2>
<p>Primary sources are original specifications, vendor documentation, or original project documentation. Research and community sources provide their own analysis. Taxonomy references identify a classification. Database references are curated records that may combine information from several contributors. Unclassified sources have not yet been assigned a source type. These labels describe source provenance, not a guarantee of correctness.</p>
<p>Source types come from an explicit citation label or a recorded classification for that exact publication URL. New URLs remain unclassified until a classification is recorded. Classifying a publication does not review the claims that cite it.</p>
<p>A citation-destination notice means the inspected URL opened a different page or a relocation notice. It can appear alongside a known source type and a successful HTTP response. Check the named publication before relying on that citation.</p>
<p>“Review not recorded” means there is no documented claim-level editorial review. “Selected claims source-reviewed” records who compared particular claims with named source sections, and when. “Historical context” identifies explicitly scoped historical material. A build date describes the site artifact, not when its knowledge was verified.</p>
<p>Authored applicability notes are preserved. Missing applicability is unknown. Version filters reflect existing tags; an undimmed topic does not confirm compatibility. Windows 11 25H2 and 26H1 appear in the catalog with coverage unknown.</p>
<h2>Current coverage</h2>
${SOURCE_AVAILABILITY.checkedAt ? `<p>The latest recorded HTTP audit checked ${SOURCE_AVAILABILITY.checkedUrls} URLs on ${esc(SOURCE_AVAILABILITY.checkedAt.slice(0, 10))}. ${SOURCE_AVAILABILITY.counts.responded || 0} responded; ${Object.keys(SOURCE_AVAILABILITY.exceptions).length} have automated access exceptions. Of those, ${Object.keys(SOURCE_AVAILABILITY.exceptions).filter(url => SOURCE_LOCATIONS[url]).length} publications were located separately through the web reader. The reader may use indexed content. A response or a located publication does not verify a claim. Affected entries explain the recorded observations.</p>` : ''}
<p>This inventory is generated from the same data as the graph. It counts each entry's explicitly listed reading sources, including taxonomy citations in that list. Automatically displayed mapping links and tool homepages are excluded. Counts describe coverage, not accuracy.</p>
<div class="table-wrap" role="region" aria-label="Editorial evidence coverage" tabindex="0"><table><caption>Editorial evidence coverage</caption><thead><tr><th scope="col">Map</th><th scope="col">Topics</th><th scope="col">Techniques with references</th><th scope="col">Connections with references</th><th scope="col">Review records</th></tr></thead><tbody>${coverage.map(c => `<tr><th scope="row">${esc(c.map)}</th><td>${c.nodes}</td><td>${c.techniquesWithDedicatedReferences} / ${c.techniques}</td><td>${c.edgesWithDedicatedReferences} / ${c.edges}</td><td>${c.entriesWithReviewRecords}</td></tr>`).join('')}</tbody></table></div>
<p><a href="/glossary.html">The glossary</a> has ${glossary.terms} definitions: ${glossary.aiCompared} have a recorded AI source comparison, ${glossary.humanCompared} have a recorded human comparison, and ${glossary.pending.length} need comparison. These counts are separate from the graph entries above. Each comparison covers the displayed definition and its aliases; it does not establish the accuracy of surrounding notes or connections. Editing a definition, alias or source makes its old comparison stale.</p>
<p>ATT&amp;CK identifier status was checked on ${esc(TAXONOMY_STATUS.checkedAt)} against <a href="https://attack.mitre.org/resources/working-with-attack/">MITRE's published data</a>${TAXONOMY_STATUS.collection?.version ? ` (Enterprise ATT&amp;CK ${esc(TAXONOMY_STATUS.collection.version)})` : ''}. ${Object.keys(TAXONOMY_STATUS.entries).length} identifiers were checked; ${Object.values(TAXONOMY_STATUS.entries).filter(e => e.status !== 'active').length} are missing, deprecated, or revoked. This includes mapped IDs and technique/tactic citations in topics, connections, glossary entries, and shared definitions. Identifier checks and HTTP link checks do not verify the associated content.</p>
<p><a href="https://github.com/HackGraph/hackgraph.github.io/issues">Report a correction</a> with the topic, a precise claim, a supporting source section, and the context in which it applies.</p>
</main>`;
  return page({ title: 'Reading HackGraph and its sources', desc: 'How to navigate HackGraph and interpret its sources, applicability, and editorial review coverage.', url: `${SITE}/about.html`, body,
    jsonld: { '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Reading HackGraph', url: `${SITE}/about.html` } });
}

function renderGlossary() {
  const coverage = glossaryCoverage();
  const groups = new Map();
  for (const entry of [...GLOSSARY].sort((a, b) => a.term.toLowerCase().localeCompare(b.term.toLowerCase()))) {
    const letter = entry.term[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(entry);
  }
  const body = `<main>
<h1>Security glossary</h1>
<p class="lead">Plain-language definitions, with the sources behind them.</p>
<p>${coverage.terms} terms · ${coverage.aiCompared} AI source comparisons · ${coverage.humanCompared} human source comparisons · ${coverage.pending.length} awaiting comparison.</p>
<p>A comparison records who checked the definition against the listed source sections, and when. It covers the definition and its aliases only. AI comparisons can contain mistakes; they are a starting point for human editorial review. These records do not assess procedures, version compatibility or graph connections. <a href="/about.html">Read about the evidence labels</a>.</p>
<nav aria-label="Glossary letters"><ul class="toc">${[...groups.keys()].map(letter => `<li><a href="#letter-${letter}">${letter}</a></li>`).join('')}</ul></nav>
${[...groups].map(([letter, entries]) => `<section class="phase" aria-labelledby="letter-${letter}"><h2 class="phase-h" id="letter-${letter}">${letter}</h2>${entries.map(entry => {
    const review = glossaryReview(entry);
    return `<article id="${glossaryAnchor(entry.term)}" data-review="${review.status}">
<h3>${esc(entry.term)}</h3>
<p class="summary">${esc(entry.short)}</p>
${entry.aliases?.length ? `<p class="meta">Also written: ${entry.aliases.map(esc).join(', ')}</p>` : ''}
<div class="editorial"><b>${esc(review.label)}</b><p>${esc(review.detail)}</p></div>
${availabilityNotes(entry.sources || []).map(note => `<div class="editorial"><b>${esc(note.label)}</b><p>${esc(note.text)}</p></div>`).join('')}
${entry.sources?.length ? `<ul class="links">${entry.sources.map(source => `<li><a href="${esc(source.url)}">${esc(source.label)}</a><br><span class="meta">${esc(source.kind)} source · ${esc(source.section)}</span></li>`).join('')}</ul>` : ''}
</article>`;
  }).join('\n')}</section>`).join('\n')}
</main>`;
  return page({ title: 'Security glossary and definition sources | HackGraph', desc: 'Beginner security definitions with source sections and explicit AI or human comparison records.', url: `${SITE}/glossary.html`, body,
    jsonld: { '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: 'HackGraph security glossary', url: `${SITE}/glossary.html`,
      hasDefinedTerm: GLOSSARY.map(e => ({ '@type': 'DefinedTerm', name: e.term, description: e.short, url: `${SITE}/glossary.html#${glossaryAnchor(e.term)}` })) } });
}

function sitemap() {
  const urls = [
    { loc: `${SITE}/`, pri: '1.0' },
    { loc: `${SITE}/reference.html`, pri: '0.9' },
    { loc: `${SITE}/about.html`, pri: '0.6' },
    { loc: `${SITE}/glossary.html`, pri: '0.7' },
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
mkdirSync(resolve(OUT, 'reference'), { recursive: true });
writeFileSync(resolve(OUT, 'reference.html'), renderIndex());
writeFileSync(resolve(OUT, 'about.html'), renderAbout());
writeFileSync(resolve(OUT, 'glossary.html'), renderGlossary());
for (const map of MAPS) writeFileSync(resolve(OUT, 'reference', `${META[map.id].slug}.html`), renderMapPage(map));
writeFileSync(resolve(OUT, 'sitemap.xml'), sitemap());

const total = MAPS.reduce((n, m) => n + m.nodes.length, 0);
console.log(`[reference] wrote reference index, reading guide, glossary, ${MAPS.length} map pages (${total} topics), and sitemap.xml`);
