/**
 * Shared definitions for relationship labels used by the security maps.
 * These explain vocabulary, separately from an individual connection's claims.
 * Explicit edge captions remain authored captions. Unknown relationship IDs fail
 * validation; add a definition and its evidence before introducing a new ID.
 */
export const RELATIONSHIPS = {
  'host-exec': {
    label: 'code execution',
    origin: 'source-based',
    description: 'Execution means code running on a system. The process or thread has its own security context; the label alone does not identify an account or privilege level.',
    references: [
      { label: 'MITRE ATT&CK, Execution', url: 'https://attack.mitre.org/tactics/TA0002/', kind: 'taxonomy', section: 'Execution — introductory definition' },
      { label: 'Microsoft, Access tokens', url: 'https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens', kind: 'primary', section: 'Introduction and Access token contents' },
    ],
  },
  'cred-reuse': {
    label: 'credential reuse',
    origin: 'source-based',
    description: 'In HackGraph, credential reuse means using existing authentication material in another authentication attempt. Authentication checks a claimed identity; authorization determines permitted access.',
    references: [
      { label: 'NIST CSRC, Authentication', url: 'https://csrc.nist.gov/glossary/term/authentication', kind: 'primary', section: 'Definitions — identity authentication (FIPS 200 and NISTIR 4734)' },
      { label: 'NIST CSRC, Authorization', url: 'https://csrc.nist.gov/glossary/term/authorization', kind: 'primary', section: 'Definitions — access privileges and permission to access resources' },
    ],
  },
  enables: {
    label: 'dependency',
    origin: 'project-convention',
    description: "An author-declared dependency between topics. Its scope belongs in the connection's own explanation.",
    references: [],
  },
  'to-root': {
    label: 'root context',
    origin: 'source-based',
    description: "Root denotes user ID 0. A Linux process's privileges also depend on its capabilities and user namespace.",
    references: [
      { label: 'Linux man-pages, capabilities(7)', url: 'https://man7.org/linux/man-pages/man7/capabilities.7.html', kind: 'primary', section: 'DESCRIPTION — superuser and capabilities' },
      { label: 'Linux man-pages, user_namespaces(7)', url: 'https://man7.org/linux/man-pages/man7/user_namespaces.7.html', kind: 'primary', section: 'DESCRIPTION and Capabilities' },
    ],
  },
};
