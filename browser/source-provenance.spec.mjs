import { test, expect } from '@playwright/test';
import { openApp, settle } from './helpers.mjs';

test('publication types reach the panel without turning a reading list into a reviewed claim', async ({ page }) => {
  await openApp(page);
  const urls = await page.evaluate(async () => {
    const { SOURCE_PROVENANCE } = await import('/src/data/source-provenance.js');
    const { toEngineMap } = await import('/src/graph/engineAdapter.js');
    const sources = ['primary', 'research', 'community', 'taxonomy', 'database'].map(kind => ({ label: `${kind} publication`, url: Object.entries(SOURCE_PROVENANCE).find(([, value]) => value === kind)[0] }));
    sources.push({ label: 'New publication', url: 'https://example.org/new-publication' });
    testView.destroy();
    const map = { id: 'provenance-course', name: 'Reading sources', rootId: 'reading',
      phases: [{ id: 'learn', label: 'Learn', color: '#608ac5' }],
      nodes: [{ id: 'reading', label: 'Reading list', phase: 'learn', summary: 'Sources for further reading.', references: sources }], edges: [] };
    window.testView = GraphView.mount('#root', { maps: [toEngineMap(map)], deepLink: false, storagePrefix: '', expandRoot: false });
    return sources.map(source => source.url);
  });
  await page.waitForFunction(() => testView?.map?.id === 'provenance-course');
  await settle(page);
  await page.evaluate(() => testView.select('reading'));
  await settle(page);
  const panel = page.locator('[data-el="panelbody"]');
  await expect(panel).toContainText('Review not recorded');
  await expect(panel).toContainText('Applicability has not been documented for this entry.');
  await expect(panel.locator('.claim-list')).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    if (width === 390) await expect(page.locator('.fg')).toHaveClass(/\bnarrow\b/);
    else await expect(page.locator('.fg')).not.toHaveClass(/\bnarrow\b/);
    await page.evaluate(() => testView.select('reading'));
    if (width === 390) await page.getByRole('button', { name: 'Expand details', exact: true }).click();
    await settle(page);
    const links = panel.locator('.refs > a');
    await expect(links.locator('.source-kind')).toHaveText(['primary source', 'research source', 'community source', 'taxonomy source', 'database source', 'Source type not classified']);
    expect(await links.evaluateAll(elements => elements.map(el => el.href))).toEqual(urls);
    for (let i = 0; i < urls.length; i++) {
      if (i === 0) await links.nth(i).focus();
      else await page.keyboard.press('Tab');
      await expect(links.nth(i)).toBeFocused();
      await expect(links.nth(i)).toBeVisible();
    }
    expect(await panel.evaluate(el => el.scrollWidth > el.clientWidth + 1)).toBe(false);
  }
});

test('known source types retain citation-destination notices in the reading panel', async ({ page }) => {
  await openApp(page);
  const titles = await page.evaluate(async () => {
    const { SOURCE_DESTINATIONS } = await import('/src/data/source-provenance.js');
    const { toEngineMap } = await import('/src/graph/engineAdapter.js');
    const references = Object.keys(SOURCE_DESTINATIONS).map((url, i) => ({ label: `Reading source ${i + 1}`, url }));
    testView.destroy();
    const map = { id: 'destination-course', name: 'Reading sources', rootId: 'reading',
      phases: [{ id: 'learn', label: 'Learn', color: '#608ac5' }],
      nodes: [{ id: 'reading', label: 'Reading list', phase: 'learn', summary: 'Inspect the cited publication.', references }], edges: [] };
    window.testView = GraphView.mount('#root', { maps: [toEngineMap(map)], deepLink: false, storagePrefix: '', expandRoot: false });
    return Object.values(SOURCE_DESTINATIONS).map(d => d.observedTitle);
  });
  await page.waitForFunction(() => testView?.map?.id === 'destination-course');
  await settle(page);
  const panel = page.locator('[data-el="panelbody"]');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    if (width === 390) await expect(page.locator('.fg')).toHaveClass(/\bnarrow\b/);
    else await expect(page.locator('.fg')).not.toHaveClass(/\bnarrow\b/);
    await page.evaluate(() => testView.select('reading'));
    if (width === 390) await page.getByRole('button', { name: 'Expand details', exact: true }).click();
    await settle(page);
    await expect(panel.getByText('Citation destination needs checking', { exact: true })).toHaveCount(titles.length);
    for (const title of titles) await expect(panel).toContainText(title);
    await expect(panel).toContainText('Review not recorded');
    await expect(panel.locator('.claim-list')).toHaveCount(0);
    const links = panel.locator('.refs > a');
    await expect(links).toHaveCount(titles.length);
    for (let i = 0; i < titles.length; i++) {
      if (i === 0) await links.nth(i).focus(); else await page.keyboard.press('Tab');
      await expect(links.nth(i)).toBeFocused();
    }
    expect(await panel.evaluate(el => el.scrollWidth > el.clientWidth + 1)).toBe(false);
  }
});
