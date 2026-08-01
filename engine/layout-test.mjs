// Headless test for the engine (engine.js — DOM-free and dataset-blind by
// contract) and the map registry (data.js).  Run:  node layout-test.mjs
import { readFileSync } from 'node:fs';

const engineSrc = readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const dataSrc = readFileSync(new URL('./data.js', import.meta.url), 'utf8');

const EXPORTS = `;
  return { buildModel, hasChildren, childCount, computeVisible, resolveVisible,
           pathBetween, shortestBetween, activeRoute, trailStep, keyLineage,
           keyLineageKeys, focusSlice, syncWays, buildColumns, buildAdj, orderColumns,
           assignCoords, buildSearchIndex, searchMap, encodeToken, decodeToken,
           serializeState, deserializeState, COL_PITCH };`;

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ok  ' + msg);
  else { failures++; console.error('  FAIL ' + msg); }
};

/* ---- separation guards: the engine must work with no dataset in sight ---- */

console.log('— engine/data separation —');
assert(!/\b(generateMap|incidentMap|STEP_DETAILS|MAPS|CYCLE|ENVS|ROLES|STEPS|PHASES)\b/.test(engineSrc),
  'engine source references no dataset identifiers');

const eng = new Function(engineSrc + EXPORTS)();   // engine ALONE, no data.js
const mini = {
  id: 'mini', name: 'Mini', rootId: 'r',
  phases: [{ id: 'a', label: 'A', color: '#888' }],
  nodes: [
    { id: 'r', label: 'Root', group: 'A', kind: 'start' },
    { id: 'x', label: 'X', group: 'A', kind: 'step' },
    { id: 'y', label: 'Y', group: 'A', kind: 'step' },
  ],
  edges: [
    { source: 'r', target: 'x', rel: 'then' },
    { source: 'x', target: 'y', rel: 'then' },
    { source: 'y', target: 'x', rel: 'loop' },
  ],
  relationships: { then: { label: 'then', summary: '' }, loop: { label: 'loops', summary: '' } },
};
const miniModel = eng.buildModel(mini);
const miniRes = eng.resolveVisible(miniModel, new Set(['r', 'x', 'y']));
assert(miniRes.vg.keySet.has('y~x'), 'engine runs standalone on a handmade map (cycle unrolled)');
assert(eng.buildSearchIndex(miniModel).length === 2, 'search index built for the handmade map');

/* ---- the shipped datasets, run through the same engine ---- */

const core = new Function(engineSrc + '\n' + dataSrc + EXPORTS.replace('COL_PITCH };', 'COL_PITCH, MAPS, generateMap };'))();
const {
  serializeState,
  buildModel, resolveVisible, pathBetween, activeRoute, trailStep, keyLineage, keyLineageKeys,
  focusSlice, syncWays, buildColumns, buildAdj, orderColumns, assignCoords,
  buildSearchIndex, searchMap, encodeToken, decodeToken, COL_PITCH, MAPS, generateMap,
} = core;

console.log('— map registry —');
assert(MAPS.length === 3, 'three maps registered (debug, pipeline, incident)');
assert(MAPS[0].id === 'debug', 'the letter map is the default while debugging');
const byId = id => MAPS.find(m => m.id === id);
assert(byId('pipeline').nodes.some(n => n.env) && !byId('incident').nodes.some(n => n.env),
  'per-map filter applicability: pipeline declares environments, incident does not');
assert(MAPS.every(m => m.nodes.every(n => ['step', 'category', 'start', 'goal'].includes(n.kind))),
  'every node uses a contract kind');

const map = generateMap();
const model = buildModel(map);

function layoutPass(expanded) {
  const { vg, rank, parents, backEdges } = resolveVisible(model, expanded);
  const viewsT = new Map(vg.nodeKeys.map(k => [k, {
    key: k, h: 112, rank: rank.get(k), pks: parents.get(k) || [],
    cyDisp: 0, targetCy: 0, xDisp: 0, targetX: rank.get(k) * COL_PITCH,
  }]));
  const forward = vg.edges.filter(e => !backEdges.has(e.id));
  const wsOf = syncWays(new Map(), forward, k => rank.get(k), new Set(), () => 0);
  const items = [...viewsT.values()];
  wsOf.forEach(l => items.push(...l));
  const chains = [];
  forward.forEach(e => chains.push([viewsT.get(e.source), ...(wsOf.get(e.id) || []), viewsT.get(e.target)]));
  const cols = buildColumns(items);
  const adj = buildAdj(chains);
  orderColumns(cols, adj.inN, adj.outN, model);
  assignCoords(cols, adj.inN, adj.outN);
  return { vg, rank, parents, backEdges, wsOf, cols };
}

