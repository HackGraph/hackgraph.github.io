import type { MapDefinition, TechniqueNodeDef, AttackEdge } from '../schema';
import { peTechniqueNodes, peTechniqueEdges } from '../chains/pe-techniques';

const r = String.raw;

/** Entry, enumeration hub, and goal — the fixed anchors every PE branch hangs off. */
const anchorNodes: TechniqueNodeDef[] = [
  {
    id: 'pe-start',
    label: 'Local Foothold',
    phase: 'triage',
    kind: 'start',
    summary: 'A low-privilege shell on a Windows host.',
    description:
      'You have command execution as a low-privilege (or service) account on a domain-joined or standalone Windows machine. The goal is to escalate to NT AUTHORITY\\SYSTEM (or local admin). Start by enumerating the host for misconfigurations.',
    difficulty: 'easy',
  },
  {
    id: 'pe-enum',
    label: 'Account Triage',
    phase: 'triage',
    summary: 'Identify the account, its privileges, and its groups.',
    description:
      'Establish the security context of the current account before anything else. whoami /priv and whoami /groups determine which path applies: a privileged token or group, an administrator restricted by UAC, or an unprivileged user who must enumerate the host for a misconfiguration.',
    tools: [
      { name: 'winPEAS', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'Seatbelt', url: 'https://github.com/GhostPack/Seatbelt' },
      { name: 'PrivescCheck', url: 'https://github.com/itm4n/PrivescCheck' },
    ],
    commands: [
      { label: 'winPEAS (fast checks)', code: r`winpeasany.exe quiet fast`, lang: 'cmd' },
      { label: 'Check your own privileges/groups', code: r`whoami /priv & whoami /groups`, lang: 'cmd' },
      { label: 'PrivescCheck (PowerShell)', code: r`powershell -ep bypass -c ". .\PrivescCheck.ps1; Invoke-PrivescCheck"`, lang: 'powershell' },
    ],
    requires: ['A low-privilege shell on the host'],
    references: [{ label: 'HackTricks — Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' }],
    opsec: 'winPEAS/Seatbelt are noisy on disk and signatured by EDR — consider running in-memory or using the built-in whoami/accesschk checks on monitored hosts.',
    difficulty: 'easy',
  },
  {
    id: 'nt-system',
    label: 'NT AUTHORITY\\SYSTEM',
    phase: 'system',
    kind: 'goal',
    summary: '👑 Full local SYSTEM privileges.',
    description:
      'You hold SYSTEM (or local administrator) on the host — full control of the machine, its services, and any credentials in memory or on disk. From here, dump credentials and pivot. On a domain-joined host this feeds straight back into the Active Directory map; but it is not always AD — a dumped local-admin hash reused across a workgroup, or a recovered service-account credential, moves you host-to-host with no domain involved (see the Local Lateral Movement branch).',
    requires: ['Any one successful local escalation vector'],
    difficulty: 'medium',
  },
];

const anchorEdges: AttackEdge[] = [{ source: 'pe-start', target: 'pe-enum' }];

/**
 * Windows local privilege-escalation map: low-priv shell -> SYSTEM.
 *
 * Shaped as the operator's triage tree, not a technique catalogue. The first real
 * decision on a box is "who am I?", and that gate forks the whole map:
 *
 *   Triage (whoami /priv /groups)
 *     ├─ a power you already hold  -> abuse it (Potato / SeBackup / a group)  -> SYSTEM
 *     ├─ a filtered admin (medium) -> UAC bypass                              -> SYSTEM
 *     └─ an unprivileged user      -> enumerate, then a priority ladder:
 *            (1) stored creds  (2) hijack a privileged execution  (3) kernel CVE -> SYSTEM
 *
 * The common shortcuts (service account -> Potato, filtered admin -> UAC) are short
 * express lanes; only the unprivileged case fans out, and even then in priority order
 * (cheap+quiet -> loud+risky). Recovered credentials feed a Loot & Loop branch: a
 * non-SYSTEM cred makes you a new principal you re-triage, or moves you host-to-host.
 */
export const windowsPeMap: MapDefinition = {
  id: 'win-pe',
  name: 'Windows Priv Esc',
  tagline: 'From a low-priv shell to NT AUTHORITY\\SYSTEM',
  rootId: 'pe-start',
  // Phases follow the operator's decision tree, not technique categories. The first
  // question on a real box is "who am I?" — colour encodes that context (a power you
  // already hold / a filtered admin / an unprivileged user who must hunt) so you can
  // trace your lane left→right to SYSTEM. Red stays reserved for the lit-path accent.
  phases: [
    { id: 'triage', label: 'Triage', color: '#3f9ae8' },
    { id: 'hold', label: 'Power You Hold', color: '#ef8630' },
    { id: 'admin', label: 'Filtered Admin', color: '#b04fda' },
    { id: 'finding', label: 'Weakness You Find', color: '#e0b12f' },
    { id: 'system', label: 'SYSTEM', color: '#5f6ce6' },
    { id: 'loot', label: 'Loot & Loop', color: '#cf4fc4' },
  ],
  nodes: [...anchorNodes, ...peTechniqueNodes],
  edges: [...anchorEdges, ...peTechniqueEdges],
};
