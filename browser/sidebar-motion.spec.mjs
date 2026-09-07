import { test, expect } from '@playwright/test';
import { openApp, mountCourse, settle } from './helpers.mjs';

async function openWrappedList(page) {
  await openApp(page); await mountCourse(page, 12);
  await page.evaluate(() => {
    const map = testView.map;
    testView.destroy();
    for (const node of map.nodes.slice(1)) {
      node.label += ': compare the shapes and explain the relationships between the examples';
    }
    window.testView = GraphView.mount('#root', { maps: [map], deepLink: false, storagePrefix: '', expandRoot: false });
  });
  await page.waitForFunction(() => testView.map?.id === 'course');
  await page.evaluate(() => testView.select('root')); await settle(page);
  await page.locator('.pnextbtn').click(); await settle(page);
}

async function fittedHeight(page) {
  await expect.poll(() => page.evaluate(() => {
    const outer = document.querySelector('.pnextlist').getBoundingClientRect().height;
    const inner = document.querySelector('.pnextinner').getBoundingClientRect().height;
    return Math.abs(outer - inner);
  })).toBeLessThanOrEqual(1);
  return page.locator('.pnextlist').evaluate(el => el.getBoundingClientRect().height);
}

test('sidebar rows retain their natural height throughout motion and interruption', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openApp(page); await mountCourse(page, 250);
  await page.evaluate(() => testView.expand('root')); await settle(page);
  const result = await page.evaluate(async () => {
    const button = document.querySelector('.pnextbtn'), list = document.querySelector('.pnextlist');
    const inner = document.querySelector('.pnextinner');
    const size = () => ({ outer: list.getBoundingClientRect().height, inner: inner.getBoundingClientRect().height });
    const motion = () => list.getAnimations().find(a => ['height', 'grid-template-rows'].includes(a.transitionProperty));
    button.click();
    const opening = motion();
    if (!opening) return { missingOpeningMotion: true };
    opening.pause(); await opening.ready;
    const duration = opening.effect.getTiming().duration;
    const frames = [];
    for (const fraction of [0, .25, .5, .75, 1]) {
      opening.currentTime = duration * fraction;
      frames.push(size());
    }
    opening.finish();
    button.click();
    const closing = motion();
    if (!closing) return { missingClosingMotion: true };
    closing.pause(); await closing.ready;
    closing.currentTime = closing.effect.getTiming().duration * .25;
    const before = size();
    button.click();
    const after = size();
    for (const animation of list.getAnimations()) animation.finish();
    return { duration, frames, before, after, final: size() };
  });
  expect(result.missingOpeningMotion).toBeUndefined();
  expect(result.missingClosingMotion).toBeUndefined();
  expect(result.duration).toBe(220);
  expect(result.frames[0].outer).toBeLessThanOrEqual(1);
  expect(result.frames.at(-1).outer).toBeGreaterThan(1000);
  expect(new Set(result.frames.map(f => Math.round(f.outer))).size).toBe(5);
  expect(Math.max(...result.frames.map(f => f.inner)) - Math.min(...result.frames.map(f => f.inner))).toBeLessThanOrEqual(1);
  expect(Math.abs(result.before.outer - result.after.outer)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.final.outer - result.final.inner)).toBeLessThanOrEqual(1);
  await expect(page.locator('.pnextinner')).toHaveJSProperty('inert', false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.pnextbtn').click(); await settle(page);
  expect(await page.locator('.pnextlist').evaluate(el => el.getBoundingClientRect().height)).toBe(0);
  await expect(page.locator('.pnextinner')).toHaveJSProperty('inert', true);
});

test('the opened list follows wrapping and later text-size changes', async ({ page }) => {
  await openWrappedList(page);
  const wide = await fittedHeight(page);
  await page.setViewportSize({ width: 320, height: 844 });
  const expand = page.getByRole('button', { name: 'Expand details', exact: true });
  await expect(expand).toBeVisible(); await expand.click(); await settle(page);
  const narrow = await fittedHeight(page);
  expect(narrow).toBeGreaterThan(wide + 20);
  await page.addStyleTag({ content: '.pnextitem .plabel { font-size: 20px; }' });
  await expect.poll(() => page.locator('.pnextlist').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(narrow + 20);
  await fittedHeight(page);
  await page.locator('.pnextitem').last().click(); await settle(page);
  expect(await page.evaluate(() => testView.selection)).toBe('topic-11');
});

test('disclosure remains responsive when ResizeObserver is unavailable', async ({ page }) => {
  await page.addInitScript(() => { window.ResizeObserver = undefined; });
  await openWrappedList(page);
  const before = await fittedHeight(page);
  await page.locator('.fg-panel').evaluate(el => { el.style.width = '280px'; });
  const after = await fittedHeight(page);
  expect(after).toBeGreaterThan(before + 20);
  await page.locator('.pnextbtn').click(); await settle(page);
  expect(await page.locator('.pnextlist').evaluate(el => el.getBoundingClientRect().height)).toBe(0);
  await page.locator('.pnextbtn').click(); await settle(page);
  await page.locator('.pnextitem').last().click(); await settle(page);
  expect(await page.evaluate(() => testView.selection)).toBe('topic-11');
});

test('panel resizing observers are released on close, replacement, map change and destroy', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.ResizeObserver;
    window.activeResizeObservers = new Set();
    window.ResizeObserver = class extends Native {
      targets = new Set();
      observe(target, options) { super.observe(target, options); this.targets.add(target); activeResizeObservers.add(this); }
      unobserve(target) { super.unobserve(target); this.targets.delete(target); }
      disconnect() { super.disconnect(); this.targets.clear(); activeResizeObservers.delete(this); }
    };
  });
  await openApp(page); await mountCourse(page, 3);
  const observedLists = () => page.evaluate(() => [...activeResizeObservers].flatMap(o => [...o.targets])
    .filter(el => el.classList.contains('pnextinner')).length);
  for (const action of ['close', 'node', 'connection', 'map', 'destroy']) {
    await page.evaluate(() => testView.select('root')); await settle(page);
    await page.locator('.pnextbtn').click(); await settle(page);
    expect(await observedLists()).toBe(1);
    if (action === 'close') await page.getByRole('button', { name: 'Close details', exact: true }).click();
    if (action === 'node') await page.locator('.pnextitem').first().click();
    if (action === 'connection') await page.locator('.prelationship').first().click();
    if (action === 'map') await page.evaluate(() => testView.setMap('course'));
    if (action === 'destroy') await page.evaluate(() => testView.destroy());
    await settle(page);
    expect(await observedLists()).toBe(0);
  }
  expect(await page.evaluate(() => [...activeResizeObservers].reduce((n, o) => n + o.targets.size, 0))).toBe(0);
});
