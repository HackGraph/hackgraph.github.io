/**
 * Typed handle on the graph engine, which lives at the repo root in `engine/`.
 *
 * The engine is a self-contained project that knows nothing about security: its own tests,
 * spec and demo sit beside it, and `npm test` runs them. It used to live in a sibling
 * directory and be copied in byte-for-byte, which quietly lost edits in both directions;
 * there is one copy now, and this file is a view onto it, not a duplicate of it.
 *
 * Nothing app-specific belongs in the engine. That is what `engineAdapter.js` is for.
 *
 * It is a plain script with no ESM exports: evaluating it publishes `globalThis.GraphEngine`.
 * So it is imported for the side effect and the result read off the global — a default
 * import would type-check but resolve to nothing: the script has no ESM exports.
 */
import '../../../engine/engine.js';

const vendored = (globalThis).GraphEngine;
if (!vendored) throw new Error('graph engine failed to publish itself on globalThis');

export const GraphEngine = vendored

 ;
