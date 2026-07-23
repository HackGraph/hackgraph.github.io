import type { MapDefinition, TechniqueNodeDef, AttackEdge } from '../schema';
import { peTechniqueNodes, peTechniqueEdges } from '../chains/pe-techniques';
import { winFootholdNodes, winFootholdEdges } from '../chains/win-foothold';

const r = String.raw;

/** Fixed anchors: the local-foothold milestone and the goal. The map's root is the
 *  hand-curated front-end's "Get a Foothold" node (win-foothold-start, in win-foothold),
 *  which fans into the Credentialed Logon and Execution & Evasion lanes. */
const anchorNodes: TechniqueNodeDef[] = [
  {
    id: 'pe-start',
    label: 'Local Foothold',
    phase: 'triage',
    kind: 'start',
    summary: 'A low-privilege shell. Triage the account first.',
    description:
      'You have command execution as a low-privilege (or service) account on a domain-joined or standalone Windows machine; the goal is NT AUTHORITY\\SYSTEM (or local admin). Before any tooling, establish the security context. whoami names the account, so a service identity (LOCAL/NETWORK SERVICE, an application pool, MSSQL) is its own path; whoami /priv and whoami /groups decide the rest: a privileged token or group, an administrator restricted by UAC, or an unprivileged user who must enumerate the host for a misconfiguration.',
    tools: [
      { name: 'winPEAS', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'Seatbelt', url: 'https://github.com/GhostPack/Seatbelt' },
      { name: 'PrivescCheck', url: 'https://github.com/itm4n/PrivescCheck' },
    ],
    commands: [
      { label: 'Check your own privileges/groups', code: r`whoami /priv & whoami /groups`, lang: 'cmd' },
      { label: 'winPEAS (fast checks)', code: r`winpeasany.exe quiet fast`, lang: 'cmd' },
      { label: 'PrivescCheck (PowerShell)', code: r`powershell -ep bypass -c ". .\PrivescCheck.ps1; Invoke-PrivescCheck"`, lang: 'powershell' },
    ],
    requires: ['A low-privilege shell on the host'],
    references: [{ label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' }],
    opsec: 'winPEAS/Seatbelt are noisy on disk and signatured by EDR. Consider running in-memory or using the built-in whoami/accesschk checks on monitored hosts.',
  },
  {
    id: 'nt-system',
    label: 'NT AUTHORITY\\SYSTEM',
    phase: 'system',
    kind: 'goal',
    summary: '👑 Full local SYSTEM privileges.',
    description:
      'You hold SYSTEM (or local administrator) on the host, with full control of the machine, its services, and any credentials in memory or on disk. From here, dump credentials and pivot. On a domain-joined host the next move is the Active Directory map, but it is not always AD: a dumped local-admin hash reused across a workgroup, or a recovered service-account credential, moves you host-to-host with no domain involved (see the Local Lateral Movement branch).',
    requires: ['Any one successful local escalation vector'],
  },
];

// The map root is the front-end's "Get a Foothold" node; its lanes and the per-technique
// convergence onto pe-start live in win-foothold, and pe-start then branches into the
// account-context lanes (those edges live in pe-techniques), so no extra anchor edges here.
const anchorEdges: AttackEdge[] = [];

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
export const windowsPeMap: MapDefinition = {
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
