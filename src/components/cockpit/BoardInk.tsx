import React, { useEffect, useRef, useState } from 'react';

export type InkItem = { id: string; color: string; width: number; points: number[][]; text?: string };
export type BoardInkHandle = { undo: () => void; redo: () => void };
type Props = {
  items: InkItem[];
  active: boolean;
  onChange: (items: InkItem[]) => void;
  onDone: () => void;
  /** External single toolbar controls the teaching surface. */
  externalTool?: 'pen' | 'erase';
  externalColor?: string;
  externalWidth?: number;
  hideToolbar?: boolean;
};

/** Vector ink belongs to the classroom, independent of widget positions. */
export const BoardInk = React.forwardRef<BoardInkHandle, Props>(function BoardInk({ items, active, onChange, onDone, externalTool, externalColor, externalWidth, hideToolbar }, ref) {
  const [tool, setTool] = useState<'pen' | 'erase' | 'text'>('pen');
  const [color, setColor] = useState('#172554');
  const [width, setWidth] = useState(4);
  const [draft, setDraft] = useState<InkItem | null>(null);
  const stroke = useRef<InkItem | null>(null);
  const pointer = useRef<number | null>(null);
  const [history, setHistory] = useState<InkItem[][]>([]);
  const [redo, setRedo] = useState<InkItem[][]>([]);
  const [textAt, setTextAt] = useState<number[] | null>(null);
  const [text, setText] = useState('');
  const [confirmClear, setConfirmClear] = useState<'drawing' | 'text' | null>(null);
  const lastItems = useRef(items);
  useEffect(() => {
    // A restore or remote replacement invalidates local undo snapshots.
    if (items !== lastItems.current) { setHistory([]); setRedo([]); }
    lastItems.current = items;
  }, [items]);
  useEffect(() => {
    if (!active) { stroke.current = null; pointer.current = null; setDraft(null); setTextAt(null); setConfirmClear(null); }
  }, [active]);
  const apply = (next: InkItem[]) => { lastItems.current = next; onChange(next); };
  const effectiveTool = externalTool ?? tool;
  const effectiveColor = externalColor ?? color;
  const effectiveWidth = externalWidth ?? width;
  React.useImperativeHandle(ref, () => ({
    undo: () => {
      if (!history.length) return;
      setRedo(current => [...current, items]);
      apply(history[history.length - 1]);
      setHistory(current => current.slice(0, -1));
    },
    redo: () => {
      if (!redo.length) return;
      setHistory(current => [...current, items]);
      apply(redo[redo.length - 1]);
      setRedo(current => current.slice(0, -1));
    },
  }));
  const commit = (next: InkItem[]) => {
    setHistory(h => [...h.slice(-29), items]); setRedo([]); apply(next);
  };
  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(1600, (event.clientX - rect.left) * 1600 / rect.width)),
      Math.max(0, Math.min(900, (event.clientY - rect.top) * 900 / rect.height))];
  };
  const cancel = () => { stroke.current = null; pointer.current = null; setDraft(null); };
  const button = 'min-h-11 px-3 rounded-lg text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600';
  return <>
    <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-label="Gemeinsame Schreib- und Zeichenfläche"
      className={`absolute inset-0 w-full h-full ${active ? 'z-[20000] touch-none cursor-crosshair' : 'z-[2] pointer-events-none'}`}
      onPointerDown={e => {
        if (!active || pointer.current !== null || e.button !== 0) return;
        if (effectiveTool === 'erase') return;
        if (effectiveTool === 'text') { setTextAt(point(e)); setText(''); return; }
        e.currentTarget.setPointerCapture(e.pointerId); pointer.current = e.pointerId;
        const p = point(e);
        stroke.current = { id: crypto.randomUUID(), color: effectiveColor, width: effectiveWidth, points: [p, p] }; setDraft(stroke.current);
      }}
      onPointerMove={e => {
        if (pointer.current !== e.pointerId || !stroke.current) return;
        stroke.current = { ...stroke.current, points: [...stroke.current.points, point(e)] }; setDraft(stroke.current);
      }}
      onPointerUp={e => {
        if (pointer.current !== e.pointerId || !stroke.current) return;
        commit([...items, stroke.current]); cancel();
      }} onPointerCancel={cancel} onLostPointerCapture={cancel}>
      {[...items, ...(draft ? [draft] : [])].map(item => <g key={item.id}
        onPointerDown={e => { if (active && effectiveTool === 'erase') { e.stopPropagation(); commit(items.filter(i => i.id !== item.id)); } }}>
        {item.text !== undefined ? <text x={item.points[0][0]} y={item.points[0][1]} fill={item.color} fontSize={32} fontFamily="sans-serif">{item.text}</text>
          : <><polyline points={item.points.map(p => p.join(',')).join(' ')} fill="none" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" />
            {active && effectiveTool === 'erase' && <polyline points={item.points.map(p => p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth={Math.max(18, item.width)} pointerEvents="stroke" />}</>}
      </g>)}
    </svg>
    {active && !hideToolbar && <div className="absolute bottom-3 left-3 right-3 z-[21000] flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl" role="toolbar" aria-label="Zeichenwerkzeuge"
      onKeyDown={e => { if (e.key === 'Escape') { cancel(); onDone(); } }}>
      {([['pen', 'Stift'], ['text', 'Text'], ['erase', 'Radierer']] as const).map(([id, label]) => <button key={id} className={button + (effectiveTool === id ? ' ring-2 ring-indigo-600' : '')} aria-pressed={effectiveTool === id} onClick={() => setTool(id)}>{label}</button>)}
      <label className="flex min-h-11 items-center gap-2 text-sm">Farbe <input aria-label="Stiftfarbe" type="color" value={color} onChange={e => setColor(e.target.value)} className="w-11 h-11" /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm">Strich <select aria-label="Strichstärke" value={width} onChange={e => setWidth(Number(e.target.value))} className={button}><option value={2}>Fein</option><option value={4}>Normal</option><option value={8}>Breit</option></select></label>
      <button className={button} disabled={!history.length} onClick={() => { setRedo(r => [...r, items]); apply(history[history.length - 1]); setHistory(h => h.slice(0, -1)); }}>Rückgängig</button>
      <button className={button} disabled={!redo.length} onClick={() => { setHistory(h => [...h, items]); apply(redo[redo.length - 1]); setRedo(r => r.slice(0, -1)); }}>Wiederholen</button>
      <button className={button} disabled={!items.some(item => item.text === undefined)} onClick={() => setConfirmClear('drawing')}>Zeichnung löschen</button>
      <button className={button} disabled={!items.some(item => item.text !== undefined)} onClick={() => setConfirmClear('text')}>Schrift löschen</button>
      <button className="min-h-11 px-4 rounded-lg bg-indigo-600 text-white font-semibold" onClick={onDone}>Fertig · Widgets bedienen</button>
      <span className="w-full text-center text-xs text-slate-600">{effectiveTool === 'erase' ? 'Strich oder Text antippen, um ihn zu entfernen.' : effectiveTool === 'text' ? 'Eine Stelle auf der Fläche antippen und Text eingeben.' : 'Direkt auf der Fläche schreiben – auch über Widgets.'}</span>
    </div>}
    {active && textAt && <form onSubmit={e => { e.preventDefault(); if (text.trim()) commit([...items, { id: crypto.randomUUID(), color, width, points: [textAt], text: text.trim() }]); setTextAt(null); }}
      className="absolute inset-x-4 top-4 z-[22000] flex flex-wrap gap-2 rounded-xl bg-white border border-slate-300 p-4 shadow-xl text-slate-900">
      <input autoFocus aria-label="Text auf der Fläche" placeholder="Text eingeben …" value={text} onChange={e => setText(e.target.value)} className="min-h-11 min-w-0 flex-1 p-3 rounded border border-slate-300" />
      <button className={button} type="submit">Einfügen</button><button className={button} type="button" onClick={() => setTextAt(null)}>Abbrechen</button>
    </form>}
    {active && confirmClear && <div role="dialog" aria-label={confirmClear === 'drawing' ? 'Zeichnung löschen' : 'Schrift löschen'} className="absolute top-4 inset-x-4 z-[22000] p-4 bg-white text-slate-900 rounded-xl border shadow-xl">
      <p className="mb-3">{confirmClear === 'drawing' ? 'Alle gezeichneten Striche auf dieser Fläche löschen? Texte und Widgets bleiben erhalten.' : 'Alle eingefügten Texte auf dieser Fläche löschen? Zeichnungen und Widgets bleiben erhalten.'}</p>
      <div className="flex gap-2"><button className={button} onClick={() => {
        commit(confirmClear === 'drawing' ? items.filter(item => item.text !== undefined) : items.filter(item => item.text === undefined));
        setConfirmClear(null);
      }}>{confirmClear === 'drawing' ? 'Zeichnung löschen' : 'Schrift löschen'}</button><button className={button} onClick={() => setConfirmClear(null)}>Abbrechen</button></div>
    </div>}
  </>;
});
