import { useCallback, useMemo, useState } from 'react';
import type { NodeId } from '../graph/buildModel';

export interface Selection {
  selectedId: NodeId | null;
  select: (id: NodeId) => void;
  clear: () => void;
}

/**
 * Tracks which node's detail panel is open. Deliberately independent of
 * expansion: opening details must never trigger a graph re-layout.
 */
export function useSelection(initial: NodeId | null = null): Selection {
  const [selectedId, setSelectedId] = useState<NodeId | null>(initial);
  const select = useCallback((id: NodeId) => setSelectedId(id), []);
  const clear = useCallback(() => setSelectedId(null), []);
  return useMemo(() => ({ selectedId, select, clear }), [selectedId, select, clear]);
}
