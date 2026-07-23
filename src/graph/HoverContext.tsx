import { createContext, useContext } from 'react';
import type { HoverStore } from './hoverStore';

/**
 * Delivers the per-map {@link HoverStore} to the canvas (which reports node
 * enter/leave) and to edges (which subscribe selectively via `edgeBits`). The
 * VALUE is the store itself — a stable reference for the map's lifetime — so this
 * context never causes a re-render; all hover updates flow through the store's
 * own subscriptions. (Hover used to be MapView state behind an un-memoized context
 * value, which re-rendered the whole tree per hover and every edge per render.)
 */
const HoverContext = createContext<HoverStore | null>(null);

export const HoverProvider = HoverContext.Provider;

export function useHover(): HoverStore {
  const store = useContext(HoverContext);
  if (!store) throw new Error('useHover must be used within a HoverProvider');
  return store;
}
