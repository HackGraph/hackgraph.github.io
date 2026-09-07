// Explicit AI source-comparison snapshots from 2026-09-06.
// Never regenerate these during a build or renew them without a new comparison.
export const GLOSSARY_REVIEWS = {
  "Kerberos": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A ticket-based network authentication protocol used by Active Directory and many other systems.",
    "aliases": [],
    "sources": [
      {
        "label": "MIT: What is Kerberos?",
        "url": "https://web.mit.edu/kerberos/",
        "section": "What is Kerberos?",
        "kind": "primary"
      }
    ]
  },
  "KDC": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Key Distribution Center: a trusted Kerberos service that issues tickets and session keys.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 4120: Kerberos V5",
        "url": "https://www.rfc-editor.org/rfc/rfc4120.html",
        "section": "Sections 1.1, 1.7 and 3.1: protocol, definitions and the authentication exchange",
        "kind": "primary"
      }
    ]
  },
  "TGT": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Ticket-granting ticket: a Kerberos ticket used to request further tickets from the ticket-granting service.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Key Distribution Center",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/key-distribution-center",
        "section": "Authentication service and ticket-granting service",
        "kind": "primary"
      }
    ]
  },
  "TGS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Ticket-granting service: the part of a Kerberos KDC that issues tickets for services.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Key Distribution Center",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/key-distribution-center",
        "section": "Authentication service and ticket-granting service",
        "kind": "primary"
      }
    ]
  },
  "AS-REP": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "The Kerberos authentication service reply message, carrying a ticket and an encrypted reply for the client.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 4120: Kerberos V5",
        "url": "https://www.rfc-editor.org/rfc/rfc4120.html",
        "section": "Sections 1.1, 1.7 and 3.1: protocol, definitions and the authentication exchange",
        "kind": "primary"
      }
    ]
  },
  "SPN": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Service principal name: an identifier for a service instance that Kerberos associates with its service account.",
    "aliases": [
      "SPNs"
    ],
    "sources": [
      {
        "label": "Microsoft: Service principal names",
        "url": "https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names",
        "section": "Service principal names",
        "kind": "primary"
      }
    ]
  },
  "Kerberoasting": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A credential attack involving offline password guessing against Kerberos service-ticket data.",
    "aliases": [
      "Kerberoast"
    ],
    "sources": [
      {
        "label": "MITRE ATT&CK: Kerberoasting",
        "url": "https://attack.mitre.org/techniques/T1558/003/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "AS-REP roasting": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A credential attack involving offline password guessing against Kerberos authentication replies for accounts without preauthentication.",
    "aliases": [
      "AS-REP roast"
    ],
    "sources": [
      {
        "label": "MITRE ATT&CK: AS-REP Roasting",
        "url": "https://attack.mitre.org/techniques/T1558/004/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "PKINIT": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A Kerberos extension that uses public-key cryptography during initial authentication, commonly with certificates.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 4556: PKINIT",
        "url": "https://www.rfc-editor.org/rfc/rfc4556.html",
        "section": "Section 1: Introduction",
        "kind": "primary"
      }
    ]
  },
  "krbtgt": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "The Active Directory account used by the domain’s Kerberos Key Distribution Center.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Privileged accounts and groups",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory",
        "section": "Krbtgt and Domain Admins",
        "kind": "primary"
      }
    ]
  },
  "Golden Ticket": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A forged Kerberos ticket-granting ticket associated with compromise of the domain’s krbtgt credentials.",
    "aliases": [],
    "sources": [
      {
        "label": "MITRE ATT&CK: Golden Ticket",
        "url": "https://attack.mitre.org/techniques/T1558/001/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "Silver Ticket": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A forged Kerberos service ticket associated with compromise of the service account’s credentials.",
    "aliases": [],
    "sources": [
      {
        "label": "MITRE ATT&CK: Silver Ticket",
        "url": "https://attack.mitre.org/techniques/T1558/002/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "S4U": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Service for User: Kerberos extensions that support a service acting on a user’s behalf.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Kerberos constrained delegation",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview",
        "section": "Resource-based constrained delegation and S4U extensions",
        "kind": "primary"
      }
    ]
  },
  "ccache": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A store of Kerberos credentials, including tickets and session keys, whose form can be a file, memory, or another supported cache type.",
    "aliases": [],
    "sources": [
      {
        "label": "MIT: Credential cache",
        "url": "https://web.mit.edu/kerberos/krb5-latest/doc/basic/ccache_def.html",
        "section": "Credential cache; ccache types",
        "kind": "primary"
      }
    ]
  },
  "keytab": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A Kerberos key table containing long-term keys for one or more identities, usually stored in a file.",
    "aliases": [
      "keytabs"
    ],
    "sources": [
      {
        "label": "MIT: Keytab",
        "url": "https://web.mit.edu/kerberos/krb5-latest/doc/basic/keytab_def.html",
        "section": "Keytab",
        "kind": "primary"
      }
    ]
  },
  "NTLM": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A family of Windows authentication protocols that use a challenge-response exchange.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: NTLM",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm",
        "section": "NTLM authentication",
        "kind": "primary"
      }
    ]
  },
  "NT hash": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "An unsalted password hash used by Windows authentication, distinct from an NTLM network response.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Passwords technical overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/passwords-technical-overview",
        "section": "Passwords stored as OWF; Passwords stored in Active Directory",
        "kind": "primary"
      },
      {
        "label": "Microsoft: NTLM",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm",
        "section": "NTLM authentication",
        "kind": "primary"
      }
    ]
  },
  "Pass-the-Hash": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "An authentication-abuse technique involving a password hash instead of the account’s plaintext password.",
    "aliases": [
      "pass-the-hash",
      "PtH"
    ],
    "sources": [
      {
        "label": "MITRE ATT&CK: Pass the Hash",
        "url": "https://attack.mitre.org/techniques/T1550/002/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "Pass-the-Ticket": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "An authentication-abuse technique involving stolen or forged Kerberos tickets.",
    "aliases": [
      "pass-the-ticket",
      "PtT"
    ],
    "sources": [
      {
        "label": "MITRE ATT&CK: Pass the Ticket",
        "url": "https://attack.mitre.org/techniques/T1550/003/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "Overpass-the-Hash": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A credential-abuse technique involving password-derived keys and Kerberos authentication.",
    "aliases": [
      "overpass-the-hash",
      "OverPass-the-Hash",
      "OPtH"
    ],
    "sources": [
      {
        "label": "MITRE ATT&CK: Pass the Hash",
        "url": "https://attack.mitre.org/techniques/T1550/002/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "LLMNR": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Link-Local Multicast Name Resolution: a protocol for resolving names on the local network link when conventional DNS is unavailable.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 4795: LLMNR",
        "url": "https://www.rfc-editor.org/rfc/rfc4795.html",
        "section": "Sections 1 and 2: Introduction and name resolution",
        "kind": "primary"
      }
    ]
  },
  "NBT-NS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "NetBIOS Name Service: a name-registration and lookup mechanism that can use broadcasts or a name server.",
    "aliases": [
      "NBNS"
    ],
    "sources": [
      {
        "label": "RFC 1001: NetBIOS over TCP/UDP",
        "url": "https://www.rfc-editor.org/rfc/rfc1001.html",
        "section": "Section 15: NetBIOS name service",
        "kind": "primary"
      }
    ]
  },
  "mDNS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Multicast DNS: a protocol for DNS-style name lookup on the local network link without a conventional DNS server.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 6762: Multicast DNS",
        "url": "https://www.rfc-editor.org/rfc/rfc6762.html",
        "section": "Abstract and section 1",
        "kind": "primary"
      }
    ]
  },
  "WPAD": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Web Proxy Auto-Discovery: a mechanism for automatically locating a client’s web-proxy configuration.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: WinHTTP AutoProxy support",
        "url": "https://learn.microsoft.com/en-us/windows/win32/winhttp/winhttp-autoproxy-support",
        "section": "WPAD and proxy auto-configuration",
        "kind": "primary"
      }
    ]
  },
  "SID": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Security identifier: a value Windows uses to identify a security principal, such as a user, group, or computer account.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Security identifiers",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers",
        "section": "Security identifiers; components of a SID",
        "kind": "primary"
      }
    ]
  },
  "RID": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Relative identifier: the final component of a SID that distinguishes an account or group within its issuing domain or computer.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Security identifiers",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers",
        "section": "Security identifiers; components of a SID",
        "kind": "primary"
      }
    ]
  },
  "ACL": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Access control list: a collection of entries describing access permissions or auditing rules for an object.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Access control lists",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists",
        "section": "DACLs and SACLs",
        "kind": "primary"
      }
    ]
  },
  "ACE": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Access control entry: one rule in an ACL describing access or auditing for a security principal.",
    "aliases": [
      "ACEs"
    ],
    "sources": [
      {
        "label": "Microsoft: Access control entries",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-entries",
        "section": "Access control entries",
        "kind": "primary"
      }
    ]
  },
  "DACL": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Discretionary access control list: the ACL in an object’s security descriptor that specifies allowed or denied access.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Access control lists",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists",
        "section": "DACLs and SACLs",
        "kind": "primary"
      }
    ]
  },
  "GPO": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Group Policy Object: a collection of policy settings for users and computers.",
    "aliases": [
      "GPOs"
    ],
    "sources": [
      {
        "label": "Microsoft: Group Policy overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-overview",
        "section": "Group Policy objects",
        "kind": "primary"
      }
    ]
  },
  "DCSync": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A credential-theft technique that abuses Active Directory’s directory-replication interfaces.",
    "aliases": [],
    "sources": [
      {
        "label": "MITRE ATT&CK: DCSync",
        "url": "https://attack.mitre.org/techniques/T1003/006/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "RBCD": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Resource-based constrained delegation: a Kerberos delegation model in which the destination service’s account specifies which services may act on users’ behalf.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Kerberos constrained delegation",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview",
        "section": "Resource-based constrained delegation and S4U extensions",
        "kind": "primary"
      }
    ]
  },
  "gMSA": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Group managed service account: an Active Directory service identity with automatic password management that can be shared across multiple servers.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Group managed service accounts",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/group-managed-service-accounts-overview",
        "section": "Feature description",
        "kind": "primary"
      }
    ]
  },
  "dMSA": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Delegated managed service account: a Windows Server 2025 service-account type with managed credentials and authentication tied to authorized device identities.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Delegated managed service accounts",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/delegated-managed-service-accounts/delegated-managed-service-accounts-overview",
        "section": "Overview",
        "kind": "primary"
      }
    ]
  },
  "LAPS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Local Administrator Password Solution: Windows LAPS manages local administrator passwords and backs them up to Active Directory or Microsoft Entra ID.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Windows LAPS overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview",
        "section": "Windows LAPS; supported backup directories",
        "kind": "primary"
      }
    ]
  },
  "DPAPI": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Data Protection API: Windows facilities for protecting application data, normally within a user or computer context.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: CryptProtectData and data protection",
        "url": "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata",
        "section": "Remarks and protection scope",
        "kind": "primary"
      }
    ]
  },
  "LSASS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Local Security Authority Subsystem Service: a Windows process involved in authentication, local security policy, and credential handling.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Credentials processes",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication",
        "section": "Local Security Authority; Security Accounts Manager database",
        "kind": "primary"
      }
    ]
  },
  "LSA": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Local Security Authority: the Windows security subsystem responsible for authentication and local security policy.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Credentials processes",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication",
        "section": "Local Security Authority; Security Accounts Manager database",
        "kind": "primary"
      }
    ]
  },
  "SAM": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Security Accounts Manager: the Windows database of local user accounts and groups.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Credentials processes",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication",
        "section": "Local Security Authority; Security Accounts Manager database",
        "kind": "primary"
      }
    ]
  },
  "NTDS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "In these notes, the Active Directory database, stored in ntds.dit and including directory objects and protected credential data.",
    "aliases": [
      "ntds.dit",
      "NTDS.dit"
    ],
    "sources": [
      {
        "label": "Microsoft: Active Directory Domain Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview",
        "section": "Directory services and domain controllers",
        "kind": "primary"
      },
      {
        "label": "Microsoft: Passwords technical overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/passwords-technical-overview",
        "section": "Passwords stored as OWF; Passwords stored in Active Directory",
        "kind": "primary"
      }
    ]
  },
  "UPN": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "User principal name: a sign-in name written as a prefix and domain suffix joined by @, which need not be a mailbox address.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: User naming attributes",
        "url": "https://learn.microsoft.com/en-us/windows/win32/ad/naming-properties",
        "section": "userPrincipalName",
        "kind": "primary"
      }
    ]
  },
  "OU": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Organizational unit: an Active Directory container used to organize objects, delegate administration, and scope Group Policy.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Designing organizational units",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/creating-an-organizational-unit-design",
        "section": "OU owner role; Account OUs and resource OUs",
        "kind": "primary"
      }
    ]
  },
  "DC": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Domain controller: a server providing Active Directory Domain Services, including directory storage and domain authentication.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Active Directory Domain Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview",
        "section": "Directory services and domain controllers",
        "kind": "primary"
      },
      {
        "label": "Microsoft: Key Distribution Center",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/key-distribution-center",
        "section": "Authentication service and ticket-granting service",
        "kind": "primary"
      }
    ]
  },
  "DA": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Domain Admins: an Active Directory group with extensive domain privileges and, by default, local administrator membership on domain-joined computers.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Privileged accounts and groups",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory",
        "section": "Krbtgt and Domain Admins",
        "kind": "primary"
      }
    ]
  },
  "AD CS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Active Directory Certificate Services: Microsoft’s Windows Server role for issuing and managing public-key certificates.",
    "aliases": [
      "ADCS"
    ],
    "sources": [
      {
        "label": "Microsoft: Active Directory Certificate Services",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview",
        "section": "AD CS overview",
        "kind": "primary"
      }
    ]
  },
  "NTAuth": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A forest-wide Active Directory store of CA certificates trusted for particular authentication uses, including smart-card logon.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Enterprise NTAuth store",
        "url": "https://learn.microsoft.com/en-us/troubleshoot/windows-server/certificates-and-public-key-infrastructure-pki/import-third-party-ca-to-enterprise-ntauth-store",
        "section": "More information",
        "kind": "primary"
      }
    ]
  },
  "UAC": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "User Account Control: a Windows mechanism that separates ordinary application use from tasks requiring administrator approval or credentials.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: How User Account Control works",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/user-account-control/how-user-account-control-works",
        "section": "Administrator access tokens; consent and credential prompts",
        "kind": "primary"
      }
    ]
  },
  "SYSTEM": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "The built-in Windows LocalSystem service account, which has extensive local privileges and uses the computer’s identity on the network.",
    "aliases": [
      "NT AUTHORITY\\SYSTEM"
    ],
    "sources": [
      {
        "label": "Microsoft: LocalSystem account",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account",
        "section": "LocalSystem account",
        "kind": "primary"
      }
    ]
  },
  "HVCI": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Hypervisor-protected code integrity, also called memory integrity: a Windows protection that isolates kernel code-integrity checks using virtualization.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Memory integrity",
        "url": "https://learn.microsoft.com/en-us/windows/security/hardware-security/enable-virtualization-based-protection-of-code-integrity",
        "section": "Memory integrity overview",
        "kind": "primary"
      }
    ]
  },
  "WDAC": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Windows Defender Application Control, now called App Control for Business: policy-based control over which applications and drivers may run.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: App Control for Business",
        "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/appcontrol",
        "section": "App Control for Business",
        "kind": "primary"
      },
      {
        "label": "Microsoft: Windows 11 24H2, App Control for Business",
        "url": "https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-24h2",
        "section": "App Control for Business",
        "kind": "primary"
      }
    ]
  },
  "AMSI": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Antimalware Scan Interface: a Windows interface that lets applications submit content to a compatible antimalware provider for scanning.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Antimalware Scan Interface",
        "url": "https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal",
        "section": "AMSI overview",
        "kind": "primary"
      }
    ]
  },
  "LOLBIN": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Living-off-the-land binary: a legitimate program whose existing features can be misused for security-relevant actions.",
    "aliases": [
      "LOLBin",
      "LOLBins"
    ],
    "sources": [
      {
        "label": "LOLBAS project: About",
        "url": "https://lolbas-project.github.io/",
        "section": "Goals and criteria",
        "kind": "primary"
      }
    ]
  },
  "LOLBAS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Living Off The Land Binaries, Scripts and Libraries: a project cataloguing security-relevant uses of legitimate Windows components.",
    "aliases": [],
    "sources": [
      {
        "label": "LOLBAS project: About",
        "url": "https://lolbas-project.github.io/",
        "section": "Goals and criteria",
        "kind": "primary"
      }
    ]
  },
  "BYOVD": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Bring Your Own Vulnerable Driver: abuse involving security flaws in legitimate drivers, including signed drivers.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Recommended driver block rules",
        "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/microsoft-recommended-driver-block-rules",
        "section": "Vulnerable driver blocklist",
        "kind": "primary"
      }
    ]
  },
  "SeImpersonatePrivilege": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "The Windows user right that permits a process to impersonate an authenticated client.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Impersonate a client after authentication",
        "url": "https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/impersonate-a-client-after-authentication",
        "section": "Reference",
        "kind": "primary"
      }
    ]
  },
  "SMB": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Server Message Block: a network protocol for accessing shared files and other services.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: SMB overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview",
        "section": "Feature description",
        "kind": "primary"
      }
    ]
  },
  "LDAP": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Lightweight Directory Access Protocol: a standard protocol for accessing directory services.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 4511: LDAP",
        "url": "https://www.rfc-editor.org/rfc/rfc4511.html",
        "section": "Abstract; section 1",
        "kind": "primary"
      }
    ]
  },
  "LDAPS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "LDAP over TLS: LDAP communication protected by an encrypted transport connection.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: LDAP over SSL",
        "url": "https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-over-ssl-3rd-certification-authority",
        "section": "LDAP over SSL/TLS overview",
        "kind": "primary"
      }
    ]
  },
  "WinRM": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Windows Remote Management: Microsoft’s implementation of WS-Management for exchanging management information with systems.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Windows Remote Management",
        "url": "https://learn.microsoft.com/en-us/windows/win32/winrm/portal",
        "section": "Purpose",
        "kind": "primary"
      }
    ]
  },
  "RDP": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Remote Desktop Protocol: a protocol for presenting a remote graphical session and carrying user input.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Remote Desktop Protocol",
        "url": "https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/understanding-remote-desktop-protocol",
        "section": "Understanding RDP",
        "kind": "primary"
      }
    ]
  },
  "WMI": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Windows Management Instrumentation: Windows infrastructure for management information and administrative operations.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: WMI",
        "url": "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page",
        "section": "Purpose",
        "kind": "primary"
      }
    ]
  },
  "DCOM": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Distributed Component Object Model: an extension of COM that lets software components communicate across computers.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: COM and DCOM",
        "url": "https://learn.microsoft.com/en-us/windows/win32/com/com-clients-and-servers",
        "section": "Network extensions and distributed COM",
        "kind": "primary"
      }
    ]
  },
  "RPC": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Remote procedure call: a mechanism that lets software request work from another process, including one on another computer.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Remote Procedure Call",
        "url": "https://learn.microsoft.com/en-us/windows/win32/rpc/rpc-start-page",
        "section": "Purpose",
        "kind": "primary"
      }
    ]
  },
  "NTLM relay": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "An authentication-forwarding attack that misuses another party’s NTLM exchange.",
    "aliases": [],
    "sources": [
      {
        "label": "MITRE ATT&CK: Name Resolution Poisoning and SMB Relay",
        "url": "https://attack.mitre.org/techniques/T1557/001/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "EPA": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Extended Protection for Authentication: Windows protections using channel binding and service binding to strengthen authentication.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Extended Protection for Authentication",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/epa-support-in-service",
        "section": "What is EPA?; Service Binding",
        "kind": "primary"
      }
    ]
  },
  "channel binding": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A way to associate authentication at one protocol layer with the secure channel underneath it.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 5056: Channel bindings",
        "url": "https://www.rfc-editor.org/rfc/rfc5056.html",
        "section": "Abstract and section 2: Definitions",
        "kind": "primary"
      }
    ]
  },
  "SMB signing": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Cryptographic integrity protection for SMB messages that lets a receiver detect tampering.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: SMB signing overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview",
        "section": "How signing works",
        "kind": "primary"
      }
    ]
  },
  "MITM": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Man-in-the-middle: an attacker’s position between communicating parties, potentially allowing traffic interception or alteration.",
    "aliases": [
      "man-in-the-middle"
    ],
    "sources": [
      {
        "label": "MITRE ATT&CK: Adversary-in-the-Middle",
        "url": "https://attack.mitre.org/techniques/T1557/",
        "section": "Description (concept definition only)",
        "kind": "taxonomy"
      }
    ]
  },
  "ARP": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Address Resolution Protocol: a protocol for resolving a network-layer address to a link-layer address on a local network.",
    "aliases": [],
    "sources": [
      {
        "label": "RFC 826: Address Resolution Protocol",
        "url": "https://www.rfc-editor.org/rfc/rfc826.html",
        "section": "Abstract and protocol description",
        "kind": "primary"
      }
    ]
  },
  "EDR": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Endpoint detection and response: security capabilities for detecting, investigating, and responding to suspicious activity on devices.",
    "aliases": [],
    "sources": [
      {
        "label": "Microsoft: Endpoint detection and response",
        "url": "https://learn.microsoft.com/en-us/defender-endpoint/overview-endpoint-detection-response",
        "section": "Overview",
        "kind": "primary"
      }
    ]
  },
  "C2": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Command and control: communication used by an adversary to direct compromised systems.",
    "aliases": [],
    "sources": [
      {
        "label": "MITRE ATT&CK: Command and Control",
        "url": "https://attack.mitre.org/tactics/TA0011/",
        "section": "Description",
        "kind": "taxonomy"
      }
    ]
  },
  "BloodHound": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A graph-based tool for analyzing identity and access relationships, including Active Directory and Microsoft Entra ID.",
    "aliases": [],
    "sources": [
      {
        "label": "SpecterOps: BloodHound introduction",
        "url": "https://bloodhound.specterops.io/get-started/introduction",
        "section": "Introduction",
        "kind": "primary"
      }
    ]
  },
  "tier-0": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "The identity-control tier in the legacy Active Directory administration model, expanded into the control plane in Microsoft’s enterprise access model.",
    "aliases": [
      "tier 0"
    ],
    "sources": [
      {
        "label": "Microsoft: Enterprise access model",
        "url": "https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model",
        "section": "Evolution from the legacy AD tier model; Tier 0 scope expansion",
        "kind": "primary"
      }
    ]
  },
  "NetNTLM": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A community name for NTLM challenge-response material, distinct from the stored NT password hash.",
    "aliases": [
      "NetNTLMv2",
      "NetNTLMv1"
    ],
    "sources": [
      {
        "label": "Hashcat: documented format names",
        "url": "https://hashcat.net/wiki/doku.php?id=hashcat",
        "section": "Options: format names NetNTLMv1 and NetNTLMv2 (names only)",
        "kind": "primary"
      },
      {
        "label": "Microsoft: NTLM",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm",
        "section": "NTLM authentication",
        "kind": "primary"
      }
    ]
  },
  "coercion": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "In these notes, forced authentication: inducing another system to initiate an authentication exchange.",
    "aliases": [
      "coerce",
      "coerced"
    ],
    "sources": [
      {
        "label": "MITRE ATT&CK: Forced Authentication",
        "url": "https://attack.mitre.org/techniques/T1187/",
        "section": "Opening conceptual definition only",
        "kind": "taxonomy"
      }
    ]
  },
  "Potato": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Local naming convention and cited tool names only; no assessment of mechanisms or applicability.",
    "short": "In these notes, an informal label for Windows privilege-escalation tools with “Potato” in their names.",
    "aliases": [],
    "sources": [
      {
        "label": "MITRE ATT&CK: Access Token Manipulation",
        "url": "https://attack.mitre.org/techniques/T1134/",
        "section": "Procedure Examples: JuicyPotato and BADPOTATO names only",
        "kind": "taxonomy"
      }
    ]
  },
  "UID": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "User identifier: a numeric identity used by Unix-like systems to represent a user.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux man-pages: process credentials",
        "url": "https://man7.org/linux/man-pages/man7/credentials.7.html",
        "section": "User and group identifiers",
        "kind": "primary"
      }
    ]
  },
  "GID": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Group identifier: a numeric identity used by Unix-like systems to represent a group.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux man-pages: process credentials",
        "url": "https://man7.org/linux/man-pages/man7/credentials.7.html",
        "section": "User and group identifiers",
        "kind": "primary"
      }
    ]
  },
  "EUID": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Effective user identifier: the user identity a Unix-like process uses for many permission checks.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux man-pages: process credentials",
        "url": "https://man7.org/linux/man-pages/man7/credentials.7.html",
        "section": "User and group identifiers",
        "kind": "primary"
      }
    ]
  },
  "SUID": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Set-user-ID: a file mode bit that, when honored during program execution, sets the process’s effective user ID to the file owner’s ID.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux man-pages: execve",
        "url": "https://man7.org/linux/man-pages/man2/execve.2.html",
        "section": "DESCRIPTION: set-user-ID and set-group-ID bits",
        "kind": "primary"
      }
    ]
  },
  "SGID": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Set-group-ID: a file mode bit that, when honored during program execution, sets the process’s effective group ID to the file’s group ID.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux man-pages: execve",
        "url": "https://man7.org/linux/man-pages/man2/execve.2.html",
        "section": "DESCRIPTION: set-user-ID and set-group-ID bits",
        "kind": "primary"
      }
    ]
  },
  "sudo": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A program that lets an authorized user run a command as another user according to a configured security policy.",
    "aliases": [],
    "sources": [
      {
        "label": "Sudo manual",
        "url": "https://www.sudo.ws/docs/man/sudo.man/",
        "section": "DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "cron": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A background service that runs jobs according to configured schedules.",
    "aliases": [],
    "sources": [
      {
        "label": "Cronie manual: cron",
        "url": "https://man7.org/linux/man-pages/man8/cron.8.html",
        "section": "NAME; DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "systemd": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A Linux system and service manager that can manage system-wide services and services for individual users.",
    "aliases": [],
    "sources": [
      {
        "label": "systemd manual",
        "url": "https://www.freedesktop.org/software/systemd/man/latest/systemd.html",
        "section": "DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "capabilities": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "In Linux, separately controllable privileges that divide the authority traditionally associated with the superuser.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux man-pages: capabilities",
        "url": "https://man7.org/linux/man-pages/man7/capabilities.7.html",
        "section": "DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "namespace": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "In Linux, an abstraction giving a group of processes its own view of a system resource.",
    "aliases": [
      "namespaces"
    ],
    "sources": [
      {
        "label": "Linux man-pages: namespaces",
        "url": "https://man7.org/linux/man-pages/man7/namespaces.7.html",
        "section": "DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "cgroup": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Control group: a Linux mechanism for grouping processes to monitor and manage their resource use.",
    "aliases": [
      "cgroups"
    ],
    "sources": [
      {
        "label": "Linux man-pages: cgroups",
        "url": "https://man7.org/linux/man-pages/man7/cgroups.7.html",
        "section": "DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "PATH": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "An environment variable listing directories used to search for executable programs named without a directory path.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux man-pages: environment",
        "url": "https://man7.org/linux/man-pages/man7/environ.7.html",
        "section": "DESCRIPTION: PATH",
        "kind": "primary"
      }
    ]
  },
  "NFS": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Network File System: a protocol that lets computers share files over a network.",
    "aliases": [],
    "sources": [
      {
        "label": "Linux NFS manual",
        "url": "https://man7.org/linux/man-pages/man5/nfs.5.html",
        "section": "DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "SELinux": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "Security-Enhanced Linux: a Linux security architecture for applying mandatory access-control policies.",
    "aliases": [],
    "sources": [
      {
        "label": "SELinux manual",
        "url": "https://man7.org/linux/man-pages/man8/selinux.8.html",
        "section": "DESCRIPTION",
        "kind": "primary"
      }
    ]
  },
  "AppArmor": {
    "comparedAt": "2026-09-06",
    "comparedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Definition and alias meaning only; no assessment of procedures, applicability or graph connections.",
    "short": "A Linux security module that uses application profiles to constrain programs’ permitted actions.",
    "aliases": [],
    "sources": [
      {
        "label": "Ubuntu: AppArmor",
        "url": "https://documentation.ubuntu.com/security/security-features/privilege-restriction/apparmor/",
        "section": "Introduction; Discretionary Access Control vs. Mandatory Access Control",
        "kind": "primary"
      }
    ]
  }
};
