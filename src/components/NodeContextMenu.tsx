import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TechniqueNodeDef } from '../data/schema';
import { BanIcon, CheckIcon, EyeIcon, LinkIcon, NoteIcon } from '../ui/icons';

export interface NodeMenuTarget {
  key: string;
  defId: string;
  x: number;
  y: number;
}

interface NodeContextMenuProps {
  target: NodeMenuTarget | null;
  def: TechniqueNodeDef | null;
  owned: boolean;
  inapplicable: boolean;
  /** Ruled out by an active scope filter (e.g. OSCP). */
  scopedOut: boolean;
  /** Out of the scope filter but re-enabled by the user. */
  scopeReEnabled: boolean;
  hasNote: boolean;
  onClose: () => void;
  onCopyLink: () => Promise<boolean>;
  onToggleOwned: () => void;
  onToggleInapplicable: () => void;
  onToggleScope: () => void;
  onAddNote: () => void;
}

function Item({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base text-ink transition-colors hover:bg-white/[0.10]"
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-ink-dim">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

export function NodeContextMenu({
  target,
  def,
  owned,
  inapplicable,
  scopedOut,
  scopeReEnabled,
  hasNote,
  onClose,
  onCopyLink,
  onToggleOwned,
  onToggleInapplicable,
  onToggleScope,
  onAddNote,
}: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [copied, setCopied] = useState(false);

  // Reset the transient "Copied" state whenever a fresh menu opens.
  useEffect(() => setCopied(false), [target?.key, target?.x, target?.y]);

  // Clamp to the viewport so the menu never spills off-screen near an edge.
  useLayoutEffect(() => {
    if (!target || !ref.current) return;
    const m = 8;
    const r = ref.current.getBoundingClientRect();
    const left = Math.min(target.x, window.innerWidth - r.width - m);
    const top = Math.min(target.y, window.innerHeight - r.height - m);
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
    // Capture-phase pointerdown so a click anywhere outside (incl. the RF pane) closes it.
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

  if (!target || !def) return null;

  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 w-60 select-none rounded-2xl border border-border-strong bg-panel-2 p-1.5 shadow-[var(--shadow-pop)]"
      // Stop our own pointerdown from bubbling to the capture-phase outside-close.
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="truncate px-3 pb-1.5 pt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {def.label}
      </div>
      <Item
        icon={copied ? <CheckIcon className="h-[18px] w-[18px] text-accent" /> : <LinkIcon className="h-[18px] w-[18px]" />}
        label={copied ? 'Link copied' : 'Copy link to node'}
        onClick={() => {
          void onCopyLink().then((ok) => {
            if (ok) {
              setCopied(true);
              window.setTimeout(onClose, 900);
            } else {
              onClose();
            }
          });
        }}
      />
      <Item
        icon={<NoteIcon className="h-[18px] w-[18px]" />}
        label={hasNote ? 'Edit note' : 'Add note'}
        onClick={act(onAddNote)}
      />
      <div className="my-1.5 h-px bg-border-strong" />
      <Item
        icon={<CheckIcon className={owned ? 'h-[18px] w-[18px] text-accent' : 'h-[18px] w-[18px]'} />}
        label={owned ? 'Unmark cleared' : 'Mark as cleared'}
        onClick={act(onToggleOwned)}
      />
      <Item
        icon={<BanIcon className={inapplicable ? 'h-[18px] w-[18px] text-ink' : 'h-[18px] w-[18px]'} />}
        label={inapplicable ? 'Mark as applicable' : 'Mark as inapplicable'}
        onClick={act(onToggleInapplicable)}
      />
      {(scopedOut || scopeReEnabled) && (
        <Item
          icon={
            scopedOut ? (
              <EyeIcon className="h-[18px] w-[18px]" />
            ) : (
              <BanIcon className="h-[18px] w-[18px] text-ink" />
            )
          }
          label={scopedOut ? 'Re-enable node' : 'Hide (out of scope)'}
          onClick={act(onToggleScope)}
        />
      )}
    </div>,
    document.body,
  );
}
