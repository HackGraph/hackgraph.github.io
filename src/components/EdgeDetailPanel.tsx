import { AnimatePresence, motion } from 'framer-motion';
import type { TechniqueNodeDef } from '../data/schema';
import { useIsMobile } from '../state/useIsMobile';
import { CloseIcon } from '../ui/icons';

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
        <span className="block text-[9px] uppercase tracking-[0.1em] text-ink-faint">{role}</span>
        <span className="block truncate text-[13px] font-medium text-ink">{def?.label ?? '—'}</span>
      </span>
    </button>
  );
}

export function EdgeDetailPanel({
  edge,
  sourceColor,
  targetColor,
  reduceMotion,
  onSelectNode,
  onClose,
}: EdgeDetailPanelProps) {
  const isMobile = useIsMobile();
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
          className="absolute inset-x-2 bottom-2 z-10 flex max-h-[58%] flex-col overflow-hidden rounded-2xl border border-border bg-panel-2 shadow-[var(--shadow-pop)] sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[372px]"
        >
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${sourceColor}, ${targetColor})` }} />

          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.1em] text-ink-faint">Path step</div>
              <h2 className="mt-1 text-[15px] font-semibold leading-tight text-ink">
                {edge.label ?? 'Transition'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-md p-1.5 text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* body */}
          <div className="hg-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <NodeChip def={edge.sourceDef} color={sourceColor} role="From" onClick={() => onSelectNode(edge.source)} />
            <div className="flex items-center gap-2 pl-1.5">
              <span className="h-4 w-px bg-border" />
              {edge.label && <span className="text-[11px] font-medium text-accent">{edge.label}</span>}
            </div>
            <NodeChip def={edge.targetDef} color={targetColor} role="To" onClick={() => onSelectNode(edge.target)} />

            <p className="pt-1 text-[12.5px] leading-relaxed text-ink-dim">{explanation}</p>

            {edge.targetDef?.summary && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  What this unlocks
                </h3>
                <p className="text-[12px] leading-snug text-ink">{edge.targetDef.summary}</p>
              </div>
            )}

            {edge.targetDef?.requires && edge.targetDef.requires.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Requires</h3>
                <div className="flex flex-wrap gap-1.5">
                  {edge.targetDef.requires.map((r) => (
                    <span
                      key={r}
                      className="rounded-md border border-border bg-bg-soft px-2 py-0.5 text-[11px] text-ink-dim"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* footer */}
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onSelectNode(edge.target)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-medium text-white transition-all hover:brightness-110"
            >
              Open {edge.targetDef?.label ?? 'target'}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
