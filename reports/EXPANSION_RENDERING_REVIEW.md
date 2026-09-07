# Expansion rendering review — 7 September 2026 UTC

The renderer now spends substantially less synchronous time opening large branches. The change batches browser measurements and limits entrance effects to visible content. Graph placement still uses measured card heights before animation begins.

## Changes and evidence

- Fixed UI elements are cached within each mounted instance. Constructing another card no longer searches through the growing graph to find the same accessibility and UI anchors.
- Cards, connector paths, and captions are built in batches. Card heights and caption dimensions are read together, after the DOM is assembled and before opacity effects start.
- The expansion captures container dimensions before updating the graph and details. Its camera calculation can reuse those dimensions instead of forcing another layout of the newly created UI. The expanded mobile panel still uses an actual size measurement where necessary.
- The first rendering frame decides which entrances will be visible before allocating their opacity animations. Offscreen content remains available for panning, overview, keyboard navigation, and the topic list.
- A branch canceled before its first frame is removed immediately. The earlier implementation left 100 cards and 100 connector paths fading out after an immediate 100-child expand/collapse, even though the branch had never appeared. Offscreen exits also need no fade.

The initial profile separated graph resolution, DOM construction, browser sizing, graph placement, route/panel updates, and following the branch. On the 100-child fixture, placement and trunk selection took approximately 0.5 ms in Chromium; browser measurements and subsequent UI sizing were much larger. The fix addresses those measured costs. The pure graph solver and authored graph data were not changed in this pass.

## Paired measurements

[expansion-setup.json](expansion-setup.json) compares the previous working-tree renderer with this revision. Each browser/variant/count has one retained warmup and three measured 600 ms samples at 1440 × 1000. Only one browser page runs at a time. The table shows medians across the three measured samples, in milliseconds.

| Browser | Children | Setup before | Setup after | First callback before | First callback after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chromium | 25 | 6.3 | 2.3 | 9.9 | 5.2 |
| Chromium | 100 | 17.7 | 6.8 | 20.0 | 18.1 |
| Chromium | 250 | 45.1 | 14.1 | 50.4 | 32.2 |
| Firefox | 25 | 10 | 4 | 16 | 16 |
| Firefox | 100 | 27 | 12 | 28 | 16 |
| Firefox | 250 | 62 | 29 | 62 | 30 |

For 100 children, median synchronous setup falls about 62% in Chromium and 56% in Firefox. That reduction does not translate directly to the first callback: frame scheduling and subsequent browser work also contribute. Firefox's 25-child median first-callback delay is unchanged despite lower setup cost.

After the change, sample p95 inter-frame intervals range from 16.7–16.8 ms in Chromium and 17.18–17.50 ms in Firefox. No inter-frame interval exceeded 34 ms in the 18 measured after-change samples; one did in the earlier Chromium 250-child samples. These are local observations, not a universal frame-rate guarantee. The 250-child first callback still takes around 30–32 ms at the median, and Firefox setup still reaches 36 ms in that case. Larger diagrams continue to allocate DOM nodes and compute their layouts.

The measurements concern callback timing. They do not establish when pixels reached a physical screen, performance on phones, or perceived motion quality. The separate desktop motion capture supports human inspection.

A separate rendering-lab refresh recorded one Firefox 25-child sample with four intervals over 34 ms (p95 50.64 ms, maximum 66.92 ms). [rendering-before-lab-isolation.json](rendering-before-lab-isolation.json) retains it. That lab previously performed screenshots, accessibility analysis, and frame timing in the same browser process. Timing now starts a fresh process after the other checks close; all twelve samples in the subsequent [rendering.json](rendering.json) had zero intervals over 34 ms. The original outlier's cause was not established, so the new experiment does not justify attributing it to the accessibility tool or claiming that jank is impossible.

## Reproduction and regression coverage

With `npm run dev` running, `npm run render:expansion` measures the current renderer. Add `-- --baseline /path/to/earlier-view.js` to compare a saved implementation, and optionally `--report /path/to/results.json` to preserve an existing report. There are no environment-sensitive timing assertions in CI.

The JSON records both renderer SHA-256 hashes. [expansion-setup.patch](expansion-setup.patch) contains the exact before/after renderer change. Reversing that patch into a separate file was checked to reproduce the recorded earlier hash; it does not require replacing the working renderer. This baseline is the previous local implementation, not repository commit `4e4901f`.

`browser/expansion-rendering.spec.mjs` checks that varied measured card heights determine spacing and connector endpoints, and that immediate expansion/collapse/reset leaves no abandoned entrances. The existing motion regression now inspects effects after the first visibility decision and requires visible entrances without allocating them for the entire 100-child branch. Existing stability, reduced-motion, keyboard, caption, and staged-build checks remain part of the suite.

After the cancellation fix, all 111 unit tests and 96 Chromium/Firefox/WebKit browser tests passed. The actual-toggle fixture still preserves eight existing cards at desktop and 390 px widths, with 100 readable branch choices and no JavaScript errors. Desktop and mobile screenshots were refreshed and inspected; the desktop motion video was refreshed for human review. Accessibility checks reported no violations in the tested rendering-lab states.

This software improvement does not complete the broader knowledge review. The current content inventory and remaining editorial work are recorded in [VERIFICATION.md](VERIFICATION.md) and [HUMAN_REVIEW.md](HUMAN_REVIEW.md).
