# Relationship definitions: implemented corrections

Reviewed and implemented by Codex (AI), 7 September 2026 UTC. This follows the reusable-wording finding in [DEFENSIVE_REVIEW.md](DEFENSIVE_REVIEW.md).

## Corrected vocabulary

| Definition | Correction | Evidence and scope |
| --- | --- | --- |
| Code execution | Removed the general promise of SYSTEM execution and subsequent access. The definition distinguishes execution from process/thread security context | [MITRE Execution](https://attack.mitre.org/tactics/TA0002/), introductory definition; [Microsoft Access tokens](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens), introduction and token contents |
| Credential reuse | Declares the local meaning of the label and distinguishes an authentication attempt from authorization. Removed the blanket lateral-access outcome | [NIST Authentication](https://csrc.nist.gov/glossary/term/authentication), identity-authentication definitions; [NIST Authorization](https://csrc.nist.gov/glossary/term/authorization), access privileges and decisions. NIST supports the authentication/authorization distinction; the first sentence declares HackGraph's terminology |
| Dependency (`enables`) | Replaced a blanket precondition/outcome assertion with an explicitly author-declared dependency whose scope belongs to the connection | Project convention, recorded separately from external source comparisons |
| Root context | Defines UID 0 while retaining the capability and user-namespace qualification. Removed the blanket claim of complete host access | Linux man-pages [capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html), description; [user_namespaces(7)](https://man7.org/linux/man-pages/man7/user_namespaces.7.html), description and capabilities |

All four definitions currently used by the maps are covered: **three AI source comparisons and one project convention**. The exact wording, citations, and source sections are recorded in [relationship-reviews.js](../src/data/relationship-reviews.js). Six successful source retrievals, timestamps, titles, and response hashes are recorded in [relationship-source-capture.json](relationship-source-capture.json).

Eight unused canonical definitions were removed. No map referenced them; the content checks still reject unknown relationship IDs. They can be introduced later with an actual need, bounded definition, and evidence. This does not remove any authored graph node or connection.

## Presentation and evidence boundary

The graph now presents a **Shared definition** section separately from **Connection evidence**. Definition wording stays visible; native disclosure controls reveal the reviewer, scope, source sections, and links. A connection retains its own authored description and caption. An unnamed connection uses the neutral heading “connection,” and its conditions are labeled “Authored conditions.”

Shared definitions and their source disclosures are available directly in the graph panels. The standalone reading page was removed at the user's request, along with its navigation links, generated output, sitemap entry, and staging configuration.

Shared-definition reviews and citations do not propagate into connection claims, declared references, or review counts. New negative tests enforce that distinction. Editing definition wording, origin, source URLs, or source sections invalidates the prior comparison; content validation and the build reject stale or malformed records. Project conventions cannot increase the independent source-comparison count.

## Scope and remaining work

These definitions appear on 114 existing connections. At the time of this vocabulary pass, the raw map remained unchanged: 390 nodes and 765 edges. The later [category review](CATEGORY_REVIEW.md) corrects six overview descriptions and adds scoped claim records. This work changes the shared vocabulary and how evidence is presented; it does not certify the 114 connections' outcomes or infer semantic types for the other 651.

The inventory now contains 1,250 items: 1,155 graph entries, 91 glossary definitions, and four shared relationship definitions. The later category pass records 16 conceptual claims in six nodes; 1,149 graph entries still have no claim-level comparison. No human review, commit, push, or deployment is recorded.

See [VERIFICATION.md](VERIFICATION.md) for the final tests, source-access observations, screenshots, and build artifact.
