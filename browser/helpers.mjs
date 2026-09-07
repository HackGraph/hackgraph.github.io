import { denseCourseMap, expansionCourseMap } from './fixtures.mjs';

export async function openApp(page) {
  await page.addInitScript(() => {
    // Capture the instance at the public mount seam without exposing debug globals
    // in the shipped application.
    let factory;
    Object.defineProperty(window, 'GraphView', {
      configurable: true,
      get: () => factory,
      set(value) {
        factory = value;
        const mount = value.mount;
        value.mount = (...args) => (window.testView = mount(...args));
      },
    });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.testView?.map);
  await page.evaluate(() => document.fonts.ready);
}

export async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('.fg')?.classList.contains('animating'));
  // CSS/WAAPI color and opacity effects can outlive layout by a small amount.
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
}

export async function mountCourse(page, count = 25, options = {}) {
  await page.evaluate(async ({ count, options }) => {
    window.testView.destroy();
    const nodes = [{ id: 'root', label: 'Course overview', kind: 'start', group: 'Learn', summary: 'Choose a topic.' },
      ...Array.from({ length: count }, (_, i) => ({ id: 'topic-' + i, label: 'Topic ' + (i + 1),
        group: 'Learn', summary: 'A short explanation of this topic.', aliases: i === 0 ? ['First lesson'] : [],
        details: { applicability: 'An example teaching context.' } }))];
    window.testView = GraphView.mount('#root', {
      maps: [{ id: 'course', name: 'Course', rootId: 'root', nodes,
        phases: [{ id: 'learn', label: 'Learn', color: '#608ac5' }],
        edges: nodes.slice(1).map(n => ({ source: 'root', target: n.id, rel: 'topic' })),
        relationships: { topic: { label: 'topic', summary: 'Part of this course.' } } }],
      deepLink: false, storagePrefix: '', expandRoot: false, ...options,
    });
  }, { count, options });
  await page.waitForFunction(() => window.testView?.map?.id === 'course');
  await settle(page);
}

export async function mountDenseCourse(page) {
  await openApp(page);
  await page.evaluate(map => {
    testView.destroy();
    window.testView = GraphView.mount('#root', { maps: [map], deepLink: false, storagePrefix: '', expandRoot: false });
  }, denseCourseMap());
  await page.waitForFunction(() => testView.map?.id === 'labels');
  for (const id of ['root', 'a0', 'a1', 'a2', 'a3', 'a4']) {
    await page.evaluate(id => testView.expand(id), id); await settle(page);
  }
}

export async function mountExpansionCourse(page, count = 100) {
  await openApp(page);
  await page.evaluate(map => {
    testView.destroy();
    window.testView = GraphView.mount('#root', { maps: [map], deepLink: false, storagePrefix: '', expandRoot: false });
  }, expansionCourseMap(count));
  await page.waitForFunction(() => testView.map?.id === 'expansion');
  await settle(page);
}
