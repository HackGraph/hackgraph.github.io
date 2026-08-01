import { REPO_URL } from './repo.js';

/**
 * Build stamp. Surfaced in the settings menu ("how current is this?") and attached to
 * report-issue links, so a content report is reproducible against the build it came from.
 *
 * Literals rather than build-time injection: the site is served straight from the repo
 * with no build step, so there is nowhere to inject. `node tools/stamp.mjs` rewrites the
 * two values below from git.
 */
export const BUILD_HASH = 'b273e44';
export const BUILD_DATE = '2026-07-31';

/** Human date, e.g. "Jul 1, 2026" (falls back to the raw string if unparseable). */
export const BUILD_DATE_LABEL = (() => {
  const d = new Date(BUILD_DATE);
  return Number.isNaN(d.getTime())
    ? BUILD_DATE
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
})();

/** Link to the exact commit this build was cut from. */
export const COMMIT_URL = `${REPO_URL}/commit/${BUILD_HASH}`;
