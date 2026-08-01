import { adMap } from './maps/ad.js';
import { windowsPeMap } from './maps/windows-pe.js';
import { linuxPeMap } from './maps/linux-pe.js';

/**
 * Registry of all maps. The app reads from this list; drop in another
 * MapDefinition here (web, cloud, network) and it becomes selectable in the
 * header without touching the engine.
 */
// AD leads the tab row and is the default landing map. The order here IS the tab
// order (MapSwitcher reads it).
/** @type {import('./schema.js').MapDefinition[]} */
export const MAPS = [adMap, windowsPeMap, linuxPeMap];

export const DEFAULT_MAP_ID = adMap.id;

export function getMap(id) {
  const map = MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`Unknown map id: "${id}"`);
  return map;
}
