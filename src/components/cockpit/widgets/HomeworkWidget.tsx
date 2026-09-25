import React, { useMemo, useRef, useState } from 'react';
import { useWidgetSize } from '../widgetLayout';
import { useApp } from '../../../context/AppContext';
import { getKW } from '../../../lib/utils';
import { homeworkForWeek } from '../../../lib/dailyHomework';
import type { HomeworkAssignment } from '../../../types';

function localDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return year && month && day ? day + '.' + month + '.' : iso;
}

/** Read-only pupil-safe rendering: no names, grades or private teacher notes. */
export function HomeworkList({ items, compact = false }: { items: readonly HomeworkAssignment[]; compact?: boolean }) {
  if (!items.length) return <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
    Für diese Woche sind noch keine Hausübungen eingetragen.
  </p>;
  return <div className={compact ? 'space-y-1.5' : 'grid grid-cols-1 gap-3 sm:grid-cols-2'}>
    {items.map(item => <article key={item.id} className={`min-w-0 rounded-xl border-2 border-amber-200 bg-white ${compact ? 'p-2' : 'p-3'} text-slate-900`}>
      <p className="text-sm font-extrabold text-amber-800">📚 {item.fach} · aufgegeben {localDate(item.aufgegebenAm)}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-base font-semibold leading-snug">{item.aufgabe}</p>
      <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-sm font-black text-amber-900">
        📅 Bis {localDate(item.faelligAm)}
      </p>
    </article>)}
  </div>;
}

export default function HomeworkWidget() {
  const { app } = useApp();
  const containerRef = useRef<HTMLElement>(null);
  const size = useWidgetSize(containerRef);
  const compact = size.width < 760 || size.height < 400;
  const tiny = size.width < 520 || size.height < 300;
  const todayWeek = getKW(new Date());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const week = selectedWeek ?? app.currentKW ?? todayWeek;
  const items = useMemo(() => homeworkForWeek(app, week),
    [app.hausuebungen, app.schuljahr, app.bundesland, week]);
  return <section ref={containerRef} aria-label="Hausübungen der Klasse"
    className="classroom-homework-widget flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-amber-400 bg-amber-50 text-slate-950">
    <header className={`flex shrink-0 flex-wrap items-center justify-between border-b border-amber-300 bg-amber-100 ${tiny ? 'gap-1 p-1' : compact ? 'gap-1 p-1.5' : 'gap-2 p-3'}`}>
      <div className="min-w-0"><h2 className={`font-black leading-tight ${tiny ? 'text-sm' : compact ? 'text-base' : 'text-xl'}`}>📚 Unsere Hausübungen</h2>
        <p className="text-xs font-bold text-amber-900">KW {week} · {items.length} {items.length === 1 ? 'Hausübung' : 'Hausübungen'}</p></div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Vorherige HÜ-Woche" disabled={week <= 1}
          onClick={() => setSelectedWeek(Math.max(1, week - 1))}
          className={`min-h-11 min-w-11 rounded-xl border border-amber-300 bg-white text-xl font-bold disabled:opacity-40`}>‹</button>
        <button type="button" onClick={() => setSelectedWeek(todayWeek)}
          className={`min-h-11 rounded-xl border border-amber-300 bg-white px-2 text-sm font-bold`}>Heute</button>
        <button type="button" aria-label="Nächste HÜ-Woche" disabled={week >= 53}
          onClick={() => setSelectedWeek(Math.min(53, week + 1))}
          className={`min-h-11 min-w-11 rounded-xl border border-amber-300 bg-white text-xl font-bold disabled:opacity-40`}>›</button>
      </div>
    </header>
    <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${compact ? 'p-1.5' : 'p-3'}`}><HomeworkList items={items} compact={compact} /></div>
  </section>;
}
