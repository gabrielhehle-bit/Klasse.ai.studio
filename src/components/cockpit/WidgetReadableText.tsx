import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Keep teaching controls visible; offer the complete text when the preview overflows. */
export function WidgetReadableText({ text, title, className = '', onShortClick, shortLabel }: {
  text: string;
  title: string;
  className?: string;
  onShortClick?: () => void;
  shortLabel?: string;
}) {
  const previewRef = useRef<HTMLSpanElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    const measure = () => setClipped(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text, className]);
  useEffect(() => { setOpen(false); }, [text]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);
  const read = clipped || !onShortClick;
  return <>
    <button type="button" data-widget-text-reader={clipped ? 'true' : undefined}
      aria-label={read ? `${title} vollständig lesen` : shortLabel}
      onClick={event => { if (read) { event.currentTarget.focus(); setOpen(true); } else onShortClick?.(); }}
      className={`block min-h-11 w-full min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${className}`}>
      <span ref={previewRef} data-widget-text-preview className="line-clamp-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</span>
      {clipped && <span className="block text-xs font-bold underline">Ganz lesen ↗</span>}
    </button>
    {open && createPortal(<dialog ref={dialogRef} aria-label={`${title} vollständig lesen`}
      onClose={() => setOpen(false)}
      className="fixed inset-0 m-auto h-[min(85dvh,760px)] w-[min(94vw,960px)] max-w-none rounded-2xl border border-slate-300 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/60">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" autoFocus onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold">Schließen</button>
        </header>
        <div tabIndex={0} data-widget-full-text className="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap p-4 text-lg leading-relaxed [overflow-wrap:anywhere]">{text}</div>
      </div>
    </dialog>, document.body)}
  </>;
}
