import { test, expect } from '@playwright/test';
import { mountExpansionCourse, settle } from './helpers.mjs';

async function centers(page) {
  return page.locator('.card:not(.exit)').evaluateAll(cards => {
    const world = document.querySelector('.fg-world'), matrix = new DOMMatrix(getComputedStyle(world).transform);
    const origin = document.querySelector('.fg-viewport').getBoundingClientRect();
    return Object.fromEntries(cards.map(el => {
      const r = el.getBoundingClientRect();
      return [el.dataset.key, { x: (r.x - origin.x - matrix.e) / matrix.a,
        y: ((r.top + r.bottom) / 2 - origin.y - matrix.f) / matrix.a }];
    }));
  });
}

for (const width of [1440, 390]) test(`a wide expansion preserves existing card positions at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await mountExpansionCourse(page);
  for (const id of ['root', 'a']) { await page.evaluate(id => testView.expand(id), id); await settle(page); }
  const before = await centers(page);
  await page.evaluate(() => testView.expand('b')); await settle(page);
  const after = await centers(page);
  for (const key of Object.keys(before)) {
    expect(Math.abs((after[key].y - after.b.y) - (before[key].y - before.b.y)), key).toBeLessThan(1);
    expect(Math.abs(after[key].x - before[key].x), key).toBeLessThan(1);
  }
  await expect(page.locator('.fg-choice')).toHaveCount(100);
  await expect(page.locator('[data-el="choices"]')).toBeVisible();
});

test('closing a large neighboring branch removes the empty space it occupied', async ({ page }) => {
  await mountExpansionCourse(page);
  for (const id of ['root', 'b', 'a']) { await page.evaluate(id => testView.expand(id), id); await settle(page); }
  await page.evaluate(() => testView.collapse('b')); await settle(page);
  const positions = Object.values(await centers(page));
  expect(positions).toHaveLength(8);
  expect(Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y))).toBeLessThan(1000);
  await expect(page.locator('[data-el="choices"]')).toBeHidden();
});

test('another expansion during motion starts from the displayed card positions', async ({ page }) => {
  await mountExpansionCourse(page, 25);
  await page.evaluate(() => testView.expand('root')); await settle(page);
  const jump = await page.evaluate(async () => {
    testView.expand('b');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const card = document.querySelector('.card[data-key="a"]');
    const before = card.getBoundingClientRect();
    testView.expand('a');
    const after = card.getBoundingClientRect();
    return Math.hypot(after.x - before.x, after.y - before.y);
  });
  expect(jump).toBeLessThan(1);
  await settle(page);
  const positions = Object.values(await centers(page));
  expect(positions).toHaveLength(33);
  expect(positions.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
});
