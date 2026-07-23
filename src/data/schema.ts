/**
 * Security-domain content schema for HackGraph.
 *
 * These types EXTEND the generic, domain-agnostic platform contract in
 * `src/graph/model.ts` (GraphNode / GraphEdge / GraphMap) with the fields specific to
 * an offensive-security methodology: MITRE ids, tools, commands, OPSEC notes, version
 * applicability, foothold gating, and a canonical edge-relationship id.
 *
 * The engine and reusable widgets only ever see the generic base; everything added
 * here is projected into presentation by the domain layer (see data/build.ts). A
 * "map" is a directed graph (a DAG, possibly with convergence) of technique nodes;
 * additional domains (web, cloud, network) are just more MapDefinitions registered in
 * data/index.ts.
 */

import type { GraphEdge, GraphMap, GraphNode } from '../graph/model';
import type { FootholdId } from './footholds';

// Re-exported so content files keep importing the shapes they use from one place.
export type { NodeKind, PhaseDef } from '../graph/model';

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
}

export interface MitreRef {
  /** e.g. "T1558.003". */
  id: string;
  url?: string;
}

/** A single attack technique / step: the generic node plus security detail fields. */
export interface TechniqueNodeDef extends GraphNode {
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
   * Windows-version applicability: which builds the technique works on, and when it
   * was patched. Keeps the map honest about outdated vectors (e.g. an eventvwr UAC
   * bypass patched after Win10 1607). Use "All supported Windows versions" for
   * version-independent vectors (the privilege/service model rather than a bug).
   */
  affects?: string;
  /**
   * Structured counterpart to `affects`, powering the version filter. Version ids
   * (see data/windows-versions.ts) the technique applies to. OMITTED = applies to all
   * versions; only version-specific vectors enumerate a restricted set.
   */
  versions?: string[];
  /**
   * Foothold gate for the "what you hold" filter: the MINIMUM access a reader must
   * already possess to attempt this step (see data/footholds.ts). Environmental
   * conditions and the specific ACL edge / group abused stay in `requires`. OMITTED
   * = no gate (never dimmed by the foothold filter). Not set on start/category/goal.
   */
  needs?: FootholdId;
  /**
   * Semantic annotation marking a convergence hub: a "you now hold X" state node
   * that many later steps lead back to (the domain/local-creds hubs, the remote-exec
   * hub). Authoring aid only — it documents intent and is a hook for future tooling.
   * It has NO runtime effect today: loop unrolling is decided automatically from the
   * layout (any edge that lands left of its source becomes a forward instance; see
   * graph/layout.ts `resolveUnroll`), so hubs are not special-cased by the engine.
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

/** A directed edge: the generic edge plus a canonical relationship id. */
export interface AttackEdge extends GraphEdge {
  /** Canonical relationship id (see data/relationships.ts) that supplies a reusable
   *  label + explanation so same-meaning edges stay consistent. */
  rel?: string;
}

/** A complete, registrable map (e.g. the AD attack methodology). */
export interface MapDefinition extends GraphMap {
  nodes: TechniqueNodeDef[];
  edges: AttackEdge[];
}
