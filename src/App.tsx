import { useState } from 'react';
import { MAPS, DEFAULT_MAP_ID, getMap } from './data';
import { usePrefersReducedMotion } from './state/usePrefersReducedMotion';
import { useTheme } from './state/useTheme';
import { usePersistedState } from './state/usePersistedState';
import { readDeepLink, writeDeepLink } from './state/deepLink';
import { MapView } from './components/MapView';
import { MapSwitcher } from './components/MapSwitcher';
import { SettingsMenu } from './components/SettingsMenu';
import { GithubIcon } from './ui/icons';

/** A small, calm DAG mark. */
function LogoMark() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-panel">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path d="M8.5 12 L15 8.5 M8.5 12 L15 15.5" stroke="var(--color-ink-faint)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7.5" cy="12" r="2.2" fill="var(--color-ink)" />
        <circle cx="16" cy="8" r="1.9" fill="var(--color-ink-dim)" />
        <circle cx="16" cy="16" r="1.9" fill="var(--color-accent)" />
      </svg>
    </span>
  );
}

export default function App() {
  const reduceMotion = usePrefersReducedMotion();
  const { theme, toggle: toggleTheme } = useTheme();
  // Focus mode lives here (not in MapView) so the header settings menu can drive it
  // and it survives a map switch / reset remount. Persisted so the preference also
  // survives reloads (theme is likewise persisted, in useTheme).
  const [focusMode, setFocusMode] = usePersistedState('hg-focus-mode', false);
  // Whether per-node notes render inline on the card (vs. on hover). Persisted.
  const [notesInline, setNotesInline] = usePersistedState('hg-notes-inline', false);
  const [mapId, setMapId] = useState(() => {
    const m = readDeepLink().mapId;
    return m && MAPS.some((x) => x.id === m) ? m : DEFAULT_MAP_ID;
  });
  // Bumping this remounts MapView -> collapse-all + refit, without lifting state.
  const [resetNonce, setResetNonce] = useState(0);

  const map = getMap(mapId);

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Header */}
      <header className="z-30 flex flex-nowrap items-center justify-between gap-2 border-b border-border bg-bg-soft/80 px-3 py-2.5 backdrop-blur-xl sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2.5">
            <LogoMark />
            <h1 className="hidden text-[15px] font-semibold tracking-[-0.01em] text-ink sm:block">HackGraph</h1>
          </div>

          {MAPS.length > 1 ? (
            <MapSwitcher maps={MAPS} mapId={mapId} onSelect={setMapId} reduceMotion={reduceMotion} />
          ) : (
            <span className="hidden truncate text-[12px] text-ink-dim md:inline">{map.tagline ?? map.name}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://github.com/HackGraph/hackgraph.github.io"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="flex items-center justify-center rounded-lg border border-border px-2 py-1 text-ink-dim transition-colors hover:border-border-strong hover:text-ink"
          >
            <GithubIcon className="h-3.5 w-3.5" />
          </a>
          <SettingsMenu
            theme={theme}
            onToggleTheme={toggleTheme}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode((f) => !f)}
            notesInline={notesInline}
            onToggleNotesInline={() => setNotesInline((v) => !v)}
            reduceMotion={reduceMotion}
          />
          <button
            type="button"
            onClick={() => {
              // Clear the shared-view state so the remount starts collapsed.
              writeDeepLink({ mapId, open: [], sel: null });
              setResetNonce((n) => n + 1);
            }}
            className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-ink-dim transition-colors hover:border-border-strong hover:text-ink"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Graph + overlays — keyed so map switch / collapse-all remounts cleanly */}
      <main className="relative flex-1 overflow-hidden">
        <MapView
          key={`${mapId}:${resetNonce}`}
          map={map}
          reduceMotion={reduceMotion}
          focusMode={focusMode}
          notesInline={notesInline}
        />
      </main>
    </div>
  );
}
