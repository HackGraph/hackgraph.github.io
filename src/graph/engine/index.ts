/**
 * Typed handle on the graph engine, which lives at the repo root in `engine/`.
 *
 * The engine is a self-contained project that knows nothing about security: its own tests,
 * spec and demo sit beside it, and `npm test` runs them. It used to live in a sibling
 * directory and be copied in byte-for-byte, which quietly lost edits in both directions;
 * there is one copy now, and this file is a view onto it, not a duplicate of it.
 *
 * Nothing app-specific belongs in the engine. That is what `engineAdapter.ts` is for.
 *
 * It is a plain script with no ESM exports: evaluating it publishes `globalThis.GraphEngine`.
 * So it is imported for the side effect and the result read off the global — a default
 * import type-checks under Vitest's CJS interop but fails the real Rollup build.
 */
import '../../../engine/engine.js';

const vendored = (globalThis as unknown as { GraphEngine?: unknown }).GraphEngine;
if (!vendored) throw new Error('graph engine failed to publish itself on globalThis');

export interface EngineModel {
  rootId: string;
  defs: Map<string, unknown>;
  childrenOf: Map<string, { target: string; rel?: string }[]>;
  parentsOf: Map<string, string[]>;
  colorOf: Map<string, string>;
  rels: Record<string, { label: string; summary: string }>;
}

export interface ResolvedGraph {
  vg: { nodeKeys: string[]; keySet: Set<string>; edges: { id: string; source: string; target: string; rel?: string }[]; defOf: Map<string, string> };
  rank: Map<string, number>;
  parents: Map<string, string[]>;
  backEdges: Set<string>;
  unroll: Set<string>;
}

export const GraphEngine = vendored as {
  buildModel(map: unknown): EngineModel;
  resolveVisible(model: EngineModel, expanded: Set<string>, protect?: Set<string>, seedUnroll?: string[]): ResolvedGraph;
  defOfKey(vg: ResolvedGraph['vg'], key: string): string;
  hasChildren(model: EngineModel, defId: string): boolean;
  childCount(model: EngineModel, defId: string): number;
  encodeToken(state: unknown): Promise<string>;
  decodeToken(token: string): Promise<unknown>;
  CARD_W: number;
  COL_PITCH: number;
};
