# Human-review handoff

This review inventory remains provisional. Software checks and foundational-definition comparisons are complete for this pass, but the broader graph content audit remains unfinished. Human review has not started. The [completion status](COMPLETION_STATUS.md) maps the original requirements to completed evidence and remaining work. This document does not establish that only human review remains or that the project is ready to publish. The [defensive review](DEFENSIVE_REVIEW.md) records concrete taxonomy, source-location, and graph-model findings.

## Review material

| Material | Count | Recorded state |
| --- | ---: | --- |
| Glossary definitions | 91 | AI source comparisons complete; no human comparisons |
| Shared relationship definitions | 4 | Three AI source comparisons; one project convention; no human review |
| Graph nodes | 390 | 124 entries have 264 selected conceptual AI claim comparisons: 71 categories, eight start/goal overviews, and 45 technique-classified entries; 266 technique nodes have no claim-level comparison |
| Graph connections | 765 | No claim-level review recorded |
| Total inventory | 1,250 | No human reviews recorded |

Publication-provenance decisions are recorded separately in [source-provenance.json](source-provenance.json): 226 current publication groups covering 484 exact citation URLs, with AI classification records. These are additional evidence for inspection and are not counted as graph claim reviews or as items in the 1,250-entry content inventory.

The [citation presentation pass](CITATION_PRESENTATION.md) separates each selected claim, source section and named reference link in graph panels and reading pages. These changes make the evidence easier to inspect without changing its review status.

Use [review-inventory.csv](review-inventory.csv) for filtering and [review-inventory.json](review-inventory.json) for full source-access observations and exact entry pointers. Each item has a stable key. Graph entries with valid comparison records also include their reviewer, scope, and claims; the CSV includes scope, claim count and a separate citation-destination-issues column. Keep working notes in a separate file keyed by that value; the inventory is generated and should not hold handwritten decisions. Run `npm run review:inventory` to refresh it after content or audit changes.

The [glossary](../glossary.html) is the simplest starting point for checking beginner explanations. Its [source retrieval records](glossary-source-capture.json) and [exact comparison snapshots](../src/data/glossary-reviews.js) identify what was compared. Source links and AI comparisons do not replace the editor's judgment.

The graph panels and [definition review](RELATIONSHIP_REVIEW.md) cover the four shared labels. Their evidence is now separate from each connection's claims. Definition changes invalidate the exact comparison record; project conventions do not count as independent source comparisons.

The [category review](CATEGORY_REVIEW.md), [access-model follow-up](ACCESS_MODEL_REVIEW.md), [Windows/Linux foundations review](PLATFORM_FOUNDATIONS_REVIEW.md), [AD foundations review](AD_FOUNDATIONS_REVIEW.md), and [entry/goal review](CONTEXT_REVIEW.md) document 79 corrected overviews and their 163 selected comparisons. These are selected conceptual claims; they do not cover the categories' linked techniques or connection outcomes. The subsequent [identity review](IDENTITY_REVIEW.md) adds 17 selected comparisons in seven technique-classified entries and fills one missing-reference gap. The [authentication review](AUTHENTICATION_REVIEW.md) adds 15 selected comparisons in six further entries and fills another missing-reference gap. The [execution-context review](EXECUTION_CONTEXT_REVIEW.md) adds 14 selected comparisons in six further entries that lacked references. The [KDC-account review](KERBEROS_ACCOUNT_REVIEW.md) adds four selected comparisons in one further entry and fills another missing-reference gap. The [Windows privilege review](WINDOWS_PRIVILEGE_REVIEW.md) adds eighteen selected comparisons in nine further entries, using explicitly labeled archived policy references alongside API documentation. The [Linux configuration review](LINUX_CONFIGURATION_REVIEW.md) adds sixteen selected comparisons in eight further entries. The [missing-reference review](MISSING_REFERENCE_REVIEW.md) adds seventeen conceptual comparisons in eight previously uncited entries. These conceptual comparisons do not cover the commands, applicability, or connections associated with those entries.

## Remaining content and human review

- The [sidebar motion follow-up](SIDEBAR_MOTION_REVIEW.md) removes most measured repeated layout work during disclosure while preserving motion, resizing and keyboard behavior. Earlier Firefox timing outliers remain documented; they were not reproduced in the latest before/after run, so the cause of each outlier is unestablished. New desktop/mobile captures support human motion review. This software improvement does not complete the broader content review.

- The [CVE identifier audit](CVE_IDENTIFIER_REVIEW.md) confirms matching PUBLISHED records for all 68 explicit IDs in the scanned fields. Citation-to-claim correspondence remains unreviewed; publication status does not reduce the outstanding graph-entry count.

