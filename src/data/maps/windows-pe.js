import { peTechniqueNodes, peTechniqueEdges } from '../chains/pe-techniques.js';
import { winFootholdNodes, winFootholdEdges } from '../chains/win-foothold.js';

/** Fixed anchors: the local-foothold milestone and the goal. The map's root is the
 *  hand-curated front-end's "Get a Foothold" node (win-foothold-start, in win-foothold),
 *  which fans into the Credentialed Logon and Execution & Evasion lanes. */
/** @type {import('../schema.js').TechniqueNodeDef[]} */
const anchorNodes = [
  {
    "id": "pe-start",
    "label": "Local Foothold",
    "phase": "triage",
    "kind": "start",
    "summary": "Understand the account and token behind a Windows process.",
    "description": "A Windows process or thread has a security context represented by an access token. The token includes account identity, group information, and privileges. A service runs with the token of its configured service account. Having a command session therefore needs to be understood through that account context; service identities and interactive user accounts should not be treated as a single uniform permission set.",
    "tools": [
      {
        "name": "winPEAS",
        "url": "https://github.com/peass-ng/PEASS-ng"
      },
      {
        "name": "Seatbelt",
        "url": "https://github.com/GhostPack/Seatbelt"
      },
      {
        "name": "PrivescCheck",
        "url": "https://github.com/itm4n/PrivescCheck"
      }
    ],
    "commands": [
      {
        "label": "Check your own privileges/groups",
        "code": "whoami /priv & whoami /groups",
        "lang": "cmd"
      },
      {
        "label": "winPEAS (fast checks)",
        "code": "winpeasany.exe quiet fast",
        "lang": "cmd"
      },
      {
        "label": "PrivescCheck (PowerShell)",
        "code": "powershell -ep bypass -c \". .\\PrivescCheck.ps1; Invoke-PrivescCheck\"",
        "lang": "powershell"
      }
    ],
    "requires": [
      "A low-privilege shell on the host"
    ],
    "references": [
      {
        "label": "Microsoft, Access Tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Service User Accounts",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Windows Local Privilege Escalation",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
      }
    ],
    "opsec": "winPEAS/Seatbelt are noisy on disk and signatured by EDR. Consider running in-memory or using the built-in whoami/accesschk checks on monitored hosts.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected identity and authorization claims in this overview. Excludes commands, tools, prerequisites, connection outcomes, route viability, and ATT&CK mappings. Navigation labels are project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "whoami /priv & whoami /groups",
            "label": "Check your own privileges/groups",
            "lang": "cmd"
          },
          {
            "code": "winpeasany.exe quiet fast",
            "label": "winPEAS (fast checks)",
            "lang": "cmd"
          },
          {
            "code": "powershell -ep bypass -c \". .\\PrivescCheck.ps1; Invoke-PrivescCheck\"",
            "label": "PrivescCheck (PowerShell)",
            "lang": "powershell"
          }
        ],
        "description": "A Windows process or thread has a security context represented by an access token. The token includes account identity, group information, and privileges. A service runs with the token of its configured service account. Having a command session therefore needs to be understood through that account context; service identities and interactive user accounts should not be treated as a single uniform permission set.",
        "id": "pe-start",
        "kind": "start",
        "label": "Local Foothold",
        "opsec": "winPEAS/Seatbelt are noisy on disk and signatured by EDR. Consider running in-memory or using the built-in whoami/accesschk checks on monitored hosts.",
        "phase": "triage",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Access Tokens",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Service User Accounts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          },
          {
            "label": "HackTricks, Windows Local Privilege Escalation",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
          }
        ],
        "requires": [
          "A low-privilege shell on the host"
        ],
        "summary": "Understand the account and token behind a Windows process.",
        "tools": [
          {
            "name": "winPEAS",
            "url": "https://github.com/peass-ng/PEASS-ng"
          },
          {
            "name": "Seatbelt",
            "url": "https://github.com/GhostPack/Seatbelt"
          },
          {
            "name": "PrivescCheck",
            "url": "https://github.com/itm4n/PrivescCheck"
          }
        ]
      },
      "claims": [
        {
          "text": "Windows access tokens describe process or thread security context, including account identity, groups, and privileges.",
          "section": "Microsoft, Access Tokens — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        },
        {
          "text": "A Windows service executes in the security context of its configured account and receives an access token for that account.",
          "section": "Microsoft, Service User Accounts — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        }
      ]
    }
  },
  {
    "id": "nt-system",
    "label": "NT AUTHORITY\\SYSTEM",
    "phase": "system",
    "kind": "goal",
    "summary": "Understand LocalSystem as a distinct Windows account identity.",
    "description": "LocalSystem is a predefined account used by the service control manager. It has extensive privileges on the local computer and acts as the computer on the network. It is not associated with a logged-on user account. A LocalSystem process and an interactive administrator process therefore have distinct account identities; this label should not be used as a synonym for every kind of local administrative access.",
    "requires": [
      "Any one successful local escalation vector"
    ],
    "references": [
      {
        "label": "Microsoft, LocalSystem Account",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account",
        "section": "Introduction",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected identity and authorization claims in this overview. Excludes commands, tools, prerequisites, connection outcomes, route viability, and ATT&CK mappings. Navigation labels are project conventions.",
      "reviewedContent": {
        "description": "LocalSystem is a predefined account used by the service control manager. It has extensive privileges on the local computer and acts as the computer on the network. It is not associated with a logged-on user account. A LocalSystem process and an interactive administrator process therefore have distinct account identities; this label should not be used as a synonym for every kind of local administrative access.",
        "id": "nt-system",
        "kind": "goal",
        "label": "NT AUTHORITY\\SYSTEM",
        "phase": "system",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, LocalSystem Account",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          }
        ],
        "requires": [
          "Any one successful local escalation vector"
        ],
        "summary": "Understand LocalSystem as a distinct Windows account identity."
      },
      "claims": [
        {
          "text": "LocalSystem is a predefined service-control-manager account with extensive local privileges and acts as the computer on the network.",
          "section": "Microsoft, LocalSystem Account — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          ]
        },
        {
          "text": "LocalSystem is not associated with a logged-on user account.",
          "section": "Microsoft, LocalSystem Account — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          ]
        }
      ]
    }
  },
];

