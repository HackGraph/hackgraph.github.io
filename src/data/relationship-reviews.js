// Explicit definition comparisons and project convention recorded by Codex.
// Never regenerate during a build or renew without a new comparison.
export const RELATIONSHIP_REVIEWS = {
  "host-exec": {
    "reviewedAt": "2026-09-07",
    "reviewedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Compared the general execution definition with MITRE and the process/thread security-context distinction with Microsoft. No execution identity or connection outcome is established.",
    "reviewedContent": {
      "description": "Execution means code running on a system. The process or thread has its own security context; the label alone does not identify an account or privilege level.",
      "label": "code execution",
      "origin": "source-based",
      "references": [
        {
          "kind": "taxonomy",
          "label": "MITRE ATT&CK, Execution",
          "section": "Execution — introductory definition",
          "url": "https://attack.mitre.org/tactics/TA0002/"
        },
        {
          "kind": "primary",
          "label": "Microsoft, Access tokens",
          "section": "Introduction and Access token contents",
          "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens"
        }
      ]
    }
  },
  "cred-reuse": {
    "reviewedAt": "2026-09-07",
    "reviewedBy": "Codex",
    "reviewerType": "ai",
    "scope": "The first sentence declares HackGraph terminology. Compared the distinction between identity authentication and authorization with the named NIST definitions. No authentication method or connection outcome is established.",
    "reviewedContent": {
      "description": "In HackGraph, credential reuse means using existing authentication material in another authentication attempt. Authentication checks a claimed identity; authorization determines permitted access.",
      "label": "credential reuse",
      "origin": "source-based",
      "references": [
        {
          "kind": "primary",
          "label": "NIST CSRC, Authentication",
          "section": "Definitions — identity authentication (FIPS 200 and NISTIR 4734)",
          "url": "https://csrc.nist.gov/glossary/term/authentication"
        },
        {
          "kind": "primary",
          "label": "NIST CSRC, Authorization",
          "section": "Definitions — access privileges and permission to access resources",
          "url": "https://csrc.nist.gov/glossary/term/authorization"
        }
      ]
    }
  },
  "enables": {
    "reviewedAt": "2026-09-07",
    "reviewedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Recorded the project convention for this label. This is author-defined vocabulary, with no independent source-comparison claim and no assessment of individual dependencies.",
    "reviewedContent": {
      "description": "An author-declared dependency between topics. Its scope belongs in the connection's own explanation.",
      "label": "dependency",
      "origin": "project-convention",
      "references": []
    }
  },
  "to-root": {
    "reviewedAt": "2026-09-07",
    "reviewedBy": "Codex",
    "reviewerType": "ai",
    "scope": "Compared the UID 0 definition and the capability/user-namespace qualification with the Linux man-pages. No assertion of host-wide access or a connection outcome is established.",
    "reviewedContent": {
      "description": "Root denotes user ID 0. A Linux process's privileges also depend on its capabilities and user namespace.",
      "label": "root context",
      "origin": "source-based",
      "references": [
        {
          "kind": "primary",
          "label": "Linux man-pages, capabilities(7)",
          "section": "DESCRIPTION — superuser and capabilities",
          "url": "https://man7.org/linux/man-pages/man7/capabilities.7.html"
        },
        {
          "kind": "primary",
          "label": "Linux man-pages, user_namespaces(7)",
          "section": "DESCRIPTION and Capabilities",
          "url": "https://man7.org/linux/man-pages/man7/user_namespaces.7.html"
        }
      ]
    }
  }
};
