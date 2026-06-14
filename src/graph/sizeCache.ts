import type { NodeId } from './buildModel';

export interface NodeSize {
  width: number;
  height: number;
}

/** Fallback used before a node has been measured by React Flow. */
export const DEFAULT_NODE_SIZE: NodeSize = { width: 230, height: 84 };

/**
 * Tiny mutable cache of measured node dimensions, keyed by node id. The layout
 * pass reads from here so dagre packs nodes by their real rendered size; the
 * canvas writes measured sizes back as React Flow reports them.
 */
export class SizeCache {
  private sizes = new Map<NodeId, NodeSize>();

  get(id: NodeId): NodeSize {
    return this.sizes.get(id) ?? DEFAULT_NODE_SIZE;
  }

  /** Returns true if the stored size changed meaningfully (>1px on either axis). */
  set(id: NodeId, size: NodeSize): boolean {
    const prev = this.sizes.get(id);
    if (prev && Math.abs(prev.width - size.width) < 1 && Math.abs(prev.height - size.height) < 1) {
      return false;
    }
    this.sizes.set(id, size);
    return true;
  }

  has(id: NodeId): boolean {
    return this.sizes.has(id);
  }
}
