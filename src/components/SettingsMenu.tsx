import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Theme } from '../state/useTheme';
import { BUILD_HASH, BUILD_DATE_LABEL, COMMIT_URL } from '../buildInfo';
import { GearIcon, MoonIcon, SunIcon, FocusIcon, NoteIcon } from '../ui/icons';

interface SettingsMenuProps {
  theme: Theme;
  onToggleTheme: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  notesInline: boolean;
  onToggleNotesInline: () => void;
  reduceMotion: boolean;
}

/** A small on/off switch, accent when on. */
function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors duration-200',
        on ? 'bg-accent' : 'bg-border-strong',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          on ? 'translate-x-[15px]' : 'translate-x-[3px]',
        ].join(' ')}
      />
    </span>
  );
}

function Row({
  icon,
  label,
  hint,
  on,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-border/60"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-panel-2 text-ink-dim">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs leading-tight text-ink-faint">{hint}</span>}
      </span>
      <Switch on={on} />
    </button>
  );
}

/**
 * Settings control that lives in the header toolbar (between GitHub and Reset). A
 * gear button opens a dropdown with the theme + focus-mode toggles. Closes on
 * outside click or Escape.
 */
export function SettingsMenu({
  theme,
  onToggleTheme,
  focusMode,
  onToggleFocusMode,
  notesInline,
  onToggleNotesInline,
  reduceMotion,
}: SettingsMenuProps) {
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
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
        className={[
          'flex items-center justify-center rounded-lg border px-2 py-1 transition-colors',
          open ? 'border-border-strong text-ink' : 'border-border text-ink-dim hover:border-border-strong hover:text-ink',
        ].join(' ')}
      >
        <GearIcon className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full z-40 mt-2 w-[244px] rounded-2xl border border-border bg-panel/95 p-1.5 shadow-[var(--shadow-pop)] backdrop-blur-xl"
          >
            <div className="px-2 pb-1 pt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Settings</div>
            <Row
              icon={theme === 'light' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              label="Light mode"
              on={theme === 'light'}
              onClick={onToggleTheme}
            />
            <Row
              icon={<FocusIcon className="h-4 w-4" />}
              label="Focus mode"
              hint="Collapse unrelated branches around the selected node"
              on={focusMode}
              onClick={onToggleFocusMode}
            />
            <Row
              icon={<NoteIcon className="h-4 w-4" />}
              label="Notes on nodes"
              hint="Show note text on the card (off: tap the note icon)"
              on={notesInline}
              onClick={onToggleNotesInline}
            />
            {/* Build stamp — how current the content is, and the exact commit (so a
                report filed from here is reproducible). Deliberately quiet. */}
            <div className="mt-1 border-t border-border/60 px-2.5 pb-1 pt-2 text-2xs text-ink-faint">
              updated {BUILD_DATE_LABEL} ·{' '}
              <a
                href={COMMIT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono underline decoration-dotted underline-offset-2 transition-colors hover:text-ink-dim"
              >
                {BUILD_HASH}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
