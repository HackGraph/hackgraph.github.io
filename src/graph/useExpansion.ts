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
  /** REPLACE the expansion with exactly `ids` (focus mode uses this so drilling into a
   *  node doesn't accumulate — switching the focused node collapses the previous one).
   *  Keeps the Set identity when the contents are unchanged so the layout memo holds. */
  replace: (ids: Iterable<NodeId>, toggled?: NodeId) => void;
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
      let added = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (!next.has(id)) added = true;
        next.add(id);
        last = id;
      }
      // Keep the SAME Set identity when nothing new was revealed (e.g. selecting a
      // sibling in focus mode re-expands its already-open lineage). The layout memo
      // keys off this reference, so a no-op expand skips the full dagre relayout —
      // the dominant cost of switching the focused node.
      return added ? next : prev;
    });
    if (last) setLastToggled(last);
  }, []);

  const replace = useCallback((ids: Iterable<NodeId>, toggled?: NodeId) => {
    setExpanded((prev) => {
      const next = new Set(ids);
      if (next.size === prev.size) {
        let same = true;
        for (const id of next) if (!prev.has(id)) { same = false; break; }
        if (same) return prev; // unchanged → keep identity (skips the relayout)
      }
      return next;
    });
    if (toggled) setLastToggled(toggled);
  }, []);

  const reset = useCallback(() => {
    setExpanded(new Set()); // collapse to just the root
    setLastToggled(rootId);
  }, [rootId]);

  const isExpanded = useCallback((id: NodeId) => expanded.has(id), [expanded]);

  return useMemo(
    () => ({ expanded, lastToggled, toggle, expandMany, replace, isExpanded, reset }),
    [expanded, lastToggled, toggle, expandMany, replace, isExpanded, reset],
  );
}
