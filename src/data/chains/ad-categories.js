import { cat } from '../lib.js';

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
/** @type {import('../schema.js').TechniqueNodeDef[]} */
export const adCategoryNodes = [
  // No-credentials branch (off network-recon)
  {
    "id": "ad-cat-noauth",
    "label": "No-Cred Enumeration",
    "phase": "recon",
    "kind": "category",
    "summary": "Distinguish network-visible information from directory read access.",
    "description": "This category concerns information visible before an account signs in. AD DS stores network objects in a structured directory, with authentication and access control governing access to that information. Directory objects have security protection that controls which operations a caller can perform. The existence of a directory service does not establish that its account information is available anonymously.",
    "mitre": {
      "id": "T1087",
      "url": "https://attack.mitre.org/techniques/T1087/"
    },
    "references": [
      {
        "label": "Microsoft, Active Directory Domain Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
        "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "The Hacker Recipes, MS-RPC recon",
        "url": "https://www.thehacker.recipes/ad/recon/ms-rpc"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "This category concerns information visible before an account signs in. AD DS stores network objects in a structured directory, with authentication and access control governing access to that information. Directory objects have security protection that controls which operations a caller can perform. The existence of a directory service does not establish that its account information is available anonymously.",
        "id": "ad-cat-noauth",
        "kind": "category",
        "label": "No-Cred Enumeration",
        "mitre": {
          "id": "T1087",
          "url": "https://attack.mitre.org/techniques/T1087/"
        },
        "phase": "recon",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory Domain Services overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          },
          {
            "label": "The Hacker Recipes, MS-RPC recon",
            "url": "https://www.thehacker.recipes/ad/recon/ms-rpc"
          }
        ],
        "summary": "Distinguish network-visible information from directory read access."
      },
      "claims": [
        {
          "text": "AD DS stores information about network objects and integrates sign-in authentication with access control to directory objects.",
          "section": "Microsoft, Active Directory Domain Services overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview"
          ]
        },
        {
          "text": "Directory-object security controls the operations each security principal can perform; anonymous readability cannot be inferred from the presence of AD DS alone.",
          "section": "Microsoft, Controlling Access to Objects in Active Directory Domain Services — Introduction; final clause is an editorial inference from object access control",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-poisoning",
    "label": "Poisoning & Relay",
    "phase": "initial-access",
    "kind": "category",
    "summary": "Separate name resolution from authentication material.",
    "description": "Name resolution helps a client identify a network destination; authentication addresses identity. LLMNR resolves names on the local link and is not a replacement for DNS. NTLM uses challenge-response authentication without sending the password itself. A captured response is therefore distinct from a plaintext password or the underlying password hash. These distinctions matter when interpreting reports of name-resolution poisoning or authentication relay.",
    "mitre": {
      "id": "T1557",
      "url": "https://attack.mitre.org/techniques/T1557/"
    },
    "references": [
      {
        "label": "IETF, RFC 4795: Link-Local Multicast Name Resolution",
        "url": "https://www.rfc-editor.org/rfc/rfc4795.html",
        "kind": "primary",
        "section": "1. Introduction"
      },
      {
        "label": "Microsoft, Microsoft NTLM",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, LLMNR/NBT-NS Poisoning & Relay",
        "url": "https://book.hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-network/spoofing-llmnr-nbt-ns-mdns-dns-and-wpad-and-relay-attacks.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Name resolution helps a client identify a network destination; authentication addresses identity. LLMNR resolves names on the local link and is not a replacement for DNS. NTLM uses challenge-response authentication without sending the password itself. A captured response is therefore distinct from a plaintext password or the underlying password hash. These distinctions matter when interpreting reports of name-resolution poisoning or authentication relay.",
        "id": "ad-cat-poisoning",
        "kind": "category",
        "label": "Poisoning & Relay",
        "mitre": {
          "id": "T1557",
          "url": "https://attack.mitre.org/techniques/T1557/"
        },
        "phase": "initial-access",
        "references": [
          {
            "kind": "primary",
            "label": "IETF, RFC 4795: Link-Local Multicast Name Resolution",
            "section": "1. Introduction",
            "url": "https://www.rfc-editor.org/rfc/rfc4795.html"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Microsoft NTLM",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm"
          },
          {
            "label": "HackTricks, LLMNR/NBT-NS Poisoning & Relay",
            "url": "https://book.hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-network/spoofing-llmnr-nbt-ns-mdns-dns-and-wpad-and-relay-attacks.html"
          }
        ],
        "summary": "Separate name resolution from authentication material."
      },
      "claims": [
        {
          "text": "LLMNR operates on the local link and is not a substitute for DNS.",
          "section": "IETF, RFC 4795: Link-Local Multicast Name Resolution — 1. Introduction",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4795.html"
          ]
        },
        {
          "text": "NTLM uses a challenge-response exchange without transmitting the password; the response is distinct from the password hash used in the authentication calculation.",
          "section": "Microsoft, Microsoft NTLM — NTLM authentication; NTLM noninteractive authentication",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-services",
    "label": "Exposed Services & Apps",
    "phase": "initial-access",
    "kind": "category",
    "summary": "Understand access boundaries around network services and applications.",
    "description": "Network services and applications have their own identity and permission models. An account can be local to a computer or belong to a domain. Authentication establishes an identity; authorization determines permitted actions and resources. Network reachability alone does not establish that a service permits anonymous access.",
    "mitre": {
      "id": "T1190",
      "url": "https://attack.mitre.org/techniques/T1190/"
    },
    "references": [
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "kind": "primary",
        "section": "Authentication and authorization: A travel analogy; Security principals and accounts"
      },
      {
        "label": "Microsoft, Authorization basics",
        "url": "https://learn.microsoft.com/en-us/entra/identity-platform/authorization-basics",
        "kind": "primary",
        "section": "Introduction; Role-based access control"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Network services and applications have their own identity and permission models. An account can be local to a computer or belong to a domain. Authentication establishes an identity; authorization determines permitted actions and resources. Network reachability alone does not establish that a service permits anonymous access.",
        "id": "ad-cat-services",
        "kind": "category",
        "label": "Exposed Services & Apps",
        "mitre": {
          "id": "T1190",
          "url": "https://attack.mitre.org/techniques/T1190/"
        },
        "phase": "initial-access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Authorization basics",
            "section": "Introduction; Role-based access control",
            "url": "https://learn.microsoft.com/en-us/entra/identity-platform/authorization-basics"
          }
        ],
        "summary": "Understand access boundaries around network services and applications."
      },
      "claims": [
        {
          "text": "Windows security principals can have local or domain-based accounts.",
          "section": "Microsoft, Windows Authentication Concepts — Security principals and accounts",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        },
        {
          "text": "Authentication and authorization address identity and permitted access respectively; connectivity alone is insufficient evidence of permission.",
          "section": "Microsoft, Authorization basics — Introduction; inference about connectivity from the distinction between identity and access control",
          "sources": [
            "https://learn.microsoft.com/en-us/entra/identity-platform/authorization-basics"
          ]
        }
      ]
    }
  },
  // Valid-credentials branch (tactic folders)
  {
    "id": "ad-cat-enum",
    "label": "Enumeration",
    "phase": "enumeration",
    "kind": "category",
    "summary": "Understand directory objects, attributes, and access controls.",
    "description": "Directory enumeration concerns learning about the objects and relationships represented in AD DS. The schema defines object classes and their attributes. Access control governs operations on those objects. A directory diagram can organize that information, but it does not by itself demonstrate a change in authority or a viable sequence of actions.",
    "mitre": {
      "id": "T1087.002",
      "url": "https://attack.mitre.org/techniques/T1087/002/"
    },
    "references": [
      {
        "label": "Microsoft, Active Directory Schema",
        "url": "https://learn.microsoft.com/en-us/windows/win32/adschema/active-directory-schema",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
        "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Active Directory Methodology",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html"
      },
      {
        "label": "The Hacker Recipes, BloodHound",
        "url": "https://www.thehacker.recipes/ad/recon/bloodhound/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Directory enumeration concerns learning about the objects and relationships represented in AD DS. The schema defines object classes and their attributes. Access control governs operations on those objects. A directory diagram can organize that information, but it does not by itself demonstrate a change in authority or a viable sequence of actions.",
        "id": "ad-cat-enum",
        "kind": "category",
        "label": "Enumeration",
        "mitre": {
          "id": "T1087.002",
          "url": "https://attack.mitre.org/techniques/T1087/002/"
        },
        "phase": "enumeration",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory Schema",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/adschema/active-directory-schema"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          },
          {
            "label": "HackTricks, Active Directory Methodology",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html"
          },
          {
            "label": "The Hacker Recipes, BloodHound",
            "url": "https://www.thehacker.recipes/ad/recon/bloodhound/"
          }
        ],
        "summary": "Understand directory objects, attributes, and access controls."
      },
      "claims": [
        {
          "text": "The AD schema formally defines the object classes and attributes available within a forest.",
          "section": "Microsoft, Active Directory Schema — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/adschema/active-directory-schema"
          ]
        },
        {
          "text": "Directory security controls the operations a caller may perform on objects; a diagram of those objects is insufficient evidence of a permission change.",
          "section": "Microsoft, Controlling Access to Objects in Active Directory Domain Services — Introduction; final clause is an editorial inference",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-credaccess",
    "label": "Credential Access",
    "phase": "credential-access",
    "kind": "category",
    "summary": "Recognize different forms of account authentication material.",
    "description": "ATT&CK uses Credential Access for attempts to obtain credentials such as account names and passwords. Windows also provides applications with APIs for managing credential information and a user credentials store. The type of information and the account it belongs to matter: a stored item does not, by its presence alone, establish wider or more privileged access.",
    "mitre": {
      "id": "T1552",
      "url": "https://attack.mitre.org/techniques/T1552/"
    },
    "references": [
      {
        "label": "MITRE ATT&CK, Credential Access",
        "url": "https://attack.mitre.org/tactics/TA0006/",
        "kind": "taxonomy",
        "section": "Description"
      },
      {
        "label": "Microsoft, Credentials Management",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Stealing Credentials",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "ATT&CK uses Credential Access for attempts to obtain credentials such as account names and passwords. Windows also provides applications with APIs for managing credential information and a user credentials store. The type of information and the account it belongs to matter: a stored item does not, by its presence alone, establish wider or more privileged access.",
        "id": "ad-cat-credaccess",
        "kind": "category",
        "label": "Credential Access",
        "mitre": {
          "id": "T1552",
          "url": "https://attack.mitre.org/techniques/T1552/"
        },
        "phase": "credential-access",
        "references": [
          {
            "kind": "taxonomy",
            "label": "MITRE ATT&CK, Credential Access",
            "section": "Description",
            "url": "https://attack.mitre.org/tactics/TA0006/"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Credentials Management",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management"
          },
          {
            "label": "HackTricks, Stealing Credentials",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html"
          }
        ],
        "summary": "Recognize different forms of account authentication material."
      },
      "claims": [
        {
          "text": "Credential Access is an ATT&CK tactic concerned with obtaining credentials such as account names and passwords.",
          "section": "MITRE ATT&CK, Credential Access — Description",
          "sources": [
            "https://attack.mitre.org/tactics/TA0006/"
          ]
        },
        {
          "text": "Windows Credentials Management APIs obtain and manage credential information and provide a user credentials store.",
          "section": "Microsoft, Credentials Management — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-coercion",
    "label": "Coercion & Forced Auth",
    "phase": "credential-access",
    "kind": "category",
    "summary": "Understand the identity behind an authentication event.",
    "description": "Authentication activity has an account context. A Windows service runs under its configured account, with an access token attached to its process. Authentication establishes identity, while authorization determines permitted access. An observed authentication event therefore should not be described as proof of administrative execution or domain-wide authority.",
    "mitre": {
      "id": "T1187",
      "url": "https://attack.mitre.org/techniques/T1187/"
    },
    "references": [
      {
        "label": "Microsoft, Service User Accounts",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Printers Spooler Service Abuse (Coercion)",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printers-spooler-service-abuse.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Authentication activity has an account context. A Windows service runs under its configured account, with an access token attached to its process. Authentication establishes identity, while authorization determines permitted access. An observed authentication event therefore should not be described as proof of administrative execution or domain-wide authority.",
        "id": "ad-cat-coercion",
        "kind": "category",
        "label": "Coercion & Forced Auth",
        "mitre": {
          "id": "T1187",
          "url": "https://attack.mitre.org/techniques/T1187/"
        },
        "phase": "credential-access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Service User Accounts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "label": "HackTricks, Printers Spooler Service Abuse (Coercion)",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printers-spooler-service-abuse.html"
          }
        ],
        "summary": "Understand the identity behind an authentication event."
      },
      "claims": [
        {
          "text": "A Windows service executes in the security context of its configured account and receives an access token for that account.",
          "section": "Microsoft, Service User Accounts — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        },
        {
          "text": "Authentication and authorization address identity and permitted access respectively; observing authentication alone does not prove administrative execution.",
          "section": "Microsoft, Windows Authentication Concepts — Authentication and authorization: A travel analogy; final clause is an editorial inference",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-roasting",
    "label": "Kerberos Roasting",
    "phase": "credential-access",
    "kind": "category",
    "summary": "Distinguish Kerberos ciphertext from passwords and stored hashes.",
    "description": "Kerberos uses encrypted authentication material, including tickets and session keys. The ticket and the surrounding protocol reply are distinct structures; neither should be described as a plaintext password or simply as a stored password hash. RFC 4120 also explains that Kerberos does not eliminate the risk of offline guessing when password-derived keys protect messages and the password is weak.",
    "mitre": {
      "id": "T1558",
      "url": "https://attack.mitre.org/techniques/T1558/"
    },
    "references": [
      {
        "label": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5)",
        "url": "https://www.rfc-editor.org/rfc/rfc4120.html",
        "kind": "primary",
        "section": "1. Introduction; 1.1. The Kerberos Protocol"
      },
      {
        "label": "HackTricks, Kerberoast",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/kerberoast.html"
      },
      {
        "label": "HackTricks, ASREPRoast",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/asreproast.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Kerberos uses encrypted authentication material, including tickets and session keys. The ticket and the surrounding protocol reply are distinct structures; neither should be described as a plaintext password or simply as a stored password hash. RFC 4120 also explains that Kerberos does not eliminate the risk of offline guessing when password-derived keys protect messages and the password is weak.",
        "id": "ad-cat-roasting",
        "kind": "category",
        "label": "Kerberos Roasting",
        "mitre": {
          "id": "T1558",
          "url": "https://attack.mitre.org/techniques/T1558/"
        },
        "phase": "credential-access",
        "references": [
          {
            "kind": "primary",
            "label": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5)",
            "section": "1. Introduction; 1.1. The Kerberos Protocol",
            "url": "https://www.rfc-editor.org/rfc/rfc4120.html"
          },
          {
            "label": "HackTricks, Kerberoast",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/kerberoast.html"
          },
          {
            "label": "HackTricks, ASREPRoast",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/asreproast.html"
          }
        ],
        "summary": "Distinguish Kerberos ciphertext from passwords and stored hashes."
      },
      "claims": [
        {
          "text": "Kerberos credentials include a ticket and a session key, with different parts of the exchange protected under different keys.",
          "section": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5) — 1.1. The Kerberos Protocol",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4120.html"
          ]
        },
        {
          "text": "RFC 4120 identifies weak-password offline guessing as a risk that Kerberos does not solve.",
          "section": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5) — 1.6. Environmental Assumptions",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4120.html"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-managed-secrets",
    "label": "Managed Secrets (LAPS/gMSA)",
    "phase": "credential-access",
    "kind": "category",
    "summary": "Distinguish local administrator passwords from service identities.",
    "description": "Windows LAPS manages and backs up local administrator account passwords on supported joined devices; it can also manage domain controllers' Directory Services Restore Mode passwords. A group Managed Service Account is a domain service identity that can be shared across multiple servers while Windows manages its password. LAPS and gMSA solve different account-management problems and should not be treated as interchangeable secret stores.",
    "references": [
      {
        "label": "Microsoft, Windows LAPS overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Group Managed Service Accounts overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/group-managed-service-accounts-overview",
        "kind": "primary",
        "section": "Feature description"
      },
      {
        "label": "HackTricks, LAPS",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/laps.html"
      },
      {
        "label": "The Hacker Recipes, ReadLAPSPassword",
        "url": "https://www.thehacker.recipes/ad/movement/dacl/readlapspassword"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows LAPS manages and backs up local administrator account passwords on supported joined devices; it can also manage domain controllers' Directory Services Restore Mode passwords. A group Managed Service Account is a domain service identity that can be shared across multiple servers while Windows manages its password. LAPS and gMSA solve different account-management problems and should not be treated as interchangeable secret stores.",
        "id": "ad-cat-managed-secrets",
        "kind": "category",
        "label": "Managed Secrets (LAPS/gMSA)",
        "phase": "credential-access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Windows LAPS overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Group Managed Service Accounts overview",
            "section": "Feature description",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/group-managed-service-accounts-overview"
          },
          {
            "label": "HackTricks, LAPS",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/laps.html"
          },
          {
            "label": "The Hacker Recipes, ReadLAPSPassword",
            "url": "https://www.thehacker.recipes/ad/movement/dacl/readlapspassword"
          }
        ],
        "summary": "Distinguish local administrator passwords from service identities."
      },
      "claims": [
        {
          "text": "Windows LAPS automatically manages and backs up local administrator passwords and can also manage DSRM passwords on domain controllers.",
          "section": "Microsoft, Windows LAPS overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview"
          ]
        },
        {
          "text": "A gMSA extends managed service-account functionality across multiple servers and delegates password management to Windows.",
          "section": "Microsoft, Group Managed Service Accounts overview — Feature description",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/group-managed-service-accounts-overview"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-dacl",
    "label": "DACL / ACL Abuse",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand discretionary permissions and audit settings.",
    "description": "An access control list contains entries identifying principals and the access associated with them. A discretionary ACL (DACL) governs allowed or denied access to an object; a system ACL (SACL) specifies access attempts to audit. Active Directory applies object-level security to directory operations. These controls have distinct roles and do not collectively mean that every permission grants domain administration.",
    "mitre": {
      "id": "T1098",
      "url": "https://attack.mitre.org/techniques/T1098/"
    },
    "references": [
      {
        "label": "Microsoft, Access Control Lists",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
        "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Abusing AD ACLs/ACEs",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
      },
      {
        "label": "The Hacker Recipes, DACL abuse",
        "url": "https://www.thehacker.recipes/ad/movement/dacl/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "An access control list contains entries identifying principals and the access associated with them. A discretionary ACL (DACL) governs allowed or denied access to an object; a system ACL (SACL) specifies access attempts to audit. Active Directory applies object-level security to directory operations. These controls have distinct roles and do not collectively mean that every permission grants domain administration.",
        "id": "ad-cat-dacl",
        "kind": "category",
        "label": "DACL / ACL Abuse",
        "mitre": {
          "id": "T1098",
          "url": "https://attack.mitre.org/techniques/T1098/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Access Control Lists",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          },
          {
            "label": "HackTricks, Abusing AD ACLs/ACEs",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
          },
          {
            "label": "The Hacker Recipes, DACL abuse",
            "url": "https://www.thehacker.recipes/ad/movement/dacl/"
          }
        ],
        "summary": "Understand discretionary permissions and audit settings."
      },
      "claims": [
        {
          "text": "DACLs control allowed or denied object access, while SACL entries identify access attempts to audit.",
          "section": "Microsoft, Access Control Lists — Introduction; DACLs and SACLs",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists"
          ]
        },
        {
          "text": "Active Directory object security controls the directory operations that each security principal can perform.",
          "section": "Microsoft, Controlling Access to Objects in Active Directory Domain Services — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-adcs",
    "label": "AD CS Abuse",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand certificate issuance and its security responsibilities.",
    "description": "AD CS is a Windows Server role for issuing and managing public key infrastructure certificates. Certificates can support encryption, digital signatures, and authentication of users, computers, or devices. A certification authority attests to identity by issuing signed certificates. Reviewing certificate security therefore involves distinct questions about identity, issuance policy, and intended use.",
    "mitre": {
      "id": "T1649",
      "url": "https://attack.mitre.org/techniques/T1649/"
    },
    "references": [
      {
        "label": "Microsoft, Active Directory Certificate Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Certification Authority role service",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certification-authority-role",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "SpecterOps, Certified Pre-Owned",
        "url": "https://specterops.io/blog/2021/06/17/certified-pre-owned/"
      },
      {
        "label": "The Hacker Recipes, AD CS",
        "url": "https://www.thehacker.recipes/ad/movement/adcs/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "AD CS is a Windows Server role for issuing and managing public key infrastructure certificates. Certificates can support encryption, digital signatures, and authentication of users, computers, or devices. A certification authority attests to identity by issuing signed certificates. Reviewing certificate security therefore involves distinct questions about identity, issuance policy, and intended use.",
        "id": "ad-cat-adcs",
        "kind": "category",
        "label": "AD CS Abuse",
        "mitre": {
          "id": "T1649",
          "url": "https://attack.mitre.org/techniques/T1649/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory Certificate Services overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Certification Authority role service",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certification-authority-role"
          },
          {
            "label": "SpecterOps, Certified Pre-Owned",
            "url": "https://specterops.io/blog/2021/06/17/certified-pre-owned/"
          },
          {
            "label": "The Hacker Recipes, AD CS",
            "url": "https://www.thehacker.recipes/ad/movement/adcs/"
          }
        ],
        "summary": "Understand certificate issuance and its security responsibilities."
      },
      "claims": [
        {
          "text": "AD CS issues and manages PKI certificates that can support encryption, digital signatures, and account authentication.",
          "section": "Microsoft, Active Directory Certificate Services overview — Introduction; Issue and manage certificates",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview"
          ]
        },
        {
          "text": "A certification authority attests to an entity's identity by issuing a digitally signed certificate and can manage, revoke, or renew certificates.",
          "section": "Microsoft, Certification Authority role service — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certification-authority-role"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-adcs-template",
    "label": "Vulnerable Templates",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand the policy represented by a certificate template.",
    "description": "Certificate templates define rules and settings applied to certificate requests and guide clients in preparing requests. Enterprise CAs use templates stored in AD DS. Template permissions also control which users and computers can read templates and enroll for certificates. A template is an issuance-policy object, so its name alone does not establish that it is vulnerable or grants a particular identity.",
    "mitre": {
      "id": "T1649",
      "url": "https://attack.mitre.org/techniques/T1649/"
    },
    "references": [
      {
        "label": "Microsoft, Certificate template concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-template-concepts",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "SpecterOps, Certified Pre-Owned",
        "url": "https://specterops.io/blog/2021/06/17/certified-pre-owned/"
      },
      {
        "label": "The Hacker Recipes, Certificate templates",
        "url": "https://www.thehacker.recipes/ad/movement/adcs/certificate-templates"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Certificate templates define rules and settings applied to certificate requests and guide clients in preparing requests. Enterprise CAs use templates stored in AD DS. Template permissions also control which users and computers can read templates and enroll for certificates. A template is an issuance-policy object, so its name alone does not establish that it is vulnerable or grants a particular identity.",
        "id": "ad-cat-adcs-template",
        "kind": "category",
        "label": "Vulnerable Templates",
        "mitre": {
          "id": "T1649",
          "url": "https://attack.mitre.org/techniques/T1649/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Certificate template concepts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-template-concepts"
          },
          {
            "label": "SpecterOps, Certified Pre-Owned",
            "url": "https://specterops.io/blog/2021/06/17/certified-pre-owned/"
          },
          {
            "label": "The Hacker Recipes, Certificate templates",
            "url": "https://www.thehacker.recipes/ad/movement/adcs/certificate-templates"
          }
        ],
        "summary": "Understand the policy represented by a certificate template."
      },
      "claims": [
        {
          "text": "Certificate templates specify rules for incoming requests and instructions for clients preparing requests.",
          "section": "Microsoft, Certificate template concepts — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-template-concepts"
          ]
        },
        {
          "text": "Enterprise CAs use templates stored in AD DS, and template administration includes controlling read and enrollment permissions.",
          "section": "Microsoft, Certificate template concepts — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certificate-template-concepts"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-adcs-ca",
    "label": "CA, Relay & Forging",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Distinguish CA trust, issuance policy, and certificate status.",
    "description": "A certification authority vouches for identities through signed certificates and manages their issuance, renewal, and revocation. Enterprise CAs integrate with AD DS and use certificate templates; standalone CAs do not use those templates or require AD DS. AD CS also includes a separate Online Responder role for answering certificate revocation-status requests. These are different responsibilities within a PKI.",
    "mitre": {
      "id": "T1649",
      "url": "https://attack.mitre.org/techniques/T1649/"
    },
    "references": [
      {
        "label": "Microsoft, Certification Authority role service",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certification-authority-role",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Active Directory Certificate Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "SpecterOps, Certified Pre-Owned",
        "url": "https://specterops.io/blog/2021/06/17/certified-pre-owned/"
      },
      {
        "label": "The Hacker Recipes, Access controls",
        "url": "https://www.thehacker.recipes/ad/movement/adcs/access-controls"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "A certification authority vouches for identities through signed certificates and manages their issuance, renewal, and revocation. Enterprise CAs integrate with AD DS and use certificate templates; standalone CAs do not use those templates or require AD DS. AD CS also includes a separate Online Responder role for answering certificate revocation-status requests. These are different responsibilities within a PKI.",
        "id": "ad-cat-adcs-ca",
        "kind": "category",
        "label": "CA, Relay & Forging",
        "mitre": {
          "id": "T1649",
          "url": "https://attack.mitre.org/techniques/T1649/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Certification Authority role service",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certification-authority-role"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory Certificate Services overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview"
          },
          {
            "label": "SpecterOps, Certified Pre-Owned",
            "url": "https://specterops.io/blog/2021/06/17/certified-pre-owned/"
          },
          {
            "label": "The Hacker Recipes, Access controls",
            "url": "https://www.thehacker.recipes/ad/movement/adcs/access-controls"
          }
        ],
        "summary": "Distinguish CA trust, issuance policy, and certificate status."
      },
      "claims": [
        {
          "text": "Enterprise CAs integrate with AD DS and use templates; standalone CAs do not require AD DS or use templates.",
          "section": "Microsoft, Certification Authority role service — Introduction; Enterprise and Standalone certification authorities",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/certification-authority-role"
          ]
        },
        {
          "text": "The AD CS Online Responder evaluates certificate revocation status and returns signed status information.",
          "section": "Microsoft, Active Directory Certificate Services overview — Key features: Online Responder",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-delegation",
    "label": "Kerberos Delegation",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand services acting on behalf of their clients.",
    "description": "Kerberos delegation lets a service use a client's identity when communicating with another service. Constrained delegation limits the services for which that delegated identity can be used. This is an application trust boundary: the delegation model describes permitted representation between services, rather than unrestricted authority as every user across the domain.",
    "mitre": {
      "id": "T1558",
      "url": "https://attack.mitre.org/techniques/T1558/"
    },
    "references": [
      {
        "label": "Microsoft, Kerberos authentication overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Kerberos constrained delegation overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Unconstrained Delegation",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/unconstrained-delegation.html"
      },
      {
        "label": "The Hacker Recipes, Constrained delegation",
        "url": "https://www.thehacker.recipes/ad/movement/kerberos/delegations/constrained"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Kerberos delegation lets a service use a client's identity when communicating with another service. Constrained delegation limits the services for which that delegated identity can be used. This is an application trust boundary: the delegation model describes permitted representation between services, rather than unrestricted authority as every user across the domain.",
        "id": "ad-cat-delegation",
        "kind": "category",
        "label": "Kerberos Delegation",
        "mitre": {
          "id": "T1558",
          "url": "https://attack.mitre.org/techniques/T1558/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Kerberos authentication overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Kerberos constrained delegation overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview"
          },
          {
            "label": "HackTricks, Unconstrained Delegation",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/unconstrained-delegation.html"
          },
          {
            "label": "The Hacker Recipes, Constrained delegation",
            "url": "https://www.thehacker.recipes/ad/movement/kerberos/delegations/constrained"
          }
        ],
        "summary": "Understand services acting on behalf of their clients."
      },
      "claims": [
        {
          "text": "Kerberos supports a service acting on behalf of its client when connecting to other services.",
          "section": "Microsoft, Kerberos authentication overview — Practical applications: Delegated authentication",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview"
          ]
        },
        {
          "text": "Constrained delegation limits where application services can act on a user's behalf.",
          "section": "Microsoft, Kerberos constrained delegation overview — Feature description; Practical applications",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-cve",
    "label": "Critical CVEs",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Separate vulnerability identification, severity, and local impact.",
    "description": "A CVE Record associates an identifier with vulnerability information, affected products and versions, and references. CVSS expresses severity; it is not a measure of risk. A category of critical vulnerabilities therefore does not establish that every listed issue affects a particular installation or has the same outcome.",
    "mitre": {
      "id": "T1068",
      "url": "https://attack.mitre.org/techniques/T1068/"
    },
    "references": [
      {
        "label": "CVE Program, CVE Record Lifecycle",
        "url": "https://www.cve.org/about/Process",
        "section": "CVE Records",
        "kind": "primary"
      },
      {
        "label": "NIST NVD, Vulnerability Metrics",
        "url": "https://nvd.nist.gov/vuln-metrics/cvss",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Active Directory Methodology",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "A CVE Record associates an identifier with vulnerability information, affected products and versions, and references. CVSS expresses severity; it is not a measure of risk. A category of critical vulnerabilities therefore does not establish that every listed issue affects a particular installation or has the same outcome.",
        "id": "ad-cat-cve",
        "kind": "category",
        "label": "Critical CVEs",
        "mitre": {
          "id": "T1068",
          "url": "https://attack.mitre.org/techniques/T1068/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "CVE Program, CVE Record Lifecycle",
            "section": "CVE Records",
            "url": "https://www.cve.org/about/Process"
          },
          {
            "kind": "primary",
            "label": "NIST NVD, Vulnerability Metrics",
            "section": "Introduction",
            "url": "https://nvd.nist.gov/vuln-metrics/cvss"
          },
          {
            "label": "HackTricks, Active Directory Methodology",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/index.html"
          }
        ],
        "summary": "Separate vulnerability identification, severity, and local impact."
      },
      "claims": [
        {
          "text": "CVE Records include descriptive vulnerability information, affected products and versions, and references.",
          "section": "CVE Program, CVE Record Lifecycle — CVE Records",
          "sources": [
            "https://www.cve.org/about/Process"
          ]
        },
        {
          "text": "CVSS measures vulnerability severity rather than risk.",
          "section": "NIST NVD, Vulnerability Metrics — Introduction",
          "sources": [
            "https://nvd.nist.gov/vuln-metrics/cvss"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-lateral",
    "label": "Lateral Movement",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Understand movement between systems and distinct access decisions.",
    "description": "ATT&CK defines Lateral Movement around entering and controlling other systems on a network. Remote administration technologies may appear in descriptions of this behavior, but a successful sign-in and permission to perform a particular action remain separate questions. Each destination has its own access decision; a network connection alone does not establish authority there.",
    "mitre": {
      "id": "T1021",
      "url": "https://attack.mitre.org/techniques/T1021/"
    },
    "references": [
      {
        "label": "MITRE ATT&CK, Lateral Movement",
        "url": "https://attack.mitre.org/tactics/TA0008/",
        "kind": "taxonomy",
        "section": "Description"
      },
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Lateral Movement",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "ATT&CK defines Lateral Movement around entering and controlling other systems on a network. Remote administration technologies may appear in descriptions of this behavior, but a successful sign-in and permission to perform a particular action remain separate questions. Each destination has its own access decision; a network connection alone does not establish authority there.",
        "id": "ad-cat-lateral",
        "kind": "category",
        "label": "Lateral Movement",
        "mitre": {
          "id": "T1021",
          "url": "https://attack.mitre.org/techniques/T1021/"
        },
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "taxonomy",
            "label": "MITRE ATT&CK, Lateral Movement",
            "section": "Description",
            "url": "https://attack.mitre.org/tactics/TA0008/"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "label": "HackTricks, Lateral Movement",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/index.html"
          }
        ],
        "summary": "Understand movement between systems and distinct access decisions."
      },
      "claims": [
        {
          "text": "Lateral Movement is an ATT&CK tactic describing entry to and control of remote systems on a network.",
          "section": "MITRE ATT&CK, Lateral Movement — Description",
          "sources": [
            "https://attack.mitre.org/tactics/TA0008/"
          ]
        },
        {
          "text": "Identity verification and authorization to use a resource are separate parts of access control.",
          "section": "Microsoft, Windows Authentication Concepts — Authentication and authorization: A travel analogy",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-cred-reuse",
    "label": "Credential Reuse",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Distinguish an authenticated identity from its permissions.",
    "description": "This category groups risks involving reused authentication material. Authentication establishes an identity, while authorization determines which resources and actions that identity can access. Successful authentication alone does not establish administrative authority or command execution.",
    "mitre": {
      "id": "T1550",
      "url": "https://attack.mitre.org/techniques/T1550/"
    },
    "references": [
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "kind": "primary",
        "section": "Authentication and authorization: A travel analogy; Security principals and accounts"
      },
      {
        "label": "Microsoft, Authorization basics",
        "url": "https://learn.microsoft.com/en-us/entra/identity-platform/authorization-basics",
        "kind": "primary",
        "section": "Introduction; Role-based access control"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "This category groups risks involving reused authentication material. Authentication establishes an identity, while authorization determines which resources and actions that identity can access. Successful authentication alone does not establish administrative authority or command execution.",
        "id": "ad-cat-cred-reuse",
        "kind": "category",
        "label": "Credential Reuse",
        "mitre": {
          "id": "T1550",
          "url": "https://attack.mitre.org/techniques/T1550/"
        },
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Authorization basics",
            "section": "Introduction; Role-based access control",
            "url": "https://learn.microsoft.com/en-us/entra/identity-platform/authorization-basics"
          }
        ],
        "summary": "Distinguish an authenticated identity from its permissions."
      },
      "claims": [
        {
          "text": "Authentication establishes identity and does not itself guarantee access to a resource.",
          "section": "Microsoft, Windows Authentication Concepts — Authentication and authorization: A travel analogy",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        },
        {
          "text": "Authorization governs permitted functionality and data access, including the actions allowed on that data.",
          "section": "Microsoft, Authorization basics — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/entra/identity-platform/authorization-basics"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-mssql",
    "label": "MSSQL Abuse",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Understand SQL Server identities, roles, and resource permissions.",
    "description": "SQL Server distinguishes server-level logins and roles from database-level users and roles. Permissions regulate access to resources called securables, organized into server, database, and schema scopes. A database connection is therefore only one part of understanding an account's authority.",
    "references": [
      {
        "label": "Microsoft, SQL Server principals",
        "url": "https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/principals-database-engine?view=sql-server-ver17",
        "kind": "primary",
        "section": "Introduction; SQL Server-level principals; Database-level principals"
      },
      {
        "label": "Microsoft, SQL Server securables",
        "url": "https://learn.microsoft.com/en-us/sql/relational-databases/security/securables?view=sql-server-ver17",
        "kind": "primary",
        "section": "Introduction; Control Access to a Securable"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "SQL Server distinguishes server-level logins and roles from database-level users and roles. Permissions regulate access to resources called securables, organized into server, database, and schema scopes. A database connection is therefore only one part of understanding an account's authority.",
        "id": "ad-cat-mssql",
        "kind": "category",
        "label": "MSSQL Abuse",
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, SQL Server principals",
            "section": "Introduction; SQL Server-level principals; Database-level principals",
            "url": "https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/principals-database-engine?view=sql-server-ver17"
          },
          {
            "kind": "primary",
            "label": "Microsoft, SQL Server securables",
            "section": "Introduction; Control Access to a Securable",
            "url": "https://learn.microsoft.com/en-us/sql/relational-databases/security/securables?view=sql-server-ver17"
          }
        ],
        "summary": "Understand SQL Server identities, roles, and resource permissions."
      },
      "claims": [
        {
          "text": "SQL Server has distinct server-level and database-level principals.",
          "section": "Microsoft, SQL Server principals — SQL Server-level principals; Database-level principals",
          "sources": [
            "https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/principals-database-engine?view=sql-server-ver17"
          ]
        },
        {
          "text": "SQL Server authorization controls access to securables within server, database, and schema scopes.",
          "section": "Microsoft, SQL Server securables — Introduction; Control Access to a Securable",
          "sources": [
            "https://learn.microsoft.com/en-us/sql/relational-databases/security/securables?view=sql-server-ver17"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-sccm",
    "label": "SCCM / MECM",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Understand Configuration Manager administrative roles and scope.",
    "description": "Configuration Manager combines security roles, security scopes, and collections to define administrative access. Roles describe permitted actions, scopes group managed objects, and collections identify users and devices. These assignments determine what an administrator can manage; access to the platform should not be described as automatic control of every endpoint.",
    "references": [
      {
        "label": "Microsoft, Configuration Manager role-based administration",
        "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration",
        "kind": "primary",
        "section": "Introduction; Security roles; Collections; Security scopes"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Configuration Manager combines security roles, security scopes, and collections to define administrative access. Roles describe permitted actions, scopes group managed objects, and collections identify users and devices. These assignments determine what an administrator can manage; access to the platform should not be described as automatic control of every endpoint.",
        "id": "ad-cat-sccm",
        "kind": "category",
        "label": "SCCM / MECM",
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Configuration Manager role-based administration",
            "section": "Introduction; Security roles; Collections; Security scopes",
            "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          }
        ],
        "summary": "Understand Configuration Manager administrative roles and scope."
      },
      "claims": [
        {
          "text": "Roles, security scopes, and collections jointly define Configuration Manager administrative scope.",
          "section": "Microsoft, Configuration Manager role-based administration — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          ]
        },
        {
          "text": "Collections identify the users and devices an administrator can view or manage.",
          "section": "Microsoft, Configuration Manager role-based administration — Collections",
          "sources": [
            "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-deploy-abuse",
    "label": "Deployment Platform Abuse",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Understand who can administer software-management platforms.",
    "description": "Software-management platforms use administrative permissions to govern changes. In Intune, roles define allowed actions, while role assignments include scope groups for the users and devices an administrator can manage. Configuration Manager likewise combines roles, scopes, and collections. Administrative reach is determined by the assigned authority, not simply by whether the platform is reachable.",
    "mitre": {
      "id": "T1072",
      "url": "https://attack.mitre.org/techniques/T1072/"
    },
    "references": [
      {
        "label": "Microsoft, Intune role-based access control",
        "url": "https://learn.microsoft.com/en-us/intune/fundamentals/role-based-access-control/overview",
        "kind": "primary",
        "section": "RBAC Roles; About Intune role assignments"
      },
      {
        "label": "Microsoft, Configuration Manager role-based administration",
        "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration",
        "kind": "primary",
        "section": "Introduction; Security roles; Collections; Security scopes"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Software-management platforms use administrative permissions to govern changes. In Intune, roles define allowed actions, while role assignments include scope groups for the users and devices an administrator can manage. Configuration Manager likewise combines roles, scopes, and collections. Administrative reach is determined by the assigned authority, not simply by whether the platform is reachable.",
        "id": "ad-cat-deploy-abuse",
        "kind": "category",
        "label": "Deployment Platform Abuse",
        "mitre": {
          "id": "T1072",
          "url": "https://attack.mitre.org/techniques/T1072/"
        },
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Intune role-based access control",
            "section": "RBAC Roles; About Intune role assignments",
            "url": "https://learn.microsoft.com/en-us/intune/fundamentals/role-based-access-control/overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Configuration Manager role-based administration",
            "section": "Introduction; Security roles; Collections; Security scopes",
            "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          }
        ],
        "summary": "Understand who can administer software-management platforms."
      },
      "claims": [
        {
          "text": "Intune roles define permitted actions and assignment scope groups identify managed users and devices.",
          "section": "Microsoft, Intune role-based access control — RBAC Roles; About Intune role assignments",
          "sources": [
            "https://learn.microsoft.com/en-us/intune/fundamentals/role-based-access-control/overview"
          ]
        },
        {
          "text": "Configuration Manager combines roles, scopes, and collections to define administrative access.",
          "section": "Microsoft, Configuration Manager role-based administration — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          ]
        }
      ]
    }
  },
  // Service & Platform Abuse: wraps the server-side service / management-platform pivots.
  {
    "id": "ad-cat-platform",
    "label": "Service & Platform Abuse",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Compare access boundaries in databases and management platforms.",
    "description": "Databases and management platforms organize authority differently. SQL Server applies permissions to securables such as databases and tables. Configuration Manager uses roles, scopes, and collections to separate administrative responsibilities. Learning these access models helps distinguish a service connection from the authority to change managed resources.",
    "references": [
      {
        "label": "Microsoft, SQL Server securables",
        "url": "https://learn.microsoft.com/en-us/sql/relational-databases/security/securables?view=sql-server-ver17",
        "kind": "primary",
        "section": "Introduction; Control Access to a Securable"
      },
      {
        "label": "Microsoft, Configuration Manager role-based administration",
        "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration",
        "kind": "primary",
        "section": "Introduction; Security roles; Collections; Security scopes"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Databases and management platforms organize authority differently. SQL Server applies permissions to securables such as databases and tables. Configuration Manager uses roles, scopes, and collections to separate administrative responsibilities. Learning these access models helps distinguish a service connection from the authority to change managed resources.",
        "id": "ad-cat-platform",
        "kind": "category",
        "label": "Service & Platform Abuse",
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, SQL Server securables",
            "section": "Introduction; Control Access to a Securable",
            "url": "https://learn.microsoft.com/en-us/sql/relational-databases/security/securables?view=sql-server-ver17"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Configuration Manager role-based administration",
            "section": "Introduction; Security roles; Collections; Security scopes",
            "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          }
        ],
        "summary": "Compare access boundaries in databases and management platforms."
      },
      "claims": [
        {
          "text": "SQL Server controls access to resources called securables through its authorization system.",
          "section": "Microsoft, SQL Server securables — Introduction; Control Access to a Securable",
          "sources": [
            "https://learn.microsoft.com/en-us/sql/relational-databases/security/securables?view=sql-server-ver17"
          ]
        },
        {
          "text": "Configuration Manager administrative assignments can separate responsibilities through roles, scopes, and collections.",
          "section": "Microsoft, Configuration Manager role-based administration — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          ]
        }
      ]
    }
  },
  // Remote Execution transport groups (under lateral-movement-cme), by mechanism.
  {
    "id": "lat-cat-smb",
    "label": "SMB Service Exec",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Separate remote file access from a service's execution identity.",
    "description": "SMB provides network access to files and other server resources. Windows services have a separate execution context determined by their configured service account. Descriptions of remote service activity should distinguish the network protocol from the account under which a service runs; SMB use alone does not mean that a process runs as LocalSystem.",
    "mitre": {
      "id": "T1021.002",
      "url": "https://attack.mitre.org/techniques/T1021/002/"
    },
    "references": [
      {
        "label": "Microsoft, SMB overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Service User Accounts",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "HackTricks, PsExec / WinExec",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "SMB provides network access to files and other server resources. Windows services have a separate execution context determined by their configured service account. Descriptions of remote service activity should distinguish the network protocol from the account under which a service runs; SMB use alone does not mean that a process runs as LocalSystem.",
        "id": "lat-cat-smb",
        "kind": "category",
        "label": "SMB Service Exec",
        "mitre": {
          "id": "T1021.002",
          "url": "https://attack.mitre.org/techniques/T1021/002/"
        },
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, SMB overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Service User Accounts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          },
          {
            "label": "HackTricks, PsExec / WinExec",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/psexec-and-winexec.html"
          }
        ],
        "summary": "Separate remote file access from a service's execution identity."
      },
      "claims": [
        {
          "text": "SMB is a network file-sharing protocol that lets applications access remote files and other server resources.",
          "section": "Microsoft, SMB overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview"
          ]
        },
        {
          "text": "A Windows service runs in its configured account's security context. Inferring LocalSystem solely from SMB use is not supported by this account model.",
          "section": "Microsoft, Service User Accounts — Introduction; final sentence is an editorial inference",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        }
      ]
    }
  },
  {
    "id": "lat-cat-wmidcom",
    "label": "WMI / DCOM",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Distinguish management instrumentation from distributed objects.",
    "description": "WMI provides management information and operations for Windows. DCOM extends the Component Object Model across a network and uses RPC capabilities for authentication, authorization, and message integrity. These technologies have different responsibilities. Their presence does not establish a particular administrative permission or guarantee that activity avoids monitoring.",
    "mitre": {
      "id": "T1047",
      "url": "https://attack.mitre.org/techniques/T1047/"
    },
    "references": [
      {
        "label": "Microsoft, Windows Management Instrumentation",
        "url": "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, DCOM Remote Protocol overview",
        "url": "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-dcom/86b9cf84-df2e-4f0b-ac22-1b957627e1ca",
        "kind": "primary",
        "section": "1.3 Overview"
      },
      {
        "label": "HackTricks, WmiExec (Lateral Movement)",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/wmiexec.html"
      },
      {
        "label": "HackTricks, DCOMExec (Lateral Movement)",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/dcomexec.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "WMI provides management information and operations for Windows. DCOM extends the Component Object Model across a network and uses RPC capabilities for authentication, authorization, and message integrity. These technologies have different responsibilities. Their presence does not establish a particular administrative permission or guarantee that activity avoids monitoring.",
        "id": "lat-cat-wmidcom",
        "kind": "category",
        "label": "WMI / DCOM",
        "mitre": {
          "id": "T1047",
          "url": "https://attack.mitre.org/techniques/T1047/"
        },
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Windows Management Instrumentation",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page"
          },
          {
            "kind": "primary",
            "label": "Microsoft, DCOM Remote Protocol overview",
            "section": "1.3 Overview",
            "url": "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-dcom/86b9cf84-df2e-4f0b-ac22-1b957627e1ca"
          },
          {
            "label": "HackTricks, WmiExec (Lateral Movement)",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/wmiexec.html"
          },
          {
            "label": "HackTricks, DCOMExec (Lateral Movement)",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/dcomexec.html"
          }
        ],
        "summary": "Distinguish management instrumentation from distributed objects."
      },
      "claims": [
        {
          "text": "WMI supplies management data and operations for Windows systems.",
          "section": "Microsoft, Windows Management Instrumentation — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page"
          ]
        },
        {
          "text": "DCOM extends COM over a network and relies on RPC authentication, authorization, and message-integrity capabilities.",
          "section": "Microsoft, DCOM Remote Protocol overview — 1.3 Overview",
          "sources": [
            "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-dcom/86b9cf84-df2e-4f0b-ac22-1b957627e1ca"
          ]
        }
      ]
    }
  },
  {
    "id": "lat-cat-logon",
    "label": "Interactive Logon",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Distinguish remote desktops from management sessions.",
    "description": "Remote Desktop Services delivers desktops and individual applications to authorized users through a remote user interface. WinRM implements WS-Management for exchanging management information. These are different remote-access models; an interactive desktop and a management session should not be treated as the same capability or as a statement of administrative authority.",
    "mitre": {
      "id": "T1021",
      "url": "https://attack.mitre.org/techniques/T1021/"
    },
    "references": [
      {
        "label": "Microsoft, Remote Desktop Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Windows Remote Management",
        "url": "https://learn.microsoft.com/en-us/windows/win32/winrm/portal",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, WinRM (Lateral Movement)",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/winrm.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Remote Desktop Services delivers desktops and individual applications to authorized users through a remote user interface. WinRM implements WS-Management for exchanging management information. These are different remote-access models; an interactive desktop and a management session should not be treated as the same capability or as a statement of administrative authority.",
        "id": "lat-cat-logon",
        "kind": "category",
        "label": "Interactive Logon",
        "mitre": {
          "id": "T1021",
          "url": "https://attack.mitre.org/techniques/T1021/"
        },
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Remote Desktop Services overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Windows Remote Management",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/winrm/portal"
          },
          {
            "label": "HackTricks, WinRM (Lateral Movement)",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/winrm.html"
          }
        ],
        "summary": "Distinguish remote desktops from management sessions."
      },
      "claims": [
        {
          "text": "Remote Desktop Services lets authorized users access full desktops or individual RemoteApp applications.",
          "section": "Microsoft, Remote Desktop Services overview — What is Remote Desktop Services?",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/overview"
          ]
        },
        {
          "text": "WinRM is Microsoft's implementation of the WS-Management protocol for exchanging management information.",
          "section": "Microsoft, Windows Remote Management — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/winrm/portal"
          ]
        }
      ]
    }
  },
  {
    "id": "lat-cat-shell",
    "label": "Shells & Breakouts",
    "phase": "lateral-movement",
    "kind": "category",
    "summary": "Understand the scope of delegated PowerShell administration.",
    "description": "Just Enough Administration (JEA) delegates administrative work through PowerShell while limiting the commands available to a user. It can perform approved privileged actions using virtual accounts or group Managed Service Accounts, and provides session transcripts and logs. A restricted management session is therefore a defined administrative interface, not evidence that its user has an unrestricted shell.",
    "mitre": {
      "id": "T1059",
      "url": "https://attack.mitre.org/techniques/T1059/"
    },
    "references": [
      {
        "label": "Microsoft, Just Enough Administration overview",
        "url": "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/overview?view=powershell-7.6",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Internal All The Things, Reverse Shell Cheat Sheet",
        "url": "https://swisskyrepo.github.io/InternalAllTheThings/cheatsheets/shell-reverse-cheatsheet/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Just Enough Administration (JEA) delegates administrative work through PowerShell while limiting the commands available to a user. It can perform approved privileged actions using virtual accounts or group Managed Service Accounts, and provides session transcripts and logs. A restricted management session is therefore a defined administrative interface, not evidence that its user has an unrestricted shell.",
        "id": "lat-cat-shell",
        "kind": "category",
        "label": "Shells & Breakouts",
        "mitre": {
          "id": "T1059",
          "url": "https://attack.mitre.org/techniques/T1059/"
        },
        "phase": "lateral-movement",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Just Enough Administration overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/overview?view=powershell-7.6"
          },
          {
            "label": "Internal All The Things, Reverse Shell Cheat Sheet",
            "url": "https://swisskyrepo.github.io/InternalAllTheThings/cheatsheets/shell-reverse-cheatsheet/"
          }
        ],
        "summary": "Understand the scope of delegated PowerShell administration."
      },
      "claims": [
        {
          "text": "JEA supports delegated PowerShell administration and limits the cmdlets, functions, and external commands users can run.",
          "section": "Microsoft, Just Enough Administration overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/overview?view=powershell-7.6"
          ]
        },
        {
          "text": "JEA supports privileged actions through virtual accounts or gMSAs and provides transcripts and logs for session activity.",
          "section": "Microsoft, Just Enough Administration overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/overview?view=powershell-7.6"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-account-abuse",
    "label": "Account & Group Abuse",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand accounts, group membership, and assigned authority.",
    "description": "Windows identifies security principals with SIDs. AD security groups collect accounts and other groups so that administrators can assign resource permissions and user rights. Account identity, group membership, and the permissions assigned to that group are distinct pieces of the access-control model. Creating or changing an account is not a general statement of domain-wide authority.",
    "mitre": {
      "id": "T1098",
      "url": "https://attack.mitre.org/techniques/T1098/"
    },
    "references": [
      {
        "label": "Microsoft, Security principals",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Active Directory security groups",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups",
        "kind": "primary",
        "section": "Introduction; Group types; Group scope"
      },
      {
        "label": "The Hacker Recipes, MachineAccountQuota",
        "url": "https://www.thehacker.recipes/ad/movement/builtins/machineaccountquota"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows identifies security principals with SIDs. AD security groups collect accounts and other groups so that administrators can assign resource permissions and user rights. Account identity, group membership, and the permissions assigned to that group are distinct pieces of the access-control model. Creating or changing an account is not a general statement of domain-wide authority.",
        "id": "ad-cat-account-abuse",
        "kind": "category",
        "label": "Account & Group Abuse",
        "mitre": {
          "id": "T1098",
          "url": "https://attack.mitre.org/techniques/T1098/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Security principals",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory security groups",
            "section": "Introduction; Group types; Group scope",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          },
          {
            "label": "The Hacker Recipes, MachineAccountQuota",
            "url": "https://www.thehacker.recipes/ad/movement/builtins/machineaccountquota"
          }
        ],
        "summary": "Understand accounts, group membership, and assigned authority."
      },
      "claims": [
        {
          "text": "Windows represents security principals with unique security identifiers.",
          "section": "Microsoft, Security principals — What are security principals?; Security identifiers",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals"
          ]
        },
        {
          "text": "AD security groups collect accounts and groups and can receive resource permissions and user rights.",
          "section": "Microsoft, Active Directory security groups — What is a security group in Active Directory?; Security groups",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          ]
        }
      ]
    }
  },
  // ACL abuse grouped by the TARGET object you control (object-first framing).
  {
    "id": "acl-tgt-control",
    "label": "Control-Granting Rights",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Distinguish object ownership, permissions, and auditing.",
    "description": "A security descriptor can record an object's owner, its discretionary permissions, and its audit settings. Windows uses the DACL when deciding whether requested object access is allowed. Ownership and the ability to change security information deserve careful review, but neither should be reduced to a generic promise about the outcome of every linked technique.",
    "mitre": {
      "id": "T1098",
      "url": "https://attack.mitre.org/techniques/T1098/"
    },
    "references": [
      {
        "label": "Microsoft, Security Descriptors",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Access Control Lists",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Abusing AD ACLs/ACEs",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
      },
      {
        "label": "The Hacker Recipes, DACL abuse",
        "url": "https://www.thehacker.recipes/ad/movement/dacl/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "A security descriptor can record an object's owner, its discretionary permissions, and its audit settings. Windows uses the DACL when deciding whether requested object access is allowed. Ownership and the ability to change security information deserve careful review, but neither should be reduced to a generic promise about the outcome of every linked technique.",
        "id": "acl-tgt-control",
        "kind": "category",
        "label": "Control-Granting Rights",
        "mitre": {
          "id": "T1098",
          "url": "https://attack.mitre.org/techniques/T1098/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Security Descriptors",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Access Control Lists",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists"
          },
          {
            "label": "HackTricks, Abusing AD ACLs/ACEs",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
          },
          {
            "label": "The Hacker Recipes, DACL abuse",
            "url": "https://www.thehacker.recipes/ad/movement/dacl/"
          }
        ],
        "summary": "Distinguish object ownership, permissions, and auditing."
      },
      "claims": [
        {
          "text": "A security descriptor can include owner and group identifiers, a DACL, and a SACL.",
          "section": "Microsoft, Security Descriptors — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors"
          ]
        },
        {
          "text": "The system checks DACL entries to decide whether to grant requested access to a securable object.",
          "section": "Microsoft, Access Control Lists — DACLs and SACLs",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists"
          ]
        }
      ]
    }
  },
  {
    "id": "acl-tgt-user",
    "label": "Over a User",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Distinguish a user object from the permissions granted to its account.",
    "description": "A domain user account is represented by a security principal, while its directory object holds attributes defined by the AD schema. Access control determines which operations another principal may perform on that object. Permission to change particular directory data and the authority held by the represented user are separate aspects of the model.",
    "mitre": {
      "id": "T1098",
      "url": "https://attack.mitre.org/techniques/T1098/"
    },
    "references": [
      {
        "label": "Microsoft, Security principals",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
        "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Abusing AD ACLs/ACEs",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "A domain user account is represented by a security principal, while its directory object holds attributes defined by the AD schema. Access control determines which operations another principal may perform on that object. Permission to change particular directory data and the authority held by the represented user are separate aspects of the model.",
        "id": "acl-tgt-user",
        "kind": "category",
        "label": "Over a User",
        "mitre": {
          "id": "T1098",
          "url": "https://attack.mitre.org/techniques/T1098/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Security principals",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Controlling Access to Objects in Active Directory Domain Services",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          },
          {
            "label": "HackTricks, Abusing AD ACLs/ACEs",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
          }
        ],
        "summary": "Distinguish a user object from the permissions granted to its account."
      },
      "claims": [
        {
          "text": "Security principals created in an AD domain are directory objects used to manage access to domain resources.",
          "section": "Microsoft, Security principals — How security principals work",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals"
          ]
        },
        {
          "text": "Directory-object security controls the operations another security principal may perform on that object.",
          "section": "Microsoft, Controlling Access to Objects in Active Directory Domain Services — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/ad/controlling-access-to-objects-in-active-directory-domain-services"
          ]
        }
      ]
    }
  },
  {
    "id": "acl-tgt-computer",
    "label": "Over a Computer",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Distinguish computer-account identity from directory data.",
    "description": "Windows computer accounts are security principals with their own identifiers. Their AD objects contain attributes defined by the directory schema. The account, its directory attributes, and local user accounts on the represented computer are different concepts; a relationship to a computer object does not by itself specify local administrative access.",
    "mitre": {
      "id": "T1098",
      "url": "https://attack.mitre.org/techniques/T1098/"
    },
    "references": [
      {
        "label": "Microsoft, Security principals",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Active Directory Schema",
        "url": "https://learn.microsoft.com/en-us/windows/win32/adschema/active-directory-schema",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "The Hacker Recipes, RBCD",
        "url": "https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows computer accounts are security principals with their own identifiers. Their AD objects contain attributes defined by the directory schema. The account, its directory attributes, and local user accounts on the represented computer are different concepts; a relationship to a computer object does not by itself specify local administrative access.",
        "id": "acl-tgt-computer",
        "kind": "category",
        "label": "Over a Computer",
        "mitre": {
          "id": "T1098",
          "url": "https://attack.mitre.org/techniques/T1098/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Security principals",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory Schema",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/adschema/active-directory-schema"
          },
          {
            "label": "The Hacker Recipes, RBCD",
            "url": "https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd"
          }
        ],
        "summary": "Distinguish computer-account identity from directory data."
      },
      "claims": [
        {
          "text": "Computer accounts are security principals represented by SIDs.",
          "section": "Microsoft, Security principals — What are security principals?; Security identifiers",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals"
          ]
        },
        {
          "text": "The AD schema defines directory object classes and their attributes.",
          "section": "Microsoft, Active Directory Schema — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/adschema/active-directory-schema"
          ]
        }
      ]
    }
  },
  {
    "id": "acl-tgt-group",
    "label": "Over a Group",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand security-group membership and permission scope.",
    "description": "Security groups collect accounts and groups so that permissions can be assigned together. A group's scope affects where its permissions can be granted within the domain tree or forest. Membership matters through the rights and permissions associated with that group; different groups should not be treated as interchangeable administrative roles.",
    "mitre": {
      "id": "T1098.007",
      "url": "https://attack.mitre.org/techniques/T1098/007/"
    },
    "references": [
      {
        "label": "Microsoft, Active Directory security groups",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups",
        "kind": "primary",
        "section": "Introduction; Group types; Group scope"
      },
      {
        "label": "HackTricks, Abusing AD ACLs/ACEs",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Security groups collect accounts and groups so that permissions can be assigned together. A group's scope affects where its permissions can be granted within the domain tree or forest. Membership matters through the rights and permissions associated with that group; different groups should not be treated as interchangeable administrative roles.",
        "id": "acl-tgt-group",
        "kind": "category",
        "label": "Over a Group",
        "mitre": {
          "id": "T1098.007",
          "url": "https://attack.mitre.org/techniques/T1098/007/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory security groups",
            "section": "Introduction; Group types; Group scope",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          },
          {
            "label": "HackTricks, Abusing AD ACLs/ACEs",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse/index.html"
          }
        ],
        "summary": "Understand security-group membership and permission scope."
      },
      "claims": [
        {
          "text": "Security groups provide a way to assign shared-resource permissions to collections of accounts and groups.",
          "section": "Microsoft, Active Directory security groups — What is a security group in Active Directory?; Security groups",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          ]
        },
        {
          "text": "Group scope defines the areas of the network where permissions may be granted for a group.",
          "section": "Microsoft, Active Directory security groups — Group scope",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          ]
        }
      ]
    }
  },
  {
    "id": "acl-tgt-policy",
    "label": "Over a GPO, OU or Domain",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand Group Policy storage and application scope.",
    "description": "Group Policy centrally manages user and computer settings. A domain GPO has a container in AD DS and a template in SYSVOL. GPOs can be linked to sites, domains, and organizational units to define their application scope. Policy settings, link scope, and permissions are distinct parts of that configuration.",
    "mitre": {
      "id": "T1484.001",
      "url": "https://attack.mitre.org/techniques/T1484/001/"
    },
    "references": [
      {
        "label": "Microsoft, Group Policy overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "SpecterOps, A Red Teamer's Guide to GPOs and OUs",
        "url": "https://specterops.io/blog/2018/02/26/a-red-teamers-guide-to-gpos-and-ous/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Group Policy centrally manages user and computer settings. A domain GPO has a container in AD DS and a template in SYSVOL. GPOs can be linked to sites, domains, and organizational units to define their application scope. Policy settings, link scope, and permissions are distinct parts of that configuration.",
        "id": "acl-tgt-policy",
        "kind": "category",
        "label": "Over a GPO, OU or Domain",
        "mitre": {
          "id": "T1484.001",
          "url": "https://attack.mitre.org/techniques/T1484/001/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Group Policy overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-overview"
          },
          {
            "label": "SpecterOps, A Red Teamer's Guide to GPOs and OUs",
            "url": "https://specterops.io/blog/2018/02/26/a-red-teamers-guide-to-gpos-and-ous/"
          }
        ],
        "summary": "Understand Group Policy storage and application scope."
      },
      "claims": [
        {
          "text": "A domain GPO has an AD DS Group Policy container and a Group Policy template stored in SYSVOL.",
          "section": "Microsoft, Group Policy overview — What is a Group Policy",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-overview"
          ]
        },
        {
          "text": "Group Policy manages user and computer settings, and links to sites, domains, and OUs help define application scope.",
          "section": "Microsoft, Group Policy overview — Introduction; What is a Group Policy",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-overview"
          ]
        }
      ]
    }
  },
  // Persistence grouped by mechanism.
  {
    "id": "persist-forgery",
    "label": "Offline Credential Forgery",
    "phase": "persistence",
    "kind": "category",
    "summary": "Understand why authentication keys and ticket lifetimes matter.",
    "description": "Kerberos credentials include tickets protected with cryptographic keys. The protocol relies on principals protecting their secret keys; its security assumptions explicitly identify the impersonation risk of a stolen key. This explains why authentication-key protection matters. It does not justify a single lifetime or recovery guarantee for every kind of forged authentication material.",
    "mitre": {
      "id": "T1558",
      "url": "https://attack.mitre.org/techniques/T1558/"
    },
    "references": [
      {
        "label": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5)",
        "url": "https://www.rfc-editor.org/rfc/rfc4120.html",
        "kind": "primary",
        "section": "1. Introduction; 1.1. The Kerberos Protocol"
      },
      {
        "label": "Unit 42, Next-Gen Kerberos Attacks (Sapphire/Diamond)",
        "url": "https://unit42.paloaltonetworks.com/next-gen-kerberos-attacks/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Kerberos credentials include tickets protected with cryptographic keys. The protocol relies on principals protecting their secret keys; its security assumptions explicitly identify the impersonation risk of a stolen key. This explains why authentication-key protection matters. It does not justify a single lifetime or recovery guarantee for every kind of forged authentication material.",
        "id": "persist-forgery",
        "kind": "category",
        "label": "Offline Credential Forgery",
        "mitre": {
          "id": "T1558",
          "url": "https://attack.mitre.org/techniques/T1558/"
        },
        "phase": "persistence",
        "references": [
          {
            "kind": "primary",
            "label": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5)",
            "section": "1. Introduction; 1.1. The Kerberos Protocol",
            "url": "https://www.rfc-editor.org/rfc/rfc4120.html"
          },
          {
            "label": "Unit 42, Next-Gen Kerberos Attacks (Sapphire/Diamond)",
            "url": "https://unit42.paloaltonetworks.com/next-gen-kerberos-attacks/"
          }
        ],
        "summary": "Understand why authentication keys and ticket lifetimes matter."
      },
      "claims": [
        {
          "text": "Kerberos credentials include a ticket and a session key protected by the protocol's cryptographic exchanges.",
          "section": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5) — 1.1. The Kerberos Protocol",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4120.html"
          ]
        },
        {
          "text": "Kerberos requires principals to keep secret keys confidential and identifies impersonation as a consequence of key theft.",
          "section": "IETF, RFC 4120: The Kerberos Network Authentication Service (V5) — 1.6. Environmental Assumptions",
          "sources": [
            "https://www.rfc-editor.org/rfc/rfc4120.html"
          ]
        }
      ]
    }
  },
  {
    "id": "persist-implant",
    "label": "DC-Resident Implants",
    "phase": "persistence",
    "kind": "category",
    "summary": "Distinguish authentication extensions from directory replication.",
    "description": "The Local Security Authority provides authentication and logon functions, including interfaces for authentication and security packages. AD replication is a separate directory mechanism whose topology is maintained by the Knowledge Consistency Checker. Changes affecting these different components should be described according to the component involved, rather than as one interchangeable persistence mechanism.",
    "references": [
      {
        "label": "Microsoft, Local Security Authority",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/lsa-authentication",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Active Directory replication concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "The Hacker Recipes, DSRM Persistence",
        "url": "https://www.thehacker.recipes/ad/persistence/dsrm"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "The Local Security Authority provides authentication and logon functions, including interfaces for authentication and security packages. AD replication is a separate directory mechanism whose topology is maintained by the Knowledge Consistency Checker. Changes affecting these different components should be described according to the component involved, rather than as one interchangeable persistence mechanism.",
        "id": "persist-implant",
        "kind": "category",
        "label": "DC-Resident Implants",
        "phase": "persistence",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Local Security Authority",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/lsa-authentication"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory replication concepts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts"
          },
          {
            "label": "The Hacker Recipes, DSRM Persistence",
            "url": "https://www.thehacker.recipes/ad/persistence/dsrm"
          }
        ],
        "summary": "Distinguish authentication extensions from directory replication."
      },
      "claims": [
        {
          "text": "LSA authentication covers local logon and interfaces for authentication and security packages.",
          "section": "Microsoft, Local Security Authority — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthn/lsa-authentication"
          ]
        },
        {
          "text": "The KCC generates and adjusts replication topology for the AD forest.",
          "section": "Microsoft, Active Directory replication concepts — KCC",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts"
          ]
        }
      ]
    }
  },
  {
    "id": "persist-backdoor",
    "label": "ACL & Rights Backdoors",
    "phase": "persistence",
    "kind": "category",
    "summary": "Understand permission changes and protected directory objects.",
    "description": "Directory access depends on object permissions. For protected AD accounts and groups, AdminSDHolder supplies a permission template and SDProp resets mismatched permissions to match it. This is distinct from ordinary permission inheritance, which is disabled on those protected objects. A review of lasting permission changes must account for these different management behaviors.",
    "mitre": {
      "id": "T1098",
      "url": "https://attack.mitre.org/techniques/T1098/"
    },
    "references": [
      {
        "label": "Microsoft, Protected Accounts and Groups in Active Directory",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-c--protected-accounts-and-groups-in-active-directory",
        "kind": "primary",
        "section": "AdminSDHolder; SDProp"
      },
      {
        "label": "The Hacker Recipes, AdminSDHolder",
        "url": "https://www.thehacker.recipes/ad/persistence/adminsdholder"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Directory access depends on object permissions. For protected AD accounts and groups, AdminSDHolder supplies a permission template and SDProp resets mismatched permissions to match it. This is distinct from ordinary permission inheritance, which is disabled on those protected objects. A review of lasting permission changes must account for these different management behaviors.",
        "id": "persist-backdoor",
        "kind": "category",
        "label": "ACL & Rights Backdoors",
        "mitre": {
          "id": "T1098",
          "url": "https://attack.mitre.org/techniques/T1098/"
        },
        "phase": "persistence",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Protected Accounts and Groups in Active Directory",
            "section": "AdminSDHolder; SDProp",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-c--protected-accounts-and-groups-in-active-directory"
          },
          {
            "label": "The Hacker Recipes, AdminSDHolder",
            "url": "https://www.thehacker.recipes/ad/persistence/adminsdholder"
          }
        ],
        "summary": "Understand permission changes and protected directory objects."
      },
      "claims": [
        {
          "text": "AdminSDHolder provides template permissions for protected accounts and groups, and SDProp restores mismatched permissions to match that template.",
          "section": "Microsoft, Protected Accounts and Groups in Active Directory — AdminSDHolder; SDProp",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-c--protected-accounts-and-groups-in-active-directory"
          ]
        },
        {
          "text": "Permission inheritance is disabled on protected accounts and groups; SDProp matching is not ordinary parent-object inheritance.",
          "section": "Microsoft, Protected Accounts and Groups in Active Directory — SDProp",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-c--protected-accounts-and-groups-in-active-directory"
          ]
        }
      ]
    }
  },
  {
    "id": "persist-fed",
    "label": "Federation, Certs & Secrets",
    "phase": "persistence",
    "kind": "category",
    "summary": "Distinguish federation signatures from local data protection.",
    "description": "AD FS supports federated identity across security and organizational boundaries. Federation servers use the key pair associated with a token-signing certificate to sign issued security tokens. DPAPI serves a different purpose: encrypting application data and protecting its integrity. Federation signing keys, certificates, and protected local data should not be treated as equivalent secrets.",
    "references": [
      {
        "label": "Microsoft, Active Directory Federation Services overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/ad-fs-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Certificate requirements for federation servers",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/design/certificate-requirements-for-federation-servers",
        "kind": "primary",
        "section": "Certificate types: Token-signing certificate"
      },
      {
        "label": "Microsoft, CryptProtectData function",
        "url": "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata",
        "section": "Introduction; Remarks",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "AD FS supports federated identity across security and organizational boundaries. Federation servers use the key pair associated with a token-signing certificate to sign issued security tokens. DPAPI serves a different purpose: encrypting application data and protecting its integrity. Federation signing keys, certificates, and protected local data should not be treated as equivalent secrets.",
        "id": "persist-fed",
        "kind": "category",
        "label": "Federation, Certs & Secrets",
        "phase": "persistence",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory Federation Services overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/ad-fs-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Certificate requirements for federation servers",
            "section": "Certificate types: Token-signing certificate",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/design/certificate-requirements-for-federation-servers"
          },
          {
            "kind": "primary",
            "label": "Microsoft, CryptProtectData function",
            "section": "Introduction; Remarks",
            "url": "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          }
        ],
        "summary": "Distinguish federation signatures from local data protection."
      },
      "claims": [
        {
          "text": "AD FS supports federated identity and single sign-on across security and enterprise boundaries.",
          "section": "Microsoft, Active Directory Federation Services overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/ad-fs-overview"
          ]
        },
        {
          "text": "AD FS uses the key pair associated with a token-signing certificate to digitally sign the security tokens it issues.",
          "section": "Microsoft, Certificate requirements for federation servers — Certificate types: Token-signing certificate",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/design/certificate-requirements-for-federation-servers"
          ]
        },
        {
          "text": "CryptProtectData encrypts application data and adds a keyed integrity check.",
          "section": "Microsoft, CryptProtectData function — Introduction; Remarks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          ]
        }
      ]
    }
  },
  // Critical CVEs grouped by attack surface.
  {
    "id": "cvegrp-kerberos",
    "label": "Kerberos / Directory CVEs",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Separate authentication-protocol flaws from directory-object flaws.",
    "description": "Windows Kerberos verifies user or host identity, with its KDC integrated into domain-controller security services and using AD DS as the account database. AD DS also has its own directory-object model. Vulnerability records identify particular affected products and versions; sharing an identity infrastructure does not make distinct flaws equivalent.",
    "mitre": {
      "id": "T1068",
      "url": "https://attack.mitre.org/techniques/T1068/"
    },
    "references": [
      {
        "label": "Microsoft, Kerberos authentication overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "CVE Program, CVE Record Lifecycle",
        "url": "https://www.cve.org/about/Process",
        "section": "CVE Records",
        "kind": "primary"
      },
      {
        "label": "exploit.ph, CVE-2021-42278/42287 weaponisation",
        "url": "https://exploit.ph/cve-2021-42287-cve-2021-42278-weaponisation.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows Kerberos verifies user or host identity, with its KDC integrated into domain-controller security services and using AD DS as the account database. AD DS also has its own directory-object model. Vulnerability records identify particular affected products and versions; sharing an identity infrastructure does not make distinct flaws equivalent.",
        "id": "cvegrp-kerberos",
        "kind": "category",
        "label": "Kerberos / Directory CVEs",
        "mitre": {
          "id": "T1068",
          "url": "https://attack.mitre.org/techniques/T1068/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Kerberos authentication overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview"
          },
          {
            "kind": "primary",
            "label": "CVE Program, CVE Record Lifecycle",
            "section": "CVE Records",
            "url": "https://www.cve.org/about/Process"
          },
          {
            "label": "exploit.ph, CVE-2021-42278/42287 weaponisation",
            "url": "https://exploit.ph/cve-2021-42287-cve-2021-42278-weaponisation.html"
          }
        ],
        "summary": "Separate authentication-protocol flaws from directory-object flaws."
      },
      "claims": [
        {
          "text": "The Windows Kerberos KDC runs with domain-controller security services and uses the domain's AD DS database as its account database.",
          "section": "Microsoft, Kerberos authentication overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview"
          ]
        },
        {
          "text": "A CVE Record identifies descriptive vulnerability information and affected products and versions.",
          "section": "CVE Program, CVE Record Lifecycle — CVE Records",
          "sources": [
            "https://www.cve.org/about/Process"
          ]
        }
      ]
    }
  },
  {
    "id": "cvegrp-exchange",
    "label": "Exchange CVEs",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand the Exchange component named in an advisory.",
    "description": "Exchange Mailbox servers combine transport services, mailbox databases, and Client Access services; Edge Transport servers handle external mail flow. Client Access services accept client connections and route or proxy them to backend services. Vulnerability descriptions should identify the affected component and product version rather than treating every Exchange issue as the same exposure.",
    "mitre": {
      "id": "T1068",
      "url": "https://attack.mitre.org/techniques/T1068/"
    },
    "references": [
      {
        "label": "Microsoft, Exchange Server architecture",
        "url": "https://learn.microsoft.com/en-us/exchange/architecture/architecture?view=exchserver-2019",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "dirkjanm, Abusing Exchange: One API call away from Domain Admin",
        "url": "https://dirkjanm.io/abusing-exchange-one-api-call-away-from-domain-admin/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Exchange Mailbox servers combine transport services, mailbox databases, and Client Access services; Edge Transport servers handle external mail flow. Client Access services accept client connections and route or proxy them to backend services. Vulnerability descriptions should identify the affected component and product version rather than treating every Exchange issue as the same exposure.",
        "id": "cvegrp-exchange",
        "kind": "category",
        "label": "Exchange CVEs",
        "mitre": {
          "id": "T1068",
          "url": "https://attack.mitre.org/techniques/T1068/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Exchange Server architecture",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/exchange/architecture/architecture?view=exchserver-2019"
          },
          {
            "label": "dirkjanm, Abusing Exchange: One API call away from Domain Admin",
            "url": "https://dirkjanm.io/abusing-exchange-one-api-call-away-from-domain-admin/"
          }
        ],
        "summary": "Understand the Exchange component named in an advisory."
      },
      "claims": [
        {
          "text": "Exchange uses Mailbox and Edge Transport server roles, with Mailbox servers hosting transport, database, and Client Access services.",
          "section": "Microsoft, Exchange Server architecture — Server role architecture; Mailbox servers; Edge Transport servers",
          "sources": [
            "https://learn.microsoft.com/en-us/exchange/architecture/architecture?view=exchserver-2019"
          ]
        },
        {
          "text": "Client Access services accept client connections and proxy them to the corresponding backend services.",
          "section": "Microsoft, Exchange Server architecture — Client Access protocol architecture",
          "sources": [
            "https://learn.microsoft.com/en-us/exchange/architecture/architecture?view=exchserver-2019"
          ]
        }
      ]
    }
  },
  {
    "id": "cvegrp-smbprint",
    "label": "SMB / Print CVEs",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Distinguish file-sharing services from the print pipeline.",
    "description": "SMB is a network protocol for remote file and resource access. The Windows print spooler has separate responsibilities, including deciding whether jobs are local or remote, spooling data, and sending data to printer hardware. These components can appear together in an environment, but a vulnerability affecting one does not describe every service in the other.",
    "mitre": {
      "id": "T1068",
      "url": "https://attack.mitre.org/techniques/T1068/"
    },
    "references": [
      {
        "label": "Microsoft, SMB overview",
        "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, Print Spooler Architecture",
        "url": "https://learn.microsoft.com/en-us/windows-hardware/drivers/print/print-spooler-architecture",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, PrintNightmare",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printnightmare.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "SMB is a network protocol for remote file and resource access. The Windows print spooler has separate responsibilities, including deciding whether jobs are local or remote, spooling data, and sending data to printer hardware. These components can appear together in an environment, but a vulnerability affecting one does not describe every service in the other.",
        "id": "cvegrp-smbprint",
        "kind": "category",
        "label": "SMB / Print CVEs",
        "mitre": {
          "id": "T1068",
          "url": "https://attack.mitre.org/techniques/T1068/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, SMB overview",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Print Spooler Architecture",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-hardware/drivers/print/print-spooler-architecture"
          },
          {
            "label": "HackTricks, PrintNightmare",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printnightmare.html"
          }
        ],
        "summary": "Distinguish file-sharing services from the print pipeline."
      },
      "claims": [
        {
          "text": "SMB provides network access to files and other server resources.",
          "section": "Microsoft, SMB overview — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview"
          ]
        },
        {
          "text": "Print-spooler components determine local or remote job handling, spool data when enabled, and send data to printer hardware.",
          "section": "Microsoft, Print Spooler Architecture — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-hardware/drivers/print/print-spooler-architecture"
          ]
        }
      ]
    }
  },
  // Privileged groups grouped by type.
  {
    "id": "pgcat-ops",
    "label": "AD Operators",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand the different responsibilities of built-in operator groups.",
    "description": "Built-in operator groups delegate specific administrative work. Backup Operators have backup and restore responsibilities; Print Operators manage printers and printer objects; Server Operators have server-administration responsibilities on domain controllers. These are powerful but distinct roles. Their names should not be used as substitutes for a single, uniform Domain Admin permission set.",
    "references": [
      {
        "label": "Microsoft, Active Directory security groups",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups",
        "kind": "primary",
        "section": "Introduction; Group types; Group scope"
      },
      {
        "label": "HackTricks, Privileged Groups & Token Privileges",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges.html"
      },
      {
        "label": "The Hacker Recipes, Built-in security groups",
        "url": "https://www.thehacker.recipes/ad/movement/builtins/security-groups"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Built-in operator groups delegate specific administrative work. Backup Operators have backup and restore responsibilities; Print Operators manage printers and printer objects; Server Operators have server-administration responsibilities on domain controllers. These are powerful but distinct roles. Their names should not be used as substitutes for a single, uniform Domain Admin permission set.",
        "id": "pgcat-ops",
        "kind": "category",
        "label": "AD Operators",
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory security groups",
            "section": "Introduction; Group types; Group scope",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          },
          {
            "label": "HackTricks, Privileged Groups & Token Privileges",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges.html"
          },
          {
            "label": "The Hacker Recipes, Built-in security groups",
            "url": "https://www.thehacker.recipes/ad/movement/builtins/security-groups"
          }
        ],
        "summary": "Understand the different responsibilities of built-in operator groups."
      },
      "claims": [
        {
          "text": "Backup Operators and Print Operators have different documented responsibilities for backup/restore and printer management.",
          "section": "Microsoft, Active Directory security groups — Backup Operators; Print Operators",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          ]
        },
        {
          "text": "Server Operators have domain-controller administration responsibilities, with a separately documented set of capabilities.",
          "section": "Microsoft, Active Directory security groups — Server Operators",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          ]
        }
      ]
    }
  },
  {
    "id": "pgcat-service",
    "label": "Service & Directory Roles",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Distinguish schema administration from certificate publication.",
    "description": "Directory and service groups have specific responsibilities. Schema Admins can modify the AD schema, which defines the directory's structure. Cert Publishers can publish certificates for user objects in AD. These examples illustrate why a role should be described by its actual responsibility and scope, rather than by a blanket promise of domain-wide control.",
    "references": [
      {
        "label": "Microsoft, Active Directory security groups",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups",
        "kind": "primary",
        "section": "Introduction; Group types; Group scope"
      },
      {
        "label": "HackTricks, Privileged Groups & Token Privileges",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges.html"
      },
      {
        "label": "The Hacker Recipes, Built-in security groups",
        "url": "https://www.thehacker.recipes/ad/movement/builtins/security-groups"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Directory and service groups have specific responsibilities. Schema Admins can modify the AD schema, which defines the directory's structure. Cert Publishers can publish certificates for user objects in AD. These examples illustrate why a role should be described by its actual responsibility and scope, rather than by a blanket promise of domain-wide control.",
        "id": "pgcat-service",
        "kind": "category",
        "label": "Service & Directory Roles",
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory security groups",
            "section": "Introduction; Group types; Group scope",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          },
          {
            "label": "HackTricks, Privileged Groups & Token Privileges",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges.html"
          },
          {
            "label": "The Hacker Recipes, Built-in security groups",
            "url": "https://www.thehacker.recipes/ad/movement/builtins/security-groups"
          }
        ],
        "summary": "Distinguish schema administration from certificate publication."
      },
      "claims": [
        {
          "text": "Schema Admins can modify the Active Directory schema.",
          "section": "Microsoft, Active Directory security groups — Schema Admins",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          ]
        },
        {
          "text": "Cert Publishers are authorized to publish certificates for user objects in AD.",
          "section": "Microsoft, Active Directory security groups — Cert Publishers",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups"
          ]
        }
      ]
    }
  },
  {
    "id": "pgcat-deploy",
    "label": "Deployment Admins",
    "phase": "priv-esc",
    "kind": "category",
    "summary": "Understand the scope assigned to endpoint-management administrators.",
    "description": "Configuration Manager combines security roles, security scopes, and collections to define administrative access. Intune also separates permitted actions from the users and devices covered by a role assignment. An endpoint-management title therefore needs its assigned scope to be meaningful; it should not imply identical control over every managed device.",
    "mitre": {
      "id": "T1072",
      "url": "https://attack.mitre.org/techniques/T1072/"
    },
    "references": [
      {
        "label": "Microsoft, Configuration Manager role-based administration",
        "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration",
        "kind": "primary",
        "section": "Introduction; Security roles; Collections; Security scopes"
      },
      {
        "label": "Microsoft, Intune role-based access control",
        "url": "https://learn.microsoft.com/en-us/intune/fundamentals/role-based-access-control/overview",
        "kind": "primary",
        "section": "RBAC Roles; About Intune role assignments"
      },
      {
        "label": "SpecterOps, SCCM Hierarchy Takeover",
        "url": "https://specterops.io/blog/2023/09/25/sccm-hierarchy-takeover/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Configuration Manager combines security roles, security scopes, and collections to define administrative access. Intune also separates permitted actions from the users and devices covered by a role assignment. An endpoint-management title therefore needs its assigned scope to be meaningful; it should not imply identical control over every managed device.",
        "id": "pgcat-deploy",
        "kind": "category",
        "label": "Deployment Admins",
        "mitre": {
          "id": "T1072",
          "url": "https://attack.mitre.org/techniques/T1072/"
        },
        "phase": "priv-esc",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Configuration Manager role-based administration",
            "section": "Introduction; Security roles; Collections; Security scopes",
            "url": "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Intune role-based access control",
            "section": "RBAC Roles; About Intune role assignments",
            "url": "https://learn.microsoft.com/en-us/intune/fundamentals/role-based-access-control/overview"
          },
          {
            "label": "SpecterOps, SCCM Hierarchy Takeover",
            "url": "https://specterops.io/blog/2023/09/25/sccm-hierarchy-takeover/"
          }
        ],
        "summary": "Understand the scope assigned to endpoint-management administrators."
      },
      "claims": [
        {
          "text": "Configuration Manager uses security roles, security scopes, and collections together to define administrative access.",
          "section": "Microsoft, Configuration Manager role-based administration — Introduction; Security roles; Collections; Security scopes",
          "sources": [
            "https://learn.microsoft.com/en-us/intune/configmgr/core/understand/fundamentals-of-role-based-administration"
          ]
        },
        {
          "text": "Intune role assignments combine role permissions with a scope of users and devices.",
          "section": "Microsoft, Intune role-based access control — RBAC Roles; About Intune role assignments",
          "sources": [
            "https://learn.microsoft.com/en-us/intune/fundamentals/role-based-access-control/overview"
          ]
        }
      ]
    }
  },
  // Post-exploitation branches
  {
    "id": "ad-cat-cred-dump",
    "label": "Credential Dumping",
    "phase": "credential-access",
    "kind": "category",
    "summary": "Understand credential access and Windows credential protection.",
    "description": "Credential dumping is one behavior included in ATT&CK's Credential Access tactic. Windows LSA manages authentication-related information, and additional LSA protection restricts memory access and code injection by nonprotected processes. The information present on a host and the protections applied to it should not be collapsed into a guarantee that every account secret is obtainable.",
    "mitre": {
      "id": "T1003",
      "url": "https://attack.mitre.org/techniques/T1003/"
    },
    "references": [
      {
        "label": "MITRE ATT&CK, Credential Access",
        "url": "https://attack.mitre.org/tactics/TA0006/",
        "kind": "taxonomy",
        "section": "Description"
      },
      {
        "label": "Microsoft, Configure additional LSA protection",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Stealing Credentials",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Credential dumping is one behavior included in ATT&CK's Credential Access tactic. Windows LSA manages authentication-related information, and additional LSA protection restricts memory access and code injection by nonprotected processes. The information present on a host and the protections applied to it should not be collapsed into a guarantee that every account secret is obtainable.",
        "id": "ad-cat-cred-dump",
        "kind": "category",
        "label": "Credential Dumping",
        "mitre": {
          "id": "T1003",
          "url": "https://attack.mitre.org/techniques/T1003/"
        },
        "phase": "credential-access",
        "references": [
          {
            "kind": "taxonomy",
            "label": "MITRE ATT&CK, Credential Access",
            "section": "Description",
            "url": "https://attack.mitre.org/tactics/TA0006/"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Configure additional LSA protection",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection"
          },
          {
            "label": "HackTricks, Stealing Credentials",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html"
          }
        ],
        "summary": "Understand credential access and Windows credential protection."
      },
      "claims": [
        {
          "text": "ATT&CK lists credential dumping among the behaviors used for Credential Access.",
          "section": "MITRE ATT&CK, Credential Access — Description",
          "sources": [
            "https://attack.mitre.org/tactics/TA0006/"
          ]
        },
        {
          "text": "Additional LSA protection restricts nonprotected processes from reading LSA memory or injecting code.",
          "section": "Microsoft, Configure additional LSA protection — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection"
          ]
        }
      ]
    }
  },
  // Credential-dumping sub-groups by source (DC dumping is red because it needs DA / replication rights)
  {
    "id": "ad-cat-host-dump",
    "label": "Host & LSASS Secrets",
    "phase": "credential-access",
    "kind": "category",
    "summary": "Understand LSA responsibilities and its protected-process model.",
    "description": "LSA validates users for sign-in and enforces local security policies. Windows can add protection against other, nonprotected processes reading LSA memory or injecting code. The protected-process model also places signing requirements on loaded plug-ins and drivers. These protections are part of the credential-security model and should not be omitted from an overview of host authentication data.",
    "mitre": {
      "id": "T1003.001",
      "url": "https://attack.mitre.org/techniques/T1003/001/"
    },
    "references": [
      {
        "label": "Microsoft, Configure additional LSA protection",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "HackTricks, Stealing Credentials",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "LSA validates users for sign-in and enforces local security policies. Windows can add protection against other, nonprotected processes reading LSA memory or injecting code. The protected-process model also places signing requirements on loaded plug-ins and drivers. These protections are part of the credential-security model and should not be omitted from an overview of host authentication data.",
        "id": "ad-cat-host-dump",
        "kind": "category",
        "label": "Host & LSASS Secrets",
        "mitre": {
          "id": "T1003.001",
          "url": "https://attack.mitre.org/techniques/T1003/001/"
        },
        "phase": "credential-access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Configure additional LSA protection",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection"
          },
          {
            "label": "HackTricks, Stealing Credentials",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/stealing-credentials/index.html"
          }
        ],
        "summary": "Understand LSA responsibilities and its protected-process model."
      },
      "claims": [
        {
          "text": "LSA validates users for local and remote sign-ins and enforces local security policies.",
          "section": "Microsoft, Configure additional LSA protection — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection"
          ]
        },
        {
          "text": "Additional LSA protection restricts memory access and injection by nonprotected processes, with signing requirements for protected-process plug-ins and drivers.",
          "section": "Microsoft, Configure additional LSA protection — Introduction; Protected process requirements for plug-ins or drivers: Signature verification",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-user-secrets",
    "label": "App & User Secrets",
    "phase": "credential-access",
    "kind": "category",
    "summary": "Distinguish application credential storage from encryption.",
    "description": "Windows applications can manage credential information through Credentials Management APIs and the user credentials store. Applications can separately use DPAPI to encrypt data and detect tampering. Storage and protection are different concepts; neither a file location nor a product name tells a reader that the contents are plaintext or available to another account.",
    "mitre": {
      "id": "T1555",
      "url": "https://attack.mitre.org/techniques/T1555/"
    },
    "references": [
      {
        "label": "Microsoft, Credentials Management",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, CryptProtectData function",
        "url": "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata",
        "section": "Introduction; Remarks",
        "kind": "primary"
      },
      {
        "label": "HackTricks, DPAPI: Extracting Passwords",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows applications can manage credential information through Credentials Management APIs and the user credentials store. Applications can separately use DPAPI to encrypt data and detect tampering. Storage and protection are different concepts; neither a file location nor a product name tells a reader that the contents are plaintext or available to another account.",
        "id": "ad-cat-user-secrets",
        "kind": "category",
        "label": "App & User Secrets",
        "mitre": {
          "id": "T1555",
          "url": "https://attack.mitre.org/techniques/T1555/"
        },
        "phase": "credential-access",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Credentials Management",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management"
          },
          {
            "kind": "primary",
            "label": "Microsoft, CryptProtectData function",
            "section": "Introduction; Remarks",
            "url": "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          },
          {
            "label": "HackTricks, DPAPI: Extracting Passwords",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords.html"
          }
        ],
        "summary": "Distinguish application credential storage from encryption."
      },
      "claims": [
        {
          "text": "Windows Credentials Management APIs provide credential-information management and a user credentials store.",
          "section": "Microsoft, Credentials Management — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management"
          ]
        },
        {
          "text": "CryptProtectData provides encryption and a keyed integrity check for application data.",
          "section": "Microsoft, CryptProtectData function — Introduction; Remarks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-dc-dump",
    "label": "DC Credential Dumping",
    "phase": "domain-dominance",
    "kind": "category",
    "summary": "Understand directory replication and read-only controller caching.",
    "description": "AD replication connections identify a source and destination domain controller, and the KCC maintains replication topology. Read-only domain controllers also have a Password Replication Policy that controls which user and computer passwords can be cached for authentication. A domain-controller label therefore does not establish that every controller holds every account password.",
    "mitre": {
      "id": "T1003.006",
      "url": "https://attack.mitre.org/techniques/T1003/006/"
    },
    "references": [
      {
        "label": "Microsoft, Active Directory replication concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts",
        "kind": "primary",
        "section": "Introduction"
      },
      {
        "label": "Microsoft, AD DS Configuration Wizard page descriptions",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/ad-ds-installation-and-removal-wizard-page-descriptions",
        "kind": "primary",
        "section": "Active Directory configuration pages: RODC Options"
      },
      {
        "label": "HackTricks, DCSync",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcsync.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "AD replication connections identify a source and destination domain controller, and the KCC maintains replication topology. Read-only domain controllers also have a Password Replication Policy that controls which user and computer passwords can be cached for authentication. A domain-controller label therefore does not establish that every controller holds every account password.",
        "id": "ad-cat-dc-dump",
        "kind": "category",
        "label": "DC Credential Dumping",
        "mitre": {
          "id": "T1003.006",
          "url": "https://attack.mitre.org/techniques/T1003/006/"
        },
        "phase": "domain-dominance",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Active Directory replication concepts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts"
          },
          {
            "kind": "primary",
            "label": "Microsoft, AD DS Configuration Wizard page descriptions",
            "section": "Active Directory configuration pages: RODC Options",
            "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/ad-ds-installation-and-removal-wizard-page-descriptions"
          },
          {
            "label": "HackTricks, DCSync",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcsync.html"
          }
        ],
        "summary": "Understand directory replication and read-only controller caching."
      },
      "claims": [
        {
          "text": "AD connection objects represent replication from a source domain controller to a destination, and the KCC generates replication topology.",
          "section": "Microsoft, Active Directory replication concepts — Connection object; KCC",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts"
          ]
        },
        {
          "text": "An RODC Password Replication Policy controls which user and computer account passwords can be cached for authentication.",
          "section": "Microsoft, AD DS Configuration Wizard page descriptions — Active Directory configuration pages: RODC Options",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/ad-ds-installation-and-removal-wizard-page-descriptions"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-trusts",
    "label": "Domain Trusts",
    "phase": "domain-dominance",
    "kind": "category",
    "summary": "Distinguish cross-domain authentication from resource permissions.",
    "description": "Domain trusts allow authentication requests to be accepted from a trusted authority. Trusts can differ in direction and transitivity. Authorization still determines the access granted to a resource. A trust relationship is therefore not equivalent to automatic administrative authority across both domains or forests.",
    "mitre": {
      "id": "T1482",
      "url": "https://attack.mitre.org/techniques/T1482/"
    },
    "references": [
      {
        "label": "Microsoft, Windows Authentication Concepts",
        "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts",
        "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
        "kind": "primary"
      },
      {
        "label": "harmj0y, A Guide to Attacking Domain Trusts",
        "url": "https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Domain trusts allow authentication requests to be accepted from a trusted authority. Trusts can differ in direction and transitivity. Authorization still determines the access granted to a resource. A trust relationship is therefore not equivalent to automatic administrative authority across both domains or forests.",
        "id": "ad-cat-trusts",
        "kind": "category",
        "label": "Domain Trusts",
        "mitre": {
          "id": "T1482",
          "url": "https://attack.mitre.org/techniques/T1482/"
        },
        "phase": "domain-dominance",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Windows Authentication Concepts",
            "section": "Authentication and authorization: A travel analogy; Security principals and accounts",
            "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          },
          {
            "label": "harmj0y, A Guide to Attacking Domain Trusts",
            "url": "https://blog.harmj0y.net/redteaming/a-guide-to-attacking-domain-trusts/"
          }
        ],
        "summary": "Distinguish cross-domain authentication from resource permissions."
      },
      "claims": [
        {
          "text": "Domain trusts carry authentication requests from trusted authorities and can differ in direction and transitivity.",
          "section": "Microsoft, Windows Authentication Concepts — Trusts",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        },
        {
          "text": "Authentication and resource authorization are distinct; a domain trust alone does not establish cross-domain administrative authority.",
          "section": "Microsoft, Windows Authentication Concepts — Authentication and authorization: A travel analogy; Trusts; final clause is an editorial inference",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-concepts"
          ]
        }
      ]
    }
  },
  {
    "id": "ad-cat-persistence",
    "label": "Persistence",
    "phase": "persistence",
    "kind": "category",
    "summary": "Understand persistence as an objective with different mechanisms.",
    "description": "ATT&CK uses Persistence for maintaining access through interruptions such as restarts or credential changes. Its definition includes changes to access, actions, and configuration. It groups an objective, not a universal guarantee that every mechanism survives every password reset, rebuild, or recovery action.",
    "references": [
      {
        "label": "MITRE ATT&CK, Persistence",
        "url": "https://attack.mitre.org/tactics/TA0003/",
        "kind": "taxonomy",
        "section": "Description"
      },
      {
        "label": "Sean Metcalf, Sneaky Active Directory Persistence Tricks",
        "url": "https://adsecurity.org/?p=1929"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category summary and description only. Does not cover existing commands or tools, linked techniques, connection outcomes, operational applicability, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "ATT&CK uses Persistence for maintaining access through interruptions such as restarts or credential changes. Its definition includes changes to access, actions, and configuration. It groups an objective, not a universal guarantee that every mechanism survives every password reset, rebuild, or recovery action.",
        "id": "ad-cat-persistence",
        "kind": "category",
        "label": "Persistence",
        "phase": "persistence",
        "references": [
          {
            "kind": "taxonomy",
            "label": "MITRE ATT&CK, Persistence",
            "section": "Description",
            "url": "https://attack.mitre.org/tactics/TA0003/"
          },
          {
            "label": "Sean Metcalf, Sneaky Active Directory Persistence Tricks",
            "url": "https://adsecurity.org/?p=1929"
          }
        ],
        "summary": "Understand persistence as an objective with different mechanisms."
      },
      "claims": [
        {
          "text": "Persistence describes maintaining system access across interruptions such as restarts or changed credentials.",
          "section": "MITRE ATT&CK, Persistence — Description",
          "sources": [
            "https://attack.mitre.org/tactics/TA0003/"
          ]
        },
        {
          "text": "ATT&CK includes access, action, and configuration changes under Persistence; this does not establish identical survival properties for each mechanism.",
          "section": "MITRE ATT&CK, Persistence — Description; final clause is an editorial inference about the scope of a tactic definition",
          "sources": [
            "https://attack.mitre.org/tactics/TA0003/"
          ]
        }
      ]
    }
  },
];

