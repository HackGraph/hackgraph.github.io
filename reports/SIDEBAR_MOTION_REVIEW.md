# Sidebar motion follow-up — 7 September 2026 UTC

The sidebar now animates an outer container while its topic rows keep their natural height. The previous fractional grid row repeatedly recalculated the large list during opening and closing. The change removes most of that measured layout work while preserving the 220 ms reveal, interruption behavior, and complete topic/connection controls.

The list is still built only when first opened. Its natural height is measured once; a ResizeObserver updates that height when wrapping or text metrics change. Observers are disconnected when details close, another node or connection replaces the panel, the map changes, or the instance is destroyed. Without ResizeObserver, automatic height keeps the disclosure usable and responsive, with an immediate size change.

## Measured layout work

[sidebar-reflow.json](sidebar-reflow.json) contains the Firefox profiler comparison, exact renderer/stylesheet hashes, browser build, extracted marker intervals, and hashes of the retained raw profiles. Each source variant opened a generic 250-topic list at 1440 × 1000, then performed six close/reopen cycles. The first cycle is retained as warmup; the other five determine the table below.

Values are cumulative elapsed time covered by Reflow markers within each **450 ms observation window**, in milliseconds. Nested intervals are merged to avoid double counting.

| Action | Median before | Median after | After range |
| --- | ---: | ---: | ---: |
| Close | 123.96 | 4.10 | 3.72–8.08 |
| Reopen | 129.76 | 4.81 | 4.68–5.29 |

That is about **96% less recorded reflow time** in these profiled cycles. These measurements include profiler overhead and are elapsed marker durations, rather than independent CPU accounting. Mozilla documents [profiler markers and overhead](https://firefox-source-docs.mozilla.org/tools/profiler/code-overview.html) and [startup capture to a local file](https://firefox-source-docs.mozilla.org/networking/http/logging.html#capturing-a-profile-with-logs-at-startup). Raw profiles remain in the ignored `.cache/sidebar-motion/` directory; extracted intervals in the report allow the aggregation to be checked independently.

An earlier diagnostic inserted a synchronous layout read during each frame. Changing flex to block flow or preserving the grid item's natural height did not materially reduce those reads. The measured-height prototype reduced their p95 from about 8 ms to 1 ms. The final native-profiler comparison above verifies the implemented approach without adding those per-frame reads to the application.

## Callback timing and tradeoffs

[sidebar-motion.json](sidebar-motion.json) records the separate, unprofiled Chromium/Firefox comparison at 100 and 250 topics. Each browser/source/count has one warmup and three measured repetitions of first opening, closing and reopening. All 72 measured observations had no frame interval above 34 ms. The earlier eight Firefox outlier intervals remain preserved in [sidebar-disclosure-followup.json](sidebar-disclosure-followup.json); they were not reproduced in the latest before **or** after samples. This experiment therefore does not establish the cause of each earlier outlier.

First opening now pays for the height measurement in the click handler. At 250 topics:

| Browser/action | Handler before | Handler after | First callback before | First callback after |
| --- | ---: | ---: | ---: | ---: |
| Chromium, first open | 1.8 | 8.5 | 13.3 | 19.0 |
| Chromium, close | 0.1 | 0.1 | 8.3 | 1.9 |
| Chromium, reopen | 0.1 | 0.1 | 4.7 | 15.7 |
| Firefox, first open | 6 | 15 | 11 | 15 |
| Firefox, close | 0 | 1 | 5 | 7 |
| Firefox, reopen | 0 | 0 | 9 | 7 |

These are medians in milliseconds. The improvement is substantially less repeated layout during motion; the first-callback values are mixed. They do not establish physical display presentation time or uniformly lower input latency.

The lab now captures chronological frame intervals and CSS transition events, rather than only sorted timing summaries. It also serves and hashes both renderer and stylesheet variants. To reproduce, start `npm run dev`, then run `node tools/sidebar-lab.mjs --baseline /path/to/previous-view.js --baseline-css /path/to/previous-style.css --report /path/to/output.json`. Omitting either baseline file uses the current source for that file. [sidebar-motion.patch](sidebar-motion.patch) records this pass's runtime changes.

## Verification and remaining scope

Four new scenarios run in all three browsers. They seek the actual CSS transition to verify stable inner geometry and continuous reversal, check live reduced motion, resize wrapped labels, change text size after opening, exercise the no-observer fallback, and check observer release across the panel lifecycle. The earlier 250-topic keyboard/list-completeness and theme/hover-contrast regressions also remain required.

The complete local suite passed **131 unit tests and 117 browser checks**. [sidebar-motion-verification.json](sidebar-motion-verification.json) records the artifact checks and source hashes; [VERIFICATION.md](VERIFICATION.md) remains the current handoff. The graph's authored data and placement algorithm are unchanged.

The additional visual and accessibility check is recorded in [sidebar-motion-panel-check.json](sidebar-motion-panel-check.json). Its videos are supplied for human motion review and are not performance ratings. Physical-device, Safari and assistive-technology review remain necessary. The broader technique and connection content review remains incomplete.
