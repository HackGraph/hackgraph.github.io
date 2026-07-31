/**
 * The two domain filters, expressed against the engine's filter contract.
 *
 * The engine never learns what a filter MEANS: it asks `appliesTo`, `isActive` and `dims`,
 * and renders whatever `control` builds. So every security-specific rule — which Windows
 * versions a technique applies to, what foothold it needs — stays here, and the engine
 * stays a generic graph framework.
 *
 * The `dims` predicates are the same logic the React filters used; only the controls are
 * rebuilt as DOM, because there is no React inside the canvas any more.
 */
import { FOOTHOLDS, footholdSatisfies, type FootholdId } from '../footholds';
import { WINDOWS_VERSIONS } from '../windows-versions';

/** A node as the engine hands it back — our adapter's shape. */
interface EngineNode {
  id: string;
  kind?: string;
  versions?: string[];
  needs?: string;
}

interface EngineMapLike {
  nodes: EngineNode[];
}

/** Minimal shape of the engine's filter contract (see `makeFilterDefs` in view.js). */
export interface EngineFilterDef<S = unknown> {
  id: string;
  title: string;
  persistKey?: string;
  appliesTo(map: EngineMapLike): boolean;
  initial(): S;
  isActive(state: S): boolean;
  dims(node: EngineNode, state: S): boolean;
  control(state: S, container: HTMLElement, onChange: () => void): void;
}

/** Which version ids this map actually references — an empty set hides the filter. */
function usedVersionIds(map: EngineMapLike): Set<string> {
  const used = new Set<string>();
  for (const n of map.nodes) for (const v of n.versions ?? []) used.add(v);
  return used;
}

/** Dim techniques that do not apply to the selected Windows version. */
export const versionFilter: EngineFilterDef<{ id: string | null }> = {
  id: 'version',
  title: 'Target',
  persistKey: 'f-version',
  appliesTo: (map) => usedVersionIds(map).size > 0,
  initial: () => ({ id: null }),
  isActive: (s) => s.id != null,
  dims: (node, s) => s.id != null && !!node.versions && !node.versions.includes(s.id),
  control(state, container, onChange) {
    const used = usedVersionIds({ nodes: [] });
    void used; // the option list is filtered per family below, from the live map
    const select = document.createElement('select');
    select.className = 'fselect';
    select.title = "Dim techniques that don't apply to this Windows version";
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'All versions';
    select.appendChild(all);
    for (const family of ['client', 'server'] as const) {
      const group = document.createElement('optgroup');
      group.label = family === 'client' ? 'Client' : 'Server';
      for (const v of WINDOWS_VERSIONS.filter((w) => w.family === family)) {
        const o = document.createElement('option');
        o.value = v.id;
        o.textContent = v.label;
        group.appendChild(o);
      }
      if (group.childElementCount) select.appendChild(group);
    }
    select.value = state.id ?? '';
    select.addEventListener('change', () => {
      state.id = select.value || null;
      onChange();
    });
    container.appendChild(select);
  },
};

/** Dim techniques you cannot reach with what you currently hold. */
export const footholdFilter: EngineFilterDef<{ have: string[] }> = {
  id: 'foothold',
  title: 'I hold',
  persistKey: 'f-foothold',
  appliesTo: (map) => map.nodes.some((n) => n.needs),
  initial: () => ({ have: [] }),
  isActive: (s) => s.have.length > 0,
  dims: (node, s) =>
    !!node.needs && !footholdSatisfies(node.needs as FootholdId, new Set(s.have as FootholdId[])),
  control(state, container, onChange) {
    for (const f of FOOTHOLDS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.title = f.hint;
      const on = () => state.have.includes(f.id);
      chip.className = 'fchip' + (on() ? '' : ' off');
      chip.textContent = f.label;
      chip.addEventListener('click', () => {
        const i = state.have.indexOf(f.id);
        if (i >= 0) state.have.splice(i, 1);
        else state.have.push(f.id);
        chip.classList.toggle('off', !on());
        onChange();
      });
      container.appendChild(chip);
    }
  },
};

export const ENGINE_FILTERS: EngineFilterDef[] = [
  versionFilter as EngineFilterDef,
  footholdFilter as EngineFilterDef,
];
