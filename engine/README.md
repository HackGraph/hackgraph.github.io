# Fan-Out Graph

An embeddable engine for exploring a directed graph of steps: progressive disclosure,
multi-parent DAGs, cycles unrolled forward, click-trail path tracing, focus and isolate
modes, search, filters, notes, deep links. No runtime dependencies; development tests use the host repository’s pinned tools.

The engine knows nothing about your data. Swap the map, swap the product.

```
engine.js   pure graph math — model, visibility, unrolling, layout, paths, search. No DOM.
data.js     the maps. This is the file you replace.
view.js     the renderer — mounts into any element, multiple instances per page.
style.css   all styling, scoped under .fg
```

## Quick start

```html
<link rel="stylesheet" href="style.css">
<div id="graph" style="height: 100vh"></div>

<script src="engine.js"></script>
<script src="my-data.js"></script>   <!-- defines MAPS -->
<script src="view.js"></script>
<script>
  const view = GraphView.mount('#graph', { maps: MAPS });
</script>
```

That is the whole integration. The container can be any size; the UI lays itself out
inside it and switches to a narrow layout (bottom-docked detail panel, collapsed map
switcher) when the *container* — not the window — gets small.

## The data contract

A **node** is `{ id, label, group, summary?, aliases?, kind }` where `kind` is
`step | category | start | goal`. The detail panel renders the documented `details` fields:

```js
{
  id: 'verify', label: 'Verify Artifact', group: 'Plan', kind: 'step',
  summary: 'One line, shown on the card.',
  env: 'staging', role: 'maintainer',          // optional: drive the built-in filters
  details: {
    description: 'Long text for the panel.',
    applicability: 'Optional author-supplied context.',
    editorial: [{ label: 'Review status', text: 'Host-supplied evidence context.' }],
    prereqs: ['build'],                        // node ids — rendered as jump chips
    tools: ['ci-runner'],
    commands: ['ci verify --artifact $SHA'],   // each gets a copy button
    refs: [['Policy', 'https://example.com']],
    caution: 'Shown as a warning callout.',
  },
}
```

An **edge** is `{ source, target, rel? }`. The `rel` resolves against the map's
relationship table into the tag drawn on the edge and the text in its panel:

```js
{
  id: 'pipeline', name: 'Release Pipeline', rootId: 'root',
  phases: [{ id: 'plan', label: 'Plan', color: '#4f9cf9' }, ...],  // label ↔ card colour
  nodes: [...],
  edges: [{ source: 'root', target: 'verify', rel: 'then' }],
  relationships: { then: { label: 'then', summary: 'The natural next step.' } },
}
const MAPS = [myMap];   // the registry the view reads
```

`label` is the caption drawn on the edge and its heading in the panel; `tag: false`
keeps the heading and drops the caption. Captions also yield when they would overlap another caption or a card; connection details retain the full explanation. Inspecting a connection gives its caption priority.

A relationship may also carry `details` in the same shape a node's does, rendered with
the same panel sections. `prereqsLabel` renames that heading — on an edge, usually to
"Applies when".

Cycles are allowed and encouraged — a feedback edge is unrolled into a forward
instance badged `#2`, so every arrow still points right.

## Options

```js
GraphView.mount(container, {
  maps,                  // required — array of maps (or set globalThis.MAPS)
  startMap: 'pipeline',  // which map opens
  title: 'My Graph',     // toolbar label
  theme: 'dark' | 'light',            // default: dark (saved preference wins)
  animationMs: 360,
  readingUrl: '/reference.html',     // optional host reading view
  intro: { title: 'Explore the course', body: 'Choose a topic to begin.' },
  storagePrefix: 'fg:',  // notes/marks/prefs namespace; '' disables persistence
  deepLink: true,        // read and write the URL hash
  chrome:   { toolbar, filters, panel, crumbs, hint },              // all true
  features: { search, focus, isolate, share, theme, notes, marks,
              edgeTags, contextMenu, keyboard },                    // all true
  onReady(view) {}, onSelect({ key, defId, node, route }) {},
  onEdgeSelect({ id, rel, source, target }) {}, onRouteChange({ route, trail }) {},
});
```

Callbacks also fire as DOM events on the container: `fgselect`, `fgedgeselect`,
`fgroutechange`, `fgready` (payload in `event.detail`).

## Instance API

