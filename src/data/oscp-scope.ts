/**
 * OSCP (PEN-200) exam-scope classification for the "OSCP" study filter.
 *
 * This is an EXTERNAL classification — OffSec's exam boundary — not an intrinsic
 * property of a technique, so it lives here in one reviewable place rather than as a
 * per-node field. The "OSCP" toggle in MapView dims every technique node whose id is
 * NOT in {@link OSCP_SCOPE}, leaving the exam-relevant spine lit.
 *
 * Sources (all public, cross-checked):
 *   - PEN-200 "Penetration Testing with Kali Linux" syllabus (OSCP+).
 *   - OSCP Body of Knowledge (per-domain task list).
 *   - PEN-200 24-week learning plan (per-module lab breakdown).
 * CHECKED vs the February 2026 revision. When OffSec revises the exam, update THIS file
 * (and bump the date) — nothing else needs to change.
 *
 * Two tiers of membership, kept only as comments (the runtime unions them):
 *   - BoK  = named in a Body-of-Knowledge chapter / 24-week lab (chapter cited inline).
 *   - extra = commonly co-taught in OSCP prep but not explicitly named in the BoK,
 *             kept intentionally small (flagged `// extra`).
 *
 * Not affiliated with or endorsed by OffSec. This is a study aid derived from published
 * course materials; OSCP and PEN-200 are trademarks of OffSec.
 *
 * DELIBERATELY OUT OF SCOPE (so the AD map dims hard): ADCS misconfig ESCs (ESC1-16),
 * SCCM, delegation (unconstrained/constrained/RBCD), trusts/forests, RPC coercion
 * (PetitPotam / PrinterBug / WebClient), Shadow Credentials, and the BloodHound ACL-edge
 * abuse zoo — none appear in the BoK.
 * Named CVEs, by contrast, are IN scope: the exam never bans them, they are just usually
 * patched on exam hosts, so an applicable one-shot (EternalBlue, ZeroLogon, PrintNightmare,
 * ProxyShell, the kernel LPEs, certifried) is fair game when the target is vulnerable. A
 * CVE that only works via a banned technique (PrivExchange / NTLM-reflection = relay,
 * Bronze Bit = delegation) still stays out.
 * ALSO out despite being taught (ch.16.3): LLMNR/NBT-NS/mDNS poisoning, IPv6/DHCPv6
 * spoofing (mitm6), ARP/ADIDNS spoofing, and ALL NTLM relay — the exam prohibits
 * spoofing and MITM. But NON-spoofing NetNTLM capture IS in scope: coercing auth with a
 * planted file (.library-ms / .lnk / .url / .scf) or MSSQL xp_dirtree, then cracking it
 * offline. No-cred enumeration (username enum, RID cycling, RPC/LDAP null sessions) is
 * likewise in.
 */

/**
 * Active Directory map. BoK ch.21 (Enumeration), ch.22 (Attacking AD Authentication),
 * ch.23/24 (Lateral Movement + Persistence), plus ch.16 (Password Attacks: Net-NTLMv2).
 */
