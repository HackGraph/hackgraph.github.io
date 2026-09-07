import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { openApp, mountCourse, settle } from './helpers.mjs';
const require = createRequire(import.meta.url);

test('shared definition evidence is keyboard accessible and separate from connection evidence', async ({ page }) => {
  await openApp(page); await mountCourse(page, 3);
  await page.evaluate(() => {
    const map = testView.map;
    testView.destroy();
    map.relationships.topic.details = {
      definitions: [{ id: 'course', label: 'course', description: 'A collection of lessons.',
        review: { label: 'AI source comparison', detail: 'Example reviewer · Shared definition only.', scope: 'Terminology only.' },
        refs: [['Course handbook', 'https://example.org/handbook', 'primary', 'Terminology']] }],
      editorialTitle: 'Connection evidence', editorial: [{ label: 'Review not recorded', text: 'This connection has no recorded claim review.' }],
    };
    window.testView = GraphView.mount('#root', { maps: [map], deepLink: false, storagePrefix: '', expandRoot: false });
  });
  await page.waitForFunction(() => window.testView?.map?.id === 'course');
  await settle(page);
  await page.evaluate(() => testView.select('root'));
  await settle(page);
  await page.getByRole('button', { name: 'Explore connected topics' }).click();
  await page.getByRole('button', { name: 'Connection to Topic 1', exact: true }).click();
  const definition = page.getByRole('region', { name: 'Shared definition: course' });
  await expect(definition).toContainText('A collection of lessons.');
  await expect(page.getByRole('heading', { name: 'Connection evidence', exact: true })).toBeVisible();
  await expect(page.locator('[data-el="panelbody"]')).toContainText('This connection has no recorded claim review.');
  const disclosure = definition.locator('summary');
  await disclosure.focus(); await page.keyboard.press('Enter');
  await expect(definition.getByRole('link', { name: /Course handbook/ })).toBeVisible();
  await expect(definition).toContainText('Terminology only.');
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => testView.setTheme(theme), theme); await settle(page);
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    expect(violations).toEqual([]);
  }
});
