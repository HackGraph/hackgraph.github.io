import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { tokenizeGlossary } from '../data/glossary';
import { useIsMobile } from '../state/useIsMobile';

/**
 * Renders prose with known security terms dotted-underlined; hovering (desktop) or
 * tapping (mobile) a term shows a one-line plain-English definition. Keeps the
 * technique text terse for practitioners while giving a newcomer an on-demand decode.
 * Purely additive: text with no known terms renders as-is.
 */
export function GlossaryText({ text }: { text: string }) {
  const segments = useMemo(() => tokenizeGlossary(text), [text]);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <Fragment key={i}>{seg.value}</Fragment>
        ) : (
          <GlossaryTerm key={i} label={seg.value} term={seg.term} def={seg.def} />
        ),
      )}
    </>
  );
}

function GlossaryTerm({ label, term, def }: { label: string; term: string; def: string }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const hoverProps = isMobile
    ? {}
    : { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) };

  return (
    <>
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`${term}: ${def}`}
        className="cursor-help underline decoration-dotted decoration-ink-faint/70 underline-offset-2 transition-colors hover:decoration-ink-dim focus:decoration-ink-dim focus:outline-none"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // Don't let the tap fall through to the canvas / panel handlers.
          e.stopPropagation();
          if (isMobile) setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        {...hoverProps}
      >
        {label}
      </span>
      {open && <GlossaryTooltip anchor={ref} term={term} def={def} onClose={() => setOpen(false)} />}
    </>
  );
}

function GlossaryTooltip({
  anchor,
  term,
  def,
  onClose,
}: {
  anchor: { readonly current: HTMLElement | null };
  term: string;
  def: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Position from the anchor rect once the tooltip has measured itself: below the
  // term by default, flipped above when it would overflow the viewport bottom, and
  // clamped to the viewport so it never clips.
  useLayoutEffect(() => {
    const a = anchor.current;
    const el = ref.current;
    if (!a || !el) return;
    const m = 8;
    const ar = a.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const left = Math.max(m, Math.min(ar.left, window.innerWidth - er.width - m));
    let top = ar.bottom + 6;
    if (top + er.height + m > window.innerHeight) top = ar.top - er.height - 6;
    top = Math.max(m, top);
    setPos({ left, top });
  }, [anchor, term, def]);

  // Close on Escape, on any scroll (so it never detaches from the term), on resize,
  // and on an outside pointer (covers mobile tap-away; hover-out already closes it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="fixed z-50 w-64 max-w-[80vw] rounded-xl border border-border-strong bg-panel-2 px-3 py-2 shadow-[var(--shadow-pop)]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint">{term}</div>
      <p className="text-sm leading-snug text-ink-dim">{def}</p>
    </div>,
    document.body,
  );
}
