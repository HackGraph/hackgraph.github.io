import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { cat } from '../lib';

/**
 * Category (grouping) nodes that sit between the big decision hubs and their
 * techniques. The taxonomy is tactic-aligned and two-tier:
 *
 *   network-recon      -> No-Cred Enumeration | Poisoning & Relay | Quick Compromise | Exposed Services & Apps
 *   valid-domain-creds -> Enumeration | Credential Access | Coercion | Privilege Escalation | Lateral Movement
 *   domain-admin       -> Persistence | Domain Trusts
 *   local-admin-host   -> Credential Dumping
 *
 * Note: the "Privilege Escalation" category is the repurposed `find-privesc-path`
 * node (defined in domain-dominance.ts) and the "Quick Compromise" category is
 * defined in ntlm-relay-cve.ts; both are referenced here by id.
 */
export const adCategoryNodes: TechniqueNodeDef[] = [
  // No-credentials branch (off network-recon)
  cat('ad-cat-noauth', 'No-Cred Enumeration', 'recon', 'Map the domain before you hold any account.', 'Reconnaissance from the network with no credentials. Enumerate valid usernames, cycle RIDs, and pull anonymous LDAP/SMB data to build a target list and find low-hanging accounts before you ever authenticate.'),
  cat('ad-cat-poisoning', 'Poisoning & Relay', 'initial-access', 'Capture or relay authentication from network traffic.', 'Abuse multicast/broadcast name resolution (LLMNR/NBT-NS/mDNS) and IPv6/DHCPv6 spoofing to coerce victims into authenticating to you, then crack the captured NetNTLM hashes offline or relay them straight to other hosts for code execution.'),
  cat('ad-cat-services', 'Exposed Services & Apps', 'initial-access', 'Foothold via an exposed service, device, or app, no domain creds.', 'Turn network-reachable, unauthenticated attack surface into a foothold or credentials: printer/MFP/app pass-back (redirect stored LDAP/SMTP creds to you), internal web apps (Jenkins, GitLab, Tomcat, Splunk) with default creds or RCE, weak or legacy protocols (FTP, Telnet, NFS, SNMP, rsync, VNC), and anonymous or guest-readable SMB shares. None of these need a domain account.'),
  // Valid-credentials branch (tactic folders)
  cat('ad-cat-enum', 'Enumeration', 'enumeration', 'Map attack paths from a domain foothold.', 'With a valid account, enumerate the directory (users, groups, ACLs, sessions, delegation) and run BloodHound to find the shortest path to privilege.'),
  cat('ad-cat-credaccess', 'Credential Access', 'credential-access', 'Harvest more (and better) credentials.', 'Collect more secrets you can authenticate with: roastable Kerberos tickets, GPP passwords left in SYSVOL, and AD-managed secrets like LAPS and gMSA. These widen access toward higher-privileged accounts.'),
  cat('ad-cat-coercion', 'Coercion & Forced Auth', 'credential-access', 'Make a victim authenticate to you.', 'Force a machine or user account to authenticate to an attacker-controlled host (PetitPotam, PrinterBug, WebDAV, malicious files), then relay or capture that authentication, frequently from a Domain Controller machine account.'),
  cat('ad-cat-roasting', 'Kerberos Roasting', 'credential-access', 'Request offline-crackable Kerberos tickets.', 'Abuse Kerberos for crackable material: Kerberoasting pulls TGS-REP hashes for accounts with SPNs, and AS-REP roasting targets accounts with pre-authentication disabled.'),
  cat('ad-cat-managed-secrets', 'Managed Secrets (LAPS/gMSA)', 'credential-access', 'Read AD-rotated local-admin & service secrets.', 'Recover secrets that Active Directory stores and rotates (LAPS local-administrator passwords and gMSA managed-account passwords) wherever your principal holds the right to read them.'),
  cat('ad-cat-dacl', 'DACL / ACL Abuse', 'priv-esc', 'Abuse object permissions to seize principals.', 'Exploit misconfigured ACEs on AD objects (GenericAll/GenericWrite, WriteDACL, WriteOwner, ForceChangePassword, AddMember, replication rights, read LAPS, GPO control) to take over users, groups, and computers and walk the permission graph toward Domain Admin. Effective rights include those the groups you belong to hold, not just your own account.'),
  cat('ad-cat-adcs', 'AD CS Abuse', 'priv-esc', 'Turn the PKI into a privesc engine.', 'Abuse Active Directory Certificate Services. Vulnerable templates and CA misconfigurations (the ESC1-ESC16 family) let you enroll certificates that authenticate as any account, up to Domain Admin.'),
  cat('ad-cat-adcs-template', 'Vulnerable Templates', 'priv-esc', 'Enrollment-based ESC1-class template abuse.', 'Certificate templates that let a low-privileged user request a cert for an arbitrary identity by supplying a SAN, off-template EKUs, or weak mappings (ESC1/2/3/4/9/13/15). The resulting cert authenticates as, or is granted the privileges of, a higher-privileged principal or group.'),
  cat('ad-cat-adcs-ca', 'CA, Relay & Forging', 'priv-esc', 'Attack the CA host, relay, and forge certs.', 'Go after the PKI infrastructure itself: relay to the web-enrollment endpoint (ESC8), abuse CA settings (ESC6/7), take over the CA host (ESC5), or forge certificates outright with a stolen CA key (Golden Certificate).'),
  cat('ad-cat-delegation', 'Kerberos Delegation', 'priv-esc', 'Abuse delegation to impersonate users.', 'Exploit Kerberos delegation in its unconstrained, constrained (S4U2Proxy), and resource-based constrained (RBCD) forms to impersonate arbitrary users, including Domain Admins, to target services.'),
  cat('ad-cat-cve', 'Critical CVEs', 'priv-esc', 'High-impact named vulnerabilities.', 'Patchable flaws that often shortcut straight to SYSTEM or Domain Admin on an unpatched host: ZeroLogon, PrintNightmare, noPac, MS14-068, Certifried, PrivExchange.'),
  cat('ad-cat-lateral', 'Lateral Movement', 'lateral-movement', 'Reuse credentials to spread across hosts.', 'Move between machines with harvested credentials (pass-the-hash, overpass-the-hash, pass-the-ticket) via remote execution over SMB (PsExec/SMBExec/scheduled tasks), WMI, DCOM, WinRM, RDP and SSH, plus service-layer pivots through MSSQL and SCCM.'),
  cat('ad-cat-cred-reuse', 'Credential Reuse', 'lateral-movement', 'Authenticate as the account with stolen secrets.', 'Reuse harvested credential material without the cleartext: replay an NT hash (pass-the-hash), turn a hash or key into a Kerberos TGT (overpass-the-hash), inject a stolen or forged ticket (pass-the-ticket), or RDP in with Restricted Admin mode. Each authenticates you as the account and runs code on the target host.'),
  cat('ad-cat-mssql', 'MSSQL Abuse', 'lateral-movement', 'Pivot through SQL Server.', 'Abuse MSSQL access (xp_cmdshell for OS command execution, database/login impersonation, and linked-server chains) to run as the service account or hop to other servers.'),
  cat('ad-cat-sccm', 'SCCM / MECM', 'lateral-movement', 'Abuse the software-deployment platform.', 'Target Configuration Manager: recover network-access-account credentials, abuse client-push and NTLM relay to take over clients or the site server, and deploy applications as SYSTEM across the estate.'),
  cat('ad-cat-deploy-abuse', 'Deployment Platform Abuse', 'lateral-movement', 'Push code to the whole estate via a management platform.', 'Central deployment, monitoring, and configuration-management platforms push software and run scripts on every endpoint they manage, so abusing one you can reach lets you execute as a service account (often SYSTEM/root) across the estate at once. Splunk forwarders, Ansible/Salt/Puppet, and RMM suites (PDQ, Tanium, ManageEngine, Intune) are common targets; the Microsoft-native equivalents, SCCM and WSUS, are covered separately.'),
  // Service & Platform Abuse: wraps the server-side service / management-platform pivots.
  cat('ad-cat-platform', 'Service & Platform Abuse', 'lateral-movement', 'Abuse a privileged server-side service or management platform to spread.', 'Turn a database service (MSSQL), a software-deployment platform (SCCM/MECM), or a config-management / RMM suite (Splunk, Ansible, Salt) against the estate: run code as the service account, or push it to every host they manage.'),
  // Remote Execution transport groups (under lateral-movement-cme), by mechanism.
  cat('lat-cat-smb', 'SMB Service Exec', 'lateral-movement', 'Run code via an SMB service; lands SYSTEM.', 'PsExec / SMBExec / scheduled-task execution over SMB (445): create or trigger a service or task that runs your command as SYSTEM. All require local admin on the target over SMB. PsExec drops a service binary to ADMIN$; SMBExec writes its command output to C$ and drops no payload binary; scheduled-task exec runs via the Task Scheduler RPC (ATSVC over IPC$) and needs no writable ADMIN$.'),
  cat('lat-cat-wmidcom', 'WMI / DCOM', 'lateral-movement', 'Semi-interactive execution over WMI or DCOM.', 'Run commands through WMI (135/DCOM) or a DCOM object such as MMC20.Application: needs local admin and RPC/DCOM reachable, and drops no service binary, so it is quieter than PsExec.'),
  cat('lat-cat-logon', 'Interactive Logon', 'lateral-movement', 'Log on over WinRM, RDP, or SSH.', 'Open a session with a remote-access right: WinRM (5985/5986) for a PowerShell shell, RDP (3389) for a desktop, or SSH (22). The privilege you land with depends on the account.'),
  cat('lat-cat-shell', 'Shells & Breakouts', 'lateral-movement', 'Turn code exec into a session, or break out of a constrained one.', 'Catch a reverse or bind shell from a code-execution primitive, or escape a constrained JEA endpoint to its RunAs identity, when a clean credentialed logon is not available.'),
  cat('ad-cat-account-abuse', 'Account & Group Abuse', 'priv-esc', 'Manipulate accounts, groups, and quotas.', 'Abuse the right to create or modify principals to gain or persist privilege: machine-account-quota computer creation, dMSA (BadSuccessor), and adding yourself to privileged groups.'),
  // ACL abuse grouped by the TARGET object you control (object-first framing).
  cat('acl-tgt-control', 'Control-Granting Rights', 'priv-esc', 'Rights that hand you write access over an object, whatever its type.', 'Rights that give you control regardless of target type: GenericAll (full control), GenericWrite (attribute writes only, not the DACL or owner), WriteOwner (take ownership, then rewrite the DACL), and WriteDACL (grant yourself GenericAll or replication rights). Once you hold one, the abuse depends on the object type.'),
  cat('acl-tgt-user', 'Over a User', 'priv-esc', 'Rights over a user account: reset it, forge creds, or roast it.', 'With GenericAll, GenericWrite, or a targeted right over a USER object: reset its password (ForceChangePassword), add a shadow credential (msDS-KeyCredentialLink), set an SPN to Kerberoast it, flip DONT_REQ_PREAUTH to AS-REP roast it, hijack its logon script (scriptPath), or fix its account state into a usable credential.'),
  cat('acl-tgt-computer', 'Over a Computer', 'priv-esc', 'Rights over a computer account: impersonate to it or read its secrets.', 'With a right over a COMPUTER object, the abuse depends on which right you hold. Configure resource-based constrained delegation to impersonate any user to it by writing msDS-AllowedToActOnBehalfOfOtherIdentity (GenericAll, GenericWrite, WriteDACL, WriteAccountRestrictions, or AddAllowedToAct). Add a shadow credential to authenticate as it by writing msDS-KeyCredentialLink (GenericAll or GenericWrite). Read the LAPS local-admin password stored on this computer with Control Access / All Extended Rights (GenericAll or an explicit read right, not plain GenericWrite); if this computer is authorized to retrieve a gMSA, act as it (pivot via shadow creds or RBCD) and read that gMSA\'s password, which lives on the separate gMSA account object. AddAllowedToAct only yields RBCD. Delegation is what sets computers apart from users here.'),
  cat('acl-tgt-group', 'Over a Group', 'priv-esc', 'Rights over a group: add yourself to inherit its access.', 'With AddMember/AddSelf, GenericWrite, or GenericAll over a GROUP: add yourself or a controlled principal as a member to inherit whatever the group holds, including a further ACL over downstream objects or membership of a privileged group.'),
  cat('acl-tgt-policy', 'Over a GPO, OU or Domain', 'priv-esc', 'Rights over policy objects or the domain: push code or replicate secrets.', 'With control over a Group Policy Object, an OU, or the domain object: edit a writable GPO to run a task or script on every host it applies to, link a malicious GPO to an OU (gPLink), or use replication rights (DS-Replication-Get-Changes and DS-Replication-Get-Changes-All) to DCSync the domain.'),
  // Persistence grouped by mechanism.
  cat('persist-forgery', 'Offline Credential Forgery', 'persistence', 'Forge tickets or derive account secrets offline.', 'Sapphire tickets forge Kerberos tickets from the krbtgt key, valid until krbtgt is reset twice; Golden gMSA derives gMSA account passwords offline from the KDS root key, which is effectively never rotated.'),
  cat('persist-implant', 'DC-Resident Implants', 'persistence', 'Domain-persistence tradecraft against a Domain Controller.', 'Patch or register code on a DC: Skeleton Key (patches LSASS), a DSRM backdoor, or a malicious Security Support Provider that logs credentials. DCShadow is grouped here too but works differently: it abuses AD replication from a transient rogue DC to push changes to a real one, rather than persisting code on the DC.'),
  cat('persist-backdoor', 'ACL & Rights Backdoors', 'persistence', 'Durable rights stamped into the directory or a host.', 'AdminSDHolder rights, host security-descriptor backdoors (DAMP), or an attacker-controlled computer account keep quiet access, often with no new user account or group change.'),
  cat('persist-fed', 'Federation, Certs & Secrets', 'persistence', 'Token, certificate, and key-material persistence.', 'Forge SAML tokens (Golden SAML), enroll a long-lived client-auth certificate, or steal the domain DPAPI backup key.'),
  // Critical CVEs grouped by attack surface.
  cat('cvegrp-kerberos', 'Kerberos / Directory CVEs', 'priv-esc', 'Kerberos and directory protocol flaws.', 'noPac, MS14-068, Certifried, and NTLM Reflection abuse Kerberos or directory flaws to impersonate a DC (noPac, Certifried), forge a privileged PAC (MS14-068), or relay a coerced host\'s authentication back to itself for local SYSTEM (NTLM Reflection).'),
  cat('cvegrp-exchange', 'Exchange CVEs', 'priv-esc', 'On-prem Exchange flaws.', 'PrivExchange and ProxyNotShell abuse on-prem Exchange for relay-to-DCSync or authenticated RCE.'),
  cat('cvegrp-smbprint', 'SMB / Print CVEs', 'priv-esc', 'SMB and Print Spooler flaws.', 'SMBGhost (SMBv3 compression RCE) and PrintNightmare (Print Spooler driver load) reach SYSTEM on unpatched hosts.'),
  // Privileged groups grouped by type.
  cat('pgcat-ops', 'AD Operators', 'priv-esc', 'Built-in *Operators groups.', 'Membership in Account, Server, or Backup Operators grants rights on Domain Controllers that convert to domain compromise.'),
  cat('pgcat-service', 'Service & Directory Roles', 'priv-esc', 'Role-installed and directory groups.', 'DnsAdmins (load a DLL into the DNS service), Cert Publishers (PKI), and Schema Admins (forest schema) each hold a role-specific path to privilege.'),
  cat('pgcat-deploy', 'Deployment Admins', 'priv-esc', 'Deployment-platform admin groups and roles.', 'WSUS and SCCM administrators can push code as SYSTEM to every managed host.'),
  // Post-exploitation branches
  cat('ad-cat-cred-dump', 'Credential Dumping', 'credential-access', 'Extract secrets from a compromised host.', 'From local admin / SYSTEM, dump credential material such as LSASS memory, SAM/LSA secrets, DPAPI, and app and browser secrets, plus, with replication rights, the DC\'s entire credential store.'),
  // Credential-dumping sub-groups by source (DC dumping is red because it needs DA / replication rights)
  cat('ad-cat-host-dump', 'Host & LSASS Secrets', 'credential-access', 'Dump in-memory and on-disk host secrets.', 'Harvest credentials cached on a host you own: LSASS memory (hashes, tickets, sometimes cleartext), the local SAM/LSA secrets, and PPL/WDigest tricks to defeat protections.'),
  cat('ad-cat-user-secrets', 'App & User Secrets', 'credential-access', 'Loot application and user-stored secrets.', 'Recover secrets stashed by users and apps: DPAPI-protected blobs, KeePass databases, saved browser logins and cookies, and live RDP sessions to hijack.'),
  cat('ad-cat-dc-dump', 'DC Credential Dumping', 'domain-dominance', 'Pull secrets straight from a Domain Controller.', 'With DA or replication rights, the DCSync and NTDS.dit paths extract the domain\'s entire credential store (DCSync over DRSUAPI replication, or an offline NTDS.dit dump), including the krbtgt key; the RODC KeyList path is bounded to the secrets the RODC is allowed to reveal.'),
  cat('ad-cat-trusts', 'Domain Trusts', 'domain-dominance', 'Cross domain & forest trust boundaries.', 'Enumerate and abuse trust relationships (inter-realm tickets, intra-forest SID-history hopping, and external/forest-trust access paths) to pivot between domains and reach the forest root.'),
  cat('ad-cat-persistence', 'Persistence', 'persistence', 'Survive remediation with durable access.', 'Establish footholds that outlive password resets and re-imaging: AdminSDHolder, DSRM, DCShadow, Skeleton Key, golden/silver tickets, and certificate-based backdoors.'),
];

