import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getKW, getTodayName } from '../lib/utils';
import { STUNDEN_INFO, MAX_LESSON_SLOTS } from '../constants';

const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'] as const;
type SchoolDay = typeof weekdays[number];

/** Compact phone reader for the EXISTING weekly plan (no parallel mobile plan). */
export default function MobileWeeklyPlan() {
  const { app } = useApp();
  const [day, setDay] = useState<SchoolDay>(() => {
    const today = getTodayName(new Date());
    return weekdays.find(value => value === today) || 'Montag';
  });
  const kw = app.currentKW || getKW(new Date());

  const { lessons, extras } = useMemo(() => {
    const scheduled: { id: number; subject: string; topic: string; time: string }[] = [];
    const plan: any = app.wochenplanung?.[kw]?.[day] || {};
    const timetable: any = app.stammplan?.[day] || {};
    for (let hour = 1; hour <= MAX_LESSON_SLOTS; hour++) {
      const entry = plan[hour - 1];
      const base = timetable[hour];
      const subject = entry?.fach || (typeof base === 'string' ? base : base?.fach) || '';
      if (!subject && !entry?.thema && !entry?.inhalt) continue;
      scheduled.push({
        id: hour,
        subject: String(subject || 'Unterricht'),
        topic: String(entry?.thema || entry?.inhalt || ''),
        time: String((app.stundenZeiten || STUNDEN_INFO)[hour] || ''),
      });
    }
    const extras = (Array.isArray(plan.zeitunabhaengig) ? plan.zeitunabhaengig : [])
      .map((entry: any, idx: number) => ({
        id: String(entry.id || idx), text: String(entry.thema || entry.text || entry.inhalt || ''),
      }))
      .filter((entry: { text: string }) => entry.text);
    return { lessons: scheduled, extras };
  }, [app.wochenplanung, app.stammplan, app.stundenZeiten, kw, day]);

  return (
    <div className="space-y-4 pb-5" data-testid="klassio-mobile-week">
      <div className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
          <CalendarDays size={18} /> Kalenderwoche {kw}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-800">Deine Wochenplanung</h2>
        <p className="mt-1 text-sm text-slate-500">Stunden und Themen übersichtlich auf dem Handy.</p>
      </div>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Wochentag wählen">
        {weekdays.map((name) => (
          <button key={name} type="button" onClick={() => setDay(name)}
            aria-pressed={day === name}
            aria-label={name}
            className={`min-h-12 rounded-xl text-sm font-extrabold ${day === name
              ? 'bg-violet-700 text-white'
              : 'border border-violet-100 bg-white text-violet-700'}`}
          >
            {name.slice(0, 2)}
          </button>
        ))}
      </div>
      <section aria-label={`Stunden am ${day}`} className="space-y-2">
        <h3 className="px-1 text-base font-extrabold text-slate-800">{day}</h3>
        {lessons.map(lesson => (
          <article key={lesson.id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-violet-700">
              <BookOpen size={15} />
              <span>{lesson.id}. Stunde</span>
              {lesson.time && <span className="text-slate-500">{lesson.time}</span>}
            </div>
            <h4 className="text-base font-extrabold text-slate-800">{lesson.subject}</h4>
            {lesson.topic && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{lesson.topic}</p>}
          </article>
        ))}
        {extras.map(extra => (
          <article key={extra.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
            {extra.text}
          </article>
        ))}
        {!lessons.length && !extras.length && (
          <p className="rounded-2xl border border-violet-100 bg-white p-4 text-sm text-slate-500">
            Für diesen Tag ist noch nichts eingetragen.
          </p>
        )}
      </section>
      <p className="px-1 text-xs leading-relaxed text-slate-500">
        Die ausführliche Bearbeitung des Wochenplans bleibt vorerst in der PC-Ansicht verfügbar.
      </p>
    </div>
  );
}
