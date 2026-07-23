import { describe, it, expect } from 'vitest';
import { oscpFilter } from './oscp-filter';
import { OSCP_SCOPE } from '../oscp-scope';
import type { GraphNode } from '../../graph/model';

type S = { on: boolean; reEnabled: string[] };
const node = (id: string) => ({ id }) as GraphNode;
const inScopeId = [...OSCP_SCOPE][0];
const outId = 'llmnr-poisoning'; // deliberately out of OSCP scope (spoofing, banned)

describe('oscpFilter', () => {
  it('is an inapplicable-mode filter, off by default', () => {
    expect(oscpFilter.excludes).toBe('inapplicable');
    expect(oscpFilter.isActive(oscpFilter.initial)).toBe(false);
    expect((oscpFilter.initial as S).reEnabled).toEqual([]);
  });

  it('scopes out out-of-scope nodes when on, leaves in-scope ones', () => {
    const on: S = { on: true, reEnabled: [] };
    expect(oscpFilter.dims(node(outId), on)).toBe(true);
    expect(oscpFilter.dims(node(inScopeId), on)).toBe(false);
  });

  it('does nothing while off (even with stale re-enables)', () => {
    const off: S = { on: false, reEnabled: [outId] };
    expect(oscpFilter.dims(node(outId), off)).toBe(false);
    expect(oscpFilter.isException!(off, outId)).toBe(false);
  });

  it('re-enable exempts a node and reports it as an exception; toggling again re-hides', () => {
    const on: S = { on: true, reEnabled: [] };
    const next = oscpFilter.toggleException!(on, outId) as S;
    expect(next.reEnabled).toContain(outId);
    expect(oscpFilter.dims(node(outId), next)).toBe(false); // now shown
    expect(oscpFilter.isException!(next, outId)).toBe(true); // override hint

    const back = oscpFilter.toggleException!(next, outId) as S;
    expect(back.reEnabled).not.toContain(outId);
    expect(oscpFilter.dims(node(outId), back)).toBe(true); // scoped out again
    expect(oscpFilter.isException!(back, outId)).toBe(false);
  });

  it('an in-scope node is never treated as a re-enabled exception', () => {
    const on: S = { on: true, reEnabled: [inScopeId] };
    expect(oscpFilter.isException!(on, inScopeId)).toBe(false);
  });
});
