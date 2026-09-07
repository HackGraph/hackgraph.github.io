import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { STATIC_PUBLIC_FILES, stageSite, verifySite } from './site-artifact.mjs';

async function put(root, file, value = file) {
  await mkdir(dirname(join(root, file)), { recursive: true });
  await writeFile(join(root, file), value);
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'hackgraph-artifact-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of STATIC_PUBLIC_FILES) await put(root, file);
  await put(root, 'src/feature.js', 'export const value = 1;\n');
  await put(root, 'src/theme.css', 'body { color: red; }\n');
  await put(root, 'engine/fonts/sample.woff2', Buffer.from([1, 2, 3, 4]));
  await put(root, '.gitignore', '.site/\n');
  await stageSite(root, { builtAt: '2020-01-02' });
  return root;
}
async function manifest(root, change) {
  const path = join(root, '.site/build-manifest.json');
  const value = JSON.parse(await readFile(path, 'utf8'));
  change(value);
  await writeFile(path, JSON.stringify(value));
}
async function snapshot(root, prefix = '') {
  const out = {};
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(out, await snapshot(join(root, entry.name), file + '/'));
    else out[file] = (await readFile(join(root, entry.name))).toString('base64');
  }
  return out;
}

test('staging excludes development files and undeclared reference pages', async t => {
  const root = await fixture(t);
  const excluded = ['src/notes.md', 'src/debug.json', 'src/feature.test.js', 'src/feature.spec.js',
    'src/types.d.ts', 'src/tests/helper.js', 'src/__fixtures__/sample.js',
    'reference/draft.html', 'reference/debug.js', 'engine/fonts/notes.txt', 'package.json'];
  for (const file of excluded) await put(root, file);
  const result = await stageSite(root, { builtAt: '2020-01-02' });
  assert.equal(result.files.length, STATIC_PUBLIC_FILES.length + 4);
  for (const file of excluded) assert.ok(!result.files.includes(file), file);
  for (const file of ['.nojekyll', 'src/feature.js', 'src/theme.css', 'engine/fonts/sample.woff2']) assert.ok(result.files.includes(file), file);
  const actual = await snapshot(join(root, '.site'));
  for (const file of excluded) assert.equal(actual[file], undefined, file);
});

