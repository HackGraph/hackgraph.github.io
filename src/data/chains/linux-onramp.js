import { mitre, r } from '../lib.js';

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
/** @type {import('../schema.js').TechniqueNodeDef[]} */
export const linuxOnrampNodes = [
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
    "id": "lin-identity",
    "label": "Identity & Entitlements",
    "phase": "triage",
    "summary": "Understand process credentials and the permissions attached to resources.",
    "description": "Linux process credentials include several user and group IDs and a set of supplementary groups. File permission checks use filesystem user and group IDs together with supplementary groups; the filesystem IDs normally match the effective IDs. Access decisions also depend on the resource's permissions and any applicable mandatory access-control policy. An account name alone does not describe this complete security context.",
    "requires": [
      "An interactive shell on the host"
    ],
    "commands": [
      {
        "label": "Sudo rights (fast path, but may prompt for the account password)",
        "code": "sudo -l   # yields nothing on a passwordless service-account shell",
        "lang": "bash"
      },
      {
        "label": "Your user, groups, and any privileged membership",
        "code": "id; groups",
        "lang": "bash"
      }
    ],
    "mitre": {
      "id": "T1033",
      "url": "https://attack.mitre.org/techniques/T1033/"
    },
    "references": [
      {
        "label": "Linux man-pages, credentials(7)",
        "url": "https://man7.org/linux/man-pages/man7/credentials.7.html",
        "section": "User and group identifiers",
        "kind": "primary"
      },
      {
        "label": "Linux kernel, Credentials in Linux",
        "url": "https://www.kernel.org/doc/html/latest/security/credentials.html",
        "section": "Overview: Rules, access control lists and security calculations",
        "kind": "primary"
      },
      {
        "label": "MITRE ATT&CK, System Owner/User Discovery (T1033)",
        "url": "https://attack.mitre.org/techniques/T1033/"
      },
      {
        "label": "HackTricks, Linux Privilege Escalation",
        "url": "https://hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the identity, permissions, and audit-policy explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "sudo -l   # yields nothing on a passwordless service-account shell",
            "label": "Sudo rights (fast path, but may prompt for the account password)",
            "lang": "bash"
          },
          {
            "code": "id; groups",
            "label": "Your user, groups, and any privileged membership",
            "lang": "bash"
          }
        ],
        "description": "Linux process credentials include several user and group IDs and a set of supplementary groups. File permission checks use filesystem user and group IDs together with supplementary groups; the filesystem IDs normally match the effective IDs. Access decisions also depend on the resource's permissions and any applicable mandatory access-control policy. An account name alone does not describe this complete security context.",
        "id": "lin-identity",
        "label": "Identity & Entitlements",
        "mitre": {
          "id": "T1033",
          "url": "https://attack.mitre.org/techniques/T1033/"
        },
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
            "label": "Linux kernel, Credentials in Linux",
            "section": "Overview: Rules, access control lists and security calculations",
            "url": "https://www.kernel.org/doc/html/latest/security/credentials.html"
          },
          {
            "label": "MITRE ATT&CK, System Owner/User Discovery (T1033)",
            "url": "https://attack.mitre.org/techniques/T1033/"
          },
          {
            "label": "HackTricks, Linux Privilege Escalation",
            "url": "https://hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html"
          }
        ],
        "requires": [
          "An interactive shell on the host"
        ],
        "summary": "Understand process credentials and the permissions attached to resources."
      },
      "claims": [
        {
          "text": "Linux process credentials include user and group IDs and supplementary group IDs.",
          "section": "Linux man-pages, credentials(7) — User and group identifiers",
          "sources": [
            "https://man7.org/linux/man-pages/man7/credentials.7.html"
          ]
        },
        {
          "text": "File permission checks use filesystem IDs and supplementary groups; filesystem IDs normally match effective IDs.",
          "section": "Linux man-pages, credentials(7) — User and group identifiers",
          "sources": [
            "https://man7.org/linux/man-pages/man7/credentials.7.html"
          ]
        },
        {
          "text": "Linux access decisions can involve resource-specific discretionary permissions and system-wide mandatory access-control rules.",
          "section": "Linux kernel, Credentials in Linux — Overview: Rules, access control lists and security calculations",
          "sources": [
            "https://www.kernel.org/doc/html/latest/security/credentials.html"
          ]
        }
      ]
    }
  },
  {
    "id": "lin-hostcontrols",
    "label": "Host Controls & Confinement",
    "phase": "triage",
    "summary": "Distinguish access-control policy from audit-event coverage.",
    "description": "The Linux Security Module framework supports additional security checks, including mandatory access-control systems such as SELinux and AppArmor. Audit logging is a separate concern. Linux Audit uses configured rules to select file-access and system-call events, and also emits certain built-in events when auditing is enabled. The presence of an auditing component alone does not establish that every execution or file change is recorded.",
    "requires": [
      "An interactive shell on the host"
    ],
    "commands": [
      {
        "label": "Confinement + mount restrictions",
        "code": "id -Z 2>/dev/null; aa-status 2>/dev/null    # SELinux / AppArmor (full aa-status needs root)\ncat /proc/self/attr/current 2>/dev/null      # unprivileged: this shell's AppArmor label\nmount | grep -E 'nosuid|noexec'              # where SUID / exec is blocked",
        "lang": "bash"
      }
    ],
    "mitre": {
      "id": "T1518.001",
      "url": "https://attack.mitre.org/techniques/T1518/001/"
    },
    "references": [
      {
        "label": "Linux kernel, Linux Security Module Usage",
        "url": "https://www.kernel.org/doc/html/latest/admin-guide/LSM/index.html",
        "section": "Opening explanation of the LSM framework and MAC extensions",
        "kind": "primary"
      },
      {
        "label": "Linux Audit, audit.rules(7)",
        "url": "https://raw.githubusercontent.com/linux-audit/audit-userspace/master/docs/audit.rules.7",
        "section": "DESCRIPTION: File System and System Call; HARD WIRED EVENTS",
        "kind": "primary"
      },
      {
        "label": "MITRE ATT&CK, Security Software Discovery (T1518.001)",
        "url": "https://attack.mitre.org/techniques/T1518/001/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the identity, permissions, and audit-policy explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "id -Z 2>/dev/null; aa-status 2>/dev/null    # SELinux / AppArmor (full aa-status needs root)\ncat /proc/self/attr/current 2>/dev/null      # unprivileged: this shell's AppArmor label\nmount | grep -E 'nosuid|noexec'              # where SUID / exec is blocked",
            "label": "Confinement + mount restrictions",
            "lang": "bash"
          }
        ],
        "description": "The Linux Security Module framework supports additional security checks, including mandatory access-control systems such as SELinux and AppArmor. Audit logging is a separate concern. Linux Audit uses configured rules to select file-access and system-call events, and also emits certain built-in events when auditing is enabled. The presence of an auditing component alone does not establish that every execution or file change is recorded.",
        "id": "lin-hostcontrols",
        "label": "Host Controls & Confinement",
        "mitre": {
          "id": "T1518.001",
          "url": "https://attack.mitre.org/techniques/T1518/001/"
        },
        "phase": "triage",
        "references": [
          {
            "kind": "primary",
            "label": "Linux kernel, Linux Security Module Usage",
            "section": "Opening explanation of the LSM framework and MAC extensions",
            "url": "https://www.kernel.org/doc/html/latest/admin-guide/LSM/index.html"
          },
          {
            "kind": "primary",
            "label": "Linux Audit, audit.rules(7)",
            "section": "DESCRIPTION: File System and System Call; HARD WIRED EVENTS",
            "url": "https://raw.githubusercontent.com/linux-audit/audit-userspace/master/docs/audit.rules.7"
          },
          {
            "label": "MITRE ATT&CK, Security Software Discovery (T1518.001)",
            "url": "https://attack.mitre.org/techniques/T1518/001/"
          }
        ],
        "requires": [
          "An interactive shell on the host"
        ],
        "summary": "Distinguish access-control policy from audit-event coverage."
      },
      "claims": [
        {
          "text": "The LSM framework supports security checks used by mandatory access-control systems including SELinux and AppArmor.",
          "section": "Linux kernel, Linux Security Module Usage — Opening explanation of the LSM framework and MAC extensions",
          "sources": [
            "https://www.kernel.org/doc/html/latest/admin-guide/LSM/index.html"
          ]
        },
        {
          "text": "Linux Audit uses file and system-call rules and also has built-in events; auditing being enabled alone does not establish exhaustive file or execution coverage.",
          "section": "Linux Audit, audit.rules(7) — DESCRIPTION: File System and System Call; HARD WIRED EVENTS",
          "sources": [
            "https://raw.githubusercontent.com/linux-audit/audit-userspace/master/docs/audit.rules.7"
          ]
        }
      ]
    }
  },
];

/** @type {import('../schema.js').AttackEdge[]} */
export const linuxOnrampEdges = [
  { source: 'lin-start', target: 'lin-stabilize', label: 'raw shell' },
  { source: 'lin-start', target: 'lin-enum', label: 'usable shell' },
  { source: 'lin-stabilize', target: 'lin-enum' },
];