export const adCategoryEdges: AttackEdge[] = [
  // ── No credentials (off network-recon) ──────────────────────────────────
  { source: 'network-recon', target: 'ad-cat-noauth' },
  { source: 'network-recon', target: 'ad-cat-poisoning' },
  { source: 'network-recon', target: 'ad-cat-services' },
  { source: 'ad-cat-noauth', target: 'username-enum-kerbrute', description: 'Indicators this path applies: a KDC reachable on TCP/UDP 88; an AS-REQ for an invalid principal returns KDC_ERR_C_PRINCIPAL_UNKNOWN while a valid one returns KDC_ERR_PREAUTH_REQUIRED or an AS-REP; kerbrute prints VALID USERNAME lines.' },
  { source: 'ad-cat-noauth', target: 'rid-cycling' },
  { source: 'ad-cat-noauth', target: 'rpc-null-enum' },
  { source: 'ad-cat-noauth', target: 'smtp-user-enum' },
  { source: 'ad-cat-noauth', target: 'anon-ldap-dump', description: 'Indicators this path applies: TCP 389/636/3268/3269 open on a Windows DC; RootDSE base-scope query returns namingContexts without a bind (anonymous bind permitted); ldapsearch -x (simple/anonymous) returns results instead of \'operationsError\' / \'inappropriateAuthentication\'.' },
  { source: 'ad-cat-poisoning', target: 'llmnr-poisoning', description: 'Indicators this path applies: Responder prints [SMB] NTLMv2-SSP Hash : or an [HTTP] NTLMv2 client capture; the captured value is formatted user::DOMAIN:challenge:NTproof:blob (NetNTLMv2); a poisoned answer is logged for an LLMNR/NBT-NS/mDNS name query on the attacker interface.' },
  { source: 'ad-cat-poisoning', target: 'mitm6-relay' },
  // (network-recon -> ad-cat-quick-compromise wired in ntlm-relay-cve.ts)

  // ── Valid credentials: tactic folders ───────────────────────────────────
  { source: 'valid-domain-creds', target: 'ad-cat-enum' },
  { source: 'valid-domain-creds', target: 'ad-cat-credaccess' },
  { source: 'valid-domain-creds', target: 'ad-cat-coercion' },
  { source: 'valid-domain-creds', target: 'find-privesc-path' }, // Privilege Escalation
  { source: 'valid-domain-creds', target: 'ad-cat-lateral' },

  // Enumeration (BloodHound is a leaf here: it informs, it doesn't gate)
  { source: 'ad-cat-enum', target: 'bloodhound-recon' },
  { source: 'ad-cat-enum', target: 'domain-object-enum', description: 'Indicators this path applies: net group /domain output enumerating domain groups; net group \'<GroupName>\' /domain listing a single group\'s members; net user <user> /domain showing \'Global Group memberships\'/\'Local Group Memberships\'.' },
  { source: 'domain-object-enum', target: 'find-privesc-path', label: 'found a path' },

  // Credential Access
  { source: 'ad-cat-credaccess', target: 'ad-cat-roasting' },
  { source: 'ad-cat-credaccess', target: 'gpp-cpassword' },
  { source: 'ad-cat-credaccess', target: 'ad-cat-managed-secrets' },
  { source: 'ad-cat-roasting', target: 'kerberoasting', description: 'Indicators this path applies: a BloodHound GenericWrite/GenericAll/WriteSPN edge from a controlled principal to a target user; an empty servicePrincipalName on a writable user; a $krb5tgs$23$ TGS-REP returned for an account that does not normally run a service.' },
  { source: 'ad-cat-roasting', target: 'asrep-roasting', description: 'Indicators this path applies: the DONT_REQ_PREAUTH flag set in userAccountControl on a user; the KDC issues an AS-REP with no PA-ENC-TIMESTAMP challenge; GetNPUsers or --asreproast returns a $krb5asrep$23$<user>@<REALM> hash.' },
  { source: 'ad-cat-managed-secrets', target: 'laps-read', description: 'Indicators this path applies: the ms-Mcs-AdmPwd (or msLAPS-Password / msLAPS-EncryptedPassword) attribute is readable on a computer object; a ReadLAPSPassword or All-extended-rights / GenericAll edge over the computer in BloodHound; ms-Mcs-AdmPwdExpirationTime is populated.' },
  { source: 'ad-cat-managed-secrets', target: 'gmsa-read', description: 'Indicators this path applies: the account class is msDS-GroupManagedServiceAccount with a name ending in $; a BloodHound ReadGMSAPassword edge from a controlled principal; the msDS-ManagedPassword attribute returns (is not access-denied) for the target.' },

  // Coercion & Forced Auth: "make a victim authenticate to me" (then relay/capture)
  { source: 'ad-cat-coercion', target: 'coerced-auth' },
  { source: 'ad-cat-coercion', target: 'webclient-coercion' },
  { source: 'ad-cat-coercion', target: 'ntlm-theft-files' },
  // Exposed services & apps: unauthenticated footholds grouped under one folder so
  // network-recon fans into uniform category folders, not a mix of folders + leaves.
  { source: 'ad-cat-services', target: 'passback-attack' },

  // Privilege Escalation (find-privesc-path category)
  { source: 'find-privesc-path', target: 'ad-cat-dacl' },
  { source: 'find-privesc-path', target: 'ad-cat-adcs' },
  { source: 'find-privesc-path', target: 'ad-cat-delegation' },
  { source: 'find-privesc-path', target: 'ad-cat-cve' },
  { source: 'find-privesc-path', target: 'ad-cat-account-abuse' },
  // Account / group manipulation primitives (MAQ is a generic enabler, not a delegation-only thing)
  { source: 'ad-cat-account-abuse', target: 'machineaccountquota-abuse', description: 'Indicators this path applies: ms-DS-MachineAccountQuota greater than 0 on the domain head; a new objectClass=computer principal can be created (addcomputer / New-MachineAccount) with a sAMAccountName ending in $; ms-DS-CreatorSID on the new object equals a non-admin attacker SID.' },
  { source: 'ad-cat-account-abuse', target: 'badsuccessor-dmsa', description: 'Indicators this path applies: CreateChild / write access over an OU or container that can hold dMSA (msDS-DelegatedManagedServiceAccount) objects; at least one Windows Server 2025 DC present (adds the dMSA class and the KDC successor codepath), no raised domain functional level required; Writable msDS-ManagedAccountPrecededByLink on a dMSA.' },
  { source: 'ad-cat-account-abuse', target: 'ad-cat-priv-groups' },
  // DACL / ACL abuse, object-first: the category triages to the object type you
  // hold a right over (or to the Control-Granting Rights sub-category if you know
  // the right but not yet the object). GenericAll/GenericWrite then fan out to all
  // four object categories ("you hold the right, pick the object").
  { source: 'ad-cat-dacl', target: 'acl-tgt-control' },
  { source: 'ad-cat-dacl', target: 'acl-tgt-user' },
  { source: 'ad-cat-dacl', target: 'acl-tgt-computer' },
  { source: 'ad-cat-dacl', target: 'acl-tgt-group' },
  { source: 'ad-cat-dacl', target: 'acl-tgt-policy' },
  { source: 'acl-tgt-control', target: 'acl-genericall' },
  { source: 'acl-tgt-control', target: 'acl-genericwrite' },
  { source: 'acl-tgt-control', target: 'acl-writeowner', description: 'Indicators this path applies: a BloodHound WriteOwner edge from an owned principal to a target object; the nTSecurityDescriptor owner SID is changeable by the controlled principal; owneredit reports a successful owner change.' },
  { source: 'acl-tgt-control', target: 'acl-writedacl' },
  { source: 'acl-genericall', target: 'acl-tgt-user' },
  { source: 'acl-genericall', target: 'acl-tgt-computer' },
  { source: 'acl-genericall', target: 'acl-tgt-group' },
  { source: 'acl-genericall', target: 'acl-tgt-policy' },
  { source: 'acl-genericwrite', target: 'acl-tgt-user' },
  { source: 'acl-genericwrite', target: 'acl-tgt-computer' },
  { source: 'acl-genericwrite', target: 'acl-tgt-group' },
  { source: 'acl-genericwrite', target: 'acl-tgt-policy' },
  // AD CS: the discovery gate (adcs-enum, in ad-adcs-extra.ts) now sits between the
  // ad-cat-adcs category and the two abuse sub-categories (template-enrollment vs
  // CA/infra/relay/forging), so those edges live there as adcs-enum → sub-category.
  { source: 'ad-cat-adcs-template', target: 'adcs-esc1', description: 'Indicators this path applies: certipy flags the template ESC1 / Enrollee Supplies Subject : True; msPKI-Certificate-Name-Flag has CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT (0x1); the template EKU allows Client Authentication or Smart Card Logon and a low-priv principal holds Enroll.' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc2' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc3', description: 'Indicators this path applies: Certificate Request Agent EKU 1.3.6.1.4.1.311.20.2.1 on an enrollable template; Certipy find flags a template ESC3 / \'Enrollment Agent\'; A second enabled client-authentication template the target principal can be enrolled for (e.g. User, SignedUser).' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc4', description: 'Indicators this path applies: certipy flags ESC4 (a template whose ACL grants a controlled principal WriteDacl/WriteOwner/WriteProperty/GenericWrite/GenericAll); a BloodHound WriteDacl/Owns/GenericAll edge to a pKICertificateTemplate object; the template DACL is writable by a user, group, or machine account you control.' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc9', description: 'Indicators this path applies: Template msPKI-Enrollment-Flag contains CT_FLAG_NO_SECURITY_EXTENSION (0x80000) so the issued cert omits the SID security extension (certipy \'ESC9\' flag); AND the KDC has StrongCertificateBindingEnforcement != 2 (set to 0 or 1), the weak Kerberos binding that lets a no-SID cert authenticate as a spoofed target; certipy find marks the template as [!] Vulnerable: ESC9.' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc13', description: 'Indicators this path applies: a certificate template carries an issuance-policy OID that is msDS-OIDToGroupLink-mapped to a privileged AD group; enrolling that template yields a certificate whose authentication grants the linked group membership.' },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc15' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc5' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc6' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc7', description: 'Indicators this path applies: Certipy \'find\' / certutil shows the principal listed in the CA\'s ManageCA (Officer) or ManageCertificates ACL; ESC7 reported by certipy find against the CA security descriptor; Ability to run \'certipy ca -add-officer\' / \'certipy ca -issue-request\' without access denied.' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc8', description: "Indicators this path applies: the AD CS Web Enrollment role is reachable over HTTP/HTTPS (/certsrv/, /certsrv/certfnsh.asp); the CA endpoint accepts NTLM or Negotiate auth with no EPA / channel binding; certipy find reports 'Web Enrollment: Enabled' and 'ADCS HTTP endpoint vulnerable' (ESC8)." },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc10' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc11' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc16' },
  { source: 'ad-cat-adcs-ca', target: 'golden-certificate' },
  { source: 'ad-cat-delegation', target: 'unconstrained-delegation', description: 'Indicators this path applies: userAccountControl flag TRUSTED_FOR_DELEGATION (0x80000) on a computer object; BloodHound "Unconstrained Delegation" edge / unconstraineddelegation:true; PowerView Get-DomainComputer -Unconstrained returns the host.' },
  { source: 'ad-cat-delegation', target: 'constrained-delegation', description: 'Indicators this path applies: msDS-AllowedToDelegateTo is populated on a user or computer; userAccountControl carries TRUSTED_TO_AUTH_FOR_DELEGATION (protocol transition), while Kerberos-only constrained delegation sets no UAC delegation bit; you control the delegating principal secret (NT hash, AES key, or cleartext).' },
  { source: 'ad-cat-delegation', target: 'rbcd', description: 'Indicators this path applies: write access to a target computer msDS-AllowedToActOnBehalfOfOtherIdentity (GenericAll/GenericWrite/WriteDACL/AddAllowedToAct in BloodHound); you control a principal that has an SPN (a machine account, or one you create when ms-DS-MachineAccountQuota is greater than 0).' },
  // Critical CVEs grouped by attack surface.
  { source: 'ad-cat-cve', target: 'cvegrp-kerberos' },
  { source: 'ad-cat-cve', target: 'cvegrp-exchange' },
  { source: 'ad-cat-cve', target: 'cvegrp-smbprint' },
  { source: 'cvegrp-kerberos', target: 'nopac' },
  { source: 'cvegrp-smbprint', target: 'printnightmare' },
  { source: 'cvegrp-kerberos', target: 'ms14-068' },
  { source: 'cvegrp-kerberos', target: 'certifried', description: 'Indicators this path applies: an Enterprise CA reachable with a Machine/Computer enrollment template; ms-DS-MachineAccountQuota greater than 0 (or delegated CreateChild on an OU); the ability to write a machine dNSHostName matching a DC FQDN (CVE-2022-26923).' },
  { source: 'cvegrp-exchange', target: 'privexchange' },

  // Lateral Movement: credential reuse (its own sub-lane) + remote execution + service abuse
  { source: 'ad-cat-lateral', target: 'ad-cat-cred-reuse' },
  { source: 'ad-cat-cred-reuse', target: 'pass-the-hash', description: 'Indicators this path applies: you hold the NT (RC4) hash and NTLM is available on the target; you want a direct NTLM network session (SMB / WMI / WinRM) as that account without cracking the hash.' },
  { source: 'ad-cat-cred-reuse', target: 'overpass-the-hash', description: 'Indicators this path applies: have NT hash or AES128/256 key but no cleartext password; NTLM auth blocked: STATUS_NOT_SUPPORTED / NTLM disabled / \'NTLM authentication is not supported\'; need a TGT rather than a session for the next step (PtT, S4U, LDAP/SMB over Kerberos).' },
  { source: 'ad-cat-cred-reuse', target: 'pass-the-ticket' },
  { source: 'ad-cat-lateral', target: 'lateral-movement-cme', description: 'Indicators this path applies: the principal is a local Administrator (or in Distributed COM Users) on the target, or BloodHound shows an ExecuteDCOM / local-admin edge to the host; SMB (445), WinRM (5985), or DCOM/MSRPC (135 plus the dynamic RPC range) reachable; nxc/crackmapexec returns (Pwn3d!) for the credential.' }, // "Remote Execution" -> WinRM/WMI/DCOM
  { source: 'ad-cat-lateral', target: 'ad-cat-platform' },
  { source: 'ad-cat-platform', target: 'ad-cat-mssql' },
  { source: 'ad-cat-platform', target: 'ad-cat-sccm' },
  { source: 'ad-cat-platform', target: 'ad-cat-deploy-abuse' },
  { source: 'ad-cat-mssql', target: 'mssql-linked-servers', description: 'Indicators this path applies: sys.servers / sp_linkedservers returns rows beyond the local instance; is_linked = 1 on a server entry; EXEC (\'SELECT SYSTEM_USER\') AT [LINK] returns an identity different from the local login.' },

  // ── Domain Admin: persistence + trusts ──────────────────────────────────
  { source: 'domain-admin', target: 'ad-cat-trusts' },
  { source: 'domain-admin', target: 'ad-cat-persistence' },
  // Persistence grouped by mechanism.
  { source: 'ad-cat-persistence', target: 'persist-forgery' },
  { source: 'ad-cat-persistence', target: 'persist-implant' },
  { source: 'ad-cat-persistence', target: 'persist-backdoor' },
  { source: 'ad-cat-persistence', target: 'persist-fed' },
  { source: 'persist-backdoor', target: 'adminsdholder' },
  { source: 'persist-implant', target: 'dsrm' },
  { source: 'persist-implant', target: 'dcshadow' },
  { source: 'persist-implant', target: 'skeleton-key' },

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
  { source: 'ad-cat-dc-dump', target: 'ntds-dump', description: 'Indicators this path applies: ntds.dit file present; SYSTEM registry hive present (and optionally SECURITY); secretsdump.py invoked with the LOCAL keyword.' },
];
