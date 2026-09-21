import React from 'react';
import { CalendarDays, CalendarRange, Users, ClipboardCheck, BookOpen, Printer, Settings2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getKW, getTodayName } from '../lib/utils';
import { SCHULARTEN, normalizeSchulart } from '../lib/schularten';
import { LESSON_SLOT_NUMBERS } from '../constants';

/**
 * Sek-I-Dashboard: verwendet ausschließlich aktuelle Klassendaten.
 * Keine Volksschul-Maskottchen, Diagnostik-Karten oder Links auf ausgeblendete Module.
 */
export default function Sek1Dashboard() {
  const { app, setApp, setPage } = useApp();
  const now = new Date();
  const weekday = getTodayName(now);
  const kw = getKW(now);
  const daysPlan = weekday ? (app.wochenplanung?.[kw]?.[weekday] || {}) : {};
  const defaultPlan = weekday ? (app.stammplan?.[weekday] || {}) : {};
  const dayConfig = weekday ? app.tageplan?.[weekday] : undefined;
  const configuredSlots: number[] = Array.isArray(dayConfig?.stunden)
    ? dayConfig.stunden
    : Object.keys(defaultPlan).map(Number);
  const slots = [...new Set(configuredSlots)]
    .filter(stunde => LESSON_SLOT_NUMBERS.includes(stunde as typeof LESSON_SLOT_NUMBERS[number]))
    .sort((a, b) => a - b);
  const schulart = normalizeSchulart(app.schulart);
  const schulartLabel = SCHULARTEN.find(item => item.id === schulart)?.label || 'Unterstufe';

  const openStundenplan = () => setApp(prev => ({
    ...prev,
    setupInitialStepMode: 'Stundenplan',
    currentPage: 'setup',
  }));

  const quickLinks = [
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
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">{schulartLabel} · {app.stufe}. Schulstufe</p>
        <h1 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">
          {app.klassenbezeichnung || 'Meine Klasse'} · Heute
        </h1>
        <p className="mt-2 text-sm text-[var(--text2)]">
          {new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}
          {' · '}{app.schueler?.length || 0} Schüler:innen · Schuljahr {app.schuljahr}
        </p>
      </header>

      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Stundenplan · KW {kw}</p>
            <h2 className="mt-1 text-lg font-black text-[var(--text)]">{weekday || 'Heute ist unterrichtsfrei'}</h2>
          </div>
          <button type="button" onClick={openStundenplan} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--text)] hover:bg-[var(--surface2)]">
            <Settings2 size={16} /> Stundenplan bearbeiten
          </button>
        </div>
        {weekday && slots.length > 0 ? (
          <div className="mt-5 space-y-2">
            {slots.map(stunde => {
              const entry = daysPlan[stunde - 1] || {};
              const fach = entry.fach || defaultPlan[stunde];
              return (
                <div key={stunde} className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3">
                  <span className="min-w-16 text-sm font-bold text-[var(--text2)]">{stunde}. Std.</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text)]">{fach || 'Noch kein Fach eingetragen'}</p>
                    {entry.thema && <p className="mt-0.5 text-sm text-[var(--text2)]">{entry.thema}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm text-[var(--text2)]">
            {weekday ? 'Für heute sind noch keine Unterrichtsstunden konfiguriert.' : 'Für heute gibt es keinen regulären Stundenplan.'}
          </p>
        )}
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
