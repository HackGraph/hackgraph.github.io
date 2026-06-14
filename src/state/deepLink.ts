import type { NodeId } from '../graph/buildModel';

/** Shareable view state encoded in the URL hash: which map, what's expanded, what's selected. */
export interface DeepLink {
  mapId: string | null;
  open: NodeId[];
  sel: NodeId | null;
}

export function readDeepLink(): DeepLink {
  if (typeof window === 'undefined') return { mapId: null, open: [], sel: null };
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return {
    mapId: params.get('map'),
    open: (params.get('open') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    sel: params.get('sel') || null,
  };
}

export function writeDeepLink(link: DeepLink): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (link.mapId) params.set('map', link.mapId);
  if (link.open.length) params.set('open', link.open.join(','));
  if (link.sel) params.set('sel', link.sel);
  const q = params.toString();
  const url = q ? `#${q}` : window.location.pathname + window.location.search;
  window.history.replaceState(null, '', url);
}
