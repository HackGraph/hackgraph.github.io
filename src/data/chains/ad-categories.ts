import type { AttackEdge, TechniqueNodeDef } from '../schema';

/**
 * Category (grouping) nodes that sit between the big decision hubs and their
 * techniques. The taxonomy is tactic-aligned and two-tier:
 *
 *   network-recon      -> No-Cred Enumeration | Poisoning & Relay | Quick Compromise
 *   valid-domain-creds -> Enumeration | Credential Access | Coercion | Privilege Escalation | Lateral Movement
 *   domain-admin       -> Persistence | Domain Trusts
 *   local-admin-host   -> Credential Dumping
 *
 * Note: the "Privilege Escalation" category is the repurposed `find-privesc-path`
 * node (defined in domain-dominance.ts) and the "Quick Compromise" category is
 * defined in ntlm-relay-cve.ts; both are referenced here by id.
 */
/** A category groups related techniques; its summary/description give the
 *  high-level "what lives in this folder" overview shown when it's selected. */
const cat = (
  id: string,
  label: string,
  phase: TechniqueNodeDef['phase'],
  summary: string,
  description: string,
): TechniqueNodeDef => ({ id, label, phase, kind: 'category', summary, description });

export const adCategoryNodes: TechniqueNodeDef[] = [
  // No-credentials branch (off network-recon)
  cat('ad-cat-noauth', 'No-Cred Enumeration', 'recon', 'Map the domain before you hold any account.', 'Reconnaissance from the network with no credentials. Enumerate valid usernames, cycle RIDs, and pull anonymous LDAP/SMB data to build a target list and find low-hanging accounts before you ever authenticate.'),
  cat('ad-cat-poisoning', 'Poisoning & Relay', 'initial-access', 'Capture or relay authentication off the wire.', 'Abuse broadcast name resolution (LLMNR/NBT-NS) and IPv6/DHCPv6 spoofing to coerce victims into authenticating to you, then crack the captured NetNTLM hashes offline or relay them straight to other hosts for code execution.'),
  // Valid-credentials branch (tactic folders)
  cat('ad-cat-enum', 'Enumeration', 'enumeration', 'Map attack paths from a domain foothold.', 'With a valid account, enumerate the directory — users, groups, ACLs, sessions, delegation — and let BloodHound turn that raw topology into the shortest path to privilege.'),
  cat('ad-cat-credaccess', 'Credential Access', 'credential-access', 'Harvest more — and better — credentials.', 'Collect additional secrets you can authenticate with: roastable Kerberos tickets, GPP passwords left in SYSVOL, and AD-managed secrets like LAPS and gMSA — widening access toward higher-privileged accounts.'),
  cat('ad-cat-coercion', 'Coercion & Forced Auth', 'credential-access', 'Make a victim authenticate to you.', 'Force a machine or user account to authenticate to an attacker-controlled host (PetitPotam, PrinterBug, WebDAV, malicious files), then relay or capture that authentication — frequently a Domain Controller machine account.'),
  cat('ad-cat-roasting', 'Kerberos Roasting', 'credential-access', 'Request offline-crackable Kerberos tickets.', 'Abuse Kerberos for crackable material: Kerberoasting pulls TGS-REP hashes for accounts with SPNs, and AS-REP roasting targets accounts with pre-authentication disabled.'),
  cat('ad-cat-managed-secrets', 'Managed Secrets (LAPS/gMSA)', 'credential-access', 'Read AD-rotated local-admin & service secrets.', 'Recover secrets that Active Directory stores and rotates — LAPS local-administrator passwords and gMSA managed-account passwords — wherever your principal holds the right to read them.'),
  cat('ad-cat-dacl', 'DACL / ACL Abuse', 'priv-esc', 'Abuse object permissions to seize principals.', 'Exploit misconfigured ACEs on AD objects — GenericAll/GenericWrite, WriteDACL, ForceChangePassword, AddMember, WriteOwner — to take over users, groups, and computers and walk the permission graph toward Domain Admin.'),
  cat('ad-cat-adcs', 'AD CS Abuse', 'priv-esc', 'Turn the PKI into a privesc engine.', 'Abuse Active Directory Certificate Services. Vulnerable templates and CA misconfigurations (the ESC1–ESC16 family) let you enroll certificates that authenticate as any account, up to Domain Admin.'),
  cat('ad-cat-adcs-template', 'Vulnerable Templates', 'priv-esc', 'Enrollment-based ESC1-class template abuse.', 'Certificate templates that let a low-privileged user request a cert for an arbitrary identity — supplying a SAN, off-template EKUs, or relying on weak mappings (ESC1/2/3/4/9/13/15) — yielding authentication as a higher-privileged principal.'),
  cat('ad-cat-adcs-ca', 'CA, Relay & Forging', 'priv-esc', 'Attack the CA host, relay, and forge certs.', 'Go after the PKI infrastructure itself: relay to the web-enrollment endpoint (ESC8), abuse CA settings (ESC6/7), take over the CA host (ESC5), or forge certificates outright with a stolen CA key (Golden Certificate).'),
  cat('ad-cat-delegation', 'Kerberos Delegation', 'lateral-movement', 'Abuse delegation to impersonate users.', 'Exploit Kerberos delegation — unconstrained, constrained (S4U2Proxy), and resource-based constrained (RBCD) — to impersonate arbitrary users, including Domain Admins, to target services.'),
  cat('ad-cat-cve', 'Critical CVEs', 'priv-esc', 'High-impact named vulnerabilities.', 'Patchable but devastating flaws that often shortcut straight to SYSTEM or Domain Admin on an unpatched host — ZeroLogon, PrintNightmare, noPac, MS14-068, Certifried, PrivExchange.'),
  cat('ad-cat-lateral', 'Lateral Movement', 'lateral-movement', 'Reuse credentials to spread across hosts.', 'Move between machines with harvested credentials — pass-the-hash, overpass-the-hash, pass-the-ticket — via remote execution over SMB (PsExec/SMBExec/scheduled tasks), WMI, DCOM, WinRM, RDP and SSH, plus service-layer pivots through MSSQL and SCCM.'),
  cat('ad-cat-mssql', 'MSSQL Abuse', 'lateral-movement', 'Pivot through SQL Server.', 'Abuse MSSQL access — xp_cmdshell for OS command execution, database/login impersonation, and linked-server chains — to run as the service account or hop to other servers.'),
  cat('ad-cat-sccm', 'SCCM / MECM', 'lateral-movement', 'Abuse the software-deployment platform.', 'Target Configuration Manager: recover network-access-account credentials, abuse client-push and NTLM relay to take over clients or the site server, and deploy applications as SYSTEM across the estate.'),
  cat('ad-cat-deploy-abuse', 'Deployment Platform Abuse', 'lateral-movement', 'Push code to the whole estate via a management platform.', 'Central deployment, monitoring, and configuration-management platforms push software and run scripts on every endpoint they manage — abuse one you can reach to execute as a service account (often SYSTEM/root) across the estate at once. Splunk forwarders, Ansible/Salt/Puppet, and RMM suites (PDQ, Tanium, ManageEngine, Intune) are common targets; the Microsoft-native equivalents, SCCM and WSUS, live in their own branches.'),
  cat('ad-cat-account-abuse', 'Account & Group Abuse', 'priv-esc', 'Manipulate accounts, groups, and quotas.', 'Abuse the right to create or modify principals — machine-account-quota computer creation, dMSA (BadSuccessor), and adding yourself to privileged groups — to gain or persist privilege.'),
  // Post-exploitation branches
  cat('ad-cat-cred-dump', 'Credential Dumping', 'credential-access', 'Extract secrets from a compromised host.', 'From local admin / SYSTEM, dump credential material — LSASS memory, SAM/LSA secrets, DPAPI, app and browser secrets — and, with replication rights, the DC\'s entire credential store.'),
  // Credential-dumping sub-groups by source (DC dumping is red — it needs DA / replication rights)
  cat('ad-cat-host-dump', 'Host & LSASS Secrets', 'credential-access', 'Dump in-memory and on-disk host secrets.', 'Harvest credentials cached on a host you own — LSASS memory (hashes, tickets, sometimes cleartext), the local SAM/LSA secrets, and PPL/WDigest tricks to defeat protections.'),
  cat('ad-cat-user-secrets', 'App & User Secrets', 'credential-access', 'Loot application and user-stored secrets.', 'Recover secrets stashed by users and apps — DPAPI-protected blobs, KeePass databases, saved browser logins and cookies, and live RDP sessions to hijack.'),
  cat('ad-cat-dc-dump', 'DC Credential Dumping', 'domain-dominance', 'Pull every secret from a Domain Controller.', 'With DA or replication rights, extract the domain\'s entire credential store — DCSync over DRSUAPI replication, or an offline NTDS.dit dump — including the all-powerful krbtgt key.'),
  cat('ad-cat-trusts', 'Domain Trusts', 'domain-dominance', 'Cross domain & forest trust boundaries.', 'Enumerate and abuse trust relationships — inter-realm tickets, intra-forest SID-history hopping, and external/forest-trust access paths — to pivot between domains and reach the forest root.'),
  cat('ad-cat-persistence', 'Persistence', 'persistence', 'Survive remediation with durable access.', 'Establish footholds that outlive password resets and re-imaging — AdminSDHolder, DSRM, DCShadow, Skeleton Key, golden/silver tickets, and certificate-based backdoors.'),
];

