import { chromium, firefox } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { openApp, mountCourse, settle } from '../browser/helpers.mjs';
const require = createRequire(import.meta.url);
const out = new URL('../reports/visuals/', import.meta.url);
await mkdir(out, { recursive: true });
const rows = [], violations = [], errors = [];
for (const [name, launcher] of [['chromium', chromium], ['firefox', firefox]]) {
  const browser = await launcher.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, baseURL: 'http://127.0.0.1:5173' });
  page.on('pageerror', e => errors.push(name + ': ' + e.message));
  await openApp(page); await settle(page);
  if (name === 'chromium') {
    await page.screenshot({ path: new URL('desktop-start.png', out).pathname });
    await page.locator('.card .toggle').click(); await settle(page);
    await page.screenshot({ path: new URL('desktop-expanded.png', out).pathname });
    await page.evaluate(() => testView.setTheme('light')); await settle(page);
    await page.screenshot({ path: new URL('desktop-light.png', out).pathname });
    await page.evaluate(() => testView.setTheme('dark'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => testView.reset()); await settle(page);
    await page.screenshot({ path: new URL('mobile-start.png', out).pathname });
    await page.locator('.card .toggle').click(); await settle(page);
    await page.screenshot({ path: new URL('mobile-expanded.png', out).pathname });
    await page.evaluate(() => testView.fit()); await settle(page);
    await page.screenshot({ path: new URL('mobile-overview.png', out).pathname });
  }
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluate(theme => { testView.setTheme(theme); testView.reset(); testView.select('network-recon'); }, theme);
    await settle(page);
    const found = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target), details: v.nodes.map(n => n.failureSummary) })));
    violations.push({ name, theme, width, found });
  }
  await browser.close();
  // Accessibility tools and screenshot scenarios allocate substantial DOM and
  // analysis state. Keep that workload out of the frame-sampling process.
  const timingBrowser = await launcher.launch();
  const timingPage = await timingBrowser.newPage({ viewport: { width: 1440, height: 1000 }, baseURL: 'http://127.0.0.1:5173' });
  timingPage.on('pageerror', e => errors.push(name + ' timing: ' + e.message));
  await openApp(timingPage);
  for (const count of [25, 100]) for (let repeat = 0; repeat < 3; repeat++) {
    await mountCourse(timingPage, count);
    const result = await timingPage.evaluate(async () => {
      const frames = []; let active = true, previous = null, firstFrameDelayMs = null;
      const start = performance.now();
      const tick = t => {
        if (!active) return;
        // rAF's timestamp and performance.now() describe different instants.
        // Keep inter-frame intervals separate from the time the first callback
        // actually waits for synchronous expansion and browser work to finish.
        if (previous === null) firstFrameDelayMs = performance.now() - start;
        else frames.push(t - previous);
        previous = t; requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      testView.expand('root'); const synchronousMs = performance.now() - start;
      await new Promise(r => setTimeout(r, 600)); active = false;
      frames.sort((a, b) => a - b);
      return { synchronousMs, firstFrameDelayMs, frames: frames.length, medianFrameMs: frames[Math.floor(frames.length / 2)],
        p95FrameMs: frames[Math.floor(frames.length * .95)], maxFrameMs: frames.at(-1),
        slowFrames: frames.filter(t => t > 34).length };
    });
    rows.push({ browser: name, version: timingBrowser.version(), count, repeat, ...result });
  }
  await timingBrowser.close();
}
await writeFile(new URL('../reports/rendering.json', import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(),
  method: 'Desktop 1440×1000; three generic expansions per count/browser, each sampled over 600 ms in a fresh browser process after the separate screenshot/accessibility process has closed. Inter-frame intervals use consecutive rAF timestamps; firstFrameDelayMs separately measures wall time from expansion start to execution of the first callback, including setup. Callback timing does not establish display presentation time. Local headless hardware, not a device guarantee.', rows, violations, errors }, null, 2) + '\n');
console.table(rows); console.log(JSON.stringify({ violations: violations.filter(v => v.found.length), errors }, null, 2));