```js
view.select('node-id')      // reveal ancestry, select, centre
view.expand(key) / view.collapse(key)
view.clearSelection()
view.setMap(id) / view.setTheme('light') / view.setFocus(true) / view.setIsolate(true)
view.fit()                 // deliberate overview, with Return to reading
view.reset()               // return to initial reading state
await view.shareToken()     // the compressed state token
view.route                  // current lit path (render keys)
view.selection              // current selection key, or null
view.map / view.model       // the loaded map and its runtime model
view.destroy()              // remove listeners and empty the container
```

## Interaction model

| gesture | effect |
|---|---|
| click a card | select it; the path from the root follows **the order you clicked** |
| click the count pill | expand (also counts as visiting the node) |
| click an edge or its tag | select the destination and open the relationship panel |
| click empty canvas | deselect — the path is remembered and resumes on the next click |
| hover | preview a single route (the recorded one if there is one) |
| right-click / long-press | context menu: expand, mark, not-applicable, note, copy link |
| Tab, Right / Left | enter the graph, expand and visit a child / visit a parent |
| Up / Down, Home / End | nearby topic in this column, root / last peer |
| Space / Enter | expand or collapse / open details |
| `/` | search · `Esc` closes the panel, isolate, then the selection |

**Focus** collapses the view to the path plus the selection's next steps — ancestors
render one node per column, siblings hidden. **Isolate** draws only the lit path,
straightened, and restores the previous layout exactly on exit.

## Filters

Filters dim, never hide, and are pluggable — a filter declares whether it applies to a
map, its own state, a `dims(node, state)` predicate and its own control. Built in:
phase, environment, role, marked-only. An Environment filter never appears on a map
whose nodes declare no environments.

## Using the engine alone

`engine.js` is pure and DOM-free, so it also runs in Node — for tests, static
generation, or answering path questions server-side:

It is a classic script, not a module: evaluating it publishes `GraphEngine` on the
global. Import it for the side effect and read the global back.

```js
await import('./engine.js');
const E = globalThis.GraphEngine;
const model = E.buildModel(myMap);
const { vg, backEdges } = E.resolveVisible(model, new Set(['root', 'build']));
E.activeRoute(vg, 'root', ['build', 'deploy'], backEdges);   // the lit path
E.searchMap(E.buildSearchIndex(model), 'deploy');
```

`require('./engine.js')` returns an empty namespace under an ESM `package.json`, which
is what this repo has.

## Development

```
node layout-test.mjs   # engine: 80 checks (visibility, unrolling, paths, layout, search, tokens)
node view-test.mjs     # view: mounts in jsdom, drives clicks, checks two instances + destroy
node build.mjs         # dist/index.html + one self-contained page per map
node server.mjs        # dev server on :3001, no-cache
```

Both suites run from the host repo's `npm run test:unit`. The jsdom dependency is mandatory. `npm test` also runs Chromium, Firefox and WebKit, including keyboard, touch-event, persistence, camera, accessibility and staged-build checks.

The engine is checked into HackGraph because that is the only thing using it, and stays
generic: nothing here references the host's subject matter. Publishing it separately
would require its own packaging and support contract; the browser runtime has no package imports.

Two invariants the code protects deliberately — breaking either causes bugs that look
like layout randomness:

- **One animation clock.** Cards, edges and edge waypoints interpolate in a single rAF
  tick with edge geometry recomputed inside it. Animating any of them on a separate
  clock — including a CSS transition of "the same" duration — lets edges arrive before
  the cards they connect.
- **Synchronous measurement.** Card heights and caption dimensions are read together
  after their DOM batch is assembled, before layout or entrance effects begin.
  Measuring asynchronously produces a guess-then-correct jump.

## Reading, motion, and layout contracts

Ordinary expansion preserves at least 0.9× scale with 14 px titles. Large branches get a screen-space choice list. Overview can fit farther out and suppresses detail; its Return to reading action restores a readable camera. Wheel/pinch gestures can zoom manually.

The displayed camera coordinates are authoritative. Layout and camera geometry share one requestAnimationFrame loop, and interrupting motion starts from the current image. Layout defaults to 360 ms, camera moves cap at 360 ms, and entrance stagger caps at 100 ms. A live reduced-motion change settles active motion. Card measurement is batched after fonts are ready.