function checkInvariants(name, { vg, rank, backEdges, wsOf, cols }) {
  let badSpan = 0, badWays = 0;
  vg.edges.forEach(e => {
    const span = rank.get(e.target) - rank.get(e.source);
    if (backEdges.has(e.id)) { if (span > 0) badSpan++; return; }
    if (span < 1) badSpan++;
    if ((wsOf.get(e.id) || []).length !== Math.max(0, span - 1)) badWays++;
  });
  assert(badSpan === 0, name + ': forward edges span >= 1, back edges do not');
  assert(badWays === 0, name + ': waypoint count == span-1 on every forward edge');
  let overlaps = 0;
  cols.forEach(col => {
    if (!col) return;
    const sorted = [...col].sort((a, b) => a.targetCy - b.targetCy);
    for (let i = 1; i < sorted.length; i++) {
      const bottom = sorted[i - 1].targetCy + sorted[i - 1].h / 2;
      if (sorted[i].targetCy - sorted[i].h / 2 < bottom - 0.5) overlaps++;
    }
  });
  assert(overlaps === 0, name + ': no overlaps in any column');
}

console.log('— expand root —');
let pass = layoutPass(new Set(['root']));
checkInvariants('initial', pass);
assert(pass.vg.keySet.has('g'), 'gate g visible via the fast-track edge');
assert(pass.rank.get('g') === 1, 'g ranks in column 1 (only in-edge is root)');
assert(pass.vg.nodeKeys.length === 8, 'root + 6 steps + gate visible');

console.log('— expand 3 —');
pass = layoutPass(new Set(['root', '3']));
checkInvariants('after-3', pass);
assert(pass.rank.get('g') === 2, 'g re-ranks to column 2');
assert((pass.wsOf.get('root|g') || []).length === 1, 'root->g grew one waypoint');

console.log('— cycle unroll: expand 1 and g —');
pass = layoutPass(new Set(['root', '1', 'g']));
checkInvariants('cycle', pass);
assert(pass.vg.keySet.has('g~1'), 'rework loop unrolled into forward instance g~1');
assert(pass.vg.defOf.get('g~1') === '1', 'instance renders def 1 (gets a #2 badge)');
assert(!pass.vg.edges.some(e => e.id === 'g|1'), 'the raw backward edge g->1 is gone');
assert(pass.rank.get('g~1') > pass.rank.get('g'), 'the instance sits forward of the gate');

console.log('— instance drill: expand the unrolled copy —');
pass = layoutPass(new Set(['root', '1', 'g', 'g~1']));
checkInvariants('instance-drill', pass);
assert(pass.vg.nodeKeys.some(k => k.startsWith('g~1~')), 'the instance opens its own forward context');

console.log('— path finding —');
pass = layoutPass(new Set(['root', '3', '3.4']));
const p1 = pathBetween(pass.vg, 'root', '3.4.2', pass.backEdges);
assert(p1 && p1.join(' ') === 'root 3 3.4 3.4.2', 'longest forward path root->3.4.2 — got ' + (p1 && p1.join(' ')));
const r1 = activeRoute(pass.vg, 'root', ['3', '3.4'], pass.backEdges);
assert(r1.join(' ') === 'root 3 3.4', 'trail stitches into the taken route');
const r2 = activeRoute(pass.vg, 'root', ['ghost-key', '3.4'], pass.backEdges);
assert(r2.join(' ') === 'root 3 3.4', 'stale waypoints are skipped gracefully');
const r3 = activeRoute(pass.vg, 'root', ['3.4', '3.2'], pass.backEdges);
assert(r3[r3.length - 1] === '3.2', 'unreachable-forward waypoint restarts from root');
const unrolled = layoutPass(new Set(['root', 'g', '1']));
const r4 = activeRoute(unrolled.vg, 'root', ['1'], unrolled.backEdges);
assert(r4.join(' ') === 'root 1',
  'a single click lights the DIRECT stitch, nothing auto-inserted — got ' + r4.join(' '));
const r5 = activeRoute(unrolled.vg, 'root', ['g', '1'], unrolled.backEdges);
assert(r5.join(' ') === 'root g g~1',
  'click order gate→step survives the unroll, no detour through 1 — got ' + r5.join(' '));
