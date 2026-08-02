'use strict';
/* Fan-Out Graph — the VIEW: an embeddable, multi-instance renderer for any map
   that satisfies the engine contract.

     const view = GraphView.mount(document.querySelector('#graph'), {
       maps: [myMap],            // required: one or more maps
       startMap: 'my-map',       // optional: which one opens
       expandRoot: false,        // optional: open showing only the entry point
       theme: 'dark' | 'light',  // optional: default follows the OS
       chrome: { toolbar: true, filters: true, panel: true, crumbs: true, zoom: true },
       features: { search: true, focus: true, isolate: true, share: true,
                   notes: true, marks: true, edgeTags: true },
       filters: [...],           // optional: host filter defs, same contract as built-ins
       prose(el, text) {},       // optional: decorate body prose (glossary, links, …)
       storagePrefix: 'fg:',     // notes/marks/prefs namespace
       deepLink: true,           // read and write the URL hash
       onSelect(info) {}, onEdgeSelect(info) {}, onRouteChange(info) {},
     });
     view.select('node-id'); view.setTheme('light'); view.destroy();

   Everything is scoped to the mounted element: styles (.fg), state classes and
   storage. Two instances on one page do not interfere. The graph math lives in
   engine.js, which never touches the DOM; the data lives in your own file. */

