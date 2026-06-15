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
      'You hold SYSTEM (or local administrator) on the host — full control of the machine, its services, and any credentials in memory or on disk. From here, dump credentials and pivot: on a domain-joined host this feeds straight back into the Active Directory map.',
    requires: ['Any one successful local escalation vector'],
    difficulty: 'medium',
  },
];

const anchorEdges: AttackEdge[] = [{ source: 'pe-start', target: 'pe-enum' }];

/**
 * Windows local privilege-escalation map: low-priv shell -> SYSTEM. The entry
 * fan-out is by source-category (kernel, services, registry/autorun, token
 * privileges, privileged groups, credentials, UAC), but the techniques then flow
 * THROUGH shared capability/state convergence hubs (`pe-prim-*`, see pe-techniques)
 * — so it reads as an attack DAG with cross-cutting convergence, not a folder tree.
 */
export const windowsPeMap: MapDefinition = {
  id: 'win-pe',
  name: 'Windows Priv Esc',
  tagline: 'From a low-priv shell to NT AUTHORITY\\SYSTEM',
  rootId: 'pe-start',
  // Warm ANALOGOUS palette matching the red accent (no blue/green/teal).
  phases: [
    // High-contrast spectrum (matches the AD map): 9 vivid, evenly-spaced hues so
    // the stages read clearly apart; red stays reserved for the lit-path accent.
    { id: 'enumeration', label: 'Enumeration', color: '#3f9ae8' },
    { id: 'kernel-exploit', label: 'Kernel Exploits', color: '#19b0b0' },
    { id: 'service-abuse', label: 'Service Abuse', color: '#46bd55' },
    { id: 'registry-abuse', label: 'Registry & Autorun', color: '#9bc23a' },
    { id: 'credential-access', label: 'Credential Access', color: '#e0b12f' },
    { id: 'token-privilege', label: 'Token Privileges', color: '#ef8630' },
    { id: 'group-abuse', label: 'Privileged Groups', color: '#ec5a97' },
    { id: 'uac-bypass', label: 'UAC Bypass', color: '#b04fda' },
    { id: 'system', label: 'SYSTEM', color: '#5f6ce6' },
  ],
  nodes: [...anchorNodes, ...peTechniqueNodes],
  edges: [...anchorEdges, ...peTechniqueEdges],
};
