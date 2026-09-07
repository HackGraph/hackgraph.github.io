# Publication provenance — 7 September 2026 UTC

The first provenance pass classifies **408 previously unclassified citation occurrences across 216 distinct URLs**, reducing the unresolved count from 737 to **329**. The classifications are explicit publication records, separate from graph claim comparisons. All authored graph data and all 98 existing claim-review records are unchanged.

| Publication family | Source type | Distinct URLs | Citation occurrences |
| --- | --- | ---: | ---: |
| HackTricks | Community | 64 | 160 |
| The Hacker Recipes | Community | 53 | 99 |
| MITRE ATT&CK | Taxonomy | 45 | 72 |
| MITRE CWE | Taxonomy | 3 | 4 |
| Internal All The Things | Community | 4 | 19 |
| GTFOBins | Community | 6 | 7 |
| LOLBAS | Community | 2 | 3 |
| Ansible documentation | Primary | 2 | 2 |
| Microsoft product documentation and bulletins | Primary | 18 | 18 |
| Microsoft Support | Primary | 3 | 7 |
| Microsoft Security Update Guide | Primary | 15 | 16 |
| Ubuntu security | Primary | 1 | 1 |

## Classification evidence and limits

[source-provenance.json](source-provenance.json) records the exact URL lists, reviewer, date, scope, supporting observations and publisher evidence. [source-provenance-capture.json](source-provenance-capture.json) records 34 successful publisher-identity captures with titles, canonical URLs, author metadata where supplied and content hashes. This was a targeted provenance pass, not a complete link-availability sweep. The existing three reference-access exceptions retain their earlier observations.

The [HackTricks repository](https://github.com/HackTricks-wiki/hacktricks) describes a collection of lessons from practice and other publications; its book identifies that repository and its canonical publication address. [The Hacker Recipes](https://www.thehacker.recipes/) identifies its creator and community-maintained guides. [Internal All The Things](https://swisskyrepo.github.io/InternalAllTheThings/), [GTFOBins](https://gtfobins.org/) and [LOLBAS](https://lolbas-project.github.io/) describe contributed collections about other software. Their community labels describe publication form; they do not deny that individual passages may contain original work.

[MITRE ATT&CK](https://attack.mitre.org/) identifies technique records, while [CWE](https://cwe.mitre.org/about/index.html) describes its weakness classification taxonomy. These record types support the taxonomy label. A label does not assess whether HackGraph uses a record appropriately.

The Microsoft Learn and Support captures establish publication titles, canonical Microsoft URLs and author metadata for the 21 distinct cited pages. Microsoft product documentation can accept outside contributions; the [contributor guide](https://learn.microsoft.com/en-us/contribute/content/) distinguishes documentation from Q&A and other community activity. The archived Microsoft blog citation remains outside this group. The [Ansible documentation](https://docs.ansible.com/) is the project's own product documentation, even though the software is developed by a community. [Canonical describes its Ubuntu CVE database](https://ubuntu.com/security/cves/about) as the source of Ubuntu-specific package status and notes.

The MSRC capture is a JavaScript application shell with the Security Update Guide's publisher title. This establishes publication identity only; it is not a new rendered-page inspection or comparison of vulnerability details. A web-reader request for the HackTricks book failed, while the separately recorded direct HTTPS retrieval succeeded. These observations are retained separately and are not interchangeable access results.

## Implementation

`src/data/source-provenance.js` is a compact generated lookup containing only the 216 exact URLs and their source types. The authored publication records remain in the development report. Runtime matching does not infer provenance from a hostname, URL prefix, query string or fragment. New URLs retain the unclassified state. Existing inline classifications are preserved; conflicts with publication records fail content validation.

This separation matters because 58 previously compared entries also contain unclassified supplemental readings. Rewriting their entry-level comparison snapshots merely to add source metadata would mix publication provenance with claim review. The new registry leaves every authored entry and exact review snapshot intact. Classification cannot add a claim comparison, change applicability or clear a stale review.

`npm run check:provenance` validates the records and verifies the generated snapshot without rewriting files. `node tools/source-provenance.mjs --write` deliberately regenerates the snapshot after records are edited. Staging requires the same verification before preparing the public artifact. Tests cover absent evidence, invalid dates, unsafe/duplicate URLs, conflicting inline labels, exact matching, stale-claim behavior and read-only verification failure. Reading-page checks now compare every reference's label, destination and source type, in addition to selected claim citations. Browser coverage exercises source labels, link focus and visibility at desktop/mobile widths through the actual adapter and panel renderer.

## Verification and remaining work

The full local suite passed **140 unit tests and 126 browser tests** across Chromium, Firefox and WebKit. Staging and read-only artifact verification passed for all **69 public files**. All seven generated reference outputs are byte-identical after repeated generation. [source-provenance-verification.json](source-provenance-verification.json) records the artifact digest, exact public changes, source hashes and unchanged graph data.

Additional inspection found a real mobile layout defect: long unbroken strings in prose and headings expanded the Active Directory reading page to 576 px at a 390 px viewport. Article text now wraps within its available width, while code blocks retain preformatted scrolling. A new browser regression checks all three complete map reading pages at phone width. Comparing every generated reading page’s body before and after the CSS correction confirms that the wrapping fix changes no authored text or markup.

[source-provenance-visual-check.json](source-provenance-visual-check.json) records eight additional states: four actual category panels, two reading-guide states and two JavaScript-disabled map reading states. All have no horizontal overflow or runtime errors; the six JavaScript-enabled states passed WCAG-tagged axe checks. Four screenshots were visually inspected. These checks cover source-type presentation and layout, not operational content. The first browser fixture selected a card before mounting completed and then omitted mobile disclosure; both test-setup failures were corrected before the passing full run. A subsequent Firefox run stalled awaiting the font promise with JavaScript disabled, despite direct inspection showing all font faces loaded and the correct page width. The regression now polls the loaded state explicitly. A trace also exposed a mobile fixture race: its visibility check ran before the layout observer switched modes. The test now waits for the narrow-layout class and deliberately opens the mobile panel, with repeated targeted checks before the passing full run.

The content report separately counts 408 citations classified by the registry and 329 unresolved citations. Of the 918 dedicated graph-reference occurrences, 181 already had explicit inline classifications. Provenance changes do not increase the claim-review count: 209 selected conceptual claims across 98 entries remain recorded, while 292 technique nodes and all 765 connections lack claim-level review. Nine techniques and all connections still lack dedicated references. No operational validation, human review, hosted workflow execution or deployment was performed.
