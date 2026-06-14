import { describe, it, expect } from 'vitest';
import { MAPS } from './index';
import { buildModel } from '../graph/buildModel';

const MITRE_RE = /^T\d{4}(\.\d{3})?$/;
const DIFFICULTY = new Set(['easy', 'medium', 'hard']);
// References must be PUBLIC URLs — never the author's local notes.
const FORBIDDEN = ['obsidian', '/home/', 'file:', 'localhost', '127.0.0.1'];

describe('content lint', () => {
  for (const map of MAPS) {
    describe(map.name, () => {
      const phaseIds = new Set(map.phases.map((p) => p.id));

      it('builds (unique ids, valid edge endpoints, root exists)', () => {
        expect(() => buildModel(map)).not.toThrow();
      });

      it('every node has a valid phase', () => {
        const bad = map.nodes
          .filter((n) => !phaseIds.has(n.phase))
          .map((n) => `${n.id}:${n.phase}`);
        expect(bad).toEqual([]);
      });

      it('MITRE ids are well-formed (T#### or T####.###)', () => {
        const bad = map.nodes
          .filter((n) => n.mitre && !MITRE_RE.test(n.mitre.id))
          .map((n) => `${n.id}:${n.mitre?.id}`);
        expect(bad).toEqual([]);
      });

      it('difficulty values are valid', () => {
        const bad = map.nodes
          .filter((n) => n.difficulty && !DIFFICULTY.has(n.difficulty))
          .map((n) => n.id);
        expect(bad).toEqual([]);
      });

      it('all reference & tool URLs are public https (no local note paths)', () => {
        const offenders: string[] = [];
        for (const n of map.nodes) {
          const urls = [
            ...(n.references ?? []).map((r) => r.url),
            ...(n.tools ?? []).map((t) => t.url).filter((u): u is string => Boolean(u)),
          ];
          for (const u of urls) {
            const lo = u.toLowerCase();
            if (!u.startsWith('https://')) offenders.push(`${n.id}: not https → ${u}`);
            if (FORBIDDEN.some((f) => lo.includes(f))) offenders.push(`${n.id}: local/forbidden → ${u}`);
          }
        }
        expect(offenders).toEqual([]);
      });

      it('every reference has a non-empty label', () => {
        const bad = map.nodes
          .flatMap((n) => (n.references ?? []).map((r) => ({ id: n.id, r })))
          .filter(({ r }) => !r.label || !r.label.trim())
          .map(({ id }) => id);
        expect(bad).toEqual([]);
      });
    });
  }
});