test('valid artifacts verify without modifying source or staged files', async t => {
  const root = await fixture(t), before = await snapshot(root);
  const result = await verifySite(root);
  assert.equal(result.builtAt, '2020-01-02');
  assert.equal(result.commit, null);
  assert.match(result.sourceDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(await snapshot(root), before);
  const info = await readFile(join(root, '.site/src/buildInfo.js'), 'utf8');
  assert.equal(info, `export const BUILD_HASH = "${result.sourceDigest.slice(0, 12)}";\nexport const BUILD_DATE = "2020-01-02";\nexport const BUILD_COMMIT = null;\nexport const BUILD_DATE_LABEL = BUILD_DATE;\n`);
});

test('repeated staging with the same inputs and date produces identical bytes', async t => {
  const root = await fixture(t), before = await snapshot(join(root, '.site'));
  await stageSite(root, { builtAt: '2020-01-02' });
  assert.deepEqual(await snapshot(join(root, '.site')), before);
});

test('invalid source inputs leave the prior build intact', async t => {
  const root = await fixture(t), before = await snapshot(join(root, '.site'));
  await rm(join(root, 'index.html'));
  await assert.rejects(stageSite(root), /ENOENT/);
  assert.deepEqual(await snapshot(join(root, '.site')), before);
});

for (const file of ['index.html', 'engine/fonts/sample.woff2', '.nojekyll', 'src/buildInfo.js']) {
  test(`verification rejects changed staged bytes in ${file}`, async t => {
    const root = await fixture(t);
    await put(root, '.site/' + file, 'changed');
    await assert.rejects(verifySite(root), /Staged file does not match its expected bytes/);
  });
}

test('changed source content makes an earlier build stale', async t => {
  const root = await fixture(t);
  await put(root, 'src/feature.js', 'export const value = 2;\n');
  await assert.rejects(verifySite(root), /source digest does not match/);
});

test('added or removed runtime source files invalidate the earlier manifest', async t => {
  const root = await fixture(t);
  await put(root, 'src/new-feature.js', 'export const newFeature = true;\n');
  await assert.rejects(verifySite(root), /Staged files differs/);
  await rm(join(root, 'src/new-feature.js'));
  await rm(join(root, 'src/feature.js'));
  await assert.rejects(verifySite(root), /Staged files differs/);
});

test('missing and unlisted staged files are rejected', async t => {
  const root = await fixture(t);
  await put(root, '.site/unlisted.txt');
  await assert.rejects(verifySite(root), /Staged files differs/);
  await rm(join(root, '.site/unlisted.txt'));
  await rm(join(root, '.site/src/feature.js'));
  await assert.rejects(verifySite(root), /Staged files differs/);
});

test('adding a staged file to its own manifest cannot authorize publication', async t => {
  const root = await fixture(t);
  await put(root, '.site/src/debug.json');
  await manifest(root, m => { m.files.push('src/debug.json'); m.files.sort(); });
  await assert.rejects(verifySite(root), /Staged files differs/);
});

test('manifest paths are compared with source policy before being used', async t => {
  const root = await fixture(t);
  await manifest(root, m => { m.files[0] = '../outside.txt'; });
  await assert.rejects(verifySite(root), /Manifest files differs/);
});

test('duplicate and reordered manifest paths are rejected', async t => {
  const root = await fixture(t);
  await manifest(root, m => { m.files.push(m.files[0]); });
  await assert.rejects(verifySite(root), /duplicate paths or is not sorted/);
  await stageSite(root);
  await manifest(root, m => { m.files.reverse(); });
  await assert.rejects(verifySite(root), /duplicate paths or is not sorted/);
});

test('a plausible-looking but incorrect source digest is rejected', async t => {
  const root = await fixture(t);
  await manifest(root, m => { m.sourceDigest = '0'.repeat(64); });
  await assert.rejects(verifySite(root), /source digest does not match/);
});

test('invalid manifest shapes, dates, and commit values are rejected', async t => {
  const root = await fixture(t);
  for (const value of ['not json', 'null', '[]', '{}']) {
    await put(root, '.site/build-manifest.json', value);
    await assert.rejects(verifySite(root), /JSON|object|fields/);
  }
  for (const [key, value, pattern] of [
    ['builtAt', '2020-02-30', /date is invalid/],
    ['builtAt', '9999-01-01', /date is invalid/],
    ['commit', 42, /commit is invalid/],
    ['commit', '0'.repeat(40), /commit does not match/],
  ]) {
    await stageSite(root);
    await manifest(root, m => { m[key] = value; });
    await assert.rejects(verifySite(root), pattern);
  }
});

test('staged JavaScript is compared as bytes and never executed', async t => {
  const root = await fixture(t);
  await put(root, '.site/src/buildInfo.js', 'throw new Error("staged code executed");');
  await assert.rejects(verifySite(root), /Staged file does not match its expected bytes/);
});

test('symbolic links in published source paths and staged files are rejected', async t => {
  const root = await fixture(t);
  await symlink(join(root, 'src/feature.js'), join(root, '.site/linked.js'));
  await assert.rejects(verifySite(root), /Symbolic links are not published/);
  await rm(join(root, '.site/linked.js'));
  await symlink(join(root, 'src/feature.js'), join(root, 'src/linked.js'));
  await assert.rejects(stageSite(root), /Symbolic links are not published/);
  await rm(join(root, 'src/linked.js'));
  await rm(join(root, 'reference'), { recursive: true });
  await symlink(join(root, '.site/reference'), join(root, 'reference'));
  await assert.rejects(stageSite(root), /Expected a real directory/);
});

test('a commit claim must still identify the same clean checkout', async t => {
  const root = await fixture(t);
  const git = args => execFileSync('git', ['-c', 'user.name=Artifact Test', '-c', 'user.email=artifact@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  git(['init', '-q']); git(['add', '.']); git(['commit', '-qm', 'Fixture']);
  const built = await stageSite(root);
  assert.equal(built.commit, git(['rev-parse', 'HEAD']).trim());
  assert.equal((await verifySite(root)).commit, built.commit);
  await put(root, 'notes.txt', 'A change outside the public files');
  await assert.rejects(verifySite(root), /commit does not match a clean source checkout/);
  git(['add', '.']); git(['commit', '-qm', 'Changed checkout']);
  await assert.rejects(verifySite(root), /commit does not match a clean source checkout/);
});

test('the standalone CLI returns failure without rebuilding or repairing the artifact', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'tools'));
  for (const name of ['site-artifact.mjs', 'verify-site.mjs']) await copyFile(new URL(name, import.meta.url), join(root, 'tools', name));
  await put(root, '.site/index.html', 'stale');
  const before = await snapshot(join(root, '.site'));
  const run = spawnSync(process.execPath, [join(root, 'tools/verify-site.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Staged-site verification failed/);
  assert.deepEqual(await snapshot(join(root, '.site')), before);
});
