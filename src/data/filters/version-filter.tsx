/**
 * Windows-version "Target" filter: dims techniques that don't apply to the selected
 * Windows build. Domain module implementing the engine's {@link FilterDef} contract.
 */
import { useMemo } from 'react';
import { defineFilter } from '../../graph/filters';
import type { GraphMap } from '../../graph/model';
import type { TechniqueNodeDef } from '../schema';
import { WINDOWS_VERSIONS } from '../windows-versions';

type State = string | null;

/** Version ids actually used by this map's nodes — gates whether the selector shows and
 *  which versions/families it offers (AD lists only Server; the PE map both). */
function usedVersionIds(map: GraphMap): Set<string> {
  const s = new Set<string>();
  for (const n of map.nodes) for (const v of (n as TechniqueNodeDef).versions ?? []) s.add(v);
  return s;
}

export const versionFilter = defineFilter<State>({
  id: 'version',
  appliesTo: (map) => usedVersionIds(map).size > 0,
  initial: null,
  isActive: (s) => s != null,
  dims: (node, s) => {
    const versions = (node as TechniqueNodeDef).versions;
    return s != null && !!versions && !versions.includes(s);
  },
  Control: ({ state, setState, map }) => {
    const mapVersionIds = useMemo(() => usedVersionIds(map), [map]);
    return (
      <label className="flex items-center gap-1.5 text-xs text-ink-dim">
        <span className="text-ink-faint">Target</span>
        <select
          value={state ?? ''}
          onChange={(e) => setState(e.target.value || null)}
          title="Dim techniques that don't apply to this Windows version"
          className="rounded-md border border-border bg-bg-soft px-1.5 py-0.5 text-xs text-ink outline-none focus:border-border-strong"
        >
          <option value="">All versions</option>
          {(['client', 'server'] as const).map((fam) => {
            const opts = WINDOWS_VERSIONS.filter((v) => v.family === fam && mapVersionIds.has(v.id));
            if (opts.length === 0) return null;
            return (
              <optgroup key={fam} label={fam === 'client' ? 'Client' : 'Server'}>
                {opts.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>
    );
  },
});
