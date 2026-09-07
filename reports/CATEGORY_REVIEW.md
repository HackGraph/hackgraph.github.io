# Category overview corrections — 7 September 2026 UTC

Codex (AI) compared and corrected six category overviews against primary documentation. The graph now records 16 selected conceptual claims with source sections, reviewer attribution, and exact content snapshots. This is an actual wording review; retrieval success is recorded separately.

| Overview | Finding and correction | Primary evidence |
| --- | --- | --- |
| Windows security controls (`win-cat-evasion`) | Removed the false claim that unmanaged hosts have none of the listed protections. Explained built-in antivirus, operating modes, and AMSI's application integration role. | [Microsoft Defender overview and operating modes](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-windows), [AMSI purpose and integrations](https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal) |
| Token privileges (`pe-cat-tokens`) | Replaced a list described only as dangerous with an explanation of security context, assigned privileges, enabled state, and the distinction from object access rights. | [Access token contents](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens), [Privileges](https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges) |
| Group membership (`pe-cat-groups`) | Removed the blanket implication that listed groups convert to SYSTEM or credential theft. Explained group identifiers, DACL evaluation, and token attributes. | [DACL access checks](https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object), [SID attributes](https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token) |
| SUID, SGID and capabilities (`lin-cat-suid`) | Removed unconditional elevated-authority wording. Distinguished effective identities from individual capabilities and acknowledged the documented security restrictions. | [execve(2), DESCRIPTION](https://man7.org/linux/man-pages/man2/execve.2.html), [capabilities(7), DESCRIPTION and File capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html) |
| Scheduled jobs (`lin-cat-jobs`) | Corrected the implication that scheduling means root execution. Distinguished user and system crontabs, timer activation, and service identity. | [Cronie crontab(5)](https://man7.org/linux/man-pages/man5/crontab.5.html), [systemd.timer(5), DESCRIPTION](https://man7.org/linux/man-pages/man5/systemd.timer.5.html), [systemd.exec(5), USER/GROUP IDENTITY](https://man7.org/linux/man-pages/man5/systemd.exec.5.html) |
| Containers (`lin-cat-containers`) | Replaced blanket host-root equivalence with a distinction between daemon administration, rootless operation, and namespace identities. | [Docker group authority](https://docs.docker.com/engine/install/linux-postinstall/), [Rootless Docker](https://docs.docker.com/engine/security/rootless/), [user_namespaces(7), DESCRIPTION](https://man7.org/linux/man-pages/man7/user_namespaces.7.html) |

The conclusion about unmanaged hosts follows from Microsoft's built-in antivirus documentation; management status alone cannot establish the absence of protection. The group-membership conclusion follows from the documented access-check inputs. These are scoped conceptual comparisons, not observations from testing a particular host.

The systemd manuals are upstream project documentation rendered by man7.org. The freedesktop.org reader URLs could not be retrieved, so the comparisons use the accessible manual publications explicitly linked above.

## Recorded evidence

Each of the six nodes contains a literal `review` record with its reviewed claims and exact authored snapshot. The existing validation rejects stale or malformed records. The graph and generated map references display the same selected claims, sources, reviewer, date, and scope. The inventory JSON includes those details, and its CSV includes the review scope and compared-claim count so handoff cannot silently imply a whole-node certification.

[category-source-capture.json](category-source-capture.json) records 14 successful GET retrievals with titles, timestamps, final URLs, and SHA-256 hashes. [reference-category-refresh.json](reference-category-refresh.json) retains superseded availability observations. The combined current URL inventory has 791 entries: 788 responded, one blocked, and two unreachable. Other URLs retain their earlier observation timestamps; this was a targeted refresh, not another complete sweep.

[data-parity.json](data-parity.json) accounts for eight changed nodes relative to baseline: the six corrected categories overlap one earlier taxonomy correction, and two further nodes retain earlier citation/taxonomy changes. The connection from `pe-start` to `win-cat-evasion` also replaces the misleading “managed host?” caption with “security controls.” This is a navigation caption correction, with no connection-outcome review asserted. All node IDs, edge endpoints, commands, applicability values, and fields outside the documented changes match baseline.

## Limits and remaining work

The six records cover the stated conceptual claims in category summaries and descriptions. They do not cover ATT&CK mapping suitability, linked techniques, commands, or connection outcomes. There are now six graph entries with scoped AI claim comparisons and 1,149 without them. No human reviews are recorded. The 91 glossary comparisons and three source-based shared relationship definitions remain separately counted.

The standalone Relationship meanings page was removed, including generation, navigation, sitemap and staging entries. Definition explanations and citations remain available within the graph panels.

See [VERIFICATION.md](VERIFICATION.md) for software checks and [HUMAN_REVIEW.md](HUMAN_REVIEW.md) for the handoff. Physical devices and assistive-technology usability still require direct human review.

The later [access-model review](ACCESS_MODEL_REVIEW.md) adds six category records and twelve selected comparisons. The counts above describe this earlier pass; current cumulative coverage is in [VERIFICATION.md](VERIFICATION.md).
