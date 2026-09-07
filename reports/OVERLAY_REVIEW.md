# Graph overlay and keyboard review — 7 September 2026 UTC

The topic list could cover the card that had just been expanded at tablet and landscape sizes. Help and Settings could remain over a card after keyboard users returned to the graph. The renderer now positions the list around the expansion origin and dismisses those transient panels when focus enters a graph card. Mobile filters also follow their existing outside-click behavior when keyboard focus returns to a card; desktop filters keep their persistent behavior.

The list's height uses the actual space between the card, toolbar and detail panel. Short landscape windows keep at least a complete choice row visible. If rotation leaves the card below the left controls, the camera uses the wider central space. Resizing updates the existing list rather than replacing its buttons, preserves its focused choice, and adjusts its scroll position to keep that choice visible. Geometry is measured during expansion or container resize, outside the animation-frame loop.

## Evidence

- [overlay-before-expanded.json](overlay-before-expanded.json) records 42 generic course states across seven viewport sizes. Twelve states had a focused card intersecting a visible overlay: two topic-list cases, six Help cases and four Settings cases. No focused card was outside the viewport, and no runtime errors were observed.
- [overlay-after.json](overlay-after.json) repeats the same 42 states with zero observed focused-card intersections, viewport exits or runtime errors. Four corresponding screenshots were inspected.
- [overlay-integrated.json](overlay-integrated.json) checks the actual HackGraph application at 1024 × 768 and 844 × 390 after its initial expansion. Both states had no focused-card obstruction or WCAG-tagged axe violations. Two screenshots were inspected.
- [overlays.spec.mjs](../browser/overlays.spec.mjs) adds five regressions per browser: two expansion origins, two keyboard return flows, and one resize sequence. The resize check preserves the exact focused DOM node, a scrolled list, a complete visible row and the readable expansion origin. All fifteen targeted cases passed across Chromium, Firefox and WebKit.

The first four regressions failed against the preceding renderer and passed after the correction. An additional resize test exposed an origin left below the toolbar controls after rotation. The stronger focused-row check also protects against focus remaining on a choice below the visible scroll area. A WebKit test setup initially assumed a pointer click focused the Help button; the test now opens Help and Settings by keyboard from an explicitly focused opener, then follows the real reverse tab order back to the graph.

The exact preceding renderer was reconstructed in a private comparison file and verified against its pre-change SHA-256, `54cfe1d652836a78f11519080cb25a2b84064dad8b44ece3143ea82d2574a4b3`. The public renderer was not reverted. [overlay-expansion-timing.json](overlay-expansion-timing.json) records the paired expansion measurements; [overlay-verification.json](overlay-verification.json) records the final suite and public artifact.

Final verification passed 144 unit tests and all 144 browser cases: 48 each in Chromium, Firefox and WebKit. The unit command, each browser project and read-only build verification returned exit 0. Generated reading pages repeat exactly, and the same 69-file artifact was used across the browser runs. Among public inputs, only `engine/view.js` changed from the preceding verified artifact; all imported graph fields and every content-review record are unchanged.

These measurements concern focused cards and the tested controls. They do not certify every caption against overlays, arbitrary container dimensions, physical-device behavior, actual Safari, screen-reader usability or human judgment of motion. Domain content, citations, review records and graph connections are unchanged. The broader content review remains incomplete.

## Expansion cost

The paired timing run used one active browser page at a time, after screenshot and accessibility work had finished. Each browser, renderer and child count has four observations; the first is retained as warmup and excluded from the medians below. This is a local headless sample, not a physical presentation measurement.

| Browser / children | Setup median before → after | First callback median before → after |
| --- | --- | --- |
| Chromium / 25 | 1.7 → 3.3 ms | 7.2 → 6.6 ms |
| Chromium / 100 | 5.3 → 8.8 ms | 9.8 → 12.8 ms |
| Chromium / 250 | 14.7 → 17.5 ms | 23.0 → 19.9 ms |
| Firefox / 25 | 5 → 8 ms | 16 → 16 ms |
| Firefox / 100 | 12 → 13 ms | 18 → 16 ms |
| Firefox / 250 | 25 → 31 ms | 27 → 33 ms |

The measurements add approximately 1–6 ms of synchronous setup in these groups. First-callback results are mixed; the Firefox 250-child median rises by 6 ms. All sampled consecutive animation-frame intervals stayed below 34 ms. The improved placement therefore has a measurable upfront cost, and the 250-child case still warrants human motion assessment. Earlier layout and rendering benchmarks retain their original source hashes and results.
