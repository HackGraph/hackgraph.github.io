/**
 * Foothold capabilities for the "what you currently hold" filter.
 *
 * A technique node may carry `needs?: FootholdId` — the access a reader must already
 * POSSESS to attempt it. Two things are deliberately NOT encoded here and stay in
 * `requires` instead: environmental conditions (a coercion vector, a service running,
 * SMB/LDAP signing disabled) and the specific ACL edge or group membership a step
 * abuses (holding GenericWrite over one object is still "a domain user", just one with
 * an edge).
 *
 * These are NOT a strict ladder: holding a domain user and holding local admin are
 * independent (you might hold one, the other, both, or via two separate accounts), so
 * the filter is multi-select. A node is reachable if its `needs` tier is held, if it
 * needs no credentials (always doable), or if Domain Admin is held (does everything).
 * Omitting `needs` means no gate (never dimmed by this filter). Order below is the
 * usual escalation order, purely for how the chips read left-to-right.
 */
export interface Foothold {
  id: string;
  /** Short label for the toggle chip. */
  label: string;
  /** One-liner describing what holding this means. */
  hint: string;
}

export const FOOTHOLDS: Foothold[] = [
  { id: 'none', label: 'No creds', hint: 'Network access only, no account' },
  {
    id: 'domain-user',
    label: 'Domain user',
    hint: 'Any valid domain account (including one that holds an ACL edge or group)',
  },
  { id: 'local-admin', label: 'Local admin', hint: 'Administrator or SYSTEM on a host' },
  {
    id: 'domain-admin',
    label: 'Domain Admin',
    hint: 'Domain compromise: DA, replication rights, or DC access',
  },
];

export type FootholdId = 'none' | 'domain-user' | 'local-admin' | 'domain-admin';

const LABELS = new Map(FOOTHOLDS.map((f) => [f.id, f.label]));
export const footholdLabel = (id: string): string => LABELS.get(id) ?? id;
