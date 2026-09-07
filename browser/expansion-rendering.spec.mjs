import { test, expect } from '@playwright/test';
import { openApp, mountCourse, settle } from './helpers.mjs';

test('measured card heights drive packing and connector endpoints', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    testView.destroy();
    const nodes = [{ id: 'root', label: 'Course overview', group: 'Learn', kind: 'start', summary: 'Choose a lesson.' },
      ...Array.from({ length: 9 }, (_, i) => ({ id: 'lesson-' + i, label: 'Lesson ' + (i + 1), group: 'Learn',
        kind: i % 2 ? 'category' : 'technique',
        summary: 'This lesson explains a concept with a worked example. '.repeat(1 + i % 4) }))];
    window.testView = GraphView.mount('#root', { maps: [{ id: 'measured', name: 'Measured course', rootId: 'root', nodes,
      phases: [{ id: 'learn', label: 'Learn', color: '#608ac5' }],
      edges: nodes.slice(1).map(node => ({ source: 'root', target: node.id, rel: 'topic' })),
      relationships: { topic: { label: 'Related learning material', summary: 'A lesson in this course.' } },
    }], deepLink: false, storagePrefix: '', expandRoot: false });
  });
  await page.waitForFunction(() => testView.map?.id === 'measured');
  await settle(page);
  await page.evaluate(() => testView.expand('root')); await settle(page);
  await page.evaluate(() => testView.fit()); await settle(page);
  const cards = await page.evaluate(() => [...document.querySelectorAll('.card')].filter(el => el.dataset.key !== 'root').map(el => {
    const matrix = new DOMMatrix(el.style.transform);
    const edge = [...document.querySelectorAll('.edgehit')].find(edge => edge.dataset.edge === 'root|' + el.dataset.key);
    const arrow = edge.getAttribute('d').split(' M ').at(-1).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
    return { id: el.dataset.key, y: matrix.f, h: el.offsetHeight, targetY: arrow[3], hidden: el.style.visibility === 'hidden' };
  }));
  expect(cards).toHaveLength(9);
  expect(new Set(cards.map(card => card.h)).size).toBeGreaterThan(3);
  for (const [i, card] of cards.entries()) {
    expect(card.hidden).toBe(false);
    expect(card.targetY).toBeCloseTo(card.y + card.h / 2, 2);
    if (i) expect(card.y - cards[i - 1].y - cards[i - 1].h).toBeGreaterThan(10);
  }
});

test('rapid changes before the first frame leave no abandoned entrances', async ({ page }) => {
  await openApp(page); await mountCourse(page, 100);
  const canceled = await page.evaluate(() => {
    testView.expand('root'); testView.collapse('root');
    return { cards: document.querySelectorAll('.card').length, edges: document.querySelectorAll('.edge').length,
      exits: document.querySelectorAll('.card.exit').length };
  });
  expect(canceled).toEqual({ cards: 1, edges: 0, exits: 0 });
  await page.evaluate(() => testView.expand('root'));
  await settle(page);
  await expect(page.locator('.card')).toHaveCount(101);
  await expect(page.locator('.card.exit')).toHaveCount(0);
  await expect(page.locator('.edgehit')).toHaveCount(100);
  await expect(page.locator('.fg-choice')).toHaveCount(100);
  await page.evaluate(() => {
    testView.collapse('root'); testView.expand('root'); testView.reset();
  });
  await settle(page);
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.edgehit')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
});

test('a wide sidebar list is deferred until disclosure and remains complete and keyboard usable', async ({ page }) => {
  await openApp(page); await mountCourse(page, 250);
  await page.evaluate(() => testView.expand('root')); await settle(page);
  await expect(page.locator('.fg-choice')).toHaveCount(250);
  await expect(page.locator('.pnextitem')).toHaveCount(0);
  await expect(page.locator('.prelationship')).toHaveCount(0);
  const disclosure = page.locator('.pnextbtn');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await disclosure.focus(); await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.pnextitem')).toHaveCount(250);
  await expect(page.locator('.prelationship')).toHaveCount(250);
  await expect(page.locator('.pnextitem .plabel').first()).toHaveText('Topic 1');
  await expect(page.locator('.pnextitem .plabel').last()).toHaveText('Topic 250');
  await expect(page.locator('.pnextitem .psub').last()).toHaveText('A short explanation of this topic.');
  await page.evaluate(() => { window.firstTopicRow = document.querySelector('.pnextitem'); });
  await page.keyboard.press('Space');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.pnextinner')).toHaveJSProperty('inert', true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Your note for Course overview', exact: true })).toBeFocused();
  await settle(page);
  await disclosure.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.pnextinner')).toHaveJSProperty('inert', false);
  await expect(page.locator('.pnextitem')).toHaveCount(250);
  expect(await page.evaluate(() => firstTopicRow === document.querySelector('.pnextitem'))).toBe(true);
  await settle(page);
  await page.locator('.pnextitem').last().click(); await settle(page);
  await expect(page.locator('[data-el="panelhead"] h2')).toHaveText('Topic 250');
  expect(await page.evaluate(() => testView.selection)).toBe('topic-249');
  await expect(page.locator('.pnextitem')).toHaveCount(0);
  await page.evaluate(() => testView.select('root')); await settle(page);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.pnextitem')).toHaveCount(0);
});
