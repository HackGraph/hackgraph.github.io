import type { TechniqueNodeDef, AttackEdge } from '../data/schema';

/** A node with its precomputed, lowercased search haystacks, split into weight tiers. */
export interface SearchEntry {
  node: TechniqueNodeDef;
  label: string; // node label (highest weight)
  alias: string; // alternate names, chiefly BloodHound edge names (near-label weight)
  strong: string; // summary + MITRE id + tool names
  body: string; // description + requires + opsec + command labels & code
  weak: string; // reference labels + text of every incident edge
}

/**
 * Build a tiered search index once per map, so each keystroke is a few cheap substring
 * checks instead of re-reading every node.
 *
 * Deep fields (description, commands, requires, opsec, references) are indexed at lower
 * weight than the label/summary — searching "vsftpd", "S4U2Proxy", or a raw attribute
 * name now lands on the right node. Each edge's `label`+`description` is folded onto BOTH
 * endpoints, so a term that lives on the edge REACHING a node (e.g. the BloodHound
 * "AddAllowedToAct" indicator on the delegation -> rbcd edge) still surfaces that node.
 */
export function buildSearchIndex(nodes: TechniqueNodeDef[], edges: AttackEdge[]): SearchEntry[] {
  const edgeText = new Map<string, string[]>();
  const add = (id: string, s: string) => {
    const arr = edgeText.get(id);
    if (arr) arr.push(s);
    else edgeText.set(id, [s]);
  };
  for (const e of edges) {
    const t = `${e.label ?? ''} ${e.description ?? ''}`.trim();
    if (!t) continue;
    add(e.source, t);
    add(e.target, t);
  }
  return nodes.map((n) => ({
    node: n,
    label: n.label.toLowerCase(),
    alias: (n.aliases ?? []).join(' ').toLowerCase(),
    strong: `${n.summary ?? ''} ${n.mitre?.id ?? ''} ${(n.tools ?? []).map((t) => t.name).join(' ')}`.toLowerCase(),
    body: `${n.description ?? ''} ${(n.requires ?? []).join(' ')} ${n.opsec ?? ''} ${(n.commands ?? [])
      .map((c) => `${c.label} ${c.code}`)
      .join(' ')}`.toLowerCase(),
    weak: `${(n.references ?? []).map((r) => r.label).join(' ')} ${(edgeText.get(n.id) ?? []).join(' ')}`.toLowerCase(),
  }));
}

/** Relevance of `entry` for the lowercased `query`. Higher is better; 0 = no match.
 *  Label beats summary/tools beats description/commands beats references/edge text. */
export function scoreEntry(entry: SearchEntry, query: string): number {
  if (entry.label.includes(query)) return entry.label.startsWith(query) ? 6 : 5;
  // An exact-ish alias hit (a BloodHound edge name) is a strong intent signal — rank it
  // just below a label match, above summary/description.
  if (entry.alias.includes(query)) return 4;
  if (entry.strong.includes(query)) return 3;
  if (entry.body.includes(query)) return 2;
  if (entry.weak.includes(query)) return 1;
  return 0;
}

/** Top `limit` technique nodes for `query` (categories/start nodes excluded), best first. */
export function searchNodes(index: SearchEntry[], query: string, limit = 8): TechniqueNodeDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index
    .filter((e) => e.node.kind !== 'category' && e.node.kind !== 'start')
    .map((e) => ({ e, s: scoreEntry(e, q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.e.node.label.length - b.e.node.label.length)
    .slice(0, limit)
    .map((r) => r.e.node);
}
