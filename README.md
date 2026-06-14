# HackGraph

An interactive, fully client-side **attack-path explorer**. Start at a root node and
click the **"+N" badge** on a node to smoothly expand into sub-techniques, navigating
left→right through the attack phases until you reach the goal — think the Orange
Cyberdefense AD mindmap, but navigable like BloodHound, in the spirit of CyberChef /
revshells.com.

Each node is a mini-cheatsheet: description, tools, copy-able commands, MITRE ATT&CK id,
prerequisites, and OPSEC notes. The header selector switches between maps:

- **Active Directory** — zero access → Domain Admin & persistence (foothold, roasting,
  ADCS, DACL/delegation abuse, Kerberos ticket abuse, lateral movement, key CVEs).
- **Windows Priv Esc** — a low-priv shell → `NT AUTHORITY\SYSTEM` (kernel, service &
  registry misconfigs, token privileges / Potato, privileged groups, credential dumping,
  UAC bypass).

> Live: https://hackgraph.github.io/

## Stack

- **React + TypeScript + Vite**
- **React Flow** (`@xyflow/react`) — the canvas, with custom nodes/edges
- **dagre** (`@dagrejs/dagre`) — left→right hierarchical auto-layout
- **framer-motion** — node enter/exit + edge draw-in animations
- **Tailwind CSS v4** — dark theme, phase-coded colors

No backend; the whole graph lives in static JSON/TS and renders client-side.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # vitest — graph logic (visibility DAG, layout)
npm run build    # tsc + vite build -> dist/
npm run preview  # serve the production build locally
```

## How it works

`expandedIds: Set<string>` + a static `GraphModel` are the single source of truth.
Everything rendered is derived from them:

- `src/graph/visibility.ts` — a forward BFS from the root through expanded nodes yields
  the visible subgraph. Handles multi-parent nodes, convergence, collapse, and cycles.
- `src/graph/layout.ts` — dagre computes left→right positions for the visible subgraph.
- `src/graph/useGraphView.ts` — the only writer of React Flow nodes/edges: diffs the
  layout, reuses node identity so survivors **glide** (CSS `transition: transform`), and
  mints new nodes that **fade/scale in** (framer-motion). The camera gently follows the
  newly-revealed frontier.

## Add / edit content

Content is data-driven. Each map (`src/data/maps/*.ts`) declares its own `phases`
(id/label/color) and is assembled from chain files in `src/data/chains/*.ts` (each
exports `nodes` + `edges`). The node schema lives in `src/data/schema.ts`.

To add techniques, edit the relevant chain file. To add an entirely new domain (web,
cloud, network), create a sibling `MapDefinition` with its own phases and register it in
`src/data/index.ts` — it appears in the header selector automatically; the engine is
map-agnostic.

## Deploy

`hackgraph.github.io` is an org Pages site served at the root (`base: '/'`). The
workflow in `.github/workflows/deploy.yml` builds and publishes `dist/` on every push to
`main` via GitHub Actions. Set the repo's **Pages → Source** to **GitHub Actions** once.

## License

Licensed under the [Apache License 2.0](LICENSE). Copyright 2026 HackGraph.

---

For authorized security testing, CTFs, and education.
