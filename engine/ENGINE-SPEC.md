# Graph engine — feature spec and gap list

A domain-agnostic engine for exploring a directed graph of steps. The reference dataset is a
**software delivery pipeline**: a change is planned, built, tested, released and operated,
with feedback loops back to earlier steps.

The engine knows nothing about the dataset. A node is `{ id, label, group, summary?, kind }`
where `kind` is `step | category | start | goal`; a map is
`{ id, name, rootId, phases[], nodes[], edges[], relationships{} }`. Swapping the data swaps
the product.

---

## Part 1 — What the engine does today

### Data model
- **Generic contract.** Nodes carry an id, a label, the group (phase) they belong to and a
  one-line summary. Everything richer — tools, commands, references, prerequisites — is
  optional dataset detail the engine passes through without interpreting.
- **Runtime model** built once per map and immutable afterwards. Keeps forward adjacency
  (child order preserved, so layout is deterministic) and reverse adjacency, which is what
  makes multi-parent visibility tractable.
- **Relationship vocabulary.** An edge may name a `rel` (`triggers`, `produces`, `gate`,
  `promotes`, `feedback`) that resolves against a per-map table to a label and a description.

### Visibility
- **Progressive disclosure.** Opens collapsed at the root; expanding a node reveals its
  next steps. The expanded set is the only mutable graph state.
- **Multi-parent DAG.** A node shows when *any* parent is expanded, so converging branches
  behave correctly.
- **Forward loop unrolling.** A feedback edge that lands at or left of its source is a cycle.
  The engine re-instances the target as a fresh forward node so every arrow points right, and
  badges the repeat visits `#2`, `#3`. Resolved by a fixpoint: lay out, mark backward edges,
  lay out again (capped), because "backward" is a property of the layout, not the structure.
- **Bulk reveal** for jumping to a node from search: expand its whole ancestry at once.

### Layout
- Layered left-to-right: rank assignment, column ordering to reduce crossings, then vertical
  packing that keeps sibling groups together and separates unrelated ones.
- **Edge routing zone** between columns with real waypoints, so long edges get reserved
  vertical space instead of crossing cards.
- Card width is fixed; heights are measured from the DOM **synchronously during reconcile,
  before animating** (see the note in Part 3 — this ordering matters).

### Path finding
- Longest forward path between two rendered nodes, skipping backward edges.
- **Click-trail routing:** the lit route is stitched through the waypoints you actually
  clicked, not merely the longest route to the target, so the highlighted path reflects how
  you got there. Clicking an earlier waypoint rewinds; a reachable forward node extends;
  anything else restarts.
- Root-to-node ancestry, for breadcrumbs and for revealing search results.

### Camera
- Pan and zoom, centre-on-node, fit-to-bounds with a zoom cap, and an initial fit.
- Expanding centres on the revealed children.
- Hover is disarmed while the camera glides, so content sliding under a still cursor is not
  mistaken for a hover.

### Animation
- **One rAF loop owns every moving thing** — cards, edges and edge waypoints interpolate in
  the same tick against one clock and one easing, with edges recomputed inside that tick.
  This is the single most important property of the engine; see Part 3.

### Interaction
- Selection with a lit route, isolate mode (lit path only, laid out straight), hover trace
  back to root, context menu, per-node notes and marks, keyboard shortcuts (`/` to search,
  `Escape` to dismiss), and a toolbar (isolate, share, fit, reset).

### Filters
Pluggable and additive: a filter declares whether it applies to a map, its own state, whether
that state constrains anything, a `dims(node, state)` predicate and its own control. Filters
**dim, never hide** — a node dims if any active filter excludes it. The engine never learns
what a filter means. Natural fits for the pipeline dataset: **Environment**
(development / staging / production) and **Role** (anyone / contributor / maintainer / admin).

### Search
Tiered index built once per map: label and summary weighted above deep fields, prefix and
word-boundary bonuses, keyboard navigable. Picking a result reveals the path to it.

### Sharing and persistence
View state (map, expanded set, selection, trail) compressed into an opaque URL token; notes,
marks and preferences in local storage.

---

## Part 2 — What is missing

This section used to list twelve gaps: no detail panel, no edge selection, one map, no
focus mode, no light theme, no breadcrumbs, no static generation, and so on. All twelve
were built. It stayed here describing an engine that no longer existed, which is worse
than having no gap list at all, so here is the real one.

**Keyboard navigation.** Every affordance is pointer-driven. Arrow-key movement between
siblings and along the route, and Enter to expand, would make the graph usable without a
mouse. Deliberately deferred, not overlooked.

**Node ids may not contain `~`, `|` or `->`.** `buildModel` throws on them rather than
escaping, because those characters separate the parts of a render key. Fine for every
dataset so far; a dataset that needs them would need the key scheme to escape instead.

**View state lives in the URL or nowhere.** Notes and marks persist to localStorage, but
camera, expansion and route only survive via a share link. There is no "resume where I
was" on reload.

**Export.** No way to take a slice out as an image or a document.

## Part 3 — Two properties worth protecting

**One animation clock.** Cards, edges and waypoints all interpolate inside a single rAF tick,
with edge geometry recomputed in that same tick. This makes a whole class of bug impossible:
edges cannot arrive at their destination while the cards they connect are still travelling.
Any future change that animates the camera, the cards or the edges on a *separate* clock —
including a CSS transition running "the same" duration — reintroduces it, because two curves
of equal duration still disagree at every point in between.

**Synchronous measurement.** Heights are read during reconcile, immediately after the element
is created and before the animation starts. Measuring asynchronously instead (an observer, an
effect) produces a measure → relayout → correct cycle, where the first layout is a guess and
everything visibly slides to its real position once the guess is corrected.

One latent bug to fix while it is cheap: the animation tick clamps progress with
`Math.min(1, (now - t0) / duration)` but has no lower bound. `requestAnimationFrame` passes
the frame's *start* timestamp, which can precede a `performance.now()` taken later in the same
frame, so the first step can compute a negative progress. An ease-out curve evaluated below
zero returns a negative value and writes the node *behind* where it started — a one-frame kick
backwards at the start of every animation. Clamp to `[0, 1]`.
