/**
 * Adapter from this app's {@link GraphMap} to the standalone graph engine's map shape.
 *
 * The engine (`engine/engine.js`) is domain-blind and DOM-free: it owns visibility,
 * loop unrolling, ranks, layout, path finding, search and the share codec. Its contract is
 * nearly identical to ours already; only two things differ:
 *
 *   - a node names its group by LABEL there and by phase ID here, because the engine keys
 *     its colour table on the label;
 *   - an edge's relationship table is per-map there, where ours ({@link RELATIONSHIPS}) is
 *     shared across every map, and an edge may override the caption or the explanation
 *     inline. {@link buildRels} flattens the two into one table.
 *
 * Both are mechanical. Nothing security-specific crosses this boundary, so the engine stays
 * a generic graph framework and this file is the only thing that would need rewriting if
 * the dataset were swapped.
 */
import { RELATIONSHIPS } from '../data/relationships.js';

/** A relationship entry as the engine expects it. */

/** The engine's map shape. Structurally domain-free — see the note above. */

/**
 * The detail body, in the shape the engine's panel already renders.
 *
 * Almost one-to-one — `opsec` is the engine's `caution`, `requires` its `prereqs`, and the
 * MITRE technique is just another reference. Nothing here needed inventing, which is the
 * reason the engine's own panel can show this dataset rather than a React one bridged to it.
 *
 * Nodes and edges both go through here. They author the same field names, and the engine
 * renders both with one set of sections, so an edge's requirements read as a list the way a
 * node's do instead of as a semicolon-spliced sentence.
 */
function detailsOf(
  src,
  // A node's `description` is a paragraph below its summary. An edge's IS its summary, and
  // rendering it in both places printed it twice.
  opts = {},
) {
  // the dataset's richer types extend these; read the extra fields structurally
  const n = src ;
  // pass tools and commands through WHOLE. Flattening them to bare strings quietly threw
  // away every tool's homepage and every command's caption.
  const tools = n.tools ;
  const commands = n.commands ;
  const refs = [];
  const mitre = n.mitre ;
  if (mitre?.url) refs.push([`MITRE ATT&CK · ${mitre.id}`, mitre.url]);
  for (const r of (n.references) ?? []) {
    refs.push([r.label, r.url]);
  }
  const d = {
    description: opts.ownDescription === false ? undefined : (n.description),
    caution: n.opsec,
    // this dataset's caution box has a name of its own
    cautionLabel: n.opsec ? 'OPSEC' : undefined,
    prereqs: n.requires,
    prereqsLabel: n.requires ? opts.prereqsLabel : undefined,
    tools,
    commands,
    refs: refs.length ? refs : undefined,
  };
  return Object.values(d).some((v) => v !== undefined) ? d : undefined;
}

/** Stable, collision-free key for an edge caption. */
function relKey(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'link';
}

/**
 * Flatten our two sources of edge wording into the engine's one per-map table.
 *
 * An edge names a canonical relationship with `rel` and may override either half of it:
 * `label` for a caption specific to this step, `description` for a specific explanation.
 * Whatever it does not override, the canonical entry supplies. Only an EXPLICIT label is
 * drawn on the canvas — a bare `rel` still earns a named, explained edge panel, but
 * captioning all 75 of them would bury the graph in text that says what the two nodes
 * already say.
 *
 * Entries are keyed by CONTENT, so edges that resolve to the same wording share one entry
 * and an override gets its own (`host-exec`, `host-exec-2`, ...). Keying on the caption
 * alone, as this once did, silently merged the two distinct `no SID filtering` edges.
 */
function buildRels(map) {
  const relationships = {};
  const keyOf = new Map ();

  function intern(base, entry) {
    // the details are part of the identity: two edges can share a caption and still list
    // different conditions, and merging those would show one edge's requirements on the other
    const sig = [base, entry.label, entry.summary, entry.tag, JSON.stringify(entry.details ?? null)].join('\u0000');
    const seen = keyOf.get(sig);
    if (seen) return seen;
    let key = base;
    for (let n = 2; relationships[key]; n++) key = `${base}-${n}`;
    relationships[key] = entry;
    keyOf.set(sig, key);
    return key;
  }

  const edges = map.edges.map((e) => {
    const canon = e.rel ? RELATIONSHIPS[e.rel] : undefined;
    if (e.rel && !canon) {
      throw new Error(`[${map.id}] edge ${e.source} -> ${e.target} references unknown rel "${e.rel}"`);
    }
    const summary = e.description ?? canon?.description ?? '';
    // On an edge the list answers "is this my branch?", not "what do I need first", so it
    // is named for the question it actually answers.
    const details = detailsOf(e, { prereqsLabel: 'Applies when', ownDescription: false });
    // An edge may explain itself without naming itself, and it still needs a panel heading.
    // What that heading should say depends on what the edge carries: a list of conditions is
    // telling you when to take this branch, where a bare paragraph only describes the move.
    const label =
      e.label ??
      canon?.label ??
      (details?.prereqs ? 'when to take this' : summary || details ? 'transition' : undefined);
    if (!label) return { source: e.source, target: e.target };
    const rel = intern(e.rel ?? relKey(label), { label, summary, tag: e.label !== undefined, details });
    return { source: e.source, target: e.target, rel };
  });

  return { edges, relationships };
}

/** Convert a map to the engine's shape. */
export function toEngineMap(map) {
  const labelOfPhase = new Map(map.phases.map((p) => [p.id, p.label]));
  const { edges, relationships } = buildRels(map);

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
      versions: (n).versions,
      needs: (n).needs,
      details: detailsOf(n),
    })),
    edges,
    relationships,
  };
}
