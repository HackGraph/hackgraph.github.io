import { describe, it, expect } from 'vitest';
import { GLOSSARY, tokenizeGlossary } from './glossary';

const terms = (text: string) =>
  tokenizeGlossary(text)
    .filter((s) => s.type === 'term')
    .map((s) => (s as { term: string }).term);

describe('glossary tokenizer', () => {
  it('matches a known term and attaches its definition', () => {
    const segs = tokenizeGlossary('Dump LSASS to harvest hashes.');
    const hit = segs.find((s) => s.type === 'term');
    expect(hit).toBeTruthy();
    expect(hit).toMatchObject({ type: 'term', value: 'LSASS', term: 'LSASS' });
    expect((hit as { def: string }).def.length).toBeGreaterThan(0);
  });

  it('never loses or reorders characters (segments reassemble the input)', () => {
    const input =
      'You hold at least one valid domain account: spray it over SMB, then DCSync from a DC to pull the krbtgt hash.';
    const rebuilt = tokenizeGlossary(input)
      .map((s) => s.value)
      .join('');
    expect(rebuilt).toBe(input);
  });

  it('only matches on word boundaries (no matches inside larger words)', () => {
    // "SID" must not fire inside "considerable"; "DC" must not fire inside "DCSync".
    expect(terms('a considerable amount')).not.toContain('SID');
    const t = terms('run DCSync now');
    expect(t).toContain('DCSync');
    expect(t).not.toContain('DC');
  });

  it('wraps each term at most once per block (first occurrence)', () => {
    const t = terms('Relay over SMB to another SMB host, then a third SMB share.');
    expect(t.filter((x) => x === 'SMB')).toHaveLength(1);
  });

  it('is case-sensitive (does not match lowercased acronyms)', () => {
    expect(terms('the sid was reused')).not.toContain('SID');
  });

  it('prefers the longest match and resolves aliases to the canonical term', () => {
    // "LDAPS" is an alias of LDAP and must win over the shorter "LDAP".
    expect(terms('relay to LDAPS on the DC')).toContain('LDAP');
    // Alias casing maps back to the canonical entry.
    expect(terms('use pass-the-hash here')).toContain('Pass-the-Hash');
  });

  it('returns the whole string as one text segment when nothing matches', () => {
    const segs = tokenizeGlossary('nothing notable in this sentence');
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: 'text', value: 'nothing notable in this sentence' });
  });

  it('has non-empty, unique terms and definitions', () => {
    const seen = new Set<string>();
    for (const e of GLOSSARY) {
      expect(e.term.length).toBeGreaterThan(0);
      expect(e.short.length).toBeGreaterThan(0);
      expect(seen.has(e.term)).toBe(false);
      seen.add(e.term);
    }
  });
});
