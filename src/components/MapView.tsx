import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type IsolatePath,
  type VisibleGraph,
} from '../graph/visibility';
import { resolveUnroll } from '../graph/layout';
import { edgeKey } from '../graph/buildModel';
import { readDeepLink, writeDeepLink, shareUrl } from '../state/deepLink';
import { copyToClipboard } from '../state/clipboard';
import {
  GraphInteractionProvider,
  type GraphInteraction,
} from '../graph/GraphInteractionContext';
import { HoverProvider } from '../graph/HoverContext';
import { GraphCanvas } from './GraphCanvas';
import { NodeDetailPanel } from './NodeDetailPanel';
import { NodeContextMenu, type NodeMenuTarget } from './NodeContextMenu';
import { NotePopover, type NotePopoverTarget } from './NotePopover';
import { EdgeDetailPanel, type EdgeDetail } from './EdgeDetailPanel';
import { SearchBox } from './SearchBox';
import { Legend } from './Legend';
import { WINDOWS_VERSIONS } from '../data/windows-versions';
import { FOOTHOLDS } from '../data/footholds';
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
  reduceMotion,
  focusMode,
  notesInline,
}: {
  map: MapDefinition;
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
  const selection = useSelection(seed.sel);
  const annotations = useAnnotations();
  // Right-click / long-press context menu target; the node whose notes field the
  // panel should focus on open ("Add note"); and the note popover (tap a note badge).
  const [menu, setMenu] = useState<NodeMenuTarget | null>(null);
  const [focusNotesFor, setFocusNotesFor] = useState<string | null>(null);
  const [notePopover, setNotePopover] = useState<NotePopoverTarget | null>(null);
  // Edge selection is parallel to node selection — only one is open at a time.
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pathOnly, setPathOnly] = useState(false);
  // Ordered click-trail (waypoints) the user traversed; the lit path is stitched
  // through these so it follows the ACTUAL route, not just the longest one to the
  // target (see `nextTrail`). Last element is always the current selection.
  const [trail, setTrail] = useState<string[]>(() => (seed.sel ? [seed.sel] : []));
  // Hovered node — drives trace-on-hover edge highlighting (own state so it
  // doesn't churn the interaction context).
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Selecting a node pans the camera to centre it, which slides a *different* node
  // under a stationary cursor — the browser fires `mouseenter` for it (the hit
  // target changed though the pointer didn't move), spuriously tracing THAT node's
  // path and burying the real selection. `pointermove` only fires on genuine
  // pointer movement (never when content moves under a still pointer), so we arm
  // hover on real movement and disarm it on every selection change: a node sliding
  // under the cursor during a pan can't hijack the highlight.
  const hoverArmed = useRef(false);
  useEffect(() => {
    const arm = () => {
      hoverArmed.current = true;
    };
    window.addEventListener('pointermove', arm, { passive: true });
    return () => window.removeEventListener('pointermove', arm);
  }, []);
  const onNodeHover = useCallback((id: string | null) => {
    // Honour leave (null) always; honour enter only when the pointer actually moved.
    if (id !== null && !hoverArmed.current) return;
    setHoveredId(id);
  }, []);
  const canHover = useCallback(() => hoverArmed.current, []);
  // A new selection pans the camera, so disarm hover and drop any current trace
  // until the pointer next moves — the selection's own lit path wins until then.
  useEffect(() => {
    hoverArmed.current = false;
    setHoveredId(null);
  }, [selection.selectedId]);

  const focusActive = focusMode && selection.selectedId != null;

  // The CURRENTLY-RENDERED key-graph — the forward-unrolled visible graph the canvas
  // draws, over the user's real expansion. EVERY highlight (lit path, hover, breadcrumb)
  // and the focus subgraph are walked over THESE edges, so they're always a connected
  // subset of what exists; focus mode then isolates a slice of it (see `isolate`).
  const rendered = useMemo(() => resolveUnroll(model, expansion.expanded), [model, expansion.expanded]);

  // Edges on the hovered node's lineage (root → node, along the drawn edges), so
  // hovering traces the whole path back to the start, not just the parent edge.
  // EXCEPT the selected node itself: its route is already lit by `activePath` (which
  // follows the clicked trail). Re-tracing here would light the CANONICAL longest
  // route instead — a different path into a convergent node (e.g. the goal) than the
  // one you selected — surfacing an "unselected path" under it. So skip it.
  const hoverEdges = useMemo(() => {
    const set = new Set<string>();
    if (hoveredId && hoveredId !== selection.selectedId) {
      const lin = pathInRendered(rendered.graph, model.rootId, hoveredId, rendered.backEdges);
      for (let i = 1; i < lin.length; i++) set.add(edgeKey(lin[i - 1], lin[i]));
    }
    return set;
  }, [hoveredId, rendered, model.rootId, selection.selectedId]);

  // Filters: dim technique nodes that don't apply to the target version, or that need
  // access you don't hold. `hold` is a SET (footholds are independent capabilities, not
  // a ladder), so a domain user who is also a local admin holds both.
  const [versionFilter, setVersionFilter] = useState<string | null>(null);
  const [hold, setHold] = useState<ReadonlySet<string>>(new Set());
  const [toolsOpen, setToolsOpen] = useState(false);
  // Version ids actually used by THIS map's nodes — drives whether the "Target"
  // selector shows (any tagged node) and which versions/families it offers (so the AD
  // map lists only Server releases, the PE map both). Picking a version the map never
  // tags would otherwise dim every tagged node at once.
  const mapVersionIds = useMemo(() => {
    const s = new Set<string>();
    for (const n of map.nodes) for (const v of n.versions ?? []) s.add(v);
    return s;
  }, [map]);
  const versionAware = mapVersionIds.size > 0;
  // The foothold ("I hold") selector only shows if this map tags any node with `needs`.
  const footholdAware = useMemo(() => map.nodes.some((n) => n.needs), [map]);

  const isDimmed = useCallback(
    (id: string) => {
      if (!versionFilter && hold.size === 0) return false;
      const def = model.nodes.get(id);
      if (!def || def.kind === 'category' || def.kind === 'start' || def.kind === 'goal') return false;
      // A node with a restricted `versions` set that excludes the selected target is
      // dimmed; an untagged node (applies to all versions) always passes.
      if (versionFilter && def.versions && !def.versions.includes(versionFilter)) return true;
      // Foothold gate: you hold a SET of capabilities. A node is reachable if it needs
      // no credentials (always doable), if you hold its tier, or if you hold Domain
      // Admin (does everything). An untagged node (no `needs`) is never gated.
      if (hold.size > 0 && def.needs) {
        const reachable =
          def.needs === 'none' || hold.has(def.needs) || hold.has('domain-admin');
        if (!reachable) return true;
      }
      return false;
    },
    [model, versionFilter, hold],
  );

  // Picking a node (by click or expand) makes it THE selected node and the lit
  // attack path follows the route the user CLICKED to reach it (the `trail` of
  // waypoints — extend forward, rewind back, or start fresh; see `nextTrail`).
  // Re-clicking the selected node clears it. Edge/node selection are exclusive.
  const selectNode = useCallback(
    (id: string) => {
      setSelectedEdgeId(null);
      if (selection.selectedId === id) {
        setTrail([]);
        selection.clear(); // re-click → deselect
      } else {
        setTrail((prev) => nextTrail(prev, id, rendered.graph, model.rootId, rendered.backEdges));
        selection.select(id);
      }
    },
    [selection, rendered, model.rootId],
  );
  const selectEdge = useCallback(
    (eid: string) => {
      selection.clear();
      setSelectedEdgeId(eid);
    },
    [selection],
  );
  const clearAll = useCallback(() => {
    selection.clear();
    setSelectedEdgeId(null);
    setTrail([]);
    setPathOnly(false);
  }, [selection]);

  // Search / breadcrumb jumps reveal the key (it may not be visible yet) then make
  // it the single focus, RESETTING the trail to the natural route to that key —
  // a jump isn't a forward step in the current path.
  const revealAndSelect = useCallback(
    (key: string) => {
      expansion.expandMany(keyLineage(model, key));
      setSelectedEdgeId(null);
      setTrail([key]);
      selection.select(key);
    },
    [expansion, selection, model],
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
      const segs: string[][] = [];
      let from = model.rootId;
      let connected = true;
      for (const wp of wps) {
        const seg = pathInRendered(rendered.graph, from, wp, rendered.backEdges); // forward from → wp
        if (wp !== from && (seg.length < 2 || seg[0] !== from)) {
          connected = false; // a waypoint became unreachable — bail to the simple route
          break;
        }
        segs.push(seg);
        from = wp;
      }
      const route = connected ? segs.flat() : pathInRendered(rendered.graph, model.rootId, sel, rendered.backEdges);
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
      const siblingKeys: string[] = [];
      if (parentKey) for (const e of g.edges) if (e.source === parentKey) siblingKeys.push(e.target);
      // Immediate next steps = sel's rendered children, skipping any that loop back into
      // the route/siblings so the slice stays acyclic.
      const nextKeys = new Set<string>();
      for (const e of g.edges) {
        if (e.source !== sel || routeKeys.has(e.target) || siblingKeys.includes(e.target)) continue;
        nextKeys.add(e.target);
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
  }, [focusActive, pathOnly, activePath, selection.selectedId, model, rendered]);

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
      : resolveUnroll(model, new Set([...expansion.expanded, sel])).graph;
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

  const interaction: GraphInteraction = useMemo(
    () => ({
      model,
      getDef: (id) => model.nodes.get(id),
      hasChildren: (id) => modelHasChildren(model, id),
      // Chevron state reflects what the canvas actually draws — in focus mode that
      // is the re-rooted slice, otherwise the user's real expansion.
      isExpanded: (id) => expansion.expanded.has(id),
      isSelected: (id) => selection.selectedId === id,
      isDimmed,
      hasSelection: selection.selectedId != null || selectedEdgeId != null,
      focusActive,
      isNextStep: (id) => !!nextStepDefs?.has(id),
      isSibling: (id) => !!siblingDefs?.has(id),
      isNodeActive: (id) => activePath.nodes.has(id),
      isEdgeActive: (eid) => activePath.edges.has(eid),
      isEdgeSelected: (eid) => selectedEdgeId === eid,
      isOwned: annotations.isOwned,
      isInapplicable: annotations.isInapplicable,
      hasNote: annotations.hasNote,
      getNote: annotations.getNote,
      notesInline,
      phaseColor: (pid) => model.phases.get(pid)?.color ?? '#7c8aa0',
      phaseLabel: (pid) => model.phases.get(pid)?.label ?? pid,
      reduceMotion,
      // In focus mode every node click re-centres the view on that node (its parent
      // becomes the local root), so the chevron navigates like the body does.
      toggle: focusActive ? selectNode : expansion.toggle,
      select: selectNode,
      selectEdge,
      openMenu,
      openNote,
    }),
    [model, expansion.expanded, expansion.toggle, focusActive, selection.selectedId, selectNode, selectEdge, selectedEdgeId, isDimmed, activePath, nextStepDefs, siblingDefs, annotations.isOwned, annotations.isInapplicable, annotations.hasNote, annotations.getNote, notesInline, openMenu, openNote, reduceMotion],
  );

  // Focus mode: keep the selected node's full lineage (and the node itself) in the
  // REAL expansion set so the root-based `rendered` graph always contains it — that
  // is what lets us look up its parent (the re-root) and resolve clicks on its
  // freshly-revealed children. Additive, so it never collapses what the user opened;
  // deps exclude `expanded` to avoid a loop.
  const { expandMany } = expansion;
  useEffect(() => {
    if (!focusMode || !selection.selectedId) return;
    expandMany([...keyLineage(model, selection.selectedId), selection.selectedId]);
  }, [focusMode, selection.selectedId, model, expandMany]);

  // Keep the URL hash in sync so the current view is shareable / bookmarkable.
  useEffect(() => {
    writeDeepLink({
      mapId: map.id,
      open: [...expansion.expanded].filter((id) => id !== model.rootId),
      sel: selection.selectedId,
    });
  }, [expansion.expanded, selection.selectedId, map.id, model.rootId]);

  // ⌘K / Ctrl-K opens the search even when the toolbar is collapsed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setToolsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // `selectedId` is a render KEY (may be an unrolled instance); resolve content by
  // its def id, but drive expansion/breadcrumb by the key so the right instance wins.
  const selectedKey = selection.selectedId;
  const selectedDef = selectedKey ? model.nodes.get(defIdOf(selectedKey)) ?? null : null;
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

  const filterActive = versionFilter != null || hold.size > 0;

  return (
    <GraphInteractionProvider value={interaction}>
      <HoverProvider value={{ hoveredId, hoverEdges, canHover }}>
      <ReactFlowProvider>
        <GraphCanvas
          model={model}
          expanded={expansion.expanded}
          lastToggled={expansion.lastToggled}
          selectedId={selection.selectedId}
          reduceMotion={reduceMotion}
          onBackgroundClick={clearAll}
          onNodeHover={onNodeHover}
          notesLayoutKey={notesInline ? annotations.notedIds.join(',') : ''}
          isolate={isolate}
          activeEdges={activePath.edges}
          peerEdges={peerEdges}
          selectedEdgeId={selectedEdgeId}
          hasSelection={selection.selectedId != null || selectedEdgeId != null}
        />
      </ReactFlowProvider>

      {/* Top overlay: collapsible search + filter chips */}
      <div className="pointer-events-none absolute inset-x-0 top-2.5 z-20 flex flex-col items-center gap-1.5 px-2">
        {!toolsOpen ? (
          <button
            type="button"
            onClick={() => setToolsOpen(true)}
            className="group pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-panel/80 py-1.5 pl-3 pr-2 text-[12px] text-ink-dim shadow-[var(--shadow-card)] backdrop-blur-xl transition-colors hover:border-border-strong hover:text-ink"
          >
            <SearchIcon className="h-4 w-4" />
            <span>Search</span>
            <kbd className="rounded border border-border px-1.5 py-px text-[10px] text-ink-faint">⌘K</kbd>
            {filterActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent" title="filters active" />
            )}
          </button>
        ) : (
          <>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <SearchBox nodes={map.nodes} onPick={revealAndSelect} phaseColor={interaction.phaseColor} />
              <button
                type="button"
                onClick={() => setToolsOpen(false)}
                aria-label="Hide search & filters"
                className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-panel/80 p-2 text-ink-dim shadow-[var(--shadow-card)] backdrop-blur-xl transition-colors hover:text-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            {(footholdAware || versionAware) && (
              <div className="pointer-events-auto flex max-w-[min(94vw,660px)] flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-panel/75 px-2 py-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl">
                {footholdAware && (
                  <div
                    className="flex items-center gap-1"
                    title="Toggle what you currently hold; techniques you can't yet reach dim out"
                  >
                    <span className="text-[11px] text-ink-faint">I hold</span>
                    {FOOTHOLDS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setHold((s) => {
                            const next = new Set(s);
                            if (next.has(f.id)) next.delete(f.id);
                            else next.add(f.id);
                            return next;
                          })
                        }
                        title={f.hint}
                        className={[
                          'rounded-full px-2 py-0.5 text-[11px] transition-colors',
                          hold.has(f.id) ? 'bg-white/[0.08] text-ink' : 'text-ink-dim hover:text-ink',
                        ].join(' ')}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
                {footholdAware && versionAware && (
                  <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
                )}
                {versionAware && (
                  <label className="flex items-center gap-1.5 text-[11px] text-ink-dim">
                    <span className="text-ink-faint">Target</span>
                    <select
                      value={versionFilter ?? ''}
                      onChange={(e) => setVersionFilter(e.target.value || null)}
                      title="Dim techniques that don't apply to this Windows version"
                      className="rounded-md border border-border bg-bg-soft px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-border-strong"
                    >
                      <option value="">All versions</option>
                      {(['client', 'server'] as const).map((fam) => {
                        const opts = WINDOWS_VERSIONS.filter(
                          (v) => v.family === fam && mapVersionIds.has(v.id),
                        );
                        if (opts.length === 0) return null;
                        return (
                          <optgroup key={fam} label={fam === 'client' ? 'Client' : 'Server'}>
                            {opts.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </label>
                )}
                {filterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setVersionFilter(null);
                      setHold(new Set());
                    }}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-dim transition-colors hover:text-ink"
                  >
                    Clear
                    <CloseIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Legend phases={map.phases} />
      <NodeDetailPanel
        def={selectedDef}
        phaseColor={selectedDef ? interaction.phaseColor(selectedDef.phase) : '#7c8aa0'}
        phaseLabel={selectedDef ? interaction.phaseLabel(selectedDef.phase) : ''}
        reduceMotion={reduceMotion}
        path={breadcrumb}
        nextSteps={nextSteps}
        onPickNext={pickNext}
        pathOnly={pathOnly}
        onTogglePathOnly={() => setPathOnly((p) => !p)}
        onNavigate={revealAndSelect}
        onClose={clearAll}
        owned={selection.selectedId != null && annotations.isOwned(selection.selectedId)}
        onToggleOwned={() => selection.selectedId && annotations.toggleOwned(selection.selectedId)}
        inapplicable={selection.selectedId != null && annotations.isInapplicable(selection.selectedId)}
        onToggleInapplicable={() => selection.selectedId && annotations.toggleInapplicable(selection.selectedId)}
        note={selection.selectedId ? annotations.getNote(selection.selectedId) : ''}
        onNoteChange={(t) => selection.selectedId && annotations.setNote(selection.selectedId, t)}
        autoFocusNote={selection.selectedId != null && focusNotesFor === selection.selectedId}
        onNoteFocused={() => setFocusNotesFor(null)}
      />
      <EdgeDetailPanel
        edge={selectedEdge}
        sourceColor={selectedEdge?.sourceDef ? interaction.phaseColor(selectedEdge.sourceDef.phase) : '#7c8aa0'}
        targetColor={selectedEdge?.targetDef ? interaction.phaseColor(selectedEdge.targetDef.phase) : '#7c8aa0'}
        reduceMotion={reduceMotion}
        onSelectNode={revealAndSelect}
        onClose={clearAll}
      />
      {menu && (
        <NodeContextMenu
          target={menu}
          def={model.nodes.get(menu.defId) ?? null}
          owned={annotations.isOwned(menu.key)}
          inapplicable={annotations.isInapplicable(menu.key)}
          hasNote={annotations.hasNote(menu.key)}
          onClose={closeMenu}
          onCopyLink={() => copyLink(menu.defId)}
          onToggleOwned={() => annotations.toggleOwned(menu.key)}
          onToggleInapplicable={() => annotations.toggleInapplicable(menu.key)}
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
