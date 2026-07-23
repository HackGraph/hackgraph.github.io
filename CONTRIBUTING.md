# Contributing to HackGraph

HackGraph is split into two layers so you can add content without touching the engine:

| Layer | Where | What |
| --- | --- | --- |
| **Content** | `src/data/` | The maps, nodes, edges, relationships: plain data you edit |
| **Engine** | `src/graph/`, `src/components/`, `src/state/` | Generic graph/animation code; never references any specific node |

If you're adding techniques, you only ever edit files under **`src/data/`**.

```
src/data/
  schema.ts          # the data shapes (read this first)
  chains/*.ts        # the nodes + edges, grouped by topic
  lib.ts             # shared authoring helpers (mitre, cat, r)
  relationships.ts   # canonical edge "rel" vocabulary
  maps/*.ts          # assemble chains into a MapDefinition
  index.ts           # the registry of maps  ->  MAPS = [...]
  content.test.ts    # validates everything you add
```

## The shapes (`src/data/schema.ts`)

```ts
interface TechniqueNodeDef {
  id: string;          // globally unique within a map (kebab-case)
  label: string;       // short name on the node
  phase: string;       // one of the map's phase ids (drives colour/column)
  kind?: 'start' | 'technique' | 'goal' | 'category';   // default: technique
  summary?: string;    // one-liner under the label
  description?: string; // longer body in the detail panel
  tools?:   { name: string; url?: string }[];
  commands?:{ label?: string; code: string; lang?: string }[];  // copy-able
  mitre?:   { id: string; url?: string };   // e.g. { id: 'T1558.003' }
  references?: { label: string; url: string }[];
  requires?: string[]; // prerequisites
  opsec?: string;      // detection / stealth notes
}

interface AttackEdge {
  source: string;       // node id
  target: string;       // node id
  label?: string;       // short caption on the edge
  description?: string; // shown when the edge is clicked
  rel?: string;         // canonical relationship id (see relationships.ts)
}
```

These are the fields you'll usually touch; `schema.ts` has the full interface
(including a `hub` flag for convergence nodes). A loop-back edge, one pointing to an
earlier step, is auto-unrolled into a fresh `#2`/`#3` instance, so arrows always read
left to right.

## Add a technique

Each chain file exports two array literals: `…Nodes` and `…Edges` (e.g.
`credentialAccessNodes` / `credentialAccessEdges`). You add to those arrays:

1. Pick the topical file in `src/data/chains/` (e.g. `credential-access.ts`), or make a new one.
2. Add a node object to that file's exported `…Nodes` array.
3. Add edges to the same file's `…Edges` array: at least one **incoming** edge (so it's reachable from `start`), and, unless it's a `persistence` node, at least one **outgoing** edge (no dead-ends, enforced by a test).

```ts
// src/data/chains/credential-access.ts

export const credentialAccessNodes: TechniqueNodeDef[] = [
  // …existing nodes…
  {
    id: 'my-technique',
    label: 'My Technique',
    phase: 'credential-access',
    summary: 'One line describing it.',
    tools: [{ name: 'SomeTool', url: 'https://github.com/...' }],
    commands: [{ label: 'Run it', code: 'sometool --do-thing', lang: 'bash' }],
    mitre: mitre('T1555'), // `mitre` is a shared helper: import { mitre } from '../lib'
    references: [{ label: 'Original research', url: 'https://...' }],
    requires: ['Local admin on a host'],
  },
];

export const credentialAccessEdges: AttackEdge[] = [
  // …existing edges…
  { source: 'local-admin-host', target: 'my-technique' }, // incoming, reachable
  { source: 'my-technique', target: 'valid-domain-creds', label: 'found creds' }, // outgoing
];
```

If your edge's meaning already exists (e.g. "code execution", "credential reuse"), reuse a canonical relationship instead of re-inventing a label:

```ts
{ source: 'x', target: 'y', rel: 'host-exec' }   // see src/data/relationships.ts
```

## Add a category (folder)

A `category` node groups techniques. Clicking its body selects it (opens a panel with
its high-level overview); the chevron expands/collapses. Give every category a
`summary` + `description` so the panel explains what the folder groups.

```ts
{ id: 'ad-cat-mytopic', label: 'My Topic', phase: 'credential-access', kind: 'category',
  summary: 'One-line what-it-is.', description: 'High-level overview of the attacks this folder groups.' },
// then: { source: 'ad-cat-mytopic', target: 'my-technique' }, ...
```

## Add a whole new map (web, cloud, network, …)

1. Create `src/data/chains/<domain>-*.ts` with your nodes/edges.
2. Create `src/data/maps/<domain>.ts` exporting a `MapDefinition` (`id`, `name`, `phases`, `nodes`, `edges`).
3. Register it in `src/data/index.ts`: add it to the `MAPS` array. It now appears in the header selector, with **no engine changes.**

## Conventions

- **Public sources only.** Every `references[].url` must be a public https link, never a private/internal note. Enforced by the content-lint test.
- **Converge, don't shortcut.** A node whose outcome is "valid credentials" should lead to a credentials hub (`valid-domain-creds` / `valid-local-creds`), not jump straight to one downstream action.
- **No rank-skipping edges.** Avoid `A → C` when `A → B → C` already exists; the edge would render over node B.
- **No dead-ends.** Every non-`persistence` node needs an outgoing edge.

## Dependencies

HackGraph runs on a small runtime stack (React, React Flow, dagre, framer-motion).
Two rules keep it lean:

- **Content needs zero dependencies.** Adding techniques, categories, or maps is pure
  data under `src/data/`: no packages, no build changes.
- **New runtime dependencies are rare. Raise one in an issue first.** Prefer the
  platform and what's already here. Everything stays **fully client-side**: no backend,
  no network calls at runtime (only the static, public reference links a node points to).

## Before you open a PR

```bash
npm test            # content-lint: unique ids, valid phases, MITRE format, https refs
npm run check:refs  # every reference/tool URL is reachable
npm run build       # type-check + production build
```

By contributing, you agree that your contributions are licensed under the project's
[MIT License](LICENSE).
