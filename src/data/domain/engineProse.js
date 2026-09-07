/** Accessible glossary popovers, shared by all decorated prose in one graph. */
import { GLOSSARY, tokenizeGlossary } from '../glossary.js';
import { glossaryReview, glossaryAnchor } from '../glossary-review.js';
import { availabilityNotes } from '../editorial.js';

const popovers = new WeakMap();
let serial = 0;

function glossaryPopover(root) {
  let state = popovers.get(root);
  if (state?.el.isConnected) return state;
  const el = document.createElement('div');
  el.className = 'hg-glossary-popover';
  el.id = 'hg-definition-' + (++serial);
  el.setAttribute('popover', 'auto');
  el.setAttribute('role', 'dialog');
  el.tabIndex = -1;
  root.appendChild(el);
  state = { el, trigger: null };
  el.addEventListener('toggle', event => {
    if (event.newState === 'closed') state.trigger?.setAttribute('aria-expanded', 'false');
  });
  el.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation();
    el.hidePopover();
    state.trigger?.focus({ preventScroll: true });
  });
  popovers.set(root, state);
  return state;
}

function openDefinition(trigger, segment) {
  const root = trigger.closest('.fg');
  if (!root) return;
  const state = glossaryPopover(root), pop = state.el;
  if (pop.matches(':popover-open') && state.trigger === trigger) {
    pop.hidePopover(); return;
  }
  state.trigger?.setAttribute('aria-expanded', 'false');
  if (pop.matches(':popover-open')) pop.hidePopover();
  state.trigger = trigger;
  pop.replaceChildren();
  pop.setAttribute('aria-label', segment.term + ' definition');
  const title = document.createElement('strong'); title.textContent = segment.term;
  const text = document.createElement('p'); text.textContent = segment.def;
  pop.append(title, text);
  const entry = GLOSSARY.find(e => e.term === segment.term);
  const review = glossaryReview(entry);
  const status = document.createElement('p'); status.className = 'hg-glossary-status';
  status.textContent = review.label + (review.date ? ' · ' + review.date : '');
  pop.appendChild(status);
  for (const note of availabilityNotes(entry.sources || [])) {
    const p = document.createElement('p'); p.className = 'hg-glossary-status'; p.textContent = note.text; pop.appendChild(p);
  }
  for (const source of entry?.sources || []) {
    const link = document.createElement('a');
    link.textContent = source.label; link.href = source.url;
    link.target = '_blank'; link.rel = 'noopener noreferrer'; pop.appendChild(link);
  }
  const details = document.createElement('a');
  details.textContent = 'Definition sources and review details';
  details.href = '/glossary.html#' + glossaryAnchor(segment.term); pop.appendChild(details);
  trigger.setAttribute('aria-controls', pop.id);
  trigger.setAttribute('aria-expanded', 'true');
  pop.showPopover();
  const r = trigger.getBoundingClientRect(), bounds = root.getBoundingClientRect();
  const width = pop.offsetWidth, height = pop.offsetHeight;
  pop.style.left = Math.max(bounds.left + 12, Math.min(r.left, bounds.right - width - 12)) + 'px';
  pop.style.top = (r.bottom + height + 12 < bounds.bottom ? r.bottom + 8 : Math.max(bounds.top + 12, r.top - height - 8)) + 'px';
  pop.focus({ preventScroll: true });
}

/** Dataset text is inserted only as text nodes. */
export function decorateProse(el, text) {
  const segments = tokenizeGlossary(text);
  if (segments.length === 1 && segments[0].type === 'text') return;
  el.textContent = '';
  for (const segment of segments) {
    if (segment.type === 'text') { el.appendChild(document.createTextNode(segment.value)); continue; }
    const term = document.createElement('button');
    term.type = 'button'; term.className = 'hg-gloss'; term.textContent = segment.value;
    term.setAttribute('aria-label', 'Define ' + segment.term);
    term.setAttribute('aria-haspopup', 'dialog'); term.setAttribute('aria-expanded', 'false');
    term.addEventListener('click', () => openDefinition(term, segment));
    el.appendChild(term);
  }
}