/** @type {import('../schema.js').AttackEdge[]} */
export const adCategoryEdges = [
  // ── No credentials (off network-recon) ──────────────────────────────────
  { source: 'network-recon', target: 'ad-cat-noauth' },
  { source: 'network-recon', target: 'ad-cat-poisoning' },
  { source: 'network-recon', target: 'ad-cat-services' },
  {
    source: 'ad-cat-noauth', target: 'username-enum-kerbrute',
    requires: [
      'a KDC reachable on TCP/UDP 88',
      'an AS-REQ for an invalid principal returns KDC_ERR_C_PRINCIPAL_UNKNOWN while a valid one returns KDC_ERR_PREAUTH_REQUIRED or an AS-REP',
      'kerbrute prints VALID USERNAME lines',
    ],
  },
  { source: 'ad-cat-noauth', target: 'rid-cycling' },
  { source: 'ad-cat-noauth', target: 'rpc-null-enum' },
  { source: 'ad-cat-noauth', target: 'smtp-user-enum' },
  {
    source: 'ad-cat-noauth', target: 'anon-ldap-dump',
    requires: [
      'TCP 389/636/3268/3269 open on a Windows DC',
      'RootDSE base-scope query returns namingContexts without a bind (anonymous bind permitted)',
      'ldapsearch -x (simple/anonymous) returns results instead of \'operationsError\' / \'inappropriateAuthentication\'',
    ],
  },
  {
    source: 'ad-cat-poisoning', target: 'llmnr-poisoning',
    requires: [
      'Responder prints [SMB] NTLMv2-SSP Hash : or an [HTTP] NTLMv2 client capture',
      'the captured value is formatted user::DOMAIN:challenge:NTproof:blob (NetNTLMv2)',
      'a poisoned answer is logged for an LLMNR/NBT-NS/mDNS name query on the attacker interface',
    ],
  },
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
  {
    source: 'ad-cat-enum', target: 'domain-object-enum',
    requires: [
      'net group /domain output enumerating domain groups',
      'net group \'<GroupName>\' /domain listing a single group\'s members',
      'net user <user> /domain showing \'Global Group memberships\'/\'Local Group Memberships\'',
    ],
  },
  { source: 'domain-object-enum', target: 'find-privesc-path', label: 'found a path' },

  // Credential Access
  { source: 'ad-cat-credaccess', target: 'ad-cat-roasting' },
  { source: 'ad-cat-credaccess', target: 'gpp-cpassword' },
  { source: 'ad-cat-credaccess', target: 'ad-cat-managed-secrets' },
  {
    source: 'ad-cat-roasting', target: 'kerberoasting',
    requires: [
      'a BloodHound GenericWrite/GenericAll/WriteSPN edge from a controlled principal to a target user',
      'an empty servicePrincipalName on a writable user',
      'a $krb5tgs$23$ TGS-REP returned for an account that does not normally run a service',
    ],
  },
  {
    source: 'ad-cat-roasting', target: 'asrep-roasting',
    requires: [
      'the DONT_REQ_PREAUTH flag set in userAccountControl on a user',
      'the KDC issues an AS-REP with no PA-ENC-TIMESTAMP challenge',
      'GetNPUsers or --asreproast returns a $krb5asrep$23$<user>@<REALM> hash',
    ],
  },
  {
    source: 'ad-cat-managed-secrets', target: 'laps-read',
    requires: [
      'the ms-Mcs-AdmPwd (or msLAPS-Password / msLAPS-EncryptedPassword) attribute is readable on a computer object',
      'a ReadLAPSPassword or All-extended-rights / GenericAll edge over the computer in BloodHound',
      'ms-Mcs-AdmPwdExpirationTime is populated',
    ],
  },
  {
    source: 'ad-cat-managed-secrets', target: 'gmsa-read',
    requires: [
      'the account class is msDS-GroupManagedServiceAccount with a name ending in $',
      'a BloodHound ReadGMSAPassword edge from a controlled principal',
      'the msDS-ManagedPassword attribute returns (is not access-denied) for the target',
    ],
  },

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
  {
    source: 'ad-cat-account-abuse', target: 'machineaccountquota-abuse',
    requires: [
      'ms-DS-MachineAccountQuota greater than 0 on the domain head',
      'a new objectClass=computer principal can be created (addcomputer / New-MachineAccount) with a sAMAccountName ending in $',
      'ms-DS-CreatorSID on the new object equals a non-admin attacker SID',
    ],
  },
  {
    source: 'ad-cat-account-abuse', target: 'badsuccessor-dmsa',
    requires: [
      'CreateChild / write access over an OU or container that can hold dMSA (msDS-DelegatedManagedServiceAccount) objects',
      'at least one Windows Server 2025 DC present (adds the dMSA class and the KDC successor codepath), no raised domain functional level required',
      'Writable msDS-ManagedAccountPrecededByLink on a dMSA',
    ],
  },
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
  {
    source: 'acl-tgt-control', target: 'acl-writeowner',
    requires: [
      'a BloodHound WriteOwner edge from an owned principal to a target object',
      'the nTSecurityDescriptor owner SID is changeable by the controlled principal',
      'owneredit reports a successful owner change',
    ],
  },
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
  {
    source: 'ad-cat-adcs-template', target: 'adcs-esc1',
    requires: [
      'certipy flags the template ESC1 / Enrollee Supplies Subject : True',
      'msPKI-Certificate-Name-Flag has CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT (0x1)',
      'the template EKU allows Client Authentication or Smart Card Logon and a low-priv principal holds Enroll',
    ],
  },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc2' },
  {
    source: 'ad-cat-adcs-template', target: 'adcs-esc3',
    requires: [
      'Certificate Request Agent EKU 1.3.6.1.4.1.311.20.2.1 on an enrollable template',
      'Certipy find flags a template ESC3 / \'Enrollment Agent\'',
      'A second enabled client-authentication template the target principal can be enrolled for (e.g. User, SignedUser)',
    ],
  },
  {
    source: 'ad-cat-adcs-template', target: 'adcs-esc4',
    requires: [
      'certipy flags ESC4 (a template whose ACL grants a controlled principal WriteDacl/WriteOwner/WriteProperty/GenericWrite/GenericAll)',
      'a BloodHound WriteDacl/Owns/GenericAll edge to a pKICertificateTemplate object',
      'the template DACL is writable by a user, group, or machine account you control',
    ],
  },
  {
    source: 'ad-cat-adcs-template', target: 'adcs-esc9',
    requires: [
      'Template msPKI-Enrollment-Flag contains CT_FLAG_NO_SECURITY_EXTENSION (0x80000) so the issued cert omits the SID security extension (certipy \'ESC9\' flag)',
      'AND the KDC has StrongCertificateBindingEnforcement != 2 (set to 0 or 1), the weak Kerberos binding that lets a no-SID cert authenticate as a spoofed target',
      'certipy find marks the template as [!] Vulnerable: ESC9',
    ],
  },
  {
    source: 'ad-cat-adcs-template', target: 'adcs-esc13',
    requires: [
      'a certificate template carries an issuance-policy OID that is msDS-OIDToGroupLink-mapped to a privileged AD group',
      'enrolling that template yields a certificate whose authentication grants the linked group membership',
    ],
  },
  { source: 'ad-cat-adcs-template', target: 'adcs-esc15' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc5' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc6' },
  {
    source: 'ad-cat-adcs-ca', target: 'adcs-esc7',
    requires: [
      'Certipy \'find\' / certutil shows the principal listed in the CA\'s ManageCA (Officer) or ManageCertificates ACL',
      'ESC7 reported by certipy find against the CA security descriptor',
      'Ability to run \'certipy ca -add-officer\' / \'certipy ca -issue-request\' without access denied',
    ],
  },
  {
    source: 'ad-cat-adcs-ca', target: 'adcs-esc8',
    requires: [
      'the AD CS Web Enrollment role is reachable over HTTP/HTTPS (/certsrv/, /certsrv/certfnsh.asp)',
      'the CA endpoint accepts NTLM or Negotiate auth with no EPA / channel binding',
      'certipy find reports \'Web Enrollment: Enabled\' and \'ADCS HTTP endpoint vulnerable\' (ESC8)',
    ],
  },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc10' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc11' },
  { source: 'ad-cat-adcs-ca', target: 'adcs-esc16' },
  { source: 'ad-cat-adcs-ca', target: 'golden-certificate' },
  {
    source: 'ad-cat-delegation', target: 'unconstrained-delegation',
    requires: [
      'userAccountControl flag TRUSTED_FOR_DELEGATION (0x80000) on a computer object',
      'BloodHound "Unconstrained Delegation" edge / unconstraineddelegation:true',
      'PowerView Get-DomainComputer -Unconstrained returns the host',
    ],
  },
  {
    source: 'ad-cat-delegation', target: 'constrained-delegation',
    requires: [
      'msDS-AllowedToDelegateTo is populated on a user or computer',
      'userAccountControl carries TRUSTED_TO_AUTH_FOR_DELEGATION (protocol transition), while Kerberos-only constrained delegation sets no UAC delegation bit',
      'you control the delegating principal secret (NT hash, AES key, or cleartext)',
    ],
  },
  {
    source: 'ad-cat-delegation', target: 'rbcd',
    requires: [
      'write access to a target computer msDS-AllowedToActOnBehalfOfOtherIdentity (GenericAll/GenericWrite/WriteDACL/AddAllowedToAct in BloodHound)',
      'you control a principal that has an SPN (a machine account, or one you create when ms-DS-MachineAccountQuota is greater than 0)',
    ],
  },
  // Critical CVEs grouped by attack surface.
  { source: 'ad-cat-cve', target: 'cvegrp-kerberos' },
  { source: 'ad-cat-cve', target: 'cvegrp-exchange' },
  { source: 'ad-cat-cve', target: 'cvegrp-smbprint' },
  { source: 'cvegrp-kerberos', target: 'nopac' },
  { source: 'cvegrp-smbprint', target: 'printnightmare' },
  { source: 'cvegrp-kerberos', target: 'ms14-068' },
  {
    source: 'cvegrp-kerberos', target: 'certifried',
    requires: [
      'an Enterprise CA reachable with a Machine/Computer enrollment template',
      'ms-DS-MachineAccountQuota greater than 0 (or delegated CreateChild on an OU)',
      'the ability to write a machine dNSHostName matching a DC FQDN (CVE-2022-26923)',
    ],
  },
  { source: 'cvegrp-exchange', target: 'privexchange' },

  // Lateral Movement: credential reuse (its own sub-lane) + remote execution + service abuse
  { source: 'ad-cat-lateral', target: 'ad-cat-cred-reuse' },
  {
    source: 'ad-cat-cred-reuse', target: 'pass-the-hash',
    requires: [
      'you hold the NT (RC4) hash and NTLM is available on the target',
      'you want a direct NTLM network session (SMB / WMI / WinRM) as that account without cracking the hash',
    ],
  },
  {
    source: 'ad-cat-cred-reuse', target: 'overpass-the-hash',
    requires: [
      'have NT hash or AES128/256 key but no cleartext password',
      'NTLM auth blocked: STATUS_NOT_SUPPORTED / NTLM disabled / \'NTLM authentication is not supported\'',
      'need a TGT rather than a session for the next step (PtT, S4U, LDAP/SMB over Kerberos)',
    ],
  },
  { source: 'ad-cat-cred-reuse', target: 'pass-the-ticket' },
  {
    source: 'ad-cat-lateral', target: 'lateral-movement-cme',
    requires: [
      'the principal is a local Administrator (or in Distributed COM Users) on the target, or BloodHound shows an ExecuteDCOM / local-admin edge to the host',
      'SMB (445), WinRM (5985), or DCOM/MSRPC (135 plus the dynamic RPC range) reachable',
      'nxc/crackmapexec returns (Pwn3d!) for the credential',
    ],
  }, // "Remote Execution" -> WinRM/WMI/DCOM
  { source: 'ad-cat-lateral', target: 'ad-cat-platform' },
  { source: 'ad-cat-platform', target: 'ad-cat-mssql' },
  { source: 'ad-cat-platform', target: 'ad-cat-sccm' },
  { source: 'ad-cat-platform', target: 'ad-cat-deploy-abuse' },
  {
    source: 'ad-cat-mssql', target: 'mssql-linked-servers',
    requires: [
      'sys.servers / sp_linkedservers returns rows beyond the local instance',
      'is_linked = 1 on a server entry',
      'EXEC (\'SELECT SYSTEM_USER\') AT [LINK] returns an identity different from the local login',
    ],
  },

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
  {
    source: 'ad-cat-dc-dump', target: 'ntds-dump',
    requires: [
      'ntds.dit file present',
      'SYSTEM registry hive present (and optionally SECURITY)',
      'secretsdump.py invoked with the LOCAL keyword',
    ],
  },
];
