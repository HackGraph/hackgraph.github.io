import { test, expect } from '@playwright/test';
import { mountDenseCourse, settle } from './helpers.mjs';

test('crowded captions stay separate from other captions and cards', async ({ page }) => {
  await mountDenseCourse(page);
  const result = await page.evaluate(() => {
    const visible = el => getComputedStyle(el).visibility !== 'hidden';
    const labels = [...document.querySelectorAll('.elabel')].filter(visible).map(el => el.getBoundingClientRect());
    const cards = [...document.querySelectorAll('.card')].map(el => el.getBoundingClientRect());
    const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > .1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .1;
    return { shown: labels.length, total: document.querySelectorAll('.elabel').length,
      collisions: labels.reduce((n, a, i) => n + labels.slice(i + 1).filter(b => overlap(a, b)).length, 0),
      coveredCards: labels.reduce((n, a) => n + cards.filter(b => overlap(a, b)).length, 0) };
  });
  expect(result.total).toBe(27);
  expect(result.shown).toBeGreaterThan(0);
  expect(result.shown).toBeLessThan(result.total);
  expect(result.collisions).toBe(0); expect(result.coveredCards).toBe(0);
  await page.getByRole('button', { name: 'Explore connected topics', exact: false }).click();
  await expect(page.getByRole('button', { name: /^Connection to Course topic/ })).toHaveCount(5);
});

test('a crowded caption yields to the connection being inspected without layout reads during motion', async ({ page }) => {
  await mountDenseCourse(page);
  const edge = await page.evaluate(() => [...document.querySelectorAll('.elabel')].find(el => {
    const r = el.getBoundingClientRect();
    return getComputedStyle(el).visibility === 'hidden' && r.top > 80 && r.bottom < innerHeight - 70;
  })?.dataset.edge);
  expect(edge).toBeTruthy();
  await page.mouse.move(900, 800); await page.mouse.move(905, 805);
  await page.locator('.edgehit').evaluateAll((hits, id) => {
    hits.find(el => el.dataset.edge === id).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }, edge);
  await settle(page);
  const shown = await page.locator('.elabel').evaluateAll((labels, id) => getComputedStyle(labels.find(el => el.dataset.edge === id)).visibility, edge);
  expect(shown).toBe('visible');
  const reads = await page.evaluate(async () => {
    let reads = 0;
    const prototype = HTMLElement.prototype;
    const original = Object.fromEntries(['offsetWidth', 'offsetHeight'].map(key => [key, Object.getOwnPropertyDescriptor(prototype, key)]));
    for (const [key, descriptor] of Object.entries(original)) Object.defineProperty(prototype, key, {
      configurable: true, get() { if (this.classList?.contains('elabel')) reads++; return descriptor.get.call(this); },
    });
    try { testView.fit(); await new Promise(resolve => setTimeout(resolve, 450)); return reads; }
    finally { for (const [key, descriptor] of Object.entries(original)) Object.defineProperty(prototype, key, descriptor); }
  });
  expect(reads).toBe(0);
});

test('captions first expanded while hidden become readable when their preference is enabled', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('edge-labels', '0'));
  await mountDenseCourse(page);
  await expect(page.locator('#root')).toHaveClass(/hidelabels/);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Edge labels' }).click();
  await settle(page);
  await expect(page.locator('#root')).not.toHaveClass(/hidelabels/);
  expect(await page.locator('.elabel').evaluateAll(labels => labels.filter(el => getComputedStyle(el).visibility !== 'hidden').length)).toBeGreaterThan(0);
});
