import { linuxOnrampNodes, linuxOnrampEdges } from '../chains/linux-onramp.js';
import { linuxPrivescNodes, linuxPrivescEdges } from '../chains/linux-privesc.js';

/** Fixed anchors: the local-foothold root and the root goal. The on-ramp
 *  (linux-onramp) turns the foothold into a usable, enumerated shell and feeds
 *  the triage hub; the seven abuse lanes (linux-privesc) all converge on lin-root. */
/** @type {import('../schema.js').TechniqueNodeDef[]} */
const anchorNodes = [
  {
    "id": "lin-start",
    "label": "Get a Foothold",
    "phase": "triage",
    "kind": "start",
    "summary": "Understand Linux process credentials and permissions.",
    "description": "Linux process credentials include real, effective, saved, and filesystem user and group IDs, plus supplementary groups. Linux also divides traditional superuser privileges into capabilities that are tracked per thread. Account names alone do not describe all of this information. These concepts provide the foundation for reading the permission and isolation topics in this map.",
    "requires": [
      "A low-privilege shell on a Linux host"
    ],
    "references": [
      {
        "label": "Linux man-pages, credentials(7)",
        "url": "https://man7.org/linux/man-pages/man7/credentials.7.html",
        "kind": "primary",
        "section": "User and group identifiers"
      },
      {
        "label": "Linux man-pages, capabilities(7)",
        "url": "https://man7.org/linux/man-pages/man7/capabilities.7.html",
        "kind": "primary",
        "section": "DESCRIPTION: traditional privilege model and per-thread capabilities"
      },
      {
        "label": "Internal All The Things, Linux - Privilege Escalation",
        "url": "https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected identity and authorization claims in this overview. Excludes commands, tools, prerequisites, connection outcomes, route viability, and ATT&CK mappings. Navigation labels are project conventions.",
      "reviewedContent": {
        "description": "Linux process credentials include real, effective, saved, and filesystem user and group IDs, plus supplementary groups. Linux also divides traditional superuser privileges into capabilities that are tracked per thread. Account names alone do not describe all of this information. These concepts provide the foundation for reading the permission and isolation topics in this map.",
        "id": "lin-start",
        "kind": "start",
        "label": "Get a Foothold",
        "phase": "triage",
        "references": [
          {
            "kind": "primary",
            "label": "Linux man-pages, credentials(7)",
            "section": "User and group identifiers",
            "url": "https://man7.org/linux/man-pages/man7/credentials.7.html"
          },
          {
            "kind": "primary",
            "label": "Linux man-pages, capabilities(7)",
            "section": "DESCRIPTION: traditional privilege model and per-thread capabilities",
            "url": "https://man7.org/linux/man-pages/man7/capabilities.7.html"
          },
          {
            "label": "Internal All The Things, Linux - Privilege Escalation",
            "url": "https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/"
          }
        ],
        "requires": [
          "A low-privilege shell on a Linux host"
        ],
        "summary": "Understand Linux process credentials and permissions."
      },
      "claims": [
        {
          "text": "Linux process credentials include real, effective, saved, and filesystem user/group IDs and supplementary groups.",
          "section": "Linux man-pages, credentials(7) — User and group identifiers",
          "sources": [
            "https://man7.org/linux/man-pages/man7/credentials.7.html"
          ]
        },
        {
          "text": "Linux divides traditional superuser privileges into independently enabled capabilities, which are a per-thread attribute.",
          "section": "Linux man-pages, capabilities(7) — DESCRIPTION: traditional privilege model and per-thread capabilities",
          "sources": [
            "https://man7.org/linux/man-pages/man7/capabilities.7.html"
          ]
        }
      ]
    }
  },
  {
    "id": "lin-root",
    "label": "root (EUID 0)",
    "phase": "root",
    "kind": "goal",
    "summary": "Understand effective UID 0 within the Linux security model.",
    "description": "The traditional superuser identity uses effective UID 0. Linux divides the associated privileges into capabilities, and user namespaces can give a process different IDs inside and outside a namespace. A process can have UID 0 inside a user namespace while remaining unprivileged outside it. UID 0 therefore needs its namespace and capability context; it is not a universal promise of access to every host resource or secret.",
    "requires": [
      "Any one successful local escalation vector"
    ],
    "commands": [
      {
        "label": "Confirm root and grab a persistent shell",
        "code": "id     # uid=0(root)\n# if you dropped a setuid bash: /tmp/rootbash -p",
        "lang": "bash"
      }
    ],
    "references": [
      {
        "label": "Linux man-pages, capabilities(7)",
        "url": "https://man7.org/linux/man-pages/man7/capabilities.7.html",
        "kind": "primary",
        "section": "DESCRIPTION: traditional privilege model and per-thread capabilities"
      },
      {
        "label": "Linux man-pages, user_namespaces(7)",
        "url": "https://man7.org/linux/man-pages/man7/user_namespaces.7.html",
        "kind": "primary",
        "section": "DESCRIPTION: identities inside and outside a user namespace"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected identity and authorization claims in this overview. Excludes commands, tools, prerequisites, connection outcomes, route viability, and ATT&CK mappings. Navigation labels are project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "id     # uid=0(root)\n# if you dropped a setuid bash: /tmp/rootbash -p",
            "label": "Confirm root and grab a persistent shell",
            "lang": "bash"
          }
        ],
        "description": "The traditional superuser identity uses effective UID 0. Linux divides the associated privileges into capabilities, and user namespaces can give a process different IDs inside and outside a namespace. A process can have UID 0 inside a user namespace while remaining unprivileged outside it. UID 0 therefore needs its namespace and capability context; it is not a universal promise of access to every host resource or secret.",
        "id": "lin-root",
        "kind": "goal",
        "label": "root (EUID 0)",
        "phase": "root",
        "references": [
          {
            "kind": "primary",
            "label": "Linux man-pages, capabilities(7)",
            "section": "DESCRIPTION: traditional privilege model and per-thread capabilities",
            "url": "https://man7.org/linux/man-pages/man7/capabilities.7.html"
          },
          {
            "kind": "primary",
            "label": "Linux man-pages, user_namespaces(7)",
            "section": "DESCRIPTION: identities inside and outside a user namespace",
            "url": "https://man7.org/linux/man-pages/man7/user_namespaces.7.html"
          }
        ],
        "requires": [
          "Any one successful local escalation vector"
        ],
        "summary": "Understand effective UID 0 within the Linux security model."
      },
      "claims": [
        {
          "text": "The traditional superuser model uses effective UID 0; Linux divides superuser privileges into capabilities.",
          "section": "Linux man-pages, capabilities(7) — DESCRIPTION: traditional privilege model and per-thread capabilities",
          "sources": [
            "https://man7.org/linux/man-pages/man7/capabilities.7.html"
          ]
        },
        {
          "text": "A process can have UID 0 inside a user namespace while having an unprivileged ID and no corresponding privilege outside that namespace.",
          "section": "Linux man-pages, user_namespaces(7) — DESCRIPTION: identities inside and outside a user namespace",
          "sources": [
            "https://man7.org/linux/man-pages/man7/user_namespaces.7.html"
          ]
        }
      ]
    }
  },
];

