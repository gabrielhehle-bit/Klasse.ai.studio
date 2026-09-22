import React from 'react';
import { ArrowRight, CalendarDays, ClipboardCheck, ListTodo } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getKW, getTodayName } from '../lib/utils';
import { STUNDEN_INFO, MAX_LESSON_SLOTS } from '../constants';

interface MobileTodayProps {
  onNavigate: (page: 'anwesenheit' | 'wochenplanung' | 'verhalten') => void;
}

/** Native phone overview, sourced only from the active encrypted classroom. */
export default function MobileToday({ onNavigate }: MobileTodayProps) {
  const { app } = useApp();
  const date = new Date();
  const day = getTodayName(date);
  const kw = app.currentKW || getKW(date);
  const plannedDay: any = day ? app.wochenplanung?.[kw]?.[day] || {} : {};
  const timetable: any = day ? app.stammplan?.[day] || {} : {};
  const lessons: { id: number; subject: string; topic: string; time: string }[] = [];

  for (let hour = 1; hour <= MAX_LESSON_SLOTS; hour++) {
    const planned = plannedDay[hour - 1];
    const slot = timetable[hour];
    const subject = planned?.fach || (typeof slot === 'string' ? slot : slot?.fach) || '';
    if (!subject) continue;
    lessons.push({
      id: hour,
      subject: String(subject),
      topic: String(planned?.thema || planned?.inhalt || ''),
      time: String((app.stundenZeiten || STUNDEN_INFO)[hour] || ''),
    });
  }

  const openTodos = (app.dashboardTodos || []).filter(todo => !todo.done);

  return (
    <div className="space-y-4 pb-5" data-testid="klassio-mobile-today">
      <section className="rounded-3xl bg-violet-700 px-5 py-5 text-white shadow-md">
        <p className="text-sm font-semibold text-violet-100">
          {date.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold">Dein Schultag</h2>
        <p className="mt-1 text-sm text-violet-100">
          {lessons.length === 1 ? 'Eine geplante Stunde' : `${lessons.length} geplante Stunden`}
        </p>
        <button type="button" onClick={() => onNavigate('anwesenheit')}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-extrabold text-violet-800">
          <ClipboardCheck size={20} /> Anwesenheit prüfen <ArrowRight size={18} />
        </button>
      </section>

      <section className="space-y-2" aria-label="Stunden heute">
        <div className="flex items-center justify-between gap-3 px-1">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-800">
            <CalendarDays size={19} className="text-violet-700" /> Unterricht
          </h3>
          <button type="button" onClick={() => onNavigate('wochenplanung')}
            className="min-h-10 text-sm font-semibold text-violet-700">Wochenplan →</button>
        </div>
        {lessons.length ? lessons.map(lesson => (
          <article key={lesson.id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-violet-600">{lesson.id}. Stunde{lesson.time ? ` · ${lesson.time}` : ''}</p>
            <p className="mt-1 text-base font-extrabold text-slate-800">{lesson.subject}</p>
            {lesson.topic && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{lesson.topic}</p>}
          </article>
        )) : (
          <p className="rounded-2xl border border-violet-100 bg-white p-4 text-sm text-slate-600">
            Für heute sind keine Stunden eingetragen.
          </p>
        )}
      </section>
      <section aria-label="Offene To-dos" className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-extrabold text-slate-800">
            <ListTodo size={19} className="text-violet-700" /> Offene To-dos
          </h3>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">{openTodos.length}</span>
        </div>
        {openTodos.slice(0, 3).map(todo => (
          <p key={todo.id} className="mt-3 break-words border-t border-violet-50 pt-3 text-sm text-slate-700">{todo.text}</p>
        ))}
        <button type="button" onClick={() => onNavigate('verhalten')}
          className="mt-3 min-h-11 w-full rounded-xl bg-violet-50 px-3 text-sm font-bold text-violet-700">
          Notizen & To-dos öffnen
        </button>
      </section>
    </div>
  );
}
