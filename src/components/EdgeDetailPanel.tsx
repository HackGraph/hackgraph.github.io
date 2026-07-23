import { memo, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { TechniqueNodeDef } from '../data/schema';
import { useIsMobile } from '../state/useIsMobile';
import { reportEdgeIssueUrl } from '../state/reportIssue';
import { GlossaryText } from './GlossaryText';
import { ChevronRightIcon, CloseIcon, FlagIcon, MinusIcon } from '../ui/icons';

export interface EdgeDetail {
  id: string;
  source: string;
  target: string;
  label?: string;
  description?: string;
  sourceDef?: TechniqueNodeDef;
  targetDef?: TechniqueNodeDef;
}

interface EdgeDetailPanelProps {
  edge: EdgeDetail | null;
  sourceColor: string;
  targetColor: string;
  /** Current map name — used in the pre-filled "report an issue" link. */
  mapName: string;
  reduceMotion: boolean;
  onSelectNode: (id: string) => void;
  onClose: () => void;
}

function NodeChip({
  def,
  color,
  role,
  onClick,
}: {
  def: TechniqueNodeDef | undefined;
  color: string;
  role: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg-soft px-3 py-2 text-left transition-colors hover:border-border-strong"
    >
      <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1">
        <span className="block text-2xs uppercase tracking-[0.1em] text-ink-faint">{role}</span>
        <span className="block truncate text-base font-medium text-ink">{def?.label ?? '—'}</span>
      </span>
    </button>
  );
}

function EdgeDetailPanelImpl({
  edge,
  sourceColor,
  targetColor,
  mapName,
  reduceMotion,
  onSelectNode,
  onClose,
}: EdgeDetailPanelProps) {
  const isMobile = useIsMobile();
  // Mobile: open as a compact bottom PEEK (matching NodeDetailPanel); expand to the
  // full sheet only when you choose to read. Desktop always shows the full right rail.
  // `key={edge.id}` remounts per edge, so each new edge starts collapsed.
  const [peekExpanded, setPeekExpanded] = useState(false);
  const collapsed = isMobile && !peekExpanded;
  // Drag starts only from the grabber/header (dragListener off) so scrolling the body
  // never drags the sheet; the close/collapse buttons opt out via data-no-drag.
  const dragControls = useDragControls();
  const startDrag = (e: React.PointerEvent) => {
    if (!isMobile) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    dragControls.start(e);
  };
  const hidden = reduceMotion
    ? { opacity: 0 }
    : isMobile
      ? { y: 28, opacity: 0 }
      : { x: 24, opacity: 0 };

  const s = edge?.sourceDef?.label ?? 'this step';
  const t = edge?.targetDef?.label ?? 'the next step';
  const explanation =
    edge?.description ??
    (edge?.label
      ? `From “${s}”, ${edge.label} enables “${t}”.`
      : `“${s}” leads to “${t}”.`);

  return (
    <AnimatePresence>
      {edge && (
        <motion.aside
          key={edge.id}
          initial={hidden}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={hidden}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          drag={isMobile && !collapsed ? 'y' : false}
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            // Dragging the sheet down only ever collapses it back to the peek.
            if (info.offset.y > 6) setPeekExpanded(false);
          }}
          className={[
            'absolute inset-x-2 bottom-2 z-30 flex flex-col overflow-hidden rounded-2xl border border-border bg-panel-2 shadow-[var(--shadow-pop)] [will-change:transform,opacity]',
            // Mobile: expanded spans top-2..bottom-2 (full-screen to the header); collapsed
            // stays a bottom-anchored peek. Desktop (sm+) overrides with its side rail.
            collapsed ? '' : 'top-2',
            'sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[372px]',
          ].join(' ')}
        >
          {collapsed ? (
            /* ---- Mobile PEEK: a one-line bar; tap to expand, X to close ---- */
            <div className="flex items-center gap-1.5 px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => setPeekExpanded(true)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span className="flex shrink-0 items-center gap-0.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: sourceColor }} />
                  <span className="h-2 w-2 rounded-full" style={{ background: targetColor }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-2xs leading-tight text-ink-dim">Path step</span>
                  <span className="block truncate text-lg font-semibold leading-tight text-ink">
                    {edge.label ?? 'Transition'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPeekExpanded(true)}
                aria-label="Show details"
                className="shrink-0 rounded-md p-1.5 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronRightIcon className="h-4 w-4 -rotate-90" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-md p-1.5 text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {/* mobile grabber — drag down / tap collapses to the peek */}
              {isMobile && (
                <button
                  type="button"
                  onPointerDown={startDrag}
                  onClick={() => setPeekExpanded(false)}
                  aria-label="Collapse, drag down to minimise"
                  className="flex w-full shrink-0 cursor-grab touch-none items-center justify-center pb-1.5 pt-3 active:cursor-grabbing"
                >
                  <span className="h-1 w-9 rounded-full bg-border-strong" />
                </button>
              )}
          {/* header — the whole top is a drag handle on mobile (drag down → peek) */}
          <div
            onPointerDown={startDrag}
            className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:cursor-default cursor-grab touch-none active:cursor-grabbing sm:touch-auto"
          >
            <div className="min-w-0">
              <div className="text-2xs uppercase tracking-[0.1em] text-ink-faint">Path step</div>
              <h2 className="mt-1 text-lg font-semibold leading-tight text-ink">
                {edge.label ?? 'Transition'}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {isMobile && (
                <button
                  type="button"
                  data-no-drag
                  onClick={() => setPeekExpanded(false)}
                  aria-label="Collapse"
                  className="cursor-pointer rounded-md p-1.5 text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                data-no-drag
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer rounded-md p-1.5 text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* body */}
          <div className="hg-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <NodeChip def={edge.sourceDef} color={sourceColor} role="From" onClick={() => onSelectNode(edge.source)} />
            <div className="flex items-center gap-2 pl-1.5">
              <span className="h-4 w-px bg-border" />
              {edge.label && <span className="text-xs font-medium text-accent">{edge.label}</span>}
            </div>
            <NodeChip def={edge.targetDef} color={targetColor} role="To" onClick={() => onSelectNode(edge.target)} />

            <p className="pt-1 text-base leading-relaxed text-ink-dim">
              <GlossaryText text={explanation} />
            </p>

            {edge.targetDef?.summary && (
              <div className="space-y-2">
                <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Where this leads
                </h3>
                <p className="text-sm leading-snug text-ink">
                  <GlossaryText text={edge.targetDef.summary} />
                </p>
              </div>
            )}

            {edge.targetDef?.requires && edge.targetDef.requires.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Requires</h3>
                <div className="flex flex-wrap gap-1.5">
                  {edge.targetDef.requires.map((r) => (
                    <span
                      key={r}
                      className="rounded-md bg-bg-soft px-2 py-1 text-xs text-ink-dim"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* footer */}
          <div className="space-y-2.5 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onSelectNode(edge.target)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-fill px-3 py-2 text-base font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Open {edge.targetDef?.label ?? 'target'}
            </button>
            {/* Report an issue — quiet muted link under the primary action. */}
            <a
              href={reportEdgeIssueUrl(
                {
                  source: edge.source,
                  target: edge.target,
                  sourceLabel: edge.sourceDef?.label ?? edge.source,
                  targetLabel: edge.targetDef?.label ?? edge.target,
                },
                mapName,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink-dim"
            >
              <FlagIcon className="h-3 w-3" />
              Report an issue with this edge
            </a>
          </div>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Memoized like NodeDetailPanel — see the note there. */
export const EdgeDetailPanel = memo(EdgeDetailPanelImpl);
