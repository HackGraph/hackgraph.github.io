/**
 * Types for `engine.js`, which is a classic script: evaluating it publishes
 * `globalThis.GraphEngine` and it has no ESM exports of its own.
 *
 * Declaring the surface here rather than in the host does two things: a consumer gets
 * real types for the engine API, and a type-checker reads this instead of inferring its
 * way through 900 lines of untyped graph maths. The engine itself stays plain JavaScript
 * with no build step; this file is documentation a tool can read.
 */

export interface EngineModel {
  rootId: string;
  defs: Map<string, unknown>;
  childrenOf: Map<string, { target: string; rel?: string }[]>;
  parentsOf: Map<string, string[]>;
  colorOf: Map<string, string>;
  rels: Record<string, { label: string; summary: string }>;
}

export interface VisibleGraph {
  nodeKeys: string[];
  keySet: Set<string>;
  edges: { id: string; source: string; target: string; rel?: string }[];
  defOf: Map<string, string>;
}

export interface ResolvedGraph {
  vg: VisibleGraph;
  rank: Map<string, number>;
  parents: Map<string, string[]>;
  backEdges: Set<string>;
  unroll: Set<string>;
}

export interface GraphEngineApi {
  buildModel(map: unknown): EngineModel;
  resolveVisible(model: EngineModel, expanded: Set<string>, protect?: Set<string>, seedUnroll?: string[]): ResolvedGraph;
  defOfKey(vg: VisibleGraph, key: string): string;
  hasChildren(model: EngineModel, defId: string): boolean;
  childCount(model: EngineModel, defId: string): number;
  encodeToken(state: unknown): Promise<string>;
  decodeToken(token: string): Promise<unknown>;
  CARD_W: number;
  COL_PITCH: number;
}

declare global {
  // eslint-disable-next-line no-var
  var GraphEngine: GraphEngineApi | undefined;
}

declare const _default: unknown;
export default _default;
