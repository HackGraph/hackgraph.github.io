# Windows privilege definitions — 7 September 2026 UTC

Nine privilege overviews now distinguish the documented Windows security concepts from the operational procedures elsewhere in their entries. The revised explanations cover backup and restoration, debugging, ownership, driver loading, volume maintenance, Credential Manager, token creation, trusted authentication services and integrity labels. They no longer present an asserted exploitation result as the definition of a privilege.

The pass records eighteen selected conceptual comparisons against fifteen Microsoft publications. Ten are explicitly labeled archived security-policy references; five are API or driver documentation. The archived material is used for named concepts and a clearly attributed recommendation, not to establish current default account assignments or version-specific exploit behavior.

| Entries | Compared concepts |
| --- | --- |
| `pe-sebackup-restore` | Separate administrative purposes of the backup and restore rights |
| `pe-sedebug-lsass` | Debug programs user right; distinct identity, group and privilege information in tokens |
| `pe-setakeownership` | Ownership user right; owner fields and ACLs in security descriptors |
| `pe-seloaddriver` | Driver-loading permission; separately documented kernel-driver signing requirements |
| `pe-semanagevolume` | Volume maintenance purpose; local scope of privilege assignments |
| `pe-setrustedcredman` | Credential Manager backup/restoration purpose; archived recommendation to leave the policy at its default |
| `pe-secreatetoken` | Token-creation user right; access tokens as security-context objects |
| `pe-setcb` | Archived description of use by low-level authentication services; distinct token identity and privilege fields |
| `pe-serelabel` | Integrity-label modification; mandatory integrity controls in addition to discretionary ACLs |

[windows-privilege-review.json](windows-privilege-review.json) records the exact changes, selected claims, source sections and exclusions. [windows-privilege-source-capture.json](windows-privilege-source-capture.json) records fifteen successful retrievals with response and extracted-text hashes. Earlier source links remain as additional reading. Existing commands, prerequisites, tools, applicability, entry IDs and kinds, taxonomy mappings and graph connections are unchanged. Their operational correctness has not been assessed.

The 99 earlier graph comparison records are unchanged. The graph now has 231 selected conceptual claims across 108 entries: 79 category/start/goal overviews and 29 technique-classified entries. Another 282 techniques and all 765 connections have no claim comparison. Reference coverage stays at 303/311 techniques and 0/765 connections. No human reviews are recorded.

Seventeen inline primary references were added across the nine entries. The publication registry remains unchanged at 736 occurrences across 486 URLs in 228 groups. Together with 201 inline labels, 937 of 938 graph reference occurrences have a recorded source type. The inaccessible n00py citation remains unclassified.

The combined HTTP inventory contains 866 URLs: 860 responded, four were blocked and two were unreachable. This pass refreshes fifteen current sources; all other observations keep their dates. The unresolved CyberArk destination affects three entries. These publication and access counts remain separate from claim-review coverage.

[windows-privilege-visual-check.json](windows-privilege-visual-check.json) covers all nine actual panels at desktop/dark and mobile/light sizes and two JavaScript-disabled reading states. [windows-privilege-verification.json](windows-privilege-verification.json) records the assembled regression suite, generated-page repeatability, exact data comparison and staged artifact. The initial `npm test` run received SIGTERM (exit 143) after 144 unit passes and 122 reported browser passes; its interruption cause was not established. Chromium and Firefox had completed. The full 43-test WebKit project subsequently passed separately (exit 0), completing all 129 distinct browser checks against the unchanged public artifact. Read-only build verification also passed. The broader review remains incomplete; this pass does not establish operational attack-chain viability or publication readiness.