- All 311 technique entries now have dedicated references for at least part of their content. All 765 connections still lack dedicated references. The inventory also includes organizational nodes; a zero-reference count alone is not a finding that such a node is incorrect.
- All 961 active graph reference occurrences have recorded source types: 229 explicit labels and 732 classifications across 484 registry URLs. The [citation retirement](CITATION_RETIREMENT_REVIEW.md) removes misleading or unlocated references and preserves their historical records. Source classification does not establish claim support.
- No active citations retain recorded wrong-destination or unlocated-source issues. The [citation retirement](CITATION_RETIREMENT_REVIEW.md) removes the product-page link, unlocated n00py article and mislabeled research index; the Golden SAML entry receives an explicitly labeled taxonomy reference. This does not recover the original articles. The Vectra citation uses publisher attribution, while its conflicting individual-author metadata remains documented in the [earlier follow-up](KERBEROS_ACCOUNT_REVIEW.md).
- Five source URLs have direct-access exceptions across six inventory items: four blocked requests and one unreachable URL. IFCR, Akamai and the relocated Sophos publication have separate publication-location evidence. The current combined HTTP inventory contains 874 URLs: 869 responded, four were blocked and one was unreachable. The latest citation correction refreshed one taxonomy URL and retired three URLs; other observations retain their prior dates. Retirement does not mean the earlier failed requests recovered.
- The revoked ATT&CK identifier finding is resolved: both references now use T1685, MITRE's explicitly declared replacement for T1562.001. The [expanded audit](TAXONOMY_CITATION_REVIEW.md) covers 117 mapped or cited technique/tactic IDs, all active in the recorded Enterprise ATT&CK 19.2 dataset. Mapping suitability and the claims attached to an ID remain separate questions.
- Connection semantics require careful review: 339 edges touch categories and 651 omit a canonical relationship ID. The inventory now exposes endpoint kinds and authored explanations. These counts do not establish whether a connection is organizational or behavioral, and should not be used to assign that meaning automatically.
- The graph's operational procedures, command applicability and route viability have not been validated by this work.
- Physical-phone behavior, Safari on Apple hardware, and real screen-reader usability still need direct human testing. Playwright WebKit coverage does not establish those results.

## Recording an editorial decision

For each explanation being reviewed, record the precise claim, its supporting source section, the reviewer, the actual date and the scope of the comparison. If the source does not support the claim, record the uncertainty or revise the explanation; a working link is insufficient evidence. Distinguish original documentation, original research, taxonomy descriptions and community interpretation.

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for the record format. Graph reviews now include `reviewerType` and an exact `reviewedContent` snapshot. Glossary records preserve the exact definition, aliases and citations. Changes invalidate old comparisons. The software hides completed-claim labels for invalid or stale records and rejects them at build time.

Human review should also assess whether wording is understandable to a beginner and whether the visible connections communicate their intended educational relationship clearly. This handoff does not supply operational testing procedures.

## Interaction review

The [overlay review](OVERLAY_REVIEW.md) corrects focused-card obstruction by the topic list and transient Help/Settings panels. The 42-state comparison and two actual-app states passed. Resizing preserves the focused choice and its visibility. The paired expansion measurement records a 1–6 ms setup cost in its groups; physical-device motion still needs assessment. This software change leaves every content-review record unchanged.

Use the local site at a comfortable reading scale, with keyboard navigation and a narrow viewport. Check expansion continuity, search, definition popovers, source links and focus return. On a physical device and with a screen reader, check the same reading tasks and record device/browser/assistive-technology versions alongside observations.

The automated evidence is in [VERIFICATION.md](VERIFICATION.md). The [layout comparison](LAYOUT_DECISION.md) now includes connector crossings and a second ELK configuration: the revised solver preserves existing positions in the fixed fixtures and greatly reduces movement across sequential expansions; ordered ELK still has fewer dense crossings. The broader corpus records taller expansion layouts, slightly more crossings, and greater collapse movement. Caption overlap is measured separately in [caption-layout.json](caption-layout.json). Treat perceived continuity, clarity, and visual density as human judgment alongside those measurements. A [desktop motion capture](visuals/expansion-motion.webm) and [browser position measurements](stability-browser.json) support that inspection. No push or deployment has been performed.

The [expansion rendering review](EXPANSION_RENDERING_REVIEW.md) documents lower setup cost and immediate cancellation of entrances that have not appeared. Its callback measurements cover 25, 100, and 250 children in Chromium and Firefox; they do not replace physical-device or human motion review.

The [artifact-verification pass](ARTIFACT_VERIFICATION.md) adds a repeatable build-consistency command and CI gate. It leaves the content-review coverage above unchanged.
