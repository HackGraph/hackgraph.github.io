import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'hg-theme';

/** Read the theme the no-flash inline script (index.html) already resolved, so the
 *  hook agrees with what is painted. Dark is the default; light is opt-in. */
function initialTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === 'light' || attr === 'dark') return attr;
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
}

/**
 * App-wide dark/light theme. The theme is just a `data-theme` attribute on <html>;
 * every colour is a CSS var that flips under `html[data-theme='light']` (see
 * index.css), so nothing else needs to know about the theme. Persisted to
 * localStorage and applied to the document.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // private mode / storage disabled — the in-memory state still drives the UI.
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { theme, toggle };
}
