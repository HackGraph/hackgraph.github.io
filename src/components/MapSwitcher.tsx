import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MapDefinition } from '../data/schema';
import { ChevronDownIcon } from '../ui/icons';

interface MapSwitcherProps {
  maps: MapDefinition[];
  mapId: string;
  onSelect: (id: string) => void;
  reduceMotion: boolean;
}

/**
 * Header map switcher. Desktop has room for the full segmented control; on mobile
 * the names ("Active Directory", "Windows Priv Esc", …) are far too wide to sit
 * inline next to the toolbar buttons, so below `sm` they collapse into a compact
 * dropdown showing the current map + a chevron. One source of truth, two renders.
 */
export function MapSwitcher({ maps, mapId, onSelect, reduceMotion }: MapSwitcherProps) {
  const current = maps.find((m) => m.id === mapId) ?? maps[0];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop: full segmented tabs */}
      <div className="hidden shrink-0 items-center gap-0.5 rounded-lg border border-border bg-panel p-0.5 sm:flex">
        {maps.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={[
              'whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
              m.id === mapId ? 'bg-accent-soft text-ink' : 'text-ink-dim hover:text-ink',
            ].join(' ')}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Mobile: compact dropdown */}
      <div ref={wrapRef} className="relative shrink-0 sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Switch map"
          aria-haspopup="menu"
          aria-expanded={open}
          className={[
            'flex max-w-[44vw] items-center gap-1 rounded-lg border bg-panel px-2 py-1 text-[12px] font-medium transition-colors',
            open ? 'border-border-strong text-ink' : 'border-border text-ink hover:border-border-strong',
          ].join(' ')}
        >
          <span className="truncate">{current.name}</span>
          <ChevronDownIcon
            className={['h-3.5 w-3.5 shrink-0 text-ink-dim transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'top left' }}
              className="absolute left-0 top-full z-30 mt-2 w-max min-w-[9rem] max-w-[72vw] rounded-2xl border border-border bg-panel/95 p-1.5 shadow-[var(--shadow-pop)] backdrop-blur-xl"
            >
              {maps.map((m) => {
                const active = m.id === mapId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      onSelect(m.id);
                      setOpen(false);
                    }}
                    className={[
                      'flex w-full items-center truncate rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors',
                      active ? 'bg-accent-soft font-medium text-ink' : 'text-ink-dim hover:bg-border/60 hover:text-ink',
                    ].join(' ')}
                  >
                    {m.name}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