const AD_SCOPE: readonly string[] = [
  // Enumeration & recon — ch.21 manual + SharpHound/BloodHound, ch.6 network recon
  'network-recon',
  'domain-object-enum',
  'bloodhound-recon',
  'smb-share-loot', // ch.22.3.5 domain shares
  'anon-smb-shares', // extra: guest/null share enum
  // No-cred (unauthenticated) enumeration — a core, heavily-tested OSCP area:
  // Kerberos user enum, RID cycling over null sessions, RPC/LDAP anonymous, SMTP VRFY.
  'username-enum-kerbrute',
  'rid-cycling',
  'rpc-null-enum',
  'anon-ldap-dump',
  'smtp-user-enum',
  'pre2k-auth', // extra: unauth foothold via pre-Windows 2000 computer accounts
  'timeroast', // extra: unauth MS-SNTP hash harvest (crackable pre-2k computer MACs)
  // Obtaining credentials — ch.16 password attacks + ch.22.2 spraying
  'password-spraying',
  'online-brute',
  'expired-password-reset', // reset a must-change password (found while spraying), then log in
  // Non-spoofing NetNTLM capture -> offline crack. Name-spoofing (Responder/LLMNR) and
  // relay are banned, but coercing auth WITHOUT spoofing is fair game on the exam.
  'ntlm-theft-files', // planted .library-ms / .lnk / .url / .scf on a writable share
  'mssql-coerce', // MSSQL xp_dirtree/xp_subdirs coercion (you already hold SQL)
  'crack-netntlm', // crack the captured Net-NTLMv2 offline
  // NB: 'smb-exec-foothold' is the relay->SMB exec endpoint (its only inbound is a relay
  // edge), so it stays OUT with the rest of the banned relay chain.
  // Kerberos attacks — ch.22.2
  'asrep-roasting',
  'kerberoasting',
  'kerberoast-rc4',
  'kerberoast-aes',
  'silver-ticket',
  'service-account-creds', // extra: SPN accounts feeding Kerberoasting
  // Credential dumping & cracking — ch.23.1.3 cached creds, ch.16.2 cracking
  'dump-lsass',
  'sam-lsa-dump',
  'mscache-crack', // ch.23.1.3 cached AD creds → DCC2
  'crack-hash-offline',
  'crack-encrypted-file', // ch.16.2.4 password managers / SSH key passphrase
  'keepass-extract', // ch.16.2.4 password manager
  'local-cred-hunt', // ch.16.1.3 sensitive information
  'gpp-cpassword', // GPP cPassword in SYSVOL Groups.xml (MS14-025), AES-decryptable
  'browser-creds', // extra: browser credential hunting
  'app-config-secrets', // creds in app/service config files
  'laps-read', // read a LAPS local-admin password (with delegated rights)
  'dpapi-user-secrets', // decrypt DPAPI-protected user creds (browser / cred vault)
  'dpapi-machine-secrets', // machine DPAPI secrets (needs SYSTEM / local admin)
  // Hash / ticket → domain — ch.22.2.5, ch.24.1-2
  'pass-the-hash',
  'overpass-the-hash',
  'pass-the-ticket',
  'tgt-harvest', // extra: ticket harvesting for PtT
  'dcsync', // ch.22.2.5 DC synchronization
  'krbtgt-hash', // extra: precursor to the Golden Ticket
  'golden-ticket', // ch.24.2.1
  'ntds-dump', // ch.24.2.2 shadow copies / ntds.dit
  // Privileged domain groups — basic AD privesc (membership -> DC / creds), mirrors the
  // Win-PE local-group set. Cert Publishers / Schema Admins / WSUS-SCCM Admins stay out.
  'pg-backup-operators', // SeBackup on DCs -> dump NTDS
  'pg-server-operators', // manage DC services -> SYSTEM on a DC
  'pg-dnsadmins', // DLL load into the DNS service on a DC
  'pg-account-operators', // manage non-protected accounts
  // DACL / ACL abuse (BloodHound edges) — a core OSCP AD area: walk object permissions to
  // take over users, groups, and computers toward Domain Admin.
  'acl-genericall', // full control over the object
  'acl-genericwrite', // write attributes -> targeted roast / takeover
  'acl-writedacl', // rewrite the DACL to grant yourself rights
  'acl-writeowner', // take ownership -> then WriteDACL
  'acl-forcechangepassword', // reset the target user's password
  'acl-addself-group', // add yourself/others to a group
  'acl-group-delegated', // rights inherited via group membership
  'acl-dcsync-rights', // GetChanges/GetChangesAll -> DCSync
  'targeted-kerberoast', // GenericWrite -> set SPN -> kerberoast
  'targeted-asrep', // GenericWrite -> disable preauth -> AS-REP roast
  'gpo-abuse', // edit a GPO -> code execution on linked hosts
  'acl-gplink-ou', // link a malicious GPO onto an OU
  'logon-script-abuse', // DACL on a logon script -> code execution
  // NB: shadow-credentials (AddKeyCredentialLink) is also an ACL edge but cashes out via
  // PKINIT, so it needs an ADCS CA present; left out with ADCS (flagged to user).
  // Lateral movement — ch.24.1
  'psexec',
  'wmiexec',
  'winrm-evil',
  'dcom-exec',
  'smbexec', // extra: impacket exec variant
  'atexec', // extra: impacket exec variant
  'rdp-lateral', // extra: standard interactive lateral movement
  'ssh-lateral', // extra: SSH into a Linux domain host with recovered creds/keys
  'mssql-exec', // MSSQL xp_cmdshell as a lateral / foothold vector
  'lateral-movement-cme',
  // Pivoting — ch.19-20 tunneling
  'pivoting-tunneling',
  // Named CVEs — not banned, only usually patched, so an applicable one-shot is fair game
  // if the host is vulnerable. Misconfig ESCs stay out; certifried (a real CVE) does not.
  'eternalblue', // MS17-010 SMB RCE
  'smbghost', // CVE-2020-0796 SMBv3 RCE
  'zerologon', // CVE-2020-1472
  'nopac', // CVE-2021-42278/42287
  'ms14-068', // CVE-2014-6324 PAC forgery
  'printnightmare', // CVE-2021-34527
  'proxylogon', // Exchange RCE
  'proxyshell', // Exchange RCE
  'proxynotshell', // Exchange RCE
  'certifried', // CVE-2022-26923 (standalone cert-as-computer, not an ESC misconfig)
  // MSSQL — full coverage (course ch.10 + AD lateral)
  'mssql-impersonation', // EXECUTE AS / IMPERSONATE privesc
  'mssql-linked-servers', // linked-server chaining
  'mssql-sid-enum', // domain account enumeration via SQL
  // Connective hubs / cross-map bridges (kept lit so the exam spine stays readable)
  'valid-domain-creds',
  'valid-local-creds',
  'local-admin-host',
  'user-foothold',
  'reverse-shell',
  'windows-local-privesc',
  'linux-local-privesc',
];

