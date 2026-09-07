# Citation presentation — 7 September 2026 UTC

Reviewed claims now show the claim, its source section, and named source links as separate blocks. Previously, generic “Source 1” links ran into the section text, making it harder to identify and inspect the supporting publication. The graph panels and generated reading pages now use the entry's declared reference labels, preserve citation order and destinations, and give links a visible keyboard-focus outline. Long titles, section names and fallback URLs wrap inside the available width.

The engine takes link labels from the current entry's `details.refs`. A shared definition's references do not supply labels for that entry's claims. A valid URL without a declared label is displayed as its URL; no publication name is guessed. The existing URL protocol check still applies, and text remains DOM text. These changes neither fetch a publication nor establish support for a claim.

[citation-presentation.patch](citation-presentation.patch) records the renderer, stylesheet and generator changes for this pass.

The generated pages use the same presentation and remain readable without JavaScript. The existing reading-page regression now checks each of the **180 recorded claims** against its own source links, including exact labels, citation order and URLs. Checking the general references section alone could previously miss a wrong or missing link beside the claim.

## Additional presentation checks

[citation-panel-check.json](citation-panel-check.json) records 18 Chromium states:

| Scope | States | Checks |
| --- | ---: | --- |
| Generic node and connection panels | 8 | Named and fallback links, literal text, entry-specific reference labels, long section names, desktop/390/320 px widths, both themes, enlarged text, keyboard order and focus outline |
| Actual Service Account and Host Controls panels | 8 | Every selected claim and its named citations, desktop/390 px widths, both themes, source-section spacing and wrapping |
| Linux reading page with JavaScript disabled | 2 | Exact claims/citations, desktop/390 px widths, spacing, wrapping and keyboard order |

All checked citation blocks fit their container, with source sections and links separated and no overlapping links. The sixteen graph-panel states passed WCAG-tagged axe checks. The two JavaScript-disabled reading-page states did not run axe. A locally mocked reference destination verified Enter-key activation; that observation is a navigation check, not a source-availability result. No runtime errors were reported. Ten screenshots in `visuals/citations-*.png` were visually inspected.

The full local suite passed **131 unit tests and 117 browser checks**. The current suite and artifact results are in [VERIFICATION.md](VERIFICATION.md); [citation-verification.json](citation-verification.json) records the source hashes and unchanged imported graph data. These presentation checks do not replace screen-reader or physical-device testing, and no new motion benchmark is claimed.

## Remaining scope

Content coverage is unchanged: 180 selected conceptual comparisons across 86 graph entries. Another 304 technique nodes and 765 connections lack claim-level comparisons. Sixteen techniques and all 765 connections lack dedicated references. The [human-review inventory](HUMAN_REVIEW.md) preserves the substantive content backlog and platform-testing limits. This pass does not establish command applicability or operational path viability.