// clicking onward after an unroll: judged from the route end (the instance),
// a child of the CANONICAL node is not forward — the trail restarts and the
// waypoint must never be silently dropped
assert(pathBetween(unrolled.vg, 'g~1', '1.1', unrolled.backEdges) === null,
  'a child of canonical 1 is not forward of the g~1 instance');
const r6 = activeRoute(unrolled.vg, 'root', ['1.1'], unrolled.backEdges);
assert(r6.join(' ') === 'root 1 1.1',
  'restarted trail routes back through canonical 1 — got ' + r6.join(' '));
const drill = layoutPass(new Set(['root', 'g', '1', 'g~1']));
const r7 = activeRoute(drill.vg, 'root', ['g', '1', 'g~1~1.1'], drill.backEdges);
assert(r7.join(' ') === 'root g g~1 g~1~1.1',
  'an expanded instance extends the trail forward — got ' + r7.join(' '));
assert(keyLineage(model, '3.4.2').join(' ') === 'root 3 3.4 3.4.2', 'keyLineage finds the def ancestry');
assert(keyLineageKeys(model, 'g~1').join(' ') === 'root g g~1',
  'keyLineageKeys walks instance segments — got ' + keyLineageKeys(model, 'g~1').join(' '));

console.log('— debug map: letter routes —');
const dbg = buildModel(MAPS.find(m => m.id === 'debug'));
const dpass = (o, t) => {
  const { vg, backEdges } = resolveVisible(dbg, new Set(o));
  return activeRoute(vg, 'A', t, backEdges).join('→');
};
assert(dpass(['A', 'F'], ['F', 'B']) === 'A→F→B',
  'expanded gate keeps the trail — got ' + dpass(['A', 'F'], ['F', 'B']));
assert(dpass(['A', 'F', 'B'], ['F', 'B']) === 'A→F→F~B',
  'gate + step expanded routes through the unrolled copy — got ' + dpass(['A', 'F', 'B'], ['F', 'B']));
assert(dpass(['A', 'B', 'C', 'I'], ['B', 'I', 'K']) === 'A→B→I→K',
  'cross-edge trail holds every waypoint — got ' + dpass(['A', 'B', 'C', 'I'], ['B', 'I', 'K']));
// the reported repro: with B AND F expanded (loop unrolled), routes stay
// minimal and stable — no uninvited nodes, no auto-loop decoration
assert(dpass(['A', 'F', 'B'], ['F']) === 'A→F',
  'trail [F] stays A→F even after B expands — got ' + dpass(['A', 'F', 'B'], ['F']));
assert(dpass(['A', 'F', 'B'], ['B']) === 'A→B',
  'trail [B] stays A→B, the loop is not auto-appended — got ' + dpass(['A', 'F', 'B'], ['B']));

console.log('— click tracking: every gesture is judged from the previous one —');
// full app-level replay: body clicks AND pill expansions, exactly as the UI
// applies them (a pill visits the node too, but a non-chaining pill is a peek)
const edgeIdsOf = keys => {
  const s = new Set();
  for (let i = 0; i < keys.length - 1; i++) s.add(keys[i] + '|' + keys[i + 1]);
  return s;
};
function opSeq(open, ops) {
  const expanded = new Set(open);
  let trail = [], routeKeys = [], memory = [];
  const actions = [];
  for (const [type, key] of ops) {
    if (type === 'blank') {         // background click: deselect, keep the record
      trail = [];
      routeKeys = [];
      actions.push('blank');
      continue;
    }
    let { vg, backEdges } = resolveVisible(dbg, expanded, edgeIdsOf(routeKeys));
    const route = trail.length ? activeRoute(vg, 'A', trail, backEdges) : [];
    const step = trailStep(dbg, vg, backEdges, expanded, trail, route, key, memory);
    if (type === 'click') {
      trail = step.trail;
      actions.push(step.action + (step.from ? ':' + step.from : ''));
      if (step.action === 'reveal') expanded.add(step.from);
    } else {                        // pill: expand + visit, never destroy
      if (['extend', 'reveal', 'start', 'resume'].includes(step.action)) {
        trail = step.trail;
        actions.push('pill-' + step.action + (step.from ? ':' + step.from : ''));
        if (step.action === 'reveal') expanded.add(step.from);
      } else {
        actions.push('pill-peek');
      }
      expanded.add(key);
    }
    // post-gesture reconcile, protecting the route's edges like the app does
    ({ vg, backEdges } = resolveVisible(dbg, expanded, edgeIdsOf(route)));
    routeKeys = trail.length ? activeRoute(vg, 'A', trail, backEdges) : [];
    if (trail.length) memory = [...trail];
  }
  return { actions: actions.join(' '), route: routeKeys.join('→') };
}
const BLANK = ['blank'];
const C = k => ['click', k], P = k => ['pill', k];
const s1c = opSeq(['A'], [C('F'), C('B')]);
assert(s1c.actions === 'start reveal:F' && s1c.route === 'A→F→B',
  'click F then B: B is judged FROM F (reveal) — got [' + s1c.actions + '] ' + s1c.route);
