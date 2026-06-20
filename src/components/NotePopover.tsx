import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NoteIcon } from '../ui/icons';

export interface NotePopoverTarget {
  /** Annotation key (a node's render key) whose note to show. */
  key: string;
  label: string;
  x: number;
  y: number;
}

interface NotePopoverProps {
  target: NotePopoverTarget | null;
  note: string;
  onClose: () => void;
}

/** Read-only note viewer, opened by tapping/clicking a node's note badge. Portaled to
 *  body (screen-positioned, so it never scales with zoom or clips), closes on
 *  outside-tap / Escape / scroll. Works on touch where hover can't. */
export function NotePopover({ target, note, onClose }: NotePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!target || !ref.current) return;
    const m = 8;
    const r = ref.current.getBoundingClientRect();
    const left = Math.min(target.x, window.innerWidth - r.width - m);
    const top = Math.min(target.y + 10, window.innerHeight - r.height - m);
    setPos({ left: Math.max(m, left), top: Math.max(m, top) });
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
    };
  }, [target, onClose]);

  if (!target) return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 w-64 max-w-[82vw] rounded-xl border border-border-strong bg-panel-2 p-3 shadow-[var(--shadow-pop)]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        <NoteIcon className="h-3 w-3 shrink-0" />
        <span className="truncate">{target.label}</span>
      </div>
      <p className="hg-scroll max-h-[40vh] overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-ink-dim">
        {note}
      </p>
    </div>,
    document.body,
  );
}
