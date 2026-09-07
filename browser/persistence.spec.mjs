import { test, expect } from '@playwright/test';
import { openApp } from './helpers.mjs';

test('theme and searchable notes survive a cold reload', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    testView.setTheme('light');
    localStorage.setItem('hg:ad:notes', JSON.stringify({ 'network-recon': 'revieworchid731' }));
  });
  await page.reload();
  await page.waitForFunction(() => window.testView?.map);
  await expect(page.locator('#root')).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-el="search"]').fill('revieworchid731');
  await expect(page.locator('.result')).toHaveCount(1);
});

test('legacy theme storage remains readable', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('hg:theme', 'light'));
  await page.reload();
  await expect(page.locator('#root')).toHaveAttribute('data-theme', 'light');
});
