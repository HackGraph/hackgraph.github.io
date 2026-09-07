import { test, expect } from '@playwright/test';

test('the staged public artifact loads without developer assets or broken runtime requests', async ({ page, request }) => {
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
  await page.goto('http://127.0.0.1:5183/');
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('.card .toggle').click();
  await expect(page.locator('.card')).toHaveCount(4);
  await page.getByRole('link', { name: 'Read', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('HackGraph Reference');
  await page.getByRole('link', { name: 'How to read the graph and assess its sources' }).click();
  await expect(page.getByRole('table', { name: 'Editorial evidence coverage' })).toBeVisible();
  expect(errors).toEqual([]); expect(failed).toEqual([]);
  const manifest = await (await request.get('http://127.0.0.1:5183/build-manifest.json')).json();
  expect(manifest.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.files.some(p => /(?:node_modules|browser\/|tools\/|reports\/|test|\.d\.ts|package-lock)/.test(p))).toBe(false);
  expect((await request.get('http://127.0.0.1:5183/package.json')).status()).toBe(404);
  expect((await request.get('http://127.0.0.1:5183/relationships.html')).status()).toBe(404);
});
