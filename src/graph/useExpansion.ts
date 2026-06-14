import { useCallback, useMemo, useState } from 'react';
import type { NodeId } from './buildModel';

export interface Expansion {
  /** Currently-expanded node ids (empty ⇒ only the root node shows, collapsed). */
  expanded: ReadonlySet<NodeId>;
  /** The most recently toggled node — used as the stagger/camera focus origin. */
  lastToggled: NodeId;
  toggle: (id: NodeId) => void;
  /** Expand a set of nodes at once (e.g. reveal a path from a search result). */
  expandMany: (ids: Iterable<NodeId>) => void;
  isExpanded: (id: NodeId) => boolean;
  /** Collapse everything back to just the root. */
  reset: () => void;
}

/**
 * Owns the single source of truth for graph topology: which nodes are expanded.
 * Starts COLLAPSED by default (empty set ⇒ only the root "Engagement Start" shows);
 * the root is an ordinary collapsible node, so clicking it reveals the first level.
 * A shared link seeds `initial` (root + its open keys). Collapsed nodes keep their
 * own expanded flag, so re-revealing a branch restores its sub-expansion.
 */
export function useExpansion(rootId: NodeId, initial?: Iterable<NodeId>): Expansion {
  const [expanded, setExpanded] = useState<Set<NodeId>>(
    () => new Set<NodeId>(initial ?? []),
  );
  const [lastToggled, setLastToggled] = useState<NodeId>(rootId);

  const toggle = useCallback((id: NodeId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastToggled(id);
  }, []);

  const expandMany = useCallback((ids: Iterable<NodeId>) => {
    let last: NodeId | null = null;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        next.add(id);
        last = id;
      }
      return next;
    });
    if (last) setLastToggled(last);
  }, []);

  const reset = useCallback(() => {
    setExpanded(new Set()); // collapse to just the root
    setLastToggled(rootId);
  }, [rootId]);

  const isExpanded = useCallback((id: NodeId) => expanded.has(id), [expanded]);

  return useMemo(
    () => ({ expanded, lastToggled, toggle, expandMany, isExpanded, reset }),
    [expanded, lastToggled, toggle, expandMany, isExpanded, reset],
  );
}
