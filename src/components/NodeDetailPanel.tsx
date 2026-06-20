import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { Command, TechniqueNodeDef } from '../data/schema';
import { useIsMobile } from '../state/useIsMobile';
import {
  ArrowRightIcon,
  BanIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  EyeIcon,
} from '../ui/icons';

interface NodeDetailPanelProps {
  def: TechniqueNodeDef | null;
  /** Resolved color/label for def's phase (from the current map). */
  phaseColor: string;
  phaseLabel: string;
  reduceMotion: boolean;
  /** Attack path from the root to this node (breadcrumb). */
  path?: { id: string; label: string }[];
  /** The selected node's immediate next steps — browsable + pickable in-panel.
   *  `id` is the child's render key (navigated via `onPickNext`). */
  nextSteps?: { id: string; label: string; color: string; summary?: string }[];
  onPickNext?: (id: string) => void;
  /** "Isolate path" mode — collapse everything but the traced path. */
  pathOnly?: boolean;
  onTogglePathOnly?: () => void;
  onNavigate?: (id: string) => void;
  onClose: () => void;
  /** User annotations for this node (persisted on this device). */
  owned?: boolean;
  onToggleOwned?: () => void;
  inapplicable?: boolean;
  onToggleInapplicable?: () => void;
  note?: string;
  onNoteChange?: (text: string) => void;
  /** Focus the notes field on open (the context menu's "Add note" action). */
  autoFocusNote?: boolean;
  onNoteFocused?: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded-md px-2 py-0.5 text-[11px] text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CommandBlock({ cmd }: { cmd: Command }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-bg-soft px-2.5 py-1">
        <span className="truncate text-[11px] text-ink-dim">{cmd.label ?? cmd.lang ?? 'command'}</span>
        <CopyButton text={cmd.code} />
      </div>
      <pre className="hg-scroll overflow-x-auto px-2.5 py-2 font-mono text-[11px] leading-relaxed text-ink">
        <code>{cmd.code}</code>
      </pre>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{title}</h3>
      {children}
    </div>
  );
}

