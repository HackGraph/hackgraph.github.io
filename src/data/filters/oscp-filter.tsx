/**
 * OSCP (PEN-200) exam-scope study filter.
 *
 * Unlike the dim-style filters, this one marks every out-of-scope technique as INAPPLICABLE
 * (the ruled-out ban badge) rather than merely fading it, and lets the user re-enable any
 * node individually — a starting point you refine, not an all-or-nothing switch. State is
 * `{ on, reEnabled }`: `on` toggles the whole filter; `reEnabled` is the list of node ids
 * forced visible despite being out of scope. Persisted, and kept fully separate from the
 * manual "mark inapplicable" annotations. Reads only the generic node id.
 */
import { defineFilter } from '../../graph/filters';
import { OSCP_SCOPE } from '../oscp-scope';

interface State {
  on: boolean;
  reEnabled: string[];
}

const toggleId = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export const oscpFilter = defineFilter<State>({
  id: 'oscp',
  appliesTo: (map) => map.nodes.some((n) => OSCP_SCOPE.has(n.id)),
  initial: { on: false, reEnabled: [] },
  // Bumped from the legacy boolean key so an old `true`/`false` value can't reach the new
  // object shape (which would crash on reEnabled.includes).
  persistKey: 'hg-oscp',
  isActive: (s) => s.on === true,
  excludes: 'inapplicable',
  // Out of scope unless the user re-enabled it.
  dims: (node, s) => s.on && !OSCP_SCOPE.has(node.id) && !s.reEnabled.includes(node.id),
  toggleException: (s, id) => ({ ...s, reEnabled: toggleId(s.reEnabled, id) }),
  // A re-enabled exception = out of the base scope but forced visible.
  isException: (s, id) => s.on && !OSCP_SCOPE.has(id) && s.reEnabled.includes(id),
  Control: ({ state, setState }) => (
    <button
      type="button"
      onClick={() => setState((v) => ({ ...v, on: !v.on }))}
      title="Mark techniques outside OSCP (PEN-200) exam scope as inapplicable. Right-click any node to re-enable it. Note: OSCP also tests web, client-side, tunneling and Metasploit, which aren't mapped here."
      className={[
        'rounded-full px-2 py-0.5 text-xs transition-colors',
        state.on ? 'bg-white/[0.08] text-ink' : 'text-ink-dim hover:text-ink',
      ].join(' ')}
    >
      OSCP
    </button>
  ),
});
