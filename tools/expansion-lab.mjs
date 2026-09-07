// Run against `npm run dev`. Optionally compare an earlier renderer with
// --baseline /path/to/view.js. Performance observations are not CI thresholds.
import { chromium, firefox } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, mountCourse, settle } from '../browser/helpers.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
let baselinePath = null, reportPath = resolve(root, 'reports/expansion-setup.json');
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (!['--baseline', '--report'].includes(flag) || !args[i + 1] || args[i + 1].startsWith('--')) {
    throw new Error('Usage: node tools/expansion-lab.mjs [--baseline view.js] [--report output.json]');
  }
  const value = resolve(args[++i]);
  if (flag === '--baseline') baselinePath = value; else reportPath = value;
}
const current = await readFile(resolve(root, 'engine/view.js'), 'utf8');
const variants = baselinePath ? [['before', await readFile(baselinePath, 'utf8')], ['after', current]] : [['current', current]];
const rows = [], errors = [];
for (const [name, launcher] of [['chromium', chromium], ['firefox', firefox]]) {
  const browser = await launcher.launch();
  try {
    for (const [variant, source] of variants) {
      const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
      page.on('pageerror', error => errors.push({ browser: name, variant, error: error.message }));
      await page.route('**/engine/view.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: source }));
      await openApp(page);
      for (const count of [25, 100, 250]) for (let repeat = 0; repeat < 4; repeat++) {
        await mountCourse(page, count);
        const sample = await page.evaluate(async () => {
          const intervals = []; let previous = null, firstFrameDelayMs = null, active = true;
          const start = performance.now();
          const tick = time => {
            if (!active) return;
            if (previous === null) firstFrameDelayMs = performance.now() - start;
            else intervals.push(time - previous);
            previous = time; requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          testView.expand('root'); const synchronousMs = performance.now() - start;
          await new Promise(resolve => setTimeout(resolve, 600)); active = false;
          intervals.sort((a, b) => a - b);
          return { synchronousMs, firstFrameDelayMs, frames: intervals.length,
            p95FrameMs: intervals[Math.floor(intervals.length * .95)], maxFrameMs: intervals.at(-1),
            slowFrames: intervals.filter(time => time > 34).length };
        });
        await settle(page);
        rows.push({ browser: name, version: browser.version(), variant, count, repeat, ...sample });
      }
      await page.close();
    }
  } finally { await browser.close(); }
}
const groups = [];
for (const browser of ['chromium', 'firefox']) for (const count of [25, 100, 250]) for (const [variant] of variants) {
  const samples = rows.filter(row => row.browser === browser && row.count === count && row.variant === variant && row.repeat > 0);
  const stats = field => {
    const values = samples.map(row => row[field]).sort((a, b) => a - b);
    return { min: values[0], median: values[Math.floor(values.length / 2)], max: values.at(-1) };
  };
  groups.push({ browser, count, variant, sync: stats('synchronousMs'), firstFrame: stats('firstFrameDelayMs'),
    p95: stats('p95FrameMs'), slowFrames: samples.reduce((sum, row) => sum + row.slowFrames, 0) });
}
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify({ measuredAt: new Date().toISOString(),
  method: 'One browser page active at a time. Each source variant has four repetitions per count/browser; the first is retained as warmup and excluded from grouped statistics. Generic 25/100/250-child expansions at 1440×1000, 600 ms each. Inter-frame intervals use consecutive rAF timestamps; firstFrameDelayMs measures wall time to the first callback, including setup. Neither measures physical presentation time. Local headless observations, not device guarantees.',
  rendererSources: Object.fromEntries(variants.map(([name, source]) => [name, createHash('sha256').update(source).digest('hex')])),
  groups, rows, errors,
}, null, 2) + '\n');
console.log(JSON.stringify({ groups, errors }, null, 2));
if (errors.length) process.exitCode = 1;
