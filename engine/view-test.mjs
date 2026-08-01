// Mount test for the view layer: boots GraphView in jsdom against the real
// engine + data, then drives it. Catches packaging/mount regressions that the
// pure-engine suite cannot see.   Run:  node view-test.mjs
//
// jsdom is resolved from wherever the test is run, so the engine keeps no
// dependencies of its own: inside this repo it comes from the host's devDependencies,
// and standalone it SKIPS (exit 0) rather than failing a checkout that has no
// node_modules at all. It used to be an absolute path into a sibling project,
// which tied a supposedly self-contained engine to one machine's layout.
import { readFileSync } from 'node:fs';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('jsdom not available — skipping view mount test');
  process.exit(0);
}

const read = f => readFileSync(new URL('./' + f, import.meta.url), 'utf8');

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ok  ' + msg);
  else { failures++; console.error('  FAIL ' + msg); }
};

const dom = new JSDOM('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const { document } = window;

// jsdom has no layout engine or SVG geometry: stub the few things the view
// reads from the renderer. Positions come from the engine, not the browser,
// so everything else exercises the real code path.
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { get: () => 112 });
Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get: () => 1280 });
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get: () => 800 });
window.SVGElement.prototype.getTotalLength = () => 100;
window.SVGElement.prototype.getPointAtLength = () => ({ x: 0, y: 0 });
window.Element.prototype.animate = () => ({ cancel() {}, finish() {} });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0);
window.cancelAnimationFrame = id => clearTimeout(id);

const globals = ['window', 'document', 'navigator', 'location', 'history', 'localStorage',
  'CustomEvent', 'Element', 'HTMLElement', 'SVGElement', 'Node', 'ResizeObserver',
  'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle'];
for (const g of globals) {
  if (window[g] === undefined) continue;
  try { Object.defineProperty(globalThis, g, { value: window[g], configurable: true, writable: true }); }
  catch { /* node owns this one (navigator) — the window copy is reachable anyway */ }
}

// load the three files exactly as a <script> tag would
const load = src => (0, eval)(read(src) + '\n;globalThis.' +
  (src === 'engine.js' ? 'resolveVisible' : src === 'data.js' ? 'MAPS' : 'GraphView') +
  ' = ' + (src === 'engine.js' ? 'resolveVisible' : src === 'data.js' ? 'MAPS' : 'GraphView') + ';');
['engine.js', 'data.js', 'view.js'].forEach(load);

const tick = () => new Promise(r => setTimeout(r, 30));

console.log('— mount —');
const a = document.getElementById('a');
const view = GraphView.mount(a, { maps: MAPS, startMap: 'debug', deepLink: false, storagePrefix: '' });
await tick();
assert(a.classList.contains('fg'), 'the container carries the scoped root class');
assert(a.querySelectorAll('.card').length > 1, 'cards rendered: ' + a.querySelectorAll('.card').length);
assert(a.querySelector('[data-el="viewport"]') !== null, 'the view builds its own markup');
assert(view.map.id === 'debug', 'startMap honoured');
assert(a.querySelectorAll('.elabel').length > 0, 'relationship tags rendered');

console.log('— interaction —');
const cardFor = label => [...a.querySelectorAll('.card')]
  .find(c => c.querySelector('.ttl').textContent === label);
cardFor('F').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick();
assert(view.route.join('→') === 'A→F', 'clicking F lights A→F — got ' + view.route.join('→'));
cardFor('B').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick();
assert(view.route.join('→') === 'A→F→B',
  'clicking B chains from F, the reported gesture — got ' + view.route.join('→'));
assert(a.querySelector('[data-el="panel"]').hidden === false, 'the detail panel opened');
assert(a.querySelector('[data-el="panelbody"]').textContent.includes('B'),
  'the panel describes the selection');

console.log('— api —');
view.setTheme('light');
assert(a.dataset.theme === 'light', 'setTheme swaps the instance theme');
view.clearSelection();
await tick();
assert(view.route.length === 0 && view.selection === null, 'clearSelection empties the route');
view.select('K');
await tick();
assert(view.selection === 'K', 'select() reveals and selects a node by id');
const token = await view.shareToken();
assert(typeof token === 'string' && token.length > 4, 'shareToken() returns a token');

console.log('— two instances are independent —');
const b = document.getElementById('b');
const view2 = GraphView.mount(b, {
  maps: MAPS, startMap: 'incident', deepLink: false, storagePrefix: '',
  chrome: { toolbar: false, filters: false }, features: { edgeTags: false },
});
await tick();
assert(view2.map.id === 'incident', 'the second instance loads its own map');
assert(view.map.id === 'debug', 'the first instance is unaffected');
assert(b.querySelector('[data-el="bar"]').hidden === true, 'chrome flags apply per instance');
assert(b.querySelectorAll('.elabel').length === 0, 'feature flags apply per instance');
assert(b.querySelectorAll('.card').length > 1, 'the second instance rendered its own cards');

console.log('— destroy —');
view2.destroy();
assert(b.innerHTML === '' && !b.classList.contains('fg'), 'destroy() leaves the container clean');
assert(a.querySelectorAll('.card').length > 1, 'destroying one instance does not disturb the other');

console.log(failures === 0 ? '\nALL VIEW CHECKS PASSED' : '\n' + failures + ' VIEW CHECKS FAILED');
process.exit(failures === 0 ? 0 : 1);
