import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { openApp, mountCourse, settle } from './helpers.mjs';
const require = createRequire(import.meta.url);

test('orientation and reading view are discoverable', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('See how security concepts connect.');
  await expect(page.locator('[data-el="readinglink"]')).toHaveAttribute('href', /reference.html$/);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open the reading view' })).toBeVisible();
  await page.locator('.card .toggle').click();
  await expect(page.locator('[data-el="welcome"]')).toBeHidden();
});

test('keyboard users can expand, move to a leaf, read, and return', async ({ page }) => {
  await openApp(page); await mountCourse(page, 3);
  const root = page.locator('.card[data-key="root"]');
  await root.focus(); await page.keyboard.press('ArrowRight'); await settle(page);
  await expect(page.locator('.card[data-key="topic-0"]')).toBeFocused();
  await page.keyboard.press('ArrowDown'); await settle(page);
  await expect(page.locator('.card[data-key="topic-1"]')).toBeFocused();
  await page.keyboard.press('Enter'); await settle(page);
  await expect(page.locator('[data-el="panelhead"] h2')).toBeFocused();
  await expect(page.locator('.applicability')).toHaveText('An example teaching context.');
  await page.keyboard.press('Escape'); await settle(page);
  await expect(page.locator('.card[data-key="topic-1"]')).toBeFocused();
});

test('search exposes aliases, active options, and an empty result message', async ({ page }) => {
  await openApp(page); await mountCourse(page, 3);
  const search = page.getByRole('combobox', { name: 'Search topics' });
  await search.fill('First lesson');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  await search.fill('not-a-course-topic');
  await expect(page.locator('[data-el="emptyresults"]')).toBeVisible();
  await expect(search).toHaveAttribute('aria-expanded', 'false');
});

test('relationship explanations can be reached without clicking graph edges', async ({ page }) => {
  await openApp(page); await mountCourse(page, 3);
  await page.evaluate(() => testView.select('root')); await settle(page);
  await page.getByRole('button', { name: 'Explore connected topics' }).click();
  await page.getByRole('button', { name: 'Connection to Topic 1', exact: true }).click();
  await expect(page.locator('[data-el="panelbody"]')).toContainText('Part of this course.');
});

for (const width of [1440, 390]) test(`topic disclosure retains contrast through its states at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await openApp(page); await mountCourse(page, 250);
  await page.evaluate(() => testView.select('root')); await settle(page);
  const expand = page.getByRole('button', { name: 'Expand details', exact: true });
  if (await expand.isVisible()) { await expand.click(); await settle(page); }
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const disclosure = page.locator('.pnextbtn');
  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => testView.setTheme(theme), theme); await settle(page);
    for (const expanded of [false, true]) {
      if ((await disclosure.getAttribute('aria-expanded') === 'true') !== expanded) await disclosure.click();
      for (const hover of [false, true]) {
        if (hover) await disclosure.hover(); else await page.mouse.move(5, 5);
        await settle(page);
        const violations = await page.evaluate(async () => (await axe.run('.pnextbtn', {
          runOnly: { type: 'rule', values: ['color-contrast'] },
        })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
        expect(violations, `${theme}, expanded=${expanded}, hover=${hover}`).toEqual([]);
      }
    }
  }
});

test('glossary definitions are keyboard accessible and escape returns focus', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => testView.select('network-recon')); await settle(page);
  const term = page.locator('.hg-gloss').first();
  await term.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.hg-glossary-popover')).toBeVisible();
  await expect(page.locator('.hg-glossary-popover')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(term).toBeFocused();
});

test('expanded desktop and narrow reading states have no WCAG axe violations', async ({ page }) => {
  await openApp(page); await mountCourse(page, 25);
  await page.evaluate(() => testView.expand('root')); await settle(page);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluate(() => testView.reset()); await settle(page);
    await page.evaluate(() => testView.expand('root')); await settle(page);
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })));
    expect(violations).toEqual([]);
  }
});

test('real detail panels retain accessible contrast in both themes', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => testView.select('network-recon')); await settle(page);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => testView.setTheme(theme), theme); await settle(page);
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    expect(violations).toEqual([]);
  }
});

test('wrapped panel breadcrumbs keep usable targets at desktop and mobile widths', async ({ page }) => {
  await openApp(page); await mountCourse(page, 6);
  await page.evaluate(() => {
    const map = testView.map;
    testView.destroy();
    map.nodes.forEach((node, i) => { node.label = `Learning foundations chapter ${i + 1}`; });
    map.edges = map.nodes.slice(1).map((node, i) => ({ source: map.nodes[i].id, target: node.id, rel: 'topic' }));
    window.testView = GraphView.mount('#root', { maps: [map], deepLink: false, storagePrefix: '', expandRoot: false });
  });
  await page.waitForFunction(() => testView.map?.id === 'course');
  await page.evaluate(() => testView.select('topic-5')); await settle(page);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    // ResizeObserver applies the container layout after the viewport changes.
    // Wait for it before opening and measuring the mobile details panel.
    if (width === 390) {
      await expect(page.locator('.fg')).toHaveClass(/\bnarrow\b/);
      await page.getByRole('button', { name: 'Expand details', exact: true }).click();
    } else await expect(page.locator('.fg')).not.toHaveClass(/\bnarrow\b/);
    await settle(page);
    await expect(page.locator('.pcrumb-step').first()).toBeVisible();
    const targets = await page.locator('.pcrumb-step').evaluateAll(steps => steps.map(step => {
      const { width, height, y } = step.getBoundingClientRect(); return { width, height, y };
    }));
    expect(targets.length).toBe(6);
    expect(new Set(targets.map(t => Math.round(t.y))).size).toBeGreaterThan(1);
    expect(targets.every(t => t.width >= 24 && t.height >= 24)).toBe(true);
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    expect(violations).toEqual([]);
  }
});

test('mobile readers can open a branch choice, expand details, and close back to the card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page); await mountCourse(page, 25);
  await page.evaluate(() => testView.expand('root')); await settle(page);
  await page.getByRole('button', { name: 'Topic 3', exact: true }).click(); await settle(page);
  await expect(page.locator('.card[data-key="topic-2"]')).toBeFocused();
  await page.getByRole('button', { name: 'Expand details', exact: true }).click();
  await expect(page.locator('.applicability')).toBeVisible();
  await page.getByRole('button', { name: 'Close details', exact: true }).click(); await settle(page);
  await expect(page.locator('.card[data-key="topic-2"]')).toBeFocused();
});
