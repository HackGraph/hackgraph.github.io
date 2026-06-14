import { useMemo } from 'react';
import type { MapDefinition } from '../data/schema';
import { buildModel, type GraphModel } from './buildModel';

/** Build (and memoize) the runtime GraphModel for a given map definition. */
export function useGraphModel(map: MapDefinition): GraphModel {
  return useMemo(() => buildModel(map), [map]);
}