/** Windows Privilege Escalation map. BoK ch.16 (Windows PrivEsc) + ch.15 (AV Evasion). */
const WINPE_SCOPE: readonly string[] = [
  // Structural routing scaffold — NOT techniques, but they must stay visible or the
  // filter rules out the navigation to the in-scope techniques below. The identity
  // lane-folders (who you already are) and the SYSTEM-convergence hubs (where findings
  // collapse to SYSTEM). The 4th identity lane, pe-svc-account, is already listed below.
  'pe-cat-priv', // identity lane: a privileged token/group you already hold
  'pe-cat-admin', // identity lane: already a local admin (UAC-filtered or high integrity)
  'pe-cat-enum', // identity lane: unprivileged, enumerate for a weakness
  'pe-prim-service-exec', // hub: a privileged service runs your code
  'pe-prim-trigger', // hub: an autorun / scheduled task / accessibility trigger runs your code
  'pe-prim-kernel-exec', // hub: ring-0 execution collapses straight to SYSTEM
  // Enumeration — ch.16.1 / 16.3.2 missing patches
  'pe-kernel-enum',
  // Service abuse — ch.16.2
  'pe-insecure-service-binary',
  'pe-service-dll-hijack',
  'pe-unquoted-service-path',
  'pe-weak-service-perms',
  'pe-weak-registry-service',
  // Writable-location abuse — ch.16 (classic write-to-run)
  'pe-path-dll-hijack', // writable %PATH% dir -> DLL/binary hijack
  'pe-autorun-writable', // writable autorun / startup entry
  // Other components — ch.16.3 (scheduled tasks, exploits, abusing privileges)
  'pe-scheduled-task-abuse',
  'pe-kernel-exploit',
  'pe-seimpersonate-potato',
  'pe-pot-printspoofer',
  'pe-pot-juicypotato',
  'pe-pot-roguepotato',
  'pe-pot-godpotato',
  // Abusable token privileges — ch.16.3
  'pe-sebackup-restore', // SeBackup/SeRestore -> read SAM+SYSTEM / write anywhere
  'pe-sedebug-lsass', // SeDebug -> open LSASS and other processes
  'pe-setakeownership', // SeTakeOwnership -> own then rewrite a protected file
  'pe-seloaddriver', // SeLoadDriver -> load a vulnerable/malicious driver
  'pe-semanagevolume', // SeManageVolume -> arbitrary write via volume management
  'pe-setrustedcredman', // SeTrustedCredManAccess -> export Credential Manager
  'pe-secreatetoken', // SeCreateToken -> craft a privileged token
  'pe-setcb', // SeTcb -> act as part of the OS
  'pe-serelabel', // SeRelabel -> lower object integrity
  'pe-localservice-fullpowers', // FullPowers: restore a service acct's default privileges
  // Privileged groups & service accounts — basic Windows privesc (group -> priv/SYSTEM)
  'pe-svc-account', // running as a service account (LOCAL/NETWORK SERVICE, app-pool)
  'pe-backup-operators', // SeBackup/SeRestore via group
  'pe-server-operators', // manage services -> SYSTEM
  'pe-dnsadmins', // DLL load into the DNS service
  'pe-print-operators', // SeLoadDriver via group
  'pe-event-log-readers', // read event logs for secrets
  'pe-account-operators', // manage non-protected accounts
  'pe-hyperv-admins', // Hyper-V Administrators
  'pe-admins-filtered', // admin with a UAC-filtered token -> bypass to high integrity
  // SYSTEM execution / token impersonation
  'pe-admin-token',
  'pe-admin-service-system',
  'pe-admin-schtask-system',
  // Host credential hunting — ch.16.1.3 / 16.1.4
  'pe-config-password-hunt',
  'pe-powershell-history',
  'pe-stored-creds',
  'pe-password-managers',
  'pe-sam-system-dump',
  'pe-dpapi-creds',
  'pe-winlogon-autologon',
  'pe-recovered-creds', // hub: recovered host creds converge here (feed reuse/PtH)
  // Foothold — ch.15 (NB: AV/AMSI evasion is OUT: the OSCP exam has no AV to evade;
  // AppLocker/CLM/WDAC escape is OSEP-level and likewise out.)
  'win-exec-foothold',
  'win-logon-password',
  'win-logon-pth', // ch.16.3.2 passing NTLM
  'win-logon-kerberos',
  // UAC bypasses — ch.16.3 (fodhelper is the representative; the rest are alternates)
  'pe-uac-fodhelper',
  'pe-uac-eventvwr',
  'pe-uac-sdclt',
  'pe-uac-computerdefaults',
  'pe-uac-cmstp',
  'pe-uac-silentcleanup',
  // Named CVEs & vulnerable software — not banned, fair game if the host is vulnerable
  'pe-vuln-software', // exploit a vulnerable installed third-party app
  'pe-hivenightmare', // CVE-2021-36934 (SeriousSAM: readable SAM/SYSTEM)
  'pe-printnightmare', // CVE-2021-1675/34527 LPE
  'pe-cve-2023-21768', // AFD.sys LPE
  'pe-cve-2021-1732', // Win32k LPE
  'pe-cve-2020-0787', // BITS LPE
  'pe-cve-2019-1388', // hhupd UAC -> SYSTEM
  'pe-bluehammer', // kernel LPE (CVE-2026-33825)
  'pe-redsun', // kernel LPE (CVE-2026-41091)
  // Co-taught extras
  'pe-always-install-elevated', // extra
  'pe-mssql-xpcmdshell', // extra: ch.10 xp_cmdshell (host instance)
];

