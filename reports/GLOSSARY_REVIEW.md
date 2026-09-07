# Glossary source comparison — 6 September 2026

The glossary now contains 91 definitions. Codex compared all 91 definitions and their aliases with the cited source sections. There are no recorded human comparisons. This work concerns terminology and foundational explanations only. It does not assess commands, attack procedures, platform applicability or the feasibility of graph connections.

## Concrete corrections

| Problem | Result | Supporting source |
| --- | --- | --- |
| TGS was expanded as a ticket | TGS names the ticket-granting service; TGT has its own definition | [Microsoft KDC documentation](https://learn.microsoft.com/en-us/windows/win32/secauthn/key-distribution-center) |
| AS-REP was an alias of AS-REP roasting | The ordinary protocol response and the attack concept have separate entries | [RFC 4120, section 3.1](https://www.rfc-editor.org/rfc/rfc4120.html#section-3.1) |
| Credential caches were described as Linux files | The definition covers credentials stored as files, in memory, or in other supported cache types | [MIT credential-cache documentation](https://web.mit.edu/kerberos/krb5-latest/doc/basic/ccache_def.html) |
| Keytabs were described only as files | The definition explains the key table and qualifies file storage as usual | [MIT keytab documentation](https://web.mit.edu/kerberos/krb5-latest/doc/basic/keytab_def.html) |
| LDAP and LDAPS shared a definition | Directory access and its TLS-protected transport have separate entries | [RFC 4511](https://www.rfc-editor.org/rfc/rfc4511.html), [Microsoft LDAP over TLS documentation](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-over-ssl-3rd-certification-authority) |
| EPA was equated with channel binding alone | The definition includes channel binding and service binding | [Microsoft EPA documentation](https://learn.microsoft.com/en-us/windows/win32/secauthn/epa-support-in-service) |
| SMB signing promised categorical attack prevention | The definition explains message integrity and tamper detection | [Microsoft SMB signing overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview) |
| SYSTEM was described as an absolute highest authority | The definition explains LocalSystem's extensive local privileges and network identity | [Microsoft LocalSystem documentation](https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account) |
| LAPS was described as storing passwords only in AD | The definition explicitly covers Windows LAPS and its AD or Entra ID backup destinations | [Windows LAPS overview](https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview) |
| WDAC used only its former product name | The definition includes App Control for Business | [Microsoft Windows 11 24H2 documentation](https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-24h2#app-control-for-business) |
| LOLBAS was an alias of a binary | The project has its own definition, separate from LOLBIN | [LOLBAS project introduction](https://lolbas-project.github.io/) |
| BloodHound and tier-0 had narrow or absolute descriptions | Definitions cover identity relationships across AD/Entra and Microsoft's evolution toward a control-plane model | [SpecterOps introduction](https://bloodhound.specterops.io/get-started/introduction), [Microsoft enterprise access model](https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model) |

Other definitions now describe the legitimate purposes of directory services, service accounts, credentials, management protocols and Windows protections. Attack vocabulary is expressed as brief conceptual descriptions; this work adds no executable steps or feasibility claims. Broad promises such as universal or indefinite access were removed.

## Evidence and safeguards

The [generated glossary](../glossary.html) lists each definition, source section, provenance type and comparison status. The [comparison snapshots](../src/data/glossary-reviews.js) preserve the exact reviewed text and citations separately from live definitions. The [source retrieval report](glossary-source-capture.json) records 78 successful HTTP retrievals with URLs, dates and response hashes. These are provenance records; HTTP success does not establish that a source supports a claim.

The displayed “AI source comparison” label identifies the method accurately. MITRE references support limited conceptual definitions only; a classification link is not evidence that any graph procedure works. An edited definition, alias, source URL, section or provenance makes its prior record stale. The content audit reports that condition as an error, and the interface stops presenting the old record as a current comparison. Automated builds never create or renew reviews. Upstream source changes require another editorial comparison; they are not detected by comparing local snapshots.

## Completed follow-up

- **NetNTLM:** the terminology is supported by the format names in [Hashcat's own documentation](https://hashcat.net/wiki/doku.php?id=hashcat), alongside [Microsoft's NTLM description](https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm) for the challenge-response distinction. Only terminology is compared; no tool workflow is assessed.
- **Coercion:** narrowed to this notebook's use of “forced authentication”, supported by the opening conceptual definition in [MITRE T1187](https://attack.mitre.org/techniques/T1187/).
- **Potato:** narrowed to a local naming convention for tools with “Potato” in their names. [MITRE T1134](https://attack.mitre.org/techniques/T1134/) supplies the JuicyPotato and BADPOTATO names; the record makes no family-wide mechanism or applicability claim.
- **Linux foundations:** added UID, GID, EUID, SUID, SGID, sudo, cron, systemd, capabilities, namespace, cgroup, PATH, NFS, SELinux and AppArmor. Source sections come from original manuals and project documentation. These explain legitimate system behavior without adding exploitation instructions.

## Human-review scope

- **Human review:** all 91 recorded comparisons are AI-assisted and may contain mistakes. They should be checked by a knowledgeable editor before being treated as authoritative teaching material.
- **Graph content:** this glossary pass did not review graph entries. The later [category review](CATEGORY_REVIEW.md) records 16 conceptual claims in six nodes, leaving 1,149 graph entries without a claim-level review. Dedicated references remain absent for 17 techniques and all 765 connections. Those gaps are separate from this glossary pass.

The additional Linux terms address vocabulary already present in the Linux notes. This remains a project glossary, not an exhaustive security curriculum. The [human-review handoff](HUMAN_REVIEW.md) covers all 1,246 inventory items.
