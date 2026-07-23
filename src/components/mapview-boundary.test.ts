import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

/**
 * Boundary guard: the engine must not import the domain filter DATA modules. It may
 * import the opaque filter registry (data/filters) — that IS the seam. A source scan
 * (not a static-import graph) keeps this self-contained and framework-free.
 */
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('engine <-> domain boundary (filters)', () => {
  const forbidden = ['windows-versions', 'footholds', 'oscp-scope'];

  it('MapView imports no domain filter data, only the registry', () => {
    const src = read('./MapView.tsx');
    for (const mod of forbidden)
      expect(src, `MapView still imports ${mod}`).not.toMatch(new RegExp(`from ['"][^'"]*${mod}['"]`));
    expect(src).toMatch(/from ['"]\.\.\/data\/filters['"]/);
  });

  it('FilterBar (engine) imports no domain data', () => {
    const src = read('./FilterBar.tsx');
    for (const mod of [...forbidden, 'data/schema'])
      expect(src).not.toMatch(new RegExp(`from ['"][^'"]*${mod}['"]`));
  });

  it('graph/filters.ts depends only on the generic model', () => {
    const src = read('../graph/filters.ts');
    expect(src).not.toMatch(/from ['"][^'"]*\/data\//);
  });
});