export function NodeDetailPanel({
  def,
  phaseColor,
  phaseLabel,
  reduceMotion,
  path,
  nextSteps,
  onPickNext,
  pathOnly,
  onTogglePathOnly,
  onNavigate,
  onClose,
  owned,
  onToggleOwned,
  inapplicable,
  onToggleInapplicable,
  note,
  onNoteChange,
  autoFocusNote,
  onNoteFocused,
}: NodeDetailPanelProps) {
  const isMobile = useIsMobile();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  // The next-steps list defaults to collapsed (a prominent CTA button); the panel
  // remounts per selection (`key={def.id}`) so it resets closed for each new node.
  const [nextOpen, setNextOpen] = useState(false);
  const nextRef = useRef<HTMLDivElement>(null);
  // When the list opens (it lives at the bottom of the panel), bring it into view
  // so the freshly-revealed options aren't stranded below the fold.
  useEffect(() => {
    if (!nextOpen) return;
    const id = window.setTimeout(
      () => nextRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }),
      reduceMotion ? 0 : 60,
    );
    return () => window.clearTimeout(id);
  }, [nextOpen, reduceMotion]);
  // On mobile the panel defaults to a compact bottom PEEK (just enough to know
  // what you tapped) and expands to the full sheet only when you choose to read.
  // Desktop always shows the full right-hand panel. `key={def.id}` remounts per
  // selection, so each new node starts collapsed — EXCEPT when opened via "Add note",
  // which needs the full sheet so the notes field exists to focus.
  const [peekExpanded, setPeekExpanded] = useState<boolean>(() => !!autoFocusNote);
  const collapsed = isMobile && !peekExpanded;
  // "Add note" from the context menu opens the panel and drops the cursor into the
  // notes field. Expand the sheet first (mobile peek hides the body), then focus.
  useEffect(() => {
    if (!autoFocusNote) return;
    setPeekExpanded(true);
    const t = window.setTimeout(() => {
      noteRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      noteRef.current?.focus();
      onNoteFocused?.();
    }, reduceMotion ? 0 : 120);
    return () => window.clearTimeout(t);
  }, [autoFocusNote, reduceMotion, onNoteFocused]);
  // Drag starts only from the top (grabber + header) via controls (dragListener
  // off), so scrolling the body never drags the sheet. The close button opts out.
  const dragControls = useDragControls();
  const startDrag = (e: React.PointerEvent) => {
    if (!isMobile) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    dragControls.start(e);
  };

  // Slide up from the bottom on mobile (bottom sheet), in from the right on desktop.
  const hidden = reduceMotion
    ? { opacity: 0 }
    : isMobile
      ? { y: 28, opacity: 0 }
      : { x: 24, opacity: 0 };
  const kindLabel = def?.kind === 'goal' ? 'Goal' : def?.kind === 'start' ? 'Start' : phaseLabel;
  return (
    <AnimatePresence>
      {def && (
        <motion.aside
          key={def.id}
          initial={hidden}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={hidden}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          drag={isMobile && !collapsed ? 'y' : false}
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            // Dragging the sheet down only ever collapses it back to the peek
            // (never closes). The small threshold ignores taps on the header.
            if (info.offset.y > 6) setPeekExpanded(false);
          }}
          className={[
            'absolute inset-x-2 bottom-2 z-10 flex flex-col overflow-hidden rounded-2xl border border-border bg-panel-2 shadow-[var(--shadow-pop)]',
            collapsed ? '' : 'max-h-[72%]',
            'sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[372px]',
          ].join(' ')}
        >
          {collapsed ? (
            /* ---- Mobile PEEK: a one-line bar; tap to expand, X to close ---- */
            <div className="flex items-center gap-1.5 px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => setPeekExpanded(true)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: phaseColor }} />
                <span className="min-w-0">
                  <span className="block text-[10px] leading-tight text-ink-dim">{kindLabel}</span>
                  <span className="block truncate text-[14px] font-semibold leading-tight text-ink">{def.label}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPeekExpanded(true)}
                aria-label="Show details"
                className="shrink-0 rounded-md p-1.5 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronRightIcon className="h-4 w-4 -rotate-90" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-md p-1.5 text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
          <>
          {/* mobile grabber — part of the drag handle; tap collapses to the peek */}
          {isMobile && (
            <button
              type="button"
              onPointerDown={startDrag}
              onClick={() => setPeekExpanded(false)}
              aria-label="Collapse, drag down to minimise"
              className="flex w-full shrink-0 cursor-grab touch-none items-center justify-center pb-1.5 pt-3 active:cursor-grabbing"
            >
              <span className="h-1 w-9 rounded-full bg-border-strong" />
            </button>
          )}
          {/* header — the whole top is a drag handle on mobile (drag down → peek) */}
          <div
            onPointerDown={startDrag}
            className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:cursor-default cursor-grab touch-none active:cursor-grabbing sm:touch-auto"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-ink-dim">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: phaseColor }} />
                <span>{kindLabel}</span>
              </div>
              <h2 className="mt-1.5 text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">
                {def.label}
              </h2>
              {(onToggleOwned || onToggleInapplicable) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {onToggleOwned && (
                    <button
                      type="button"
                      data-no-drag
                      onClick={onToggleOwned}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                        owned
                          ? 'border-accent bg-accent-soft text-ink'
                          : 'border-border text-ink-dim hover:border-border-strong hover:text-ink',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors',
                          owned ? 'border-accent bg-accent text-white' : 'border-border-strong',
                        ].join(' ')}
                      >
                        {owned && <CheckIcon className="h-2.5 w-2.5" />}
                      </span>
                      {owned ? 'Cleared' : 'Mark cleared'}
                    </button>
                  )}
                  {onToggleInapplicable && (
                    <button
                      type="button"
                      data-no-drag
                      onClick={onToggleInapplicable}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                        inapplicable
                          ? 'border-border-strong bg-bg-soft text-ink'
                          : 'border-border text-ink-dim hover:border-border-strong hover:text-ink',
                      ].join(' ')}
                    >
                      <BanIcon className="h-3 w-3" />
                      {inapplicable ? 'Inapplicable' : 'Mark N/A'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              data-no-drag
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* body */}
          <div className="hg-scroll flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {path && path.length > 1 && (
              <nav className="flex flex-wrap items-center gap-x-0.5 gap-y-0.5 text-[11px] text-ink-dim">
                {path.map((c, i) => {
                  const last = i === path.length - 1;
                  return (
                    <span key={c.id} className="flex items-center gap-0.5">
                      {last ? (
                        <span className="text-ink">{c.label}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate?.(c.id)}
                          className="transition-colors hover:text-ink"
                        >
                          {c.label}
                        </button>
                      )}
                      {!last && <ChevronRightIcon className="h-3 w-3 text-ink-faint" />}
                    </span>
                  );
                })}
              </nav>
            )}
            {def.summary && <p className="text-[13px] font-medium leading-snug text-ink">{def.summary}</p>}
            {def.description && <p className="text-[12.5px] leading-relaxed text-ink-dim">{def.description}</p>}

            {def.affects && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-bg-soft px-2.5 py-1.5">
                <span className="mt-px shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
                  Affects
                </span>
                <span className="text-[11.5px] leading-snug text-ink-dim">{def.affects}</span>
              </div>
            )}

            {def.requires && def.requires.length > 0 && (
              <Section title="Requires">
                <div className="flex flex-wrap gap-1.5">
                  {def.requires.map((r) => (
                    <span
                      key={r}
                      className="rounded-md border border-border bg-bg-soft px-2 py-0.5 text-[11px] text-ink-dim"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {def.commands && def.commands.length > 0 && (
              <Section title="Commands">
                <div className="space-y-2">
                  {def.commands.map((cmd, i) => (
                    <CommandBlock key={i} cmd={cmd} />
                  ))}
                </div>
              </Section>
            )}

            {def.tools && def.tools.length > 0 && (
              <Section title="Tools">
                <div className="flex flex-wrap gap-1.5">
                  {def.tools.map((t) =>
                    t.url ? (
                      <a
                        key={t.name}
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md border border-border bg-bg-soft px-2 py-1 text-[11px] text-ink transition-colors hover:border-border-strong"
                      >
                        {t.name}
                        <ExternalLinkIcon className="h-3 w-3 text-ink-faint" />
                      </a>
                    ) : (
                      <span
                        key={t.name}
                        className="rounded-md border border-border bg-bg-soft px-2 py-1 text-[11px] text-ink-dim"
                      >
                        {t.name}
                      </span>
                    ),
                  )}
                </div>
              </Section>
            )}

            {def.opsec && (
              <div className="rounded-lg border border-border bg-bg-soft px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
                  <EyeIcon className="h-3.5 w-3.5" /> OPSEC
                </div>
                <p className="text-[11.5px] leading-relaxed text-ink-dim">{def.opsec}</p>
              </div>
            )}

            {((def.references && def.references.length > 0) || def.mitre) && (
              <Section title="References">
                <div className="flex flex-col gap-1.5">
                  {def.mitre && (
                    <a
                      href={def.mitre.url ?? `https://attack.mitre.org/techniques/${def.mitre.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11.5px] text-accent transition-opacity hover:opacity-80"
                    >
                      MITRE ATT&CK · {def.mitre.id}
                      <ExternalLinkIcon className="h-3 w-3 opacity-70" />
                    </a>
                  )}
                  {def.references?.map((ref) => (
                    <a
                      key={ref.url}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11.5px] text-accent transition-opacity hover:opacity-80"
                    >
                      {ref.label}
                      <ExternalLinkIcon className="h-3 w-3 shrink-0 opacity-70" />
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {onNoteChange && (
              <Section title="Your notes">
                <textarea
                  ref={noteRef}
                  data-no-drag
                  value={note ?? ''}
                  onChange={(e) => onNoteChange(e.target.value)}
                  rows={3}
                  placeholder="Popped accounts, hosts, what else you found… (saved on this device)"
                  className="hg-scroll w-full resize-y rounded-lg border border-border bg-bg px-2.5 py-2 text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-border-strong"
                />
              </Section>
            )}

            {/* Next steps — the panel's call to action: where can you go from here.
                A prominent button (collapsed by default) that opens a browsable list
                of the node's children; picking one navigates straight to it. */}
            {nextSteps && nextSteps.length > 0 && (
              <div ref={nextRef} className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNextOpen((o) => !o)}
                  className={[
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-[12.5px] font-semibold transition-all',
                    nextOpen
                      ? 'border border-border-strong bg-bg-soft text-ink'
                      : 'bg-accent text-white shadow-[var(--shadow-card)] hover:brightness-110',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    {nextOpen ? 'Next steps' : 'Pick your next step'}
                    <span
                      className={[
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                        nextOpen ? 'bg-white/[0.08] text-ink-dim' : 'bg-white/25 text-white',
                      ].join(' ')}
                    >
                      {nextSteps.length}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="h-4 w-4 transition-transform duration-200"
                    style={{ transform: nextOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {nextOpen && (
                    <motion.div
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        {nextSteps.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onPickNext?.(s.id)}
                            className="group flex items-start gap-2.5 rounded-lg border border-border bg-bg-soft px-2.5 py-2 text-left transition-colors hover:border-border-strong hover:bg-white/[0.03]"
                          >
                            <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] font-medium leading-tight text-ink">{s.label}</span>
                              {s.summary && (
                                <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-ink-dim">
                                  {s.summary}
                                </span>
                              )}
                            </span>
                            <ArrowRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* footer */}
          {onTogglePathOnly && (
            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={onTogglePathOnly}
                className={[
                  'flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                  pathOnly
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-border text-ink-dim hover:border-border-strong hover:text-ink',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors',
                    pathOnly ? 'border-accent bg-accent text-white' : 'border-border-strong',
                  ].join(' ')}
                >
                  {pathOnly && <CheckIcon className="h-3 w-3" />}
                </span>
                Isolate this attack path
              </button>
            </div>
          )}
          </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
