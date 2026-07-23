import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre } from '../lib';

/**
 * Chain 1: "No credentials → foothold → first domain credentials".
 * Ends at the shared `valid-domain-creds` node that the other two chains
 * branch from (a key convergence point in the DAG).
 */
export const initialAccessNodes: TechniqueNodeDef[] = [
  {
    id: 'start',
    label: 'Engagement Start',
    phase: 'recon',
    kind: 'start',
    summary: 'You have network access. Pick a path.',
    description:
      'You are plugged into the internal network (or have a low-privilege foothold). From here the goal is to acquire your first set of valid domain credentials, then escalate toward Domain Admin. What you hold now splits the approach: nothing, a valid domain account, or valid local credentials.',
  },
  {
    id: 'network-recon',
    label: 'Network Recon',
    phase: 'recon',
    needs: 'none',
    summary: 'Find the DC, hosts, and weak protocols.',
    description:
      'Map the environment before touching anything loud. Identify domain controllers, naming context, hosts with SMB signing disabled (relay targets), and whether legacy name-resolution protocols (LLMNR/NBT-NS/mDNS) are in use.',
    tools: [
      { name: 'nmap', url: 'https://nmap.org/' },
      { name: 'NetExec (nxc)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'fping' },
    ],
    commands: [
      {
        label: 'Generate relay-target list (Windows, SMB signing not required)',
        code: 'nxc smb 10.0.0.0/24 --gen-relay-list relay_targets.txt',
        lang: 'bash',
      },
      {
        label: 'Show signing status for all hosts (incl. non-Windows) for the full picture',
        code: 'nxc smb 10.0.0.0/24',
        lang: 'bash',
      },
      {
        label: 'Locate domain controllers via DNS SRV',
        code: 'nslookup -type=SRV _ldap._tcp.dc._msdcs.<domain>',
        lang: 'bash',
      },
    ],
    requires: ['Network access to the internal subnet'],
    mitre: mitre('T1046'),
    references: [
      { label: 'The Hacker Recipes, Recon', url: 'https://www.thehacker.recipes/ad/recon/' },
    ],
    opsec: 'Passive listening and DNS lookups are quiet; full-range nmap scans are noisy and may trip IDS. Prefer targeted scans.',
  },
  {
    id: 'llmnr-poisoning',
    label: 'LLMNR / NBT-NS Poisoning',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Answer broadcast name queries, capture NetNTLMv2.',
    description:
      'When a host fails DNS it falls back to LLMNR/NBT-NS broadcasts. Responder answers "that\'s me", the victim authenticates to you, and you capture its NetNTLMv2 challenge/response. Relay it live or crack it offline.',
    tools: [
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
      { name: 'Inveigh', url: 'https://github.com/Kevin-Robertson/Inveigh' },
    ],
    commands: [
      {
        label: 'Observe without poisoning (analyze mode)',
        code: 'responder -I eth0 -A',
        lang: 'bash',
      },
      {
        label: 'Poison and capture NetNTLMv2',
        code: 'responder -I eth0 -wv',
        lang: 'bash',
      },
    ],
    requires: ['Network access', 'LLMNR/NBT-NS enabled on the segment'],
    mitre: mitre('T1557.001'),
    opsec: 'Responder is detectable: it answers names that should not resolve. Defenders deploy "honey" name lookups to catch it. Run analyze mode (-A) first to observe without poisoning. LLMNR is still on by default through current Windows 11, but Microsoft is ramping it down in favor of mDNS, and hardened estates disable LLMNR and NBT-NS by GPO. Where broadcast name resolution is turned off this yields nothing, so pivot to IPv6/DHCPv6 DNS takeover (mitm6) or ADIDNS spoofing instead.',
    references: [
      { label: 'HackTricks, LLMNR/NBT-NS Poisoning & Relay', url: 'https://book.hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-network/spoofing-llmnr-nbt-ns-mdns-dns-and-wpad-and-relay-attacks.html' },
    ],
  },
  {
    id: 'ntlm-relay',
    label: 'NTLM Relay',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Relay captured auth instead of cracking it; whether it lands depends on signing.',
    description:
      'Instead of cracking the captured authentication, relay it in real time to another service and act as the victim. Whether the relay lands is decided by signing: if the target does not enforce session signing (SMB) or channel binding (LDAP), the relay goes through directly; if it does, you pivot to channels that do not ride SMB/LDAP signing. Set Responder\'s own SMB/HTTP servers OFF so it forwards to ntlmrelayx rather than competing.',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Relay to targets, dump SAM on success',
        code: 'ntlmrelayx.py -tf relay_targets.txt -smb2support',
        lang: 'bash',
      },
      {
        label: 'Relay to LDAP for delegation/ACL abuse (needs LDAP signing off; --escalate-user only works if the relayed account already holds WriteDACL over the domain object, e.g. a relayed Exchange/DC machine account)',
        code: 'ntlmrelayx.py -t ldap://dc01 --escalate-user lowpriv',
        lang: 'bash',
      },
    ],
    requires: ['Captured/poisoned/coerced authentication to relay', 'A reachable target service (each relay target has its own signing condition)'],
    mitre: mitre('T1557.001'),
    opsec: 'Set Responder SMB/HTTP servers to OFF so it forwards to ntlmrelayx instead of competing. Relay leaves authentication logs on the target.',
    references: [
      { label: 'HackTricks, LLMNR/NBT-NS Spoofing & Relay', url: 'https://book.hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-network/spoofing-llmnr-nbt-ns-mdns-dns-and-wpad-and-relay-attacks.html' },
      { label: 'SpecterOps, Relay Your Heart Away (445 Takeover)', url: 'https://specterops.io/blog/2024/08/01/relay-your-heart-away-an-opsec-conscious-approach-to-445-takeover/' },
    ],
  },
  {
    id: 'relay-unsigned',
    aliases: ['CoerceAndRelayNTLMToSMB', 'CoerceAndRelayNTLMToLDAP', 'CoerceAndRelayNTLMToLDAPS'],
    label: 'Signing Not Enforced',
    phase: 'credential-access',
    needs: 'none',
    summary: 'SMB/LDAP signing off, so the relay lands directly on the target protocol.',
    description:
      'When the target does not require session signing (SMB signing not enforced) or, for a DC, LDAP signing and channel binding are not enforced, the captured authentication relays straight through. Relay to SMB on a host where the principal is local admin for code execution or a SAM dump, or relay to LDAP to write ACLs (grant DCSync), configure RBCD, or add Shadow Credentials. The DCSync DACL write works over plain ldap://, but RBCD and Shadow Credentials that mint a new computer account (via ms-DS-MachineAccountQuota) need an encrypted channel (ldaps:// or LDAP+StartTLS), because AD refuses to set a machine-account password over cleartext LDAP. No password is ever cracked. Legacy and default-configured estates frequently sit here, but the defaults are tightening: Windows 11 24H2 and Server 2025 turn SMB signing on by default, so confirm the target is actually unsigned rather than assuming it.',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (--gen-relay-list)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Enumerate hosts with SMB signing NOT required',
        code: 'nxc smb 10.0.0.0/24 --gen-relay-list relay_targets.txt',
        lang: 'bash',
      },
      {
        label: 'Relay to SMB, dump SAM on success',
        code: 'ntlmrelayx.py -tf relay_targets.txt -smb2support',
        lang: 'bash',
      },
      {
        label: 'Relay to LDAP and escalate (needs LDAP signing/CBT off)',
        code: 'ntlmrelayx.py -t ldap://dc01 --escalate-user lowpriv',
        lang: 'bash',
      },
    ],
    requires: ['Captured/coerced authentication', 'A target with SMB signing NOT enforced (SMB branch) or a DC with LDAP signing + channel binding NOT enforced (LDAP branch)'],
    mitre: mitre('T1557.001'),
    opsec: 'The relayed authentication and any code execution leave logon events (4624 type 3) on the target; the LDAP ACL write for --escalate-user is a high-signal directory modification (5136). --escalate-user also needs the relayed account to hold write access over the domain object.',
    references: [
      { label: 'The Hacker Recipes, NTLM relay', url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay' },
      { label: 'Microsoft, SMB signing required by default', url: 'https://techcommunity.microsoft.com/blog/filecab/smb-signing-required-by-default-in-windows-insider/4090550' },
      { label: 'Microsoft Learn, Control SMB signing behavior (24H2 and Server 2025 defaults)', url: 'https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing' },
    ],
  },
  {
    id: 'relay-signing-enforced',
    label: 'Signing / CBT Enforced',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Signing kills the SMB/LDAP relay, so pivot to channels that ignore it.',
    description:
      'When SMB signing is required and the DC enforces LDAP signing plus channel binding (EPA), the direct SMB and LDAP relays fail. You can still relay to channels that do not ride SMB/LDAP session signing. Relay to AD CS HTTP web enrollment (ESC8) or the ICertPassage RPC (ESC11) to mint a certificate as the victim; relay to MSSQL (TDS) for xp_cmdshell. These channels are indifferent to SMB/LDAP signing, so they are your answer when it is enforced, though each has its own mitigation (ESC8 is closed by EPA on the CA web enrollment). WSUS is not one of these relay sinks: a rogue or impersonated WSUS server is a coercion/interception source (like PetitPotam or DFSCoerce) that captures a client authentication, which you then relay onward into these same channels. CVE-2019-1040 (drop-the-MIC) is not one of these: it strips the MIC to relay cross-protocol only against DCs that negotiate rather than require signing, so it belongs to the pre-enforcement case and simply fails once signing plus channel binding are actually required. It is a reason signing must be strictly required rather than merely negotiated, not a bypass of this enforced state. If nothing is reachable, fall back to cracking the NetNTLMv2 offline.',
    tools: [
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
    ],
    commands: [
      {
        label: 'Relay to AD CS web enrollment (ESC8), request a cert',
        code: 'ntlmrelayx.py -t http://ca01/certsrv/certfnsh.asp -smb2support --adcs --template DomainController',
        lang: 'bash',
      },
      {
        label: 'Relay to MSSQL for xp_cmdshell',
        code: 'ntlmrelayx.py -t mssql://10.0.0.30 -i -smb2support --no-multirelay',
        lang: 'bash',
      },
    ],
    requires: ['Captured/coerced authentication (ideally a machine account, for ESC8 → DC compromise)', 'A signing-agnostic relay target: an AD CS web/RPC endpoint or an MSSQL instance'],
    mitre: mitre('T1557.001'),
    opsec: 'Certificate enrollment (ESC8) and the follow-on PKINIT logon are auditable: AD CS issuance logs, plus the PKINIT logon itself is a TGT request (4768) with the certificate pre-auth type; 4769 only follows later when that TGT is used for a service. Relaying to MSSQL and running xp_cmdshell is loud. Coercing a machine account to feed the relay (PetitPotam/DFSCoerce) adds its own high-signal RPC calls.',
    references: [
      { label: 'The Hacker Recipes, NTLM relay', url: 'https://www.thehacker.recipes/ad/movement/ntlm/relay' },
      { label: 'dirkjanm, NTLM relay to AD CS (ESC8)', url: 'https://dirkjanm.io/ntlm-relaying-to-ad-certificate-services/' },
      { label: 'Preempt (CrowdStrike archive), Drop the MIC, CVE-2019-1040', url: 'https://www.crowdstrike.com/en-us/blog/from-the-archives-drop-the-mic-cve-2019-1040/' },
      { label: 'Compass Security, Relaying to AD Certificate Services over RPC (ESC11)', url: 'https://blog.compass-security.com/2022/11/relaying-to-ad-certificate-services-over-rpc/' },
    ],
  },
  {
    id: 'crack-netntlm',
    label: 'Crack NetNTLMv2',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Offline-crack the captured hash to a password.',
    description:
      'If relaying is not viable (signing enforced everywhere), crack the captured NetNTLMv2 hash offline. This only yields usable credentials when the captured principal is a user account whose password is in scope of your wordlist and rules; machine-account (host$) captures use auto-generated ~120-character random passwords and are effectively uncrackable, and local (non-domain) captures do not give you domain credentials. So the path on to valid domain creds is conditional: the account must be a domain user with a weak or known password.',
    tools: [
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
      { name: 'john', url: 'https://www.openwall.com/john/' },
    ],
    commands: [
      {
        label: 'Crack NetNTLMv2 (mode 5600)',
        code: 'hashcat -m 5600 captured.txt rockyou.txt -r rules/best64.rule',
        lang: 'bash',
      },
    ],
    requires: ['A captured NetNTLMv2 hash'],
    mitre: mitre('T1110.002'),
    opsec: 'Fully offline: zero footprint on the target once captured.',
  },
  {
    id: 'smb-exec-foothold',
    label: 'Relay to SMB → Exec',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'Code execution on the relayed/owned host.',
    description:
      'With a relayed session or admin creds, execute commands over SMB (service creation, WMI, or task scheduler) to land an interactive foothold on a domain-joined host. These mechanisms map to different ATT&CK techniques, so tune detections accordingly: psexec/smbexec create a service (Service Execution, T1569.002) on top of the SMB admin-share session (T1021.002), while wmiexec does not touch SMB admin shares for the exec step at all, it runs Win32_Process.Create over DCOM/WMI under WmiPrvSE.exe (Windows Management Instrumentation, T1047).',
    tools: [
      { name: 'Impacket psexec/smbexec/wmiexec', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Semi-interactive shell over SMB (password or -hashes for PtH)',
        code: 'smbexec.py -hashes :<NTHASH> DOMAIN/user@10.0.0.20',
        lang: 'bash',
      },
    ],
    requires: ['Local admin on the target (relayed or owned)'],
    mitre: mitre('T1021.002'),
    opsec: 'psexec and smbexec both create a Windows service (Event ID 7045). smbexec spawns one per command, so it is at least as loud on that axis (psexec additionally drops a PSEXESVC binary on ADMIN$). Only wmiexec (WMI Win32_Process.Create, no service) is genuinely quieter. Prefer fileless execution.',
    references: [
      { label: 'HackTricks, PsExec/WinExec (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html' },
    ],
  },
  {
    id: 'local-admin-host',
    aliases: ['AdminTo'],
    label: 'Admin / Root on Host',
    phase: 'priv-esc',
    needs: 'local-admin',
    summary: 'Local admin / SYSTEM on Windows, or root on Linux.',
    description:
      'You hold administrative control of a host: SYSTEM or local administrator on Windows, or root on Linux. With it, you can harvest the host\'s credentials. On Windows, dumping LSASS yields live credentials (NTLM hashes, Kerberos tickets, sometimes cleartext); dumping the SAM/SECURITY/SYSTEM hives yields local NT hashes, LSA secrets, and cached DCC2 domain-logon verifiers (which must be cracked offline, they cannot be passed); DPAPI material decrypts protected local and user secrets such as Credential Manager, browser, and application data. On Linux, loot keytabs, ticket caches, and SSH keys. Reuse what you recover to move to the next host.',
    requires: ['Local admin / SYSTEM (Windows) or root (Linux) on a host'],
    mitre: mitre('T1003'),
    tools: [
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Dump SAM / LSA / DPAPI remotely (NetExec)',
        code: 'nxc smb <host> -u Administrator -H <NTHASH> --local-auth --sam --lsa --dpapi',
        lang: 'bash',
      },
    ],
  },
  {
    id: 'dump-lsass',
    aliases: ['HasSession'],
    label: 'Dump LSASS',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Extract creds/tickets from memory.',
    description:
      'LSASS holds credential material for logged-on users: NTLM hashes, Kerberos tickets, and sometimes cleartext. Dump it (carefully, EDR watches LSASS closely) to harvest higher-privilege credentials.',
    tools: [
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'nanodump', url: 'https://github.com/fortra/nanodump' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Classic in-memory dump (Mimikatz console; needs debug right or SYSTEM)',
        code: 'privilege::debug\nsekurlsa::logonpasswords',
        lang: 'mimikatz',
      },
      {
        label: 'LOLBin minidump (then parse offline)',
        code: 'rundll32 C:\\Windows\\System32\\comsvcs.dll, MiniDump <lsass_pid> C:\\temp\\l.dmp full',
        lang: 'powershell',
      },
      {
        label: 'Dump LSASS remotely (NetExec lsassy)',
        code: 'nxc smb <host> -u user -p pass -M lsassy',
        lang: 'bash',
      },
    ],
    requires: ['Local admin / SYSTEM on the host'],
    mitre: mitre('T1003.001'),
    opsec: 'LSASS access is the single most-monitored action by EDR. Prefer protected-process bypasses, handle duplication, or dumping offline from a minidump.',
    references: [
      { label: 'HackTricks, Stealing Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html' },
      { label: 'modexp, MiniDumpWriteDump via COM+ Services DLL (comsvcs MiniDump)', url: 'https://modexp.wordpress.com/2019/08/30/minidumpwritedump-via-com-services-dll/' },
      { label: 'LOLBAS, comsvcs.dll MiniDump', url: 'https://lolbas-project.github.io/lolbas/Libraries/comsvcs/' },
    ],
  },
  {
    id: 'pass-the-hash',
    label: 'Pass-the-Hash',
    phase: 'lateral-movement',
    needs: 'creds',
    summary: 'Authenticate with the NT hash, no cracking.',
    description:
      'NTLM authentication only needs the hash, not the password. Reuse a harvested local-admin or domain NT hash to authenticate to other hosts and pivot.',
    tools: [
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      {
        label: 'Spray a LOCAL admin hash across hosts (--local-auth)',
        code: 'nxc smb hosts.txt -u Administrator -H <NTHASH> --local-auth',
        lang: 'bash',
      },
      {
        label: 'Pass a DOMAIN account hash',
        code: 'nxc smb hosts.txt -u jdoe -H <NTHASH> -d domain.local',
        lang: 'bash',
      },
    ],
    requires: ['An NT hash', 'NTLM authentication permitted'],
    mitre: mitre('T1550.002'),
    opsec: 'NTLM logons are more visible than Kerberos and stand out from a workstation. Watch for "Logon Type 3" anomalies. Members of the Protected Users group cannot authenticate over NTLM, so pass-the-hash fails against them. Protected Users are also barred from RC4 in Kerberos, and classic overpass-the-hash from an NT hash uses that NT hash as the RC4 key, so an NT-hash-only overpass fails for the same reason. If you hold AES128/256 key material, use pass-the-key/overpass with AES instead. If you only have the NT hash, either remove the account from Protected Users (with the appropriate rights, expecting logon-state delay and directory logging) or choose another credential path.',
    references: [
      { label: 'HackTricks, NTLM / Pass-the-Hash', url: 'https://book.hacktricks.wiki/en/windows-hardening/ntlm/index.html' },
    ],
  },
  {
    id: 'valid-domain-creds',
    label: 'Valid Domain Credentials',
    phase: 'enumeration',
    needs: 'domain-user',
    hub: true, // the domain-identity convergence hub: many creds-yielding steps lead back here
    summary: 'A foothold identity to enumerate and escalate from.',
    description:
      "You hold at least one valid domain account (cleartext, hash, or ticket) to enumerate and escalate from. Check first whether it is already local admin somewhere. Many users administer their own workstation or a cluster of hosts, so spray the credential across the estate and watch for NetExec's (Pwn3d!) marker, then move to dumping credentials as local admin.",
    tools: [{ name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' }],
    commands: [
      {
        label: 'Find where these creds are already local admin (look for (Pwn3d!))',
        code: 'nxc smb 10.0.0.0/24 -u user -p pass -d domain.local',
        lang: 'bash',
      },
    ],
    requires: ['Any valid domain credential'],
    references: [
      { label: 'NetExec, SMB authentication & (Pwn3d!) check', url: 'https://www.netexec.wiki/smb-protocol/authentication' },
    ],
    mitre: mitre('T1078.002'),
    opsec: 'A subnet-wide SMB spray is noisy: it drives a Type 3 network logon on every reachable host, landing as 4624 on success and 4625 where the account is not authorized, which is an easy volumetric detection. Scope the spray to a known target list rather than a blind /24.',
  },
  {
    id: 'valid-local-creds',
    label: 'Valid Local Credentials',
    phase: 'initial-access',
    needs: 'creds',
    hub: true, // the local-identity convergence hub
    summary: 'A local account on a host, often low-privilege; may need escalation to local admin.',
    description:
      'You hold a valid LOCAL account (not a domain account): a default/weak local login, a cracked SAM hash, or creds from a config file. If it is low-privilege you must escalate locally before you can harvest secrets or pivot. Local admin on a domain-joined host lets you dump domain credentials.',
    requires: ['Any valid local account on a host'],
    mitre: mitre('T1078.003'),
  },
  {
    id: 'windows-local-privesc',
    label: 'Windows Local Privilege Escalation',
    phase: 'priv-esc',
    needs: 'shell',
    summary: 'Escalate a low-priv local user to local admin / SYSTEM.',
    description:
      'From a low-privilege local shell, abuse service / registry / scheduled-task misconfigurations, token privileges (Potato), AlwaysInstallElevated, an unquoted service path, or a kernel exploit to reach SYSTEM. The full technique catalogue is in the Windows Privilege Escalation map.',
    requires: ['A low-privilege local shell on the host'],
    references: [
      {
        label: 'HackTricks, Windows Local Privilege Escalation',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html',
      },
      { label: 'MITRE ATT&CK, Access Token Manipulation: Token Impersonation/Theft (T1134.001), for the Potato lane', url: 'https://attack.mitre.org/techniques/T1134/001/' },
      { label: 'MITRE ATT&CK, Hijack Execution Flow: Path Interception by Unquoted Path (T1574.009), for the unquoted-service-path lane', url: 'https://attack.mitre.org/techniques/T1574/009/' },
      { label: 'MITRE ATT&CK, Abuse Elevation Control Mechanism (T1548), for AlwaysInstallElevated', url: 'https://attack.mitre.org/techniques/T1548/' },
      { label: 'MITRE ATT&CK, Exploitation for Privilege Escalation (T1068), for the kernel-exploit lane', url: 'https://attack.mitre.org/techniques/T1068/' },
    ],
    mitre: mitre('T1068'),
  },
  {
    id: 'linux-local-privesc',
    label: 'Linux Local Privilege Escalation',
    phase: 'priv-esc',
    needs: 'shell',
    summary: 'Escalate a low-priv user to root on a Linux host.',
    description:
      "From a non-root shell on a domain-joined (or standalone) Linux host, abuse sudo misconfigurations and SUID/SGID binaries (GTFOBins), writable cron jobs, dangerous capabilities, PATH / wildcard injection, shared-library hijacking (LD_PRELOAD / LD_LIBRARY_PATH / writable RPATH), NFS no_root_squash, the docker / lxd group, or a kernel exploit to reach root. LinPEAS and pspy surface the quick wins. Root then reads the host's Kerberos keytabs and SSSD cache.",
    requires: ['A non-root shell on the host'],
    references: [
      { label: 'HackTricks, Linux Privilege Escalation', url: 'https://hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html' },
      { label: 'GTFOBins', url: 'https://gtfobins.org/' },
      { label: 'PayloadsAllTheThings, Linux Privilege Escalation', url: 'https://swisskyrepo.github.io/InternalAllTheThings/redteam/escalation/linux-privilege-escalation/' },
      { label: 'MITRE ATT&CK, Setuid and Setgid (T1548.001), for the SUID/SGID lane', url: 'https://attack.mitre.org/techniques/T1548/001/' },
      { label: 'MITRE ATT&CK, Sudo and Sudo Caching (T1548.003), for the sudo-misconfig lane', url: 'https://attack.mitre.org/techniques/T1548/003/' },
      { label: 'MITRE ATT&CK, Exploitation for Privilege Escalation (T1068), for the kernel-exploit lane', url: 'https://attack.mitre.org/techniques/T1068/' },
    ],
    tools: [
      { name: 'LinPEAS (PEASS-ng)', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'GTFOBins', url: 'https://gtfobins.org/' },
      { name: 'pspy', url: 'https://github.com/DominicBreuker/pspy' },
    ],
    mitre: mitre('T1548'),
  },
];

export const initialAccessEdges: AttackEdge[] = [
  { source: 'start', target: 'network-recon', label: 'no creds' },
  { source: 'start', target: 'valid-domain-creds', label: 'have an account' },
  { source: 'start', target: 'valid-local-creds', label: 'have a local account' },
  // Low-priv local user -> escalate locally -> own the host (bridges to the PE map). A local
  // account can be on a Windows OR a Linux host, so it forks to both LPE paths; both converge
  // on Admin/Root on Host. Linear chain only: a direct valid-local-creds -> local-admin-host
  // shortcut would skip a rank and draw its label straight over the privesc node.
  { source: 'valid-local-creds', target: 'windows-local-privesc', label: 'Windows host' },
  { source: 'valid-local-creds', target: 'linux-local-privesc', label: 'Linux host' },
  { source: 'windows-local-privesc', target: 'local-admin-host', label: 'SYSTEM / local admin' },
  // Domain creds that are *already* local admin somewhere (NetExec (Pwn3d!)):
  // standing access is often the intended path, no escalation required.
  { source: 'valid-domain-creds', target: 'local-admin-host', label: 'already local admin (Pwn3d!)' },
  // network-recon -> llmnr-poisoning now routes through the 'Poisoning & Relay' category
  { source: 'llmnr-poisoning', target: 'ntlm-relay', label: 'relay' },
  { source: 'llmnr-poisoning', target: 'crack-netntlm', label: 'crack offline' },
  // NTLM Relay forks on whether the target enforces signing; nothing is dropped —
  // the direct SMB/LDAP relays sit under 'relay-unsigned', the signing-agnostic
  // channels (ESC8/ESC11/MSSQL/WSUS/drop-the-MIC) under 'relay-signing-enforced'
  // (those onward edges live in ntlm-relay-cve.ts).
  { source: 'ntlm-relay', target: 'relay-unsigned', label: 'signing not enforced' },
  { source: 'ntlm-relay', target: 'relay-signing-enforced', label: 'signing / CBT enforced' },
  { source: 'relay-unsigned', target: 'smb-exec-foothold', label: 'relay → SMB exec' },
  { source: 'crack-netntlm', target: 'valid-domain-creds', label: 'cracked password' },
  { source: 'smb-exec-foothold', target: 'local-admin-host' },
  { source: 'dump-lsass', target: 'pass-the-hash' },
  { source: 'dump-lsass', target: 'valid-domain-creds' },
];
