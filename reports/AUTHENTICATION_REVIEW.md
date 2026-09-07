# Account and authentication review — 7 September 2026 UTC

Six explanations now distinguish account scope, authentication material, and authorization. Codex (AI) compared **15 selected conceptual claims** against **eight primary publications**. These records cover the revised explanations; they do not establish that the associated commands or graph routes are correct.

## Findings and corrections

| Entry | Correction |
| --- | --- |
| Valid Domain Credentials | Explain the directory account and SID separately from the permissions granted to that identity |
| Valid Local Credentials | Explain local SAM account management and resource access checks; remove assumed outcomes based only on account scope |
| Password / Key Logon | Distinguish a password from an SSH private-key signature and separate authentication from authorization |
| Kerberos Logon | Distinguish TGTs, application service tickets, and the FILE credential-cache container |
| Recovered Credentials | Distinguish password/hash data from the access token describing a process or thread |
| SSH Keys & Trust | Explain key signatures and the different identity roles of user and host certificates |

Microsoft's [security-principal documentation](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals) supports the account-storage and access-control distinctions. Its [authentication overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts) explains why authentication and authorization are separate, and its [access-token definition](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens) identifies the process/thread security context.

The password comparisons use [NIST SP 800-63B-4 sections 3.1.1 and 3.1.1.2](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/). The hashing explanation describes NIST's storage model; it makes no claim that every Windows credential store implements that model. [RFC 4252 section 7](https://www.rfc-editor.org/rfc/rfc4252.html) supplies the SSH signature distinction. The [OpenBSD certificate documentation](https://man.openbsd.org/ssh-keygen#CERTIFICATES) separately defines user and host certificate roles.

[RFC 4120 sections 1.1 and 1.4](https://www.rfc-editor.org/rfc/rfc4120.html) support the Kerberos ticket and authorization distinctions. [MIT's FILE cache documentation](https://web.mit.edu/kerberos/krb5-latest/doc/formats/ccache_file_format.html) describes the credential container. That format comparison is scoped to MIT's FILE cache; it does not treat every cache implementation as a disk file or equate a cache with a single TGT.

## Evidence and scope

[authentication-source-capture.json](authentication-source-capture.json) records the eight publisher responses, source sections, retrieval times, final URLs, titles and hashes. The named sections were read and compared before the entry records were created. Raw responses and extracted text are retained in `.cache/authentication-review/sources/`. The records include the actual date, AI reviewer identity, precise claims, citations and exact authored snapshots.

Changes are limited to six summaries, descriptions, references and scoped comparison records in `initial-access.js`, `win-foothold.js`, `pe-techniques.js`, and `linux-privesc.js`. Original reading references are retained. All node IDs, classifications, commands, tools, prerequisites, applicability, ATT&CK fields and connections are unchanged. [data-parity.json](data-parity.json) accounts for the complete difference from baseline `4e4901f`: 94 changed nodes and one previously corrected neutral connection caption.

Selected comparisons now cover **195 claims across 92 graph entries**: 79 category/start/goal overviews and 13 technique-classified entries. Another **1,063 entries** have no claim-level comparison: **298 technique nodes and 765 connections**. Dedicated references exist for 296 of 311 technique entries; 15 techniques and all 765 connections lack them. Selected claims do not establish complete entry or map review.

The combined HTTP inventory contains **851 URLs: 848 responded, one blocked, two unreachable**. [reference-authentication-refresh.json](reference-authentication-refresh.json) records this pass's eight targeted GET observations. Other URLs, including the three access exceptions, retain their earlier observations and timestamps. This was not a new complete network sweep.

## Verification

The full local suite passed **131 unit tests and 117 browser checks**. Content validation and staging passed. [authentication-verification.json](authentication-verification.json) records the exact artifact, eight source response hashes, unchanged fields and connections, and repeatable generation of all seven reading/sitemap outputs. The existing reading-page regression checks the text, source section, citation order, labels and destinations for all 195 selected claims.

[authentication-panel-check.json](authentication-panel-check.json) records the descriptions and selected claims in all six revised panels at 1440 px and 390 px. All twelve states had no reported WCAG-tagged axe violations, horizontal panel overflow or runtime errors. Six desktop/mobile screenshots were visually inspected. The broader content backlog, human readability and motion assessment, physical-device testing, Safari, and assistive-technology review remain open. No operational procedure validation or deployment is part of this pass.
