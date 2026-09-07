# Defensive knowledge-model review — 7 September 2026 UTC

Reviewed by Codex (AI). This pass examines publication provenance, publisher-declared taxonomy changes, and the graph's modeling conventions. It does not treat HTTP responses, valid identifiers, or connected endpoints as proof of the claims associated with them.

**Follow-up implemented:** [RELATIONSHIP_REVIEW.md](RELATIONSHIP_REVIEW.md) records the corrected shared vocabulary, independent definition evidence in the graph panels, and validation gates. The table and source sweep below describe this initial review; current build/audit counts are in [VERIFICATION.md](VERIFICATION.md).

## Findings and changes

| Finding | Evidence | Disposition |
| --- | --- | --- |
| Two entries use a revoked ATT&CK identifier | Enterprise ATT&CK 19.2 explicitly declares T1562.001 revoked by T1685 | Corrected both identifier references and the duplicated taxonomy citation; all 105 currently used IDs are active |
| A Secureworks citation has moved | Opening the original URL in the web reader redirects to the Sophos publication with the same title, CTU attribution, and 12 January 2015 publication date | Updated the citation to the publisher's current location; retained the earlier URL in the provenance record |
| Five earlier access exceptions were too poorly explained | Separate HEAD/GET diagnostics and inspection through the web reader | Located four publications; identified an expired certificate for the fifth; retained the distinct live request results |
| The schema calls the graph a DAG | The AD graph contains a strongly connected component of 218 nodes | Corrected the contract to allow cycles and convergence, consistent with the existing renderer |
| The schema describes every edge as a step and calls the relationship vocabulary domain independent | Endpoint-kind census and inspection of `relationships.js`, `engineAdapter.js`, and both model contracts | Corrected the contracts; documented the distinction between organization and substantive relationship claims |
| Review handoff does not distinguish connection metadata | 651 connections omit `rel`; some have individual captions, descriptions, or conditions | Added endpoint kinds, declared relationships, and authored-explanation indicators to the complete inventory without inferring their meaning |

## Taxonomy resolution