export const adCategoryEdges: AttackEdge[] = [
  // ── No credentials (off network-recon) ──────────────────────────────────
  { source: 'network-recon', target: 'ad-cat-noauth' },
  { source: 'network-recon', target: 'ad-cat-poisoning' },
  { source: 'ad-cat-noauth', target: 'username-enum-kerbrute' },
  { source: 'ad-cat-noauth', target: 'rid-cycling' },
  { source: 'ad-cat-noauth', target: 'anon-ldap-dump' },
  { source: 'ad-cat-poisoning', target: 'llmnr-poisoning' },
  { source: 'ad-cat-poisoning', target: 'mitm6-relay' },
  // (network-recon -> ad-cat-quick-compromise wired in ntlm-relay-cve.ts)

  // ── Valid credentials: tactic folders ───────────────────────────────────
  { source: 'valid-domain-creds', target: 'ad-cat-enum' },
  { source: 'valid-domain-creds', target: 'ad-cat-credaccess' },
  { source: 'valid-domain-creds', target: 'ad-cat-coercion' },
  { source: 'valid-domain-creds', target: 'find-privesc-path' }, // Privilege Escalation
  { source: 'valid-domain-creds', target: 'ad-cat-lateral' },

  // Enumeration (BloodHound is a leaf here — it informs, it doesn't gate)
  { source: 'ad-cat-enum', target: 'bloodhound-recon' },
  { source: 'ad-cat-enum', target: 'domain-object-enum' },
  { source: 'domain-object-enum', target: 'find-privesc-path', label: 'found a path' },

  // Credential Access
  { source: 'ad-cat-credaccess', target: 'ad-cat-roasting' },
  { source: 'ad-cat-credaccess', target: 'gpp-cpassword' },
  { source: 'ad-cat-credaccess', target: 'ad-cat-managed-secrets' },
  { source: 'ad-cat-roasting', target: 'kerberoasting' },
  { source: 'ad-cat-roasting', target: 'asrep-roasting' },
  { source: 'ad-cat-managed-secrets', target: 'laps-read' },
  { source: 'ad-cat-managed-secrets', target: 'gmsa-read' },

  // Coercion & Forced Auth — "make a victim authenticate to me" (then relay/capture)
  { source: 'ad-cat-coercion', target: 'coerced-auth' },
  { source: 'ad-cat-coercion', target: 'webclient-coercion' },
  { source: 'ad-cat-coercion', target: 'ntlm-theft-files' },
  // passback (printer/MFP/app default creds → redirect its stored creds to you) needs
  // only device access, not a domain account — it's a no-cred recon foothold.
  { source: 'network-recon', target: 'passback-attack' },

  // Privilege Escalation (find-privesc-path category)
  { source: 'find-privesc-path', target: 'ad-cat-dacl' },
  { source: 'find-privesc-path', target: 'ad-cat-adcs' },
  { source: 'find-privesc-path', target: 'ad-cat-delegation' },
  { source: 'find-privesc-path', target: 'ad-cat-cve' },
  { source: 'find-privesc-path', target: 'ad-cat-account-abuse' },
  // Account / group manipulation primitives (MAQ is a generic enabler, not a delegation-only thing)
  { source: 'ad-cat-account-abuse', target: 'machineaccountquota-abuse' },
  { source: 'ad-cat-account-abuse', target: 'badsuccessor-dmsa' },
  { source: 'ad-cat-account-abuse', target: 'ad-cat-priv-groups' },
  { source: 'ad-cat-dacl', target: 'acl-genericall' },
  { source: 'ad-cat-dacl', target: 'acl-genericwrite' },
  { source: 'ad-cat-dacl', target: 'acl-forcechangepassword' },
  { source: 'ad-cat-dacl', target: 'acl-addself-group' },
  { source: 'ad-cat-dacl', target: 'gpo-abuse' },
  // AD CS — split into template-enrollment abuse vs CA/infra/relay/forging
  { source: 'ad-cat-adcs', target: 'ad-cat-adcs-template' },
  { source: 'ad-cat-adcs', target: 'ad-cat-adcs-ca' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc1' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc2' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc3' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc4' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc9' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc13' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc15' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc5' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc6' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc7' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc8' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc10' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc11' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc16' },
  { source: 'ad-cat-adcs-ca', target: 'golden-certificate' },
  { source: 'ad-cat-delegation', target: 'unconstrained-delegation' },
  { source: 'ad-cat-delegation', target: 'constrained-delegation' },
  { source: 'ad-cat-delegation', target: 'rbcd' },
  { source: 'ad-cat-cve', target: 'nopac' },
  { source: 'ad-cat-cve', target: 'printnightmare' },
  { source: 'ad-cat-cve', target: 'ms14-068' },
  { source: 'ad-cat-cve', target: 'certifried' },
  { source: 'ad-cat-cve', target: 'privexchange' },

  // Lateral Movement — credential reuse + remote execution + service abuse
  { source: 'ad-cat-lateral', target: 'pass-the-hash' },
  { source: 'ad-cat-lateral', target: 'overpass-the-hash' },
  { source: 'ad-cat-lateral', target: 'pass-the-ticket' },
  { source: 'ad-cat-lateral', target: 'lateral-movement-cme' }, // "Remote Execution" -> WinRM/WMI/DCOM
  { source: 'ad-cat-lateral', target: 'ad-cat-mssql' },
  { source: 'ad-cat-lateral', target: 'ad-cat-sccm' },
  { source: 'ad-cat-lateral', target: 'ad-cat-deploy-abuse' },
  { source: 'ad-cat-mssql', target: 'mssql-linked-servers' },

  // ── Domain Admin: persistence + trusts ──────────────────────────────────
  { source: 'domain-admin', target: 'ad-cat-trusts' },
  { source: 'domain-admin', target: 'ad-cat-persistence' },
  { source: 'ad-cat-persistence', target: 'adminsdholder' },
  { source: 'ad-cat-persistence', target: 'dsrm' },
  { source: 'ad-cat-persistence', target: 'dcshadow' },
  { source: 'ad-cat-persistence', target: 'skeleton-key' },

  // ── Local admin on a host: credential dumping ───────────────────────────
  { source: 'local-admin-host', target: 'ad-cat-cred-dump' },
  // Grouped by source. Host & user secrets need local admin; DC dumping needs
  // DA / replication rights (noted on the dcsync & ntds-dump nodes).
  { source: 'ad-cat-cred-dump', target: 'ad-cat-host-dump' },
  { source: 'ad-cat-cred-dump', target: 'ad-cat-user-secrets' },
  { source: 'ad-cat-cred-dump', target: 'ad-cat-dc-dump' },
  { source: 'ad-cat-host-dump', target: 'dump-lsass' },
  { source: 'ad-cat-host-dump', target: 'sam-lsa-dump' },
  { source: 'ad-cat-host-dump', target: 'lsass-ppl-bypass' },
  { source: 'ad-cat-host-dump', target: 'wdigest-downgrade' },
  { source: 'ad-cat-user-secrets', target: 'dpapi-user-secrets' },
  { source: 'ad-cat-user-secrets', target: 'keepass-extract' },
  { source: 'ad-cat-user-secrets', target: 'rdp-session-hijack' },
  // DCSync holds the DC-side dumping (DA / replication rights required).
  { source: 'ad-cat-dc-dump', target: 'dcsync' },
  { source: 'ad-cat-dc-dump', target: 'ntds-dump' },
];
