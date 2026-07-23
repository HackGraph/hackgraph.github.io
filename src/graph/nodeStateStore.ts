/**
 * Per-node VOLATILE interaction state, delivered through `useSyncExternalStore` so a
 * selection / expansion change only re-renders the cards whose OWN flags flipped — not
 * all ~150 at once. The STABLE parts (model, callbacks, mode flags) stay in React
 * context; this store carries just the bits that change as you click around.
 *
 * Why a store and not context: every `TechniqueNode` reads the same `GraphInteraction`
 * context, so changing its identity on each click re-rendered every card (memo can't
 * gate a context change). Here each card subscribes with `() => getSnapshot(key, defId)`
 * and React bails out of the re-render whenever that node's snapshot is Object.is-equal
 * to the last one. `MapView` pushes the latest `source` via `setSource` in a layout
 * effect; the subscribers re-read and only the changed ones re-render.
 *
 * INVARIANT (required by `useSyncExternalStore`): `getSnapshot` must return a STABLE
 * reference while a node's state is unchanged, or React throws "getSnapshot should be
 * cached" and loops. So we cache the last snapshot per key behind a packed signature and
 * return the SAME object until the signature changes.
 */

/** The live, selection-dependent inputs. All predicates are keyed by RENDER KEY except
 *  the `defId`-keyed ones (dim/next-step/sibling), mirroring the old context predicates. */
export interface NodeStateSource {
  selectedId: string | null;
  hasSelection: boolean;
  focusMode: boolean;
  focusActive: boolean;
  focusChildrenShown: boolean;
  isExpanded: (key: string) => boolean;
  isNodeActive: (key: string) => boolean;
  isDimmed: (defId: string) => boolean;
  /** Excluded by an 'inapplicable' filter (e.g. OSCP scope): rendered as ruled-out. */
  isScopedOut: (defId: string) => boolean;
  /** Out of an 'inapplicable' filter's set but re-enabled by the user (override hint). */
  isScopeReEnabled: (defId: string) => boolean;
  isNextStep: (defId: string) => boolean;
  isSibling: (defId: string) => boolean;
  isOwned: (key: string) => boolean;
  isInapplicable: (key: string) => boolean;
  hasNote: (key: string) => boolean;
  getNote: (key: string) => string;
}

/** The resolved per-node flags a `TechniqueNode` renders from. */
export interface NodeSnapshot {
  selected: boolean;
  expanded: boolean;
  active: boolean;
  dimmed: boolean;
  scopedOut: boolean;
  scopeReEnabled: boolean;
  recede: boolean;
  owned: boolean;
  inapplicable: boolean;
  note: string;
}

const EMPTY_SOURCE: NodeStateSource = {
  selectedId: null,
  hasSelection: false,
  focusMode: false,
  focusActive: false,
  focusChildrenShown: false,
  isExpanded: () => false,
  isNodeActive: () => false,
  isDimmed: () => false,
  isScopedOut: () => false,
  isScopeReEnabled: () => false,
  isNextStep: () => false,
  isSibling: () => false,
  isOwned: () => false,
  isInapplicable: () => false,
  hasNote: () => false,
  getNote: () => '',
};

export class NodeStateStore {
  private source: NodeStateSource = EMPTY_SOURCE;
  private listeners = new Set<() => void>();
  private cache = new Map<string, { sig: string; snap: NodeSnapshot }>();

  /** Stable identity (instance arrow) so `useSyncExternalStore` never re-subscribes. */
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  /** Push the latest live inputs and wake subscribers. Cached snapshots are recomputed
   *  lazily on the next read and only re-minted when their signature actually changed,
   *  so unchanged nodes keep their snapshot identity and skip the re-render. */
  setSource(source: NodeStateSource): void {
    this.source = source;
    for (const l of this.listeners) l();
  }

  getSnapshot = (key: string, defId: string): NodeSnapshot => {
    const s = this.source;
    const selected = s.selectedId === key;
    const expanded = s.focusMode ? selected && s.focusChildrenShown : s.isExpanded(key);
    const active = s.isNodeActive(key);
    const dimmed = s.isDimmed(defId);
    const scopedOut = s.isScopedOut(defId);
    const scopeReEnabled = s.isScopeReEnabled(defId);
    // Path-building recede: everything off the chosen path recedes EXCEPT the selected
    // node's next steps and siblings (the live alternatives at that step). Focus mode's
    // curated slice never recedes. Mirrors the old inline computation in TechniqueNode.
    const recede = s.hasSelection && !s.focusActive && !active && !s.isNextStep(defId) && !s.isSibling(defId);
    const owned = s.isOwned(key);
    const inapplicable = s.isInapplicable(key);
    const note = s.hasNote(key) ? s.getNote(key) : '';
    const sig = `${+selected}${+expanded}${+active}${+dimmed}${+scopedOut}${+scopeReEnabled}${+recede}${+owned}${+inapplicable}${note}`;
    const cached = this.cache.get(key);
    if (cached && cached.sig === sig) return cached.snap;
    const snap: NodeSnapshot = { selected, expanded, active, dimmed, scopedOut, scopeReEnabled, recede, owned, inapplicable, note };
    this.cache.set(key, { sig, snap });
    return snap;
  };
}
