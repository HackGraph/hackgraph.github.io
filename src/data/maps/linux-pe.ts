import type { MapDefinition, TechniqueNodeDef, AttackEdge } from '../schema';
import { linuxOnrampNodes, linuxOnrampEdges } from '../chains/linux-onramp';
import { linuxPrivescNodes, linuxPrivescEdges } from '../chains/linux-privesc';

const r = String.raw;

/** Fixed anchors: the local-foothold root and the root goal. The on-ramp
 *  (linux-onramp) turns the foothold into a usable, enumerated shell and feeds
 *  the triage hub; the seven abuse lanes (linux-privesc) all converge on lin-root. */
const anchorNodes: TechniqueNodeDef[] = [
  {
    id: 'lin-start',
    label: 'Get a Foothold',
    phase: 'triage',
    kind: 'start',
    summary: 'An unprivileged shell on a Linux host. Make it usable, then enumerate.',
    description:
      'You have command execution as a low-privilege user (a service account, a web user, or a normal login) on a Linux host, and the goal is root (EUID 0). Before any exploit, make the shell usable and build situational awareness: who you are, what the kernel and distro are, and what the host is misconfigured to let you touch. Almost every path to root here is a misconfiguration you have to find, so enumeration is the first move, not exploitation.',
    requires: ['A low-privilege shell on a Linux host'],
    references: [
      { label: 'PayloadsAllTheThings, Linux Privilege Escalation', url: 'https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Linux%20-%20Privilege%20Escalation.md' },
    ],
  },
  {
    id: 'lin-root',
    label: 'root (EUID 0)',
    phase: 'root',
    kind: 'goal',
    summary: '👑 Full root on the host.',
    description:
      'You hold root (EUID 0) on the host, with full control of its files, services, and any credentials in memory or on disk. From here, harvest secrets (/etc/shadow, SSH keys, application credentials) and pivot: a recovered password or key reused across the network moves you host to host.',
    requires: ['Any one successful local escalation vector'],
    commands: [
      { label: 'Confirm root and grab a persistent shell', code: r`id     # uid=0(root)
# if you dropped a setuid bash: /tmp/rootbash -p`, lang: 'bash' },
    ],
  },
];

const anchorEdges: AttackEdge[] = [];

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
export const linuxPeMap: MapDefinition = {
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