Fixed shell anchors are cached per mount. Expansion reads its container dimensions before updating the graph and panel, then uses them to follow the branch. The first rendering frame allocates opacity effects only for visible entrances. A branch canceled before that frame is removed without an exit animation; offscreen exits are also removed immediately. `npm run render:expansion` measures generic 25/100/250-child expansions against the local server, with an optional saved renderer for comparison. See `reports/EXPANSION_RENDERING_REVIEW.md` for the paired observations and limits.

The sidebar's connected-topic rows are built on first disclosure, rather than during selection or expansion. Closing the section makes its rows inert; reopening reuses them. Replacing the selected panel discards its rows. Icons are DOM clones and dataset text stays in text nodes. This avoids constructing a second detailed list for a reader who only uses the graph or branch chooser. `reports/LARGE_EXPANSION_REVIEW.md` records expansion and disclosure costs separately.

The floating topic chooser measures the available space around its expansion card and fixed controls when opened or when the container resizes. Short landscape windows can reduce its scroll area while retaining a complete choice row. Resize updates reuse its buttons and keep the focused choice in view. Keyboard focus entering a graph card closes Help and Settings, matching pointer dismissal; mobile filters also close while desktop filters remain persistent. The measurements run outside the animation loop. `reports/OVERLAY_REVIEW.md` records the geometry regressions and added setup cost.

The disclosure animates the outer container's measured height for 220 ms while the inner rows keep their natural height. A ResizeObserver updates that measurement after wrapping or text-size changes. The panel owns and disconnects this observer on close, replacement, map change, and destroy. Browsers without ResizeObserver use automatic height with an immediate size change. `reports/SIDEBAR_MOTION_REVIEW.md` records the measured reduction in repeated layout and the upfront measurement cost. `tools/sidebar-lab.mjs` accepts both `--baseline` and `--baseline-css` to compare complete renderer/style pairs.

Offscreen cards and edges are culled, unchanged attributes are not rewritten, and labels use known routing coordinates rather than SVG geometry queries. Label dimensions are measured after creation and cached, including when labels are first enabled after being created hidden. A spatial grid selects non-overlapping captions in the visible area with overscan; there are no label-size reads during motion. During entrance, offscreen destinations do not paint a stack at the parent. On expansion, established coordinates receive positional priority over fresh items. Necessary movement propagates through known neighbors with 0.75 stability weighting; new fan-outs cannot pull the existing diagram toward their centers. Peer ordering and authored single-parent sibling order are constrained, with an authored-order fallback for conflicting history. Collapse compacts released space while retaining compatible peer order. Connector lanes use a first-hop crossing score. These features reduce movement in the measured corpus at the cost of somewhat taller expansion layouts and more crossings; they are not a guarantee of globally optimal layout. See `reports/LAYOUT_DECISION.md` for the measured ELK comparison and its limits.

The host may provide `details.editorial`, `details.editorialTitle`, `details.claims`, and reference tuples `[label, url, kind?, section?]`. The engine displays these fields without interpreting their subject matter. The host owns review validation and content accuracy.

Each claim has `text`, `section`, and a `sources` array of URLs. The panel separates its text, source section, and citation links. Link labels come from the current entry's `details.refs`; an unlabeled valid URL is displayed as its URL. Shared-definition references do not supply those labels. Claim text and labels remain text nodes, and the existing protocol check applies to destinations. Long values wrap, and links retain visible keyboard focus. The reading-page generator follows the same presentation; `reports/CITATION_PRESENTATION.md` records the verification scope.

`details.definitions` holds shared vocabulary separately from an entry's claims. Each item supplies `id`, `label`, `description`, optional `review: { label, detail, scope }`, `refs`, and `accessNotes`. The definition is visible in its own section; native disclosure controls expose the comparison scope and sources with keyboard support. These records never become the entry's review or references automatically. Reference labels and source sections are rendered as text, and URLs pass the same protocol checks as other links.

The pure `assignCoords` API accepts `{ stability, incremental }`; ordinary callers retain the original packing behavior unless incremental placement is requested. `blockResolve` optionally accepts nonnegative positional weights, including zero for fresh items. `orderColumns` accepts an optional `{ incremental: true }` to preserve compatible peer history (`previousCy`, `previousRank`). The renderer chooses expansion versus collapse behavior based on added and removed cards/connections. `orderTrunks` operates on generic `{ y, targets }` fan geometry and returns a new lane order without mutating its inputs.
