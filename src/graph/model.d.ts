/**
 * Generic graph-platform data contract.
 *
 * This is the boundary between the ENGINE (the pure engine and embeddable renderer) and any DOMAIN that plugs into it. Everything here is
 * domain-agnostic: a node has an id, a label, a group it belongs to, and an optional
 * one-line summary — nothing about security, MITRE, Windows, exploits, etc.
 *
 * A concrete domain (see `src/data`, the security dataset) declares richer node/edge
 * types that EXTEND these, and supplies the domain-specific presentation (detail
 * bodies, filters, badges) to the platform. Strip the domain away and the platform
 * still type-checks and renders — it is "just a graph connecting framework".
 */

/** Drives node styling and whether a node is a terminal goal.
 *  A `category` groups other nodes (a folder/section header). Omitted ⇒ `technique`. */
export type NodeKind = 'start' | 'technique' | 'goal' | 'category';

/** An ordered group that nodes belong to, carrying their category color.
 *  Layout columns follow graph ranks, not phase order.
 *  (The security maps model these as attack "phases"; other domains might use
 *  stages, lanes, or categories — the engine only needs id + label + color.) */
export interface PhaseDef {
  id: string;
  label: string;
  /** CSS color for this group. */
  color: string;
}

/** A single node in the graph. Domains extend this with their own detail fields. */
export interface GraphNode {
  /** Unique within a map; edges reference this id when topics converge. */
  id: string;
  /** Short name shown on the node card. */
  label: string;
  /** The id of the {@link PhaseDef} group this node belongs to. */
  phase: string;
  kind?: NodeKind;
  /** One-liner shown under the label on the card and in search results. */
  summary?: string;
}

/** A directed edge between two nodes. Domains may extend this (e.g. a canonical
 *  relationship id) but the engine only needs endpoints and optional captions. */
export interface GraphEdge {
  source: string;
  target: string;
  /**
   * Optional relationship id resolved by the domain adapter. It may supply a
   * reusable caption and a separately presented definition. The generic engine
   * does not interpret domain meaning or infer causality from the endpoints.
   */
  rel?: string;
  /** Caption + explanation surfaced when the edge is inspected. */
  label?: string;
  description?: string;
}

/** A complete, registrable map: a directed graph, possibly converging or cyclic. */
export interface GraphMap {
  id: string;
  name: string;
  /** Short tagline for the header. */
  tagline?: string;
  /** The single entry node every traversal starts from. */
  rootId: string;
  /** Ordered groups for this map (drive node colors + legend). */
  phases: PhaseDef[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}
