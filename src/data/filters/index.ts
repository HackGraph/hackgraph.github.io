/**
 * Filter registry — the pluggable list of graph filters the engine renders and composes.
 * Order here is the left→right order in the toolbar. Add a filter: implement
 * {@link FilterDef} in a sibling module and append it here.
 */
import type { FilterDef } from '../../graph/filters';
import { footholdFilter } from './foothold-filter';
import { versionFilter } from './version-filter';
import { oscpFilter } from './oscp-filter';

export const FILTERS: FilterDef[] = [footholdFilter, versionFilter, oscpFilter];
