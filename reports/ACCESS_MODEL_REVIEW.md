# Access-model overview review — 7 September 2026 UTC

Six additional category overviews now have twelve selected AI claim comparisons. This pass replaces blanket access or execution promises with beginner explanations of identity, authorization, database resources, and administrative scope. These are conceptual comparisons; commands, linked techniques, connection outcomes, and ATT&CK mapping suitability were not reviewed.

| Overview | Correction and evidence |
| --- | --- |
| Exposed Services & Apps (`ad-cat-services`) | Removed the assertion that the entire category needs no domain account. Accounts and access models vary. Compared local/domain account scope and the identity/authorization distinction with [Windows authentication concepts](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts) and [authorization basics](https://learn.microsoft.com/en-us/entra/identity-platform/authorization-basics). |
| Credential Reuse (`ad-cat-cred-reuse`) | Removed the claim that each authentication method runs code on a host. Compared identity and permitted access with the same two Microsoft explanations. |
| MSSQL Abuse (`ad-cat-mssql`) | Replaced the execution/pivot promise with SQL Server's distinction between [server and database principals](https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/principals-database-engine?view=sql-server-ver17) and [securable resources](https://learn.microsoft.com/en-us/sql/relational-databases/security/securables?view=sql-server-ver17). |
| SCCM / MECM (`ad-cat-sccm`) | Replaced the blanket estate-wide execution description with the role, scope, and collection model in [Configuration Manager's administration documentation](https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration). |
| Deployment Platform Abuse (`ad-cat-deploy-abuse`) | Removed the implication that reachability confers administrative authority. The overview now identifies [Intune roles and assignment scope](https://learn.microsoft.com/en-us/intune/fundamentals/role-based-access-control/overview), with Configuration Manager as a second documented example. It no longer generalizes one behavior to every named vendor. |
| Service & Platform Abuse (`ad-cat-platform`) | Replaced automatic service-account/estate control with a comparison of SQL Server resource permissions and Configuration Manager administrative responsibilities, using the sources above. |

The conclusions about network reachability and execution are editorial inferences from the documented distinction between identity and authorized actions. They are not observations from testing a system. Review claims identify their source sections, and the connectivity inference is explicitly labeled in its record.

[access-model-source-capture.json](access-model-source-capture.json) records six successful GET responses, titles, dates, final URLs, and SHA-256 hashes. The exact reviewed text and twelve claims are literal records in [ad-categories.js](../src/data/chains/ad-categories.js); ordinary builds cannot refresh those records. The existing stale-evidence checks apply to every record.

Together with the [earlier category review](CATEGORY_REVIEW.md), twelve graph entries now contain 28 selected conceptual comparisons supported by 20 primary publications. Another 1,143 graph entries have no claim-level comparison: 378 nodes and all 765 connections. No human reviews are recorded.

The combined source inventory now has 796 URLs: 793 responded, one blocked the request, and two were unreachable. Only these six sources were refreshed in this pass; [reference-access-model-refresh.json](reference-access-model-refresh.json) retains superseded observations and all other URLs retain their earlier dates.

The [baseline comparison](data-parity.json) now accounts for fourteen changed nodes and the earlier neutral connection caption. Node IDs, edge endpoints, command content, applicability, and all other fields outside the documented changes still match baseline `4e4901f`. See [VERIFICATION.md](VERIFICATION.md) for the software evidence and [HUMAN_REVIEW.md](HUMAN_REVIEW.md) for the remaining review scope.

The counts above describe this pass. The subsequent [Windows/Linux foundations review](PLATFORM_FOUNDATIONS_REVIEW.md) adds sixteen overviews; [VERIFICATION.md](VERIFICATION.md) holds the current combined counts and build evidence.
