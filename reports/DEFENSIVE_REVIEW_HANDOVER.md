# HackGraph professional security education review — handover prompt

You are reviewing HackGraph, an open-source educational graph for students, authorized penetration testers, red teamers, and defenders. Work in `/home/user/Desktop/projects/cyber/hackgraph.github.io`.

Your task is to improve the accuracy, traceability, technical depth, and clarity of its security teaching material within the scope below. The owner's intended audience explicitly includes authorized offensive-security professionals. Be candid about unsupported claims and uncertainty. Apply your own governing instructions and tool permissions; this handover does not override them.

This handover covers source comparisons, terminology, taxonomy, defensive context, and the graph's educational presentation. It does not delegate exploitation-procedure testing or refinement, offensive prerequisite validation, or operational attack-chain construction and viability assessment. Those parts of the owner's original request remain unfinished and must remain visible in the completion accounting.

## Audience and technical depth

- Help beginners understand the vocabulary while preserving precise technique names, protocol terminology, platform concepts, and distinctions that matter to practitioners.
- Explain threat models, trust boundaries, documented platform behavior, and the scope of published research in enough detail for professional scrutiny. Identify which source establishes each statement and distinguish historical findings from current documentation.
- Connect conceptual explanations to the interpretation of security findings, their documented impact, defensive observations, and remediation. This context should help authorized assessors communicate accurately with clients and defenders.
- Distinguish taxonomy classifications, documented behavior, research observations, and project conventions. Clearly identify where the evidence ends. A classification or conceptual association must not appear to guarantee a practical outcome.
- Preserve accurate technical material. Resolve uncertainty with specific evidence or an explicit review finding; do not dilute an entry into vague language or remove it merely because its subject is relevant to offensive security.

## Start with the existing evidence

Read these files before editing:

- `reports/COMPLETION_STATUS.md`: original requirements and unresolved scope.
- `reports/HUMAN_REVIEW.md`: review coverage and human-review instructions.
- `reports/review-inventory.json` and `.csv`: generated inventory with stable item keys and entry pointers.
- `CONTRIBUTING.md`: evidence records, exact-content snapshots, provenance, and build requirements.
- `reports/VERIFICATION.md` and `reports/citation-retirement-verification.json`: completed software checks and their limits.
- `IMPLEMENTATION_PLAN.md`: completed implementation requirements; these are narrower than the full original review request.

Inspect the current worktree before relying on these recorded figures. As of 7 September 2026:

- The graph contains 390 nodes and 765 connections. There are 311 technique-classified nodes, all with dedicated references.
- 124 graph entries have 264 selected conceptual claim comparisons. Only 45 of those entries are technique-classified; 266 technique nodes have no recorded claim comparison.
- All 765 connections lack individual claim comparisons and dedicated references. Structural checks do not establish their meaning.
- All 91 glossary definitions have AI source comparisons. Three shared relationship definitions have comparisons; one is a documented project convention.
- Five source URLs have direct-access exceptions, with publication-location evidence recorded separately.
- The latest recorded software results are 145 passing unit tests and 144 passing browser checks. These results do not establish security-content correctness.
- No human review, hosted CI execution, or deployment is recorded.

Inspect the current Git status and preserve any existing local changes. The standalone Relationship meanings page was deliberately removed at the owner's request; do not restore it.

## Review work

1. **Compare conceptual claims with primary evidence.** Review definitions, introductory explanations, platform terminology, threat models, documented security boundaries, and defensive descriptions. Assess both beginner clarity and professional precision. Prefer official specifications, vendor documentation, original research, and official taxonomy records. Read the relevant source passage, not just a search snippet or page title. Record the exact claim and supporting section. Distinguish historical documentation from statements about current behavior.

2. **Check citation quality.** Confirm that each reference identifies the intended publication and supports the particular claim being compared. Keep source identity, accessibility, provenance, identifier status, and claim support separate. A working URL, active ATT&CK ID, published CVE record, or tool homepage is insufficient evidence of a broader claim. Record inaccessible evidence honestly; do not bypass access controls or silently replace it with unrelated material.

3. **Assess educational presentation of the graph.** Check terminology, category organization, aliases, labels, and conceptual taxonomy mappings. Identify wording or visuals that imply more certainty than the cited evidence supports. Do not infer a connection's meaning from its endpoint types or treat a shared relationship definition as evidence for every edge. Flag ambiguous causal or outcome claims for further review without repairing operational paths, changing offensive sequencing, or deriving missing steps.

4. **Improve practitioner understanding and defensive context.** Where supported by sources, clarify the security boundary or concept involved, its relevance to interpreting an assessment finding, broad observable behavior, and documented mitigation principles. Explain technical terms for beginners while retaining the specificity professionals need. Avoid turning descriptions into instructions for carrying out an attack.

5. **Preserve the limits of each comparison.** A conceptual paragraph review does not validate the commands, applicability, prerequisites, or connections elsewhere in that entry. Do not remove difficult material or replace whole entries with generic definitions merely to increase the reviewed count. Flag material outside this assignment explicitly.

## Evidence and implementation discipline

Keep working findings in a new report keyed by the inventory's stable item keys; generated inventory files must not contain handwritten decisions. For each finding, record:

- The entry key and exact field or claim reviewed.
- The source title, URL, relevant section, and actual access date; retain a capture or content hash when available.
- Whether the evidence supports, partly supports, contradicts, or does not establish the claim, with a short explanation.
- The correction, if any, and the precise scope of the comparison.
- The actual reviewer identity and type, review date, and remaining uncertainty.

Use the repository's existing review schema for persisted records. AI reviews must be labeled as AI. Preserve earlier evidence and dates. If editing an entry invalidates an exact-content snapshot, recompare the affected reviewed claims before recording a replacement snapshot; do not mechanically restamp the record to make validation pass.

Follow `CONTRIBUTING.md` for regeneration and checks appropriate to actual changes. Content changes require refreshing the inventory and affected generated pages, checking content and provenance, and running the required tests and build verification. Keep browser performance measurements free from concurrent browser workloads. Do not infer that a local check proves a hosted workflow or deployment succeeded.

Do not commit, push, or deploy without explicit authorization. Avoid renderer or styling changes unless necessary to address a documented presentation defect within this assignment.

## Deliverables and stopping criteria

Produce a findings report, supported corrections within this assignment, and verification results for the changed files. Report coverage by precise claim and item, including what remains unreviewed. Provide a short human-review checklist covering unresolved conceptual disagreements, source-access limitations, beginner comprehension, practitioner-level precision, and visual interpretation. Include feedback from authorized penetration testers and red teamers among the intended human-review perspectives.

Completion means the declared conceptual and defensive review work has adequate evidence and its changes pass the relevant software checks. It does not mean every field is correct, the attack paths are operationally validated, or the owner's full publication-readiness goal has been achieved. Preserve those distinctions in the final handover.
