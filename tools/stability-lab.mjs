import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountExpansionCourse, settle } from '../browser/helpers.mjs';

const directory = new URL('../reports/visuals/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(), rows = [], errors = [];
const positions = page => page.locator('.card:not(.exit)').evaluateAll(cards => {
  const matrix = new DOMMatrix(getComputedStyle(document.querySelector('.fg-world')).transform);
  const vp = document.querySelector('.fg-viewport').getBoundingClientRect();
  return Object.fromEntries(cards.map(card => {
    const r = card.getBoundingClientRect();
    return [card.dataset.key, { x: (r.x - vp.x - matrix.e) / matrix.a,
      y: ((r.top + r.bottom) / 2 - vp.y - matrix.f) / matrix.a }];
  }));
});
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173',
      viewport: { width, height: width === 390 ? 844 : 1000 },
      ...(width === 1440 ? { recordVideo: { dir: '.cache/layout-stability/videos', size: { width: 1440, height: 1000 } } } : {}) });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await mountExpansionCourse(page);
    for (const id of ['root', 'a']) { await page.evaluate(id => testView.expand(id), id); await settle(page); }
    const before = await positions(page);
    await page.screenshot({ path: new URL(`stable-${width}-before-expansion.png`, directory).pathname });
    await page.locator('.card[data-key="b"] .toggle').click(); await settle(page);
    const after = await positions(page);
    const displacements = Object.keys(before).map(key => Math.hypot(after[key].x - before[key].x,
      (after[key].y - after.b.y) - (before[key].y - before.b.y)));
    await page.screenshot({ path: new URL(`stable-${width}-after-expansion.png`, directory).pathname });
    rows.push({ width, existingCards: Object.keys(before).length, expandedCards: Object.keys(after).length,
      maximumRelativeMovement: Math.max(...displacements), meanRelativeMovement: displacements.reduce((a, b) => a + b, 0) / displacements.length,
      branchChoices: await page.locator('.fg-choice').count() });
    await page.locator('.card[data-key="b"] .toggle').click(); await settle(page);
    if (width === 1440) await page.screenshot({ path: new URL('stable-1440-collapsed.png', directory).pathname });
    const video = page.video(); await context.close();
    if (video) await video.saveAs(new URL('expansion-motion.webm', directory).pathname);
  }
} finally { await browser.close(); }
await writeFile(new URL('../reports/stability-browser.json', import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(),
  browser: 'Chromium', version: browser.version(), method: 'Generic course diagram, four existing child topics followed by a 100-child neighboring expansion through its actual toggle. Positions measured in graph coordinates relative to the expanded card. Screenshots record before/after reading states; the desktop video is a capture for human motion review, not an automated quality rating.', rows, errors }, null, 2) + '\n');
console.log(JSON.stringify({ rows, errors }, null, 2));
if (errors.length || rows.some(r => r.maximumRelativeMovement > 1 || r.branchChoices !== 100)) process.exitCode = 1;
