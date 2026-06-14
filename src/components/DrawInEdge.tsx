import { memo, useState } from 'react';
import {
  getSmoothStepPath,
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { motion } from 'framer-motion';
import type { AppEdge } from '../graph/appNode';
import { useGraphInteraction } from '../graph/GraphInteractionContext';
import { useHover } from '../graph/HoverContext';

function DrawInEdgeImpl({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<AppEdge>) {
  const { reduceMotion, selectEdge } = useGraphInteraction();
  const { hoveredId, hoverEdges, canHover } = useHover();
  const [edgeHover, setEdgeHover] = useState(false);
  // Honour hover-enter only when the pointer genuinely moved — never when this
  // edge slides under a still cursor during a selection's camera pan (see
  // HoverContext.canHover). Leave always clears.
  const enterHover = () => {
    if (canHover()) setEdgeHover(true);
  };

  // Emphasis comes from edge DATA (reliable repaint), not context.
  const active = !!data?.active;
  const selected = !!data?.selected;
  const backward = !!data?.backward;
  // "Isolate path" mode: edges not fully on the lit path fade out (kept mounted so
  // the toggle glides instead of popping a whole edge layer).
  const faded = !!data?.faded;
  // Backward (loop-back) edges curve gently; forward edges use the orthogonal
  // conduit look. The curve reads as an intentional "returns to an earlier step".
  const [path, labelX, labelY] = backward
    ? getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature: 0.45 })
    : getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 16 });

  // Trace-on-demand: hovering a node lights its incident edges; hovering an edge
  // lights just that one. Anything not emphasised recedes so the path is clear.
  // Hover lights the hovered node's whole lineage (root → node) plus its own
  // outgoing edges — so you trace the full path to it, not just the parent edge.
  const incident = hoverEdges.has(id) || (hoveredId != null && source === hoveredId);
  const emphasized = active || selected || edgeHover || incident;
  const focusOn = !!data?.dimIdle || hoveredId != null;
  // A next step off the selected node stays at full (resting) visibility so the
  // connection to the next choice is clear, even while everything else recedes.
  const deemphasized = focusOn && !emphasized && !data?.nextStep;

  // Resting edges read as ONE slightly-more-apparent unit: a marginally lighter,
  // marginally thicker warm line + a modest matching head (not a big red arrow).
  // Emphasis = accent line + accent head, still restrained in size. Literal colors
  // (not CSS vars) so framer-motion can drive them via `animate` — which reliably
  // re-applies on re-render, unlike a `style` prop it considers static.
  const stroke = emphasized ? '#f04450' : deemphasized ? '#342b2d' : '#4b3e41';
  const strokeWidth = emphasized ? 2.75 : 1.75;
  const baseOpacity = faded ? 0 : deemphasized ? 0.12 : backward && !emphasized ? 0.55 : 1;
  const onPick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectEdge(id);
  };

  // The arrowhead is the directional cue, so it gets its own per-edge marker that
  // tracks emphasis: a bold red head when lit, a clearly-visible warm head at
  // rest (brighter than the hairline so it reads), and a dim head when receded.
  // userSpaceOnUse decouples the head size from strokeWidth (the 3.25px lit edge
  // would otherwise blow the arrow up ~3x) while still scaling with graph zoom.
  const markerId = `hg-arrow-${id}`;
  const arrowColor = emphasized
    ? 'var(--color-accent)'
    : deemphasized
      ? 'var(--color-edge)'
      : '#6e5b5f';
  const arrowSize = emphasized ? 15 : deemphasized ? 11 : 12.5;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9.5"
          refY="5"
          markerWidth={arrowSize}
          markerHeight={arrowSize}
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 L2.6,5 z" fill={arrowColor} style={{ transition: 'fill 0.2s ease' }} />
        </marker>
      </defs>
      {/* fat, invisible hit area so the thin conduit is easy to click + hover */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer', pointerEvents: faded ? 'none' : 'stroke' }}
        onClick={onPick}
        onMouseEnter={enterHover}
        onMouseLeave={() => setEdgeHover(false)}
      />
      <motion.path
        id={id}
        d={path}
        fill="none"
        // NOT `react-flow__edge-path`: React Flow's CSS for that class sets `stroke`,
        // which would override ours. A neutral class keeps it free of that rule.
        className="hg-edge-path"
        markerEnd={`url(#${markerId})`}
        strokeDasharray={backward ? '5 5' : undefined}
        style={{ pointerEvents: 'none' }}
        // stroke/width via `animate`: framer-motion re-applies animate targets on
        // every render, whereas it ignores later changes to the `style` prop for a
        // motion component's own animated/SVG props.
        initial={reduceMotion ? { stroke, strokeWidth } : { pathLength: 0, opacity: 0, stroke, strokeWidth }}
        animate={{ pathLength: 1, opacity: baseOpacity, stroke, strokeWidth }}
        transition={{
          pathLength: { duration: reduceMotion ? 0 : 0.4, ease: 'easeOut', delay: reduceMotion ? 0 : 0.08 },
          opacity: { duration: 0.22, ease: 'easeOut' },
          stroke: { duration: 0.2, ease: 'easeOut' },
          strokeWidth: { duration: 0.2, ease: 'easeOut' },
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={onPick}
            onMouseEnter={enterHover}
            onMouseLeave={() => setEdgeHover(false)}
            className={[
              'absolute cursor-pointer rounded-md border px-1.5 py-0.5 text-[10px] leading-none transition-colors',
              emphasized
                ? 'border-accent bg-panel-2 text-ink'
                : 'border-border bg-panel-2/85 text-ink-dim hover:border-border-strong hover:text-ink',
            ].join(' ')}
            style={{
              // sits in the gap dagre reserved for it; lift above the node layer
              zIndex: emphasized ? 1001 : 1000,
              pointerEvents: faded ? 'none' : 'all',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              opacity: faded ? 0 : deemphasized ? 0.25 : 1,
            }}
          >
            {data.label}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DrawInEdge = memo(DrawInEdgeImpl);
