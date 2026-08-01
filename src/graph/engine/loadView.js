/**
 * Loader for the engine's view layer.
 *
 * The stylesheets are <link>ed from index.html, not imported here: without a bundler a
 * JS module cannot pull in CSS, and the browser fetches them in parallel anyway.
 *
 * `view.js` is a classic script: it resolves the engine from `globalThis.GraphEngine` at
 * evaluation time and publishes itself the same way. Static ESM imports are hoisted, so the
 * engine has to be planted BEFORE the view module is evaluated — hence a dynamic import
 * behind a memoised promise rather than a plain top-level import.
 *
 * Kept separate from the React component so the awkwardness lives in one place and the
 * component reads as an ordinary effect.
 */
import { GraphEngine } from './index.js';

/** Everything the host can do to a mounted view. Mirrors `api` in view.js. */

/** What `onSelect` hands back when the lit selection changes. */

let pending = null;

/** Resolve the view module, loading it at most once per page. */
export function loadGraphView() {
  if (!pending) {
    // the view reads this on evaluation; it must exist first
    (globalThis).GraphEngine = GraphEngine;
    pending = import('../../../engine/view.js').then(() => {
      const view = (globalThis).GraphView;
      if (!view) throw new Error('graph view failed to publish itself on globalThis');
      return view;
    });
  }
  return pending;
}
