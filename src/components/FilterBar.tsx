/**
 * Generic filter toolbar (ENGINE). Renders each applicable filter's own `Control` with a
 * divider between them and a Clear button — knowing nothing about what the filters do.
 */
import { Fragment, type Dispatch, type SetStateAction } from 'react';
import type { FilterDef } from '../graph/filters';
import type { GraphMap } from '../graph/model';
import { CloseIcon } from '../ui/icons';

interface FilterBarProps {
  /** Filters already narrowed to those that apply to the current map. */
  filters: FilterDef[];
  states: Record<string, unknown>;
  setFilterState: (id: string) => Dispatch<SetStateAction<unknown>>;
  filterActive: boolean;
  onClear: () => void;
  map: GraphMap;
}

export function FilterBar({ filters, states, setFilterState, filterActive, onClear, map }: FilterBarProps) {
  if (filters.length === 0) return null;
  return (
    <div className="pointer-events-auto flex max-w-[min(94vw,660px)] flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-panel/75 px-2 py-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl">
      {filters.map((f, i) => (
        <Fragment key={f.id}>
          {i > 0 && <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />}
          <f.Control state={states[f.id]} setState={setFilterState(f.id)} map={map} />
        </Fragment>
      ))}
      {filterActive && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-ink-dim transition-colors hover:text-ink"
        >
          Clear
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