const s2c = opSeq(['A', 'F'], [C('F'), C('B')]);
assert(s2c.actions === 'start extend:F' && s2c.route === 'A→F→B',
  'with F open, B extends FROM F — got [' + s2c.actions + '] ' + s2c.route);
const s3c = opSeq(['A', 'F', 'B'], [C('F'), C('B')]);
assert(s3c.actions === 'start extend:F' && s3c.route === 'A→F→B',
  'with the loop live, protection keeps the route on the ONE canonical B — got [' + s3c.actions + '] ' + s3c.route);
const s4c = opSeq(['A'], [C('F'), C('C')]);
assert(s4c.actions === 'start restart:F' && s4c.route === 'A→C',
  'an unconnected click restarts, explicitly — got [' + s4c.actions + '] ' + s4c.route);
const s5c = opSeq(['A', 'B'], [C('B'), C('I'), C('K')]);
assert(s5c.actions === 'start extend:B reveal:I' && s5c.route === 'A→B→I→K',
  'chain B→I→K judges each click from its predecessor — got [' + s5c.actions + '] ' + s5c.route);
// THE reported gesture: selecting F via its PILL, then clicking B — the pill
// visit must register, so B chains from F instead of starting a fresh path
const s6c = opSeq(['A'], [P('F'), C('B')]);
assert(s6c.actions === 'pill-start extend:F' && s6c.route === 'A→F→B',
  'pill on F counts as visiting F; B chains from it — got [' + s6c.actions + '] ' + s6c.route);
const s7c = opSeq(['A'], [C('F'), C('B'), P('D')]);
assert(s7c.actions === 'start reveal:F pill-peek' && s7c.route === 'A→F→B',
  'a non-chaining pill is a peek: the existing path survives — got [' + s7c.actions + '] ' + s7c.route);
const s8c = opSeq(['A'], [P('B'), P('I'), C('K')]);
assert(s8c.route === 'A→B→I→K',
  'a whole pill-driven drill still builds the path — got [' + s8c.actions + '] ' + s8c.route);
// THE reported gesture end-to-end: pill F, pill B — the cycle must break on
// the gate's side, so B stays ONE card with the route running through it
const s9c = opSeq(['A'], [P('F'), P('B')]);
assert(s9c.route === 'A→F→B',
  'pill F then pill B keeps the route on canonical B — got [' + s9c.actions + '] ' + s9c.route);
// trail MEMORY: deselecting un-lights the path but keeps the record — a later
// click on a remembered node resumes it, never the shortest fresh stitch
const s10c = opSeq(['A'], [C('F'), C('B'), BLANK, C('B')]);
assert(s10c.actions === 'start reveal:F blank resume' && s10c.route === 'A→F→B',
  'after deselect, clicking B resumes A→F→B — got [' + s10c.actions + '] ' + s10c.route);
const s11c = opSeq(['A', 'B', 'I'], [C('B'), C('I'), BLANK, C('K')]);
assert(s11c.actions === 'start extend:B blank resume:I' && s11c.route === 'A→B→I→K',
  'clicking forward of the record continues it — got [' + s11c.actions + '] ' + s11c.route);
const s12c = opSeq(['A'], [C('F'), C('B'), BLANK, C('D')]);
assert(s12c.actions === 'start reveal:F blank start' && s12c.route === 'A→D',
  'an unrelated click after deselect starts fresh — got [' + s12c.actions + '] ' + s12c.route);

