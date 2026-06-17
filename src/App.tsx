import { useState } from 'react';
import { MAPS, DEFAULT_MAP_ID, getMap } from './data';
import { usePrefersReducedMotion } from './state/usePrefersReducedMotion';
import { useTheme } from './state/useTheme';
import { readDeepLink, writeDeepLink } from './state/deepLink';
import { MapView } from './components/MapView';
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
  // and it survives a map switch / reset remount.
  const [focusMode, setFocusMode] = useState(false);
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
      <header className="z-20 flex flex-nowrap items-center justify-between gap-2 border-b border-border bg-bg-soft/80 px-3 py-2.5 backdrop-blur-xl sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2.5">
            <LogoMark />
            <h1 className="hidden text-[15px] font-semibold tracking-[-0.01em] text-ink sm:block">HackGraph</h1>
          </div>

          {MAPS.length > 1 ? (
            <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-panel p-0.5">
              {MAPS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMapId(m.id)}
                  className={[
                    'whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-[12px]',
                    m.id === mapId ? 'bg-accent-soft text-ink' : 'text-ink-dim hover:text-ink',
                  ].join(' ')}
                >
                  {m.name}
                </button>
              ))}
            </div>
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
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-ink-dim transition-colors hover:border-border-strong hover:text-ink"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <SettingsMenu
            theme={theme}
            onToggleTheme={toggleTheme}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode((f) => !f)}
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
        />
      </main>
    </div>
  );
}
