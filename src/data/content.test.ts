import { describe, it, expect } from 'vitest';
import { MAPS } from './index';
import { buildModel } from '../graph/buildModel';
import { FOOTHOLDS } from './footholds';
import { ALL_VERSION_IDS } from './windows-versions';
import { RELATIONSHIPS } from './relationships';
import { OSCP_SCOPE } from './oscp-scope';

const MITRE_RE = /^T\d{4}(\.\d{3})?$/;
const FOOTHOLD_IDS = new Set(FOOTHOLDS.map((f) => f.id));
const VERSION_IDS = new Set(ALL_VERSION_IDS);
// References must be PUBLIC URLs, never the author's local notes.
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

      // The "what you hold" filter only makes sense if every technique carries a
      // foothold tag and non-techniques (start/category/goal) carry none. A map that
      // opts out of footholds entirely (no node tagged) is exempt.
      it('foothold (needs) tags are complete and valid where used', () => {
        if (!map.nodes.some((n) => n.needs)) return;
        const problems: string[] = [];
        for (const n of map.nodes) {
          const isTechnique = !n.kind || n.kind === 'technique';
          if (n.needs && !FOOTHOLD_IDS.has(n.needs)) problems.push(`${n.id}: invalid needs "${n.needs}"`);
          if (isTechnique && !n.needs) problems.push(`${n.id}: technique missing needs`);
          if (!isTechnique && n.needs) problems.push(`${n.id}: ${n.kind} should not carry needs`);
        }
        expect(problems).toEqual([]);
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

      // Version tags drive the "Target" filter; a typo'd id would silently dim the
      // node for every target, so pin them to the canonical windows-versions axis.
      it('version tags reference known Windows versions', () => {
        const bad: string[] = [];
        for (const n of map.nodes)
          for (const v of n.versions ?? [])
            if (!VERSION_IDS.has(v)) bad.push(`${n.id}: unknown version "${v}"`);
        expect(bad).toEqual([]);
      });

      // `rel` pulls a canonical caption/explanation from relationships.ts; an unknown
      // id would render an edge with no meaning (buildModel also throws on this).
      it('edge rel ids reference known relationships', () => {
        const bad = map.edges
          .filter((e) => e.rel && !(e.rel in RELATIONSHIPS))
          .map((e) => `${e.source}->${e.target}: unknown rel "${e.rel}"`);
        expect(bad).toEqual([]);
      });

      // The graph is revealed by walking edges forward from the root; a node with no
      // path from the root can never appear on the canvas (a dead content entry).
      it('every node is reachable from the root', () => {
        const children = new Map<string, string[]>();
        for (const e of map.edges) {
          const arr = children.get(e.source);
          if (arr) arr.push(e.target);
          else children.set(e.source, [e.target]);
        }
        const seen = new Set<string>([map.rootId]);
        const stack = [map.rootId];
        while (stack.length) {
          const n = stack.pop()!;
          for (const c of children.get(n) ?? [])
            if (!seen.has(c)) {
              seen.add(c);
              stack.push(c);
            }
        }
        const unreachable = map.nodes.map((n) => n.id).filter((id) => !seen.has(id));
        expect(unreachable).toEqual([]);
      });
    });
  }
});

// The OSCP scope set lives outside the node data (it is OffSec's external exam
// boundary, not an intrinsic node property), so ids there can drift out of sync with
// the graph. Pin every scope id to a real technique node across all maps.
describe('OSCP scope', () => {
  const byId = new Map(MAPS.flatMap((m) => m.nodes.map((n) => [n.id, n] as const)));

  it('every scope id resolves to a real node', () => {
    const orphans = [...OSCP_SCOPE].filter((id) => !byId.has(id));
    expect(orphans).toEqual([]);
  });

  it('every scope id points at a technique (not a start/category/goal)', () => {
    const bad = [...OSCP_SCOPE]
      .map((id) => byId.get(id))
      .filter((n) => n && n.kind && n.kind !== 'technique')
      .map((n) => `${n!.id}: ${n!.kind}`);
    expect(bad).toEqual([]);
  });
});