console.log('— sibling order is data order —');
function dbgCols(open, seedY) {
  const { vg, rank, parents, backEdges } = resolveVisible(dbg, new Set(open));
  const viewsT = new Map(vg.nodeKeys.map((k, i) => [k, {
    key: k, h: 112, rank: rank.get(k), pks: parents.get(k) || [],
    cyDisp: seedY ? seedY(k, i) : 0, targetCy: 0, xDisp: 0, targetX: rank.get(k) * COL_PITCH,
  }]));
  const forward = vg.edges.filter(e => !backEdges.has(e.id));
  const wsOf = syncWays(new Map(), forward, k => rank.get(k), new Set(), () => 0);
  const items = [...viewsT.values()];
  wsOf.forEach(l => items.push(...l));
  const chains = [];
  forward.forEach(e => chains.push([viewsT.get(e.source), ...(wsOf.get(e.id) || []), viewsT.get(e.target)]));
  const cols = buildColumns(items);
  const adj = buildAdj(chains);
  orderColumns(cols, adj.inN, adj.outN, dbg);
  return cols.map(c => (c || []).filter(it => !it.isWay).map(it => it.key).join(','));
}
// even with a hostile warm-start (cards scrambled on screen), brothers come
// back in declared order
const scramble = (k, i) => (7 - i) * 100;
const o1 = dbgCols(['A'], scramble);
assert(o1[1].split(',').filter(k => 'BCDEF'.includes(k)).join('') === 'BCDEF',
  'A’s children render B,C,D,E,F in data order — got ' + o1[1]);
const o2 = dbgCols(['A', 'B', 'C'], scramble);
const lvl2 = o2[2].split(',');
const bKids = lvl2.filter(k => ['G', 'H', 'I'].includes(k)).join('');
const cKids = lvl2.filter(k => ['K', 'L', 'M'].includes(k)).join('');
assert(bKids === 'GHI' && cKids === 'KLM',
  'each sibling group keeps its declared order — got ' + o2[2]);
assert(lvl2.join(',').indexOf('G,H,I') >= 0 && lvl2.join(',').indexOf('K,L,M') >= 0,
  'sibling groups stay contiguous, never interleaved — got ' + o2[2]);

console.log('— focus slice: ancestors collapse to a straight line —');
{
  const open = new Set(['A', 'B']);
  const res = resolveVisible(dbg, open);
  const rt = activeRoute(res.vg, 'A', ['B'], res.backEdges);
  const sl = focusSlice(res, 'A', rt);
  const keys = sl.vg.nodeKeys.join(',');
  assert(sl.vg.keySet.has('A') && sl.vg.keySet.has('B'), 'the route itself survives — ' + keys);
  assert(!['C', 'D', 'E'].some(k => sl.vg.keySet.has(k)),
    'B’s SIBLINGS are gone, not merely dimmed — ' + keys);
  assert(['G', 'H', 'I', 'J'].every(k => sl.vg.keySet.has(k)),
    'the selection’s next steps stay — ' + keys);
  // B's next steps are G,H,I (fan) + J (its gate) + F (the group gate it feeds)
  assert(sl.vg.nodeKeys.length === 7, 'exactly route + next steps render — ' + keys);
  assert(sl.vg.edges.every(e => sl.vg.keySet.has(e.source) && sl.vg.keySet.has(e.target)),
    'no edge dangles into a hidden node');
  assert(sl.rank.get('A') === 0 && sl.rank.get('B') === 1 && sl.rank.get('G') === 2,
    'ranks re-derive over the reduced graph');
}
{ // deeper: the whole ancestry stays one-per-column
  const open = new Set(['A', 'B', 'I']);
  const res = resolveVisible(dbg, open);
  const rt = activeRoute(res.vg, 'A', ['B', 'I'], res.backEdges);
  const sl = focusSlice(res, 'A', rt);
  const perCol = new Map();
  sl.vg.nodeKeys.forEach(k => {
    const r = sl.rank.get(k);
    perCol.set(r, (perCol.get(r) || 0) + 1);
  });
  assert(perCol.get(0) === 1 && perCol.get(1) === 1 && perCol.get(2) === 1,
    'every ancestor column holds exactly one node — ' + [...perCol].join(' '));
  assert(!sl.vg.keySet.has('G') && !sl.vg.keySet.has('H'),
    'the selection’s own siblings vanish once it is the path — ' + sl.vg.nodeKeys.join(','));
  assert(sl.vg.keySet.has('K'), 'I’s next step across the cross-edge stays');
}

console.log('— protected unroll: cycles break away from the lit route —');
const pr = resolveVisible(dbg, new Set(['A', 'F', 'B']), new Set(['A|F', 'F|B']));
assert(pr.vg.keySet.has('B~F') && !pr.vg.keySet.has('F~B'),
  'the GATE copy is instanced, not the step the route stands on');