/** @type {import('../schema.js').AttackEdge[]} */
const anchorEdges = [];

/**
 * Linux local privilege escalation: an unprivileged shell -> root.
 *
 *   Local Foothold (ROOT)                                       [on-ramp: linux-onramp]
 *     ├─ Stabilize the Shell   -> PTY, escape restricted shell ┐
 *     └─ Enumerate & Triage    -> the sweep that picks a lane  ┘ -> the triage hub
 *   Enumerate & Triage (HUB)                                    [core: linux-privesc]
 *     ├─ Sudo Abuse                     -> rule / env / CVE          ┐
 *     ├─ SUID/SGID & Capabilities       -> binary / lib / caps       │
 *     ├─ Scheduled Jobs & Services      -> cron / systemd / logrotate │
 *     ├─ Credentials & Secrets          -> secrets / keys / reuse     ├─ -> root
 *     ├─ Writable Files & Shares        -> passwd / shadow / NFS      │
 *     ├─ Privileged Groups & Containers -> docker / lxd / escape      │
 *     └─ Kernel & Library Exploits      -> kernel / glibc / polkit   ┘
 *
 * Colour encodes the abuse lane (the primitive class), so a reader can trace one
 * technique family from the triage hub to root, which is where the map ends. The
 * on-ramp is deliberately slim; post-root persistence and lateral movement belong to
 * the AD / network maps, not here.
 */
/** @type {import('../schema.js').MapDefinition} */
export const linuxPeMap = {
  id: 'linux-pe',
  name: 'Linux Priv Esc',
  tagline: 'From an unprivileged shell to root',
  rootId: 'lin-start',
  phases: [
    // Equal OKLCH lightness/chroma (0.70 / 0.13), hue-only — see ad.ts. creds/kernel/root
    // (the violet cluster) nudged apart to ≥26° after equal lightness removed the
    // brightness that separated them.
    { id: 'triage', label: 'Triage', color: 'oklch(0.70 0.13 248)' },
    { id: 'sudo', label: 'Sudo Abuse', color: 'oklch(0.70 0.13 55)' },
    { id: 'suid', label: 'SUID / Capabilities', color: 'oklch(0.70 0.13 87)' },
    { id: 'jobs', label: 'Jobs & Services', color: 'oklch(0.70 0.13 183)' },
    { id: 'creds', label: 'Credentials', color: 'oklch(0.70 0.13 327)' },
    { id: 'files', label: 'Files & Shares', color: 'oklch(0.70 0.13 355)' },
    { id: 'containers', label: 'Groups & Containers', color: 'oklch(0.70 0.13 139)' },
    { id: 'kernel', label: 'Kernel & Libraries', color: 'oklch(0.70 0.13 300)' },
    { id: 'root', label: 'root', color: 'oklch(0.70 0.13 274)' },
  ],
  nodes: [...anchorNodes, ...linuxOnrampNodes, ...linuxPrivescNodes],
  edges: [...anchorEdges, ...linuxOnrampEdges, ...linuxPrivescEdges],
};
