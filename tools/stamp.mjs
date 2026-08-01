#!/usr/bin/env node
// Refresh the build stamp in src/buildInfo.js from git. The site is served straight from
// the repo, so the stamp is a committed literal rather than something injected at build
// time. Run this before cutting a release; nothing breaks if you forget, the stamp just
// names an older commit.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const hash = git('rev-parse', '--short', 'HEAD');
const date = git('log', '-1', '--format=%cs');

const file = new URL('../src/buildInfo.js', import.meta.url);
const before = readFileSync(file, 'utf8');
const after = before
  .replace(/export const BUILD_HASH = '[^']*';/, `export const BUILD_HASH = '${hash}';`)
  .replace(/export const BUILD_DATE = '[^']*';/, `export const BUILD_DATE = '${date}';`);
writeFileSync(file, after);
console.log(before === after ? `stamp already current (${hash}, ${date})` : `stamped ${hash}, ${date}`);
