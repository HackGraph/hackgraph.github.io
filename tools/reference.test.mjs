import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { MAPS } from '../src/data/index.js';
import { editorialPresentation } from '../src/data/editorial.js';
import { GraphEngine as E } from '../src/graph/engine/index.js';
import { toEngineMap } from '../src/graph/engineAdapter.js';
import { GLOSSARY } from '../src/data/glossary.js';
import { glossaryReview, glossaryAnchor } from '../src/data/glossary-review.js';

const slugs = ['active-directory', 'windows-privilege-escalation', 'linux-privilege-escalation'];
test('the glossary reading page preserves every definition, citation section and comparison label', () => {
  const dom = new JSDOM(readFileSync(new URL('../glossary.html', import.meta.url), 'utf8'));
  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll('article').length, GLOSSARY.length);
  for (const entry of GLOSSARY) {
    const article = doc.getElementById(glossaryAnchor(entry.term)), review = glossaryReview(entry);
    assert.ok(article, entry.term);
    assert.equal(article.dataset.review, review.status);
    for (const value of [entry.short, review.label, review.detail, ...(entry.aliases || [])]) assert.ok(article.textContent.includes(value), entry.term);
    for (const source of entry.sources || []) {
      assert.ok([...article.querySelectorAll('a')].some(a => a.href === source.url), entry.term);
      assert.ok(article.textContent.includes(source.section), entry.term);
    }
  }
  dom.window.close();
});
test('committed reading pages retain every topic, alias, applicability note, and evidence label', () => {
  for (const [i, map] of MAPS.entries()) {
    const dom = new JSDOM(readFileSync(new URL(`../reference/${slugs[i]}.html`, import.meta.url), 'utf8'));
    for (const node of map.nodes) {
      const article = dom.window.document.getElementById(node.id);
      assert.ok(article, node.id);
      const p = editorialPresentation(node), text = article.textContent;
      for (const label of [node.label, ...(node.aliases || []), ...p.notes.flatMap(n => [n.label, n.text]), p.applicability].filter(Boolean)) assert.ok(text.includes(label), node.id);
      for (const source of p.sources) assert.ok([...article.querySelectorAll('a')].some(a => a.getAttribute('href') === source.url), node.id);
      const referenceHeading = [...article.querySelectorAll('h4')].find(heading => heading.textContent === 'References');
      const referenceItems = referenceHeading ? [...referenceHeading.nextElementSibling.children] : [];
      assert.deepEqual(referenceItems.map(item => ({ label: item.querySelector('a').textContent, url: item.querySelector('a').getAttribute('href'), kind: item.querySelector('.meta').textContent.trim() })),
        p.sources.map(source => ({ label: source.label, url: source.url, kind: '· ' + (source.kind === 'unclassified' ? 'Source type not classified' : source.kind + ' source') })), node.id);
      const claimItems = [...article.querySelectorAll('.claim-list > li')];
      assert.equal(claimItems.length, p.claims.length, node.id);
      const sourceLabels = new Map(p.sources.map(source => [source.url, source.label]));
      for (const [i, claim] of p.claims.entries()) {
        const item = claimItems[i];
        assert.equal(item.querySelector('.claim-text').textContent, claim.text, node.id);
        assert.equal(item.querySelector('.claim-section').textContent, claim.section, node.id);
        const links = [...item.querySelectorAll('.claim-sources a')];
        assert.deepEqual(links.map(link => link.getAttribute('href')), claim.sources, node.id);
        assert.deepEqual(links.map(link => link.textContent), claim.sources.map(url => sourceLabels.get(url) || url), node.id);
      }
    }
    dom.window.close();
  }
});
test('every authored alias finds its owning topic within the visible result limit', () => {
  for (const map of MAPS) {
    const index = E.buildSearchIndex(E.buildModel(toEngineMap(map)));
    for (const node of map.nodes) for (const alias of node.aliases || []) {
      assert.ok(E.searchMap(index, alias).slice(0, 12).some(r => r.id === node.id), alias);
    }
  }
});
