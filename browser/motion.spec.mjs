import { test, expect } from '@playwright/test';
import { openApp, mountCourse, settle } from './helpers.mjs';

test('interrupting a camera move applies only the requested wheel delta', async ({ page }) => {
  await openApp(page); await settle(page);
  await page.evaluate(() => testView.expand(testView.map.rootId));
  await page.waitForTimeout(120);
  const delta = await page.evaluate(() => {
    const world = document.querySelector('.fg-world');
    const before = new DOMMatrix(getComputedStyle(world).transform);
    document.querySelector('.fg-viewport').dispatchEvent(new WheelEvent('wheel', {
      deltaY: 1, clientX: 700, clientY: 400, bubbles: true, cancelable: true,
    }));
    const after = new DOMMatrix(getComputedStyle(world).transform);
    return { x: after.e - before.e, y: after.f - before.f };
  });
  expect(Math.abs(delta.x)).toBeLessThan(0.01);
  expect(delta.y).toBeCloseTo(-1, 2);
});

test('first expansion keeps its origin inside the desktop reading area', async ({ page }) => {
  await openApp(page); await settle(page);
  await page.locator('.card .toggle').click(); await settle(page);
  const bounds = await page.locator('.card.sel').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(31);
  expect(bounds.x + bounds.width).toBeLessThan(1440 - 396);
});

for (const narrow of [false, true]) test(`wide branches remain readable ${narrow ? 'on a narrow screen' : 'on desktop'}`, async ({ page }) => {
  if (narrow) await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page); await mountCourse(page, 100);
  await page.evaluate(() => testView.expand('root')); await settle(page);
  const scale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.fg-world')).transform).a);
  expect(scale).toBeGreaterThanOrEqual(0.9);
  await expect(page.locator('[data-el="choices"]')).toBeVisible();
  await expect(page.locator('.fg-choice')).toHaveCount(100);
  const box = await page.locator('.card[data-key="root"]').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  await page.evaluate(() => testView.fit()); await settle(page);
  await expect(page.locator('[data-el="overviewbar"]')).toBeVisible();
  await page.getByRole('button', { name: 'Return to reading' }).click(); await settle(page);
  const restored = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.fg-world')).transform).a);
  expect(restored).toBeGreaterThanOrEqual(0.9);
});

test('large entrances are bounded and perform no SVG geometry reads', async ({ page }) => {
  await openApp(page); await mountCourse(page, 100);
  const result = await page.evaluate(async () => {
    let reads = 0;
    const proto = SVGGeometryElement.prototype;
    for (const key of ['getTotalLength', 'getPointAtLength']) {
      const original = proto[key];
      proto[key] = function (...args) { reads++; return original.apply(this, args); };
    }
    testView.expand('root');
    // Entrance effects are created after the first visibility decision.
    await new Promise(resolve => requestAnimationFrame(resolve));
    const cardEntrances = document.getAnimations().filter(a => a.effect?.target?.classList.contains('card')
      && a.effect.getKeyframes().some(frame => frame.opacity === '0')).length;
    const longest = Math.max(...document.getAnimations().map(a => {
      const t = a.effect.getTiming(); return Number(t.delay) + Number(t.duration);
    }));
    // Allow a paint after the deadline; timers can run before an already-due
    // animation frame when a CI browser is briefly descheduled.
    await new Promise(r => setTimeout(r, 430));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { reads, longest, cardEntrances, active: document.querySelector('#root').classList.contains('animating'),
      culled: [...document.querySelectorAll('.card')].filter(el => el.style.visibility === 'hidden').length };
  });
  expect(result.reads).toBe(0);
  expect(result.longest).toBeLessThanOrEqual(400);
  expect(result.cardEntrances).toBeGreaterThan(0);
  expect(result.cardEntrances).toBeLessThan(30);
  expect(result.active).toBe(false);
  expect(result.culled).toBeGreaterThan(80);
});

test('zoom anchors correctly inside an offset embedded container', async ({ page }) => {
  await openApp(page); await mountCourse(page, 3);
  await page.evaluate(() => {
    document.querySelector('#root').style.cssText = 'position:absolute;inset:auto;left:120px;top:90px;width:900px;height:600px';
  });
  await page.waitForTimeout(60);
  const result = await page.evaluate(() => {
    const vp = document.querySelector('.fg-viewport'), rect = vp.getBoundingClientRect();
    const world = document.querySelector('.fg-world');
    const x = 360 - rect.left, y = 300 - rect.top;
    const before = new DOMMatrix(getComputedStyle(world).transform);
    vp.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -80, clientX: 360, clientY: 300, bubbles: true, cancelable: true }));
    const after = new DOMMatrix(getComputedStyle(world).transform);
    return { before: [(x - before.e) / before.a, (y - before.f) / before.a], after: [(x - after.e) / after.a, (y - after.f) / after.a] };
  });
  expect(result.after[0]).toBeCloseTo(result.before[0], 2);
  expect(result.after[1]).toBeCloseTo(result.before[1], 2);
});

test('a live reduced-motion preference settles animation promptly', async ({ page }) => {
  await openApp(page); await mountCourse(page, 25);
  await page.evaluate(() => testView.expand('root'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(70);
  await expect(page.locator('#root')).not.toHaveClass(/animating/);
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
});

test('touch pan and pinch preserve the intended screen-space movement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page); await mountCourse(page, 3);
  const result = await page.evaluate(() => {
    const vp = document.querySelector('.fg-viewport');
    const matrix = () => new DOMMatrix(getComputedStyle(document.querySelector('.fg-world')).transform);
    const send = (type, id, x, y) => vp.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true,
    }));
    const first = matrix();
    send('pointerdown', 1, 100, 400); send('pointermove', 1, 125, 415); send('pointerup', 1, 125, 415);
    const pan = matrix();
    send('pointerdown', 2, 100, 400); send('pointerdown', 3, 200, 400);
    send('pointermove', 2, 75, 400); send('pointermove', 3, 225, 400);
    const pinch = matrix(); send('pointerup', 2, 75, 400);
    send('pointermove', 3, 235, 415); const resumed = matrix(); send('pointerup', 3, 235, 415);
    return { pan: [pan.e - first.e, pan.f - first.f], ratio: pinch.a / pan.a,
      resumedPan: [resumed.e - pinch.e, resumed.f - pinch.f],
      anchorDelta: [(150 - pinch.e) / pinch.a - (150 - pan.e) / pan.a,
        (400 - pinch.f) / pinch.a - (400 - pan.f) / pan.a] };
  });
  expect(result.pan).toEqual([25, 15]); expect(result.ratio).toBeCloseTo(1.5, 3);
  expect(result.resumedPan).toEqual([10, 15]);
  expect(result.anchorDelta[0]).toBeCloseTo(0, 3); expect(result.anchorDelta[1]).toBeCloseTo(0, 3);
});
