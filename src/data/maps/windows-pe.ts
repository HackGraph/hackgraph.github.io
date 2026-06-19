import type { MapDefinition, TechniqueNodeDef, AttackEdge } from '../schema';
import { peTechniqueNodes, peTechniqueEdges } from '../chains/pe-techniques';

const r = String.raw;

/** Entry/triage node and goal: the fixed anchors every PE branch hangs off. */
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
      'You hold SYSTEM (or local administrator) on the host, with full control of the machine, its services, and any credentials in memory or on disk. From here, dump credentials and pivot. On a domain-joined host this feeds straight back into the Active Directory map, but it is not always AD: a dumped local-admin hash reused across a workgroup, or a recovered service-account credential, moves you host-to-host with no domain involved (see the Local Lateral Movement branch).',
    requires: ['Any one successful local escalation vector'],
  },
];

// pe-start branches straight into the three context lanes (edges live in pe-techniques).
const anchorEdges: AttackEdge[] = [];

/**
 * Windows local privilege-escalation map: low-priv shell -> SYSTEM.
 *
 * Shaped as the operator's triage tree, not a technique catalogue. The foothold node
 * is also the triage ("who am I?"), and that gate forks the whole map:
 *
 *   Local Foothold (whoami, whoami /priv /groups)
 *     ├─ Privileged Users   -> a token privilege or group you hold  -> SYSTEM
 *     ├─ Admin Users        -> UAC bypass, then Admin -> SYSTEM      -> SYSTEM
 *     ├─ Unprivileged Users -> enumerate for a weakness:
 *     │      stored creds / service / DLL+PATH / tasks / app+service / CVE -> SYSTEM
 *     └─ Service Account    -> hold SeImpersonate (or recover it) -> Potato -> SYSTEM
 *
 * Colour encodes the lane (the account context) so you can trace your own route to
 * SYSTEM, which is the goal: the map ends there. Post-exploitation (credential
 * dumping, lateral movement) belongs to the Active Directory map. Red stays reserved
 * for the lit-path accent.
 */
export const windowsPeMap: MapDefinition = {
  id: 'win-pe',
  name: 'Windows Priv Esc',
  tagline: 'From a low-priv shell to NT AUTHORITY\\SYSTEM',
  rootId: 'pe-start',
  // Phases follow the operator's triage tree, not technique categories. Colour encodes
  // the account context, what you ARE on the box (privileged / admin / unprivileged),
  // so you can trace your lane to SYSTEM. Red stays reserved for the lit-path accent.
  phases: [
    { id: 'triage', label: 'Triage', color: '#3f9ae8' },
    { id: 'hold', label: 'Privileged Users', color: '#ef8630' },
    { id: 'admin', label: 'Admin Users', color: '#b04fda' },
    { id: 'finding', label: 'Unprivileged Users', color: '#e0b12f' },
    { id: 'svcacct', label: 'Service Account', color: '#1f9e8f' },
    { id: 'system', label: 'SYSTEM', color: '#5f6ce6' },
  ],
  nodes: [...anchorNodes, ...peTechniqueNodes],
  edges: [...anchorEdges, ...peTechniqueEdges],
};
