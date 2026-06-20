import { describe, it, expect } from 'vitest';
import { __deepLinkInternals, type DeepLink } from './deepLink';

const { serialize, deserialize, encodeHash, decodeHash } = __deepLinkInternals;

const DEEP: DeepLink = {
  mapId: 'ad',
  open: [
    'network-recon',
    'valid-domain-creds',
    'local-admin-host',
    'local-cred-hunt',
    'local-cred-hunt~valid-domain-creds',
    'local-cred-hunt~valid-domain-creds~ad-cat-credaccess',
    'browser-creds~valid-domain-creds~ad-cat-credaccess',
  ],
  sel: 'local-cred-hunt~valid-domain-creds~ad-cat-credaccess',
};

describe('deepLink encoding', () => {
  it('round-trips a deep state through the compressed token', () => {
    const decoded = decodeHash(encodeHash(DEEP));
    expect(decoded).toEqual(DEEP);
  });

  it('emits a compact opaque `s=` token (no readable keys leak)', () => {
    const body = encodeHash(DEEP);
    expect(body.startsWith('s=')).toBe(true);
    expect(body).not.toContain('valid-domain-creds');
  });

  it('actually shrinks a long state vs the raw query string', () => {
    const raw = serialize(DEEP);
    const token = encodeHash(DEEP).slice(2); // drop `s=`
    expect(token.length).toBeLessThan(raw.length);
  });

  it('still parses the legacy readable format (no token)', () => {
    const legacy = 'map=ad&open=valid-domain-creds,local-admin-host&sel=local-admin-host';
    expect(decodeHash(legacy)).toEqual({
      mapId: 'ad',
      open: ['valid-domain-creds', 'local-admin-host'],
      sel: 'local-admin-host',
    });
  });

  it('handles empty + malformed hashes without throwing', () => {
    expect(decodeHash('')).toEqual({ mapId: null, open: [], sel: null });
    expect(encodeHash({ mapId: null, open: [], sel: null })).toBe('');
    // A garbage token decodes to empty rather than crashing.
    expect(decodeHash('s=@@@not-a-real-token@@@')).toEqual({ mapId: null, open: [], sel: null });
  });

  it('preserves order and instance keys exactly', () => {
    const rt = deserialize(serialize(DEEP));
    expect(rt.open).toEqual(DEEP.open);
  });
});
