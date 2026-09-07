import { test } from 'node:test';
import assert from 'node:assert/strict';
import { range, WINDOWS_VERSIONS, versionCoverage } from './windows-versions.js';

test('new catalog releases never silently extend authored applicability ranges', () => {
  assert.ok(WINDOWS_VERSIONS.some(v => v.id === 'win11-25h2'));
  assert.ok(WINDOWS_VERSIONS.some(v => v.id === 'win11-26h1'));
  assert.equal(range('win10-1507').includes('win11-25h2'), false);
  assert.equal(range('win10-1507').includes('win11-26h1'), false);
  assert.equal(versionCoverage({}, 'win11-24h2'), 'unknown');
  assert.equal(versionCoverage({ versions: ['win11-24h2'] }, 'win11-25h2'), 'unknown');
  assert.equal(versionCoverage({ versions: ['win11-25h2'] }, 'win11-25h2'), 'authored');
  assert.equal(versionCoverage({ versions: ['win11-24h2'] }, 'win10-1507'), 'outside-authored-range');
});
