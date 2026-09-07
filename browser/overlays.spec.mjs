import { test, expect } from '@playwright/test';
import { openApp, mountCourse, settle } from './helpers.mjs';

async function cardObstructions(page) {
  return page.evaluate(() => {
    const card = document.activeElement.closest('.card').getBoundingClientRect();
    return ['bar', 'zoom', 'viewactions', 'choices', 'panel', 'help', 'settings'].flatMap(name => {
      const element = document.querySelector(`[data-el="${name}"]`);
      if (element.hidden || getComputedStyle(element).display === 'none') return [];
      const other = element.getBoundingClientRect();
      const width = Math.min(card.right, other.right) - Math.max(card.left, other.left);
      const height = Math.min(card.bottom, other.bottom) - Math.max(card.top, other.top);
      return width > 1 && height > 1 ? [name] : [];
    });
  });
}

for (const [width, height] of [[1024, 768], [844, 390]]) test(`branch choices leave the expansion origin readable at ${width} × ${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  await openApp(page); await mountCourse(page, 100);
  await page.locator('.card[data-key="root"]').focus();
  await page.keyboard.press('Space'); await settle(page);
  await expect(page.locator('[data-el="choices"]')).toBeVisible();
  expect(await cardObstructions(page)).toEqual([]);
  const first = await page.locator('.fg-choice').first().boundingBox();
  const list = await page.locator('[data-el="choicesbody"]').boundingBox();
  expect(first.height).toBeGreaterThanOrEqual(44);
  expect(list.height).toBeGreaterThanOrEqual(first.height);
  await page.locator('.fg-choice').first().click(); await settle(page);
  await expect(page.locator('.card[data-key="topic-0"]')).toBeFocused();
  expect(await cardObstructions(page)).toEqual([]);
});

for (const [width, height] of [[390, 844], [1280, 720]]) test(`keyboard return to the graph dismisses Help and Settings at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  await openApp(page); await mountCourse(page, 100);
  await page.locator('.card[data-key="root"]').focus();
  await page.keyboard.press('ArrowRight'); await settle(page);
  for (const [button, panel] of [['helpbtn', 'help'], ['gear', 'settings']]) {
    await page.locator(`[data-el="${button}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(`[data-el="${panel}"]`)).toBeVisible();
    // Follow the real reverse tab order, including any toggle in the card.
    for (let step = 0; step < 30; step++) {
      await page.keyboard.press('Shift+Tab');
      if (await page.evaluate(() => !!document.activeElement.closest('.card'))) break;
    }
    expect(await page.evaluate(() => !!document.activeElement.closest('.card'))).toBe(true);
    await expect(page.locator(`[data-el="${panel}"]`)).toBeHidden();
    await expect(page.locator(`[data-el="${button}"]`)).toHaveAttribute('aria-expanded', 'false');
    expect(await cardObstructions(page)).toEqual([]);
  }
});

test('an open topic list adapts to viewport changes without rebuilding its focused choices', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openApp(page); await mountCourse(page, 100);
  await page.locator('.card[data-key="root"]').focus();
  await page.keyboard.press('Space'); await settle(page);
  const choice = page.locator('.fg-choice').nth(8);
  await choice.focus();
  await choice.evaluate(element => { window.originalChoice = element; });
  for (const [width, height] of [[390, 844], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    if (width <= 920) await expect(page.locator('.fg')).toHaveClass(/\bnarrow\b/);
    else await expect(page.locator('.fg')).not.toHaveClass(/\bnarrow\b/);
    await settle(page);
    await expect(choice).toBeFocused();
    expect(await choice.evaluate(element => element === window.originalChoice)).toBe(true);
    const list = await page.locator('[data-el="choices"]').boundingBox();
    const card = await page.locator('.card[data-key="root"]').boundingBox();
    expect(list.width).toBeGreaterThanOrEqual(300);
    expect(list.x).toBeGreaterThanOrEqual(0);
    expect(list.x + list.width).toBeLessThanOrEqual(width);
    expect(card.y + card.height + 8).toBeLessThanOrEqual(list.y);
    expect(await page.locator('[data-el="choicesbody"]').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    const body = await page.locator('[data-el="choicesbody"]').boundingBox();
    const focused = await choice.boundingBox();
    expect(focused.y).toBeGreaterThanOrEqual(body.y - 1);
    expect(focused.y + focused.height).toBeLessThanOrEqual(body.y + body.height + 1);
  }
});
