// Engineering geometry only, using generic teaching diagrams. No domain routes.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fixtures, currentLayout, elkLayout, metrics } from './layout-lab.mjs';
import { denseCourseMap } from '../browser/fixtures.mjs';

const EPS = 1e-7;
const segments = route => route.points.slice(1).map((p, i) => [route.points[i], p]);
function intersection([a, b], [c, d]) {
  const cross = (x, y) => x[0] * y[1] - x[1] * y[0];
  const sub = (x, y) => [x[0] - y[0], x[1] - y[1]];
  const r = sub(b, a), s = sub(d, c), determinant = cross(r, s);
  if (Math.abs(determinant) < EPS) return null;
  const t = cross(sub(c, a), s) / determinant, u = cross(sub(c, a), r) / determinant;
  // Shared endpoints, branch joins and shared trunks are not proper crossings.
  if (t <= EPS || t >= 1 - EPS || u <= EPS || u >= 1 - EPS) return null;
  return [a[0] + r[0] * t, a[1] + r[1] * t];
}
function entersBox([a, b], box) {
  const left = box.x + EPS, right = box.x + box.w - EPS;
  const top = box.y - box.h / 2 + EPS, bottom = box.y + box.h / 2 - EPS;
  let lo = 0, hi = 1;
  for (const [start, delta, min, max] of [[a[0], b[0] - a[0], left, right], [a[1], b[1] - a[1], top, bottom]]) {
    if (Math.abs(delta) < EPS) { if (start < min || start > max) return false; }
    else { const t = [(min - start) / delta, (max - start) / delta].sort((a, b) => a - b); lo = Math.max(lo, t[0]); hi = Math.min(hi, t[1]); }
    if (lo > hi) return false;
  }
  return hi - lo > EPS;
}

export function geometryMetrics(positions, routes) {
  const lines = routes.map(segments);
  let crossings = 0, crossingPairs = 0, edgesThroughCards = 0, incidentCrossings = 0;
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const points = new Set();
      for (const a of lines[i]) for (const b of lines[j]) {
        const point = intersection(a, b);
        if (point) points.add(point.map(n => n.toFixed(5)).join(','));
      }
      crossings += points.size; if (points.size) crossingPairs++;
      const endpoints = [routes[i].source, routes[i].target].filter(id => id !== undefined);
      if (endpoints.some(id => id === routes[j].source || id === routes[j].target)) incidentCrossings += points.size;
    }
    for (const [id, box] of positions) {
      if (id !== routes[i].source && id !== routes[i].target && lines[i].some(line => entersBox(line, box))) edgesThroughCards++;
    }
  }
  return { edges: routes.length, crossings, crossingPairs, incidentCrossings, nonIncidentCrossings: crossings - incidentCrossings, edgesThroughCards };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dense = denseCourseMap(); dense.nodes.forEach(n => { n.h = 112; });
  const cases = [...fixtures(), { name: 'dense-convergence', map: dense, anchor: 'a2',
    before: ['root', 'a0', 'a1'], after: ['root', 'a0', 'a1', 'a2', 'a3', 'a4'] }];
  const rows = [];
  const ordered = { 'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES', 'elk.layered.crossingMinimization.semiInteractive': 'false' };
  for (const fixture of cases) for (const [solver, layout] of [['previous', (f, o, p) => currentLayout(f, o, p, .75, false)], ['current', currentLayout], ['elk', elkLayout],
    ['elk-ordered', (f, o, p) => elkLayout(f, o, p, ordered)]]) {
    const before = await layout(fixture, fixture.before);
    const after = await layout(fixture, fixture.after, before);
    rows.push({ fixture: fixture.name, solver, ...metrics(before, after, fixture.anchor), ...geometryMetrics(after, after.routes) });
  }
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/layout-geometry.json', import.meta.url), JSON.stringify({
    measuredAt: new Date().toISOString(), node: process.version,
    orderedElkOptions: ordered,
    method: 'Six generic fixtures. Current solver centerlines follow the renderer trunk/waypoint rules with sharp corners; ELK uses its returned orthogonal sections. Forward connectors only. Proper interior crossings exclude shared endpoint coordinates and collinear trunks. Incident crossings (edges sharing a node) are reported separately from non-incident crossings. Rounded-corner curves, arrowheads, stroke widths and captions are not scored here. Caption overlap is checked separately in real browsers.', rows,
  }, null, 2) + '\n');
  console.table(rows.map(({ fixture, solver, overlaps, crossings, edgesThroughCards, meanDisplacement }) => ({ fixture, solver, overlaps, crossings, edgesThroughCards, meanDisplacement })));
}
