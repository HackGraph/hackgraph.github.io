# Citation corrections and retirement — 7 September 2026 UTC

Five reference occurrences were removed from five entries because they did not provide the publication identified by their labels. One explicitly labeled MITRE taxonomy reference was added. The original observations and citation identities remain in the historical reports; this pass does not claim that the unavailable articles were recovered.

| Entry | Correction | Evidence and limit |
| --- | --- | --- |
| `adfs-golden-saml` | Replace the CyberArk link with MITRE ATT&CK T1606.002, labeled as a taxonomy overview | The old URL opens an unrelated product page. The [MITRE page](https://attack.mitre.org/techniques/T1606/002/) identifies the SAML Tokens taxonomy entry and cites the original CyberArk article. This is a replacement reading reference, not a recovered original publication or a procedure review. |
| `persist-fed` | Remove the same CyberArk supplemental reference | None of the category's three selected claims cites it. The Microsoft sources and all comparison details remain unchanged. |
| `trust-modification` | Remove the same CyberArk reference | The existing taxonomy and community references remain. Their claims have not been compared in this pass. |
| `expired-password-reset` | Remove the unlocated n00py reference | Earlier publication searches and an archive lookup did not locate the article, and direct access failed TLS validation. The remaining community reference is retained without a new claim comparison. |
| `lin-kernel-recent` | Remove the Exodus blog index mislabeled as a specific article | The publisher index did not identify the claimed article, and the targeted title/identifier search returned no match. Existing CVE, CERT/CC and other publication references remain; no vulnerability applicability or procedure was assessed. |

[citation-retirement-review.json](citation-retirement-review.json) records the exact previous and replacement references. [article-citation-findings.json](article-citation-findings.json), [citation-archive-attempt.json](citation-archive-attempt.json) and [retired-source-provenance.json](retired-source-provenance.json) preserve the earlier identity, access, destination and provenance observations. Retirement resolves misleading active citations; it does not prove that a historical publication never existed.

The Vectra citation already names the publisher and makes no individual-author attribution. Its publisher metadata still conflicts, as documented in [KERBEROS_ACCOUNT_REVIEW.md](KERBEROS_ACCOUNT_REVIEW.md). That observation is preserved. No individual author was added or inferred, and no article claims were reviewed.

The single reviewed category's exact-content snapshot was updated only to remove the unused supplemental reference. Its three selected claims, supporting URLs, reviewer identity, scope and comparison date are unchanged. All other review records are identical. No node labels, summaries, descriptions, commands, prerequisites, applicability fields, mappings, IDs or connections changed.

## Current inventory

- 961 graph reference occurrences: 229 explicit source-type labels and 732 classifications through the current provenance registry. No active graph reference has an unclassified type. The registry now has 226 groups and 484 exact URLs; the two retired groups are preserved separately.
- All 311 technique entries still have dedicated references for at least part of their content. Reference coverage does not establish full claim support.
- Zero inventory items retain recorded wrong-destination or unlocated-source issues. Six items cite five URLs with existing access exceptions: four blocked requests and one unreachable URL. Those five publications have separate location evidence.
- The HTTP inventory now has 874 URLs: 869 responded, four were blocked and one was unreachable. One MITRE URL was retrieved in this pass; three URLs were retired. Other observation values and dates are unchanged. [reference-citation-retirement-refresh.json](reference-citation-retirement-refresh.json) retains superseded and retired HTTP observations.
- The ATT&CK inventory still contains the same 117 identifiers and the same publisher-status records. Its coverage count now records 62 cited IDs instead of 61 because the replacement reference cites an ID that was already mapped. The original Enterprise ATT&CK 19.2 bundle hash is unchanged; no fresh publisher dataset was downloaded.
- Review coverage remains 264 selected conceptual claims across 124 entries, with zero human reviews. Another 266 technique entries and all 765 connections have no claim comparison. No review status was upgraded by these citation corrections.

The first unit run detected the inactive provenance URLs and the outdated taxonomy citation count. The current metadata was regenerated without weakening the tests, and the retired records were preserved. The next run exposed a test that assumed the production dataset must always contain a broken destination. The inventory now accepts an optional destination-observation map, defaulting to the production records, and the test uses an explicit fixture to check both the presence and absence of a destination problem. A private screenshot script also initially expected a claim list on every entry; it now scrolls to references when an entry has no compared claims. These failures are retained and are not represented as successful checks.

## Duplicate mapping links

Screenshot review showed that an explicit MITRE reference repeated the automatically inserted mapping link. The source presentation now uses the declared reference when its exact URL already represents the mapping, preserving its descriptive label. References to different fragments or URLs remain separate. This removes one redundant displayed link in each of 54 graph entries, recorded in [taxonomy-reference-deduplication.json](taxonomy-reference-deduplication.json), without changing their authored data or review records. The new unit regression failed before the correction and passed afterward.

The final [presentation observations](citation-retirement-visual-check.json) cover ten graph-panel states at desktop/dark and mobile/light widths and four JavaScript-disabled reading-page states. Graph source labels, order and keyboard focus are checked against the shared presentation model; the reading states check overflow and any recorded claim text. Axe reports no violations in the ten graph states. Six screenshots were visually inspected. The complete reading-page tests separately check declared citations for all graph entries.

Final verification passed 145 unit tests, 48 checks in each of Chromium, Firefox and WebKit, and read-only build verification. All 144 browser cases match the complete test inventory. Seven generated reading assets repeat exactly, and the same 69-file artifact was used across the final browser runs. [citation-retirement-verification.json](citation-retirement-verification.json) records the source digest, exact changes and log hashes. The graph renderer and styles are unchanged. No hosted workflow, deployment or human review was performed.
