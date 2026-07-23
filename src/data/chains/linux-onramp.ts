import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/**
 * Linux privilege-escalation on-ramp.
 *
 * A slim front-end for the Linux PE map: you land an unprivileged shell
 * (lin-start), make it usable, then enumerate the host to decide which lane to
 * take. lin-enum is the triage hub; it fans into the seven abuse lanes defined in
 * linux-privesc.ts, all of which converge on root (lin-root).
 *
 * Voice matches the AD / Win-PE cores: terse summaries, short requires, primary
 * sources only (MITRE, GTFOBins, The Hacker Recipes, HackTricks index).
 */
export const linuxOnrampNodes: TechniqueNodeDef[] = [
  {
    id: 'lin-stabilize',
    label: 'Stabilize the Shell',
    phase: 'triage',
    summary: 'Upgrade a raw reverse shell to a PTY; break out of a restricted shell.',
    description:
      'A raw reverse or web shell has no job control, no tab-completion, and dies on Ctrl-C, and su/sudo/ssh refuse to run without a real terminal. Spawn a pseudo-terminal (pty) so the session behaves like a normal login. If you landed in a restricted shell (rbash, lshell, or a constrained interpreter), escape it first: many editors, pagers, and language REPLs launched inside it can spawn an unrestricted /bin/bash.',
    requires: ['A non-interactive shell or a restricted shell on the host'],
    commands: [
      { label: 'Spawn a PTY (Python)', code: r`python3 -c 'import pty;pty.spawn("/bin/bash")'`, lang: 'bash' },
      { label: 'Then background and fix the terminal', code: r`# Ctrl-Z, then on the attacker box:
stty raw -echo; fg
# in the shell:
export TERM=xterm; stty rows 40 columns 160`, lang: 'bash' },
      { label: 'Escape a restricted shell (rbash)', code: r`# via an allowed binary that shells out, e.g.:
vi -c ':!/bin/bash'      # or: awk 'BEGIN{system("/bin/bash")}'`, lang: 'bash' },
    ],
    mitre: mitre('T1059.004'),
    references: [
      { label: 'MITRE ATT&CK, Unix Shell (T1059.004)', url: 'https://attack.mitre.org/techniques/T1059/004/' },
      { label: 'GTFOBins', url: 'https://gtfobins.github.io/' },
    ],
    opsec: 'Upgrading the shell is local and quiet: pty.spawn() itself writes no utmp/wtmp login record. The wtmp/lastlog footprint comes from the original login (sshd, the web-shell parent, etc.), not from the pty upgrade. Tools that do log (script, screen, tmux, ssh) will add records.',
  },
  {
    id: 'lin-enum',
    label: 'Enumerate & Triage',
    phase: 'triage',
    summary: 'Sweep the host for the misconfiguration that leads to root, then pick a lane.',
    description:
      'Almost every path to root on Linux is a misconfiguration you have to find first, so enumeration is most of the work. Identify the kernel and distro version, your user and groups, sudo rights, SUID/SGID binaries, scheduled jobs, writable files, listening services, and stored secrets. Run the quick wins by hand first (sudo -l, SUID scan, cron, histories), then let an automated script sweep the rest and watch running processes for jobs that fire as root. What you find decides which escalation technique applies.',
    requires: ['An interactive shell on the host'],
    commands: [
      { label: 'Identity, kernel, distro', code: r`id; uname -a; cat /etc/os-release`, lang: 'bash' },
      { label: 'Quick wins: sudo, SUID, cron', code: r`sudo -l 2>/dev/null
find / -perm -4000 -type f 2>/dev/null
cat /etc/crontab; ls -la /etc/cron.*`, lang: 'bash' },
      { label: 'Capabilities and writable files', code: r`getcap -r / 2>/dev/null
find / -writable -type f 2>/dev/null | grep -vE '^/(proc|sys)'`, lang: 'bash' },
      { label: 'Automated sweep + process watch', code: r`./linpeas.sh          # broad checks
./pspy64              # watch cron/root jobs fire in real time`, lang: 'bash' },
    ],
    tools: [
      { name: 'LinPEAS (PEASS-ng)', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'pspy', url: 'https://github.com/DominicBreuker/pspy' },
      { name: 'LinEnum', url: 'https://github.com/rebootuser/LinEnum' },
      { name: 'GTFOBins', url: 'https://gtfobins.github.io/' },
    ],
    mitre: mitre('T1082'),
    references: [
      { label: 'MITRE ATT&CK, System Information Discovery (T1082)', url: 'https://attack.mitre.org/techniques/T1082/' },
      { label: 'PayloadsAllTheThings, Linux Privilege Escalation', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'LinPEAS is loud: it touches thousands of files and is trivially fingerprinted by EDR/auditd. On a monitored host prefer the targeted manual checks and a static pspy binary over dropping a full enumeration script.',
  },
  {
    id: 'lin-identity',
    label: 'Identity & Entitlements',
    phase: 'triage',
    summary: 'What your identity already holds: sudo rights and privileged group membership.',
    description:
      'Check what your identity already confers before you go hunting for a misconfiguration. These are the fastest wins on Linux, the same as a Windows token or group you already hold. sudo -l lists any sudo rights, often a one-step path to root. id and groups show privileged group membership: docker and lxd are effectively root, disk reads the raw block device, adm reads logs, shadow reads /etc/shadow. A service or web account (www-data) usually holds none of these and falls through to the misconfiguration techniques. Windows branches on who you are; Linux branches on what is misconfigured.',
    requires: ['An interactive shell on the host'],
    commands: [
      { label: 'Sudo rights (fast path, but may prompt for the account password)', code: r`sudo -l   # yields nothing on a passwordless service-account shell`, lang: 'bash' },
      { label: 'Your user, groups, and any privileged membership', code: r`id; groups`, lang: 'bash' },
    ],
    mitre: mitre('T1033'),
    references: [
      { label: 'MITRE ATT&CK, System Owner/User Discovery (T1033)', url: 'https://attack.mitre.org/techniques/T1033/' },
      { label: 'HackTricks, Linux Privilege Escalation', url: 'https://hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html' },
    ],
  },
  {
    id: 'lin-hostcontrols',
    label: 'Host Controls & Confinement',
    phase: 'triage',
    summary: 'Confinement and logging that blocks or catches escalation tricks, the Linux analog of AMSI/EDR.',
    description:
      'A hardened Linux host constrains what your escalation attempts can do and logs them, so check before assuming a technique will work. SELinux or AppArmor confinement can deny an action even for a root-equivalent process. Mount options matter most: nosuid neuters SUID and setuid-shell tricks, and noexec blocks running a dropped binary, so /tmp, /dev/shm, and /home are common blockers (this is why the cron-wildcard setuid trick can be inert). auditd or an eBPF-based EDR logs execve and file writes. This constrains which techniques work rather than giving a path to root, like the Windows Defense Evasion checks.',
    requires: ['An interactive shell on the host'],
    commands: [
      { label: 'Confinement + mount restrictions', code: r`id -Z 2>/dev/null; aa-status 2>/dev/null    # SELinux / AppArmor (full aa-status needs root)
cat /proc/self/attr/current 2>/dev/null      # unprivileged: this shell's AppArmor label
mount | grep -E 'nosuid|noexec'              # where SUID / exec is blocked`, lang: 'bash' },
    ],
    mitre: mitre('T1518.001'),
    references: [
      { label: 'MITRE ATT&CK, Security Software Discovery (T1518.001)', url: 'https://attack.mitre.org/techniques/T1518/001/' },
    ],
  },
];

export const linuxOnrampEdges: AttackEdge[] = [
  { source: 'lin-start', target: 'lin-stabilize', label: 'raw shell' },
  { source: 'lin-start', target: 'lin-enum', label: 'usable shell' },
  { source: 'lin-stabilize', target: 'lin-enum' },
];
