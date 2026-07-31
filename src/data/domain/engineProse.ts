/**
 * Glossary decoration for the engine's panel prose.
 *
 * The engine renders body text as plain text and offers a `prose(el, text)` hook. This is
 * that hook: it re-tokenises the text and wraps the first occurrence of each known acronym
 * so it can be decoded on hover, which is the one panel feature the engine did not already
 * have. The tokenizer and the term list are unchanged — the same ones the React panel used.
 *
 * The tooltip is CSS-only (a `::after` fed from `data-def`), so there is no JS listener per
 * term and nothing to tear down when the panel re-renders.
 */
import { tokenizeGlossary } from '../glossary';

/** Replace `el`'s contents with glossary-aware markup. Safe: every part is textContent. */
export function decorateProse(el: HTMLElement, text: string): void {
  const segments = tokenizeGlossary(text);
  // nothing to gloss — leave the plain text the engine already set
  if (segments.length === 1 && segments[0].type === 'text') return;

  el.textContent = '';
  for (const seg of segments) {
    if (seg.type === 'text') {
      el.appendChild(document.createTextNode(seg.value));
      continue;
    }
    const term = document.createElement('span');
    term.className = 'hg-gloss';
    term.textContent = seg.value;
    term.dataset.def = seg.def;
    term.setAttribute('tabindex', '0');
    term.setAttribute('role', 'note');
    term.setAttribute('aria-label', `${seg.term}: ${seg.def}`);
    el.appendChild(term);
  }
}
