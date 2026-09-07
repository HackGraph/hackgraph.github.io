import { mitre, r } from '../lib.js';

/**
 * Chain 2: "Valid user → roast → crack → service-account creds → lateral".
 * Branches from `valid-domain-creds` and converges into `lateral-movement-cme`,
 * which also receives Pass-the-Hash from chain 1.
 */
/** @type {import('../schema.js').TechniqueNodeDef[]} */
export const credentialAccessNodes = [
  {
    id: 'kerberoasting',
    aliases: ['Kerberoastable'],
    label: 'Kerberoasting',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Request a TGS for every user account that has an SPN; the encryption type you get back decides the branch.',
    description:
      'Any authenticated user can request a service ticket (TGS) for a user account that has a Service Principal Name set. Computer accounts also carry SPNs, but their 120-character, randomly generated passwords rotate every 30 days, so they are not roasting targets; the commands filter them out with (!(objectClass=computer)). Part of that ticket is encrypted with the service account\'s key, so it is crackable offline with no special privileges, and service accounts are often over-privileged. What the KDC hands back depends on the account\'s msDS-SupportedEncryptionTypes and domain policy: an RC4 ticket you can crack at NT-hash speed, or an AES-only ticket that is PBKDF2-slow to crack. Enumerate the SPN accounts, request tickets, then handle them by the encryption type you receive.',
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
        label: 'Also read supported enctypes to predict the branch',
        code: "bloodyAD -u user -p pass -d domain.local --host dc01 get search --filter '(&(servicePrincipalName=*)(!(objectClass=computer)))' --attr sAMAccountName,msDS-SupportedEncryptionTypes",
        lang: 'bash',
      },
      {
        label: 'Roast from Linux (KDC picks the etype)',
        code: 'GetUserSPNs.py DOMAIN/user:pass -dc-ip 10.0.0.1 -request',
        lang: 'bash',
      },
    ],
    requires: ['Any valid domain account', 'Target accounts with an SPN set'],
    mitre: mitre('T1558.003'),
    opsec: 'Requesting many TGS quickly triggers 4769 spikes; throttle and target named accounts. The encryption type you request is the bigger tell. The RC4 and AES branches cover the OPSEC of each.',
    references: [
      { label: 'HackTricks, Kerberoast', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/kerberoast.html' },
      { label: 'harmj0y, Kerberoasting Revisited', url: 'https://blog.harmj0y.net/redteaming/kerberoasting-revisited/' },
    ],
  },
  {
    id: 'kerberoast-rc4',
    label: 'RC4 Ticket (crackable)',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'Account allows RC4: the TGS is $krb5tgs$23$ and cracks at NT-hash speed.',
    description:
      'If the SPN account still permits RC4 (msDS-SupportedEncryptionTypes allows etype 23, or is unset, which has historically defaulted the service-ticket etype to RC4 and continues to until the April 2026 update switches the TGS default to AES-SHA1; the Nov 2022 update only changed session/TGT keys, not TGS etype selection), the KDC issues an RC4 service ticket. The encrypted portion is keyed on the account\'s NT hash, so it cracks offline at full NTLM speed (hashcat mode 13100). This is the common outcome on legacy or default-configured domains and on individual accounts left at RC4. Rubeus /rc4opsec only roasts accounts that already support RC4, so you take the fast-cracking ticket without forcing a downgrade.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'GetUserSPNs (Impacket)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      {
        label: 'Roast only RC4-supporting accounts (no downgrade)',
        code: 'Rubeus.exe kerberoast /nowrap /rc4opsec',
        lang: 'powershell',
      },
      {
        label: 'Roast an SPN account from Linux (RC4-biased via NT-hash TGT; returns AES for AES-only accounts)',
        code: 'GetUserSPNs.py DOMAIN/user:pass -dc-ip 10.0.0.1 -request -request-user svc_sql',
        lang: 'bash',
      },
    ],
    requires: ['Any valid domain account', 'An SPN account that still supports RC4 (etype 23)'],
    mitre: mitre('T1558.003'),
    opsec: 'On a domain where AES is available, requesting RC4 is a detectable downgrade on the 4769 (ticket encryption type 0x17), and it feeds MDI/SIEM kerberoasting detections. /rc4opsec keeps you to accounts that only support RC4, so the request stays in-policy and quiet.',
    references: [
      { label: 'harmj0y, Kerberoasting Revisited', url: 'https://blog.harmj0y.net/redteaming/kerberoasting-revisited/' },
      { label: 'The Hacker Recipes, Kerberoast', url: 'https://www.thehacker.recipes/ad/movement/kerberos/kerberoast' },
    ],
  },
  {
    id: 'kerberoast-aes',
    label: 'AES-only Ticket (hardened)',
    phase: 'credential-access',
    needs: 'domain-user',
    summary: 'RC4 disabled: the TGS is $krb5tgs$18/17$ and PBKDF2 makes cracking very slow.',
    description:
      'On a hardened domain (RC4 disabled via the "Network security: Configure encryption types allowed for Kerberos" GPO, or the account set AES-only), the KDC only issues AES tickets: $krb5tgs$18$ for AES256 (hashcat mode 19700) or $krb5tgs$17$ for AES128 (mode 19600). The AES key is PBKDF2-derived over 4096 iterations, so cracking is orders of magnitude slower than RC4. A long or machine-generated password (gMSA/dMSA, or a 25+ character service password) is effectively uncrackable. Roasting still has value: it confirms which service accounts exist, and any human-set password can still fall. If the target is AES-only with a strong password, do not grind. Pivot to a write-ACL path (targeted Kerberoasting of a weaker account, Shadow Credentials), a gMSA/dMSA password read, or a delegation abuse instead.',
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'GetUserSPNs (Impacket)', url: 'https://github.com/fortra/impacket' },
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
    ],
    commands: [
      {
        label: 'Roast AES directly, no RC4 downgrade request',
        code: 'Rubeus.exe kerberoast /aes /nowrap',
        lang: 'powershell',
      },
      {
        label: 'Crack AES256 TGS (mode 19700, expect it to be slow)',
        code: 'hashcat -m 19700 tgs_aes.txt rockyou.txt -r rules/best64.rule',
        lang: 'bash',
      },
    ],
    requires: ['Any valid domain account', 'An SPN account whose password is human-set / weak enough to survive PBKDF2 cracking'],
    mitre: mitre('T1558.003'),
    opsec: 'Requesting RC4 to downgrade an AES-capable account is exactly what the "suspected Kerberoasting" and encryption-downgrade detections look for. Do not attempt it here. Take the AES ticket at face value, or move to another branch; a burst of AES 4769s for service SPNs is still worth throttling.',
    references: [
      { label: 'harmj0y, Kerberoasting Revisited', url: 'https://blog.harmj0y.net/redteaming/kerberoasting-revisited/' },
      { label: 'The Hacker Recipes, Kerberoast', url: 'https://www.thehacker.recipes/ad/movement/kerberos/kerberoast' },
    ],
  },
  {
    id: 'asrep-roasting',
    aliases: ['ASREPRoastable', 'DontReqPreAuth'],
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
    "id": "crack-hash-offline",
    "label": "Crack Hash Offline",
    "phase": "credential-access",
    "needs": "none",
    "summary": "Distinguish Kerberos authentication tickets from authenticated time synchronization.",
    "description": "Kerberos uses session tickets in network authentication. Windows also uses NTP Authentication Extensions for authenticated clock synchronization between Kerberos clients and the Key Distribution Center. Authentication tickets and time-synchronization messages serve different protocol purposes.",
    "tools": [
      {
        "name": "hashcat",
        "url": "https://hashcat.net/hashcat/"
      },
      {
        "name": "john",
        "url": "https://www.openwall.com/john/"
      }
    ],
    "commands": [
      {
        "label": "Kerberoast TGS (mode 13100)",
        "code": "hashcat -m 13100 tgs.txt rockyou.txt -r rules/best64.rule",
        "lang": "bash"
      },
      {
        "label": "AS-REP RC4 (mode 18200); AES AS-REPs need John, see below",
        "code": "hashcat -m 18200 asrep.txt rockyou.txt -r rules/best64.rule",
        "lang": "bash"
      },
      {
        "label": "AES AS-REP (etype 17/18): stock hashcat has no mode, use John",
        "code": "john --format=krb5asrep --wordlist=rockyou.txt asrep_aes.txt",
        "lang": "bash"
      },
      {
        "label": "Timeroast SNTP MAC (mode 31300; --username strips the RID prefix)",
        "code": "hashcat -m 31300 --username timeroast_hashes.txt rockyou.txt",
        "lang": "bash"
      }
    ],
    "requires": [
      "A roasted ticket/hash",
      "A weak-enough password"
    ],
    "mitre": {
      "id": "T1110.002",
      "url": "https://attack.mitre.org/techniques/T1110/002/"
    },
    "opsec": "Offline and invisible to the target. Strong/AES-only passwords resist this; escalate by another method if cracking fails.",
    "references": [
      {
        "label": "Microsoft — Kerberos authentication overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview",
        "kind": "primary"
      },
      {
        "label": "Microsoft — [MS-AUTHSOD]: Security",
        "url": "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-authsod/e59cfa30-91dc-4889-ba17-2793080cf1df",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected foundational definitions of authentication, Windows management, service configuration and securable objects. These sources support only the listed conceptual claims. Excludes technique mechanics, commands, tools, prerequisites, applicability, version or algorithm details, connection outcomes, attack-path viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "hashcat -m 13100 tgs.txt rockyou.txt -r rules/best64.rule",
            "label": "Kerberoast TGS (mode 13100)",
            "lang": "bash"
          },
          {
            "code": "hashcat -m 18200 asrep.txt rockyou.txt -r rules/best64.rule",
            "label": "AS-REP RC4 (mode 18200); AES AS-REPs need John, see below",
            "lang": "bash"
          },
          {
            "code": "john --format=krb5asrep --wordlist=rockyou.txt asrep_aes.txt",
            "label": "AES AS-REP (etype 17/18): stock hashcat has no mode, use John",
            "lang": "bash"
          },
          {
            "code": "hashcat -m 31300 --username timeroast_hashes.txt rockyou.txt",
            "label": "Timeroast SNTP MAC (mode 31300; --username strips the RID prefix)",
            "lang": "bash"
          }
        ],
        "description": "Kerberos uses session tickets in network authentication. Windows also uses NTP Authentication Extensions for authenticated clock synchronization between Kerberos clients and the Key Distribution Center. Authentication tickets and time-synchronization messages serve different protocol purposes.",
        "id": "crack-hash-offline",
        "label": "Crack Hash Offline",
        "mitre": {
          "id": "T1110.002",
          "url": "https://attack.mitre.org/techniques/T1110/002/"
        },
        "needs": "none",
        "opsec": "Offline and invisible to the target. Strong/AES-only passwords resist this; escalate by another method if cracking fails.",
        "phase": "credential-access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Kerberos authentication overview",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft — [MS-AUTHSOD]: Security",
            "url": "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-authsod/e59cfa30-91dc-4889-ba17-2793080cf1df"
          }
        ],
        "requires": [
          "A roasted ticket/hash",
          "A weak-enough password"
        ],
        "summary": "Distinguish Kerberos authentication tickets from authenticated time synchronization.",
        "tools": [
          {
            "name": "hashcat",
            "url": "https://hashcat.net/hashcat/"
          },
          {
            "name": "john",
            "url": "https://www.openwall.com/john/"
          }
        ]
      },
      "claims": [
        {
          "text": "Kerberos uses renewable session tickets for authentication to servers.",
          "section": "Microsoft — Kerberos authentication overview — More efficient authentication to servers",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview"
          ]
        },
        {
          "text": "Windows uses NTP Authentication Extensions for authenticated time synchronization between Kerberos clients and the Key Distribution Center.",
          "section": "Microsoft — [MS-AUTHSOD]: Security — 2.9 Security: final paragraph",
          "sources": [
            "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-authsod/e59cfa30-91dc-4889-ba17-2793080cf1df"
          ]
        }
      ]
    }
  },
  {
    id: 'crack-encrypted-file',
    label: 'Crack Encrypted Files & Archives',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Pull a hash from a locked ZIP/Office/PDF/KeePass/PGP file and crack it offline.',
    description:
      'Looted files are often password-protected: ZIP / RAR / 7z archives, Office documents, PDFs, KeePass (.kdbx) databases, and PGP/GPG private keys. The John *2john helpers extract a crackable hash from each, then john or hashcat recover the password offline against a wordlist. Two payoffs: the recovered password is a prime spray candidate (reuse is rampant, so try it across the user list for other accounts, not just the file it unlocked), and the decrypted contents routinely hold the next set of credentials or keys (config files, another vault, SSH keys) to loot and pivot with. SSH private-key passphrases crack the same way (ssh2john) on the Linux side.',
    tools: [
      { name: 'John the Ripper (*2john)', url: 'https://github.com/openwall/john' },
      { name: 'hashcat', url: 'https://hashcat.net/hashcat/' },
    ],
    commands: [
      { label: 'Archive / Office / PDF', code: r`zip2john secret.zip > h; john --wordlist=rockyou.txt h
office2john report.docx > h   # or pdf2john file.pdf, rar2john x.rar, 7z2john x.7z`, lang: 'bash' },
      { label: 'KeePass database (hashcat 13400)', code: r`keepass2john Database.kdbx > h
hashcat -m 13400 h rockyou.txt`, lang: 'bash' },
      { label: 'PGP/GPG private key', code: r`gpg2john privkey.asc > h; john --wordlist=rockyou.txt h`, lang: 'bash' },
    ],
    requires: ['A looted password-protected file (archive, Office doc, PDF, KeePass DB, or PGP key)'],
    mitre: mitre('T1110.002'),
    references: [
      { label: 'HackTricks, Brute Force (*2john)', url: 'https://book.hacktricks.wiki/en/generic-hacking/brute-force.html' },
      { label: 'John the Ripper', url: 'https://github.com/openwall/john' },
    ],
    opsec: 'Cracking is entirely offline and invisible to the target; only the initial file read is logged. Strong passphrases resist it.',
  },
  {
    "id": "service-account-creds",
    "label": "Service Account Creds",
    "phase": "lateral-movement",
    "needs": "domain-user",
    "summary": "Understand the account identity used by a Windows service.",
    "description": "A Windows service runs in the security context of its configured account. On a successful service logon, Windows attaches an access token to the service process. Resource access checks compare that token with the resource's security descriptor. The role service account identifies how the account is used; its resource permissions need to be described separately.",
    "tools": [
      {
        "name": "NetExec",
        "url": "https://github.com/Pennyw0rth/NetExec"
      }
    ],
    "commands": [
      {
        "label": "Find where the account is local admin",
        "code": "nxc smb hosts.txt -u svc_sql -p 'Summer2024!' | grep Pwn3d",
        "lang": "bash"
      }
    ],
    "requires": [
      "Cracked service-account credentials"
    ],
    "mitre": {
      "id": "T1078.002",
      "url": "https://attack.mitre.org/techniques/T1078/002/"
    },
    "references": [
      {
        "label": "Microsoft, Service User Accounts",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts",
        "section": "Opening definition; service access token and resource checks",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims about execution identities, processor modes, and task/startup permissions. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "nxc smb hosts.txt -u svc_sql -p 'Summer2024!' | grep Pwn3d",
            "label": "Find where the account is local admin",
            "lang": "bash"
          }
        ],
        "description": "A Windows service runs in the security context of its configured account. On a successful service logon, Windows attaches an access token to the service process. Resource access checks compare that token with the resource's security descriptor. The role service account identifies how the account is used; its resource permissions need to be described separately.",
        "id": "service-account-creds",
        "label": "Service Account Creds",
        "mitre": {
          "id": "T1078.002",
          "url": "https://attack.mitre.org/techniques/T1078/002/"
        },
        "needs": "domain-user",
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Service User Accounts",
            "section": "Opening definition; service access token and resource checks",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          }
        ],
        "requires": [
          "Cracked service-account credentials"
        ],
        "summary": "Understand the account identity used by a Windows service.",
        "tools": [
          {
            "name": "NetExec",
            "url": "https://github.com/Pennyw0rth/NetExec"
          }
        ]
      },
      "claims": [
        {
          "text": "A Windows service executes in its account's security context and receives an access token after a successful service logon.",
          "section": "Microsoft, Service User Accounts — Opening definition; service access token and resource checks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        },
        {
          "text": "Windows checks a service process's access token against a resource's security descriptor when deciding access.",
          "section": "Microsoft, Service User Accounts — Opening definition; service access token and resource checks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        }
      ]
    }
  },
  {
    "id": "lateral-movement-cme",
    "label": "Remote Execution",
    "phase": "lateral-movement",
    "needs": "creds",
    "hub": true,
    "summary": "Distinguish Windows management infrastructure, management protocols and remote display.",
    "description": "WMI supplies infrastructure for Windows management information and operations. WinRM implements the WS-Management protocol for exchanging management information. RDP carries remote display and user input for server-hosted Windows applications. These names describe different administrative technologies rather than a single interchangeable interface.",
    "tools": [
      {
        "name": "NetExec",
        "url": "https://github.com/Pennyw0rth/NetExec"
      },
      {
        "name": "Impacket (psexec/smbexec/atexec/wmiexec/dcomexec)",
        "url": "https://github.com/fortra/impacket"
      }
    ],
    "commands": [
      {
        "label": "Find where your creds are admin, then exec",
        "code": "nxc smb hosts.txt -u svc_sql -p 'Summer2024!' -x \"whoami /groups\"",
        "lang": "bash"
      },
      {
        "label": "Run a PowerShell command (-X)",
        "code": "nxc smb <host> -u user -p pass -X '$PSVersionTable'",
        "lang": "bash"
      },
      {
        "label": "Hunt logged-on users to find a pivot",
        "code": "nxc smb 10.0.0.0/24 -u user -p pass --loggedon-users",
        "lang": "bash"
      }
    ],
    "requires": [
      "Credentials, an NT hash (PtH), or a Kerberos ticket (PtT)",
      "Authorization on the target: local admin, a remote-access group, or a valid service login"
    ],
    "mitre": {
      "id": "T1021",
      "url": "https://attack.mitre.org/techniques/T1021/"
    },
    "opsec": "Each hop generates logon events (4624) keyed to the transport: type 3 for SMB/WMI, type 10 for RDP. Reuse legitimate admin tooling and change windows to blend in; do not spray every host at once.",
    "references": [
      {
        "label": "Microsoft — Windows Management Instrumentation",
        "url": "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Windows Remote Management",
        "url": "https://learn.microsoft.com/en-us/windows/win32/winrm/portal",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Remote Desktop Protocol",
        "url": "https://learn.microsoft.com/en-us/windows/win32/termserv/remote-desktop-protocol",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected foundational definitions of authentication, Windows management, service configuration and securable objects. These sources support only the listed conceptual claims. Excludes technique mechanics, commands, tools, prerequisites, applicability, version or algorithm details, connection outcomes, attack-path viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "nxc smb hosts.txt -u svc_sql -p 'Summer2024!' -x \"whoami /groups\"",
            "label": "Find where your creds are admin, then exec",
            "lang": "bash"
          },
          {
            "code": "nxc smb <host> -u user -p pass -X '$PSVersionTable'",
            "label": "Run a PowerShell command (-X)",
            "lang": "bash"
          },
          {
            "code": "nxc smb 10.0.0.0/24 -u user -p pass --loggedon-users",
            "label": "Hunt logged-on users to find a pivot",
            "lang": "bash"
          }
        ],
        "description": "WMI supplies infrastructure for Windows management information and operations. WinRM implements the WS-Management protocol for exchanging management information. RDP carries remote display and user input for server-hosted Windows applications. These names describe different administrative technologies rather than a single interchangeable interface.",
        "hub": true,
        "id": "lateral-movement-cme",
        "label": "Remote Execution",
        "mitre": {
          "id": "T1021",
          "url": "https://attack.mitre.org/techniques/T1021/"
        },
        "needs": "creds",
        "opsec": "Each hop generates logon events (4624) keyed to the transport: type 3 for SMB/WMI, type 10 for RDP. Reuse legitimate admin tooling and change windows to blend in; do not spray every host at once.",
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Windows Management Instrumentation",
            "url": "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Windows Remote Management",
            "url": "https://learn.microsoft.com/en-us/windows/win32/winrm/portal"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Remote Desktop Protocol",
            "url": "https://learn.microsoft.com/en-us/windows/win32/termserv/remote-desktop-protocol"
          }
        ],
        "requires": [
          "Credentials, an NT hash (PtH), or a Kerberos ticket (PtT)",
          "Authorization on the target: local admin, a remote-access group, or a valid service login"
        ],
        "summary": "Distinguish Windows management infrastructure, management protocols and remote display.",
        "tools": [
          {
            "name": "NetExec",
            "url": "https://github.com/Pennyw0rth/NetExec"
          },
          {
            "name": "Impacket (psexec/smbexec/atexec/wmiexec/dcomexec)",
            "url": "https://github.com/fortra/impacket"
          }
        ]
      },
      "claims": [
        {
          "text": "WMI provides infrastructure for management information and operations on Windows systems.",
          "section": "Microsoft — Windows Management Instrumentation — Opening definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page"
          ]
        },
        {
          "text": "WinRM implements WS-Management, a protocol for exchanging management information.",
          "section": "Microsoft — Windows Remote Management — Opening definition and WS-Management purpose",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/winrm/portal"
          ]
        },
        {
          "text": "RDP provides remote display and input for Windows applications running on a server.",
          "section": "Microsoft — Remote Desktop Protocol — Opening definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/termserv/remote-desktop-protocol"
          ]
        }
      ]
    }
  },
];

