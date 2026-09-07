# Execution-context review — 7 September 2026 UTC

Six previously uncited entries now have corrected conceptual explanations and dedicated primary references. Codex (AI) compared **14 selected claims** against **ten primary publications**. The comparisons address identity, processor mode and resource permissions; they do not validate the associated procedures or graph routes.

## Corrections

| Entry | Revised teaching point |
| --- | --- |
| Admin / Root on Host | Separate Windows administrator tokens, LocalSystem identity, and Linux capability/namespace scope |
| Service Account Creds | A service uses an account security context; access to resources is checked separately |
| Kernel-Mode Code Execution | Processor execution mode and Windows account identity are different properties |
| Scheduled Task as SYSTEM | The task's configured security context identifies its account; scheduling alone does not define that identity |
| Scheduled Task Abuse | Permissions on a task and its referenced files belong to separate securable objects |
| Writable Autorun | Distinguish the purpose of logon startup registrations from access control on their registry keys |

The administrative-identity comparison uses Microsoft's [UAC model](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works) and [LocalSystem definition](https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account), plus the Linux manuals for [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html) and [user namespaces](https://man7.org/linux/man-pages/man7/user_namespaces.7.html). The Windows token statement is scoped to Admin Approval Mode. The Linux explanation retains the distinction between identity inside and outside a namespace.

Microsoft's [service-account documentation](https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts) supports the service security-context and resource-check explanations. Its [processor-mode overview](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode) defines user and kernel execution modes. Neither comparison establishes an automatic change of account identity.

The task comparisons use Microsoft's [task security-context documentation](https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks) and [file access-control model](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights). The startup comparison uses its [Run/RunOnce introduction](https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys) and [registry-key security model](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights). These statements describe object identity and access control without asserting that a particular configuration permits abuse.

## Evidence and coverage

[execution-context-source-capture.json](execution-context-source-capture.json) records all ten GET responses, publication titles, precise sections, timestamps and content hashes. The named sections were read and compared before creating the AI review records. Raw publisher responses and extracted text are retained in `.cache/execution-context-review/sources/`. Each changed entry retains its exact authored snapshot, date, reviewer type, selected claims and citations.

Only the summaries, descriptions, references and scoped review records of the six named entries changed. IDs, classifications, commands, tools, prerequisites, applicability, ATT&CK fields and all connections are unchanged. [data-parity.json](data-parity.json) accounts for 100 changed nodes and the single earlier neutral-caption correction relative to baseline `4e4901f`.

The project now records **209 selected conceptual claims across 98 entries**, including all 79 category/start/goal overviews and 19 technique-classified entries. **1,057 graph entries** still have no claim-level comparison: **292 techniques and 765 connections**. Dedicated references now exist for **302 of 311 techniques**; nine techniques and all 765 connections lack them. Selected comparisons do not establish complete entry or map review.

The combined URL inventory contains **853 URLs: 850 responded, one blocked, two unreachable**. [reference-execution-context-refresh.json](reference-execution-context-refresh.json) preserves the ten targeted retrievals and superseded observations. Other URLs, including the three access exceptions, retain their earlier timestamps; this was not a new full network sweep.

## Verification

The full local suite passed **131 unit tests and 117 browser checks**. Content validation and staging passed. [execution-context-verification.json](execution-context-verification.json) records the exact artifact, ten source-response hashes, unchanged fields and connections, and repeatable generation of all seven reading/sitemap outputs. The reading-page regression checks the text, source section, citation order, labels and destinations for all 209 selected claims.

[execution-context-panel-check.json](execution-context-panel-check.json) records all six revised descriptions and fourteen selected claims at desktop and phone widths. All twelve states had no reported WCAG-tagged axe violations, horizontal panel overflow or runtime errors. Six screenshots were visually inspected. The broader content backlog and human readability, motion, physical-device, Safari and assistive-technology checks remain open. No operational procedure validation or deployment is part of this pass.
