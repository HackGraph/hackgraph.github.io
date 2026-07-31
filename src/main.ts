/**
 * HackGraph — application entry.
 *
 * The whole UI is the graph engine: canvas, toolbar, search, filters, detail panel,
 * breadcrumbs, notes, marks, context menu, settings and deep links all come from
 * `graph/engine`. There is no framework here; this file is the seam where the security
 * dataset meets a domain-blind engine.
 *
 * Everything security-specific lives in `data/`:
 *   - the maps themselves, converted by `toEngineMap`
 *   - the Target / "I hold" filters, expressed against the engine's filter contract
 *   - the glossary, hung off the engine's prose hook
 *
 * Strip `data/` away and what remains is a general graph explorer.
 */
import { MAPS } from './data';
import { toEngineMap } from './graph/engineAdapter';
import { ENGINE_FILTERS } from './data/domain/engineFilters';
import { decorateProse } from './data/domain/engineProse';
import { loadGraphView } from './graph/engine/loadView';
import { BUILD_DATE_LABEL, BUILD_HASH } from './buildInfo';
import { REPO_URL } from './repo';

/**
 * The mark: one foothold, a visible decision point, and the taken route running left to
 * right while the alternative stays quiet. The product in miniature.
 *
 * Built as DOM rather than an inline string because the engine's `brandMark` takes an
 * element — nothing gets parsed. Colours come from the engine's own tokens, so the accent
 * follows the light/dark switch without this file knowing which theme is active.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** The taken route: in from the left, through the fork, up to the reached goal. */
const LIT_ROUTE = 'M3.5 12H9.25C11.1 12 11.1 6.5 13 6.5H20.5';
/** The branch not taken, drawn quiet. */
const OTHER_ROUTE = 'M9.25 12C11.1 12 11.1 17.5 13 17.5H20.5';

function logoMark(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const path = (d: string, stroke: string, width: string, parent: Element) => {
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', d);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', width);
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    parent.appendChild(el);
  };
  const dot = (cx: number, cy: number, r: number, fill: string, opacity?: string) => {
    const el = document.createElementNS(SVG_NS, 'circle');
    el.setAttribute('cx', String(cx));
    el.setAttribute('cy', String(cy));
    el.setAttribute('r', String(r));
    el.setAttribute('fill', fill);
    if (opacity) el.setAttribute('opacity', opacity);
    svg.appendChild(el);
  };

  // both routes first, dimmed, so the lit one can be laid over the top of them
  const quiet = document.createElementNS(SVG_NS, 'g');
  quiet.setAttribute('opacity', '.48');
  path(LIT_ROUTE, 'currentColor', '1.75', quiet);
  path(OTHER_ROUTE, 'currentColor', '1.75', quiet);
  svg.appendChild(quiet);

  path(LIT_ROUTE, 'var(--accent)', '2', svg);
  dot(3.5, 12, 1.6, 'var(--accent)');      // the foothold you start from
  dot(9.25, 12, 1.4, 'var(--accent)');     // the decision point
  dot(20.5, 6.5, 1.6, 'var(--accent)');    // the goal this route reaches
  dot(20.5, 17.5, 1.5, 'currentColor', '.58');  // the one it did not
  return svg;
}

async function boot() {
  const host = document.getElementById('root');
  if (!host) throw new Error('#root is missing');

  const GraphView = await loadGraphView();
  GraphView.mount(host, {
    maps: MAPS.map(toEngineMap),
    title: 'HackGraph',
    brandMark: logoMark(),
    repoUrl: REPO_URL,
    build: { date: BUILD_DATE_LABEL, hash: BUILD_HASH },
    // the engine renders the entire interface
    chrome: { toolbar: true, filters: true, panel: true, crumbs: true, zoom: true },
    features: {
      search: true, focus: true, isolate: true, share: true,
      notes: true, marks: true, edgeTags: true,
    },
    // the only security-specific things the engine ever sees, and it treats both as opaque
    filters: ENGINE_FILTERS,
    prose: decorateProse,
    deepLink: true,
    storagePrefix: 'hg:',
  });
}

boot().catch((err) => {
  console.error('HackGraph failed to start:', err);
});
