// The publication policy is independent of the manifest written into .site.
// Verification reads bytes and JSON only; it never imports staged JavaScript.
import { copyFile, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

export const STATIC_PUBLIC_FILES = [
  'index.html', '404.html', 'reference.html', 'about.html', 'glossary.html',
  'reference/active-directory.html', 'reference/windows-privilege-escalation.html',
  'reference/linux-privilege-escalation.html', 'robots.txt', 'sitemap.xml',
  'favicon.svg', 'og-image.png', 'llms.txt', 'LICENSE',
  'engine/engine.js', 'engine/view.js', 'engine/style.css', 'src/buildInfo.js',
];
const developmentPath = path => /(?:^|\/)(?:tests?|fixtures|__tests__|__fixtures__)(?:\/|$)/.test(path)
  || /\.(?:test|spec)\.[^/]+$/.test(path);

async function directory(path) {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Expected a real directory: ${path}`);
}

async function sourceFile(root, file) {
  let path = root;
  for (const part of file.split('/').slice(0, -1)) {
    path = join(path, part);
    await directory(path);
  }
  const stat = await lstat(join(root, file));
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a regular source file: ${file}`);
}

async function walk(root, { include = () => true, ignore = () => false } = {}, prefix = '') {
  await directory(root);
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (ignore(relative)) continue;
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not published: ${relative}`);
    if (entry.isDirectory()) files.push(...await walk(join(root, entry.name), { include, ignore }, relative + '/'));
    else if (include(relative)) {
      if (!entry.isFile()) throw new Error(`Expected a regular file; symbolic links are not published: ${relative}`);
      files.push(relative);
    }
  }
  return files.sort();
}

export async function publicSourceFiles(root) {
  await directory(root);
  for (const file of STATIC_PUBLIC_FILES) await sourceFile(root, file);
  const code = await walk(join(root, 'src'), { include: p => /\.(?:js|css)$/.test(p), ignore: developmentPath });
  const fonts = await walk(join(root, 'engine/fonts'), { include: p => p.endsWith('.woff2') });
  return [...new Set(['.nojekyll', ...STATIC_PUBLIC_FILES, ...code.map(p => 'src/' + p), ...fonts.map(p => 'engine/fonts/' + p)])].sort();
}

const sourceBytes = (root, file) => file === '.nojekyll' ? Buffer.alloc(0) : readFile(join(root, file));

async function sourceDigest(root, files) {
  const hash = createHash('sha256');
  for (const file of files) { hash.update(file + '\0'); hash.update(await sourceBytes(root, file)); }
  return hash.digest('hex');
}

function buildInfo({ sourceDigest, builtAt, commit }) {
  return `export const BUILD_HASH = ${JSON.stringify(sourceDigest.slice(0, 12))};\n`
    + `export const BUILD_DATE = ${JSON.stringify(builtAt)};\n`
    + `export const BUILD_COMMIT = ${JSON.stringify(commit)};\n`
    + 'export const BUILD_DATE_LABEL = BUILD_DATE;\n';
}

function cleanCommit(root) {
  const options = { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  try {
    if (!execFileSync('git', ['status', '--porcelain'], options).trim()) {
      return execFileSync('git', ['rev-parse', 'HEAD'], options).trim();
    }
  } catch { /* Source exports need not include a Git repository. */ }
  return null;
}

function validBuildDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    && value <= new Date().toISOString().slice(0, 10);
}

function sameFiles(actual, expected, label) {
  if (!Array.isArray(actual) || actual.some(p => typeof p !== 'string')) throw new Error(`${label} must be a file list`);
  const missing = expected.filter(p => !actual.includes(p));
  const extra = actual.filter(p => !expected.includes(p));
  if (missing.length || extra.length) throw new Error(`${label} differs: missing ${JSON.stringify(missing)}, extra ${JSON.stringify(extra)}`);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} contains duplicate paths or is not sorted`);
}

export async function stageSite(root, { builtAt = new Date().toISOString().slice(0, 10) } = {}) {
  root = resolve(root);
  if (!validBuildDate(builtAt)) throw new Error('Build date must be a valid, non-future UTC date');
  // Validate source paths before replacing the generated build directory.
  const files = await publicSourceFiles(root);
  const digest = await sourceDigest(root, files);
  const dest = join(root, '.site');
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  for (const file of files) {
    await mkdir(dirname(join(dest, file)), { recursive: true });
    if (file === '.nojekyll') await writeFile(join(dest, file), '');
    else await copyFile(join(root, file), join(dest, file));
  }
  const manifest = { builtAt, sourceDigest: digest, commit: cleanCommit(root), files };
  await writeFile(join(dest, 'src/buildInfo.js'), buildInfo(manifest));
  await writeFile(join(dest, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await verifySite(root);
  return manifest;
}

export async function verifySite(root) {
  root = resolve(root);
  const dest = join(root, '.site');
  const files = await publicSourceFiles(root);
  const staged = await walk(dest);
  sameFiles(staged, [...files, 'build-manifest.json'].sort(), 'Staged files');
  let manifest;
  try { manifest = JSON.parse(await readFile(join(dest, 'build-manifest.json'), 'utf8')); }
  catch { throw new Error('Staged build-manifest.json is not valid JSON'); }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Build manifest must be an object');
  if (JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(['builtAt', 'commit', 'files', 'sourceDigest'])) throw new Error('Unexpected build manifest fields');
  sameFiles(manifest.files, files, 'Manifest files');
  if (!validBuildDate(manifest.builtAt)) throw new Error('Manifest build date is invalid or in the future');
  if (typeof manifest.sourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(manifest.sourceDigest)) throw new Error('Manifest source digest is invalid');
  if (manifest.commit !== null && (typeof manifest.commit !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(manifest.commit))) throw new Error('Manifest commit is invalid');
  if (manifest.commit !== null && manifest.commit !== cleanCommit(root)) throw new Error('Manifest commit does not match a clean source checkout');
  const digest = await sourceDigest(root, files);
  if (manifest.sourceDigest !== digest) throw new Error('Manifest source digest does not match the current publication inputs');
  for (const file of files) {
    const expected = file === 'src/buildInfo.js' ? Buffer.from(buildInfo(manifest)) : await sourceBytes(root, file);
    if (!expected.equals(await readFile(join(dest, file)))) throw new Error(`Staged file does not match its expected bytes: ${file}`);
  }
  return { files: files.length, sourceDigest: digest, builtAt: manifest.builtAt, commit: manifest.commit };
}
