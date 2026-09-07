# Identity and permissions review — 7 September 2026 UTC

Seven Windows/Linux entries now explain account identity, process permissions, and audit policy more precisely. Codex (AI) compared **17 selected conceptual claims** against **12 primary publications**. This is a source comparison of the explanations, not validation of the operational material associated with these entries.

## Findings and corrections

| Entry | Problem with the earlier explanation | Revised teaching point |
| --- | --- | --- |
| Privileged Users | Collapsed group membership and token privileges into an assumed outcome | Tokens carry identity, groups and privileges; system privileges and resource access rights have distinct meanings, and a held privilege may be disabled |
| Admin Users | Treated administrator membership as a universal description of application authority | UAC Admin Approval Mode distinguishes standard and administrative tokens; elevation prompts depend on policy |
| Unprivileged Users | Described a standard account as having no useful permissions | Resource permissions can be assigned to users or groups; a standard-user token still has a security context |
| Service Account | Treated several service identities as a uniform permission set and asserted automatic outcomes | LocalService, NetworkService and IIS application-pool identities have different identity and network semantics |
| Administrators (Filtered Token) | Said existing group membership supplied rights despite the filtered token | A deny-only SID participates in deny checks but does not grant its group's allowed access |
| Identity & Entitlements | Assigned blanket permissions from group/account names | Linux file permission checks use filesystem IDs and supplementary groups alongside resource permissions and applicable policy |
| Host Controls & Confinement | Conflated policy enforcement with comprehensive logging | LSM policy and Linux Audit have distinct roles; audit rules and built-in events do not imply that every execution or write is recorded |

Microsoft documents the relevant [access-token contents](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens), [privilege semantics](https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges), [resource access-control entries](https://learn.microsoft.com/en-us/windows/win32/secauthz/dacls-and-aces), [deny-only SID behavior](https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token), and [UAC token model](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works). The UAC explanation is scoped to Admin Approval Mode rather than claiming a single configuration for every Windows installation.

The service identity comparison uses Microsoft's account definitions for [LocalService](https://learn.microsoft.com/en-us/windows/win32/services/localservice-account), [NetworkService](https://learn.microsoft.com/en-us/windows/win32/services/networkservice-account), and [IIS application pools](https://learn.microsoft.com/en-us/iis/manage/configuring-security/application-pool-identities). It records identity distinctions without inferring an escalation procedure from them.

The Linux comparisons use [credentials(7)](https://man7.org/linux/man-pages/man7/credentials.7.html), the kernel's [credential and access-control model](https://www.kernel.org/doc/html/latest/security/credentials.html), its [LSM overview](https://www.kernel.org/doc/html/latest/admin-guide/LSM/index.html), and the Linux Audit project's [audit.rules(7) source](https://raw.githubusercontent.com/linux-audit/audit-userspace/master/docs/audit.rules.7). The audit documentation distinguishes configured rules from built-in events; the revised text avoids implying that no events exist without custom rules or that all events exist merely because auditing is enabled.

## Evidence and scope

[identity-source-capture.json](identity-source-capture.json) records URLs, publication titles, precise sections, GET timestamps, response statuses and response hashes. All twelve were read through the web reader and retrieved successfully for this pass. Raw responses and extracted text are retained in the ignored `.cache/identity-review/sources/` directory. The entry records preserve the exact authored snapshot, selected claims, reviewer identity/type and actual review date. Original reading references are retained alongside the newly compared primary sources.

The revised summaries and descriptions live in [pe-techniques.js](../src/data/chains/pe-techniques.js) and [linux-onramp.js](../src/data/chains/linux-onramp.js). The comparison does **not** cover commands, tools, prerequisites, applicability, connection outcomes, operational route viability or ATT&CK mapping suitability. Those fields, all node IDs, and all connections are unchanged in this pass. The seven entries retain their existing default technique classification; no reclassification was used to reduce the outstanding count. [data-parity.json](data-parity.json) accounts for all changes from the original baseline.

The project now has selected comparisons in **86 graph entries, covering 180 claims**: the earlier 79 category/start/goal overviews plus these seven technique-classified entries. Another **1,069 entries** have no claim-level comparison: 304 technique nodes and 765 connections. Having selected comparisons does not establish that every claim in an entry or map has been reviewed. Dedicated references now exist for 295 of 311 techniques; 16 techniques and all 765 connections still lack them.

The combined HTTP inventory now covers **847 URLs: 844 responded, one blocked, two unreachable**. [reference-identity-refresh.json](reference-identity-refresh.json) records twelve targeted retrievals and the superseded observations. Other URLs, including the three access exceptions, retain their earlier timestamps. This was not a new full network sweep.

## Software verification

The full local suite passed **131 unit tests and 117 browser checks**. [identity-verification.json](identity-verification.json) records the current artifact, unchanged engine/connection data, exact source hashes, and repeatable generated pages; [VERIFICATION.md](VERIFICATION.md) is the current handoff. [identity-panel-check.json](identity-panel-check.json) records selected-claim visibility, horizontal overflow and WCAG-tagged axe checks for all seven revised panels at desktop and phone widths. This rendering check does not inspect operational behavior. Human readability, motion, real-device and assistive-technology review remain open, alongside the substantive content backlog above.
