import type { MapDefinition, PhaseDef, TechniqueNodeDef } from '../data/schema';
import { RELATIONSHIPS } from '../data/relationships';

export type NodeId = string;

/**
 * Runtime graph model derived once from a MapDefinition. Immutable at runtime —
 * the only mutable state in the app is the expanded-id set (see useExpansion).
 *
 * `parentsOf` (reverse adjacency) is what makes multi-parent DAG visibility
 * tractable; `childrenOf` preserves edge order for deterministic layout.
 */
export interface GraphModel {
  rootId: NodeId;
  nodes: Map<NodeId, TechniqueNodeDef>;
  childrenOf: Map<NodeId, NodeId[]>;
  parentsOf: Map<NodeId, NodeId[]>;
  /** Edge label lookup keyed by `${source}->${target}` — the merged caption
   *  (explicit label, else the relationship's default). Used by the edge panel. */
  edgeLabels: Map<string, string>;
  /** On-graph captions, keyed by `${source}->${target}` — EXPLICIT labels only.
   *  Generic relationship defaults ("enables", "code execution") are deliberately
   *  omitted here so the canvas shows only meaningful captions and stays readable;
   *  the full relationship label + explanation still surface in the edge panel. */
  edgeGraphLabels: Map<string, string>;
  /** Optional per-edge explanation, keyed by `${source}->${target}`. */
  edgeDescriptions: Map<string, string>;
  /** Phase id -> definition (label + color). */
  phases: Map<string, PhaseDef>;
}

export const edgeKey = (source: NodeId, target: NodeId) => `${source}->${target}`;

/**
 * Build + validate a GraphModel from a raw map definition. Throws on structural
 * errors (duplicate ids, dangling edges, missing/unreachable root) so content
 * bugs surface immediately during development rather than as silent blank nodes.
 */
export function buildModel(map: MapDefinition): GraphModel {
  const nodes = new Map<NodeId, TechniqueNodeDef>();
  for (const node of map.nodes) {
    if (nodes.has(node.id)) {
      throw new Error(`[${map.id}] duplicate node id: "${node.id}"`);
    }
    nodes.set(node.id, node);
  }

  if (!nodes.has(map.rootId)) {
    throw new Error(`[${map.id}] rootId "${map.rootId}" is not a defined node`);
  }

  const childrenOf = new Map<NodeId, NodeId[]>();
  const parentsOf = new Map<NodeId, NodeId[]>();
  const edgeLabels = new Map<string, string>();
  const edgeGraphLabels = new Map<string, string>();
  const edgeDescriptions = new Map<string, string>();
  for (const id of nodes.keys()) {
    childrenOf.set(id, []);
    parentsOf.set(id, []);
  }

  const seenEdges = new Set<string>();
  for (const edge of map.edges) {
    if (!nodes.has(edge.source)) {
      throw new Error(`[${map.id}] edge source "${edge.source}" is not a node`);
    }
    if (!nodes.has(edge.target)) {
      throw new Error(`[${map.id}] edge target "${edge.target}" is not a node`);
    }
    const key = edgeKey(edge.source, edge.target);
    if (seenEdges.has(key)) continue; // tolerate accidental dupes
    seenEdges.add(key);

    childrenOf.get(edge.source)!.push(edge.target);
    parentsOf.get(edge.target)!.push(edge.source);
    // A canonical relationship supplies a reusable label + explanation; an
    // explicit label/description on the edge still takes precedence.
    const rel = edge.rel ? RELATIONSHIPS[edge.rel] : undefined;
    if (edge.rel && !rel) {
      throw new Error(`[${map.id}] edge ${key} references unknown rel "${edge.rel}"`);
    }
    const label = edge.label ?? rel?.label;
    const description = edge.description ?? rel?.description;
    if (label) edgeLabels.set(key, label);
    // Only EXPLICIT labels reach the canvas; a bare relationship default does not.
    if (edge.label) edgeGraphLabels.set(key, edge.label);
    if (description) edgeDescriptions.set(key, description);
  }

  const phases = new Map(map.phases.map((p) => [p.id, p]));

  return { rootId: map.rootId, nodes, childrenOf, parentsOf, edgeLabels, edgeGraphLabels, edgeDescriptions, phases };
}
