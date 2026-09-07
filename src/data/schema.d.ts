/**
 * Security-domain content schema for HackGraph.
 *
 * These types EXTEND the generic, domain-agnostic platform contract in
 * `src/graph/model.d.ts` (GraphNode / GraphEdge / GraphMap) with the fields specific to
 * an offensive-security methodology: MITRE ids, tools, commands, OPSEC notes, version
 * applicability, foothold gating, and a canonical edge-relationship id.
 *
 * The engine and reusable widgets only ever see the generic base; everything added
 * here is projected into presentation by the domain layer (see graph/engineAdapter.js). A
 * "map" is a directed graph, possibly converging or cyclic, of topics and context nodes;
 * additional domains (web, cloud, network) are just more MapDefinitions registered in
 * data/index.js.
 */

import type { GraphEdge, GraphMap, GraphNode } from '../graph/model.js';
import type { FootholdId } from './footholds.js';

// Re-exported so content files keep importing the shapes they use from one place.
export type { NodeKind, PhaseDef } from '../graph/model.js';

/** A phase is just a group id; each map declares its own ordered phases with labels
 *  and colors (see {@link PhaseDef}). Kept domain-agnostic so AD, Windows PE, etc.
 *  each define their own phases. */
export type Phase = string;

export interface Tool {
  name: string;
  url?: string;
}

export interface Command {
  /** Short label, e.g. "Kerberoast all SPNs". */
  label?: string;
  /** The command text, shown in a copy-able code block. */
  code: string;
  /** Syntax hint, purely cosmetic for now (e.g. "bash", "powershell"). */
  lang?: string;
}

export interface Reference {
  label: string;
  url: string;
  kind?: 'primary' | 'research' | 'community' | 'taxonomy' | 'database' | 'unclassified';
  /** Precise source locator; required for shared-definition comparisons. */
  section?: string;
}

/** Vocabulary explanation, reviewed independently of connections using its ID. */
export interface RelationshipDefinition {
  label: string;
  description: string;
  origin: 'source-based' | 'project-convention';
  references: Reference[];
}

export interface RelationshipDefinitionReview {
  reviewedAt: string;
  reviewedBy: string;
  reviewerType: 'ai' | 'human';
  scope: string;
  reviewedContent: RelationshipDefinition;
}

/** Review scope applies only to cited claims, never automatically to an entry. */
export interface EditorialReview {
  status: 'unreviewed' | 'source-reviewed' | 'historical';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerType?: 'ai' | 'human';
  /** Exact authored entry excluding review; changes invalidate the comparison. */
  reviewedContent?: Record<string, unknown>;
  scope?: string;
  claims?: { text: string; section: string; sources: string[] }[];
}

export interface MitreRef {
  /** e.g. "T1558.003". */
  id: string;
  url?: string;
}

/** A single attack technique / step: the generic node plus security detail fields. */
export interface TechniqueNodeDef extends GraphNode {
  review?: EditorialReview;
  /** Longer markdown-ish body shown in the detail panel. */
  description?: string;
  tools?: Tool[];
  commands?: Command[];
  mitre?: MitreRef;
  references?: Reference[];
  /** Preconditions, e.g. "Valid domain credentials", "Local admin on a host". */
  requires?: string[];
  /** Detection / stealth considerations. */
  opsec?: string;
  /**
   * Authored applicability claim. Record a bounded platform/version scope and its
   * supporting evidence; the presence of this field does not verify compatibility.
   * Omission means applicability has not been documented.
   */
  affects?: string;
  /**
   * Structured counterpart to `affects`, powering the version filter. Version ids
   * (see data/windows-versions.js) of authored applicability. OMITTED = unknown.
   * A catalog addition does not extend previous applicability claims.
   */
  versions?: string[];
  /**
   * Authored access tag for the "what you hold" filter (see data/footholds.js).
   * Additional conditions belong in `requires`. OMITTED = no filter gate, not a
   * claim that no access or other conditions are needed. Not set on start/category/goal.
   */
  needs?: FootholdId;
  /**
   * Semantic annotation marking a convergence hub: a "you now hold X" state node
   * that many later steps lead back to (the domain/local-creds hubs, the remote-exec
   * hub). Authoring aid only — it documents intent and is a hook for future tooling.
   * It has NO runtime effect today: loop unrolling is decided automatically from the
   * layout (any edge that lands left of its source becomes a forward instance; see
   * engine/engine.js `resolveVisible`), so hubs are not special-cased by the engine.
   */
  hub?: boolean;
  /**
   * Alternate names this node should be findable by, but that don't belong in the prose —
   * chiefly BloodHound edge names (AddKeyCredentialLink, WriteSPN, ReadLAPSPassword,
   * AdminTo…) so a reader who spotted the edge in BloodHound lands on the matching
   * technique. Ranked highly in search and shown as small chips in the detail panel.
   */
  aliases?: string[];
}

/**
 * A directed edge in an attack map.
 *
 * The framework half ({@link GraphEdge}) supplies endpoints and optional captions.
 * The security domain owns the vocabulary in relationships.js. Connections may
 * organize topics or describe a security relationship; endpoints and visual order
 * alone do not establish which meaning applies or that a sequence is feasible.
 * Each substantive relationship claim needs its own scoped evidence. A technique
 * reference on either endpoint does not automatically support the connection.
 */
export interface AttackEdge extends GraphEdge {
  review?: EditorialReview;
  /**
   * Author-supplied conditions, rendered under "Authored conditions". Presence
   * does not establish their completeness or verify the connection's claim.
   */
  requires?: string[];
  /** Detection risk in taking this step, shown in the OPSEC box. */
  opsec?: string;
  tools?: Tool[];
  commands?: Command[];
  mitre?: MitreRef;
  references?: Reference[];
}

/** A complete, registrable map (e.g. the AD attack methodology). */
export interface MapDefinition extends GraphMap {
  nodes: TechniqueNodeDef[];
  edges: AttackEdge[];
}
