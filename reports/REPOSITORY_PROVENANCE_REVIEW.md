# Repository and project-documentation provenance — 7 September 2026 UTC

This pass classifies **95 additional citation occurrences across 84 exact URLs**. Together with the first publication pass, the explicit registry now covers **503 occurrences across 300 URLs in 63 groups**. Another **234 reference occurrences** remain unclassified. All authored graph data and all 98 existing claim-review records are unchanged.

| Material added in this pass | Distinct URLs | Citation occurrences |
| --- | ---: | ---: |
| Project source material, documentation and maintainer advisories — primary | 68 | 76 |
| Contributed guides, knowledge collections and development discussions — community | 15 | 18 |
| Authored research article — research | 1 | 1 |
| Total | 84 | 95 |

## Evidence and classification decisions

[source-provenance.json](source-provenance.json) records the 51 additional classification groups, exact URL lists, reviewer, date, supporting observations and evidence hashes. Each repository has its own record; the two pull requests have separate development-discussion records. These are publication-type decisions, not comparisons of graph claims with source text.

[repository-provenance-capture.json](repository-provenance-capture.json) contains 40 repository-metadata responses and 53 exact citation-page responses. All returned HTTP 200. Repository ownership, project titles, file breadcrumbs, wiki identity and publication introductions were inspected. A repository's `fork: false` metadata alone does not establish originality; projects that acknowledge earlier work are classified as primary only for their own source material and documentation.

[project-documentation-provenance-capture.json](project-documentation-provenance-capture.json) contains 31 exact citation-page responses and 11 supporting identity-page responses. All 31 citations and ten identity pages returned HTTP 200. An additional, uncited SpecterOps `/home` identity probe returned 404 and was not used as evidence. The actual cited SpecterOps documentation pages were retrieved and identified separately.

The documentation decisions cover BloodHound, SpecterOps open-source projects, NetExec, PowerSploit, Juicy Potato, Sudo and Samba. Project names, page titles, project links and maintainer publication identity establish their publication form. These classifications do not establish the correctness of platform claims or HackGraph connections. The Hacker Tools introduction describes independent documentation about other projects, supporting a community label. The CravateRouge article identifies its author and research-publication context, supporting a research label.

The compiled references and knowledge bases receive community labels. This includes Misconfiguration Manager, whose introduction describes a curated, contributed knowledge base. The two cited pull requests receive community labels as development discussions; no merge, release or behavior claim was checked.

## Citation destination findings

[repository-citation-findings.json](repository-citation-findings.json) preserves three observations with their exact URLs, entry pointers, response dates, titles and capture hashes:

- One Certipy chapter URL redirects to the wiki Home page. Its project identity and publication type are identifiable, but the requested chapter has not been recovered. This remains an editorial issue; a successful HTTP response does not resolve it.
- Two PayloadsAllTheThings references now contain publisher-written relocation notices and linked outlines. The source family is identifiable, but the original chapter text is no longer served by those files. The notices have been recorded; correspondence between destination text and citing claims has not been assessed.

Two repository citations also redirect to renamed or transferred repositories. The GitHub metadata and citation-page responses agree on their current repository identities. Those observations are recorded in the relevant provenance groups. Authored citation URLs remain unchanged throughout this pass.

## Verification and remaining work

[repository-provenance-verification.json](repository-provenance-verification.json) records the completed checks for this pass. Existing tests cover exact-URL matching, disagreement between recorded and public source types, preservation of claim-review status, source labels in generated reading pages, and browser presentation. No rendering logic or styles changed in this pass.

The earlier [publication provenance pass](SOURCE_PROVENANCE_REVIEW.md) retains its own test receipt and visual evidence. The new classifications affect 82 graph entries, including four entries with selected conceptual comparisons; they do not add or broaden those comparisons. Source-access observations in the complete URL inventory retain their existing dates. These targeted captures do not constitute a new complete URL audit.

The remaining 234 source-type classifications, broader conceptual content review and human acceptance work are still outstanding. Commands, applicability, graph route viability, physical-device testing and hosted deployment were not validated in this pass.
