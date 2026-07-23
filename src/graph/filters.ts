/**
 * Pluggable graph-filter contract (ENGINE side).
 *
 * A filter DIMS the technique nodes it excludes — it never hides or removes them. The
 * engine (MapView + {@link ../components/FilterBar}) knows only this contract: it holds
 * one state slot per filter, renders each filter's own `Control`, and composes every
 * applicable filter's `dims` into the node dim state (a node dims if ANY active filter
 * excludes it). It knows nothing about versions/footholds/OSCP specifically.
 *
 * Concrete filters live in the DOMAIN layer (see `src/data/filters`) and are collected
 * into a registry array. Adding a filter = implement `FilterDef` in a sibling module and
 * append it to the registry — no engine change.
 */
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import type { GraphMap, GraphNode } from './model';

export interface FilterDef<S = unknown> {
  /** Stable id; also the key under which this filter's state is held (and persisted). */
  id: string;
  /** Show this filter only on maps where it is relevant (data-driven; reads map.nodes). */
  appliesTo(map: GraphMap): boolean;
  /** Empty/default state. Clear resets to this; ephemeral filters start here each mount. */
  initial: S;
  /** Set => state persists in localStorage under this key (survives map switch + reload).
   *  Omit => ephemeral (resets when MapView remounts: map switch, Reset, reload).
   *  NOTE: persisted state must be JSON-serialisable (a Set is not — keep those ephemeral,
   *  or encode as an array). */
  persistKey?: string;
  /** Whether the current state actually constrains anything (drives the active-dot + Clear). */
  isActive(state: S): boolean;
  /** True => dim this node. The engine pre-resolves the node and has already excluded
   *  start/category/goal nodes, so a module only reads its own (domain) fields — cast
   *  `node` to the domain node type internally. Only called when `isActive(state)` is true. */
  dims(node: GraphNode, state: S): boolean;
  /** How the engine renders the nodes this filter excludes. 'dim' (default) fades them out;
   *  'inapplicable' gives them the ruled-out ban-badge treatment and turns on per-node
   *  re-enable (via {@link toggleException} / {@link isException}). */
  excludes?: 'dim' | 'inapplicable';
  /** ('inapplicable' filters only) Toggle one node's re-enable override, returning the next
   *  state. The engine calls this when the user re-enables (or re-hides) a node. */
  toggleException?(state: S, nodeId: string): S;
  /** ('inapplicable' filters only) True if this node is currently a re-enabled exception
   *  (outside the filter's set but forced visible). Drives the override hint + menu label. */
  isException?(state: S, nodeId: string): boolean;
  /** Renders this filter's toolbar control. `setState` is scoped to THIS filter's slot and
   *  has the usual value-or-updater signature. `map` lets a control derive its options
   *  (e.g. which versions this map uses). */
  Control(props: { state: S; setState: Dispatch<SetStateAction<S>>; map: GraphMap }): ReactElement;
}

/**
 * Register a filter. Erases the state type so a heterogeneous registry
 * (`FilterDef[]`) type-checks — `FilterDef<S>` is invariant in `S`, so the concrete
 * `S` cannot survive into the array. The input is still fully checked against
 * `FilterDef<S>`, keeping each module type-safe internally.
 */
export function defineFilter<S>(def: FilterDef<S>): FilterDef {
  return def as unknown as FilterDef;
}
