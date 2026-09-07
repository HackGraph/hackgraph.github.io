// Development identity. The staged build injects its digest, date, and clean commit.
// This date is also the committed reference-publication date, not a content review date.
export const BUILD_HASH = 'development';
export const BUILD_DATE = '2026-09-06';
export const BUILD_COMMIT = null;

/** Human date, e.g. "Jul 1, 2026" (falls back to the raw string if unparseable). */
export const BUILD_DATE_LABEL = (() => {
  const d = new Date(BUILD_DATE);
  return Number.isNaN(d.getTime())
    ? BUILD_DATE
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
})();
