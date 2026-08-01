import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'http://localhost:5175/';
const OUT = '/tmp/fg-verify';
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(...a);
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

const nodeCount = () => page.locator('.react-flow__node').count();
const accentEdgeCount = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.hg-edge-path')].filter((p) => {
      const s = getComputedStyle(p).stroke;
      return s === 'rgb(240, 68, 80)';
    }).length,
  );

// ---- 1. Load ----
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.react-flow__node', { timeout: 10000 });
await page.waitForTimeout(1200); // fonts + first-paint reveal
const n0 = await nodeCount();
await page.screenshot({ path: `${OUT}/1-initial.png` });
log(`STEP1 initial nodes=${n0}`);

// ---- 2. Expand the root via its chevron ----
const revealBtn = page.locator('button[aria-label^="Reveal"]').first();
await revealBtn.click();
await page.waitForTimeout(1200); // layout + entrance animation
const n1 = await nodeCount();
const e1 = await page.locator('.hg-edge-path').count();
await page.screenshot({ path: `${OUT}/2-expanded.png` });
log(`STEP2 after-expand nodes=${n1} edges=${e1}`);

// ---- 3. Hover a node (before selecting anything): trace-on-hover ----
// Real mouse movement arms hover (pointermove), then hover the LAST node card.
const nodes = page.locator('.react-flow__node');
const last = nodes.last();
await page.mouse.move(10, 10);
await page.mouse.move(200, 200);
const before = await accentEdgeCount();
await last.hover();
await page.waitForTimeout(500); // stroke transition 0.2s
const after = await accentEdgeCount();
await page.screenshot({ path: `${OUT}/3-hover.png` });
log(`STEP3 hover accent-edges before=${before} after=${after}`);

// ---- 4. Click a node BODY -> selection + detail panel ----
const targetCard = nodes.nth(1);
const targetLabel = (await targetCard.innerText()).split('\n')[1] ?? (await targetCard.innerText()).split('\n')[0];
await targetCard.click({ position: { x: 60, y: 40 } });
await page.waitForTimeout(900);
const asideVisible = await page.locator('aside').first().isVisible().catch(() => false);
const asideText = asideVisible ? await page.locator('aside').first().innerText() : '';
await page.screenshot({ path: `${OUT}/4-selected-panel.png` });
log(`STEP4 clicked-card-label=${JSON.stringify(targetLabel)} panelVisible=${asideVisible} panelHasLabel=${asideText.includes(targetLabel)}`);

// ---- 5. Select-on-expand: with a node selected, click ANOTHER node's chevron ----
// Find a collapsed node (chevron labelled "Reveal…") that is NOT the selected one.
const reveals = page.locator('button[aria-label^="Reveal"]');
const rCount = await reveals.count();
let moved = false, otherLabel = '';
if (rCount > 0) {
  const btn = reveals.first();
  const card = btn.locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " react-flow__node ")]');
  otherLabel = (await card.innerText()).split('\n').filter(Boolean)[1] ?? '';
  const nBefore = await nodeCount();
  await btn.click();
  await page.waitForTimeout(1200);
  const nAfter = await nodeCount();
  const asideText2 = await page.locator('aside').first().innerText().catch(() => '');
  moved = otherLabel !== '' && asideText2.includes(otherLabel);
  log(`STEP5 other-label=${JSON.stringify(otherLabel)} nodes ${nBefore}->${nAfter} selectionMoved=${moved}`);
  await page.screenshot({ path: `${OUT}/5-select-on-expand.png` });
} else {
  log('STEP5 no collapsed chevron found to test');
}

// ---- 6. PROBE: rapid-fire chevron toggling + background deselect ----
const anyToggle = page.locator('button[aria-label^="Collapse"], button[aria-label^="Reveal"]').first();
for (let i = 0; i < 6; i++) {
  await anyToggle.click({ force: true });
  await page.waitForTimeout(80);
}
await page.waitForTimeout(900);
await page.mouse.click(720, 850); // background pane click -> deselect
await page.waitForTimeout(700);
const n2 = await nodeCount();
await page.screenshot({ path: `${OUT}/6-after-spam.png` });
log(`STEP6 rapid-toggle+deselect nodes=${n2}`);

// ---- 7. PROBE: URL hash written (debounced deep link) ----
await page.waitForTimeout(500);
const hash = await page.evaluate(() => window.location.hash);
log(`STEP7 hash=${hash.slice(0, 40)}... (len=${hash.length})`);

log(`CONSOLE_ERRORS=${errors.length}`);
errors.forEach((e) => log('  ' + e));
await browser.close();
