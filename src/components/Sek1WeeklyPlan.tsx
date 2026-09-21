import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Save, Settings2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TAGE_NAMEN, LESSON_SLOT_NUMBERS } from '../constants';
import { getKW } from '../lib/utils';
import { faecherFuerKlasse } from '../lib/sek1Subjects';

type Slot = { tag: string; stunde: number; fach: string; thema: string; material: string; housework: string };
const fachSlot = (v: unknown) => String(v || '').trim();

/** Sek-I: nur die Unterrichtsstunden/Fächer der aktiven Klasse, ohne Kinder-Wochenplanung. */
export default function Sek1WeeklyPlan() {
  const { app, setApp, setPage } = useApp();
  const [kw, setKw] = useState(() => app.currentKW || getKW(new Date()));
  const [editing, setEditing] = useState<Slot | null>(null);
  const [saveState, setSaveState] = useState('');
  const subjects = faecherFuerKlasse(app);
  const lessons = useMemo(() => TAGE_NAMEN.flatMap(tag => {
    const daySlots = app.tageplan?.[tag]?.stunden;
    const already = app.wochenplanung?.[kw]?.[tag] || {};
    const planned = app.stammplan?.[tag] || {};
    const hours = [...new Set([
      ...(Array.isArray(daySlots) ? daySlots : []),
      ...Object.keys(planned).map(Number),
      ...Object.keys(already).map(Number).map(i => i + 1),
    ])].filter(hour => LESSON_SLOT_NUMBERS.includes(hour as typeof LESSON_SLOT_NUMBERS[number])).sort((a, b) => a - b);
    return hours.flatMap(stunde => {
      const saved = already[stunde - 1] || {};
      const fach = fachSlot(saved.fach || planned[stunde]);
      if (!subjects.includes(fach)) return [];
      return [{ tag, stunde, fach, thema: fachSlot(saved.thema), material: fachSlot(saved.material), housework: fachSlot(saved.housework || saved.hue) }];
    });
  }), [app.tageplan, app.stammplan, app.wochenplanung, kw, subjects.join('\u0000')]);

  const saveLesson = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !subjects.includes(editing.fach)) return;
    const {tag, stunde, fach, thema, material, housework} = editing;
    setApp(prev => {
      const weeks = {...(prev.wochenplanung || {})};
      const week = {...(weeks[kw] || {})};
      const day = {...(week[tag] || {})};
      const existing = day[stunde - 1] || {};
      day[stunde - 1] = {...existing, fach, thema: thema.trim(), material: material.trim(), housework: housework.trim()};
      week[tag] = day;
      weeks[kw] = week;
      return {...prev, wochenplanung: weeks, currentKW: kw};
    });
    setEditing(null);
    setSaveState('Unterrichtseinheit gespeichert.');
  };

  const openLesson = (slot: Slot) => {setSaveState(''); setEditing({...slot});};
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">{app.klassenbezeichnung} · Meine Unterrichtsfächer</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Wochenplanung</h1>
          <p className="mt-1 text-sm text-[var(--text2)]">Unterrichtsthema, Material und Hausübung – ausschließlich für deine ausgewählten Fächer. Keine Kinder-Wochenpläne.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-2">
          <button type="button" aria-label="Vorherige Kalenderwoche" onClick={() => {setKw(k => k > 1 ? k - 1 : 53); setEditing(null);}} className="rounded-lg p-2 hover:bg-[var(--surface2)]"><ChevronLeft size={18}/></button>
          <span className="px-1 text-sm font-bold text-[var(--text)]">KW {kw}</span>
          <button type="button" aria-label="Nächste Kalenderwoche" onClick={() => {setKw(k => k < 53 ? k + 1 : 1); setEditing(null);}} className="rounded-lg p-2 hover:bg-[var(--surface2)]"><ChevronRight size={18}/></button>
        </div>
      </header>
      {saveState && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><Check className="mr-1 inline" size={16}/>{saveState}</p>}
      {subjects.length === 0 ? <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--text)]">Du hast in dieser Klasse noch keine Unterrichtsfächer ausgewählt.</p>
        <button type="button" onClick={() => setApp(prev => ({...prev, setupInitialStepMode: 'Fächer', currentPage: 'setup'}))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white"><Settings2 size={16}/> Fächer einrichten</button>
      </section> :
      <section className="space-y-4">
        <p className="text-xs text-[var(--text2)]">Fächer: <strong>{subjects.join(' · ')}</strong> · Dein klassenübergreifender Plan ist unter „Mein Stundenplan“ erreichbar.</p>
        {TAGE_NAMEN.map(tag => {
          const day = lessons.filter(s => s.tag === tag);
          return <div key={tag} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="font-extrabold text-[var(--text)]">{tag}</h2>
            {day.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {day.map(slot => <button type="button" key={slot.stunde} onClick={() => openLesson(slot)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3 text-left hover:border-[var(--accent)]">
                <span className="text-xs font-semibold text-[var(--text2)]">{slot.stunde}. Stunde · {slot.fach}</span>
                <span className="mt-1 block text-sm font-bold text-[var(--text)]">{slot.thema || 'Thema eintragen'}</span>
                {slot.material && <span className="mt-1 block text-xs text-[var(--text2)]">Material: {slot.material}</span>}
              </button>)}
            </div> : <p className="mt-2 text-sm text-[var(--text2)]">Keine deiner Fachstunden eingetragen.</p>}
          </div>;
        })}
      </section>}
      {subjects.length > 0 && lessons.length === 0 && <button type="button" onClick={() => setApp(prev => ({...prev, setupInitialStepMode: 'Stundenplan', currentPage: 'setup'}))}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text)]"><CalendarDays size={16}/> Unterrichtsstunden dieser Klasse einrichten</button>}
      {editing && <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto bg-black/50 p-4" role="presentation" onClick={() => setEditing(null)}>
        <form role="dialog" aria-modal="true" aria-label="Unterrichtseinheit bearbeiten" onClick={e => e.stopPropagation()} onSubmit={saveLesson} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
          <h2 className="text-lg font-black">{editing.tag} · {editing.stunde}. Stunde</h2>
          <label className="block text-sm font-semibold">Mein Fach<select value={editing.fach} onChange={e => setEditing(v => v && ({...v, fach: e.target.value}))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">{subjects.map(f => <option key={f} value={f}>{f}</option>)}</select></label>
          {([['thema', 'Unterrichtsthema / Lernziel'], ['material', 'Materialien'], ['housework', 'Hausübung / Arbeitsauftrag']] as const).map(([key,label]) => <label key={key} className="block text-sm font-semibold">{label}<textarea value={editing[key]} onChange={e => setEditing(v => v && ({...v,[key]: e.target.value}))} rows={key === 'thema' ? 2 : 1} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"/></label>)}
          <p className="text-xs text-slate-600">Bestehende weitere Unterrichtsdaten bleiben erhalten. Aufgaben für einzelne Kinder werden hier nicht erstellt oder veröffentlicht.</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-4 py-2">Abbrechen</button><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white"><Save size={16}/> Speichern</button></div>
        </form>
      </div>}
    </main>
  );
}
