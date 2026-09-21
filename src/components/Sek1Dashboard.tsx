import React, { useMemo } from 'react';
import { CalendarDays, CalendarRange, Users, ClipboardCheck, BookOpen, Printer, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getKW, getTodayName } from '../lib/utils';
import { erstelleLehrerstundenplan } from '../lib/teacherTimetable';

/** Fachlehrpersonen starten mit ihrem gesamten Unterrichtstag, nicht nur der aktiven Klasse. */
export default function Sek1Dashboard() {
  const { app, switchClass, setPage } = useApp();
  const plan = useMemo(() => erstelleLehrerstundenplan(app), [app]);
  const now = new Date();
  const weekday = getTodayName(now);
  const kw = getKW(now);
  const heute = plan.zeilen.filter(e => e.tag === weekday).sort((a, b) => a.stunde - b.stunde);
  const todayConflicts = plan.konflikte.filter(k => k.tag === weekday);
  const openClass = (klasseId: string) => {
    if (klasseId !== app.activeClassId) switchClass(klasseId);
    setPage('schueler');
  };

  const quickLinks = [
    { id: 'stundenplan', title: 'Mein Lehrerstundenplan', icon: CalendarDays },
    { id: 'wochenplanung', title: 'Wochenplanung', icon: CalendarDays },
    { id: 'jahresplanung', title: 'Jahresplanung', icon: CalendarRange },
    { id: 'schueler', title: 'Schüler:innen', icon: Users },
    { id: 'noten', title: 'Notenmappe', icon: BookOpen },
    { id: 'anwesenheit', title: 'Anwesenheit', icon: ClipboardCheck },
    { id: 'drucken', title: 'Druckzentrum', icon: Printer },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Unterstufe · {plan.klassenAnzahl} Klassen · {plan.schuljahr}</p>
        <h1 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">Mein Unterricht · Heute</h1>
        <p className="mt-2 text-sm text-[var(--text2)]">
          {new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}
          {' · '}Aktuell ausgewählt: {app.klassenbezeichnung || 'Keine Klasse'}
        </p>
      </header>

      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Mein Lehrerstundenplan · KW {kw}</p>
            <h2 className="mt-1 text-lg font-black text-[var(--text)]">{weekday || 'Heute ist unterrichtsfrei'}</h2>
          </div>
          <button type="button" onClick={() => setPage('stundenplan')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--text)] hover:bg-[var(--surface2)]">Ganzen Stundenplan öffnen</button>
        </div>
        {todayConflicts.length > 0 && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950"><AlertTriangle size={16} /> Mehrfach belegte Unterrichtsstunden – bitte im Lehrerstundenplan prüfen.</p>}
        {heute.length > 0 ? (
          <div className="mt-5 space-y-2">
            {heute.map(e => (
              <button key={`${e.klasseId}-${e.stunde}`} type="button" onClick={() => openClass(e.klasseId)}
                className="flex w-full items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 text-left hover:border-[var(--accent)]">
                <span className="min-w-16 text-sm font-bold text-[var(--text2)]">{e.stunde}. Std.</span>
                <span className="min-w-0"><span className="block font-semibold text-[var(--text)]">{e.klasse} · {e.fach}</span><span className="text-xs text-[var(--text2)]">Schüler:innen dieser Klasse öffnen</span></span>
              </button>
            ))}
          </div>
        ) : <p className="mt-5 text-sm text-[var(--text2)]">{weekday ? 'Für heute sind noch keine eigenen Unterrichtsstunden eingetragen.' : 'Für heute gibt es keinen regulären Stundenplan.'}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-lg font-black text-[var(--text)]">Direkt öffnen</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(({ id, title, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setPage(id)}
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left font-bold text-[var(--text)] shadow-sm hover:border-[var(--accent)]/40 hover:bg-[var(--surface2)]">
              <Icon size={20} className="text-[var(--accent)]" />{title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
