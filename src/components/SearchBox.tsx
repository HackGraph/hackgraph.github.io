import { useEffect, useMemo, useRef, useState } from 'react';
import type { TechniqueNodeDef } from '../data/schema';
import { SearchIcon } from '../ui/icons';

function score(def: TechniqueNodeDef, q: string): number {
  const label = def.label.toLowerCase();
  if (label.includes(q)) return label.startsWith(q) ? 3 : 2;
  const hay = `${def.summary ?? ''} ${def.mitre?.id ?? ''} ${(def.tools ?? [])
    .map((t) => t.name)
    .join(' ')}`.toLowerCase();
  return hay.includes(q) ? 1 : 0;
}

interface SearchBoxProps {
  nodes: TechniqueNodeDef[];
  onPick: (id: string) => void;
  phaseColor: (phaseId: string) => string;
}

/** Fuzzy jump-to-technique. Picking a result reveals its path + opens its panel. */
export function SearchBox({ nodes, onPick, phaseColor }: SearchBoxProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Cap the results list to the space actually visible below the input. On mobile the
  // on-screen keyboard shrinks the visual viewport (which `vh` ignores), so a `60vh`
  // list would run under the keyboard / off-screen. visualViewport.height tracks the
  // real visible height, so the list always fits and scrolls within it.
  const [maxH, setMaxH] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const update = () => {
      const bottom = inputRef.current?.getBoundingClientRect().bottom ?? 0;
      const visible = vv ? vv.height : window.innerHeight;
      setMaxH(Math.max(140, Math.round(visible - bottom - 14)));
    };
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [] as TechniqueNodeDef[];
    return nodes
      .filter((n) => n.kind !== 'category' && n.kind !== 'start')
      .map((n) => ({ n, s: score(n, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.n.label.length - b.n.label.length)
      .slice(0, 8)
      .map((x) => x.n);
  }, [q, nodes]);

  useEffect(() => setActive(0), [q]);
  // Mounted only while the toolbar is open, so focus the input on every open.
  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = (def: TechniqueNodeDef) => {
    onPick(def.id);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="pointer-events-auto relative w-[min(92vw,360px)]">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            pick(results[active]);
          } else if (e.key === 'Escape') {
            setQ('');
            inputRef.current?.blur();
          }
        }}
        placeholder="Search techniques…"
        spellCheck={false}
        className="w-full rounded-lg border border-border bg-panel/80 py-1.5 pl-8 pr-3 text-[12px] text-ink shadow-[var(--shadow-card)] backdrop-blur-xl placeholder:text-ink-dim focus:border-accent focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul
          style={{ maxHeight: maxH }}
          className="hg-scroll absolute z-30 mt-1.5 max-h-[60vh] w-full overflow-auto rounded-xl border border-border bg-panel-2/90 shadow-[var(--shadow-pop)] backdrop-blur-xl"
        >
          {results.map((n, i) => (
            <li key={n.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(n);
                }}
                onMouseEnter={() => setActive(i)}
                className={[
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                  i === active ? 'bg-white/[0.06]' : '',
                ].join(' ')}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: phaseColor(n.phase) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-ink">{n.label}</span>
                  {n.summary && (
                    <span className="block truncate text-[10px] text-ink-dim">{n.summary}</span>
                  )}
                </span>
                {n.mitre && (
                  <span className="shrink-0 font-mono text-[9px] text-ink-dim">{n.mitre.id}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
