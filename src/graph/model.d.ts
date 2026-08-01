/**
 * Generic graph-platform data contract.
 *
 * This is the boundary between the ENGINE (this `graph/` package plus the reusable
 * `components/` widgets) and any DOMAIN that plugs into it. Everything here is
 * domain-agnostic: a node has an id, a label, a group it belongs to, and an optional
 * one-line summary — nothing about security, MITRE, Windows, exploits, etc.
 *
 * A concrete domain (see `src/data`, the security dataset) declares richer node/edge
 * types that EXTEND these, and supplies the domain-specific presentation (detail
 * bodies, filters, badges) to the platform. Strip the domain away and the platform
 * still type-checks and renders — it is "just a graph connecting framework".
 */

/** Drives node styling and whether a node is a terminal goal.
 *  A `category` groups other nodes (a folder/section header): clicking one expands
 *  it rather than opening a detail panel. Omitted ⇒ `technique`. */

/** An ordered group that nodes belong to — rendered as a left→right column and
 *  carrying the color used on the node rail/badge, the legend, and the minimap.
 *  (The security maps model these as attack "phases"; other domains might use
 *  stages, lanes, or categories — the engine only needs id + label + color.) */

/** A single node in the graph. Domains extend this with their own detail fields. */

/** A directed edge between two nodes. Domains may extend this (e.g. a canonical
 *  relationship id) but the engine only needs endpoints and optional captions. */

/** A complete, registrable map: a directed graph (a DAG, possibly converging). */

