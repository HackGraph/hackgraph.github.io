/**
 * Glossary decoration for the engine's panel prose.
 *
 * The engine renders body text as plain text and offers a `prose(el, text)` hook. This is
 * that hook: it re-tokenises the text and wraps the first occurrence of each known acronym
 * so it can be decoded on hover, which is the one panel feature the engine did not already
 * have. The tokenizer and the term list are unchanged — the same ones the React panel used.
 *
 * The tooltip is a `::after` fed from `data-def`, so its content and styling cost nothing
 * per term. The one listener each term does carry only decides which SIDE it opens on:
 * CSS cannot see the viewport, and a right-opening tooltip is cropped by the window for any
 * term near the edge.
 */
import { tokenizeGlossary } from '../glossary.js';

/** Open the tooltip leftward when there is not room for it on the right. */
function flipIfClipped(event) {
  const term = event.currentTarget ;
  const room = window.innerWidth - term.getBoundingClientRect().left;
  term.classList.toggle('gloss-left', room < 280);
}

/** Replace `el`'s contents with glossary-aware markup. Safe: every part is textContent. */
export function decorateProse(el, text) {
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
    // The tooltip opens to the right of its term, which crops it at the window edge for
    // terms late in a line. Decide the side when it opens, from where the term actually
    // sits — CSS alone cannot see the viewport.
    term.addEventListener('pointerenter', flipIfClipped);
    term.addEventListener('focus', flipIfClipped);
    el.appendChild(term);
  }
}