const GraphView = (() => {

// the engine is an explicit dependency, resolved from the global namespace
// (classic <script>) or CommonJS — never from leaked lexical scope
const E = globalThis.GraphEngine
  || (typeof require === "function" ? require("./engine.js") : null);
if (!E) throw new Error("GraphView requires engine.js to be loaded first");
const {
  CARD_W, COL_GAP, COL_PITCH, VGAP, KNOB, CORNER,
  buildModel, hasChildren, childCount, resolveVisible, focusSlice,
  shortestBetween, activeRoute, trailStep,
  keyLineage, keyLineageKeys, syncWays, buildColumns, buildAdj, orderColumns,
  assignCoords, buildSearchIndex, searchMap, encodeToken, decodeToken,
} = E;

const MARKUP = `
<div class="fg-viewport" data-el="viewport">
  <div class="fg-world" data-el="world">
    <svg class="fg-edges" data-el="edges" width="10" height="10"></svg>
    <div class="fg-elabels" data-el="elabels"></div>
    <svg class="fg-edges fg-edges-top" data-el="edgestop" width="10" height="10"></svg>
  </div>
</div>
<div class="fg-bar" data-el="bar">
  <span class="brand"><span class="brand-dot"></span><span data-el="title">Fan-Out Graph</span></span>
  <span class="fg-maps" data-el="maps"></span>
  <select class="fg-mapsel" data-el="mapsel" aria-label="Map"></select>
  <span class="fg-spacer"></span>
  <span class="fg-searchbox" data-el="searchbox">
    <span class="fg-searchicon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
    <input class="fg-search" data-el="search" type="text" placeholder="Search…  ( / )" autocomplete="off" spellcheck="false">
    <div class="fg-results" data-el="results" hidden></div>
  </span>
  <button class="fg-icon fg-searchbtn" data-el="searchbtn" title="Search" aria-label="Search" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
  <a class="fg-icon" data-el="repo" title="Source repository" target="_blank" rel="noopener noreferrer" hidden><svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg></a>
  <button class="fg-icon" data-el="gear" title="Settings" aria-haspopup="true" aria-expanded="false"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.43.64.79.79H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg></button>
  <button data-el="reset">Reset</button>
</div>
<div class="pop fg-settings" data-el="settings" hidden></div>
<span class="fg-hidden-actions" hidden>
  <button data-el="focus"></button><button data-el="isolate"></button>
  <button data-el="fit"></button><button data-el="share"></button><button data-el="theme"></button>
</span>
<div class="fg-zoom" data-el="zoom">
  <button data-el="zoomin" title="Zoom in" aria-label="Zoom in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
  <button data-el="zoomout" title="Zoom out" aria-label="Zoom out"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>
  <button data-el="zoomfit" title="Fit to screen" aria-label="Fit to screen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg></button>
</div>
<div class="fg-filterdock" data-el="filterdock">
  <button class="fg-icon fg-filterbtn" data-el="filterbtn" title="Filters" aria-label="Filters" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8Z"/></svg><span class="fdot" data-el="filterdot" hidden></span></button>
</div>
<div class="fg-filters" data-el="filters" hidden>
  <div class="fg-filtershead"><span>Filters</span><button class="fg-filtersx" data-el="filtersx" aria-label="Close filters"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
  <div class="fg-filtersbody" data-el="filtersbody"></div>
</div>
<div class="fg-crumbs" data-el="crumbs" hidden></div>
<button class="fg-isoexit" data-el="isoexit" hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>Back to the full graph</button>
<aside class="fg-panel" data-el="panel" hidden>
  <div class="fg-grab" data-el="grab"><span></span></div>
  <div class="fg-panelhead">
    <div class="fg-panelhead-main" data-el="panelhead"></div>
    <button class="fg-peek" data-el="peektoggle" aria-label="Expand details"><svg class="pk-up" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg><svg class="pk-min" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg></button>
    <button class="fg-panelx" data-el="panelx" aria-label="Close details"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <div class="fg-panelbody" data-el="panelbody"></div>
  <div class="fg-panelfoot" data-el="panelfoot" hidden></div>
</aside>
<div class="pop fg-menu" data-el="menu" hidden></div>
<div class="pop fg-notepop" data-el="notepop" hidden>
  <textarea class="fg-notetext" data-el="notetext" rows="3" placeholder="Note for this step…"></textarea>
  <div class="poprow">
    <button data-el="notesave">Save</button>
    <button data-el="notedel">Remove</button>
  </div>
</div>
`;

function mount(container, options = {}) {
  const root = typeof container === 'string' ? document.querySelector(container) : container;
  if (!root) throw new Error('GraphView.mount: container not found');
  const maps = (options.maps && options.maps.length) ? options.maps : (globalThis.MAPS || []);
  if (!maps.length) throw new Error('GraphView.mount: options.maps is required');

  const chrome = Object.assign(
    { toolbar: true, filters: true, panel: true, crumbs: true }, options.chrome);
  const features = Object.assign(
    { search: true, focus: true, isolate: true, share: true, theme: true,
      notes: true, marks: true, edgeTags: true, contextMenu: true, keyboard: true },
    options.features);
  const deepLink = options.deepLink !== false;
  const prefix = options.storagePrefix === undefined ? 'fg:' : options.storagePrefix;

  root.classList.add('fg');
  root.innerHTML = MARKUP;

  // scoped lookup — ids would collide between instances, data-el never does
  const $ = name => root.querySelector('[data-el="' + name + '"]');
  const viewport = $('viewport'), world = $('world'), svg = $('edges');
  const vw = () => root.clientWidth || 1;
  const vh = () => root.clientHeight || 1;

  // every listener on a shared target is tracked so destroy() takes it back
  const bound = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    bound.push([target, type, fn, opts]);
  };

  if (!chrome.toolbar) $('bar').hidden = true;
  if (!chrome.filters) $('filterdock').hidden = true;
  if (chrome.zoom === false) $('zoom').hidden = true;
  if (!features.search) $('searchbox').hidden = true;
  // The mode toggles and one-off actions live in the settings menu now; these anchors stay
  // in the DOM (hidden) so every existing handler and the public api keep working.
  if (maps.length < 2) { $('maps').hidden = true; $('mapsel').hidden = true; }
  if (options.title) $('title').textContent = options.title;
  // The default mark is a plain dot. A host with its own identity replaces it by handing
  // over an element — an element, not markup, so nothing has to be parsed or trusted.
  if (options.brandMark instanceof Element) {
    const dot = root.querySelector('.brand-dot');
    if (dot) dot.replaceWith(options.brandMark);
  }
  // the source link is opt-in: a host that has no public repo just does not get the button
  const repoUrl = safeUrl(options.repoUrl);
  if (repoUrl) { $('repo').href = repoUrl; $('repo').hidden = false; }

  const emit = (name, payload) => {
    const fn = options[name];
    if (typeof fn === 'function') fn(payload);
    root.dispatchEvent(new CustomEvent('fg' + name.slice(2).toLowerCase(), { detail: payload }));
  };

  // narrow-container layout is a CONTAINER question, not a viewport one
  const ro = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => root.classList.toggle('narrow', root.clientWidth <= 920))
    : null;
  if (ro) ro.observe(root);

  const REDUCED = !!(globalThis.matchMedia
    && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // A non-finite or absurd duration makes every frame's progress 0, so the tween never
  // reaches 1 and the rAF loop runs for the life of the tab. Clamp to something sane.
  // Number() itself throws on a Symbol or on {toString:null,valueOf:null}, so screen the
  // type before coercing rather than after
  const rawAnim = options.animationMs;
  const animMs = typeof rawAnim === 'number' ? rawAnim : NaN;
  const ANIM_MS = REDUCED ? 1
    : (Number.isFinite(animMs) && animMs > 0 ? Math.min(animMs, 10000) : 470);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const CHEV_D = '<svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M1.8 3.6 5 6.8 8.2 3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // marks a card that groups other nodes rather than being a step of its own
  const FOLDER = '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1.6 4.2a1.1 1.1 0 0 1 1.1-1.1h2.2l1.3 1.6h4.2a1.1 1.1 0 0 1 1.1 1.1v4.5a1.1 1.1 0 0 1-1.1 1.1H2.7a1.1 1.1 0 0 1-1.1-1.1V4.2Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  // Two edge layers, and they are separate SVGs on purpose. Lit edges have to outrank the
  // quiet tags of branches you are not on, and paint order inside one SVG cannot do that —
  // the tags are HTML in a sibling layer. So the quiet edges sit UNDER the tags and the lit
  // ones OVER them, which also keeps every tag readable on top of its own line.
  const gBase = document.createElementNS(SVGNS, 'g');
  const gTop = document.createElementNS(SVGNS, 'g');
  svg.appendChild(gBase);
  $('edgestop').appendChild(gTop);

  function relayerEdges() {
    edgeRecs.forEach(rec => {
      const top = rec.el.classList.contains('hl') || rec.el.classList.contains('lit');
      const layer = top ? gTop : gBase;
      if (rec.el.parentNode !== layer) layer.appendChild(rec.el);
      if (rec.label) {                // the tag mirrors its edge's state
        ['lit', 'hl', 'keep', 'fdim'].forEach(c =>
          rec.label.classList.toggle(c, rec.el.classList.contains(c)));
      }
    });
  }

  /* ---------- state & map loading ---------- */

  let map, model, searchIndex;
  let notes = {}, marks = new Set(), na = new Set();
  let expandedKeys = new Set();
  const views = new Map();          // key -> view (live only)
  const ways = new Map();           // waypoint id -> waypoint
  const edgeRecs = new Map();       // edge id -> {id, rel, pv, cv, ws, el, hit, back}
  const fadingEdges = new Set();
  const exitPool = new Set();
  let current = null;               // last resolveVisible result
  let trail = [];                   // ordered click-trail of render keys
  let trailMemory = [];             // last committed trail — survives deselection
  let route = [];                   // stitched lit path (derived from trail)
  let seedUnroll = null;            // unroll decisions: sticky for the session, shared in the link
  let isolateOn = false;
  let focusOn = false;

  let LS = prefix;
  // Stored state is reachable by anything same-origin (another script, an older build, a
  // synced profile). Parsing is not enough: `marks` arriving as {} made `new Set(...)`
  // throw out of boot, and because it is PERSISTED that bricked every later load too.
  // Fall back to the default whenever the shape is not the one the caller expects.
  const store = (key, fallback) => {
    if (!prefix) return fallback;
    try {
      const v = localStorage.getItem(LS + key);
      if (!v) return fallback;
      const parsed = JSON.parse(v);
      if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
      if (fallback && typeof fallback === 'object') {
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
      }
      return parsed;
    } catch { return fallback; }
  };
  const persist = (key, value) => {
    if (!prefix) return;
    try { localStorage.setItem(LS + key, JSON.stringify(value)); } catch { /* private mode */ }
  };

  function fade(el, from, to, opts = {}) {
    el.animate([{ opacity: from }, { opacity: to }], {
      duration: REDUCED ? 0 : (opts.duration || 300),
      delay: REDUCED ? 0 : (opts.delay || 0),
      easing: 'ease', fill: opts.fill || 'backwards',
    });
  }

  // tear everything down and stand a map up, optionally restoring a share token
  function loadMap(mapId, st) {
    map = maps.find(m => m.id === mapId) || maps[0];
    model = buildModel(map);
    searchIndex = buildSearchIndex(model, noteTextFor);
    // encoded so a crafted id cannot escape its namespace: a literal ':' would otherwise
    // let a map address another map's keys. Same id = same namespace is intentional — that
    // is how a map finds its own notes again next session.
    LS = prefix + encodeURIComponent(map.id) + ':';
    notes = store('notes', {});
    // values are attacker-reachable too: a non-string reaches textContent and throws
    for (const k of Object.keys(notes)) if (typeof notes[k] !== 'string') delete notes[k];
    marks = new Set(store('marks', []));
    na = new Set(store('na', []));

    cancelAnimationFrame(raf);
    views.forEach(v => v.el.remove()); views.clear();
    exitPool.forEach(v => { if (v.el) v.el.remove(); }); exitPool.clear();
    edgeRecs.forEach(r => { r.el.remove(); if (r.hit) r.hit.remove(); }); edgeRecs.clear();
    fadingEdges.forEach(r => { r.el.remove(); if (r.hit) r.hit.remove(); }); fadingEdges.clear();
    $('elabels').innerHTML = '';
    ways.clear();
    litEls.length = 0; hlEls.length = 0; hlKey = null; edgeSel = null; isoPath = null;
    // Array.isArray guards the container; the ELEMENTS are still attacker-controlled, and
    // one that resists string coercion ({"toString":null}) throws where a key is built.
    // Render keys are strings by construction, so anything else is not a key.
    const asKeys = v => (Array.isArray(v) ? v : []).filter(k => typeof k === 'string');
    trail = asKeys(st && st.t);
    trailMemory = [...trail];
    route = [];
    isolateOn = false;
    root.classList.remove('iso', 'focused', 'tracing');
    $('isolate').classList.remove('on');
    closePanel();
    closePops();

    // shape-check like `t` and `u` below: a link is attacker-controlled, and spreading a
    // non-iterable `o` throws out of boot and leaves the host with a blank graph
    // A restored link always brings its own open set. On a COLD start the host decides:
    // `expandRoot: false` shows only the entry point, so opening it is the reader's first
    // move rather than something already done for them.
    const restored = asKeys(st && st.o);
    expandedKeys = new Set(
      restored.length ? [model.rootId, ...restored]
        : (options.expandRoot === false ? [] : [model.rootId]));
    // a restored link carries the unroll decisions its keys were minted under
    seedUnroll = (st && Array.isArray(st.u)) ? asKeys(st.u) : null;
    buildFilters();
    [...$('maps').children].forEach(b => b.classList.toggle('on', b.dataset.map === map.id));
    $('mapsel').value = map.id;

    const rootView = makeView(model.rootId);
    rootView.el.style.visibility = 'hidden';
    world.appendChild(rootView.el);
    rootView.h = rootView.el.offsetHeight;
    place(rootView);
    rootView.el.style.visibility = '';
    views.set(model.rootId, rootView);

    reconcile(model.rootId);
    // a restored trail can involve loops: reconcile once more so the route just
    // computed protects its own edges through the unroll, like a live session
    if (trail.length) reconcile(model.rootId);
    const v = initialView();
    view.x = v.x; view.y = v.y; view.s = v.s;
    apply();
    // A shared link names a selection; land on it. Framing the whole restored graph and
    // leaving the reader to find the node the link was about defeats the point of sharing.
    const selKey = trail[trail.length - 1];
    const selView = selKey && views.get(selKey);
    if (selView) centerOnNode(selView);
  }

  /* ---------- cards ---------- */

  const defIdOf = key => { const i = key.lastIndexOf('~'); return i === -1 ? key : key.slice(i + 1); };

  // element builder — textContent only, so nothing dataset-supplied is ever parsed as HTML
  function mk(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  // A colour arrives from the dataset and lands in a style value, where anything that
  // resolves to a fetch — url(), image-set(), or a var() whose FALLBACK is one — becomes a
  // tracking beacon the host never opted into.
  //
  // Inspecting the string does not work. CSS escapes hide the function name (`u\72l(` IS
  // `url(`), CSS.supports() accepts any var() without looking inside it, and the CSSOM
  // preserves the escape when it serialises the value back. So do not sanitise the input:
  // hand it to the CSSOM and pass on the COMPUTED value instead, which is always a plain
  // rgb()/color() literal. The dataset string then never reaches a style property at all,
  // which closes the whole class rather than the payloads we happened to think of.
  const SAFE_COLOR = '#8f939b';
  const SENTINEL = 'rgb(1, 2, 3)';
  const colorCache = new Map();
  let colorProbe = null;
  function probeEl() {
    if (colorProbe && colorProbe.isConnected) return colorProbe;
    if (typeof document === 'undefined' || !document.body) return null;
    colorProbe = document.createElement('span');
    colorProbe.setAttribute('aria-hidden', 'true');
    colorProbe.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:0';
    document.body.appendChild(colorProbe);
    return colorProbe;
  }
  function safeColor(c) {
    if (typeof c !== 'string' || !c) return SAFE_COLOR;
    if (colorCache.has(c)) return colorCache.get(c);   // getComputedStyle forces a recalc
    let out = SAFE_COLOR;
    const probe = probeEl();
    if (probe) {
      probe.style.color = SENTINEL;
      probe.style.color = c;                 // an unparseable value leaves the sentinel
      const computed = getComputedStyle(probe).color;
      // sentinel intact => rejected outright. A var() with a bad fallback is invalid at
      // computed-value time and lands on the inherited colour: wrong, but still a literal.
      out = (computed && computed !== SENTINEL) ? computed : SAFE_COLOR;
      probe.style.color = '';
    }
    // No probe (mounted before <body> exists, or a DOM shim): do NOT try to salvage the
    // value. Keywords like `inherit` pass any shape test and then resolve against the
    // HOST's --c, which can be a url(). Nothing is worth that; take the safe colour.
    colorCache.set(c, out);
    return out;
  }

  // A command is DISPLAYED on one scrolling line and COPIED to the clipboard. A newline
  // is invisible in that row but makes the pasted text auto-execute at a shell prompt, and
  // bidi/zero-width marks let the visible order differ from the copied bytes. Strip both,
  // so what the row shows is exactly what the clipboard gets.
  // Line terminators are KEPT. The hole was never a newline as such: it was a newline the
  // reader could not see, so the clipboard carried an Enter the row did not show. The block
  // renders with `white-space: pre-wrap`, so a two-line command reads as two lines and
  // pastes as two lines, which is what its author wrote. Flattening them to spaces broke
  // 132 real multi-step commands into one line that does not run.
  //
  // Every exotic terminator is normalised to a plain \n rather than passed through: a lone
  // \r or U+2028 is Enter to a terminal but renders as nothing, which is the invisible case.
  // A TRAILING terminator is dropped, since that is the one that runs a command on paste.
  const LINE_BREAKS = /\r\n|[\r\u0085\u000B\u000C\u2028\u2029]/g;
  // \p{Cf} is every Unicode FORMAT character — the bidi controls, U+061C, the word
  // joiner, the soft hyphen — rather than the handful I happened to think of. Picking
  // them by hand is how U+061C got through and reordered a command on screen.
  const HIDDEN_CHARS = /[\u0000-\u0008\u000E-\u001F\u007F\u200B\u2060]|\p{Cf}/gu;
  function safeCommand(text) {
    return String(text == null ? '' : text)
      .replace(LINE_BREAKS, '\n')
      .replace(HIDDEN_CHARS, '')
      .replace(/\n+$/, '');
  }


  // Dataset links open in a new tab; javascript: and data: URLs must never survive that.
  function safeUrl(u) {
    if (typeof u !== 'string') return null;
    try {
      const parsed = new URL(u, location.href);
      return /^(https?|mailto):$/.test(parsed.protocol) ? parsed.href : null;
    } catch { return null; }
  }

  function makeView(key) {
    const defId = defIdOf(key);
    const def = model.defs.get(defId);
    const v = {
      key, defId, def, h: 0, rank: 0, pks: [],
      xDisp: 0, targetX: 0, cyDisp: 0, targetCy: 0,
      el: null, badgeEl: null,
    };
    const folder = def.kind === 'category';
    const el = document.createElement('div');
    el.className = 'card' + (folder ? ' folder' : '') + (na.has(defId) ? ' na' : '');
    el.dataset.key = key;
    el.style.setProperty('--c', safeColor(model.colorOf.get(def.group)));
    // Built as DOM, never as an HTML string: label/group/summary are DATASET values, and
    // string concatenation into innerHTML makes any map that carries `<img onerror=…>`
    // a script-execution vector in the host page.
    // A folder skips the phase eyebrow: for most groups it only repeated the title
    // ("Enumeration" sitting under "Enumeration"), and the tint and the folder mark
    // already carry the phase colour.
    const head = folder ? el : el.appendChild(mk('div', 'cat'));
    if (!folder) {
      head.appendChild(mk('span', 'dot'));
      head.appendChild(mk('span', null, def.group));
    }
    // Every card owns a badge, folder included: the unroll pass writes to it unguarded.
    const badge = head.appendChild(mk('span', 'badge'));
    badge.hidden = true;
    if (marks.has(defId)) el.appendChild(mk('span', 'mark', '★'));
    // A group is not a step, so its title carries a folder mark. It keeps its summary:
    // a title on its own left the card looking like a step whose author had not filled
    // it in, which is the impression the mark exists to prevent.
    if (folder) {
      const ttl = el.appendChild(mk('div', 'ttl'));
      ttl.appendChild(mk('span', 'fico')).innerHTML = FOLDER;
      ttl.appendChild(mk('span', 'tx', def.label));
    } else {
      el.appendChild(mk('div', 'ttl', def.label));
    }
    el.appendChild(mk('div', 'desc', def.summary || ''));
    if (notes[key]) el.appendChild(mk('div', 'note', notes[key]));
    if (hasChildren(model, defId)) {
      const t = el.appendChild(mk('button', 'toggle'));
      t.setAttribute('aria-label', 'Toggle children');
    }
    v.el = el;
    v.badgeEl = el.querySelector('.badge');
    setToggle(v);
    return v;
  }

  function setToggle(v) {
    const t = v.el && v.el.querySelector('.toggle');
    if (!t) return;
    if (expandedKeys.has(v.key)) {
      t.classList.add('open');
      t.innerHTML = CHEV_D;
    } else {
      t.classList.remove('open');
      t.innerHTML = '<span>' + childCount(model, v.defId) + '</span>';
    }
  }

  function place(v) {
    v.el.style.transform = 'translate(' + v.xDisp + 'px, ' + (v.cyDisp - v.h / 2) + 'px)';
  }

  /* ---------- edge geometry ---------- */

  function hop(x1, y1, ex, ey, tx) {
    if (tx === undefined) tx = ex - COL_GAP / 2;
    if (Math.abs(ey - y1) < 1) return ' L ' + ex + ' ' + ey;
    const dir = ey > y1 ? 1 : -1;
    const r = Math.min(CORNER, Math.abs(ey - y1) / 2);
    return ' L ' + (tx - r) + ' ' + y1 +
           ' Q ' + tx + ' ' + y1 + ' ' + tx + ' ' + (y1 + r * dir) +
           ' L ' + tx + ' ' + (ey - r * dir) +
           ' Q ' + tx + ' ' + ey + ' ' + (tx + r) + ' ' + ey +
           ' L ' + ex + ' ' + ey;
  }

  function arrowD(ex, ey) {
    return ' M ' + (ex - 7) + ' ' + (ey - 4.5) + ' L ' + ex + ' ' + ey + ' L ' + (ex - 7) + ' ' + (ey + 4.5);
  }

  // knob → (waypoint hops) → child. The first hop rides the parent's shared
  // trunk (bus fan-out); every in-edge lands on the child's centre line, so
  // fan-in converges to a single arrowhead. Backward residuals curve dashed.
  function edgeD(rec) {
    const p = rec.pv, c = rec.cv;
    const sx = p.xDisp + CARD_W + KNOB, sy = p.cyDisp;
    const ex = c.xDisp - 2, ey = c.cyDisp;
    if (rec.back || ex <= sx + 20) {
      return 'M ' + sx + ' ' + sy +
             ' C ' + (sx + 80) + ' ' + sy + ', ' + (ex - 80) + ' ' + ey + ', ' + ex + ' ' + ey +
             arrowD(ex, ey);
    }
    let d = 'M ' + sx + ' ' + sy;
    let cx = sx, cy = sy, onTrunk = true;
    for (const w of rec.ws) {
      d += hop(cx, cy, w.xDisp, w.cyDisp, onTrunk ? p.txDisp : w.xDisp - 28);
      d += ' L ' + (w.xDisp + CARD_W) + ' ' + w.cyDisp;
      cx = w.xDisp + CARD_W; cy = w.cyDisp;
      onTrunk = false;
    }
    d += hop(cx, cy, ex, ey, onTrunk ? p.txDisp : ex - 26);
    return d + arrowD(ex, ey);
  }

  function updateAllEdges() {
    const draw = rec => {
      const d = edgeD(rec);
      rec.el.setAttribute('d', d);
      if (rec.hit) rec.hit.setAttribute('d', d);
      if (rec.label) {                // ride the drawn path's midpoint
        const pt = rec.el.getPointAtLength(rec.el.getTotalLength() * 0.5);
        rec.label.style.transform =
          'translate(' + pt.x + 'px, ' + pt.y + 'px) translate(-50%, -50%)';
      }
    };
    edgeRecs.forEach(draw);
    fadingEdges.forEach(draw);
  }

  /* ---------- reconcile: diff the visible graph after any topology change ---------- */

  function reconcile(anchorKey) {
    // protect the lit route's edges: a cycle must never break (and unroll) on an
    // edge the user's path is standing on — the #n instance lands on the far side
    const protect = new Set();
    for (let i = 0; i < route.length - 1; i++) protect.add(route[i] + '|' + route[i + 1]);
    // the ranks the user is currently looking at: a re-resolve breaks cycles the same
    // way the visible layout already did, so expanding a node cannot re-parent it
    current = resolveVisible(model, expandedKeys, protect, seedUnroll);
    seedUnroll = [...current.unroll];   // carry the decision forward, never re-derive it
    // Focus and isolate are ONE reduction: keep the walked path plus the choices on offer
    // from it and drop the rest, so ancestors read as a straight line with their siblings
    // gone. Deselecting freezes the last slice (the remembered trail) instead of exploding
    // back open. Isolate differs only in how the result is laid out, below.
    const focusTrail = trail.length ? trail : trailMemory;
    if ((focusOn || isolateOn) && focusTrail.length) {
      const fullRoute = activeRoute(current.vg, model.rootId, focusTrail, current.backEdges);
      if (fullRoute.length) {
        if (isolateOn && isoPath) fullRoute.forEach(k => isoPath.add(k));
        current = focusSlice(current, model.rootId, fullRoute, protect,
          isolateOn ? isoPath : null);
      }
    }
    const { vg, rank, parents, backEdges } = current;
    const anchor = views.get(anchorKey) || views.get(model.rootId);
    trail = trail.filter(k => vg.keySet.has(k));

    // views leaving (no expanded parent reaches them any more)
    views.forEach(v => {
      if (vg.keySet.has(v.key)) return;
      views.delete(v.key);
      expandedKeys.delete(v.key);
      v.targetX = v.xDisp;             // freeze: fade out in place, no squashing
      v.targetCy = v.cyDisp;
      exitPool.add(v);
      v.el.classList.add('exit');
      fade(v.el, 1, 0, { duration: 220, fill: 'forwards' });
    });

    // Views entering + per-key layout inputs.
    //
    // Heights are still measured SYNCHRONOUSLY before anything animates — that property is
    // what keeps the first layout from being a guess. But reading offsetHeight right after
    // each appendChild flushes layout once PER NODE over a DOM that is still growing, which
    // is quadratic: a 3,000-wide fan-out spent most of ~29s here. Append the whole batch
    // first, then measure it, so the same information costs one flush instead of N.
    const fresh = [];
    vg.nodeKeys.forEach(key => {
      let v = views.get(key);
      if (!v) {
        exitPool.forEach(x => {        // reclaim a mid-fade key
          if (x.key === key) { x.el.remove(); exitPool.delete(x); }
        });
        v = makeView(key);
        v.el.style.visibility = 'hidden';
        world.appendChild(v.el);
        views.set(key, v);
        fresh.push([v, key]);
      }
      v.rank = rank.get(key);
      v.targetX = v.rank * COL_PITCH;
      v.pks = parents.get(key) || [];
    });
    fresh.forEach(([v]) => { v.h = v.el.offsetHeight; });   // one flush for the batch
    fresh.forEach(([v, key], enterIdx) => {
      const spawn = (parents.get(key) || []).map(k => views.get(k)).find(Boolean);
      v.cyDisp = spawn ? spawn.cyDisp : (anchor ? anchor.cyDisp : 0);
      v.rank = rank.get(key);
      v.xDisp = v.targetX = v.rank * COL_PITCH;
      place(v);
      v.el.style.visibility = '';
      // the stagger is a flourish for a handful of cards; uncapped, 3,000 of them would
      // queue nearly two minutes of entrance before the last one appeared
      fade(v.el, 0, 1, { duration: 320, delay: Math.min(enterIdx, 20) * 35 });
    });

    // instance badges (#2, #3…) — counted over the full render order
    const counts = new Map();
    vg.nodeKeys.forEach(key => {
      const d = defIdOf(key);
      const n = (counts.get(d) || 1) + (vg.defOf.has(key) ? 1 : 0);
      counts.set(d, n);
      const v = views.get(key);
      if (!v) return;
      const inst = vg.defOf.has(key);
      v.badgeEl.hidden = !inst;
      if (inst) v.badgeEl.textContent = '#' + n;
    });

    // edges leaving — before waypoint sync so their waypoints survive the fade
    const liveEdgeIds = new Set(vg.edges.map(e => e.id));   // was a scan per existing edge
    edgeRecs.forEach((rec, id) => {
      if (vg.keySet.has(rec.pv.key) && vg.keySet.has(rec.cv.key) &&
          liveEdgeIds.has(id)) return;
      edgeRecs.delete(id);
      fadingEdges.add(rec);
      if (rec.hit) { rec.hit.remove(); rec.hit = null; }
      rec.el.classList.remove('lit', 'hl');
      gBase.appendChild(rec.el);
      fade(rec.el, 1, 0, { duration: 200, fill: 'forwards' });
      if (rec.label) fade(rec.label, 1, 0, { duration: 200, fill: 'forwards' });
    });
    const keep = new Set();
    fadingEdges.forEach(rec => rec.ws.forEach(w => keep.add(w.id)));
    const forward = vg.edges.filter(e => !backEdges.has(e.id));
    const wsOf = syncWays(ways, forward, k => rank.get(k), keep,
      k => { const v = views.get(k); return v ? v.cyDisp : 0; });

    // edges entering / refreshing
    let edgeIdx = 0;
    vg.edges.forEach(e => {
      const pv = views.get(e.source), cv = views.get(e.target);
      let rec = edgeRecs.get(e.id);
      if (rec) {
        rec.pv = pv; rec.cv = cv;
        rec.ws = wsOf.get(e.id) || [];
        rec.back = backEdges.has(e.id);
        rec.el.classList.toggle('back', rec.back);
        return;
      }
      const el = document.createElementNS(SVGNS, 'path');
      el.setAttribute('class', 'edge' + (backEdges.has(e.id) ? ' back' : ''));
      const hit = document.createElementNS(SVGNS, 'path');
      hit.setAttribute('class', 'edgehit');
      hit.dataset.edge = e.id;
      gBase.appendChild(el);
      gBase.appendChild(hit);
      rec = { id: e.id, rel: e.rel, pv, cv, ws: wsOf.get(e.id) || [], el, hit, back: backEdges.has(e.id) };
      const relDef = features.edgeTags ? model.rels[e.rel] : null;
      // `tag: false` gives a relationship a name and an explanation for the panel without
      // lettering the canvas — for steps whose meaning is already plain from the two nodes
      // they join, where a caption on every one of them would be noise.
      if (relDef && relDef.label && relDef.tag !== false) {   // the relationship tag, riding the edge
        const lab = document.createElement('div');
        lab.className = 'elabel';
        lab.textContent = relDef.label;
        lab.dataset.edge = e.id;
        $('elabels').appendChild(lab);
        rec.label = lab;
        fade(lab, 0, 1, { duration: 300, delay: 60 + edgeIdx * 35 });
      }
      el.setAttribute('d', edgeD(rec));
      hit.setAttribute('d', el.getAttribute('d'));
      fade(el, 0, 1, { duration: 300, delay: 60 + edgeIdx * 35 });
      edgeRecs.set(e.id, rec);
      edgeIdx++;
    });

    // layout: packed columns over views + waypoints, forward hops only
    const items = [...vg.nodeKeys.map(k => views.get(k))];
    wsOf.forEach(list => items.push(...list));
    const chains = [];
    edgeRecs.forEach(rec => { if (!rec.back) chains.push([rec.pv, ...rec.ws, rec.cv]); });
    const cols = buildColumns(items);
    const adj = buildAdj(chains);
    orderColumns(cols, adj.inN, adj.outN, model);
    assignCoords(cols, adj.inN, adj.outN);

    if (anchor) {                      // the toggled card keeps its on-screen spot
      const delta = anchor.targetCy - anchor.cyDisp;
      items.forEach(it => { it.targetCy -= delta; });
    }

    // one shared out-trunk per expanded parent per column gap
    for (let r = 0; r < cols.length - 1; r++) {
      const parentsCol = (cols[r] || []).filter(it => !it.isWay && expandedKeys.has(it.key));
      const m = parentsCol.length;
      const spacing = m > 1 ? Math.min(16, 90 / (m - 1)) : 0;
      const cx = (r + 1) * COL_PITCH - COL_GAP / 2;
      parentsCol.forEach((p, i) => {
        p.trunkX = cx + (i - (m - 1) / 2) * spacing;
        if (p.txDisp === undefined) p.txDisp = p.trunkX;
      });
    }

    refreshRoute(true);
    applyFilters();
    startAnim();
  }

  /* ---------- transition engine: one clock owns every moving thing ---------- */

  let raf = 0;
  let perfFrames = 0, perfSlow = 0, perfLast = 0;

  function startAnim() {
    const moving = [...views.values(), ...exitPool, ...ways.values()];
    moving.forEach(m => { m._s = m.cyDisp; m._sx = m.xDisp; m._st = m.txDisp; });
    const t0 = performance.now();
    perfLast = 0;
    cancelAnimationFrame(raf);
    const tick = now => {
      // clamp BOTH ends: rAF hands us the frame's start time, which can precede
      // the performance.now() above — unclamped, the ease evaluates below zero
      // and kicks every animation one frame backwards
      const k = Math.min(1, Math.max(0, (now - t0) / ANIM_MS));
      const e = 1 - Math.pow(1 - k, 3);
      moving.forEach(m => {
        m.cyDisp = m._s + (m.targetCy - m._s) * e;
        m.xDisp = m._sx + (m.targetX - m._sx) * e;
        if (m._st !== undefined && m.trunkX !== undefined) {
          m.txDisp = m._st + (m.trunkX - m._st) * e;
        }
        if (m.el) place(m);
      });
      updateAllEdges();
      if (perfLast) { perfFrames++; if (now - perfLast > 34) perfSlow++; }
      perfLast = now;
      if (k < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        exitPool.forEach(c => { if (c.el) { c.el.remove(); c.el = null; } });
        exitPool.clear();
        fadingEdges.forEach(rec => {
          rec.el.remove();
          if (rec.hit) rec.hit.remove();
          if (rec.label) rec.label.remove();
        });
        fadingEdges.clear();
        // measured degradation: a machine that cannot hold the frame budget
        // gets flat ground and no soft shadows from here on
        if (perfPref() === 'auto' && !root.classList.contains('lowfx')
          && perfFrames >= 30 && perfSlow / perfFrames > 0.4) {
          root.classList.add('lowfx');
        }
      }
    };
    raf = requestAnimationFrame(tick);
  }

  function toggleKey(key) {
    const v = views.get(key);
    if (!v || !hasChildren(model, v.defId)) return;
    if (expandedKeys.has(key)) {
      expandedKeys.delete(key);
    } else {
      // expanding a node is also VISITING it: the pill joins the path exactly
      // like a body click would (this is how "I clicked F" is usually meant).
      // One guard: if it cannot chain from the current position it is a PEEK —
      // the existing path survives instead of being restarted or cleared.
      const step = trailStep(model, current.vg, current.backEdges, expandedKeys, trail, route, key, trailMemory);
      if (['extend', 'reveal', 'start', 'resume'].includes(step.action)) {
        trail = step.trail;
        applyReveal(step);
      }
      expandedKeys.add(key);
    }
    setToggle(v);
    reconcile(key);
    if (expandedKeys.has(key)) followKids(key);
  }

  /* ---------- camera (panel-aware: the reserve is designed in) ---------- */

  const view = { x: 0, y: 0, s: 1 };
  let glideTimer = 0;

  const isMobile = () => root.classList.contains('narrow') || vw() <= 920;

  // The screen area the detail panel occludes; every camera move honours it. On a narrow
  // screen the sheet is either a ~57px peek or a near-full-height panel, so measure it
  // rather than assuming: a fixed guess either shoves the graph up for a peek that covers
  // nothing, or leaves a centred node hidden behind an expanded sheet. Capped so that a
  // full-height sheet still leaves a band to centre into.
  function reserve() {
    if ($('panel').hidden) return { rx: 0, ry: 0 };
    if (!isMobile()) return { rx: 376, ry: 0 };
    const h = $('panel').getBoundingClientRect().height;
    return { rx: 0, ry: Math.min(h + 16, vh() * 0.6) };
  }

  function apply() {
    world.style.transform = 'translate(' + view.x + 'px, ' + view.y + 'px) scale(' + view.s + ')';
  }

  function glideTo(x, y, s) {
    hoverArmed = false;               // sliding content under a still cursor is not a hover
    world.classList.add('glide');
    view.x = x; view.y = y; view.s = s;
    apply();
    clearTimeout(glideTimer);
    glideTimer = setTimeout(() => world.classList.remove('glide'), 580);
  }

  function centerOn(wx, wy, s = Math.max(view.s, 0.85)) {
    const { rx, ry } = reserve();
    glideTo((vw() - rx) / 2 - wx * s, (vh() - ry) / 2 - wy * s, s);
  }

  function centerOnNode(v) {
    centerOn(v.targetX + CARD_W / 2, v.targetCy);
  }

  function bboxOf(items) {
    return {
      minX: Math.min(...items.map(c => c.targetX)),
      maxX: Math.max(...items.map(c => c.targetX)) + CARD_W,
      minY: Math.min(...items.map(c => c.targetCy - c.h / 2)),
      maxY: Math.max(...items.map(c => c.targetCy + c.h / 2)),
    };
  }

  // expanding a node frames the children it revealed: fit them all, zooming out
  // if the fan is taller than the viewport
  function followKids(key) {
    const kids = [];
    edgeRecs.forEach(rec => { if (rec.pv.key === key) kids.push(rec.cv); });
    if (!kids.length) return;
    frameBounds(bboxOf(kids), view.s);
  }

  function frameBounds(b, maxZoom = 1) {
    const { rx, ry } = reserve();
    const m = 140;
    const aw = vw() - rx, ah = vh() - ry;
    const s = Math.max(0.12, Math.min(maxZoom,
      (aw - m) / (b.maxX - b.minX), (ah - m) / (b.maxY - b.minY)));
    glideTo((aw - (b.maxX - b.minX) * s) / 2 - b.minX * s,
            (ah - (b.maxY - b.minY) * s) / 2 - b.minY * s, s);
  }

  // Frame what is ACTUALLY rendered rather than a fixed root-plus-one-column box. That
  // box assumed the root was already fanned out, so a collapsed start put the single card
  // half a column left of centre. Honours the panel reserve, so "centred" means centred in
  // the space the graph actually has.
  function initialView() {
    const live = [...views.values()];
    if (!live.length) return { x: vw() / 2, y: vh() / 2, s: 1 };
    const b = bboxOf(live);
    const { rx, ry } = reserve();
    const m = 140;
    const aw = vw() - rx, ah = vh() - ry;
    const s = Math.max(0.5, Math.min(1,
      (aw - m) / Math.max(1, b.maxX - b.minX), (ah - m) / Math.max(1, b.maxY - b.minY)));
    return {
      x: (aw - (b.maxX - b.minX) * s) / 2 - b.minX * s,
      y: (ah - (b.maxY - b.minY) * s) / 2 - b.minY * s,
      s,
    };
  }

  /* ---------- pan / zoom ---------- */

  let drag = null, dragMoved = false;
  const pointers = new Map();       // active pointerId -> position (for pinch)
  let pinch = null;

  viewport.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      // second finger down: this gesture is a pinch, never a drag or a click
      const [a, b] = [...pointers.values()];
      cancelLongPress();
      drag = null;
      dragMoved = true;
      pinch = {
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        s0: view.s,
        mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        v0: { x: view.x, y: view.y },
      };
      world.classList.remove('glide');
      return;
    }
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    dragMoved = false;
    armLongPress(e);
  });
  on(window, 'pointermove', e => {
    hoverArmed = true;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s2 = Math.min(2.2, Math.max(0.3, pinch.s0 * (d / Math.max(1, pinch.d0))));
      // the world point under the pinch midpoint stays anchored while zooming
      view.x = mid.x - (pinch.mid0.x - pinch.v0.x) * (s2 / pinch.s0);
      view.y = mid.y - (pinch.mid0.y - pinch.v0.y) * (s2 / pinch.s0);
      view.s = s2;
      apply();
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragMoved && Math.hypot(dx, dy) > 4) {
      dragMoved = true;
      cancelLongPress();
      viewport.classList.add('panning');
      world.classList.remove('glide');
    }
    if (dragMoved) {
      view.x = drag.vx + dx;
      view.y = drag.vy + dy;
      apply();
    }
  });
  const endDrag = e => {
    if (e) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    drag = null;
    cancelLongPress();
    viewport.classList.remove('panning');
    setTimeout(() => { dragMoved = false; }, 0);
  };
  on(window, 'pointerup', endDrag);
  on(window, 'pointercancel', endDrag);

  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    world.classList.remove('glide');
    if (e.ctrlKey || e.metaKey) {
      const s2 = Math.min(2.2, Math.max(0.3, view.s * Math.exp(-e.deltaY * 0.0022)));
      view.x = e.clientX - (e.clientX - view.x) * (s2 / view.s);
      view.y = e.clientY - (e.clientY - view.y) * (s2 / view.s);
      view.s = s2;
    } else {
      view.x -= e.deltaX;
      view.y -= e.deltaY;
    }
    apply();
  }, { passive: false });

  /* ---------- trail, selection, focus & the lit route ---------- */

  const litEls = [];


  function applyReveal(step) {
    if (step.action !== 'reveal') return false;
    expandedKeys.add(step.from);
    const fv = views.get(step.from);
    if (fv) setToggle(fv);
    return true;
  }

  function trailClick(key) {
    // the from-node for every click is the PREVIOUS CLICK (or its unrolled #n
    // instance) — trailStep is pure engine code, so this is tested, not hoped
    const step = trailStep(model, current.vg, current.backEdges, expandedKeys, trail, route, key, trailMemory);
    trail = step.trail;
    const revealed = applyReveal(step);
    // FOCUS: make sure the selection's ancestry AND the selection itself are
    // expanded, so the slice has a route to keep and next steps to offer
    if (focusOn && trail.length) {
      const selKey = trail[trail.length - 1];
      keyLineageKeys(model, selKey).forEach(k => expandedKeys.add(k));
      expandedKeys.add(selKey);
      views.forEach(setToggle);
      reconcile(selKey);
    } else if (revealed) {
      reconcile(key);                 // the reveal changed topology: full pass
    } else {
      refreshRoute(false);
    }
    const v = views.get(key);
    if (v && trail.length) centerOnNode(v);
  }

  function refreshRoute(inReconcile) {
    litEls.forEach(el => el.classList.remove('lit', 'sel', 'keep'));
    litEls.length = 0;
    route = trail.length ? activeRoute(current.vg, model.rootId, trail, current.backEdges) : [];
    if (trail.length) trailMemory = [...trail];   // the record survives deselection
    root.classList.toggle('focused', route.length > 0);

    if (route.length) {
      route.forEach(k => {
        const v = views.get(k);
        if (v) { v.el.classList.add('lit'); litEls.push(v.el); }
      });
      for (let i = 0; i < route.length - 1; i++) {
        const rec = edgeRecs.get(route[i] + '|' + route[i + 1]);
        if (rec) {
          rec.el.classList.add('lit');
          rec.hit.classList.add('lit');
          litEls.push(rec.el, rec.hit);
        }
      }
      // The ring marks where you ARE, so exactly one card wears it. A def can be on screen
      // several times once loops unroll — Valid Domain Credentials, #2 and #3 — and ringing
      // every copy said you were standing in three places at once.
      const selKey = route[route.length - 1];
      const selView = views.get(selKey);
      if (selView) { selView.el.classList.add('sel'); litEls.push(selView.el); }
      // the selection's PEERS (siblings on its route step) also stay visible
      const prev = route[route.length - 2];
      edgeRecs.forEach(rec => {
        const peer = prev !== undefined && rec.pv.key === prev;
        // Next steps belong to the instance you are STANDING on, not to every instance of
        // the same def. The ring is shared above so the card you expanded cannot dim; the
        // fan-out is not, because a route that revisits a def — dcsync → pass-the-hash#2 →
        // dcsync#2 — would otherwise light BOTH dcsync fan-outs, and the copy you are not
        // looking at reads as undimmed for no reason.
        const next = rec.pv.key === selKey;
        if (!peer && !next) return;
        rec.el.classList.add('keep');
        rec.cv.el.classList.add('keep');
        litEls.push(rec.el, rec.cv.el);
      });
      if (isolateOn && isoPath) route.forEach(k => isoPath.add(k));
      if (chrome.panel) renderPanel(selKey);
      emit('onSelect', { key: selKey, defId: defIdOf(selKey), node: model.defs.get(defIdOf(selKey)), route: route.slice() });
    } else {
      closePanel();
    }
    relayerEdges();
    if (chrome.crumbs) renderCrumbs();
    syncUrl();
    emit('onRouteChange', { route: route.slice(), trail: trail.slice() });

    // Isolate IS focus, laid out straight. The slice has already removed everything off the
    // path, so this only has to put what remains on one line.
    if (isolateOn && route.length > 1) {
      // Straighten the live ROUTE — only the route is a line. Everything else the slice
      // kept (the choices on offer, the branches already seen) then hangs in a band BELOW
      // it, stacked per column. Straightening alone is not enough: it moves a card without
      // telling the layout, so the route node lands on whichever sibling the packing had
      // put at that height.
      const base = views.get(route[0]);
      if (base) {
        const lineY = base.targetCy;
        const onRoute = new Set(route);
        route.forEach(k => { const v = views.get(k); if (v) v.targetCy = lineY; });
        const byRank = new Map();
        views.forEach(v => {
          if (onRoute.has(v.key)) return;
          if (!byRank.has(v.rank)) byRank.set(v.rank, []);
          byRank.get(v.rank).push(v);
        });
        byRank.forEach(col => {
          col.sort((a, b) => a.targetCy - b.targetCy);
          let y = lineY + base.h / 2 + VGAP * 1.4;
          col.forEach(v => { v.targetCy = y + v.h / 2; y += v.h + VGAP; });
        });
      }
      if (!inReconcile) {
        startAnim();
        frameBounds(bboxOf([...views.values()]));
      }
    } else if (isolateOn && !route.length) {
      setIsolate(false);              // the route dissolved underneath isolate
    }
  }

  function renderCrumbs() {
    const bar = $('crumbs');
    // under isolate the whole screen already IS the trail, so the bar is noise; the way out
    // takes its place (see syncIsolateUi, which owns both when the mode changes)
    bar.hidden = isolateOn || route.length < 2;
    if (bar.hidden) { bar.innerHTML = ''; return; }
    bar.innerHTML = '';
    route.forEach((k, i) => {
      if (i) {
        const sep = document.createElement('span');
        sep.className = 'crumbsep';
        sep.textContent = '›';
        bar.appendChild(sep);
      }
      const b = document.createElement('button');
      b.className = 'crumb' + (i === route.length - 1 ? ' last' : '');
      b.textContent = model.defs.get(defIdOf(k)).label;
      b.addEventListener('click', () => trailClick(k));
      bar.appendChild(b);
    });
    // The step you just took is the LAST crumb, and a long trail overflows this bar.
    // Rebuilding resets scrollLeft to 0, which parks it on the oldest steps and hides the
    // one you are actually on — you had to drag to find yourself. End at the end instead.
    // Twice: the bar's width animates when the panel opens beside it, and a position set
    // against the old width is no longer the end once the new one lands.
    const toEnd = () => { bar.scrollLeft = bar.scrollWidth; };
    toEnd();
    requestAnimationFrame(toEnd);
  }

  /* ---------- isolate: the lit path only, laid out straight ---------- */

  // The path ISOLATE was entered on. It only ever grows, so stepping back never deletes
  // what lies ahead of you.
  //
  // Focus deliberately does NOT use it. The two modes share one reduction, but they want
  // different sets: focus collapses to where you are RIGHT NOW — that live narrowing is
  // the whole feature — while isolate pins a path you chose and holds it. Giving focus the
  // sticky set made it accumulate until it barely reduced at all.
  let isoPath = null;                 // positions + camera to restore on exit

  function setIsolate(on) {
    if (on === isolateOn) return;
    if (on && route.length < 2) return;               // nothing to isolate yet
    isolateOn = on;
    // Both reduced modes walk the same path; entering either starts it and it lives until
    // neither is on.
    isoPath = on ? new Set(route) : null;
    root.classList.toggle('iso', on);
    $('isolate').classList.toggle('on', on);
    syncIsolateUi();
    // A reduction is a topology change, so it goes through the normal reconcile. The old
    // implementation stashed every card's position and the camera and put them back by
    // hand, because it hid nodes with opacity rather than removing them — with a real
    // slice there is nothing to restore.
    reconcile(route[route.length - 1] || model.rootId);
  }

  // The panel's isolate control is rendered once but the mode can change from the toolbar,
  // Escape or a reset — mirror the live flag onto it rather than trusting the render.
  function syncIsolateUi() {
    const b = $('panelfoot').querySelector('.pfoot');
    if (b) {
      b.classList.toggle('on', isolateOn);
      b.setAttribute('aria-checked', String(isolateOn));
    }
    $('isoexit').hidden = !isolateOn;
    if (chrome.crumbs) $('crumbs').hidden = isolateOn || route.length < 2;
  }

  /* ---------- hover: one path, honouring the click order ---------- */

  let hoverArmed = false;             // ignore hovers caused by content sliding under a still cursor
  let hlKey = null;
  const hlEls = [];

  function hoverPathFor(key) {
    const idx = route.indexOf(key);
    if (idx >= 0) return route.slice(0, idx + 1);
    // with nothing selected, hover consults the remembered record: a node on
    // the last committed path previews THAT path, not the shortest fresh one
    const base = trail.length ? trail : trailMemory;
    const mi = base.indexOf(key);
    const wps = mi >= 0 ? base.slice(0, mi + 1) : [...base, key];
    const preview = activeRoute(current.vg, model.rootId, wps, current.backEdges);
    if (preview[preview.length - 1] === key) return preview;
    return shortestBetween(current.vg, model.rootId, key, current.backEdges) || [key];
  }

  function setHl(key) {
    if (hlKey === key) return;
    clearHl();
    hlKey = key;
    root.classList.add('tracing');
    const path = hoverPathFor(key);       // edges only: hover never paints cards
    for (let i = 0; i < path.length - 1; i++) {
      const rec = edgeRecs.get(path[i] + '|' + path[i + 1]);
      if (rec) { rec.el.classList.add('hl'); hlEls.push(rec.el); }
    }
    relayerEdges();
  }

  function setHlEdge(edgeId) {
    if (hlKey === 'edge:' + edgeId) return;
    clearHl();
    const rec = edgeRecs.get(edgeId);
    if (!rec) return;
    hlKey = 'edge:' + edgeId;
    root.classList.add('tracing');
    rec.el.classList.add('hl');
    hlEls.push(rec.el);
    relayerEdges();
  }

  function clearHl() {
    if (hlKey === null) return;
    hlKey = null;
    root.classList.remove('tracing');
    hlEls.forEach(el => el.classList.remove('hl'));
    hlEls.length = 0;
    relayerEdges();
  }

  viewport.addEventListener('mouseover', e => {
    const hitEl = e.target.closest('.edgehit') || e.target.closest('.elabel');
    if (hitEl) {
      if (hoverArmed) setHlEdge(hitEl.dataset.edge);
      return;
    }
    const cardEl = e.target.closest('.card');
    if (cardEl && !cardEl.classList.contains('exit')) {
      if (hoverArmed) setHl(cardEl.dataset.key);
    } else {
      clearHl();
    }
  });
  viewport.addEventListener('mouseleave', clearHl);

  /* ---------- clicks ---------- */

  viewport.addEventListener('click', e => {
    closePops();
    if (dragMoved) return;
    const hitEl = e.target.closest('.edgehit') || e.target.closest('.elabel');
    if (hitEl) {
      // an edge (or its tag) walks the path to its destination AND opens the
      // relationship's own panel — the edge is a first-class thing to inspect
      const rec = edgeRecs.get(hitEl.dataset.edge);
      if (rec) { trailClick(rec.cv.key); renderEdgePanel(rec); }
      return;
    }
    const cardEl = e.target.closest('.card');
    if (!cardEl || cardEl.classList.contains('exit')) {
      // Under isolate the route IS the view, so clearing the trail would silently dismantle
      // it. Leaving isolate is a deliberate act: the button, Escape, or reset.
      if (isolateOn) return;
      if (trail.length) { trail = []; refreshRoute(false); }
      return;
    }
    const key = cardEl.dataset.key;
    if (e.target.closest('.toggle')) toggleKey(key);
    else trailClick(key);
  });

  /* ---------- context menu, notes, marks & not-applicable ---------- */

  let longPressTimer = 0;

  function armLongPress(e) {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    longPressTimer = setTimeout(() => {
      dragMoved = true;               // suppress the trailing click
      openMenu(cardEl.dataset.key, e.clientX, e.clientY);
    }, 550);
  }
  const cancelLongPress = () => clearTimeout(longPressTimer);

  if (features.contextMenu) viewport.addEventListener('contextmenu', e => {
    const hitEl = e.target.closest('.edgehit') || e.target.closest('.elabel');
    if (hitEl) {
      e.preventDefault();
      const rec = edgeRecs.get(hitEl.dataset.edge);
      if (rec) renderEdgePanel(rec);
      return;
    }
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    e.preventDefault();
    openMenu(cardEl.dataset.key, e.clientX, e.clientY);
  });

  function placePop(el, x, y) {
    el.hidden = false;
    const r = el.getBoundingClientRect();
    el.style.left = Math.min(x, vw() - r.width - 12) + 'px';
    el.style.top = Math.min(y, vh() - r.height - 12) + 'px';
  }

  function closePops() {
    $('menu').hidden = true;
    $('notepop').hidden = true;
  }

  function openMenu(key, x, y) {
    closePops();
    const v = views.get(key);
    if (!v) return;
    const defId = v.defId;
    const menu = $('menu');
    menu.innerHTML = '';
    const item = (label, fn) => {
      const b = document.createElement('button');
      b.className = 'mi';
      b.textContent = label;
      b.addEventListener('click', () => { closePops(); fn(); });
      menu.appendChild(b);
    };
    if (hasChildren(model, defId)) {
      item(expandedKeys.has(key) ? 'Collapse children' : 'Expand children', () => toggleKey(key));
    }
    if (features.marks) item(marks.has(defId) ? 'Unmark step' : 'Mark step ★', () => toggleMark(defId));
    if (features.marks) item(na.has(defId) ? 'Clear not-applicable' : 'Mark not applicable', () => toggleNa(defId));
    if (features.notes) item(notes[key] ? 'Edit note…' : 'Add note…', () => openNote(key, x, y));
    if (features.share) item('Copy link to this view', copyLink);
    placePop(menu, x, y);
  }

  let noteCtx = null;

  function openNote(key, x, y) {
    closePops();
    noteCtx = { key };
    $('notetext').value = notes[key] || '';
    placePop($('notepop'), x, y);
    $('notetext').focus();
  }

  // notes are keyed by the rendered INSTANCE, so a note written on the #2 visit stays
  // there and does not appear on the original; editing re-measures that card and
  // relayouts around its new height
  // Notes are keyed by rendered instance; search works on defs, so every note written on
  // any instance of a step makes that step findable.
  function noteTextFor(defId) {
    let out = '';
    for (const k of Object.keys(notes)) {
      if (k === defId || k.endsWith('~' + defId)) out += ' ' + notes[k];
    }
    return out;
  }

  function saveNoteFor(key, text, anchorKey) {
    if (text) notes[key] = text;
    else delete notes[key];
    persist('notes', notes);
    searchIndex = buildSearchIndex(model, noteTextFor);   // the note is searchable now
    views.forEach(v => {
      if (v.key !== key) return;
      let noteEl = v.el.querySelector('.note');
      if (text && !noteEl) {
        noteEl = document.createElement('div');
        noteEl.className = 'note';
        const toggle = v.el.querySelector('.toggle');
        v.el.insertBefore(noteEl, toggle);
      }
      if (noteEl) {
        if (text) noteEl.textContent = text;
        else noteEl.remove();
      }
      v.h = v.el.offsetHeight;
    });
    reconcile(anchorKey);
  }

  $('notesave').addEventListener('click', () => {
    if (!noteCtx) return;
    saveNoteFor(noteCtx.key, $('notetext').value.trim(), noteCtx.key);
    closePops();
  });
  $('notedel').addEventListener('click', () => {
    if (!noteCtx) return;
    saveNoteFor(noteCtx.key, '', noteCtx.key);
    closePops();
  });

  // Marks and not-applicable are keyed by CONTENT id, notes by rendered INSTANCE, and that
  // asymmetry is deliberate. "I have done this step" or "this does not apply to this
  // engagement" is a fact about the technique, so it should show on every #n visit to it. A
  // note is written about the branch you were on when you wrote it, so it should not.
  function toggleMark(defId) {
    if (marks.has(defId)) marks.delete(defId);
    else marks.add(defId);
    persist('marks', [...marks]);
    views.forEach(v => {
      if (v.defId !== defId) return;
      let star = v.el.querySelector('.mark');
      if (marks.has(defId) && !star) {
        star = document.createElement('span');
        star.className = 'mark';
        star.textContent = '★';
        v.el.appendChild(star);
      } else if (!marks.has(defId) && star) {
        star.remove();
      }
    });
    applyFilters();
    refreshPanel();
  }

  // "not applicable": a distinct ruled-out treatment, also keyed by content id
  function toggleNa(defId) {
    if (na.has(defId)) na.delete(defId);
    else na.add(defId);
    persist('na', [...na]);
    views.forEach(v => {
      if (v.defId === defId) v.el.classList.toggle('na', na.has(defId));
    });
    refreshPanel();
  }

  /* ---------- detail panel: where the dataset's depth lives ---------- */

  let panelKey = null;                // 'node:<key>' | 'edge:<id>' | null

  function closePanel() {
    $('panel').hidden = true;
    panelKey = null;
    if (edgeSel) { edgeSel.el.classList.remove('hl'); edgeSel = null; relayerEdges(); }
  }

  function refreshPanel() {
    if (panelKey && panelKey.startsWith('node:')) renderPanel(panelKey.slice(5), true);
  }

  let edgeSel = null;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // Body prose goes through the host if it supplied `options.prose`, which receives the
  // element and the text and may replace the contents (to gloss terms, link things, …).
  // Default is plain text, so a host that supplies nothing gets exactly what it got before.
  function prose(cls, text, tag) {
    const n = el(tag || 'div', cls, text);
    if (typeof options.prose === 'function') options.prose(n, String(text == null ? '' : text));
    return n;
  }

  function section(body, title) {
    body.appendChild(el('h3', null, title));
  }

  /**
   * Render a details block: the sections a node or an edge can both carry.
   *
   * Shared because an edge is a step too. What has to be true before you can take it, what
   * it costs you in noise, and what to read about it are the same questions whether the
   * step is a technique or the move between two of them, and answering them in one prose
   * paragraph is what a caption does badly.
   *
   * `applies` is the one caller-specific slot — a node scopes itself by env and role, an
   * edge has nothing to say there — and it keeps its place in the reading order.
   */
  function renderDetails(body, d, applies) {
    if (d.caution) {
      const box = el('div', 'caution');
      // the dataset names the box (this dataset calls it OPSEC); unnamed falls back to a
      // plain warning, which is what a generic caution reads as
      box.appendChild(el('div', 'caution-label', d.cautionLabel || 'Caution'));
      box.appendChild(prose('caution-body', d.caution));
      body.appendChild(box);
    }

    if (d.prereqs && d.prereqs.length) {
      // an edge asks a different question of the same list: not "what do I need" but
      // "when is this the branch to take", so the heading is the dataset's to name
      section(body, d.prereqsLabel || 'Prerequisites');
      const chips = el('div', 'chips');
      // A requirement is sometimes a phrase and sometimes a whole condition to check against
      // a live host. Past a certain length it stops being a label, so the list is laid out as
      // rows instead. Decided for the LIST, not per entry: one short condition among long
      // ones reads as a stray chip rather than as the same kind of thing.
      const rows = d.prereqs.some(r => typeof r === 'string' && !model.defs.has(r) && r.length > 56);
      // An entry is either another node's id — in which case the chip navigates — or a
      // plain requirement in prose. Dropping the latter silently left datasets showing an
      // empty "Prerequisites" heading with nothing under it.
      d.prereqs.forEach(req => {
        const target = typeof req === 'string' ? model.defs.get(req) : null;
        if (target) {
          const c = el('button', 'pchip', target.label);
          c.addEventListener('click', () => revealDef(req));
          chips.appendChild(c);
        } else if (req) {
          chips.appendChild(prose('pchip static' + (rows ? ' long' : ''), String(req), 'span'));
        }
      });
      body.appendChild(chips);
    }
    if (applies && applies.length) {
      section(body, 'Applies');
      const chips = el('div', 'chips');
      applies.forEach(t => chips.appendChild(el('span', 'pchip static', t)));
      body.appendChild(chips);
    }
    if (d.tools && d.tools.length) {
      section(body, 'Tools');
      const chips = el('div', 'chips');
      // a tool may be a bare name or {name, url}; a url makes the chip a link out
      d.tools.forEach(t => {
        const name = typeof t === 'string' ? t : (t && t.name);
        if (!name) return;
        const href = typeof t === 'string' ? null : safeUrl(t && t.url);
        if (!href) { chips.appendChild(el('span', 'pchip static', name)); return; }
        const a = el('a', 'pchip link', name);
        a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.appendChild(el('span', 'pchip-ext', '↗'));
        chips.appendChild(a);
      });
      body.appendChild(chips);
    }
    if (d.commands && d.commands.length) {
      section(body, 'Commands');
      d.commands.forEach(entry => {
        const label = entry && typeof entry === 'object' ? entry.label : null;
        const cmdText = safeCommand(entry && typeof entry === 'object' ? entry.code : entry);
        const row = el('div', 'cmd');
        if (label) row.appendChild(el('div', 'cmd-label', label));
        row.appendChild(el('code', 'cmd-code', cmdText));
        const btn = el('button', null, 'copy');
        btn.addEventListener('click', async () => {
          // copy exactly the text on screen — never a payload the row did not show
          let ok = true;
          try { await navigator.clipboard.writeText(cmdText); } catch { ok = false; }
          // say what happened: a button that reports "copied" after a denied clipboard
          // sends the reader to a terminal to paste something that is not there
          btn.textContent = ok ? 'copied' : 'blocked';
          setTimeout(() => { btn.textContent = 'copy'; }, 1200);
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
    }
    if (d.refs && d.refs.length) {
      section(body, 'References');
      const refs = el('div', 'refs');
      d.refs.forEach(([label, url]) => {
        const href = safeUrl(url);
        // an unusable protocol still shows its label, it just is not a link
        const a = el(href ? 'a' : 'span', null, label + (href ? ' ↗' : ''));
        if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        refs.appendChild(a);
      });
      body.appendChild(refs);
    }
  }

  function renderPanel(key, force) {
    if (panelKey === 'node:' + key && !force) return;
    if (edgeSel) { edgeSel.el.classList.remove('hl'); edgeSel = null; relayerEdges(); }
    panelKey = 'node:' + key;
    const defId = defIdOf(key);
    const def = model.defs.get(defId);
    const d = def.details || {};
    const head = $('panelhead');
    const body = $('panelbody');
    head.innerHTML = '';
    body.innerHTML = '';
    const color = safeColor(model.colorOf.get(def.group));
    head.style.setProperty('--c', color);
    body.style.setProperty('--c', color);

    const cat = el('span', 'pcat');
    cat.appendChild(el('span', 'dot'));
    cat.appendChild(el('span', null, def.group + (def.kind === 'goal' ? ' · goal' : '')));
    head.appendChild(cat);

    const h = el('h2', null, def.label);
    const view0 = views.get(key);
    if (view0 && !view0.badgeEl.hidden) {
      const b = el('span', 'badge', view0.badgeEl.textContent);
      h.appendChild(b);
    }
    head.appendChild(h);

    // the two annotation states ride in the header, next to what they annotate
    const pm = el('div', 'pmarks');
    const mk = el('button', 'pmark' + (marks.has(defId) ? ' on' : ''));
    mk.innerHTML = '<i class="pmdot"></i>';
    mk.appendChild(document.createTextNode(marks.has(defId) ? 'Marked' : 'Mark cleared'));
    mk.addEventListener('click', () => toggleMark(defId));
    const nab = el('button', 'pmark na' + (na.has(defId) ? ' on' : ''));
    nab.innerHTML = '<i class="pmdot"></i>';
    nab.appendChild(document.createTextNode(na.has(defId) ? 'Not applicable' : 'Mark N/A'));
    nab.addEventListener('click', () => toggleNa(defId));
    pm.appendChild(mk); pm.appendChild(nab);
    head.appendChild(pm);

    const crumb = el('div', 'pcrumb');
    route.forEach((k, i) => {
      if (i) crumb.appendChild(el('span', 'psep', '›'));
      const label = model.defs.get(defIdOf(k)).label;
      if (i === route.length - 1) { crumb.appendChild(el('b', null, label)); return; }
      // every earlier step is a way back: the trail is the point of the panel
      const step = el('button', 'pcrumb-step', label);
      step.addEventListener('click', () => trailClick(k));
      crumb.appendChild(step);
    });
    body.appendChild(crumb);

    if (def.summary) body.appendChild(prose('psum', def.summary));
    if (d.description) body.appendChild(prose('pdesc', d.description));
    renderDetails(body, d, [def.env, def.role && 'role: ' + def.role].filter(Boolean));

    // Next steps is the panel's call to action: where can you go from here. Collapsed by
    // default so the reading content above it is not pushed off the first screen.
    const kids = model.childrenOf.get(defId) || [];
    if (kids.length) {
      const wrap = el('div', 'pnext');
      const btn = el('button', 'pnextbtn');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      const lead = el('span', 'pnextlead');
      const caption = el('span', null, 'Pick your next step');
      lead.appendChild(caption);
      lead.appendChild(el('span', 'pnextcount', String(kids.length)));
      btn.appendChild(lead);
      btn.innerHTML += '<svg class="pnextchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<path d="m9 6 6 6-6 6"/></svg>';
      wrap.appendChild(btn);

      const list = el('div', 'pnextlist');
      const inner = el('div', 'pnextinner');
      kids.forEach(({ target }) => {
        const t = model.defs.get(target);
        const item = el('button', 'pnextitem');
        item.type = 'button';
        const dot = el('span', 'dot');
        dot.style.background = safeColor(model.colorOf.get(t.group));
        item.appendChild(dot);
        const txt = el('span', 'ptext');
        txt.appendChild(el('span', 'plabel', t.label));
        if (t.summary) txt.appendChild(el('span', 'psub', t.summary));
        item.appendChild(txt);
        item.innerHTML += '<svg class="pnextarrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
          + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          + '<path d="M5 12h14M13 6l6 6-6 6"/></svg>';
        item.addEventListener('click', () => revealDef(target));
        inner.appendChild(item);
      });
      list.appendChild(inner);
      wrap.appendChild(list);

      btn.addEventListener('click', () => {
        const open = wrap.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
        // querySelector, not the closure: innerHTML += above re-created the child nodes
        btn.querySelector('.pnextlead span:first-child').textContent =
          open ? 'Next steps' : 'Pick your next step';
      });
      body.appendChild(wrap);
    }

    section(body, 'Your note');
    const ta = el('textarea');
    ta.value = notes[key] || '';
    ta.placeholder = 'A note for this step, on this branch. Marks apply to every visit.';
    body.appendChild(ta);
    const row = el('div', 'prow');
    const save = el('button', null, 'Save note');
    save.addEventListener('click', () => saveNoteFor(key, ta.value.trim(), key));
    row.appendChild(save);
    body.appendChild(row);

    renderPanelFoot();
    setPeek(false);
    $('panel').hidden = false;
  }

  // isolate is a property of the selected route, so it belongs to the panel rather than
  // the global settings menu
  function renderPanelFoot() {
    const foot = $('panelfoot');
    foot.innerHTML = '';
    if (!features.isolate) { foot.hidden = true; return; }
    const b = el('button', 'pfoot' + (isolateOn ? ' on' : ''));
    b.type = 'button';
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(!!isolateOn));
    b.innerHTML = '<i class="pmdot"></i>';
    b.appendChild(document.createTextNode('Isolate this path'));
    b.addEventListener('click', () => $('isolate').click());
    foot.appendChild(b);
    foot.hidden = false;
  }

  // edge detail: what this specific relationship means at this link
  function renderEdgePanel(rec) {
    emit('onEdgeSelect', { id: rec.id, rel: rec.rel, source: rec.pv.defId, target: rec.cv.defId });
    if (!chrome.panel) return;
    if (edgeSel) edgeSel.el.classList.remove('hl');
    edgeSel = rec;
    rec.el.classList.add('hl');
    relayerEdges();
    panelKey = 'edge:' + rec.id;
    const rel = model.rels[rec.rel] || { label: rec.rel || 'link', summary: '' };
    const src = model.defs.get(rec.pv.defId), dst = model.defs.get(rec.cv.defId);
    const head = $('panelhead');
    const body = $('panelbody');
    head.innerHTML = '';
    body.innerHTML = '';
    const color = safeColor(model.colorOf.get(dst.group));
    head.style.setProperty('--c', color);
    body.style.setProperty('--c', color);

    const cat = el('span', 'pcat');
    cat.appendChild(el('span', 'dot'));
    cat.appendChild(el('span', null, 'relationship'));
    head.appendChild(cat);
    head.appendChild(el('h2', null, rel.label));

    const crumb = el('div', 'pcrumb');
    crumb.appendChild(document.createTextNode(src.label));
    crumb.appendChild(el('span', 'psep', '→'));
    crumb.appendChild(el('b', null, dst.label));
    body.appendChild(crumb);

    if (rel.summary) body.appendChild(prose('psum', rel.summary));
    // the same sections a node gets: an edge is a step, and what has to hold before you can
    // take it deserves a list rather than a semicolon-spliced sentence in its caption
    renderDetails(body, rel.details || {});

    section(body, 'Tags');
    const tags = el('div', 'chips');
    [rel.label, rec.back ? 'loops back' : 'forward',
      rec.ws.length ? 'skips ' + rec.ws.length + ' column' + (rec.ws.length > 1 ? 's' : '') : null,
      dst.kind === 'goal' ? 'reaches a gate' : null,
    ].filter(Boolean).forEach(t => tags.appendChild(el('span', 'pchip static', t)));
    body.appendChild(tags);

    section(body, 'Endpoints');
    [[rec.pv, 'from', src], [rec.cv, 'to', dst]].forEach(([v, side, d]) => {
      const row = el('button', 'nextstep');
      row.appendChild(el('span', null, d.label));
      row.appendChild(el('span', 'rg', side));
      row.addEventListener('click', () => trailClick(v.key));
      body.appendChild(row);
    });
    if (dst.summary) {
      section(body, 'Leads to');
      body.appendChild(prose('pdesc', dst.summary));
    }
    $('panelfoot').hidden = true;
    setPeek(false);
    $('panel').hidden = false;
  }

  $('panelx').addEventListener('click', () => {
    if (panelKey && panelKey.startsWith('node:') && trail.length) {
      trail = [];
      refreshRoute(false);            // closing the panel deselects
    } else {
      closePanel();
    }
  });

  // The bar narrows when the panel opens beside it, so the end of the trail moves after
  // the render that put it there. Follow it when that animation lands.
  if (chrome.crumbs) {
    $('crumbs').addEventListener('transitionend', e => {
      if (e.target === e.currentTarget) e.currentTarget.scrollLeft = e.currentTarget.scrollWidth;
    });
  }

  /* ---------- pluggable filters: dim, never hide ---------- */

  let activeFilterDefs = [];
  const filterState = {};

  // A host can add its own filters through `options.filters`. They use exactly the same
  // contract as the built-ins, so the engine still never learns what a filter MEANS — it
  // asks `appliesTo`, `isActive` and `dims` and renders whatever `control` builds.
  function hostFilterDefs() {
    const defs = typeof options.filters === 'function' ? options.filters({ map, model, el })
      : (options.filters || []);
    return Array.isArray(defs) ? defs : [];
  }

  function makeFilterDefs() {
    return [
      {
        id: 'phase', order: 50, title: 'Phases', persistKey: 'f-phase',
        appliesTo: m => m.phases.length > 1,
        initial: () => ({ off: [] }),
        isActive: s => s.off.length > 0,
        dims: (def, s) => def.kind !== 'start' && s.off.includes(def.group),
        control(state, container, onChange) {
          const groups = map.phases.map(p => p.label)
            .filter(g => g !== 'Start' && map.nodes.some(n => n.group === g));
          groups.forEach(g => {
            const chip = el('button', 'fchip' + (state.off.includes(g) ? ' off' : ''));
            chip.appendChild(el('span', 'dot'));
            chip.lastChild.style.background = safeColor(model.colorOf.get(g));
            chip.appendChild(el('span', null, g));
            chip.addEventListener('click', () => {
              const i = state.off.indexOf(g);
              if (i >= 0) state.off.splice(i, 1); else state.off.push(g);
              chip.classList.toggle('off', state.off.includes(g));
              onChange();
            });
            container.appendChild(chip);
          });
        },
      },
      {
        id: 'env', order: 50, title: 'Environment', persistKey: 'f-env',
        appliesTo: m => m.nodes.some(n => n.env),      // absent on maps without environments
        initial: () => ({ off: [] }),
        isActive: s => s.off.length > 0,
        dims: (def, s) => !!def.env && s.off.includes(def.env),
        control(state, container, onChange) {
          const envs = [...new Set(map.nodes.map(n => n.env).filter(Boolean))];
          envs.forEach(env => {
            const chip = el('button', 'fchip' + (state.off.includes(env) ? ' off' : ''), env);
            chip.addEventListener('click', () => {
              const i = state.off.indexOf(env);
              if (i >= 0) state.off.splice(i, 1); else state.off.push(env);
              chip.classList.toggle('off', state.off.includes(env));
              onChange();
            });
            container.appendChild(chip);
          });
        },
      },
      {
        id: 'role', order: 50, title: 'Viewing as', persistKey: 'f-role',
        appliesTo: m => m.nodes.some(n => n.role),
        initial: () => ({ as: 'admin' }),
        isActive: s => s.as !== 'admin',
        dims(def, s) {
          const ranks = { anyone: 0, contributor: 1, maintainer: 2, admin: 3 };
          return !!def.role && ranks[def.role] > ranks[s.as];
        },
        control(state, container, onChange) {
          ['anyone', 'contributor', 'maintainer', 'admin'].forEach(role => {
            const chip = el('button', 'fchip' + (state.as === role ? '' : ' off'), role);
            chip.addEventListener('click', () => {
              state.as = role;
              [...container.querySelectorAll('.fchip')].forEach(c =>
                c.classList.toggle('off', c.textContent !== role));
              onChange();
            });
            container.appendChild(chip);
          });
        },
      },
      {
        id: 'marked', order: 90, title: 'Overlays', persistKey: 'f-marked',
        appliesTo: () => true,
        initial: () => ({ on: false }),
        isActive: s => s.on,
        dims: (def, s) => s.on && def.kind !== 'start' && !marks.has(def.id),
        control(state, container, onChange) {
          const chip = el('button', 'fchip' + (state.on ? '' : ' off'), '★ Marked only');
          chip.addEventListener('click', () => {
            state.on = !state.on;
            chip.classList.toggle('off', !state.on);
            onChange();
          });
          container.appendChild(chip);
        },
      },
    ];
  }

  // store() checks the OUTER shape, which is not enough here: {"off": 5} is a plain object
  // and still throws on .includes, taking the boot down — and because it is persisted, on
  // every later load too. Check each field against the initial value's type.
  function matchesShape(value, template) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    for (const k of Object.keys(template)) {
      const t = template[k], v = value[k];
      if (Array.isArray(t) ? !Array.isArray(v) : typeof v !== typeof t) return false;
    }
    return true;
  }

  function buildFilters() {
    const container = $('filtersbody');
    container.innerHTML = '';
    // Filters sort by `order`, low first, stable within a tie so an array's own order still
    // decides between siblings. Host filters default to 0 and the built-ins sit behind them:
    // a host adds a filter because its data needs one, which is usually a sharper question
    // than a generic axis. Overlays trail everything, being a display toggle rather than a
    // way of narrowing the graph.
    activeFilterDefs = [...makeFilterDefs(), ...hostFilterDefs()]
      .filter(f => f.appliesTo(map))
      .map((f, i) => [f, i])
      .sort(([a, ai], [b, bi]) => ((a.order || 0) - (b.order || 0)) || (ai - bi))
      .map(([f]) => f);
    activeFilterDefs.forEach(f => {
      const initial = f.initial();
      const stored = f.persistKey ? store(f.persistKey, initial) : initial;
      filterState[f.id] = matchesShape(stored, initial) ? stored : initial;
      container.appendChild(el('div', 'fhead', f.title));
      f.control(filterState[f.id], container, () => {
        if (f.persistKey) persist(f.persistKey, filterState[f.id]);
        applyFilters();
      });
    });
    // The two VIEW preferences (inline notes, edge labels) are not filters — they never dim
    // anything — so they live in the settings menu, and the rail stays purely about scope.
    applyViewPrefs();
  }

  /* ---------- view preferences (owned by the settings menu) ---------- */
  function readPref(name) {
    try { return localStorage.getItem(prefix + name) !== '0'; } catch { return true; }
  }
  function writePref(name, on) {
    try { localStorage.setItem(prefix + name, on ? '1' : '0'); } catch { /* private mode */ }
  }
  // perf mode is tri-state: unset means auto, so the frame sampler is free to switch it
  // on mid-session. An explicit choice pins it and takes the sampler out of the loop.
  function perfPref() {
    try { return localStorage.getItem(prefix + 'perf') || 'auto'; } catch { return 'auto'; }
  }
  function togglePerfMode() {
    const on = !root.classList.contains('lowfx');
    try { localStorage.setItem(prefix + 'perf', on ? 'on' : 'off'); } catch { /* private mode */ }
    root.classList.toggle('lowfx', on);
  }
  function applyViewPrefs() {
    root.classList.toggle('hidenotes', !readPref('notes-on-cards'));
    root.classList.toggle('hidelabels', !readPref('edge-labels'));
    if (perfPref() === 'on') root.classList.add('lowfx');
  }
  function toggleNotesOnCards() {
    const on = !readPref('notes-on-cards');
    writePref('notes-on-cards', on);
    root.classList.toggle('hidenotes', !on);
    views.forEach(v => { v.h = v.el.offsetHeight; });   // note rows change card heights
    reconcile(trail[trail.length - 1] || model.rootId);
  }
  function toggleEdgeTags() {
    const on = !readPref('edge-labels');
    writePref('edge-labels', on);
    root.classList.toggle('hidelabels', !on);
  }

  // A host that supplies its own filter UI dims through this instead of the built-in dock:
  // it passes the def ids that are OUT, and keeps every rule about what "out" means.
  let hostDimmed = null;

  function applyFilters() {
    const active = activeFilterDefs.filter(f => filterState[f.id] && f.isActive(filterState[f.id]));
    // the dock is collapsed by default, so the button has to say whether anything is on
    $('filterdot').hidden = active.length === 0 && !(hostDimmed && hostDimmed.size);
    views.forEach(v => {
      const dim = (hostDimmed ? hostDimmed.has(v.defId) : false)
        || active.some(f => f.dims(v.def, filterState[f.id]));
      v.el.classList.toggle('fdim', dim);
      v._fdim = dim;
    });
    edgeRecs.forEach(rec => {
      rec.el.classList.toggle('fdim', !!(rec.pv._fdim || rec.cv._fdim));
    });
    relayerEdges();                   // tags mirror their edge's dim state
  }

  /* ---------- search ---------- */

  let hot = 0, results = [];

  function renderResults() {
    const box = $('results');
    box.hidden = results.length === 0;
    box.innerHTML = '';
    results.forEach((r, i) => {
      const row = el('div', 'result' + (i === hot ? ' hot' : ''));
      row.appendChild(el('span', null, r.label));
      // a hit on the user's own note is worth naming: otherwise the row looks unrelated
      // to what they typed and reads as a bad result
      if (r.via === 'note') row.appendChild(el('span', 'rvia', 'note'));
      row.appendChild(el('span', 'rg', r.group));
      row.addEventListener('mousedown', e => { e.preventDefault(); pickResult(i); });
      box.appendChild(row);
    });
  }

  function pickResult(i) {
    const r = results[i];
    if (!r) return;
    $('results').hidden = true;
    $('search').blur();
    revealDef(r.id);
  }

  // expand the ancestry so the def's canonical key renders, select it, centre it
  function revealDef(defId) {
    const lineage = keyLineage(model, defId);
    lineage.slice(0, -1).forEach(k => expandedKeys.add(k));
    views.forEach(setToggle);
    trail = [defId];
    reconcile(model.rootId);
    const v = views.get(defId);
    if (v) centerOnNode(v);
  }

  $('search').addEventListener('input', e => {
    results = searchMap(searchIndex, e.target.value);
    hot = 0;
    renderResults();
  });
  $('search').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { hot = Math.min(hot + 1, results.length - 1); renderResults(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { hot = Math.max(hot - 1, 0); renderResults(); e.preventDefault(); }
    else if (e.key === 'Enter') pickResult(hot);
    else if (e.key === 'Escape') { $('results').hidden = true; e.target.blur(); closeSearch(); }
  });
  $('search').addEventListener('blur', () => setTimeout(() => { $('results').hidden = true; }, 150));

  /* ---------- deep links: the address bar tracks the live state ---------- */

  let urlTimer = 0, urlEpoch = 0;

  function stateForToken() {
    return { m: map.id, o: [...expandedKeys], t: trail, u: seedUnroll || [] };
  }

  // a state worth nothing encodes to '' — drop the hash rather than park a token that
  // says nothing, so a freshly reset view has a clean shareable URL
  const hashFor = token => (token ? '#s=' + token : location.pathname + location.search);

  // Which selection the last history ENTRY was written for. Expanding, panning and
  // filtering rewrite the current entry; arriving somewhere new pushes one, so Back walks
  // the route you clicked rather than every intermediate state.
  let urlMark = null;
  let restoring = false;

  function syncUrl(push) {
    clearTimeout(urlTimer);
    const mark = map.id + '|' + (trail[trail.length - 1] || '');
    // `restoring` is read HERE, not in the timer: by the time the debounce fires the
    // restore has finished, and a push would bury the entry the user just navigated to.
    const shouldPush = !restoring
      && (push === true || (push !== false && urlMark !== null && mark !== urlMark));
    urlMark = mark;
    urlTimer = setTimeout(async () => {
      const epoch = ++urlEpoch;
      const token = await encodeToken(stateForToken());
      if (epoch !== urlEpoch || !deepLink) return;
      const url = hashFor(token);
      if (shouldPush) history.pushState(null, '', url);
      else history.replaceState(null, '', url);
    }, 250);
  }

  // Back/Forward, and pasting a link into an already-open tab. Both land here; neither may
  // write history back, or the entry the user just left is immediately overwritten.
  async function restoreFromUrl() {
    if (!deepLink || restoring) return;
    const hash = location.hash.replace(/^#/, '');
    const token = hash.startsWith('s=') ? hash.slice(2) : hash;
    const st = token ? await decodeToken(token) : null;
    restoring = true;
    try {
      loadMap((st && st.m) || map.id, st);
      urlMark = map.id + '|' + (trail[trail.length - 1] || '');
    } finally {
      restoring = false;
    }
  }
  if (deepLink) {
    on(window, 'popstate', restoreFromUrl);
    on(window, 'hashchange', restoreFromUrl);
  }


  async function copyLink() {
    const token = await encodeToken(stateForToken());
    if (deepLink) history.replaceState(null, '', hashFor(token));
    try { await navigator.clipboard.writeText(shareUrl(token)); } catch { /* denied */ }
  }

  // absolute and self-contained: the copied link must work from another machine, which
  // location.href does not guarantee while the hash is still being written
  function shareUrl(token) {
    const base = location.origin + location.pathname + location.search;
    return token ? base + '#s=' + token : base;
  }

  /* ---------- toolbar, theme & keyboard ---------- */

  function setTheme(t) {
    root.dataset.theme = t;
    $('theme').textContent = t === 'light' ? '☀' : '☾';
    if (prefix) { try { localStorage.setItem(prefix + 'theme', t); } catch { /* fine */ } }
  }

  $('theme').addEventListener('click', () => {
    setTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
  });
  $('focus').addEventListener('click', () => {
    focusOn = !focusOn;
    $('focus').classList.toggle('on', focusOn);
    const sel = trail[trail.length - 1] || trailMemory[trailMemory.length - 1];
    if (focusOn && sel) {                 // the slice needs the ancestry open
      keyLineageKeys(model, sel).forEach(k => expandedKeys.add(k));
      expandedKeys.add(sel);
      views.forEach(setToggle);
    }
    reconcile(sel || model.rootId);
  });
  /* ---------- settings menu ----------
     One gear rather than a row of flat buttons: the bar stays quiet and the toggles that
     change how the graph READS live together. Every row delegates to the hidden anchor
     button that already owns the behaviour, so there is one implementation of each mode. */
  // 15px stroke glyphs, drawn on a 24 grid so they share the weight of the header icons
  const SICONS = {
    theme: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    focus: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    notes: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    labels: '<path d="M20.6 13.4 12 4.8H4.8V12l8.6 8.6a1.7 1.7 0 0 0 2.4 0l4.8-4.8a1.7 1.7 0 0 0 0-2.4Z"/><circle cx="8.2" cy="8.2" r="1.1"/>',
    perf: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  };
  function settingsRow(label, hint, on, onClick, icon) {
    const b = el('button', 'srow');
    b.type = 'button';
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(!!on));
    b.innerHTML = '<span class="sicon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" '
      + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
      + (SICONS[icon] || '') + '</svg></span>'
      + '<span class="stext"><span class="slabel"></span>'
      + (hint ? '<span class="shint"></span>' : '') + '</span>'
      + '<span class="sswitch" aria-hidden="true"><i></i></span>';
    b.querySelector('.slabel').textContent = label;
    if (hint) b.querySelector('.shint').textContent = hint;
    if (on) b.classList.add('on');
    b.addEventListener('click', () => { onClick(); renderSettings(); });
    return b;
  }
  function renderSettings() {
    const box = $('settings');
    box.innerHTML = '';
    const head = el('div', 'shead', 'Settings');
    box.appendChild(head);
    if (features.theme) box.appendChild(settingsRow(
      'Light mode', 'Dark is the default surface',
      root.dataset.theme === 'light', () => $('theme').click(), 'theme'));
    if (features.focus) box.appendChild(settingsRow(
      'Focus mode', 'Collapse unrelated branches around the selected node',
      focusOn, () => $('focus').click(), 'focus'));
    if (features.notes) box.appendChild(settingsRow(
      'Notes on cards', 'Off: open a note from the card menu',
      !root.classList.contains('hidenotes'), () => toggleNotesOnCards(), 'notes'));
    if (features.edgeTags) box.appendChild(settingsRow(
      'Edge labels', 'Name the relationship on each connector',
      !root.classList.contains('hidelabels'), () => toggleEdgeTags(), 'labels'));
    box.appendChild(settingsRow(
      'Performance mode', 'Drop shadows and the grid on slow machines',
      root.classList.contains('lowfx'), () => togglePerfMode(), 'perf'));
    // Build stamp: how current the content is, and the exact commit, so a report filed
    // from here is reproducible. Deliberately quiet.
    const build = options.build || {};
    if (build.date || build.hash) {
      const stamp = el('div', 'sstamp');
      if (build.date) stamp.appendChild(document.createTextNode('updated ' + build.date));
      if (build.hash) {
        if (build.date) stamp.appendChild(document.createTextNode(' · '));
        const commit = repoUrl && safeUrl(repoUrl.replace(/\/$/, '') + '/commit/' + build.hash);
        if (commit) {
          const a = el('a', null, build.hash);
          a.href = commit;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          stamp.appendChild(a);
        } else {
          stamp.appendChild(el('span', 'shash', build.hash));
        }
      }
      box.appendChild(stamp);
    }
  }
  function closeSettings() {
    $('settings').hidden = true;
    $('gear').setAttribute('aria-expanded', 'false');
  }
  // The search field only collapses in narrow layouts; on a wide bar it is always open,
  // so these are no-ops there beyond moving focus.
  function openSearch() {
    root.classList.add('searchopen');
    $('searchbtn').setAttribute('aria-expanded', 'true');
    $('search').focus();
  }
  function closeSearch() {
    root.classList.remove('searchopen');
    $('searchbtn').setAttribute('aria-expanded', 'false');
    $('results').hidden = true;
  }
  $('searchbtn').addEventListener('click', e => {
    e.stopPropagation();
    if (root.classList.contains('searchopen')) closeSearch();
    else openSearch();
  });
  on(window, 'pointerdown', e => {
    if (root.classList.contains('searchopen') && !e.target.closest('.fg-searchbox')
      && !e.target.closest('[data-el="searchbtn"]')) closeSearch();
  });

  /* ---------- panel peek (narrow layouts) ---------- */

  // On a narrow screen the panel is a bottom sheet. It opens as a one-line peek so the
  // card you just tapped stays visible; expanding is a deliberate second tap. The state
  // is kept across selections, so picking a next step does not re-collapse what you opened.
  let peekExpanded = false;
  function setPeek(expanded) {
    peekExpanded = expanded;
    $('panel').classList.toggle('peek', !expanded);
    $('peektoggle').setAttribute('aria-expanded', String(expanded));
    $('peektoggle').setAttribute('aria-label', expanded ? 'Collapse details' : 'Expand details');
  }
  $('peektoggle').addEventListener('click', e => { e.stopPropagation(); setPeek(!peekExpanded); });
  // tap the collapsed bar to open; tap the grab handle to put it away again
  $('panelhead').addEventListener('click', () => { if (!peekExpanded) setPeek(true); });

  // Drag the handle and the sheet follows the finger, then snaps: past a quarter of the
  // travel it goes to the peek, otherwise it springs back open. `transform` carries the
  // drag while `top` carries the snap, and both transition together on release, so the
  // sheet continues from exactly where the finger left it instead of jumping.
  let grabY = null, grabDy = 0;
  const SNAP_AT = 0.25;
  $('grab').addEventListener('pointerdown', e => {
    if (!peekExpanded) return;
    grabY = e.clientY;
    grabDy = 0;
    $('panel').classList.add('dragging');
    $('grab').setPointerCapture(e.pointerId);
  });
  $('grab').addEventListener('pointermove', e => {
    if (grabY === null) return;
    grabDy = Math.max(0, e.clientY - grabY);
    $('panel').style.transform = 'translateY(' + grabDy + 'px)';
  });
  const endGrab = () => {
    if (grabY === null) return;
    const travel = Math.max(1, root.clientHeight - 67 - 58);
    grabY = null;
    $('panel').classList.remove('dragging');
    $('panel').style.transform = '';
    // a tap counts as a collapse too; anything shorter than the snap springs back
    if (grabDy < 5 || grabDy > travel * SNAP_AT) setPeek(false);
  };
  $('grab').addEventListener('pointerup', endGrab);
  $('grab').addEventListener('pointercancel', endGrab);

  /* ---------- zoom controls ---------- */

  function zoomBy(mult) {
    const r = viewport.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const s2 = Math.min(2.2, Math.max(0.3, view.s * mult));
    // keep whatever sits under the middle of the viewport pinned there
    view.x = cx - (cx - view.x) * (s2 / view.s);
    view.y = cy - (cy - view.y) * (s2 / view.s);
    view.s = s2;
    world.classList.add('glide');
    apply();
  }
  $('zoomin').addEventListener('click', () => zoomBy(1.25));
  $('zoomout').addEventListener('click', () => zoomBy(1 / 1.25));
  $('zoomfit').addEventListener('click', () => $('fit').click());

  /* ---------- filter dock ---------- */

  function closeFilters() {
    $('filters').hidden = true;
    $('filterbtn').setAttribute('aria-expanded', 'false');
  }
  // Deliberately no outside-click close: filters are a mode you work under while you keep
  // clicking the graph, so only the button that opened it puts it away.
  $('filtersx').addEventListener('click', closeFilters);
  // On a phone the sheet covers the graph, so a tap outside it means "put it away". On a
  // desktop the panel sits beside the graph and staying open is the point, so it does not.
  on(window, 'pointerdown', e => {
    if (!root.classList.contains('narrow')) return;
    if ($('filters').hidden) return;
    if (e.target.closest('.fg-filters') || e.target.closest('[data-el="filterbtn"]')) return;
    closeFilters();
  });
  $('filterbtn').addEventListener('click', e => {
    e.stopPropagation();
    const box = $('filters');
    if (!box.hidden) return closeFilters();
    box.hidden = false;
    $('filterbtn').setAttribute('aria-expanded', 'true');
  });

  $('gear').addEventListener('click', e => {
    e.stopPropagation();
    const box = $('settings');
    if (!box.hidden) return closeSettings();
    renderSettings();
    // line the menu's right edge up with the gear's, whatever follows it in the bar
    const g = $('gear').getBoundingClientRect(), r = root.getBoundingClientRect();
    box.style.right = Math.max(8, Math.round(r.right - g.right)) + 'px';
    box.style.top = Math.round(g.bottom - r.top + 8) + 'px';
    box.hidden = false;
    $('gear').setAttribute('aria-expanded', 'true');
  });
  on(window, 'pointerdown', e => {
    if (!$('settings').hidden && !e.target.closest('.fg-settings') && !e.target.closest('[data-el="gear"]')) closeSettings();
  });

  $('isolate').addEventListener('click', () => setIsolate(!isolateOn));
  $('isoexit').addEventListener('click', () => setIsolate(false));
  $('share').addEventListener('click', copyLink);
  $('fit').addEventListener('click', () => frameBounds(bboxOf([...views.values()])));
  $('reset').addEventListener('click', () => {
    trail = [];
    trailMemory = [];
    if (isolateOn) setIsolate(false);
    // whatever a cold start shows, reset shows: with expandRoot:false that is the entry
    // point alone, not the root already fanned out
    expandedKeys = new Set(options.expandRoot === false ? [] : [model.rootId]);
    views.forEach(setToggle);
    reconcile(model.rootId);
    const v = initialView();
    glideTo(v.x, v.y, v.s);
  });

  function buildSwitcher() {
    const seg = $('maps'), sel = $('mapsel');
    maps.forEach(m => {
      const b = el('button', null, m.name);
      b.dataset.map = m.id;
      b.addEventListener('click', () => switchMap(m.id));
      seg.appendChild(b);
      const o = el('option', null, m.name);
      o.value = m.id;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => switchMap(sel.value));
  }

  function switchMap(id) {
    if (id === map.id) return;
    loadMap(id, null);
    syncUrl(true);
  }

  if (features.keyboard) on(window, 'keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === '/') { e.preventDefault(); openSearch(); }
    else if (e.key === 'Escape') {
      if (root.classList.contains('searchopen')) closeSearch();
      else if (!$('menu').hidden || !$('notepop').hidden) closePops();
      else if (panelKey && panelKey.startsWith('edge:')) closePanel();
      else if (isolateOn) setIsolate(false);
      else if (trail.length) { trail = []; refreshRoute(false); }
      else if (!$('panel').hidden) closePanel();
    }
  });
  on(window, 'pointerdown', e => {
    if (!e.target.closest('.pop') && !root.contains(e.target)) closePops();
  });

  /* ---------- boot ---------- */

  // deferred one microtask so `api` (declared below) exists by the time boot
  // finishes and hands it to onReady
  Promise.resolve().then(async function boot() {
    // Dark is THE surface this is designed on; light is opt-in and only ever reached by an
    // explicit choice (the host passing `theme`, or the user having toggled it before).
    // Deliberately not following the OS: most machines report light, which would land the
    // majority on the secondary treatment.
    setTheme(options.theme || store('theme', null) || 'dark');
    buildSwitcher();
    // `#s=<token>` is what we write; a readable `#map=…&open=…` hash is accepted too, so
    // a hand-written or older link still restores instead of silently opening the default
    const hash = deepLink ? location.hash.replace(/^#/, '') : '';
    const token = hash.startsWith('s=') ? hash.slice(2) : hash;
    const st = token ? await decodeToken(token) : null;
    loadMap((st && st.m) || options.startMap || maps[0].id, st);
    emit('onReady', api);
  }).catch(err => console.error('GraphView boot failed:', err));

  /* ---------- public API ---------- */

  const api = {
    root,
    get map() { return map; },
    get model() { return model; },
    get route() { return route.slice(); },
    get selection() { return route[route.length - 1] || null; },
    get expanded() { return [...expandedKeys]; },
    select(key) { revealDef(key); return api; },
    expand(key) { if (!expandedKeys.has(key)) toggleKey(key); return api; },
    collapse(key) { if (expandedKeys.has(key)) toggleKey(key); return api; },
    clearSelection() { trail = []; refreshRoute(false); return api; },
    setMap(id, state) { loadMap(id, state || null); return api; },
    setTheme(t) { setTheme(t); return api; },
    setFocus(v) { if (!!v !== focusOn) $('focus').click(); return api; },
    setIsolate(v) { setIsolate(!!v); return api; },
    /** Dim these def ids; pass null to clear. For hosts that own their own filter UI. */
    setDimmed(ids) {
      hostDimmed = ids ? new Set(ids) : null;
      applyFilters();
      return api;
    },
    fit() { frameBounds(bboxOf([...views.values()])); return api; },
    reset() { $('reset').click(); return api; },
    shareToken() { return encodeToken(stateForToken()); },
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(urlTimer); clearTimeout(glideTimer); clearTimeout(longPressTimer);
      if (ro) ro.disconnect();
      if (colorProbe) { colorProbe.remove(); colorProbe = null; }   // it lives on <body>
      bound.forEach(([t, type, fn, o]) => t.removeEventListener(type, fn, o));
      root.classList.remove('fg', 'narrow', 'focused', 'tracing', 'iso', 'lowfx',
        'hidenotes', 'hidelabels');
      root.innerHTML = '';
    },
  };
  return api;
}

return { mount, version: '1.0.0' };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GraphView;
// Also publish explicitly. As a classic <script> the binding above is reachable by name
// through script scope, but an ESM host importing this file for its side effect has no
// such scope — it needs somewhere to read the result from.
if (typeof globalThis !== 'undefined') globalThis.GraphView = GraphView;
