import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/** Domain & forest trust abuse (web-verified). Grouped under the ad-cat-trusts category. */
export const adTrustNodes: TechniqueNodeDef[] = [
  {
    id: 'trust-enum',
    aliases: ['SameForestTrust'],
    label: 'Trust Enumeration',
    phase: 'enumeration',
    needs: 'domain-user',
    summary: 'Map every trust: direction, transitivity, SID filtering.',
    description: r`Map the trust topology before any trust attack: which domains trust which, the direction, transitivity, and the trustAttributes flags (WITHIN_FOREST 0x20, FOREST_TRANSITIVE 0x8, QUARANTINED_DOMAIN 0x4, TREAT_AS_EXTERNAL 0x40). PowerView's Get-DomainTrustMapping crawls reachable trusts, nltest queries them natively, and BloodHound renders the graph. The trustAttributes value tells you whether SID filtering is in play, and therefore which abuse paths are viable.`,
    tools: [
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'BloodHound CE', url: 'https://github.com/SpecterOps/BloodHound' },
      { name: 'nltest', url: 'https://ss64.com/nt/nltest.html' },
    ],
    commands: [
      { label: 'Enumerate trusts (bloodyAD)', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 get trusts', lang: 'bash' },
      { label: 'Map all trusts (PowerView)', code: r`Get-DomainTrustMapping | Export-CSV -NoTypeInformation trusts.csv`, lang: 'powershell' },
      { label: 'Enumerate trusts natively', code: r`nltest /domain_trusts /all_trusts /v`, lang: 'cmd' },
    ],
    mitre: mitre('T1482'),
    references: [{ label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' }],
    requires: ['Any valid domain account'],
    opsec: 'nltest /domain_trusts is a well-known discovery indicator (T1482); BloodHound collection is noisy. LDAP reads of trustedDomain objects blend with normal directory traffic.',
  },
  {
    id: 'trust-ticket',
    aliases: ['HasTrustKeys'],
    label: 'Inter-Realm Trust Ticket',
    phase: 'domain-dominance',
    needs: 'domain-admin',
    summary: 'Forge a referral TGT with the trust key to reach a trusted domain.',
    description: r`Each trust has a shared inter-realm key, stored in a TRUSTEDDOMAIN$ trust account in the trusting domain and rotated ~every 30 days. DCSync that trust account to recover its hash, then forge an inter-realm referral TGT with ticketer.py using -spn krbtgt/<target_domain>, which is distinct from a golden ticket that uses the local krbtgt key. Present the referral ticket to the target KDC (getST.py) to authenticate across the trust. Whether ExtraSids are honored depends on the trust type: within a forest (parent-child, TRUST_ATTRIBUTE_WITHIN_FOREST) SID filtering is effectively off, so ExtraSids up to Enterprise Admins (RID 519) pass; across a forest/external trust SID filtering by default drops SIDs with RID < 1000, so 519/512-style ExtraSids will not pass unless TREAT_AS_EXTERNAL or weakened filtering is set.`,
    tools: [
      { name: 'ticketer (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'getST (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'secretsdump (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'DCSync the trust account hash', code: r`secretsdump.py -just-dc-user 'TRUSTEDDOMAIN$' domain.local/admin:pass@dc01`, lang: 'bash' },
      { label: 'Forge an inter-realm referral TGT (extra-sid RID 519 = Enterprise Admins, intra-forest)', code: r`ticketer.py -nthash <TRUST_KEY_HASH> -domain-sid <SOURCE_SID> -domain source.local -extra-sid <ROOT_DOMAIN_SID>-519 -spn krbtgt/target.local user`, lang: 'bash' },
      { label: 'Request a service ticket in the target domain', code: r`KRB5CCNAME=user.ccache getST.py -k -no-pass -spn CIFS/dc.target.local target.local/user@target.local`, lang: 'bash' },
    ],
    mitre: mitre('T1558.001'),
    references: [
      { label: 'HackTricks, SID-History Injection', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/sid-history-injection.html' },
      { label: 'harmj0y, A Guide to Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' },{ label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' }, { label: 'Sean Metcalf, Forging Kerberos Trust Tickets (ADSecurity)', url: 'https://adsecurity.org/?p=1588' }],
    requires: ['The inter-realm trust key (DCSync of the TRUSTEDDOMAIN$ account)', 'Source and target domain SIDs'],
    opsec: 'A forged inter-realm TGT shows golden-ticket-style anomalies (no preceding AS-REQ, odd lifetime/etype). Prefer AES over RC4. Across a forest/external trust, SID filtering / quarantine drops RID<1000 ExtraSids; within a forest it does not, so child-to-parent ExtraSids up to Enterprise Admins are accepted.',
  },
  {
    id: 'trust-external-abuse',
    label: 'External Trust Abuse',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Non-transitive external trust: credential reuse and foreign-rights lateral movement.',
    description: r`External trusts are typically one-way and non-transitive. Windows Server 2003+ auto-enables quarantine (TRUST_ATTRIBUTE_QUARANTINED_DOMAIN 0x4) on external trusts, so the DC accepts only SIDs whose domain is the directly-trusted domain and strips every other foreign SID regardless of RID. SIDHistory is off, so ExtraSid injection (including RID ≥ 1000) does not apply here. The realistic paths: reuse of credentials/hashes that overlap both domains, and plain lateral movement using any foreign principal that already holds rights in the trusting domain. Confirm trustAttributes from trust-enum first.`,
    tools: [
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Inspect trust direction & attributes', code: r`Get-DomainTrust -Domain external.local`, lang: 'powershell' },
      { label: 'Spray a reused credential into the trusting domain', code: r`nxc smb trusting-dc.trusting.local -u users.txt -p 'Reused@Pass1' -d trusting.local --continue-on-success`, lang: 'bash' },
    ],
    references: [
      { label: 'HackTricks, External Forest Domain (One-Way Inbound)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/external-forest-domain-oneway-inbound.html' },{ label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' }],
    requires: ['A mapped external trust', 'Foreign rights or reused credentials into the trusting domain'],
    opsec: 'Default external-trust quarantine strips every SID except those of the directly-trusted domain, so ExtraSid injection (any RID) fails; treat this as a credential-reuse and foreign-rights path, not a SID-injection one. Verify the actual trustAttributes before relying on it.',
  },
  {
    id: 'trust-forest-abuse',
    aliases: ['CrossForestTrust'],
    label: 'Inter-Forest Trust Abuse',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Forest-transitive trust: cross-forest Kerberoast & foreign ACLs.',
    description: r`Forest trusts are FOREST_TRANSITIVE (trustAttributes 0x8) and span every domain in both forests, but SID filtering is enabled by default, so cross-forest SID-history hopping is blocked. The realistic surface is access-based: Kerberoasting service accounts in the foreign forest, and abusing foreign principals that hold ACLs or local-group membership in your forest (and vice-versa). Enumerate those foreign access relationships before acting.`,
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'PowerView', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Cross-forest Kerberoast (Rubeus)', code: r`Rubeus.exe kerberoast /domain:foreign.local /nowrap`, lang: 'powershell' },
      { label: 'Find SPN accounts in the foreign forest', code: r`Get-DomainUser -SPN -Domain foreign.local | Get-DomainSPNTicket`, lang: 'powershell' },
    ],
    mitre: mitre('T1558.003'),
    references: [
      { label: 'HackTricks, External Forest Domain (One-Way Outbound)', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/external-forest-domain-one-way-outbound.html' },{ label: 'harmj0y, Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' }, { label: 'dirkjanm, AD forest trusts part 2 (CVE-2020-0665 SID-filter bypass)', url: 'https://dirkjanm.io/active-directory-forest-trusts-part-two-trust-transitivity/' }],
    requires: ['A mapped forest (FOREST_TRANSITIVE) trust', 'A valid account on your side of the forest trust'],
    opsec: 'Cross-forest TGS requests (4769) for foreign SPNs and BloodHound cross-forest collection are visible. Injecting the foreign Enterprise/Domain Admins SID is filtered, so do not expect SID-history escalation across a forest boundary. Historical SID-filter bypasses (e.g. CVE-2020-0665) are patched on current builds.',
  },
  {
    id: 'foreign-membership',
    label: 'Foreign Group Membership',
    phase: 'enumeration',
    needs: 'domain-user',
    summary: 'Find principals from domain A with rights in domain B.',
    description: r`Trusts let a principal from one domain be a member of a group (typically a domain-local group) in another. Get-DomainForeignGroupMember enumerates a target domain's groups that contain outside members (its incoming access); it surfaces the domain-local groups and Foreign Security Principals that external/forest-trust access is actually granted through, since FSPs land in domain-local groups and cannot be members of universal groups. Get-DomainForeignUser finds users belonging to groups outside their own domain (outgoing access), but reflects only intra-forest universal-group memberships (the memberOf backlink that replicates to the global catalog), so it will miss external/forest-trust FSP paths entirely.`,
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
    references: [{ label: 'PowerSploit, Get-DomainForeignGroupMember', url: 'https://powersploit.readthedocs.io/en/latest/Recon/Get-DomainForeignGroupMember/' }, { label: 'harmj0y, A Guide to Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' }],
    requires: ['Any valid domain account', 'At least one mapped trust'],
    opsec: 'LDAP group-membership enumeration blends with normal directory traffic; large global-catalog queries across many domains are the main signal. Read-only.',
  },
  {
    id: 'trust-modification',
    label: 'Domain Trust Modification',
    phase: 'persistence',
    needs: 'domain-admin',
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
      { label: 'CyberArk, Golden SAML: Newly Discovered Attack Technique Forges Authentication to Cloud Apps', url: 'https://www.cyberark.com/resources/threat-research-blog/golden-saml-newly-discovered-attack-technique-forges-authentication-to-cloud-apps' },
    ],
    requires: ['Domain Admin / write over the trustedDomain object (or AD FS admin)', 'A target domain/forest (existing or attacker-created)'],
    opsec: 'Trust creation/modification is a high-signal directory change (Event 4706 new trust, 4716 trusted-domain info modified, 4707 trust removed, and 5136 on trustedDomain objects; forest-trust entries add 4865/4866/4867). Disabling SID filtering or adding a federation cert is a strong, durable indicator. Defenders auditing trust topology will spot a new or loosened trust.',
  },
  {
    id: 'enterprise-admin',
    label: 'Enterprise Admin (Forest Root)',
    phase: 'domain-dominance',
    kind: 'goal',
    summary: '👑 Forest-root compromise: every domain in the forest.',
    description: r`The forest, not the domain, is Active Directory's true security boundary, and Enterprise Admins (a group in the forest-root domain) administer every domain inside it. Escalating beyond a single Domain Admin means crossing an intra-forest trust to the root: a golden/inter-realm ticket whose ExtraSids carries the root Enterprise Admins SID (<root-SID>-519), a child→parent SID-history hop, or a forged inter-realm referral ticket. From forest root you control every domain's krbtgt, every DC, and can establish persistence at forest scope. This is a distinct, higher goal than per-domain Domain Admin: a single forest can contain several Domain Admins (one per domain) but only one Enterprise Admins group, at the forest root.`,
    requires: ['A cross-trust escalation: inter-realm trust ticket, parent-child krbtgt, or SID-history injection into the forest root'],
    mitre: mitre('T1134.005'),
    references: [
      { label: 'harmj0y, A Guide to Attacking Domain Trusts', url: 'https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/' },
      { label: 'The Hacker Recipes, Domain trusts', url: 'https://www.thehacker.recipes/ad/movement/trusts/' },
    ],
  },
];

export const adTrustEdges: AttackEdge[] = [
  { source: 'ad-cat-enum', target: 'trust-enum', description: 'Indicators this path applies: a trustedDomain object exists under CN=System (nltest /domain_trusts or Get-ADTrust -Filter * returns one or more trusts); the trustDirection and trustAttributes flags are readable (WITHIN_FOREST 0x20, FOREST_TRANSITIVE 0x8, QUARANTINED_DOMAIN / SID-filtering 0x4, TREAT_AS_EXTERNAL 0x40), which decide whether SID history and cross-trust abuse are viable; BloodHound renders a domain-trust edge from the current domain.' },
  { source: 'ad-cat-trusts', target: 'trust-sid-history' },
  { source: 'trust-enum', target: 'trust-ticket', label: 'after domain compromise', description: 'Executing it needs the inter-realm trust key, recovered by DCSyncing the TRUSTEDDOMAIN$ account (Domain Admin), so it runs only after domain compromise, not straight from enumeration.' },
  { source: 'trust-enum', target: 'trust-sid-history', label: 'after child-domain DA', description: 'Executing it needs child-domain Domain Admin (the krbtgt key) to forge the inter-realm ticket, so it runs only after a child-domain compromise, not straight from enumeration.' },
  { source: 'trust-enum', target: 'trust-external-abuse', description: 'A domain-user-level move, not an escalation: reuse of credentials that overlap both domains, or a foreign principal that already holds rights in the trusting domain. Quarantine strips foreign SIDs, so no SID-history hop here.' },
  { source: 'trust-enum', target: 'trust-forest-abuse', description: 'A domain-user-level move: cross-forest Kerberoasting and abuse of foreign ACLs. SID filtering blocks cross-forest SID-history, so this does not reach forest-root compromise.' },
  { source: 'trust-enum', target: 'foreign-membership', description: 'Maps which foreign principals already hold rights across the trust. Any domain user can run it; it does not itself escalate.' },
  { source: 'dcsync', target: 'trust-ticket', label: 'trust account key' },
  // An inter-realm trust ticket grants DA in the TRUSTED domain (not necessarily the
  // forest root; that intra-forest child→root path is trust-sid-history).
  { source: 'trust-ticket', target: 'domain-admin', label: 'DA in trusted domain' },
  { source: 'trust-ticket', target: 'enterprise-admin', label: 'EA via ExtraSid 519 (intra-forest)' },
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
