import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { MapDefinition } from '../data/schema';
import { useGraphModel } from '../graph/useGraphModel';
import { useExpansion } from '../graph/useExpansion';
import { useSelection } from '../state/useSelection';
import { useAnnotations } from '../state/useAnnotations';
import {
  hasChildren as modelHasChildren,
  defIdOf,
  keyLineage,
  pathInRendered,
  activeRoute,
  type IsolatePath,
  type VisibleGraph,
} from '../graph/visibility';
import { resolveUnrollCached } from '../graph/layout';
import { edgeKey } from '../graph/buildModel';
import { readDeepLink, writeDeepLink, shareUrl } from '../state/deepLink';
import { copyToClipboard } from '../state/clipboard';
import {
  GraphInteractionProvider,
  type GraphInteraction,
} from '../graph/GraphInteractionContext';
import { NodeStateStore } from '../graph/nodeStateStore';
import { HoverStore } from '../graph/hoverStore';
import { HoverProvider } from '../graph/HoverContext';
import { GraphCanvas } from './GraphCanvas';
import { NodeDetailPanel } from './NodeDetailPanel';
import { NodeContextMenu, type NodeMenuTarget } from './NodeContextMenu';
import { NotePopover, type NotePopoverTarget } from './NotePopover';
import { EdgeDetailPanel, type EdgeDetail } from './EdgeDetailPanel';
import { SearchBox } from './SearchBox';
import { Legend } from './Legend';
import { FILTERS } from '../data/filters';
import { FilterBar } from './FilterBar';
import { useIsMobile } from '../state/useIsMobile';
import { CloseIcon, SearchIcon } from '../ui/icons';

/**
 * The next click-trail (ordered waypoints) when the user selects `next`. The lit
 * path follows the route the user ACTUALLY clicked, not just the longest route to
 * the target — so coming from EternalBlue into "Local Admin on Host" lights the
 * EternalBlue→admin route, not an equal-length alternative (e.g. via valid creds).
 *  - `next` already a waypoint → rewind to it (clicking back up the path).
 *  - `next` reachable forward from the current last waypoint → extend the trail.
 *  - otherwise → start fresh at `next`.
 * Invariant: the last element is always the current selection.
 */
function nextTrail(prev: string[], next: string, graph: VisibleGraph, root: string, skip?: ReadonlySet<string>): string[] {
  if (prev.length === 0) return [next];
  const idx = prev.indexOf(next);
  if (idx >= 0) return prev.slice(0, idx + 1);
  const last = prev[prev.length - 1];
  if (last === root) return [next];
  const seg = pathInRendered(graph, last, next, skip); // longest forward last→next over drawn edges
  return seg.length > 1 && seg[0] === last ? [...prev, next] : [next];
}

/**
 * Everything scoped to a single map: the model, expansion/selection state, the
 * canvas, and the overlays. App mounts this with `key={mapId}` so switching
 * maps (or "collapse all") gets a clean reset + refit.
 */
