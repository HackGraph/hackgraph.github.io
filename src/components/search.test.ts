import { describe, it, expect } from 'vitest';
import { adMap } from '../data/maps/ad';
import { buildSearchIndex, searchNodes } from './search';

describe('search indexes deep fields and edge text', () => {
  const index = buildSearchIndex(adMap.nodes, adMap.edges);
  const ids = (q: string) => searchNodes(index, q).map((n) => n.id);

  it('finds a node via a BloodHound edge indicator (AddAllowedToAct -> rbcd)', () => {
    // "AddAllowedToAct" lives on the delegation -> rbcd edge, not in the node itself.
    expect(ids('AddAllowedToAct')).toContain('rbcd');
  });

  it('finds a node via a raw attribute name in its description', () => {
    expect(ids('msDS-AllowedToActOnBehalfOfOtherIdentity')).toContain('rbcd');
    expect(ids('S4U2Proxy')).toContain('rbcd');
  });

  it('finds a node via a term buried in a command / description', () => {
    expect(ids('vsftpd')).toContain('weak-services');
  });

  it('finds a node by its BloodHound edge alias, ranked first', () => {
    // The node prose never says "AddKeyCredentialLink" / "ReadLAPSPassword"; the alias does.
    expect(searchNodes(index, 'AddKeyCredentialLink')[0]?.id).toBe('shadow-credentials');
    expect(searchNodes(index, 'ReadLAPSPassword')[0]?.id).toBe('laps-read');
    expect(ids('AdminTo')).toContain('local-admin-host');
    expect(ids('WriteSPN')).toContain('targeted-kerberoast');
  });

  it('finds ADCS / relay / delegation nodes by their BloodHound edge names', () => {
    expect(searchNodes(index, 'ADCSESC1')[0]?.id).toBe('adcs-esc1');
    expect(ids('ManageCA')).toContain('adcs-esc7');
    expect(ids('CoerceAndRelayNTLMToLDAP')).toContain('relay-to-ldap');
    expect(ids('AllowedToDelegate')).toContain('constrained-delegation');
    expect(ids('GoldenCert')).toContain('golden-certificate');
  });

  it('still ranks a label match first over a deep-field match', () => {
    const top = searchNodes(index, 'kerberoast')[0];
    expect(top?.label.toLowerCase()).toContain('kerberoast');
  });

  it('never returns category or start nodes', () => {
    const nodesById = new Map(adMap.nodes.map((n) => [n.id, n]));
    for (const id of ids('creds')) {
      expect(nodesById.get(id)?.kind).not.toBe('category');
      expect(nodesById.get(id)?.kind).not.toBe('start');
    }
  });

  it('returns nothing for an empty query', () => {
    expect(searchNodes(index, '   ')).toEqual([]);
  });
});
