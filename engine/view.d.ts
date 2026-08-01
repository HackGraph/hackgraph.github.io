/**
 * `view.js` is a classic script imported purely for its side effect: evaluating it
 * publishes `globalThis.GraphView`. It has no exports of its own, so there is nothing to
 * describe here beyond that. The surface a host actually uses is typed by the host —
 * see `src/graph/engine/loadView.ts`.
 *
 * The engine itself is plain JavaScript with no build step; this file exists only so a
 * TypeScript consumer can import the script without an implicit-any error.
 */
declare const _default: unknown;
export default _default;
