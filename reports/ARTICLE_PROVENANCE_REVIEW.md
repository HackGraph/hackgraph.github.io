# Article and database provenance — 7 September 2026 UTC

This pass classifies **233 additional reference occurrences across 187 exact URLs**, leaving **one unclassified occurrence**. The full publication registry now covers **736 occurrences across 487 URLs in 228 groups**. Including the 181 previously explicit source labels, **917 of 918 graph references have a recorded source type**. Publication classification remains separate from claim-level review.

The pass also corrects one Microsoft citation that opened an unrelated Excel discussion and adds visible notices for four citation-destination problems affecting seven graph entries. The notices appear in both graph panels and reading pages, and have their own field in the editorial inventory and CSV.

| Additional source type | Distinct URLs | Reference occurrences |
| --- | ---: | ---: |
| Primary documentation or project material | 5 | 5 |
| Research and analysis | 125 | 169 |
| Community guidance and collections | 30 | 32 |
| Database records | 27 | 27 |
| Total | 187 | 233 |

## Publication evidence

[article-provenance-capture.json](article-provenance-capture.json) records GET requests for 188 citation URLs and three supporting publisher pages. Of those 191 requests, 186 returned HTTP 200, four were blocked, and one failed TLS validation. Eight PDF title pages were extracted for publication and author identity. Article headings, publication names, bylines, introductory metadata and publisher descriptions informed the classifications; procedures and technical claim support were not compared.

The research label covers attributed security research and analysis, including follow-up analysis and archived publications. It does not assert first discovery, peer review or technical correctness. Community labels describe walkthroughs, teaching notes, contributed snippets, collected references and guidance. These labels describe publication form and provenance rather than a quality ranking.

[article-provenance-reader.json](article-provenance-reader.json) records five supplementary identity observations from the web reader. These may use indexed content and do not override the direct HTTP results. Three IFCR publications and one Akamai publication have identifiable publication metadata despite blocked direct requests. The exact Certipy 2.0 article could not be retrieved by the reader; its title, author and date are identified in the publisher's related-publication listing. The indexed CyberArk article supplies the original publication identity while its live citation redirects elsewhere.

[source-provenance.json](source-provenance.json) retains the explicit URL lists, AI reviewer, observation date, classification rationale and evidence hashes. New URLs still require an explicit record; classification is not inferred from their hostname.

## Database label

The new `database` type distinguishes curated records from the database operator's own documentation. NIST describes NVD as a repository that incorporates information from several contributors. The NIST methodology article already cited elsewhere retains its primary-documentation label. The NVD records, CERT vulnerability-note records and Exploit Database catalogue entries receive database labels. These decisions describe the cited publication surface and do not assign authorship of every underlying field to the database operator.

[article-provenance-nvd-rendered.json](article-provenance-nvd-rendered.json) records browser-rendered identity headings for all 23 cited NVD URLs. The headings match the requested identifiers; two URLs use different capitalization for the same identifier. This check does not compare descriptions, severity scores, affected versions or graph claims. The initial GET responses were application shells, so their HTTP success alone was insufficient for record identity.

The source type is supported consistently by graph, glossary and shared-definition review validators. The browser reading-list regression now covers primary, research, community, taxonomy, database and unclassified labels. The additional unit contract verifies that a database source cannot create a review and that changing source metadata invalidates an existing definition comparison.

## Citation corrections and notices

[article-citation-findings.json](article-citation-findings.json) records the exact URLs and affected entry pointers:

- The Microsoft citation used article identifier `4090550`, which opens an Excel discussion. The intended publication title was identified under `3831704`; only that citation URL was corrected. [article-provenance-supplement.json](article-provenance-supplement.json) captures the intended publication and a supporting Microsoft publication. No SMB-default or graph-applicability claim was reassessed.
- The cited CyberArk research article redirects to a product landing page. Indexed publisher content identifies the original article, but live article access remains unresolved.
- The n00py citation still fails TLS validation with an expired certificate. A publication search found no match, and the Wayback availability response contained no snapshot. Its source type remains unclassified; no TLS bypass or speculative replacement was used.
- One citation names a research blog index without identifying a specific article.
- One publication's title and machine-readable author metadata name different people. Its publication type is recorded without selecting an individual-author attribution.

The public `SOURCE_DESTINATIONS` projection retains the CyberArk observation and the three earlier repository findings: one chapter URL opens the wiki Home page and two cited files contain relocation notices. Destination records require a supported status, exact URL, date, reviewer, observed title, final URL, supporting observation and capture hash. They are validated before staging. Their notices cannot create a claim review or change an HTTP result.

The editorial inventory now exposes `destinationObservation` for each affected source, `citationDestinationIssues` for each affected item, and a separate `citation_destination_issues` CSV column. Seven entries have destination notices. The prior source-access and publication-location fields retain their separate meanings.

## Access refresh and verification

The combined HTTP inventory now includes the 188 currently cited URLs checked in this pass, including the corrected Microsoft URL. Other URLs retain their previous observation dates. Across the 853 current URLs, **847 responded, four were blocked and two were unreachable**. Three IFCR responses changed from earlier success observations to blocked requests. The public access snapshot is regenerated from this combined report. This is a targeted refresh, not a new complete URL sweep.

[article-provenance-verification.json](article-provenance-verification.json) records the final assembled suite, public artifact, generated-page parity and captured-evidence checks. The new source-key regression exposed an inherited-property lookup in access notices; the lookup now requires an explicitly recorded key. The initial failing log is retained separately from the final verification log.

[article-provenance-visual-check.json](article-provenance-visual-check.json) records the additional panel, reading-page and guide checks. The full reading-page regression also compares every notice, source label, URL and selected claim against the shared presentation data.

Only one authored graph field changed: the Microsoft citation URL. All node IDs, connections, commands, applicability values and existing claim-review records are unchanged. The baseline parity report now records 101 changed nodes across the complete project work, plus the earlier neutral connection caption; it verifies every field outside the documented changes.

The broader content audit remains incomplete: 98 entries have 209 selected conceptual comparisons, while 292 technique nodes and all 765 connections lack claim-level review. Nine technique nodes still lack dedicated references. Source classifications and destination notices do not resolve those gaps or establish operational route viability. Human review, physical-device testing and hosted deployment remain pending.
