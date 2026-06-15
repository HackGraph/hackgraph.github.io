<div align="center">

# HackGraph

Interactive attack-path maps for offensive security.

[![Live](https://img.shields.io/badge/live-hackgraph.github.io-f04450)](https://hackgraph.github.io/)
[![Deploy](https://github.com/HackGraph/hackgraph.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/HackGraph/hackgraph.github.io/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-Apache_2.0-blue)](LICENSE)

**[Try it live: hackgraph.github.io](https://hackgraph.github.io/)**

</div>

HackGraph is an interactive web app for exploring offensive-security attack paths. You
start at a foothold and expand it one technique at a time, moving from left to right
through the attack phases until you reach the goal. Each step is a small cheat-sheet with
a description, tools, copy-paste commands, a MITRE ATT&CK id and detection notes. It works
like the Orange Cyberdefense attack mindmaps, but you can click through it like BloodHound.
HackGraph is entirely client-side and runs in your browser.

## Features

- Click a node's +N badge to reveal the next techniques and grow the graph.
- Every node has a description, tools, copy-paste commands, a MITRE ATT&CK id, prerequisites and OPSEC notes.
- Techniques converge on shared "you now have X" nodes, so a map reads as a path rather than a flat list of tricks.
- Switch between maps from the header. Active Directory and Windows privilege escalation are included today.
- The URL captures what you've expanded and selected, so you can share an exact view.
- Search to jump to any technique by name.
- No backend, no accounts and no tracking. Everything runs client-side.

## Maps

- **Active Directory.** From zero access to Domain Admin and persistence: recon, roasting, AD CS (ESC1 to ESC16), DACL and delegation abuse, Kerberos ticket attacks, lateral movement and the major CVEs.
- **Windows Privilege Escalation.** From a low-privilege shell to NT AUTHORITY\SYSTEM: kernel and driver exploits, service and registry misconfigurations, token privileges (the Potato family), privileged groups, credential theft, UAC bypasses and local lateral movement.

## Run locally

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173. Use `npm run build` to type-check and build to
`dist/`, `npm run preview` to serve that build, and `npm test` to run the tests.

## Contributing

The content is just data. Adding a technique, or a whole new domain like web or cloud,
means editing files in `src/data/` and never the engine. New maps show up in the header
automatically. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

Built with React Flow, dagre, framer-motion and Tailwind CSS.

## License

Released under the [Apache License 2.0](LICENSE). Copyright 2026 HackGraph.

> For authorized security testing, CTFs and education.
</content>
