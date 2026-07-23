import { useState } from 'react';
import type { PhaseDef } from '../data/schema';
import { ChevronRightIcon } from '../ui/icons';

/** The three edge line styles the graph draws (see DrawInEdge.tsx). Kept in sync
 *  with the actual stroke-dasharray values so the key matches what's on screen. */
const EDGE_KINDS: { dash?: string; label: string }[] = [
  { dash: undefined, label: 'Next step' },
  { dash: '5 5', label: 'Loops back' },
];

/** A tiny line-with-arrowhead sample matching one edge style. Decorative. */
function EdgeSample({ dash }: { dash?: string }) {
  return (
    <svg width="26" height="10" viewBox="0 0 26 10" className="shrink-0" aria-hidden="true">
      <line
        x1="1"
        y1="5"
        x2="18"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
      <path d="M16.5 1.5 L23 5 L16.5 8.5 Z" fill="currentColor" />
    </svg>
  );
}

/** Compact, collapsible key for the current map: phase colors + edge line styles. */
export function Legend({ phases }: { phases: PhaseDef[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 z-10 select-none">
      <div className="overflow-hidden rounded-xl border border-border bg-panel/80 shadow-[var(--shadow-card)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink"
        >
          <ChevronRightIcon
            className="h-3.5 w-3.5 transition-transform duration-200"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          Legend
        </button>
        {open && (
          <div className="space-y-2.5 px-3 pb-2.5 pt-0.5">
            <div className="space-y-1.5">
              <div className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Phases</div>
              <ul className="space-y-1.5">
                {phases.map((phase) => (
                  <li key={phase.id} className="flex items-center gap-2 text-sm text-ink">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: phase.color }} />
                    {phase.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-1.5 border-t border-border/60 pt-2.5">
              <div className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Edges</div>
              <ul className="space-y-1.5">
                {EDGE_KINDS.map((e) => (
                  <li key={e.label} className="flex items-center gap-2 text-sm text-ink-dim">
                    <EdgeSample dash={e.dash} />
                    {e.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
