# Large expansion and sidebar disclosure — 7 September 2026 UTC

Opening a branch no longer constructs the detailed topic list inside the sidebar's closed disclosure. That list is populated when the reader opens it, then retained for subsequent closing and reopening while the same panel remains selected. Its icons are cloned from a DOM template, avoiding serialization and reparsing of each row's existing content.

The graph's cards, layout, connectors, visible branch chooser, and authored data are unchanged. This targets work that previously delayed the graph's first frame even when the sidebar list was never opened.

## Evidence

The initial instrumented profile of 250-topic expansions attributed approximately 4.3 ms in Chromium and 6.7 ms in Firefox to route, panel and focus updates. Card/caption sizing remained a separate substantial cost. The measurements below use the uninstrumented before/after renderers, one browser page at a time, at 1440 × 1000. Each browser/source/count has one retained warmup and three measured repetitions.

[large-expansion.json](large-expansion.json) records the complete expansion samples, browser versions, method, and renderer hashes. [large-expansion.patch](large-expansion.patch) records the exact renderer change and subsequent two CSS color corrections. The previous working-tree renderer's SHA-256 is `65e557ebbc7cc86c303479240b9f0be25a96fc742c4d9c6a75a3453898d14d48`; the revised renderer hash is `3565f1437fbb26e03b9d7024da243920c3175e28c0233e574677a95063dc3052`.

Median times in milliseconds:

| Browser | Topics | Expansion setup before | After | First callback before | After |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chromium | 25 | 4.6 | 1.9 | 11.3 | 6.5 |
| Chromium | 100 | 7.1 | 5.7 | 17.9 | 14.7 |
| Chromium | 250 | 14.2 | 11.2 | 30.9 | 21.6 |
| Firefox | 25 | 9 | 4 | 15 | 5 |
| Firefox | 100 | 11 | 10 | 12 | 14 |
| Firefox | 250 | 26 | 21 | 28 | 23 |

The 250-topic setup median fell about 21% in Chromium and 19% in Firefox. First-callback timing did not improve in every case: Firefox's 100-topic median increased from 12 to 14 ms despite less synchronous setup. No measured before/after expansion sample had an inter-frame interval above 34 ms in this experiment. The earlier rendering experiments remain separate observations, including their retained outliers.

## Cost of opening the sidebar list

Deferral moves some construction to disclosure, so a separate experiment measured the first opening, closing, and reopening. [sidebar-disclosure.json](sidebar-disclosure.json) retains all 96 observations, including warmups; 72 observations contribute to grouped statistics. Both source variants use the same sequence and measurement method.

For 250 topics, the mounted application contains 4,903 elements immediately after expansion in the earlier renderer and 2,903 in the revised renderer: **2,000 fewer hidden elements**. Opening the list restores all 250 topic rows and their connection buttons, bringing the element count to the same 4,903. At 100 topics, 800 elements are deferred.

| Browser | Topics | First disclosure handler before | After | First callback before | After |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chromium | 100 | 0.1 | 1.1 | 12.9 | 14.0 |
| Chromium | 250 | 0.1 | 1.7 | 12.3 | 12.5 |
| Firefox | 100 | 0 | 5 | 11 | 7 |
| Firefox | 250 | 1 | 4 | 9 | 9 |

Opening now includes row creation; it was previously prepaid during expansion. No measured disclosure, closing or reopening sample had an inter-frame interval above 34 ms. This does not mean the added work is free, or that every first callback fits within one display interval.

A subsequent current-renderer run using the published `tools/sidebar-lab.mjs` did record long intervals. [sidebar-disclosure-followup.json](sidebar-disclosure-followup.json) retains all 48 observations, with 36 contributing to grouped statistics. Two Firefox 250-topic samples—closing in repetition 2 and reopening in repetition 3—each had four intervals above 34 ms. Their p95 intervals were approximately 50 ms and maxima reached 50.56 ms. Their handlers took 0–1 ms. The cause is unestablished; the earlier clean samples do not override these results. Large-list motion still needs further profiling and physical-device review before any consistent-frame-rate claim.

## Verification and limits

The opened-list accessibility check also found two dark-theme hover problems: the closed disclosure label had a 4.11:1 contrast ratio, and the opened topic-count badge had a 4.44:1 ratio in the 250-topic mobile check. Both were below the required 4.5:1; [W3C's explanation of SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) also explicitly includes hover text. The closed button now darkens on hover, and the opened count uses the stronger existing text color. These are two color-only CSS changes; the timing captures above precede them. Desktop/mobile, both-theme, closed/open and normal/hover regression checks cover the corrected control.

The new browser regression checks the 250-choice branch, deferred rows, complete first/last topic text and summaries, all connection controls, keyboard disclosure, focus skipping the closed list, reuse without duplicate rows, navigation to the final topic, and a fresh closed list after returning to the parent. Existing connection-detail tests continue to exercise opening a connection from an unexpanded selection. The first WebKit attempt clicked immediately after reopening an animating list and failed to select the final row; the test now waits for tracked CSS transitions before that interaction and passed its targeted rerun.

The complete assembled-build results are recorded in [VERIFICATION.md](VERIFICATION.md). No timing threshold is added to CI. These local headless experiments measure JavaScript and animation callbacks, not physical presentation or perceived quality. The 250-topic setup and first-callback times still exceed a frame budget in some cases. Physical-device and human motion review remain necessary.

After both corrections, the full suite passed **131 unit tests and 105 browser checks**. All four opened-list Chromium scenes (desktop/mobile, dark/light) passed whole-page axe and horizontal-overflow checks while retaining 251 graph cards, 250 connectors, 250 topic rows, and 250 connection controls. [sidebar-panel-check.json](sidebar-panel-check.json) records the states and screenshots; all four images were visually inspected. [large-expansion-verification.json](large-expansion-verification.json) records the final 68-file artifact, source/stylesheet hashes, unchanged graph data, repeatable generated pages, and the retained timing limitation.

To repeat the expansion comparison, run `npm run dev` and `npm run render:expansion -- --baseline /path/to/previous-view.js --report /path/to/output.json`. The equivalent disclosure command is `node tools/sidebar-lab.mjs --baseline /path/to/previous-view.js --report /path/to/output.json`. Both tools can measure the current renderer alone by omitting `--baseline`.

This rendering change does not reduce the outstanding content-review inventory. The broader goal remains incomplete; see [HUMAN_REVIEW.md](HUMAN_REVIEW.md).
