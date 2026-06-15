import type { MapDefinition, TechniqueNodeDef, AttackEdge } from '../schema';
import { peTechniqueNodes, peTechniqueEdges } from '../chains/pe-techniques';

const r = String.raw;

/** Entry, enumeration hub, and goal — the fixed anchors every PE branch hangs off. */
const anchorNodes: TechniqueNodeDef[] = [
  {
    id: 'pe-start',
    label: 'Local Foothold',
    phase: 'enumeration',
    kind: 'start',
    summary: 'A low-privilege shell on a Windows host.',
    description:
      'You have command execution as a low-privilege (or service) account on a domain-joined or standalone Windows machine. The goal is to escalate to NT AUTHORITY\\SYSTEM (or local admin). Start by enumerating the host for misconfigurations.',
    difficulty: 'easy',
  },
  {
    id: 'pe-enum',
    label: 'Enumerate the Host',
    phase: 'enumeration',
    summary: 'Triage with winPEAS / Seatbelt / PrivescCheck.',
    description:
      'Run an automated enumeration tool to surface every escalation vector at once — vulnerable services, weak ACLs, token privileges, autoruns, stored credentials, and missing patches. Triage its output, then branch to the cheapest/quietest win.',
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
 * Local privesc is triage-and-pick, not a campaign, so the map is staged as one
 * left→right funnel rather than a phased AD-style path:
 *
 *   Enumerate -> What You Found -> Primitive -> SYSTEM -> Loot & Move
 *
 * "What You Found" branches the way enumeration actually reports (dangerous
 * privileges, group membership, service misconfigs, stored creds, missing patches,
 * medium-integrity admin); those findings converge on a few shared PRIMITIVES
 * (`pe-prim-*`, see pe-techniques) which are the only nodes that reach SYSTEM.
 * Colouring by stage (not by vector type) is what gives it a single readable spine.
 */
export const windowsPeMap: MapDefinition = {
  id: 'win-pe',
  name: 'Windows Priv Esc',
  tagline: 'From a low-priv shell to NT AUTHORITY\\SYSTEM',
  rootId: 'pe-start',
  // Phases are escalation STAGES, not vector types — so the map reads as one
  // left→right spine (enumerate → what you found → the primitive it grants →
  // SYSTEM → loot & move) instead of a rainbow of parallel silos. Red is reserved
  // for the lit-path accent.
  phases: [
    { id: 'enumeration', label: 'Enumerate', color: '#3f9ae8' },
    { id: 'finding', label: 'What You Found', color: '#e0b12f' },
    { id: 'primitive', label: 'Primitive', color: '#ef8630' },
    { id: 'system', label: 'SYSTEM', color: '#5f6ce6' },
    { id: 'loot', label: 'Loot & Move', color: '#cf4fc4' },
  ],
  nodes: [...anchorNodes, ...peTechniqueNodes],
  edges: [...anchorEdges, ...peTechniqueEdges],
};
