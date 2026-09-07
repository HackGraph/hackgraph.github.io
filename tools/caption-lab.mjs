import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountDenseCourse, settle } from '../browser/helpers.mjs';

const out = new URL('../reports/visuals/', import.meta.url);
await mkdir(out, { recursive: true });
const rows = [], errors = [];
for (const [name, launcher] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const browser = await launcher.launch();
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, baseURL: 'http://127.0.0.1:5173' });
    page.on('pageerror', e => errors.push(`${name}/${width}: ${e.message}`));
    await mountDenseCourse(page);
    if (width === 390) {
      if (name === 'chromium') await page.screenshot({ path: new URL('captions-390-expansion.png', out).pathname });
      await page.getByRole('button', { name: 'Close topic list', exact: true }).click();
      await page.evaluate(() => testView.clearSelection());
      // Pan at the existing reading scale to inspect the caption corridor. The
      // initial narrow expansion intentionally presents a branch choice list.
      await page.evaluate(() => {
        const label = [...document.querySelectorAll('.elabel')].find(el => getComputedStyle(el).visibility !== 'hidden');
        const r = label.getBoundingClientRect();
        document.querySelector('[data-el="viewport"]').dispatchEvent(new WheelEvent('wheel', {
          deltaX: (r.left + r.right) / 2 - innerWidth / 2,
          deltaY: (r.top + r.bottom) / 2 - 300,
          clientX: innerWidth / 2, clientY: 300, bubbles: true, cancelable: true,
        }));
      });
      await settle(page);
    }
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => testView.setTheme(theme), theme); await settle(page);
      const result = await page.evaluate(() => {
        const labels = [...document.querySelectorAll('.elabel')];
        const shown = labels.filter(el => getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');
        const rect = el => { const { left, top, right, bottom } = el.getBoundingClientRect(); return { left, top, right, bottom }; };
        const boxes = shown.map(rect);
        const cards = [...document.querySelectorAll('.card')].filter(el => getComputedStyle(el).visibility !== 'hidden').map(rect);
        const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > .1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .1;
        return { total: labels.length, shown: shown.length,
          insideViewport: boxes.filter(r => r.right > 0 && r.left < innerWidth && r.bottom > 55 && r.top < innerHeight).length,
          captionCollisions: boxes.reduce((n, a, i) => n + boxes.slice(i + 1).filter(b => overlap(a, b)).length, 0),
          captionsCoveringCards: boxes.reduce((n, a) => n + cards.filter(b => overlap(a, b)).length, 0),
          visibleCaptions: shown.map((el, i) => ({ text: el.textContent, edge: el.dataset.edge, ...boxes[i] })),
          horizontalDocumentOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      rows.push({ browser: name, version: browser.version(), width, theme, state: width === 390 ? 'panned to captions at reading scale' : 'expanded at reading scale', ...result });
      if (name === 'chromium') await page.screenshot({ path: new URL(`captions-${width}-${theme}.png`, out).pathname });
    }
    await page.close();
  }
  await browser.close();
}
await writeFile(new URL('../reports/caption-layout.json', import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(),
  method: 'Generic five-parent/eight-target teaching graph with 27 captions, fully expanded at reading scale. Narrow screens additionally pan to the caption corridor after closing the branch list. Only rendered captions count toward collisions; shown includes the renderer overscan area, insideViewport counts intersection with the browser area below the toolbar. Overlay occlusion is not measured. Hidden captions remain available in connection details. Three local headless browsers, two viewport widths, two themes; no physical-device guarantee.',
  rows, errors }, null, 2) + '\n');
console.table(rows.map(({ visibleCaptions, ...row }) => row));
if (errors.length || rows.some(row => row.captionCollisions || row.captionsCoveringCards || row.horizontalDocumentOverflow || !row.insideViewport)) process.exitCode = 1;
