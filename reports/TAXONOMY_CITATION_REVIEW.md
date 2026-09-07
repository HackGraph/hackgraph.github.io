# Taxonomy citation coverage — 7 September 2026 UTC

The taxonomy checker previously inspected only `mitre.id` mapping fields. It omitted **six technique identifiers and six tactic identifiers** that appear only in citations. The checker now includes canonical technique/tactic references in nodes, connections, glossary entries and shared definitions, and records where each identifier occurs.

## Publisher comparison

| Coverage | Unique identifiers |
| --- | ---: |
| Structured mapping fields | 105 |
| Citations, including overlap with mapping fields | 61 |
| Citation-only identifiers added to the audit | 12 |
| Combined audit | 117 |

The combined set contains **111 techniques and six tactics; all 117 are active** in the captured Enterprise ATT&CK 19.2 dataset. The twelve additions were already present in the project's references. This work adds them to the checker without adding or changing a graph mapping.

[taxonomy-status.json](taxonomy-status.json) retains the complete identifier results and occurrence locations. The input is the previously captured [official MITRE STIX bundle](https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json), whose SHA-256 remains `dc1639caa5501d720e280cf1cbd8fbe009884a0c9b3e6e9ed9d0c25166c3d8f4`. MITRE documents the release collections in its [publisher repository](https://github.com/mitre-attack/attack-stix-data). This pass compares the captured 19.2 records; it is not a new publisher download or network sweep.

The collector accepts canonical HTTPS technique and tactic URLs, including normal trailing slashes, query strings and fragments. Lookalike hosts, credentials in URLs, alternate ports and malformed paths cannot become identifier evidence. Free-text mentions and other URL families remain outside this audit's stated scope. The inspector uses the latest publisher object version for techniques and tactics; replacement suggestions still require an explicit current publisher `revoked-by` relationship.

The generated public status snapshot includes the checked scope and coverage counts. Detailed graph-field locations remain in the development report. Identifier status is separate from whether the publisher supports an entry's claim or whether a mapping is suitable.

## Reading-guide correction

The guide now states that mapped IDs and technique/tactic citations are included. It also corrects the explanation of dedicated-reference counts: the counter includes explicitly listed reading sources, including taxonomy citations in that list. Automatically displayed mapping links and tool homepages are excluded. The earlier wording incorrectly implied that all taxonomy citations were excluded. The counter and authored data are unchanged.

The narrow reading-guide check then exposed an accessibility defect: the horizontally scrolling coverage table could not receive keyboard focus. Its container now has a descriptive region name, a tab stop and a visible focus outline. Keyboard users can scroll the table with an arrow key and tab away, including with JavaScript disabled. The shared focus style is regenerated into all six reading pages. A new browser regression exercises this behavior in Chromium, Firefox and WebKit.

## Verification and remaining work

New regression fixtures cover citation-only IDs in every source container, URL-origin/path restrictions, tactic status, latest-version selection and retained diagnostics. The CLI regression also verifies that missing citation-only technique and shared-definition tactic IDs appear in a failing report.

The assembled build passed **134 unit tests and 120 browser tests** across Chromium, Firefox and WebKit, followed by read-only verification of all 68 staged files. Repeated generation of all seven reference outputs is byte-identical. An independent comparison of the existing URL inventory and structured mapping IDs matches the expanded 117-ID audit.

Four additional Chromium reading-guide states cover desktop/mobile widths with JavaScript enabled and disabled. All passed keyboard-focus and horizontal-overflow checks; both narrow states support keyboard table scrolling. The two JavaScript-enabled states passed axe, and no runtime errors were recorded. Three screenshots were visually inspected. [taxonomy-reading-check.json](taxonomy-reading-check.json) records the observations; [taxonomy-citation-verification.json](taxonomy-citation-verification.json) records the artifact, checks and evidence hashes.

Graph content, commands, references, source-kind classifications, review records and routing are unchanged. The project still has 209 selected conceptual claim comparisons across 98 entries; 292 technique nodes and all 765 connections lack claim-level review. This does not complete the broader content audit, human review or publication readiness.
