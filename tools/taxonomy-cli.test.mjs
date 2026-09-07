import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

test('a failing taxonomy audit retains its complete report for CI diagnostics', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hackgraph-taxonomy-'));
  try {
    const input = join(dir, 'input.json'), report = join(dir, 'report.json');
    const bundle = JSON.stringify({ objects: [{ type: 'attack-pattern', id: 'example-pattern', name: 'Example taxonomy concept',
      external_references: [{ source_name: 'mitre-attack', external_id: 'T1003', url: 'https://example.org/concept' }] }] });
    await writeFile(input, bundle);
    const result = spawnSync(process.execPath, ['tools/check-taxonomy.mjs', '--input', input, '--report', report], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    const stored = JSON.parse(await readFile(report, 'utf8'));
    assert.equal(stored.inputMode, 'local-file');
    assert.equal(stored.sha256, createHash('sha256').update(bundle).digest('hex'));
    assert.equal(stored.entries.T1003.status, 'active');
    assert.ok(Object.values(stored.entries).some(e => e.status === 'missing'));
    assert.ok(Object.keys(stored.entries).length > 1);
    // These production citations have no dedicated node mapping; the former
    // collector silently omitted them from even a failing report.
    assert.equal(stored.entries.T1006.status, 'missing');
    assert.equal(stored.entries.TA0002.status, 'missing');
    assert.ok(stored.usage.citationOnlyIds.includes('T1006'));
    assert.ok(stored.usage.locations.T1006.some(row => row.field.startsWith('references[')));
    assert.ok(stored.usage.locations.TA0002.some(row => row.kind === 'definition'));
    assert.match(stored.scope, /Identifier status only/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
