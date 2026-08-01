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

Ordered by how much it costs to add later.

### Blocking for a real dataset

**1. Node detail panel.** Not present. This is where most of a real dataset's value lives:
description, prerequisite chips, tools, commands with copy buttons, references, external link,
a caution/notes callout, the node's own notes field, a next-steps list and a breadcrumb. It is
larger than everything else on this list combined.

**2. Edge selection and edge detail.** Not present. The `relationships{}` contract already
exists in the core; edges just are not clickable and there is no panel to explain what
`gate` or `promotes` means at that specific link.

**3. Multi-map support.** Single generated map today. Needs a registry, per-map phases, a
switcher (segmented control on desktop, dropdown on narrow screens) and per-map filter
applicability — an Environment filter must not appear on a map whose nodes declare no
environments.

**4. Mobile and touch.** One media query and minimal pointer handling. Needs long-press to
open the context menu, the detail panel docking to the bottom rather than the side, the
camera reserving that band so a centred node is not hidden behind it, and the collapsed
switcher. **Retrofit cost is high** because the camera primitives need the reserve designed
in rather than bolted on.

### Significant, self-contained

**5. Focus mode.** Not present. Drilling into a node collapses the view to that node plus its
siblings and next steps; deselecting freezes the current slice instead of exploding back to
the full graph; a body click and a chevron click want different camera framing.

**6. Theming.** No light mode. This is a full colour-token layer, and note that edge stroke
colours have to be resolved to literals in code — an animated SVG stroke cannot interpolate a
CSS variable.

**7. Reduced-cost mode for weak machines.** Reduced-motion is respected, but there is no
measured degradation: sample frame intervals while animating and, when the machine cannot
keep up, drop shadow blur, the background grid and entrance work.

**8. Annotation breadth.** Notes and marks exist. Missing: a distinct "not applicable" state
with its own ruled-out treatment, an inline-notes-on-card toggle, and keying annotations by
*content* id so a mark follows a step across its unrolled `#2` instances.

### Smaller

**9. Breadcrumb UI** — ancestry is computed in the core but never rendered.
**10. Trail in the share link** — confirm the ordered click-trail round-trips, not just the
expanded set and selection, or a shared link replays a different lit route than the one shared.
**11. Static page generation** — a per-map static build for linking and indexing.
**12. Test coverage** — currently a layout invariant test. Worth adding: visibility and
unrolling, path finding, search ranking, share-link round-trip, and a guard that the engine
never imports dataset modules.

---

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
