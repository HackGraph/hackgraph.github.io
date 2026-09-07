# CVE identifier audit — 7 September 2026 UTC

All **68 explicit CVE identifiers** found in the scanned graph fields have matching **PUBLISHED** records in the official CVE List. None of the retrieved records is rejected, and no identifier mismatch or retrieval failure occurred. This completes the publication-status check for that inventory, not a review of the claims that cite those identifiers.

## Evidence and coverage

The source is the [CVE Program's official CVE List](https://github.com/CVEProject/cvelistV5), pinned to [revision `7b08cd1ae2344dabcda21718ea7b6dd500780451`](https://github.com/CVEProject/cvelistV5/tree/7b08cd1ae2344dabcda21718ea7b6dd500780451). The publisher revision is dated 7 September 2026 at 07:31:46 UTC. The audit retrieved each record from that revision, rather than mixing records from a changing branch.

[cve-identifiers.json](cve-identifiers.json) records the revision lookup, retrieval timestamps, immutable source URLs, per-record SHA-256 hashes, exact CVE IDs, publication state, assigning organization, provider, and available publisher titles. Every inventoried use has a map, node or connection key, and field. Raw captures remain in the ignored `.cache/cve-review/records/` directory; the pinned source URLs permit independent retrieval.

| Check | Result |
| --- | ---: |
| Unique explicit identifiers | 68 |
| Distinct identifier/entry/field locations | 148 |
| Graph entries containing those mentions | 51 |
| Records retrieved | 68 |
| Exact record-ID matches | 68 |
| Records with PUBLISHED state | 68 |
| Records supplying a CNA title | 38 |
| Records without a CNA title | 30 |
| Retrieval errors | 0 |

The inventory scans `label`, `summary`, `description`, `references`, and `mitre` for full identifiers, ignoring letter case. It does not inspect commands, tools, conditions, or operational notes, and does not infer abbreviated identifiers. The saved inventory was compared with a fresh scan of the current imported graph data. All captured record hashes were checked before writing the report.

## Interpretation and remaining work

A published record establishes an identifier's publication status. It does not establish that a graph label, nickname, surrounding explanation, or connected outcome is supported. Publisher titles and attribution are retained as metadata; their relationship to the graph's wording is not marked reviewed. A missing optional title is not a rejected or missing CVE record.

No citation correction was established by this status check. No graph content, command, connection endpoint, review badge, or source-availability observation was changed. The 311 technique nodes and 765 connections still have no recorded claim-level review. Applicability, procedures, and route viability were not assessed.

Only review reports changed in this pass. The read-only `npm run verify:build` check passed for the existing 68-file artifact with source digest `22d83879052e0fd16f0e370b7dfe042dbc2a6a96d2f54fff303c76d455f8f481`. The prior 131 unit and 96 browser results remain the latest full-suite run; they were not rerun for these report changes.