// The map root is the front-end's "Get a Foothold" node; its lanes and the per-technique
// convergence onto pe-start live in win-foothold, and pe-start then branches into the
// account-context lanes (those edges live in pe-techniques), so no extra anchor edges here.
/** @type {import('../schema.js').AttackEdge[]} */
const anchorEdges = [];

/**
 * Windows local privilege escalation: a foothold -> SYSTEM.
 *
 * Two zones joined at the Local Foothold:
 *
 *   Get a Foothold (ROOT)                                  [slim on-ramp: win-foothold]
 *     ├─ Credentialed Logon  -> by auth method (password/key, NTLM hash, Kerberos) ┐ each
 *     └─ Execution & Evasion -> code-exec -> stable shell; AMSI/AV; AppLocker/CLM  ┘ -> pe-start
 *   Local Foothold (whoami, whoami /priv /groups)          [priv-esc core: pe-techniques]
 *     ├─ Privileged Users   -> a token privilege or group you hold  -> SYSTEM
 *     ├─ Admin Users        -> UAC bypass -> high-integrity admin -> SYSTEM
 *     ├─ Unprivileged Users -> enumerate for a weakness:
 *     │      stored creds / service / DLL+PATH / tasks / app+service / CVE -> SYSTEM
 *     └─ Service Account    -> hold SeImpersonate (or recover it) -> Potato -> SYSTEM
 *
 * The on-ramp is deliberately slim: the FULL credential / lateral-movement detail lives in
 * the Active Directory map, so this front-end only gets you to a foothold without
 * re-teaching it. The priv-esc core is the operator's triage tree: its colour encodes the
 * account context, what you ARE on the host, so you can trace your lane to SYSTEM, which is
 * the goal and where the map ends. Post-exploitation (credential dumping, domain lateral
 * movement) belongs to the AD map. Red stays reserved for the lit-path accent.
 */
/** @type {import('../schema.js').MapDefinition} */
export const windowsPeMap = {
  id: 'win-pe',
  name: 'Windows Priv Esc',
  tagline: 'From a foothold to NT AUTHORITY\\SYSTEM',
  rootId: 'win-foothold-start',
  // Two zones, two colour stories. The slim FRONT-END (access / execution) is the way in,
  // coloured as a cool getting-in gradient. The PRIV-ESC core keeps its triage palette:
  // colour there encodes the account context, what you ARE on the host (privileged / admin
  // / unprivileged), so you can trace your lane to SYSTEM. Red stays for the lit-path accent.
  phases: [
    // Equal OKLCH lightness/chroma (0.70 / 0.13), hue-only — see ad.ts. The three
    // account-context violets (system/access/admin) were nudged apart to ≥26° once
    // equal lightness removed the brightness that used to separate them.
    { id: 'access', label: 'Initial Access', color: 'oklch(0.70 0.13 300)' },
    { id: 'execution', label: 'Execution & Evasion', color: 'oklch(0.70 0.13 139)' },
    { id: 'triage', label: 'Triage', color: 'oklch(0.70 0.13 248)' },
    { id: 'hold', label: 'Privileged Users', color: 'oklch(0.70 0.13 55)' },
    { id: 'admin', label: 'Admin Users', color: 'oklch(0.70 0.13 326)' },
    { id: 'finding', label: 'Unprivileged Users', color: 'oklch(0.70 0.13 87)' },
    { id: 'svcacct', label: 'Service Account', color: 'oklch(0.70 0.13 183)' },
    { id: 'system', label: 'SYSTEM', color: 'oklch(0.70 0.13 274)' },
  ],
  nodes: [...anchorNodes, ...winFootholdNodes, ...peTechniqueNodes],
  edges: [...anchorEdges, ...winFootholdEdges, ...peTechniqueEdges],
};