export function MapView({
  map,
  theme,
  reduceMotion,
  focusMode,
  notesInline,
}: {
  map: MapDefinition;
  theme: 'dark' | 'light';
  reduceMotion: boolean;
  focusMode: boolean;
  notesInline: boolean;
}) {
  const model = useGraphModel(map);

  // Seed expansion/selection from a shared link, but only if it targets THIS map.
  const seed = useMemo(() => {
    const dl = readDeepLink();
    if (dl.mapId !== map.id) return { open: [] as string[], sel: null as string | null };
    return {
      // Accept canonical ids AND unrolled-instance keys (`parent~defId~…`): an
      // instance key is valid iff every `~`-segment is a real node id.
      open: dl.open.filter((id) => id.split('~').every((seg) => model.nodes.has(seg))),
      sel: dl.sel && model.nodes.has(defIdOf(dl.sel)) ? dl.sel : null,
    };
  }, [map.id, model]);

  // Fresh load starts COLLAPSED — only the root "Engagement Start" — so the user
  // picks where to begin. A shared link (open keys or a selected node) expands the
  // root so its linked content is visible on arrival.
  const initialOpen = seed.open.length > 0 || seed.sel ? [model.rootId, ...seed.open] : [];
  const expansion = useExpansion(model.rootId, initialOpen);
  // The expansion the user built BEFORE focus mode — preserved while focus-mode drilling
  // (which is ephemeral) comes and goes. Tracked live whenever focus is OFF; frozen while
  // ON so focus selections don't fold themselves into the "keep" baseline.
  const preFocusRef = useRef<ReadonlySet<string>>(expansion.expanded);
  useEffect(() => {
    if (!focusMode) preFocusRef.current = expansion.expanded;
  }, [focusMode, expansion.expanded]);
  const selection = useSelection(seed.sel);
  const annotations = useAnnotations();
  // Right-click / long-press context menu target; the node whose notes field the
  // panel should focus on open ("Add note"); and the note popover (tap a note badge).
  const [menu, setMenu] = useState<NodeMenuTarget | null>(null);
  const [focusNotesFor, setFocusNotesFor] = useState<string | null>(null);
  const [notePopover, setNotePopover] = useState<NotePopoverTarget | null>(null);
  // Edge selection is parallel to node selection — only one is open at a time.
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // The detail panel can be dismissed WITHOUT clearing the focus: in focus mode closing
  // it keeps the drilled-in node selected (so the graph stays put) and just hides the
  // panel + re-centres the camera. Re-set false whenever a node becomes selected.
  const [panelDismissed, setPanelDismissed] = useState(false);
  // Focus mode: deselecting the focused node FREEZES the current slice instead of exploding
  // back to the full graph. `frozenFocus` keeps the last slice on screen while the selection
  // (ring / lit route / panel) clears, so you stay at the same shape, just unselected. Thawed
  // by selecting anything again or leaving focus mode (effects below).
  const [frozenFocus, setFrozenFocus] = useState(false);
  const [pathOnly, setPathOnly] = useState(false);
  // Ordered click-trail (waypoints) the user traversed; the lit path is stitched
  // through these so it follows the ACTUAL route, not just the longest one to the
  // target (see `nextTrail`). Last element is always the current selection.
  const [trail, setTrail] = useState<string[]>(() => (seed.sel ? [seed.sel] : []));
  // Focus-mode camera intent for the last interaction: a BODY click centres on the node
  // ('node'); a CHEVRON click frames the node + its next steps ('children'). Read by the
  // focus camera in useGraphView; defaults back to 'node' on every non-chevron select.
  const [focusCam, setFocusCam] = useState<'node' | 'children'>('node');
  // Hover lives in an EXTERNAL store (see HoverStore): the canvas reports node
  // enter/leave straight into it and edges subscribe selectively, so a hover never
  // re-renders this component (or the panels) at all. The store owns the arm/disarm
  // rule too — hover enters are honoured only after genuine pointer movement
  // (`pointermove` never fires when only the content moves), so a node sliding under
  // a still cursor during a selection's camera pan can't hijack the highlight.
  const hoverStoreRef = useRef<HoverStore | null>(null);
  if (!hoverStoreRef.current) hoverStoreRef.current = new HoverStore();
  const hoverStore = hoverStoreRef.current;
  useEffect(() => {
    const arm = () => hoverStore.arm();
    window.addEventListener('pointermove', arm, { passive: true });
    return () => window.removeEventListener('pointermove', arm);
  }, [hoverStore]);
  // A new selection pans the camera, so disarm hover and drop any current trace
  // until the pointer next moves — the selection's own lit path wins until then.
  useEffect(() => {
    hoverStore.selectionChanged();
  }, [hoverStore, selection.selectedId]);

  const focusActive = focusMode && selection.selectedId != null;

  // The CURRENTLY-RENDERED key-graph — the forward-unrolled visible graph the canvas
  // draws, over the user's real expansion. EVERY highlight (lit path, hover, breadcrumb)
  // and the focus subgraph are walked over THESE edges, so they're always a connected
  // subset of what exists; focus mode then isolates a slice of it (see `isolate`).
  // Cached by (model, expanded) reference — shared with useGraphView's reconcile, so
  // the unroll fixpoint (several dagre layouts) runs ONCE per interaction.
  const rendered = useMemo(() => resolveUnrollCached(model, expansion.expanded), [model, expansion.expanded]);

  // Feed the hover store the graph its trace walks over (layout effect: in lockstep
  // with the render that produced `rendered`, so a trace never lags the drawn edges).
  useLayoutEffect(() => {
    hoverStore.setSource({
      graph: rendered.graph,
      rootId: model.rootId,
      selectedId: selection.selectedId,
      backEdges: rendered.backEdges,
    });
  }, [hoverStore, rendered, model.rootId, selection.selectedId]);

  const [toolsOpen, setToolsOpen] = useState(false);

  // Filters are a pluggable registry (see data/filters): each FilterDef supplies its own
  // toolbar control and a `dims` predicate. The engine holds one state slot per filter and
  // composes them — it knows nothing about versions/footholds/OSCP specifically.
  const activeFilters = useMemo(() => FILTERS.filter((f) => f.appliesTo(map)), [map]);
  // One state record for all filters. Lazy init: persisted filters read localStorage
  // (mirrors usePersistedState), ephemeral ones take `initial` (so they reset on the
  // remount that a map switch / Reset triggers). Keyed by filter id.
  const [filterStates, setFilterStates] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const f of FILTERS) {
      if (f.persistKey) {
        try {
          const raw = localStorage.getItem(f.persistKey);
          out[f.id] = raw === null ? f.initial : JSON.parse(raw);
        } catch {
          out[f.id] = f.initial;
        }
      } else {
        out[f.id] = f.initial;
      }
    }
    return out;
  });
  // Persist the persisted filters whenever state changes (mirrors usePersistedState's write).
  useEffect(() => {
    for (const f of FILTERS) {
      if (!f.persistKey) continue;
      try {
        localStorage.setItem(f.persistKey, JSON.stringify(filterStates[f.id]));
      } catch {
        // private mode — the in-memory state still drives the UI.
      }
    }
  }, [filterStates]);
  // Per-filter scoped setter (value or updater), memoized per id so Control props stay
  // stable. The Object.is guard means a no-op set does not change `filterStates` identity,
  // so it never churns `isDimmed` / the store source (preserving the reconcile behavior of
  // the old independent useState atoms).
  const scopedSetters = useRef(new Map<string, Dispatch<SetStateAction<unknown>>>());
  const setFilterState = useCallback((id: string): Dispatch<SetStateAction<unknown>> => {
    let fn = scopedSetters.current.get(id);
    if (!fn) {
      fn = (action) =>
        setFilterStates((prev) => {
          const next =
            typeof action === 'function' ? (action as (p: unknown) => unknown)(prev[id]) : action;
          return Object.is(next, prev[id]) ? prev : { ...prev, [id]: next };
        });
      scopedSetters.current.set(id, fn);
    }
    return fn;
  }, []);

  const anyFilterActive = useMemo(
    () => activeFilters.some((f) => f.isActive(filterStates[f.id])),
    [activeFilters, filterStates],
  );

  const clearFilters = useCallback(() => {
    setFilterStates((prev) => {
      const next = { ...prev };
      for (const f of activeFilters) next[f.id] = f.initial;
      return next;
    });
  }, [activeFilters]);

  // Filters split by render mode: 'dim' filters (version/foothold) fade a node; an
  // 'inapplicable' filter (OSCP) gives it the ruled-out ban badge with per-node re-enable.
  // The def is resolved once and start/category/goal nodes are never excluded.
  const excludedBy = useCallback(
    (id: string, mode: 'dim' | 'inapplicable') => {
      if (!anyFilterActive) return false;
      const def = model.nodes.get(id);
      if (!def || def.kind === 'category' || def.kind === 'start' || def.kind === 'goal') return false;
      for (const f of activeFilters) {
        if ((f.excludes ?? 'dim') !== mode) continue;
        const st = filterStates[f.id];
        if (f.isActive(st) && f.dims(def, st)) return true;
      }
      return false;
    },
    [anyFilterActive, activeFilters, filterStates, model],
  );
  const isDimmed = useCallback((id: string) => excludedBy(id, 'dim'), [excludedBy]);
  const isScopedOut = useCallback((id: string) => excludedBy(id, 'inapplicable'), [excludedBy]);
  // Out of an 'inapplicable' filter's set but re-enabled by the user (drives the override hint).
  const isScopeReEnabled = useCallback(
    (id: string) => {
      if (!anyFilterActive) return false;
      const def = model.nodes.get(id);
      if (!def || def.kind === 'category' || def.kind === 'start' || def.kind === 'goal') return false;
      for (const f of activeFilters) {
        const ex = f.isException;
        if (f.excludes !== 'inapplicable' || !ex) continue;
        const st = filterStates[f.id];
        if (f.isActive(st) && ex(st, def.id)) return true;
      }
      return false;
    },
    [anyFilterActive, activeFilters, filterStates, model],
  );
  // Re-enable (or re-hide) a node in every active 'inapplicable' filter that governs it.
  const toggleScopeException = useCallback(
    (defId: string) => {
      for (const f of activeFilters) {
        const te = f.toggleException;
        if (f.excludes !== 'inapplicable' || !te) continue;
        if (!f.isActive(filterStates[f.id])) continue;
        setFilterState(f.id)((prev: unknown) => te(prev, defId));
      }
    },
    [activeFilters, filterStates, setFilterState],
  );

  // The ephemeral focus-mode expansion for a selection = pre-focus baseline + the node's
  // lineage + the node. Computed here so the selection handlers can set it SYNCHRONOUSLY
  // (same render as the selection). Doing it in a separate effect made each click render
  // twice — once with the STALE expansion (a different focus slice) then once with the
  // final one — so the graph re-laid-out twice and the cards visibly jumped (the flicker).
  const focusExpandFor = useCallback(
    (sel: string) => {
      const next = new Set<string>(preFocusRef.current);
      for (const k of keyLineage(model, sel)) next.add(k);
      next.add(sel);
      return next;
    },
    [model],
  );

  // Picking a node (by click or expand) makes it THE selected node and the lit
  // attack path follows the route the user CLICKED to reach it (the `trail` of
  // waypoints — extend forward, rewind back, or start fresh; see `nextTrail`).
  // Re-clicking the selected node clears it. Edge/node selection are exclusive.
  const selectNode = useCallback(
    (id: string) => {
      setSelectedEdgeId(null);
      setFocusCam('node'); // body click → centre the camera on this node (not its children)
      if (selection.selectedId === id) {
        setTrail([]);
        // Focus mode: re-clicking the focused node must NOT explode back to the full graph.
        // FREEZE the current slice so the SHAPE stays exactly as drawn, and just drop the
        // visual selection — clearing it removes the ring, the lit route and the panel,
        // leaving the same neighbourhood shown but unselected. Expansion is left untouched;
        // selecting anything thaws back to the live slice (see the frozen-focus effects).
        if (focusMode) setFrozenFocus(true);
        selection.clear(); // re-click → deselect
      } else {
        setTrail((prev) => nextTrail(prev, id, rendered.graph, model.rootId, rendered.backEdges));
        selection.select(id);
        // Set the focus expansion in the SAME render as the selection (not via the effect)
        // so the focus slice is built ONCE — no stale-expansion intermediate re-layout.
        if (focusMode) expansion.replace(focusExpandFor(id), id);
      }
    },
    [selection, rendered, model.rootId, focusMode, expansion, focusExpandFor],
  );
  // In focus mode the chevron DRILLS onto a node (focus it; its next steps then frame into
  // view) and must NEVER deselect. Re-clicking the FOCUSED node's chevron previously fell
  // through to selectNode's re-click rule → cleared the selection → collapsed the whole
  // graph back to the root, instantly dropping you out of focus. For the already-focused
  // node this is now a no-op (its next steps are already framed); for any other node it
  // focuses it, exactly like a body click but without the deselect branch.
  const focusDrill = useCallback(
    (id: string) => {
      setSelectedEdgeId(null);
      if (selection.selectedId === id) {
        // Already focused: the chevron TOGGLES the camera between this node's next steps
        // and the node itself — tap to look at what's next, tap again to "collapse" back.
        // Never deselects (that would drop out of focus to the big graph).
        setFocusCam((prev) => (prev === 'children' ? 'node' : 'children'));
        return;
      }
      // A different node's chevron → focus it AND look at its next steps.
      setFocusCam('children');
      setTrail((prev) => nextTrail(prev, id, rendered.graph, model.rootId, rendered.backEdges));
      selection.select(id);
      // Set the focus expansion synchronously (one render → one slice → no flicker).
      expansion.replace(focusExpandFor(id), id);
    },
    [selection, rendered, model.rootId, expansion, focusExpandFor],
  );
  const selectEdge = useCallback(
    (eid: string) => {
      // Mirror selectNode's re-click FREEZE: if a node focus is active, freeze its slice
      // before clearing the node selection. Otherwise `isolate` goes null and the focus
      // slice explodes back to the full graph (the "closing the edge panel collapses the
      // graph" report) — an edge panel should open over the SAME view and leave it intact.
      if (focusMode && selection.selectedId != null) setFrozenFocus(true);
      selection.clear();
      setSelectedEdgeId(eid);
    },
    [selection, focusMode],
  );
  const clearAll = useCallback(() => {
    selection.clear();
    setSelectedEdgeId(null);
    setTrail([]);
    setPathOnly(false);
    // See selectNode: in focus mode, collapse focus-drilling back to the pre-focus
    // baseline rather than leaving every visited node expanded.
    if (focusMode) expansion.replace(preFocusRef.current);
  }, [selection, focusMode, expansion]);

  // Empty-space click. In focus mode you DRILL by expanding nodes, so an accidental
  // background tap must not throw away your place — keep the current focus. Outside
  // focus mode it deselects as usual.
  const handleBackgroundClick = useCallback(() => {
    // An edge selection is never a focus "place" to preserve — a background click
    // always clears it (and its lit path), even in focus mode. Without this, focus
    // mode's early-return below swallowed edge deselection, leaving the edge lit red.
    if (selectedEdgeId != null) {
      setSelectedEdgeId(null);
      setTrail([]);
      setPathOnly(false);
      return;
    }
    if (focusMode) return;
    clearAll();
  }, [selectedEdgeId, focusMode, clearAll]);

  // Closing the detail panel. In focus mode it must NOT collapse back to the start —
  // just hide the panel and KEEP the drilled-in node focused (the camera then re-centres
  // into the freed space). Outside focus mode, closing the panel clears the selection.
  const closePanel = useCallback(() => {
    // Closing an edge panel always clears the edge + its lit path (an edge isn't a
    // drilled-in focus node to keep). Only a NODE panel gets the focus-preserving dismiss.
    if (selectedEdgeId != null) {
      setSelectedEdgeId(null);
      setTrail([]);
      setPathOnly(false);
      return;
    }
    if (focusMode) setPanelDismissed(true);
    else clearAll();
  }, [selectedEdgeId, focusMode, clearAll]);

  // Any new selection re-opens the panel (it stays dismissed only while the SAME node
  // remains focused after an explicit close).
  useEffect(() => {
    setPanelDismissed(false);
  }, [selection.selectedId]);

  // Thaw the frozen focus slice the instant something is selected again (seamless resume to
  // the live slice), or when focus mode is switched off entirely.
  useEffect(() => {
    if (selection.selectedId != null) setFrozenFocus(false);
  }, [selection.selectedId]);
  useEffect(() => {
    if (!focusMode) setFrozenFocus(false);
  }, [focusMode]);

  // Search / breadcrumb jumps reveal the key (it may not be visible yet) then make
  // it the single focus, RESETTING the trail to the natural route to that key —
  // a jump isn't a forward step in the current path.
  const revealAndSelect = useCallback(
    (key: string) => {
      setSelectedEdgeId(null);
      setFocusCam('node'); // search / panel navigation → centre on the node
      setTrail([key]);
      selection.select(key);
      // In focus mode REPLACE the expansion (ephemeral focus slice) synchronously so the
      // slice builds once; outside focus, ADD the lineage (accumulating expansion).
      if (focusMode) expansion.replace(focusExpandFor(key), key);
      else expansion.expandMany(keyLineage(model, key));
    },
    [expansion, selection, model, focusMode, focusExpandFor],
  );

  // ---- Right-click / long-press context menu ----
  const openMenu = useCallback((key: string, defId: string, x: number, y: number) => {
    setMenu({ key, defId, x, y });
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);
  const openNote = useCallback((key: string, label: string, x: number, y: number) => {
    setNotePopover({ key, label, x, y });
  }, []);
  const closeNote = useCallback(() => setNotePopover(null), []);

  // A shareable deep-link straight to this node (revealed + selected), compressed.
  // Routed through copyToClipboard so it also works on an insecure-context dev server.
  const copyLink = useCallback(
    (defId: string) => copyToClipboard(shareUrl({ mapId: map.id, open: keyLineage(model, defId), sel: defId })),
    [map.id, model],
  );

  // "Add note" from the context menu: open the node's panel and drop the cursor into
  // its notes field. Keyed by render key so the right instance's note opens.
  const addNote = useCallback(
    (key: string) => {
      revealAndSelect(key);
      setFocusNotesFor(key);
    },
    [revealAndSelect],
  );

  // Picking a "next step" from the detail panel: open the selected node (so its
  // children render) and select the chosen child. `childKey` is an exact render
  // key from `nextSteps` (computed over the post-expansion graph), so it lands on
  // the right node — including the correct forward loop-instance.
  const pickNext = useCallback(
    (childKey: string) => {
      const sel = selection.selectedId;
      // Reveal the selected node and its ancestors, then open it so the chosen
      // child actually renders (works whether sel was already visible or not).
      if (sel) expansion.expandMany(keyLineage(model, sel));
      setSelectedEdgeId(null);
      setFocusCam('node'); // navigating to a chosen next step centres on THAT node
      // Picking a next step is a forward move — extend the trail off the current
      // selection so the lit path runs through it.
      setTrail((prev) => (sel && prev[prev.length - 1] === sel ? [...prev, childKey] : [childKey]));
      selection.select(childKey);
    },
    [expansion, selection, model],
  );

  // The highlighted "attack path": the rendered route over the ACTUAL drawn edges,
  // stitched through the clicked waypoints (`trail`) so it follows the route the
  // user traversed — not just the longest route to the target (a convergent node
  // like "Local Admin on Host" has several equal-length routes in; the trail picks
  // the one actually clicked). `trail`'s last element is always the selection; if
  // the trail is empty/stale or a segment is disconnected (expansion changed under
  // it), fall back to the plain longest root→sel path so the highlight never breaks.
  // For a selected edge, just light its endpoints.
  const activePath = useMemo(() => {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    const sel = selection.selectedId;
    if (sel) {
      const wps = trail.length > 0 && trail[trail.length - 1] === sel ? trail : [sel];
      // Stitch the route over the drawn edges; a stale/branch-jumped trail re-anchors at
      // the last good waypoint instead of reverting to the global longest route.
      const route = activeRoute(rendered.graph, model.rootId, wps, rendered.backEdges);
      route.forEach((k, i) => {
        nodes.add(k);
        // skip the duplicated junction node where consecutive segments join
        if (i > 0 && route[i] !== route[i - 1]) edges.add(edgeKey(route[i - 1], route[i]));
      });
    } else if (selectedEdgeId) {
      // Light the whole route THROUGH the selected edge (root → source → target), so
      // selecting an edge reads like the path that reaches it — not just two isolated
      // endpoints with the route to them dimmed.
      const i = selectedEdgeId.indexOf('->');
      const s = selectedEdgeId.slice(0, i);
      const t = selectedEdgeId.slice(i + 2);
      const lin = pathInRendered(rendered.graph, model.rootId, s, rendered.backEdges); // root → source
      const route = lin.length > 1 && lin[0] === model.rootId ? lin : [s];
      route.forEach((k, idx) => {
        nodes.add(k);
        if (idx > 0 && route[idx] !== route[idx - 1]) edges.add(edgeKey(route[idx - 1], route[idx]));
      });
      nodes.add(t);
      edges.add(selectedEdgeId);
    }
    return { nodes, edges };
  }, [rendered, model.rootId, trail, selection.selectedId, selectedEdgeId]);

  // Isolate render — a subgraph drawn alone (dagre-laid-out, everything else faded).
  // Two modes share it:
  //  - FOCUS MODE: the lit ROUTE to the selected node, PLUS the node's siblings (as
  //    leaves — their own next steps stay hidden), PLUS the selected node's IMMEDIATE
  //    next steps (its direct children only — the rest of the forward subtree stays
  //    hidden). One level each way keeps focus a small, connected neighbourhood and
  //    can't run away on the AD graph (one big SCC), so dagre always lays it out as a
  //    clean left→right tree.
  //  - "Isolate path" checkbox: EXACTLY the lit route, nothing else.
  const isolate = useMemo<IsolatePath | null>(() => {
    const sel = selection.selectedId;

    if (focusActive && sel) {
      // Build the focus slice from RENDER KEYS (like the main graph), NOT def ids.
      // Collapsing to def ids folds a hub re-entry ("creds lead to another set of
      // creds") into a cycle, which dagre can't lay out as a tree — the source of the
      // backward edges + overlapping cards. Render keys keep each instance distinct,
      // so the route stays acyclic and lays out cleanly forward.
      const g = rendered.graph; // edges keyed by render keys
      const routeKeys = new Set<string>(activePath.nodes);
      // sel's parent on the lit route = source KEY of the route edge landing on sel.
      let parentKey: string | undefined;
      for (const eid of activePath.edges) {
        const j = eid.indexOf('->');
        if (eid.slice(j + 2) === sel) parentKey = eid.slice(0, j);
      }
      // The parent's rendered children, in natural order, INCLUDING sel. Coming from
      // the RENDERED graph (render keys) means a hub's re-entry instance gets its own
      // forward children instead of pointing back at the canonical node. sel MUST be in
      // this set: the reorder below pins each child to its natural slot, so the selected
      // node keeps its place instead of dagre lifting it to the top (because it alone
      // has next-steps) — which made the whole sibling column jump on every click.
      // sel's own rendered children — its next steps.
      const selChildren = new Set<string>();
      for (const e of g.edges) if (e.source === sel) selChildren.add(e.target);
      const siblingKeys: string[] = [];
      if (parentKey)
        for (const e of g.edges) {
          if (e.source !== parentKey) continue;
          // A parent-child that is ALSO a child of sel belongs to sel's SUBTREE (a next
          // step), not the sibling rank — keep it under sel instead of letting the shared
          // parent steal it up as a sibling. (e.g. "Domain Trust Modification" is reachable
          // from both Domain Admin and the Domain Trusts category; focused on Domain Trusts
          // it must read as that category's 3rd technique, not a Domain Admin sibling.)
          if (e.target !== sel && selChildren.has(e.target)) continue;
          siblingKeys.push(e.target);
        }
      // Immediate next steps = sel's rendered children, skipping any that loop back into
      // the route/siblings so the slice stays acyclic. They render ONLY when the chevron has
      // EXPANDED them (focusCam==='children'). A body click leaves focusCam='node' → the
      // children stay COLLAPSED (hidden): you see the node + its siblings + route, and the
      // chevron reveals/hides the next steps (and pans the camera to/from them).
      const nextKeys = new Set<string>();
      if (focusCam === 'children') {
        for (const e of g.edges) {
          if (e.source !== sel || routeKeys.has(e.target) || siblingKeys.includes(e.target)) continue;
          nextKeys.add(e.target);
        }
      }
      const focusKeys = new Set<string>([...routeKeys, ...siblingKeys, sel, ...nextKeys]);
      const count = new Map<string, number>();
      const nodes = [...focusKeys].map((k) => {
        const defId = defIdOf(k);
        const instanceIndex = (count.get(defId) ?? 0) + 1;
        count.set(defId, instanceIndex);
        return { key: k, defId, instanceIndex };
      });
      // Edges: the lit route, parent → each sibling, sel → each next step. Labels are
      // looked up by the underlying def-id pair. (parent → sel is also a route edge; the
      // seen-set dedupes it.)
      const seenEdge = new Set<string>();
      const edges: { id: string; source: string; target: string; label?: string }[] = [];
      const push = (s: string, t: string) => {
        const id = edgeKey(s, t);
        if (seenEdge.has(id) || !focusKeys.has(s) || !focusKeys.has(t)) return;
        seenEdge.add(id);
        edges.push({ id, source: s, target: t, label: model.edgeLabels.get(edgeKey(defIdOf(s), defIdOf(t))) });
      };
      for (const eid of activePath.edges) {
        const j = eid.indexOf('->');
        push(eid.slice(0, j), eid.slice(j + 2));
      }
      if (parentKey) for (const sib of siblingKeys) push(parentKey, sib);
      for (const nk of nextKeys) push(sel, nk);
      return { nodes, edges, reorder: { keys: siblingKeys, selKey: sel, next: [...nextKeys] } };
    }

    if (!pathOnly || activePath.nodes.size === 0) return null;
    const count = new Map<string, number>();
    const nodes = [...activePath.nodes].map((key) => {
      const defId = defIdOf(key);
      const instanceIndex = (count.get(defId) ?? 0) + 1;
      count.set(defId, instanceIndex);
      return { key, defId, instanceIndex };
    });
    const edges = [...activePath.edges].map((id) => {
      const i = id.indexOf('->');
      const source = id.slice(0, i);
      const target = id.slice(i + 2);
      return { id, source, target, label: model.edgeLabels.get(edgeKey(defIdOf(source), defIdOf(target))) };
    });
    return { nodes, edges };
  }, [focusActive, focusCam, pathOnly, activePath, selection.selectedId, model, rendered]);

  // Track the latest live slice. While `frozenFocus` is on (focused node deselected) keep
  // rendering it so the shape stays put even though nothing is selected — the highlight
  // (ring / active route) clears on its own because it's driven by the now-empty selection.
  const lastSliceRef = useRef<IsolatePath | null>(null);
  if (isolate) lastSliceRef.current = isolate;
  const renderedIsolate = frozenFocus ? lastSliceRef.current : isolate;

  // The immediate next steps off the selected node (its children, by def id) —
  // kept fully visible during path-building instead of receding with the rest.
  const nextStepDefs = useMemo(
    () => (selection.selectedId ? new Set(model.childrenOf.get(defIdOf(selection.selectedId)) ?? []) : null),
    [selection.selectedId, model],
  );

  // The selected node's SIBLINGS — the other children of its parent on the lit route,
  // i.e. the alternatives at the same step. Kept fully visible (like the next steps)
  // so selecting a node never dims the peers you might pick instead.
  const siblingDefs = useMemo(() => {
    const sel = selection.selectedId;
    if (!sel) return null;
    let parentDef: string | undefined;
    for (const eid of activePath.edges) {
      const j = eid.indexOf('->');
      if (eid.slice(j + 2) === sel) {
        parentDef = defIdOf(eid.slice(0, j));
        break;
      }
    }
    if (parentDef === undefined) return null;
    return new Set(model.childrenOf.get(parentDef) ?? []);
  }, [selection.selectedId, activePath, model]);

  // Render-key edges OUT of the selected node's parent — i.e. parent → selected and
  // parent → each sibling. Kept un-dimmed so the alternatives at the step are visible
  // as connected branches, matching the sibling NODES staying visible (`siblingDefs`).
  const peerEdges = useMemo(() => {
    const set = new Set<string>();
    const sel = selection.selectedId;
    if (!sel) return set;
    let parentKey: string | undefined;
    for (const eid of activePath.edges) {
      const j = eid.indexOf('->');
      if (eid.slice(j + 2) === sel) {
        parentKey = eid.slice(0, j);
        break;
      }
    }
    if (parentKey === undefined) return set;
    for (const e of rendered.graph.edges) if (e.source === parentKey) set.add(edgeKey(e.source, e.target));
    return set;
  }, [selection.selectedId, activePath, rendered]);

  // The selected node's next steps, browsable + pickable in the detail panel.
  // Computed over the graph AS IT WILL BE once the node is expanded (resolveUnroll
  // with the selected key added), so each child's render key is EXACT — picking
  // one lands on the right node, including the correct forward loop-instance.
  const nextSteps = useMemo(() => {
    const sel = selection.selectedId;
    if (!sel) return [];
    // When `sel` is already expanded, the `rendered` graph we already have IS the
    // graph-with-sel-expanded — reuse it. Re-running the dagre unroll fixpoint here
    // on every selection cost ~tens of ms SYNCHRONOUSLY, stalling the camera glide.
    const g = expansion.expanded.has(sel)
      ? rendered.graph
      : resolveUnrollCached(model, new Set([...expansion.expanded, sel])).graph;
    let childKeys = g.edges.filter((e) => e.source === sel).map((e) => e.target);
    if (childKeys.length === 0) {
      // `sel` isn't revealed in the rendered graph yet (e.g. a bare deep-link with
      // no expanded ancestors) — fall back to the model's children, keyed into
      // sel's context so picking one still navigates correctly once revealed.
      const ctx = sel.slice(0, sel.lastIndexOf('~') + 1);
      childKeys = (model.childrenOf.get(defIdOf(sel)) ?? []).map((c) => ctx + c);
    }
    return childKeys.map((key) => {
      const cdef = model.nodes.get(defIdOf(key));
      return {
        id: key,
        label: cdef?.label ?? key,
        color: cdef ? model.phases.get(cdef.phase)?.color ?? '#7c8aa0' : '#7c8aa0',
        summary: cdef?.summary,
      };
    });
  }, [selection.selectedId, expansion.expanded, model, rendered]);

  // Per-node VOLATILE state (selected/expanded/active/dimmed/recede/owned/inapplicable/
  // note) lives in this external store, NOT on the context value. Each card subscribes to
  // it selectively (useSyncExternalStore), so a plain selection or expansion only
  // re-renders the cards whose own flags actually flipped — instead of all ~150 at once,
  // which is what happened when these were predicates on the context object (a context
  // identity change re-renders every consumer, bypassing memo).
  const nodeStoreRef = useRef<NodeStateStore | null>(null);
  if (!nodeStoreRef.current) nodeStoreRef.current = new NodeStateStore();
  const nodeStore = nodeStoreRef.current;
  const hasSelection = selection.selectedId != null || selectedEdgeId != null;
  const focusChildrenShown = focusCam === 'children';

  // Push the live inputs into the store (layout effect → applied before paint, in lockstep
  // with the selection/expansion render so highlights never lag a frame). The store wakes
  // its subscribers; only nodes with a changed snapshot re-render.
  useLayoutEffect(() => {
    nodeStore.setSource({
      selectedId: selection.selectedId,
      hasSelection,
      focusMode,
      focusActive,
      focusChildrenShown,
      isExpanded: (id) => expansion.expanded.has(id),
      isNodeActive: (id) => activePath.nodes.has(id),
      isDimmed,
      isScopedOut,
      isScopeReEnabled,
      isNextStep: (id) => !!nextStepDefs?.has(id),
      isSibling: (id) => !!siblingDefs?.has(id),
      isOwned: annotations.isOwned,
      isInapplicable: annotations.isInapplicable,
      hasNote: annotations.hasNote,
      getNote: annotations.getNote,
    });
  }, [nodeStore, selection.selectedId, hasSelection, focusMode, focusActive, focusChildrenShown, expansion.expanded, activePath, isDimmed, isScopedOut, isScopeReEnabled, nextStepDefs, siblingDefs, annotations.isOwned, annotations.isInapplicable, annotations.hasNote, annotations.getNote]);

  // Stable indirections for the interaction callbacks. selectNode/focusDrill/selectEdge
  // close over `selection`/`expansion`/`rendered`, which all change identity on EVERY
  // click/expand — so putting them on the context directly would churn its identity each
  // interaction and re-render all ~150 cards (defeating the store). The latest impl lives
  // in a ref, read by a once-created wrapper, so the context value stays put while clicks
  // still run the current logic. `toggle` switches impl by mode; the wrapper hides that too.
  const selectImplRef = useRef(selectNode);
  selectImplRef.current = selectNode;
  const stableSelect = useCallback((id: string) => selectImplRef.current(id), []);
  // MAIN GRAPH chevron: expand/collapse — and, while building a path (something is
  // selected), expanding a node also moves the selection onto it so its children
  // become the lit frontier. This lives HERE (not in TechniqueNode's click handler) so
  // the card never reads hasSelection/focusMode at render time — flags that flip on
  // every select/deselect and would churn the context identity, re-rendering every card.
  const toggleAndFollow = useCallback(
    (id: string) => {
      const willExpand = !expansion.isExpanded(id);
      expansion.toggle(id);
      if ((selection.selectedId != null || selectedEdgeId != null) && selection.selectedId !== id) {
        selectNode(id);
      }
      // A chevron EXPAND frames the node's next steps (the frontier); a collapse recentres on
      // the node. selectNode above sets 'node', so set the children intent AFTER it.
      setFocusCam(willExpand ? 'children' : 'node');
    },
    [expansion, selection.selectedId, selectedEdgeId, selectNode],
  );
  const toggleImplRef = useRef<(id: string) => void>(toggleAndFollow);
  // In focus mode the chevron NAVIGATES rather than just expanding: it drills focus onto
  // the node (collapsing the graph to node + siblings + next steps), like a body click.
  // Gate on focusMode (not focusActive) so it holds even with nothing selected yet.
  toggleImplRef.current = focusMode ? focusDrill : toggleAndFollow;
  const stableToggle = useCallback((id: string) => toggleImplRef.current(id), []);
  const selectEdgeImplRef = useRef(selectEdge);
  selectEdgeImplRef.current = selectEdge;
  const stableSelectEdge = useCallback((eid: string) => selectEdgeImplRef.current(eid), []);

  // STABLE context: only callbacks + mode flags that rarely change identity, so a plain
  // selection/expansion (in non-focus mode) does NOT change this value — DrawInEdge and
  // each card's stable reads stay put while only the store drives the few real re-renders.
  // Per-click flags (hasSelection, focusChildrenShown, focusMode-dependent behaviour)
  // deliberately do NOT appear here — they live in the node store / the toggle wrapper.
  const interaction: GraphInteraction = useMemo(
    () => ({
      model,
      getDef: (id) => model.nodes.get(id),
      hasChildren: (id) => modelHasChildren(model, id),
      focusActive,
      notesInline,
      phaseColor: (pid) => model.phases.get(pid)?.color ?? '#7c8aa0',
      phaseLabel: (pid) => model.phases.get(pid)?.label ?? pid,
      theme,
      reduceMotion,
      toggle: stableToggle,
      select: stableSelect,
      selectEdge: stableSelectEdge,
      openMenu,
      openNote,
      nodeStore,
    }),
    [model, focusActive, notesInline, theme, reduceMotion, stableToggle, stableSelect, stableSelectEdge, openMenu, openNote, nodeStore],
  );

  // Focus mode: the REAL expansion is the pre-focus baseline PLUS only the currently
  // focused node's lineage (and the node itself) — REPLACED on every selection, not
  // accumulated. So drilling into a node and then switching to another collapses the one
  // you left (it never persists into non-focus mode), while expansions the user made
  // before focus mode are kept. Keeping the lineage in the real set is also what lets the
  // root-based `rendered` graph contain the node so its parent + children resolve.
  // useLayoutEffect (not useEffect): the selection update and this expansion update would
  // otherwise land in TWO separate painted frames — the first paints the isolate built
  // against the stale graph (old next-steps still lit, new ones half-built → a flash),
  // the second corrects it. Running synchronously before paint collapses them into one
  // clean frame, so switching the focused node no longer flickers/double-exposes.
  const { replace: replaceExpansion } = expansion;
  useLayoutEffect(() => {
    if (!focusMode || !selection.selectedId) return;
    const next = new Set<string>(preFocusRef.current);
    for (const k of keyLineage(model, selection.selectedId)) next.add(k);
    next.add(selection.selectedId);
    replaceExpansion(next, selection.selectedId);
  }, [focusMode, selection.selectedId, model, replaceExpansion]);

  // Keep the URL hash in sync so the current view is shareable / bookmarkable.
  // DEBOUNCED: Safari throttles history.replaceState (~100 calls per 30s, then it
  // throws), and rapid focus-mode clicking can fire several updates per second —
  // plus each write deflates the state. Only the settled view needs to be in the URL.
  useEffect(() => {
    const t = window.setTimeout(
      () =>
        writeDeepLink({
          mapId: map.id,
          open: [...expansion.expanded].filter((id) => id !== model.rootId),
          sel: selection.selectedId,
        }),
      300,
    );
    return () => window.clearTimeout(t);
  }, [expansion.expanded, selection.selectedId, map.id, model.rootId]);

  // `selectedId` is a render KEY (may be an unrolled instance); resolve content by
  // its def id, but drive expansion/breadcrumb by the key so the right instance wins.
  const selectedKey = selection.selectedId;
  const selectedDef = selectedKey ? model.nodes.get(defIdOf(selectedKey)) ?? null : null;
  // What the panel actually shows: nothing while explicitly dismissed (focus mode keeps
  // the node selected behind it). Drives both the panel and the camera's panel reserve.
  const panelDef = panelDismissed ? null : selectedDef;
  const panelOpen = panelDef != null || (!panelDismissed && selectedEdgeId != null);
  const breadcrumb = useMemo(
    () =>
      selectedKey
        ? pathInRendered(rendered.graph, model.rootId, selectedKey, rendered.backEdges).map((k) => ({
            id: k,
            label: model.nodes.get(defIdOf(k))?.label ?? k,
          }))
        : undefined,
    [selectedKey, rendered, model],
  );

  const selectedEdge = useMemo<EdgeDetail | null>(() => {
    if (!selectedEdgeId) return null;
    // `source`/`target` are RENDER keys (may be unrolled instances like `parent~def`)
    // — keep them for navigation, but resolve content (defs, label, description) by
    // their DEF ids, since model.nodes/edgeLabels are keyed by def id. Using the raw
    // instance key here was the "From — To —" (blank) bug on instanced edges.
    const [source, target] = selectedEdgeId.split('->');
    const modelKey = edgeKey(defIdOf(source), defIdOf(target));
    return {
      id: selectedEdgeId,
      source,
      target,
      label: model.edgeLabels.get(modelKey),
      description: model.edgeDescriptions.get(modelKey),
      sourceDef: model.nodes.get(defIdOf(source)),
      targetDef: model.nodes.get(defIdOf(target)),
    };
  }, [selectedEdgeId, model]);

  const filterActive = anyFilterActive;

  // First-run hint: shown only while the map is completely untouched (nothing
  // expanded or selected), so the near-empty canvas reads as a starting point
  // rather than a bug. Unmounts on the first interaction.
  const isMobile = useIsMobile();
  const showHint = expansion.expanded.size === 0 && !hasSelection;

  // Stable handlers for the (memoized) detail panel, so it re-renders only when the
  // content it shows actually changes — not on every unrelated MapView render.
  const selectedKeyForAnnot = selection.selectedId;
  const { toggleOwned, toggleInapplicable, setNote } = annotations;
  const onTogglePathOnly = useCallback(() => setPathOnly((p) => !p), []);
  const onToggleOwned = useCallback(() => {
    if (selectedKeyForAnnot) toggleOwned(selectedKeyForAnnot);
  }, [selectedKeyForAnnot, toggleOwned]);
  const onToggleInapplicable = useCallback(() => {
    if (selectedKeyForAnnot) toggleInapplicable(selectedKeyForAnnot);
  }, [selectedKeyForAnnot, toggleInapplicable]);
  const onNoteChange = useCallback(
    (t: string) => {
      if (selectedKeyForAnnot) setNote(selectedKeyForAnnot, t);
    },
    [selectedKeyForAnnot, setNote],
  );
  const onNoteFocused = useCallback(() => setFocusNotesFor(null), []);

  return (
    <GraphInteractionProvider value={interaction}>
      <HoverProvider value={hoverStore}>
      <ReactFlowProvider>
        <GraphCanvas
          model={model}
          expanded={expansion.expanded}
          lastToggled={expansion.lastToggled}
          selectedId={selection.selectedId}
          reduceMotion={reduceMotion}
          onBackgroundClick={handleBackgroundClick}
          notesLayoutKey={notesInline ? annotations.notedIds.join(',') : ''}
          isolate={renderedIsolate}
          panelOpen={panelOpen}
          focusCam={focusCam}
          activeEdges={activePath.edges}
          peerEdges={peerEdges}
          selectedEdgeId={selectedEdgeId}
          hasSelection={selection.selectedId != null || selectedEdgeId != null}
        />
      </ReactFlowProvider>

      {/* Top overlay: collapsible search + filter chips */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-col items-center gap-1.5 px-2">
        {!toolsOpen ? (
          <button
            type="button"
            onClick={() => setToolsOpen(true)}
            className="group pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-panel/80 py-1.5 pl-3 pr-2 text-sm text-ink-dim shadow-[var(--shadow-card)] backdrop-blur-xl transition-colors hover:border-border-strong hover:text-ink"
          >
            <SearchIcon className="h-4 w-4" />
            <span>Search</span>
            {filterActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent" title="filters active" />
            )}
          </button>
        ) : (
          <>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <SearchBox nodes={map.nodes} edges={map.edges} onPick={revealAndSelect} phaseColor={interaction.phaseColor} />
              <button
                type="button"
                onClick={() => setToolsOpen(false)}
                aria-label="Hide search & filters"
                className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-panel/80 p-2 text-ink-dim shadow-[var(--shadow-card)] backdrop-blur-xl transition-colors hover:text-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <FilterBar
              filters={activeFilters}
              states={filterStates}
              setFilterState={setFilterState}
              filterActive={filterActive}
              onClear={clearFilters}
              map={map}
            />
          </>
        )}
      </div>

      {showHint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-2">
          <span className="hg-fade-in flex items-center gap-1.5 rounded-full border border-border bg-panel/75 px-3.5 py-1.5 text-xs text-ink-dim shadow-[var(--shadow-card)] backdrop-blur-xl">
            {isMobile ? 'Tap a technique to begin' : 'Click a technique to begin'}
          </span>
        </div>
      )}

      <Legend phases={map.phases} />
      <NodeDetailPanel
        def={panelDef}
        phaseColor={panelDef ? interaction.phaseColor(panelDef.phase) : '#7c8aa0'}
        phaseLabel={panelDef ? interaction.phaseLabel(panelDef.phase) : ''}
        mapName={map.name}
        reduceMotion={reduceMotion}
        path={breadcrumb}
        nextSteps={nextSteps}
        onPickNext={pickNext}
        pathOnly={pathOnly}
        onTogglePathOnly={onTogglePathOnly}
        onNavigate={revealAndSelect}
        onClose={closePanel}
        owned={selection.selectedId != null && annotations.isOwned(selection.selectedId)}
        onToggleOwned={onToggleOwned}
        inapplicable={selection.selectedId != null && annotations.isInapplicable(selection.selectedId)}
        onToggleInapplicable={onToggleInapplicable}
        note={selection.selectedId ? annotations.getNote(selection.selectedId) : ''}
        onNoteChange={onNoteChange}
        autoFocusNote={selection.selectedId != null && focusNotesFor === selection.selectedId}
        onNoteFocused={onNoteFocused}
      />
      <EdgeDetailPanel
        edge={selectedEdge}
        sourceColor={selectedEdge?.sourceDef ? interaction.phaseColor(selectedEdge.sourceDef.phase) : '#7c8aa0'}
        targetColor={selectedEdge?.targetDef ? interaction.phaseColor(selectedEdge.targetDef.phase) : '#7c8aa0'}
        mapName={map.name}
        reduceMotion={reduceMotion}
        onSelectNode={revealAndSelect}
        onClose={closePanel}
      />
      {menu && (
        <NodeContextMenu
          target={menu}
          def={model.nodes.get(menu.defId) ?? null}
          owned={annotations.isOwned(menu.key)}
          inapplicable={annotations.isInapplicable(menu.key)}
          scopedOut={isScopedOut(menu.defId)}
          scopeReEnabled={isScopeReEnabled(menu.defId)}
          hasNote={annotations.hasNote(menu.key)}
          onClose={closeMenu}
          onCopyLink={() => copyLink(menu.defId)}
          onToggleOwned={() => annotations.toggleOwned(menu.key)}
          onToggleInapplicable={() => annotations.toggleInapplicable(menu.key)}
          onToggleScope={() => toggleScopeException(menu.defId)}
          onAddNote={() => addNote(menu.key)}
        />
      )}
      <NotePopover
        target={notePopover}
        note={notePopover ? annotations.getNote(notePopover.key) : ''}
        onClose={closeNote}
      />
      </HoverProvider>
    </GraphInteractionProvider>
  );
}