/** @type {import('../schema.js').AttackEdge[]} */
export const credentialAccessEdges = [
  // valid-domain-creds -> kerberoasting/asrep-roasting now route through the
  // 'Kerberos Roasting' category (see ad-categories.ts).
  // Kerberoasting forks on the encryption type the KDC hands back; both branches
  // converge on offline cracking, but the AES branch is PBKDF2-slow (see nodes).
  {
    source: 'kerberoasting', target: 'kerberoast-rc4', label: 'RC4 allowed (etype 23)',
    requires: [
      'the returned TGS begins with $krb5tgs$23$ (RC4-HMAC)',
      'the account\'s msDS-SupportedEncryptionTypes is unset or includes RC4',
      'the domain has not disabled RC4 via the Kerberos encryption-types GPO',
    ],
  },
  {
    source: 'kerberoasting', target: 'kerberoast-aes', label: 'RC4 disabled / AES-only',
    requires: [
      'the returned TGS begins with $krb5tgs$18$ (AES256) or $krb5tgs$17$ (AES128)',
      'RC4 is disabled domain-wide or the account is AES-only',
      'an RC4 request is refused or logged as a downgrade',
    ],
  },
  { source: 'kerberoast-rc4', target: 'crack-hash-offline', label: '$krb5tgs$23$ · hashcat 13100' },
  { source: 'kerberoast-aes', target: 'crack-hash-offline', label: '$krb5tgs$18/17$ · hashcat 19700/19600' },
  // Not a list of conditions but a description of what you get: the etype decides which
  // cracker can touch the material at all. Captioned like its Kerberoasting siblings above.
  {
    source: 'asrep-roasting', target: 'crack-hash-offline', label: '$krb5asrep$23$ · hashcat 18200',
    description: 'AS-REP material beginning with $krb5asrep$23$ (RC4, hashcat 18200) cracks at NT-hash speed. If RC4 is disabled the AS-REP comes back AES, which stock hashcat cannot crack (no AES AS-REP mode); use John (--format=krb5asrep) and expect PBKDF2-slow speeds.',
  },
  { source: 'crack-hash-offline', target: 'service-account-creds', label: 'service / SPN account' },
  { source: 'crack-hash-offline', target: 'valid-domain-creds', label: 'domain user account' },
  // A looted, password-protected file cracks offline into creds (or decrypts to more secrets).
  { source: 'smb-share-loot', target: 'crack-encrypted-file', label: 'locked archive / doc' },
  { source: 'local-cred-hunt', target: 'crack-encrypted-file', label: 'password-protected file' },
  { source: 'crack-encrypted-file', target: 'valid-domain-creds', label: 'recovered / reused password' },
  { source: 'crack-encrypted-file', target: 'valid-local-creds', label: 'file / local password' },
  { source: 'crack-encrypted-file', target: 'password-spraying', label: 'spray the password', description: 'The recovered archive or file password is a prime spray candidate: reuse is rampant, so test it across the whole user list rather than assuming it only unlocks the one file. A hit is frequently a different account than the file owner.' },
  { source: 'service-account-creds', target: 'lateral-movement-cme' },
  { source: 'pass-the-hash', target: 'lateral-movement-cme' },
];
