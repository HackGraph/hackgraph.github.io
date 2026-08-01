# Fan-Out Graph

An embeddable engine for exploring a directed graph of steps: progressive disclosure,
multi-parent DAGs, cycles unrolled forward, click-trail path tracing, focus and isolate
modes, search, filters, notes, deep links. No dependencies, no build step.

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

A **node** is `{ id, label, group, summary?, kind }` where `kind` is
`step | category | start | goal`. Anything else you attach is passed through untouched
and rendered in the detail panel:

```js
{
  id: 'verify', label: 'Verify Artifact', group: 'Plan', kind: 'step',
  summary: 'One line, shown on the card.',
  env: 'staging', role: 'maintainer',          // optional: drive the built-in filters
  details: {
    description: 'Long text for the panel.',
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

A relationship's `label` is its name in the detail panel and the caption drawn on the
edge itself. Add `tag: false` to keep the name and the explanation but leave the canvas
clean, for steps that need no caption to be understood.

A relationship may also carry `details`, in the same shape a node's does — `prereqs`,
`tools`, `commands`, `caution`, `refs` — and the edge panel renders them with the same
sections. `prereqsLabel` renames that heading, which on an edge usually reads better as
"Applies when" than "Prerequisites".

Cycles are allowed and encouraged — a feedback edge is unrolled into a forward
instance badged `#2`, so every arrow still points right.

## Options

```js
GraphView.mount(container, {
  maps,                  // required — array of maps (or set globalThis.MAPS)
  startMap: 'pipeline',  // which map opens
  title: 'My Graph',     // toolbar label
  theme: 'dark' | 'light',            // default: follows the OS
  animationMs: 470,
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
view.fit() / view.reset()
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

```js
const E = require('./engine.js');
const model = E.buildModel(myMap);
const { vg, backEdges } = E.resolveVisible(model, new Set(['root', 'build']));
E.activeRoute(vg, 'root', ['build', 'deploy'], backEdges);   // the lit path
E.searchMap(E.buildSearchIndex(model), 'deploy');
```

## Development

```
node layout-test.mjs   # engine: 80 checks (visibility, unrolling, paths, layout, search, tokens)
node view-test.mjs     # view: mounts in jsdom, drives clicks, checks two instances + destroy
node build.mjs         # dist/index.html + one self-contained page per map
node server.mjs        # dev server on :3001, no-cache
```

Both test suites also run from the host repo's `npm test`, so a change here is checked
by the same command that checks the app around it. `view-test.mjs` resolves jsdom from
whatever `node_modules` is in scope and skips rather than fails when there is none, so a
bare checkout of this directory still passes.

## Living here, releasable elsewhere

This directory is a whole project: source, tests, spec, demo and licence. It is checked
into HackGraph because that is the only thing using it today, and a copy kept in step by
hand had already lost edits in both directions. It is not HackGraph code.

Nothing under `engine/` may reference security, techniques or phases — the host converts
its data at the boundary (`src/graph/engineAdapter.ts`) and the engine never learns what
the graph is about. That rule is the whole reason this can be lifted out later.

To release it standalone, what is missing is packaging, not disentangling: a
`package.json` with a name and entry points, and a decision about whether the demo
(`index.html`, `data.js`, `server.mjs`, `build.mjs`) ships with the library or beside it.
The code itself already depends on nothing but the platform.

Two invariants the code protects deliberately — breaking either causes bugs that look
like layout randomness:

- **One animation clock.** Cards, edges and edge waypoints interpolate in a single rAF
  tick with edge geometry recomputed inside it. Animating any of them on a separate
  clock — including a CSS transition of "the same" duration — lets edges arrive before
  the cards they connect.
- **Synchronous measurement.** Card heights are read immediately after creation and
  before animating. Measuring asynchronously produces a guess-then-correct jump.
