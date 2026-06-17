import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphModel, NodeId } from '../graph/buildModel';
import type { IsolatePath } from '../graph/visibility';
import { useGraphView } from '../graph/useGraphView';
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
  /** Hovered-node tracking for trace-on-hover edge highlighting. */
  onNodeHover: (id: NodeId | null) => void;
  /** "Isolate path" mode — render only this instanced attack path. */
  isolate?: IsolatePath | null;
  /** Render keys of edges on the lit attack path (fed to edge data for repaint). */
  activeEdges: ReadonlySet<string>;
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
  onNodeHover,
  isolate,
  activeEdges,
  selectedEdgeId,
  hasSelection,
}: GraphCanvasProps) {
  const { nodes, edges, onNodesChange, ready, tweening } = useGraphView({
    model,
    expanded,
    lastToggled,
    selectedId,
    reduceMotion,
    isolate,
  });

  // Emphasis travels through edge DATA (not context): React Flow does not
  // reliably repaint edge components on a context change, but it does when the
  // edge object changes. Re-decorates only when the active set / selection moves.
  const decoratedEdges = useMemo(
    () =>
      edges.map((e) => {
        const active = activeEdges.has(e.id);
        const selected = e.id === selectedEdgeId;
        const nextStep = e.source === selectedId; // a next step off the selected node
        return e.data?.active === active &&
          e.data?.selected === selected &&
          e.data?.dimIdle === hasSelection &&
          e.data?.nextStep === nextStep
          ? e
          : { ...e, data: { ...e.data, active, selected, dimIdle: hasSelection, nextStep } };
      }),
    [edges, activeEdges, selectedEdgeId, hasSelection, selectedId],
  );

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
        onNodeMouseEnter={(_, n) => onNodeHover(n.id)}
        onNodeMouseLeave={() => onNodeHover(null)}
      >
        <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="var(--color-dot)" />
        <Controls position="top-left" showInteractive={false} className="hg-controls" />
        <MiniMap
          pannable
          zoomable
          className="hg-minimap hidden sm:block"
          maskColor="var(--color-minimap-mask)"
          nodeColor={(n) => {
            // Strip any isolate-instance suffix (`defId__2`) back to the content id.
            const baseId = n.id.includes('__') ? n.id.slice(0, n.id.indexOf('__')) : n.id;
            const def = model.nodes.get(baseId);
            return def ? (model.phases.get(def.phase)?.color ?? '#3c3133') : '#3c3133';
          }}
          nodeStrokeWidth={0}
        />
      </ReactFlow>
    </div>
  );
}

/** Memoised so hovering nodes (which only updates a sibling hover context) never
 *  re-runs the layout/reconcile pipeline — props are stable across hover moves. */
export const GraphCanvas = memo(GraphCanvasImpl);