/** Linux Privilege Escalation map. BoK ch.17 — nearly the whole map is in scope. */
const LINPE_SCOPE: readonly string[] = [
  // Enumeration — ch.17.1
  'lin-stabilize',
  'lin-enum',
  'lin-identity',
  // Exposed confidential information — ch.17.2
  'lin-cred-hunt',
  'lin-ssh-keys',
  'lin-db-creds',
  'lin-cred-reuse',
  // Insecure file permissions & cron — ch.17.3
  'lin-cron-writable',
  'lin-cron-wildcard',
  'lin-passwd',
  'lin-shadow',
  'lin-writable-script',
  'lin-filewrite',
  'lin-systemd', // extra: writable unit/timer
  'lin-logrotate', // extra: logrotten
  // Insecure system components — ch.17.4 (SUID/caps, sudo, kernel)
  'lin-suid-gtfobins',
  'lin-suid-library',
  'lin-suid-path',
  'lin-suid-custom',
  'lin-caps',
  'lin-sudo-gtfobins',
  'lin-sudo-env',
  'lin-sudo-argwild',
  'lin-sudo-cve',
  'lin-kernel-exploit',
  'lin-polkit',
  'lin-glibc',
  'lin-service-cve',
  'lin-needrestart',
  'lin-kernel-recent',
  // Connective
  'lin-session-hijack',
  // Co-taught extras
  'lin-nfs', // extra: NFS no_root_squash
  'lin-group-privesc', // extra: dangerous group membership
  'lin-docker', // extra: docker socket/group
  'lin-lxd', // extra: LXD group
  'lin-container-escape', // extra
  'lin-container-cve', // extra
];

/** Every technique-node id considered within OSCP exam scope, across all maps. */
export const OSCP_SCOPE: ReadonlySet<string> = new Set([
  ...AD_SCOPE,
  ...WINPE_SCOPE,
  ...LINPE_SCOPE,
]);

/** True if a technique node is within OSCP (PEN-200) exam scope. */
export const isOscpInScope = (id: string): boolean => OSCP_SCOPE.has(id);
