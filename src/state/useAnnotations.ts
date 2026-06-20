import { useCallback, useMemo } from 'react';
import { usePersistedState } from './usePersistedState';

/**
 * Per-technique annotations the user adds during an engagement, persisted to
 * localStorage (this device only). Keyed by a node's CONTENT id (`defId`), so a mark
 * follows the technique across the main graph and any repeated/isolate instances.
 *
 *  - `owned`: techniques flagged as cleared / done (BloodHound-style "owned").
 *  - `inapplicable`: techniques ruled out for this engagement (wrong OS, not present).
 *    Mutually exclusive with `owned` — marking one clears the other.
 *  - `notes`: freeform text per technique (a popped account, what else was found, …).
 *
 * Annotations are intentionally NOT encoded in the shareable deep-link: they are
 * private working notes, not part of the map.
 */
export interface Annotations {
  isOwned: (id: string) => boolean;
  toggleOwned: (id: string) => void;
  isInapplicable: (id: string) => boolean;
  toggleInapplicable: (id: string) => void;
  getNote: (id: string) => string;
  setNote: (id: string, text: string) => void;
  hasNote: (id: string) => boolean;
  /** Sorted ids of nodes that currently have a note — a stable signature for
   *  triggering a re-layout when inline notes change a card's height. */
  notedIds: string[];
  /** Clear every mark and note (used by a global reset). */
  clearAll: () => void;
}

const without = (list: string[], id: string) => list.filter((x) => x !== id);
const toggle = (list: string[], id: string) =>
  list.includes(id) ? without(list, id) : [...list, id];

export function useAnnotations(): Annotations {
  const [owned, setOwned] = usePersistedState<string[]>('hg-owned', []);
  const [inapplicable, setInapplicable] = usePersistedState<string[]>('hg-inapplicable', []);
  const [notes, setNotes] = usePersistedState<Record<string, string>>('hg-notes', {});

  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const inapplicableSet = useMemo(() => new Set(inapplicable), [inapplicable]);

  const isOwned = useCallback((id: string) => ownedSet.has(id), [ownedSet]);
  const isInapplicable = useCallback((id: string) => inapplicableSet.has(id), [inapplicableSet]);

  // The two marks are exclusive: turning either on removes the id from the other
  // (a no-op when it isn't there, so turning a mark OFF leaves the other untouched).
  const toggleOwned = useCallback(
    (id: string) => {
      setOwned((prev) => toggle(prev, id));
      setInapplicable((prev) => without(prev, id));
    },
    [setOwned, setInapplicable],
  );
  const toggleInapplicable = useCallback(
    (id: string) => {
      setInapplicable((prev) => toggle(prev, id));
      setOwned((prev) => without(prev, id));
    },
    [setOwned, setInapplicable],
  );

  const getNote = useCallback((id: string) => notes[id] ?? '', [notes]);
  const hasNote = useCallback((id: string) => Boolean(notes[id]?.trim()), [notes]);
  const notedIds = useMemo(
    () => Object.keys(notes).filter((id) => notes[id]?.trim()).sort(),
    [notes],
  );

  const setNote = useCallback(
    (id: string, text: string) =>
      setNotes((prev) => {
        // Drop empty notes so `hasNote` and storage stay tidy.
        if (!text.trim()) {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return { ...prev, [id]: text };
      }),
    [setNotes],
  );

  const clearAll = useCallback(() => {
    setOwned([]);
    setInapplicable([]);
    setNotes({});
  }, [setOwned, setInapplicable, setNotes]);

  return useMemo(
    () => ({
      isOwned,
      toggleOwned,
      isInapplicable,
      toggleInapplicable,
      getNote,
      setNote,
      hasNote,
      notedIds,
      clearAll,
    }),
    [isOwned, toggleOwned, isInapplicable, toggleInapplicable, getNote, setNote, hasNote, notedIds, clearAll],
  );
}
