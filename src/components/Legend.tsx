import { useState } from 'react';
import type { PhaseDef } from '../data/schema';
import { ChevronRightIcon } from '../ui/icons';

/** Compact, collapsible phase color key for the current map. */
export function Legend({ phases }: { phases: PhaseDef[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 z-10 select-none">
      <div className="overflow-hidden rounded-xl border border-border bg-panel/80 shadow-[var(--shadow-card)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[12px] text-ink-dim transition-colors hover:text-ink"
        >
          <ChevronRightIcon
            className="h-3.5 w-3.5 transition-transform duration-200"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          Phases
        </button>
        {open && (
          <ul className="space-y-1.5 px-3 pb-2.5 pt-0.5">
            {phases.map((phase) => (
              <li key={phase.id} className="flex items-center gap-2 text-[12px] text-ink">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: phase.color }} />
                {phase.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
