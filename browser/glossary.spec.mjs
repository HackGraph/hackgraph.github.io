import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { openApp, settle } from './helpers.mjs';
import { GLOSSARY } from '../src/data/glossary.js';
const require = createRequire(import.meta.url);

test('mobile glossary popovers distinguish related terms and disclose the comparison status', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await page.evaluate(() => testView.select('network-recon')); await settle(page);
  await page.evaluate(async () => {
    const { decorateProse } = await import('/src/data/domain/engineProse.js');
    const prose = document.createElement('p');
    const text = 'Compare LDAP and LDAPS, then read the NetNTLM definition.';
    prose.textContent = text;
    document.querySelector('[data-el="panelbody"]').replaceChildren(prose);
    decorateProse(prose, text);
  });
  await page.getByRole('button', { name: 'Expand details', exact: true }).click();
  const pop = page.locator('.hg-glossary-popover');
  await page.getByRole('button', { name: 'Define LDAP', exact: true }).click();
  await expect(pop).toHaveAccessibleName('LDAP definition');
  await expect(pop).toContainText('AI source comparison · 2026-09-06');
  await expect(pop.getByRole('link', { name: 'RFC 4511: LDAP', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Define LDAP', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Define LDAPS', exact: true }).click();
  await expect(pop).toHaveAccessibleName('LDAPS definition');
  await expect(pop).toContainText('LDAP over TLS:');
  const box = await pop.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(844);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Define NetNTLM', exact: true }).click();
  await expect(pop).toContainText('AI source comparison');
  await pop.getByRole('link', { name: 'Definition sources and review details' }).click();
  await expect(page).toHaveURL(/glossary.html#term-netntlm$/);
  await expect(page.locator('#term-netntlm')).toContainText('AI source comparison');
});

test('the staged glossary works without JavaScript and passes desktop and mobile accessibility checks', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noScript = await context.newPage();
  await noScript.goto('http://127.0.0.1:5183/glossary.html');
  await expect(noScript.getByRole('heading', { level: 1 })).toHaveText('Security glossary');
  await expect(noScript.locator('article')).toHaveCount(GLOSSARY.length);
  await context.close();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5183/glossary.html');
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.close();
});
