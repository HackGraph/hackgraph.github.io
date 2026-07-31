/**
 * Adapter from this app's {@link GraphMap} to the standalone graph engine's map shape.
 *
 * The engine (`apps/graph/engine.js`) is domain-blind and DOM-free: it owns visibility,
 * loop unrolling, ranks, layout, path finding, search and the share codec. Its contract is
 * nearly identical to ours already; only two things differ:
 *
 *   - a node names its group by LABEL there and by phase ID here, because the engine keys
 *     its colour table on the label;
 *   - an edge carries a `rel` key into a per-map relationship table there, where we carry
 *     the caption and description inline on the edge.
 *
 * Both are mechanical. Nothing security-specific crosses this boundary, so the engine stays
 * a generic graph framework and this file is the only thing that would need rewriting if
 * the dataset were swapped.
 */
import type { GraphMap, GraphNode } from './model';

/** A relationship entry as the engine expects it. */
export interface EngineRelationship {
  label: string;
  summary: string;
}

/** The engine's map shape. Structurally domain-free — see the note above. */
export interface EngineMap {
  id: string;
  name: string;
  rootId: string;
  phases: { id: string; label: string; color: string }[];
  nodes: {
    id: string; label: string; group: string; kind?: string; summary?: string;
    /** Filter inputs. The engine passes these through untouched; only host filters read them. */
    versions?: string[];
    needs?: string;
    details?: {
      description?: string;
      caution?: string;
      cautionLabel?: string;
      prereqs?: string[];
      tools?: { name: string; url?: string }[];
      commands?: { label?: string; code: string }[];
      refs?: [string, string][];
    };
  }[];
  edges: { source: string; target: string; rel?: string }[];
  relationships: Record<string, EngineRelationship>;
}

/**
 * The detail body, in the shape the engine's panel already renders.
 *
 * Almost one-to-one — `opsec` is the engine's `caution`, `requires` its `prereqs`, and the
 * MITRE technique is just another reference. Nothing here needed inventing, which is the
 * reason the engine's own panel can show this dataset rather than a React one bridged to it.
 */
function detailsOf(node: GraphNode) {
  // the dataset's richer node type extends GraphNode; read the extra fields structurally
  const n = node as unknown as Record<string, unknown>;
  // pass tools and commands through WHOLE. Flattening them to bare strings quietly threw
  // away every tool's homepage and every command's caption.
  const tools = n.tools as { name: string; url?: string }[] | undefined;
  const commands = n.commands as { label?: string; code: string }[] | undefined;
  const refs: [string, string][] = [];
  const mitre = n.mitre as { id: string; url?: string } | undefined;
  if (mitre?.url) refs.push([`MITRE ATT&CK · ${mitre.id}`, mitre.url]);
  for (const r of (n.references as { label: string; url: string }[] | undefined) ?? []) {
    refs.push([r.label, r.url]);
  }
  const d = {
    description: n.description as string | undefined,
    caution: n.opsec as string | undefined,
    // this dataset's caution box has a name of its own
    cautionLabel: n.opsec ? 'OPSEC' : undefined,
    prereqs: n.requires as string[] | undefined,
    tools,
    commands,
    refs: refs.length ? refs : undefined,
  };
  return Object.values(d).some((v) => v !== undefined) ? d : undefined;
}

/** Stable, collision-free key for an edge caption. */
function relKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'link';
}

/**
 * Convert a map to the engine's shape.
 *
 * Edges with the same caption share one relationship entry, which is what the engine's
 * per-map table is for. Where two edges use the same caption with different descriptions
 * the first description wins — the caption is the vocabulary, the description explains it.
 */
export function toEngineMap(map: GraphMap): EngineMap {
  const labelOfPhase = new Map(map.phases.map((p) => [p.id, p.label]));
  const relationships: Record<string, EngineRelationship> = {};

  const edges = map.edges.map((e) => {
    if (!e.label) return { source: e.source, target: e.target };
    const key = relKey(e.label);
    if (!relationships[key]) {
      relationships[key] = { label: e.label, summary: e.description ?? '' };
    }
    return { source: e.source, target: e.target, rel: key };
  });

  return {
    id: map.id,
    name: map.name,
    rootId: map.rootId,
    phases: map.phases.map((p) => ({ id: p.id, label: p.label, color: p.color })),
    // group is the phase LABEL: the engine's colour table is keyed on it
    nodes: map.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      group: labelOfPhase.get(n.phase) ?? n.phase,
      kind: n.kind,
      summary: n.summary,
      // carried so host filters can dim on them; the engine itself never looks at these
      versions: (n as unknown as { versions?: string[] }).versions,
      needs: (n as unknown as { needs?: string }).needs,
      details: detailsOf(n),
    })),
    edges,
    relationships,
  };
}
