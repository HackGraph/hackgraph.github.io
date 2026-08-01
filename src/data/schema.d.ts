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

// Re-exported so content files keep importing the shapes they use from one place.

/** A phase is just a group id; each map declares its own ordered phases with labels
 *  and colors (see {@link PhaseDef}). Kept domain-agnostic so AD, Windows PE, etc.
 *  each define their own phases. */

/** A single attack technique / step: the generic node plus security detail fields. */

/**
 * A directed edge in an attack map.
 *
 * The framework half ({@link GraphEdge}) is source, target and the canonical `rel` id — the
 * relationship vocabulary belongs to the shared framework, not to the security data. The
 * fields below are the same detail body a technique node carries, because an edge is a step
 * too: taking a branch has conditions, costs noise, and has something worth reading behind
 * it. Authoring those as fields rather than as one semicolon-spliced sentence in `description`
 * is what lets the panel render an edge the way it renders a node.
 */

/** A complete, registrable map (e.g. the AD attack methodology). */

