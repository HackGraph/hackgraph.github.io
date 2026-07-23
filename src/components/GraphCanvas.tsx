import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphModel, NodeId } from '../graph/buildModel';
import type { IsolatePath } from '../graph/visibility';
import type { AppEdge } from '../graph/appNode';
import { useGraphView } from '../graph/useGraphView';
import { useHover } from '../graph/HoverContext';
import { TechniqueNode } from './TechniqueNode';
import { DrawInEdge } from './DrawInEdge';

// MUST be module-level constants — inlining these remounts every node/edge each
// render and destroys the animations.
const nodeTypes = { technique: TechniqueNode };
const edgeTypes = { drawin: DrawInEdge };
// No markerEnd here — DrawInEdge renders its own per-edge marker whose colour and
// size track the edge's emphasis state (see DrawInEdge.tsx).
const defaultEdgeOptions = { type: 'drawin' };

interface GraphCanvasProps {
  model: GraphModel;
  expanded: ReadonlySet<NodeId>;
  lastToggled: NodeId;
  selectedId: NodeId | null;
  reduceMotion: boolean;
  onBackgroundClick: () => void;
  /** Signature that changes when inline-note heights change — forces a re-layout. */
  notesLayoutKey: string;
  /** "Isolate path" mode — render only this instanced attack path. */
  isolate?: IsolatePath | null;
  /** Whether the detail panel is showing — the focus camera reserves its space. */
  panelOpen?: boolean;
  /** Focus-mode camera intent: 'node' (body click → centre) vs 'children' (chevron → frame next steps). */
  focusCam?: 'node' | 'children';
  /** Render keys of edges on the lit attack path (fed to edge data for repaint). */
  activeEdges: ReadonlySet<string>;
  /** Edges out of the selected node's parent (parent → siblings) — kept un-dimmed so
   *  the alternatives at that step read as connected branches. */
  peerEdges: ReadonlySet<string>;
  /** The currently open edge's id, and whether any node/edge is selected. */
  selectedEdgeId: string | null;
  hasSelection: boolean;
}

function GraphCanvasImpl({
  model,
  expanded,
  lastToggled,
  selectedId,
  reduceMotion,
  onBackgroundClick,
  notesLayoutKey,
  isolate,
  panelOpen,
  focusCam,
  activeEdges,
  peerEdges,
  selectedEdgeId,
  hasSelection,
}: GraphCanvasProps) {
  // Node hover goes STRAIGHT to the hover store (never through MapView state), so a
  // hover enter/leave re-renders only the edges whose emphasis changed — see HoverStore.
  const hover = useHover();
  const onNodeEnter = useCallback((_: unknown, n: { id: string }) => hover.setHovered(n.id), [hover]);
  const onNodeLeave = useCallback(() => hover.setHovered(null), [hover]);
  const { nodes, edges, onNodesChange, ready, tweening } = useGraphView({
    model,
    expanded,
    lastToggled,
    selectedId,
    reduceMotion,
    isolate,
    notesLayoutKey,
    panelOpen,
    focusCam,
  });

  // Emphasis travels through edge DATA (not context): React Flow does not
  // reliably repaint edge components on a context change, but it does when the
  // edge object changes. Re-decorates only when the active set / selection moves.
  //
  // `useGraphView` rebuilds the upstream `edges` array fresh on every reconcile, so we
  // can't preserve identity by comparing against it (the prior decoration fields aren't
  // there to match). Instead diff each edge against the LAST decorated output by VALUE:
  // an edge whose every render-affecting field is unchanged reuses its prior object, so
  // its memoized `DrawInEdge` skips re-rendering. Without this all ~115 edges re-rendered
  // on every selection/focus switch — the bulk of the reconcile jank on weak hardware.
  const prevDecoratedRef = useRef<Map<string, AppEdge>>(new Map());
  const decoratedEdges = useMemo(() => {
    // React Flow paints edges in ARRAY ORDER within one SVG layer (per-edge zIndex
    // doesn't reorder them), so a lit/clicked edge can be hidden where a later regular
    // edge crosses it. Decorate each edge, then move the emphasised ones (on the lit
    // path, or the clicked edge) to the END so they paint on top. Edges keep their `id`
    // key, so reordering moves the DOM node without remounting it — the draw-in
    // animation survives. (Edges still sit below the nodes layer.)
    const prev = prevDecoratedRef.current;
    const nextMap = new Map<string, AppEdge>();
    const base: AppEdge[] = [];
    const top: AppEdge[] = [];
    for (const e of edges) {
      const active = activeEdges.has(e.id);
      const selected = e.id === selectedEdgeId;
      const nextStep = e.source === selectedId; // a next step off the selected node
      const peer = peerEdges.has(e.id); // parent → sibling (alternative at this step)
      const p = prev.get(e.id);
      const reuse =
        p &&
        p.source === e.source &&
        p.target === e.target &&
        p.data?.label === e.data?.label &&
        p.data?.backward === e.data?.backward &&
        p.data?.faded === e.data?.faded &&
        p.data?.active === active &&
        p.data?.selected === selected &&
        p.data?.dimIdle === hasSelection &&
        p.data?.nextStep === nextStep &&
        p.data?.peer === peer;
      const out: AppEdge = reuse
        ? p
        : { ...e, data: { ...e.data, active, selected, dimIdle: hasSelection, nextStep, peer } };
      nextMap.set(e.id, out);
      (active || selected ? top : base).push(out);
    }
    prevDecoratedRef.current = nextMap;
    return [...base, ...top];
  }, [edges, activeEdges, peerEdges, selectedEdgeId, hasSelection, selectedId]);

  // While the camera pans/zooms, the whole graph slides behind the fixed overlays
  // (minimap, controls, legend, search, toolbar). Their `backdrop-filter: blur`
  // would then re-blur every frame — the dominant cost of camera movement. Drop the
  // blur for the duration of the move (imperative body class, no re-render) and let
  // it return a beat after; you can't perceive a static blur mid-glide anyway. Fires
  // for BOTH user pan/zoom and programmatic setCenter/fitView.
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onMoveStart = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    document.body.classList.add('hg-camera-moving');
  }, []);
  const onMoveEnd = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => document.body.classList.remove('hg-camera-moving'), 120);
  }, []);
  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
      document.body.classList.remove('hg-camera-moving');
    },
    [],
  );

  return (
    <div
      className={`h-full w-full transition-opacity duration-500${tweening ? ' hg-tweening' : ''}`}
      style={{ opacity: ready ? 1 : 0 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        edgesFocusable={false}
        minZoom={0.18}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        onPaneClick={onBackgroundClick}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onNodeMouseEnter={onNodeEnter}
        onNodeMouseLeave={onNodeLeave}
      >
        <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="var(--color-dot)" />
        <Controls position="top-left" showInteractive={false} className="hg-controls" />
        {/* No MiniMap: on a 100-200 node graph it re-renders every node rect on each store
            change (every expand/collapse reconcile) and is desktop-only, so it was the bulk of
            the desktop sluggishness for no benefit on mobile. Removed; if overview navigation is
            wanted back, add it behind a setting (off by default) or a render-on-idle wrapper. */}
      </ReactFlow>
    </div>
  );
}

/** Memoised so hovering nodes (which only updates a sibling hover context) never
 *  re-runs the layout/reconcile pipeline — props are stable across hover moves. */
export const GraphCanvas = memo(GraphCanvasImpl);
