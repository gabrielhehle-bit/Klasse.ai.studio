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
export function HomeworkList({ items, compact = false, roomy = false, columns = 2 }: {
  items: readonly HomeworkAssignment[];
  compact?: boolean;
  roomy?: boolean;
  columns?: number;
}) {
  if (!items.length) return <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
    Für diese Woche sind noch keine Hausübungen eingetragen.
  </p>;
  return <div className={compact ? 'space-y-1.5' : 'grid gap-3'} style={compact ? undefined : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {items.map(item => <article key={item.id} className={`min-w-0 rounded-xl border border-slate-200 bg-white ${compact ? 'p-2' : roomy ? 'p-5' : 'p-3'} text-slate-900 shadow-xs dark:border-white/10 dark:bg-zinc-900 dark:text-slate-100`}>
      <p className={`${roomy ? 'text-base' : 'text-sm'} font-extrabold text-accent`}>📚 {item.fach} · aufgegeben {localDate(item.aufgegebenAm)}</p>
      <p className={`${roomy ? 'mt-2 text-xl' : 'mt-1 text-base'} whitespace-pre-wrap break-words font-semibold leading-snug`}>{item.aufgabe}</p>
      <p className={`${roomy ? 'mt-4 px-3 py-2 text-base' : 'mt-2 px-2 py-1 text-sm'} rounded-lg bg-accent-soft font-black text-accent`}>
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
  const roomy = size.width >= 980 && size.height >= 520;
  const columns = size.width >= 1280 ? 3 : size.width >= 760 ? 2 : 1;
  const todayWeek = getKW(new Date());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const week = selectedWeek ?? app.currentKW ?? todayWeek;
  const items = useMemo(() => homeworkForWeek(app, week),
    [app.hausuebungen, app.schuljahr, app.bundesland, week]);
  return <section
    ref={containerRef}
    aria-label="Hausübungen der Klasse"
    className="classroom-homework-widget flex h-full min-h-0 flex-col overflow-hidden text-slate-950 dark:text-slate-100"
  >
    <div className={`flex min-h-11 shrink-0 flex-wrap items-center justify-between border-b border-slate-200 dark:border-white/10 ${tiny ? 'gap-1 px-1.5 py-1' : compact ? 'gap-1 px-2 py-1.5' : 'gap-2 px-3 py-2'}`}>
      <p className="min-w-0 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
        KW {week} · {items.length} {items.length === 1 ? 'Hausübung' : 'Hausübungen'}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Vorherige HÜ-Woche"
          disabled={week <= 1}
          onClick={() => setSelectedWeek(Math.max(1, week - 1))}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-white/15 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setSelectedWeek(todayWeek)}
          className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition-colors ${
            week === todayWeek
              ? 'border-accent bg-accent text-accent-text'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-accent-soft hover:text-accent dark:border-white/15 dark:bg-zinc-800 dark:text-slate-200'
          }`}
        >
          Heute
        </button>
        <button
          type="button"
          aria-label="Nächste HÜ-Woche"
          disabled={week >= 53}
          onClick={() => setSelectedWeek(Math.min(53, week + 1))}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-white/15 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700"
        >
          ›
        </button>
      </div>
    </div>
    <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${compact ? 'p-1.5' : 'p-3'}`}>
      <HomeworkList items={items} compact={compact} roomy={roomy} columns={columns} />
    </div>
  </section>;
}
