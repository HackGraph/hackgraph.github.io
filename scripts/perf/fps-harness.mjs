import { chromium, firefox } from 'playwright';

const URL = process.env.URL ?? 'http://localhost:4199/';
const engine = process.env.BROWSER === 'firefox' ? firefox : chromium;
const browser = await engine.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.react-flow__node');
await page.waitForTimeout(1200);

// Expand EVERYTHING (worst case) — keep clicking Reveal chevrons until none remain.
for (let round = 0; round < 10; round++) {
  const btns = await page.locator('button[aria-label^="Reveal"]').all();
  if (btns.length === 0) break;
  for (const b of btns) await b.click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
}
const nodes = await page.locator('.react-flow__node').count();
const edges = await page.locator('.hg-edge-path').count();
await page.locator('.react-flow__controls-fitview').click();
await page.waitForTimeout(1000);
console.log(`graph: ${nodes} nodes, ${edges} edges`);

// Frame meter + long-task observer.
await page.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  const loop = (t) => {
    window.__frames.push(t - last);
    last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__long = 0;
  window.__longN = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__long += e.duration;
      window.__longN += 1;
    }
  }).observe({ entryTypes: ['longtask'] });
});

const resetMeter = () => page.evaluate(() => {
  window.__frames.length = 0;
  window.__long = 0;
  window.__longN = 0;
});
const readMeter = (label) =>
  page.evaluate((label) => {
    const f = window.__frames.slice();
    f.sort((a, b) => a - b);
    const sum = f.reduce((a, b) => a + b, 0);
    const p = (q) => f[Math.min(f.length - 1, Math.floor(f.length * q))] ?? 0;
    return {
      label,
      frames: f.length,
      avgMs: +(sum / f.length).toFixed(1),
      p50: +p(0.5).toFixed(1),
      p95: +p(0.95).toFixed(1),
      worst: +(f[f.length - 1] ?? 0).toFixed(1),
      over33ms: f.filter((x) => x > 33).length,
      longTaskMs: +window.__long.toFixed(0),
      longTasks: window.__longN,
    };
  }, label);

const results = [];

// ---- Scenario 1: drag PAN (user-like, continuous) ----
await resetMeter();
await page.mouse.move(700, 500);
await page.mouse.down();
for (let i = 0; i < 30; i++) await page.mouse.move(700 - i * 14, 500 + Math.sin(i / 4) * 60, { steps: 2 });
await page.mouse.up();
for (let i = 0; i < 30; i++) await page.mouse.move(280 + i * 14, 500, { steps: 2 });
results.push(await readMeter('drag-pan'));

// ---- Scenario 2: wheel ZOOM in/out over the canvas ----
await resetMeter();
await page.mouse.move(720, 450);
for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(35); }
for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(35); }
results.push(await readMeter('wheel-zoom'));

// ---- Scenario 3: programmatic camera (fitView glide + node-select pan) ----
await resetMeter();
await page.locator('.react-flow__controls-fitview').click();
await page.waitForTimeout(900);
await page.locator('.react-flow__node').first().click();
await page.waitForTimeout(900);
results.push(await readMeter('programmatic-move'));

// ---- Scenario 4: selection burst — camera pan + recede animations + panel, the
// combo interaction where "sluggish at times" lives ----
await page.locator('.react-flow__controls-fitview').click();
await page.waitForTimeout(900);
await resetMeter();
const cards = page.locator('.react-flow__node');
const count = Math.min(await cards.count(), 6);
for (let i = 1; i < count; i++) {
  await cards.nth(i).click({ force: true });
  await page.waitForTimeout(650);
}
results.push(await readMeter('selection-burst'));

// ---- Scenario 5: chevron expand/collapse burst (relayout + CSS glide + camera follow) ----
await resetMeter();
for (let i = 0; i < 4; i++) {
  const btn = page.locator('button[aria-label^="Collapse"], button[aria-label^="Reveal"]').last();
  await btn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(750);
}
results.push(await readMeter('expand-burst'));

console.table(results);
console.log('pageerrors:', errors.length);
await browser.close();
