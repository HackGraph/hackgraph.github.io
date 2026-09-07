import { test, expect } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('the narrow reading-guide table supports keyboard focus and scrolling without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5183/about.html');
  const region = page.getByRole('region', { name: 'Editorial evidence coverage', exact: true });
  for (let i = 0; i < 20 && !await region.evaluate(el => el === document.activeElement); i++) await page.keyboard.press('Tab');
  await expect(region).toBeFocused();
  const geometry = await region.evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth, outline: getComputedStyle(el).outlineStyle, outlineWidth: parseFloat(getComputedStyle(el).outlineWidth) }));
  expect(geometry.content).toBeGreaterThan(geometry.width);
  expect(geometry.outline).toBe('solid');
  expect(geometry.outlineWidth).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await expect(region).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(region).not.toBeFocused();
});

test('all complete map reading pages contain long prose and titles within a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const slug of ['active-directory', 'windows-privilege-escalation', 'linux-privilege-escalation']) {
    await page.goto(`http://127.0.0.1:5183/reference/${slug}.html`);
    // Poll from the runner: awaiting fonts.ready inside a JavaScript-disabled
    // Firefox page can stall even after all font faces report loaded.
    await expect.poll(() => page.evaluate(() => document.fonts.status === 'loaded'
      && [...document.fonts].every(font => font.status === 'loaded'))).toBe(true);
    const geometry = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth,
      proseOverflow: [...document.querySelectorAll('article p, article h3, article ul')].filter(el => el.scrollWidth > el.clientWidth + 1).length,
      codeFormats: [...document.querySelectorAll('pre')].map(el => ({ whiteSpace: getComputedStyle(el).whiteSpace, overflow: getComputedStyle(el).overflowX })) }));
    expect(geometry.content, slug).toBeLessThanOrEqual(geometry.width);
    expect(geometry.proseOverflow, slug).toBe(0);
    expect(geometry.codeFormats.length, slug).toBeGreaterThan(0);
    expect(geometry.codeFormats.every(style => style.whiteSpace === 'pre' && style.overflow === 'auto'), slug).toBe(true);
  }
});