assert(pr.vg.edges.some(e => e.id === 'F|B'),
  'the traversed rework edge F→B stays rendered forward');
const prr = activeRoute(pr.vg, 'A', ['F', 'B'], pr.backEdges);
assert(prr.join('→') === 'A→F→B',
  'route stays on the single canonical B — got ' + prr.join('→'));

console.log('— search —');
const index = buildSearchIndex(model);
const s1 = searchMap(index, 'progressive');
assert(s1.length > 0 && s1[0].label.startsWith('Progressive'), 'label prefix outranks the rest');
const s2 = searchMap(index, 'error budget');
assert(s2.length > 0 && s2[0].label.startsWith('Progressive'), 'summary text is searchable');
assert(searchMap(index, '').length === 0, 'empty query returns nothing');

console.log('— unroll decisions survive a cold restore —');
{
  // Which side of a cycle unrolls depends on traversal order, and every downstream key
  // is minted from it. A link that carries only the open set can therefore restore a
  // DIFFERENT graph, where the saved `a~b` keys name nodes that do not exist.
  const m = core.buildModel(core.MAPS.find(x => x.id === 'pipeline'));
  const open = new Set(['root', 'g', '1', 'g~1', 'g~1~1.4', 'g~1~1.4.4', 'g~1~1.4.g']);
  const live = core.resolveVisible(m, open, new Set());
  const liveKeys = [...live.vg.nodeKeys].sort().join(',');

  // the lit route becomes `protect` on the next resolve — this is the cold-restore path
  const route = core.activeRoute(live.vg, m.rootId, ['g~1~1.4.1'], live.backEdges);
  const protect = new Set();
  for (let i = 0; i < route.length - 1; i++) protect.add(route[i] + '|' + route[i + 1]);

  const naive = core.resolveVisible(m, open, protect);
  assert([...naive.vg.nodeKeys].sort().join(',') !== liveKeys,
    'without the seed a restore CAN diverge (guards the fixture, not the engine)');

  const seeded = core.resolveVisible(m, open, protect, [...live.unroll]);
  assert([...seeded.vg.nodeKeys].sort().join(',') === liveKeys,
    'seeding the saved unroll set restores the identical graph');
  assert(live.unroll instanceof Set && live.unroll.size > 0,
    'resolveVisible reports the unroll decisions it made');
}

console.log('— share-token round-trip —');
const state = { m: 'pipeline', o: ['root', 'g', '1'], t: ['g', '1'], u: ['g->1'] };
const token = await encodeToken(state);
const back = await decodeToken(token);
assert(JSON.stringify(back) === JSON.stringify(state),
  'deflate token round-trips map, open set, ordered trail AND unroll decisions');
assert(await decodeToken('z:not-a-real-token') === null, 'malformed tokens decode to null, not a crash');
assert(await encodeToken({ m: null, o: [], t: [], u: [] }) === '',
  'an empty state encodes to nothing, so the URL keeps no hash at all');
{
  const readable = await decodeToken('map=pipeline&open=root,1&sel=1');
  assert(readable.m === 'pipeline' && readable.o.length === 2 && readable.t[0] === '1',
    'a readable link with no token still parses');
}
assert(serializeState({ m: 'm', o: ['root'], t: ['a'], u: [] }) === 'map=m&open=root&sel=a',
  'a single-hop trail serialises as sel alone, with no trail field');
assert(serializeState({ m: 'm', o: ['root'], t: ['a', 'b'], u: [] }).includes('trail=a,b'),
  'a multi-hop trail is stored in full, with literal commas');
{
  // separators must stay literal: URLSearchParams would emit %2C per comma, which on a
  // large open set costs more than the JSON quoting this format replaces
  const many = Array.from({ length: 200 }, (_, i) => 'g~1~n' + i);
  const st = { m: 'pipeline', o: many, t: [], u: [] };
  assert(serializeState(st).length < JSON.stringify(st).length,
    'the query form is smaller than the JSON it replaces');
}
{
  const odd = { m: 'a,b', o: ['x,y', 'p&q', 'r#s'], t: ['x,y'], u: ['g~1->1.4,z'] };
  const back = await decodeToken(await encodeToken(odd));
  assert(JSON.stringify(back) === JSON.stringify(odd),
    'ids containing , & or # survive the round-trip');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECKS FAILED');
process.exit(failures === 0 ? 0 : 1);
