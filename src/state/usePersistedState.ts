import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * A `useState` whose value is mirrored to localStorage under `key`, so a user
 * preference (focus mode, future toggles) survives reloads. JSON-serialised; falls
 * back to `initial` when storage is empty, unparseable, or disabled (private mode),
 * mirroring how `useTheme` guards its writes. The setter has the same signature as
 * `useState`'s, so callers can pass a value or an updater.
 */
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // private mode / storage disabled — the in-memory state still drives the UI.
    }
  }, [key, value]);

  return [value, setValue];
}
