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
 * These are capabilities, NOT a strict ladder: holding a domain user and holding local
 * admin are independent (you might hold one, the other, both, or via two separate
 * accounts), so the filter is multi-select. Some capabilities do imply weaker ones,
 * though (admin on a host implies you can run code on it; any account is "a credential";
 * Domain Admin does everything). Those implications are encoded in {@link SATISFIED_BY}
 * rather than assumed as a linear order. Omitting `needs` means no gate (never dimmed by
 * this filter). Order below is the usual escalation order, purely for how the chips read
 * left-to-right.
 */
export interface Foothold {
  id: string;
  /** Short label for the toggle chip. */
  label: string;
  /** One-liner describing what holding this means. */
  hint: string;
}

export const FOOTHOLDS: Foothold[] = [
  { id: 'none', label: 'Network only', hint: 'Network access only, no account' },
  { id: 'shell', label: 'Shell', hint: 'Code execution on a host (a shell), no credentials yet' },
  { id: 'creds', label: 'Any creds', hint: 'A valid credential (domain or local), not necessarily admin' },
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

export type FootholdId = 'none' | 'shell' | 'creds' | 'domain-user' | 'local-admin' | 'domain-admin';

/**
 * For each `needs` tier, the set of held capabilities that satisfy it. Encodes the
 * natural implications: admin on a host gives you code execution (`shell`); any of the
 * credentialed tiers counts as holding `creds`; Domain Admin satisfies everything. It is
 * deliberately NOT a full ladder — local-admin does not imply a domain account, and a
 * domain user does not imply code execution on a host.
 */
const SATISFIED_BY: Record<FootholdId, ReadonlySet<string>> = {
  none: new Set(['none', 'shell', 'creds', 'domain-user', 'local-admin', 'domain-admin']),
  shell: new Set(['shell', 'local-admin', 'domain-admin']),
  creds: new Set(['creds', 'domain-user', 'local-admin', 'domain-admin']),
  'domain-user': new Set(['domain-user', 'domain-admin']),
  'local-admin': new Set(['local-admin', 'domain-admin']),
  'domain-admin': new Set(['domain-admin']),
};

/** True if holding the capabilities in `held` is enough to attempt a node needing `need`.
 *  `none` is always satisfied (no credentials required). */
export function footholdSatisfies(need: FootholdId, held: ReadonlySet<string>): boolean {
  if (need === 'none') return true;
  const ok = SATISFIED_BY[need];
  if (!ok) return false;
  for (const h of held) if (ok.has(h)) return true;
  return false;
}

const LABELS = new Map(FOOTHOLDS.map((f) => [f.id, f.label]));
export const footholdLabel = (id: string): string => LABELS.get(id) ?? id;
