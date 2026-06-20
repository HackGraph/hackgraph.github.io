import { memo, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { AppNode } from '../graph/appNode';
import { useGraphInteraction } from '../graph/GraphInteractionContext';
import { BanIcon, CheckIcon, ChevronRightIcon, FolderIcon, NoteIcon } from '../ui/icons';

const LONG_PRESS_MS = 500;

function TechniqueNodeImpl({ id, data }: NodeProps<AppNode>) {
  const {
    model,
    getDef,
    isExpanded,
    isSelected,
    isDimmed,
    hasSelection,
    focusActive,
    isNodeActive,
    isNextStep,
    isSibling,
    isOwned,
    isInapplicable,
    hasNote,
    getNote,
    notesInline,
    phaseColor,
    phaseLabel,
    toggle,
    select,
    openMenu,
    openNote,
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
  // Annotations are keyed by the RENDER KEY (`key`), not the content `defId`, so two
  // rendered instances of the same convergence hub (e.g. "Valid Domain Credentials"
  // #1 and #2) carry independent marks and notes. For a normal node key === defId.
  const owned = isOwned(key);
  const inapplicable = isInapplicable(key);
  const noted = hasNote(key);
  const note = noted ? getNote(key) : '';
  // Tappable note badge — opens the note in a popover (works on touch, where the
  // hover preview can't). Stops propagation so it doesn't select/long-press the node.
  const noteBadge = noted && (
    <button
      type="button"
      aria-label="View note"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        openNote(key, def.label, e.clientX, e.clientY);
      }}
      className="-m-1 flex items-center justify-center rounded p-1 text-ink-faint transition-colors hover:text-ink"
    >
      <NoteIcon className="h-3 w-3" />
    </button>
  );

  // Long-press opens the context menu on touch (mouse uses native right-click, wired
  // at the canvas level). A drag past ~10px is a pan, not a press, so it cancels.
  const lp = useRef({ timer: 0, fired: false, x: 0, y: 0 });
  const clearLP = () => {
    if (lp.current.timer) window.clearTimeout(lp.current.timer);
    lp.current.timer = 0;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    lp.current.fired = false;
    lp.current.x = e.clientX;
    lp.current.y = e.clientY;
    clearLP();
    lp.current.timer = window.setTimeout(() => {
      lp.current.fired = true;
      openMenu(key, defId, lp.current.x, lp.current.y);
    }, LONG_PRESS_MS);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!lp.current.timer) return;
    const dx = e.clientX - lp.current.x;
    const dy = e.clientY - lp.current.y;
    if (dx * dx + dy * dy > 100) clearLP();
  };
  // Swallow the click that follows a long-press so it doesn't also select the node.
  const onCardClick = () => {
    if (lp.current.fired) {
      lp.current.fired = false;
      return;
    }
    select(key);
  };
  const pressHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: clearLP,
    onPointerCancel: clearLP,
    onPointerLeave: clearLP,
  };

  const childCount = model.childrenOf.get(defId)?.length ?? 0;
  // The root is now an ordinary collapsible node too, so it gets a chevron.
  const showToggle = childCount > 0;
  const toolCount = def.tools?.length ?? 0;
  const cmdCount = def.commands?.length ?? 0;

  // "Isolate path" mode: nodes off the lit path are faded fully out (kept mounted
  // so the toggle glides). Path-building (no focus): nodes off the lit path recede so
  // the chosen path stands out — EXCEPT the selected node's direct next steps AND its
  // siblings (the peers/alternatives at that step), which stay fully visible. Focus
  // mode: the rendered subset IS the curated neighbourhood, so nothing in it recedes.
  const faded = !!data?.faded;
  const recede = hasSelection && !focusActive && !active && !isNextStep(defId) && !isSibling(defId);
  // An inapplicable node is dimmed to read as "ruled out" (but stays clickable so it
  // can be un-marked); an active filter or fade still wins.
  const opacity = faded ? 0 : dimmed ? 0.16 : inapplicable && !active && !selected ? 0.42 : recede ? 0.3 : 1;

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
        {...pressHandlers}
        onClick={onCardClick}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(key, defId, e.clientX, e.clientY);
        }}
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
          <span className={`text-[13px] font-medium leading-tight text-ink${inapplicable ? ' line-through decoration-ink-faint' : ''}`}>
            {def.label}
          </span>
          {(owned || inapplicable || noted) && (
            <span className="ml-auto flex shrink-0 items-center gap-1">
              {noteBadge}
              {inapplicable && <BanIcon className="h-3.5 w-3.5 text-ink-faint" />}
              {owned && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
            </span>
          )}
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
      {...pressHandlers}
      onClick={onCardClick}
      onContextMenu={(e) => {
        e.preventDefault();
        openMenu(key, defId, e.clientX, e.clientY);
      }}
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
        {(owned || inapplicable || noted) && (
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {noteBadge}
            {inapplicable && <BanIcon className="h-3.5 w-3.5 text-ink-faint" />}
            {owned && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
          </span>
        )}
      </div>

      {/* title */}
      <div className={`text-[13.5px] font-semibold leading-snug text-ink${inapplicable ? ' line-through decoration-ink-faint' : ''}`}>
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

      {/* user note shown inline on the card (when the setting is on); otherwise it's
          read by tapping the note badge, which opens a popover */}
      {noted && notesInline && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-border bg-bg-soft px-2 py-1.5">
          <NoteIcon className="mt-px h-3 w-3 shrink-0 text-ink-faint" />
          <span className="line-clamp-3 whitespace-pre-wrap text-[11px] leading-snug text-ink-dim">{note}</span>
        </div>
      )}
    </motion.div>
  );
}

/** Memoized: re-renders only when id/data change or context (selection/expansion/
 *  focus) updates. nodeTypes referencing this MUST be a module-level constant. */
export const TechniqueNode = memo(TechniqueNodeImpl);