The source is [MITRE's Enterprise STIX bundle](https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json), collection version **19.2**, modified 5 August 2026. Its retrieved SHA-256 is `dc1639caa5501d720e280cf1cbd8fbe009884a0c9b3e6e9ed9d0c25166c3d8f4`.

The source object `attack-pattern--ac08589e-ee59-4935-8667-d845e38fe579` identifies T1562.001. Relationship `relationship--30d508e7-2562-40aa-8ca2-9534dc411e22` explicitly replaces it with `attack-pattern--bbde9781-60aa-4b8a-a911-895b0c1b3872`, T1685. MITRE defines `revoked-by` as publisher replacement in its [relationship specification](https://mitre-attack.github.io/attack-data-model/schemas/relationship-types/#revoked-by). The current publication is [T1685, Disable or Modify Tools](https://attack.mitre.org/techniques/T1685/).

The changes affect `win-cat-evasion` and `win-evade-amsi-av`. This is an identifier migration based on explicit publisher evidence. It does not establish that one technique identifier exhaustively describes the broader category, or that the entry's other assertions are supported. The exact decision, source objects, and relationship metadata are preserved in [taxonomy-migration.json](taxonomy-migration.json).

The checker now retains technique names, canonical URLs, STIX IDs, and explicit replacement evidence. It selects the newest relationship version before inspecting it, so an older relationship cannot override a later revocation. It continues to report missing, deprecated, and revoked IDs without automatically changing content.

## Source access and publication identity

The initial direct diagnostics are retained in [source-access-diagnostics.json](source-access-diagnostics.json). The later full audit is [reference-availability.json](reference-availability.json). Observations differ by request time and access method; they are not interchangeable.

| Original citation | Publication inspection | Live request finding and decision |
| --- | --- | --- |
| [IFCR, Certipy 2.0 article](https://research.ifcr.dk/certipy-2-0-bloodhound-new-escalations-shadow-credentials-golden-certificates-and-more-34d1c26f0dc6) | Web reader exposes the article header, Oliver Lyak's attribution, and 19 February 2022 date | Initial HEAD and GET returned 403 challenge pages. The later full audit received a 200 HEAD response. Original citation retained |
| [IFCR, Certipy 4.0 article](https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7) | Web reader exposes the article header, Oliver Lyak's attribution, and 4 August 2022 date | Initial HEAD and GET returned 403 challenge pages. The later full audit received a 200 HEAD response. Original citation retained |
| [Akamai research article](https://www.akamai.com/blog/security-research/abusing-dmsa-for-privilege-escalation-in-active-directory) | Article and title are available through the web reader | Direct HEAD/GET return 403. Citation retained; public notice distinguishes a located publication from blocked automation |
| [n00py citation](https://www.n00py.io/2021/09/resetting-expired-passwords-remotely/) | Article content could not be retrieved through the checked methods | TLS validation returns `CERT_HAS_EXPIRED`, including on the non-www hostname. No TLS bypass or speculative replacement. Citation retained with the precise access problem |
| [Original Secureworks citation](https://www.secureworks.com/research/skeleton-key-malware-analysis) | Web reader redirects to [the Sophos publication](https://www.sophos.com/en-us/research/skeleton-key-malware-analysis); its title, CTU author, and 12 January 2015 date identify the cited research | Original and destination requests time out locally. Updated the citation's location while preserving the timeout observation |

These are AI inspections of publication identity and location. A web reader may return indexed content; it is not evidence of successful live retrieval from this machine. Article age is part of provenance and does not, by itself, establish current applicability. No operational instructions in these articles were validated by locating them.

The final full audit covers **777 URLs: 774 responded, one blocked, two unreachable**. It correctly exits nonzero. Three inventory items have current access exceptions; two of those publications were located through the web reader. Only the n00py publication remains unlocated by the methods used here.

The checker now records both request attempts and preserves TLS/timeout error information. Public notices explain located publications and specific access failures. They do not convert a publication-location observation into a completed claim review.

## Graph-model audit

This census examines every authored node and edge. It counts data fields and endpoint kinds; it does not infer a behavioral relationship from their presence.

| Map | Nodes | Edges | Edges touching a category | No canonical relationship | Of those, with an authored description | No relationship, caption, or description |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Active Directory | 250 | 530 | 216 | 506 | 12 | 264 |
| Windows | 93 | 154 | 82 | 98 | 0 | 84 |
| Linux | 47 | 81 | 41 | 47 | 0 | 44 |
| **Total** | **390** | **765** | **339** | **651** | **12** | **392** |

The final column does not count `requires` or other detail fields. An untyped connection can still have explanatory material. A connection touching a category can carry a substantive claim. Neither count proves an error, and neither permits blanket classification as harmless organization.

Only four of the twelve canonical relationship definitions are used: `host-exec` (44 edges), `cred-reuse` (13), `enables` (23), and `to-root` (34). Canonical wording is a reusable authored description; it supplies no independent evidence for an individual connection.

The AD map has one nontrivial strongly connected component containing 218 nodes; the Windows and Linux maps have none. This was calculated from authored endpoints using strongly connected components, without changing any routes. Cycles are compatible with a browsable knowledge graph. They contradict the old DAG description, and make an assumption of universal sequential progression especially misleading.

MITRE's [relationship model](https://mitre-attack.github.io/attack-data-model/schemas/relationship-types/) distinguishes observed use, hierarchy, mitigation, detection, and other associations. HackGraph uses its own vocabulary and authored links. These connections have not been imported from ATT&CK. The reading guide now states that distinction. Reaching one topic from another does not inherit the evidence attached to either endpoint.

## What remains a substantive editorial gap

The existing evidence supports neither a blanket “incorrect” verdict nor a blanket “verified” verdict for the graph. At this initial review, all 1,155 node/connection entries lacked recorded claim-level comparisons. The subsequent [category review](CATEGORY_REVIEW.md) records 16 selected conceptual claims in six nodes; 1,149 entries still have no comparison. Seventeen of 311 technique entries and all 765 connections lack dedicated references. Some organizational connections may be explainable by the project's own conventions; substantive assertions need evidence for the specific assertion.

The reusable wording finding has now been addressed: the four used definitions were rewritten and reviewed at the vocabulary level, while eight unused definitions were removed. The [ATT&CK Execution definition](https://attack.mitre.org/tactics/TA0002/) describes execution at a general level; the Linux [credentials manual](https://man7.org/linux/man-pages/man7/credentials.7.html) separates process credential properties. These sources do not certify particular connection outcomes. The implementation presents the shared definitions and their sources separately from each connection's evidence; see [RELATIONSHIP_REVIEW.md](RELATIONSHIP_REVIEW.md).

The graph therefore remains a study notebook with documented evidence gaps. This pass resolves the taxonomy succession question and makes source and modeling findings concrete; it does not constitute a completed content audit of the entire project. The earlier handoff's “preparation complete” wording should not be read as that claim.

## Change boundary and validation

This initial pass changed citation/taxonomy metadata in three nodes. [data-parity.json](data-parity.json) now additionally accounts for the later six category corrections, totaling eight changed nodes, plus a neutral caption correction on one connection. Fields outside the documented citation, taxonomy, category prose and review changes match baseline `4e4901f`.

Validation results and artifact details are in [VERIFICATION.md](VERIFICATION.md). No commit, push, or deployment was performed.
