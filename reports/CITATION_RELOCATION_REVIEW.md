# Citation relocation repair — 7 September 2026 UTC

Three graph references now use the replacement publications explicitly linked by their publisher. Two old GitHub files were relocation notices; their declared destinations returned HTTP 200, and the headings and canonical URLs matched the intended publications. The reference labels now identify Internal All The Things.

The Linux notice's visible link text names a different path from its actual hyperlink. The repair follows the publisher's hyperlink, supported by the destination heading and canonical URL. It does not infer a replacement from the visible path text.

The changes affect `lin-start`, `lat-cat-shell`, and `reverse-shell`. Two entries already had selected conceptual comparisons supported by other primary sources. Neither relocated citation supports those recorded claims. Their supplemental-reference snapshots were explicitly updated after this bibliographic check; claim text, claim-source links, source sections, dates, reviewers and comparison scopes are unchanged. This pass adds zero claim comparisons.

[citation-relocation-capture.json](citation-relocation-capture.json) records the four HTTP observations and capture hashes. [citation-relocation-repair.json](citation-relocation-repair.json) preserves the old and new references, the retired classification group, the two resolved destination notices and the exact permitted graph-data change. Historical findings remain available in the earlier reports.

The current classification registry covers 736 graph citation occurrences across 486 exact URLs in 228 groups. One further occurrence remains unclassified. The combined availability inventory contains 852 URLs: 846 responded, four were blocked and two were unreachable. Only the two replacement destinations receive new access observations in this pass; other observations keep their dates.

Two destination problems remain visible across four entries: the Certipy wiki chapter opens its Home page, and the CyberArk article URL redirects to a product page. Removing the two resolved notices does not resolve these separate findings or the remaining access exceptions.

The existing validation covers exact review snapshots, all generated node references and claims, source types, destination notices, keyboard access and narrow-page wrapping. [citation-relocation-verification.json](citation-relocation-verification.json) records the assembled suite and artifact check for this change. No commands, prerequisites, graph connections, applicability, renderer code or styles changed. This is a publication-identity repair, not a comparison of the relocated articles with graph claims.

The first assembled run passed 144 unit tests and 128 browser tests, with one Chromium breadcrumb failure. Its trace records the test checking the mobile disclosure before the responsive class was applied, then measuring six hidden elements with zero dimensions. The test now waits for the expected container layout, explicitly opens the mobile panel and checks visibility before measuring. The wrapping, 24 px target and accessibility assertions are retained. The initial log and trace are preserved in `.cache/citation-relocation-review/`; this correction changes test synchronization only.
