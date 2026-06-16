/**
 * Canonical edge relationships: a controlled vocabulary so edges that mean the
 * SAME thing reuse one definition (consistent label + a rich explanation shown
 * in the edge panel) instead of each inventing its own wording.
 *
 * An edge sets `rel: '<id>'`. If it omits `label`/`description`, the relationship
 * supplies them; an explicit `label` on the edge still wins (keeps a specific
 * on-graph caption while sharing the canonical explanation). See buildModel.
 *
 * This vocabulary is part of the SHARED, domain-independent framework: every map
 * (AD, Windows PE, and future web/cloud/network maps) draws its path-step semantics
 * from the same definitions. Entries are grouped into a cross-domain CORE that all
 * maps use, plus per-domain sections. When adding a map, reuse the core rels and add
 * a new domain section here rather than inventing per-edge wording inline.
 */
export interface Relationship {
  /** Default short caption shown on the edge if it has no explicit label. */
  label: string;
  /** Reusable explanation shown in the edge detail panel. */
  description: string;
}

export const RELATIONSHIPS: Record<string, Relationship> = {
  // ── Cross-domain CORE: every map's pathfinding uses these ──────────────────
  'host-exec': {
    label: 'code execution',
    description:
      'Yields command execution on the target host (frequently as SYSTEM), establishing or extending a foothold from which you can dump credentials and pivot further.',
  },
  'cred-reuse': {
    label: 'credential reuse',
    description:
      'A recovered secret (password, NT hash, or Kerberos ticket) is replayed to authenticate to another host or service, spreading access laterally.',
  },
  enables: {
    label: 'enables',
    description:
      'A capability, privilege, or misconfiguration that unlocks the next step. Holding it is the precondition for what follows, where the actual code execution or access is realised.',
  },

  // ── Active Directory domain vocabulary ──────────────────────────────────────
  coerce: {
    label: 'coerced auth',
    description:
      "A victim machine is forced to authenticate to an attacker-controlled endpoint, exposing its credentials for capture or relay.",
  },
  'relay-ldap': {
    label: 'relay → LDAP(S)',
    description:
      'Captured/coerced authentication is relayed to a Domain Controller over LDAP(S) to write ACLs, configure delegation (RBCD), or add shadow credentials.',
  },
  'relay-smb': {
    label: 'relay → SMB',
    description:
      'Captured authentication is relayed to SMB on a host where the principal is local admin, to execute code or dump the SAM.',
  },
  'cert-auth': {
    label: 'cert → TGT',
    description:
      'A certificate is used via PKINIT to obtain a TGT (and often the account NT hash), bridging certificate access to Kerberos and hash-based attacks.',
  },
  'forge-ticket': {
    label: 'forged ticket',
    description:
      'A Kerberos ticket (TGT or TGS) is forged or requested, granting authenticated access as the impersonated principal.',
  },
  delegation: {
    label: 'delegation abuse',
    description:
      'A delegation primitive (unconstrained, constrained, or resource-based) is abused to impersonate a privileged user to a target service.',
  },
  dcsync: {
    label: 'DCSync',
    description:
      'Directory replication rights are abused to pull secrets (NT hashes, the krbtgt key) directly from a Domain Controller.',
  },
  'to-da': {
    label: '→ Domain Admin',
    description: 'This step yields Domain Admin or equivalent full domain control.',
  },
};

export type RelationshipId = keyof typeof RELATIONSHIPS;
