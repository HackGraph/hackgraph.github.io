import type { MapDefinition } from './schema';
import { adMap } from './maps/ad';
import { windowsPeMap } from './maps/windows-pe';
import { linuxPeMap } from './maps/linux-pe';

/**
 * Registry of all maps. The app reads from this list; drop in another
 * MapDefinition here (web, cloud, network) and it becomes selectable in the
 * header without touching the engine.
 */
// AD leads the tab row and is the default landing map. The order here IS the tab
// order (MapSwitcher reads it).
export const MAPS: MapDefinition[] = [adMap, windowsPeMap, linuxPeMap];

export const DEFAULT_MAP_ID = adMap.id;

export function getMap(id: string): MapDefinition {
  const map = MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`Unknown map id: "${id}"`);
  return map;
}
