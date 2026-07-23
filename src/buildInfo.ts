import { REPO_URL } from './state/repo';

/**
 * Build stamp injected from git at build time (see vite.config.ts). Surfaced in the
 * settings menu ("how current is this?") and attached to report-issue links so a
 * content report is reproducible against the exact build it was filed from.
 */
export const BUILD_HASH = __BUILD_HASH__;
export const BUILD_DATE = __BUILD_DATE__;

/** Human date, e.g. "Jul 1, 2026" (falls back to the raw string if unparseable). */
export const BUILD_DATE_LABEL = (() => {
  const d = new Date(BUILD_DATE);
  return Number.isNaN(d.getTime())
    ? BUILD_DATE
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
})();

/** Link to the exact commit this build was cut from. */
export const COMMIT_URL = `${REPO_URL}/commit/${BUILD_HASH}`;
