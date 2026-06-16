/**
 * Core content schema for HackGraph.
 *
 * A "map" is a directed graph (a DAG, possibly with convergence) of attack
 * technique nodes. v1 ships the Active Directory map, but nothing here is
 * AD-specific: additional domains (web, cloud, network) are just more
 * MapDefinitions registered in data/index.ts.
 */

/**
 * A phase is just a string id; each map declares its own ordered phases with
 * labels and colors (see PhaseDef on MapDefinition). This keeps the engine
 * domain-agnostic: AD, Windows PE, web, etc. each define their own phases.
 */
export type Phase = string;

export interface PhaseDef {
  id: Phase;
  label: string;
  /** Hex color used for the node rail/badge/legend and minimap. */
  color: string;
}

/** Kind drives node styling and whether it's a terminal goal.
 *  `category` nodes group techniques (a folder/section header); clicking one
 *  expands it rather than opening a detail panel. */
export type NodeKind = 'start' | 'technique' | 'goal' | 'category';

export type Difficulty = 'easy' | 'medium' | 'hard';

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

/** A single attack technique / step. */
export interface TechniqueNodeDef {
  /** Globally unique within a map; ids may be shared across chains to converge. */
  id: string;
  /** Short name shown on the node. */
  label: string;
  phase: Phase;
  kind?: NodeKind;
  /** One-liner shown under the label on the node card. */
  summary?: string;
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
  difficulty?: Difficulty;
  /**
   * Convergence hub: a "you now hold X" state node that many later steps lead back
   * to (the domain/local-creds hubs, the remote-exec hub). Excluded from loop
   * unrolling so it stays a SINGLE node; incoming back-edges render as dashed
   * loop-backs instead of spawning a redundant forward copy per source.
   */
  hub?: boolean;
}

export interface AttackEdge {
  source: string;
  target: string;
  /** Optional short label rendered on the edge. */
  label?: string;
  /** Optional longer explanation of the transition, shown when the edge is clicked. */
  description?: string;
  /** Canonical relationship id (see data/relationships.ts) that supplies a reusable
   *  label + explanation so same-meaning edges stay consistent. */
  rel?: string;
}

/** A complete, registrable map (e.g. the AD attack methodology). */
export interface MapDefinition {
  id: string;
  name: string;
  /** Short tagline for the header. */
  tagline?: string;
  /** The single entry node every traversal starts from. */
  rootId: string;
  /** Ordered phase definitions for this map (drive node colors + legend). */
  phases: PhaseDef[];
  nodes: TechniqueNodeDef[];
  edges: AttackEdge[];
}
