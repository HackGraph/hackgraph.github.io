// Generic teaching diagrams for presentation checks; no domain content.
export function denseCourseMap() {
  const sources = Array.from({ length: 5 }, (_, i) => 'a' + i);
  const targets = Array.from({ length: 8 }, (_, i) => 'b' + i);
  return { id: 'labels', name: 'Course relationships', rootId: 'root',
    phases: [{ id: 'learn', label: 'Learn', color: '#608ac5' }],
    nodes: ['root', ...sources, ...targets].map(id => ({ id, label: id === 'root' ? 'Course overview' : 'Course topic ' + id,
      group: 'Learn', summary: 'A short lesson overview.' })),
    edges: [...sources.map(target => ({ source: 'root', target })),
      ...sources.flatMap((source, i) => targets.filter((_, j) => (i + j) % 3 !== 0).map(target => ({ source, target, rel: 'next' })))],
    relationships: { next: { label: 'Related course material', summary: 'Related concepts.' } },
  };
}

export function expansionCourseMap(count = 100) {
  const ids = ['root', 'a', 'b', 'c', ...Array.from({ length: 4 }, (_, i) => `a${i}`),
    ...Array.from({ length: count }, (_, i) => `b${i}`)];
  return { id: 'expansion', name: 'Course outline', rootId: 'root',
    phases: [{ id: 'learn', label: 'Learn', color: '#608ac5' }],
    nodes: ids.map(id => ({ id, label: id === 'root' ? 'Course overview' : 'Course topic ' + id,
      group: 'Learn', summary: 'A short lesson overview.' })),
    edges: ['a', 'b', 'c'].map(target => ({ source: 'root', target }))
      .concat(ids.filter(id => /^a\d/.test(id)).map(target => ({ source: 'a', target })))
      .concat(ids.filter(id => /^b\d/.test(id)).map(target => ({ source: 'b', target }))),
  };
}
