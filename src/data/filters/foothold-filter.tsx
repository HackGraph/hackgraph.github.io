/**
 * Foothold "I hold" filter: multi-select capability chips; dims techniques whose access
 * requirement your held capabilities don't satisfy. Domain module implementing the
 * engine's {@link FilterDef} contract. Ephemeral (its state is a Set — not persisted).
 */
import { defineFilter } from '../../graph/filters';
import type { TechniqueNodeDef } from '../schema';
import { FOOTHOLDS, footholdSatisfies } from '../footholds';

type State = ReadonlySet<string>;

export const footholdFilter = defineFilter<State>({
  id: 'foothold',
  appliesTo: (map) => map.nodes.some((n) => (n as TechniqueNodeDef).needs),
  initial: new Set<string>(),
  isActive: (s) => s.size > 0,
  dims: (node, s) => {
    const needs = (node as TechniqueNodeDef).needs;
    return !!needs && !footholdSatisfies(needs, s);
  },
  Control: ({ state, setState }) => (
    <div
      className="flex items-center gap-1"
      title="Toggle what you currently hold; techniques you can't yet reach dim out"
    >
      <span className="text-xs text-ink-faint">I hold</span>
      {FOOTHOLDS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() =>
            setState((s) => {
              const next = new Set(s);
              if (next.has(f.id)) next.delete(f.id);
              else next.add(f.id);
              return next;
            })
          }
          title={f.hint}
          className={[
            'rounded-full px-2 py-0.5 text-xs transition-colors',
            state.has(f.id) ? 'bg-white/[0.08] text-ink' : 'text-ink-dim hover:text-ink',
          ].join(' ')}
        >
          {f.label}
        </button>
      ))}
    </div>
  ),
});
