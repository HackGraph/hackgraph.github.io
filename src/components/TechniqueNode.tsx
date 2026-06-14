import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { AppNode } from '../graph/appNode';
import { useGraphInteraction } from '../graph/GraphInteractionContext';
import { ChevronRightIcon, FolderIcon } from '../ui/icons';

function TechniqueNodeImpl({ id, data }: NodeProps<AppNode>) {
  const {
    model,
    getDef,
    isExpanded,
    isSelected,
    isDimmed,
    hasSelection,
    isNodeActive,
    isNextStep,
    phaseColor,
    phaseLabel,
    toggle,
    select,
    reduceMotion,
  } = useGraphInteraction();
  // A repeated/unrolled node renders under a distinct render KEY (the React Flow
  // `id`, e.g. `parent~defId`) while pointing at ONE content def. Expansion is
  // per-instance, so it keys on `key`; content/selection/highlight key on `defId`.
  const key = id;
  const defId = data?.defId ?? id;
  const def = getDef(defId);
  if (!def) return null;

  const expanded = isExpanded(key);
  const selected = isSelected(key);
  const active = isNodeActive(key); // on the focused path (includes the selected node)
  const dimmed = isDimmed(defId);
  const color = phaseColor(def.phase);
  const isGoal = def.kind === 'goal';
  const isStart = def.kind === 'start';
  const isCategory = def.kind === 'category';
  const instanceIndex = data?.instanceIndex ?? 1;

  const childCount = model.childrenOf.get(defId)?.length ?? 0;
  // The root is now an ordinary collapsible node too, so it gets a chevron.
  const showToggle = childCount > 0;
  const toolCount = def.tools?.length ?? 0;
  const cmdCount = def.commands?.length ?? 0;

  // "Isolate path" mode: nodes off the lit path are faded fully out (kept mounted
  // so the toggle glides). Focus mode: when something is selected, nodes off the
  // lit path recede so the chosen path stands out — EXCEPT the direct next steps
  // off the selected node, which stay fully visible so the next choice is easy.
  const faded = !!data?.faded;
  const recede = hasSelection && !active && !isNextStep(defId);
  const opacity = faded ? 0 : dimmed ? 0.16 : recede ? 0.3 : 1;

  const entrance = {
    initial: reduceMotion ? false : { opacity: 0, scale: 0.97, y: 2 },
    animate: { opacity, scale: 1, y: selected ? -1 : 0 },
    transition: {
      opacity: { duration: 0.28, ease: 'easeOut' as const },
      default: reduceMotion
        ? { duration: 0 }
        : {
            type: 'spring' as const,
            stiffness: 460,
            damping: 34,
            delay: Math.min(data.staggerIndex * 0.04, 0.34),
          },
    },
  };

  // On-path nodes get a clear accent border + ring + tint so the chosen path is
  // obvious; the selected endpoint lifts and rings strongest.
  const borderColor = selected || active ? 'var(--color-accent)' : 'var(--color-border)';
  const boxShadow = selected
    ? '0 0 0 2px var(--color-accent), var(--shadow-lift)'
    : active
      ? '0 0 0 1px var(--color-accent), var(--shadow-card)'
      : 'var(--shadow-card)';
  const background = selected
    ? 'color-mix(in oklab, var(--color-accent) 16%, var(--color-panel))'
    : active
      ? 'color-mix(in oklab, var(--color-accent) 12%, var(--color-panel))'
      : `color-mix(in oklab, ${color} 11%, var(--color-panel))`;

  const port = showToggle && (
    <button
      type="button"
      aria-label={expanded ? 'Collapse' : `Reveal ${childCount} next step${childCount === 1 ? '' : 's'}`}
      title={expanded ? 'Collapse' : `Reveal ${childCount}`}
      onClick={(e) => {
        e.stopPropagation();
        toggle(key);
        // While building a path (something is selected), expanding a node moves the
        // selection onto it — so its children become the lit frontier. Never on the
        // already-selected node (that would deselect it via the re-click rule).
        if (hasSelection && !selected) select(key);
      }}
      className="absolute right-0 top-1/2 z-10 flex h-6 min-w-[24px] -translate-y-1/2 translate-x-1/2 items-center justify-center gap-0.5 rounded-full border border-border bg-panel-2 px-1.5 text-[11px] text-ink-dim shadow-[var(--shadow-card)] transition-colors hover:border-border-strong hover:text-ink"
    >
      {!expanded && <span className="tabular-nums">{childCount}</span>}
      <ChevronRightIcon
        className="h-3 w-3 transition-transform duration-200"
        style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
      />
    </button>
  );

  // ---- Category = a "group" of techniques. Body click selects it (opens its
  // high-level description); the chevron expands/collapses — same as a technique.
  if (isCategory) {
    return (
      <motion.div
        {...entrance}
        onClick={() => select(key)}
        className="group relative w-[212px] cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-colors"
        style={{
          borderColor,
          boxShadow,
          pointerEvents: faded ? 'none' : undefined,
          background: selected
            ? 'color-mix(in oklab, var(--color-accent) 14%, var(--color-panel))'
            : `color-mix(in oklab, ${color} 9%, var(--color-panel))`,
        }}
      >
        <Handle type="target" position={Position.Left} isConnectable={false} />
        <Handle type="source" position={Position.Right} isConnectable={false} />
        {port}
        <div className="flex items-center gap-2">
          <FolderIcon className="h-4 w-4 shrink-0" style={{ color }} />
          <span className="text-[13px] font-medium leading-tight text-ink">{def.label}</span>
        </div>
        <div className="mt-1 pl-6 text-[11px] text-ink-faint">
          {childCount} technique{childCount === 1 ? '' : 's'}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...entrance}
      onClick={() => select(key)}
      className="group relative w-[228px] cursor-pointer rounded-xl border bg-panel px-3.5 py-3 text-left transition-colors hover:border-border-strong"
      style={{ borderColor, boxShadow, background, pointerEvents: faded ? 'none' : undefined }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <Handle type="source" position={Position.Right} isConnectable={false} />
      {port}

      {/* phase / kind line — phase carries the colour */}
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span>{isGoal ? 'Goal' : isStart ? 'Start' : phaseLabel(def.phase)}</span>
      </div>

      {/* title */}
      <div className="text-[13.5px] font-semibold leading-snug text-ink">
        {def.label}
        {instanceIndex > 1 && (
          <span className="ml-1.5 align-baseline text-[11px] font-medium tabular-nums text-ink-faint">
            #{instanceIndex}
          </span>
        )}
      </div>

      {/* summary */}
      {def.summary && (
        <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink-dim">{def.summary}</div>
      )}

      {/* footer */}
      {(toolCount > 0 || cmdCount > 0) && (
        <div className="mt-2 text-[10.5px] text-ink-faint">
          {[toolCount && `${toolCount} tool${toolCount === 1 ? '' : 's'}`, cmdCount && `${cmdCount} cmd${cmdCount === 1 ? '' : 's'}`]
            .filter(Boolean)
            .join('  ·  ')}
        </div>
      )}
    </motion.div>
  );
}

/** Memoized: re-renders only when id/data change or context (selection/expansion/
 *  focus) updates. nodeTypes referencing this MUST be a module-level constant. */
export const TechniqueNode = memo(TechniqueNodeImpl);
