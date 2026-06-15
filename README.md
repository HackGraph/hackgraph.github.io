<div align="center">

# HackGraph

### Walk the attack path, one click at a time.

HackGraph is a fully client-side explorer for offensive-security attack chains.
Start at a foothold and expand it technique by technique — left→right across the
phases — until you reach the goal. Like the Orange Cyberdefense mindmaps, but
navigable like BloodHound, in the spirit of [CyberChef](https://gchq.github.io/CyberChef/)
and [revshells.com](https://www.revshells.com/).

[![Live](https://img.shields.io/badge/live-hackgraph.github.io-f04450)](https://hackgraph.github.io/)
[![Deploy](https://github.com/HackGraph/hackgraph.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/HackGraph/hackgraph.github.io/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-Apache_2.0-blue)](LICENSE)

**[▶ Try it live → hackgraph.github.io](https://hackgraph.github.io/)**

</div>

## Features

- **Click to expand.** Every node carries a **+N** badge — click it to reveal the next
  techniques and glide deeper into the graph. The camera follows the frontier and the
  path you've walked stays lit.
- **Every node is a cheat-sheet.** Description, tools, copy-paste commands, MITRE ATT&CK
  id, prerequisites, and OPSEC / detection notes — one click away.
- **Real attack paths, not flat lists.** Techniques converge on shared "you now hold X"
  hubs, so the graph reads like an actual attack instead of a folder of tricks.
- **Switch domains.** Choose a map from the header — Active Directory or Windows
  privilege escalation today, with more on the way.
- **Share any path.** The URL deep-links to exactly what you've expanded and selected —
  drop it in a report or a teammate's chat and they land on the same view.
- **Search anything.** Jump straight to any technique by name.
- **Yours alone.** No backend, no accounts, no telemetry. It all runs in your browser —
  your clicks never leave the page.

## Maps

- **Active Directory** — zero access → Domain Admin & persistence: recon, roasting,
  AD CS (ESC1–16), DACL & delegation abuse, Kerberos ticket attacks, lateral movement,
  and the key CVEs.
- **Windows Privilege Escalation** — a low-priv shell → `NT AUTHORITY\SYSTEM`: kernel &
  driver exploits, service / registry misconfigs, token privileges (the Potato family),
  privileged groups, credential theft, UAC bypasses, and local lateral movement.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm test` runs the content + graph-logic tests · `npm run build` type-checks and bundles
to `dist/` · `npm run preview` serves the production build.

## Contributing

The content is just data: adding a technique — or a whole new domain like web, cloud, or
network — means editing files under `src/data/`, never the engine. New maps appear in the
header automatically. See **[CONTRIBUTING.md](CONTRIBUTING.md)** to get started.

Built with [React Flow](https://reactflow.dev/), [dagre](https://github.com/dagrejs/dagre),
framer-motion, and Tailwind CSS.

## License

[Apache License 2.0](LICENSE) · Copyright 2026 HackGraph.

> For authorized security testing, CTFs, and education.
</content>
</invoke>
