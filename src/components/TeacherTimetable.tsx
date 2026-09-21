import React, { useMemo } from 'react';
import { AlertTriangle, CalendarDays, Plus, Settings2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { erstelleLehrerstundenplan } from '../lib/teacherTimetable';

export default function TeacherTimetable() {
  const { app, switchClass, setPage, setApp } = useApp();
  const plan = useMemo(() => erstelleLehrerstundenplan(app), [app]);
  const openSetup = (klasseId: string) => {
    if (klasseId !== app.activeClassId) switchClass(klasseId);
    setApp(prev => ({ ...prev, setupInitialStepMode: 'Stundenplan', currentPage: 'setup' }));
  };
  const openClass = (klasseId: string) => {
    if (klasseId !== app.activeClassId) switchClass(klasseId);
    setPage('schueler');
  };
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Unterstufe · Schuljahr {plan.schuljahr}</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Mein Lehrerstundenplan</h1>
          <p className="mt-2 text-sm text-[var(--text2)]">Deine Unterrichtsstunden aus {plan.klassenAnzahl} Unterstufenklassen. Die Stunden und Fächer bearbeitest du in der jeweiligen Klasse.</p>
        </div>
        <button type="button" onClick={() => setPage('setup_new')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text)] hover:bg-[var(--surface2)]">
          <Plus size={17} /> Weitere Klasse anlegen
        </button>
      </header>

      {plan.konflikte.length > 0 && (
        <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="flex items-center gap-2 font-extrabold"><AlertTriangle size={18} /> Zeitliche Überschneidungen prüfen</h2>
          <p className="mt-1">Diese Klassen sind zur gleichen Zeit eingetragen: {plan.konflikte.map(k => `${k.tag}, ${k.stunde}. Stunde (${k.eintraege.map(e => e.klasse).join(' / ')})`).join('; ')}. Die Einträge werden nicht automatisch überschrieben.</p>
        </section>
      )}

      {plan.klassenAnzahl === 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <CalendarDays className="mx-auto text-[var(--accent)]" size={32} />
          <h2 className="mt-3 text-lg font-black text-[var(--text)]">Noch keine Unterstufenklasse in diesem Schuljahr</h2>
          <p className="mt-1 text-sm text-[var(--text2)]">Lege zuerst eine Klasse an und wähle deine Unterrichtsfächer.</p>
          <button type="button" onClick={() => setPage('setup_new')} className="mt-4 rounded-xl bg-[var(--accent)] px-5 py-2 font-bold text-white">Klasse anlegen</button>
        </section>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full min-w-[740px] table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Eigene Unterrichtsstunden, Montag bis Freitag</caption>
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="w-20 p-3 text-[var(--text2)]">Std.</th>
                  {plan.tage.map(tag => <th scope="col" key={tag} className="p-3 text-[var(--text)]">{tag}</th>)}
                </tr>
              </thead>
              <tbody>
                {plan.stunden.filter(n => plan.zeilen.some(e => e.stunde === n)).map(stunde => (
                  <tr key={stunde} className="border-b border-[var(--border)] last:border-b-0">
                    <th scope="row" className="p-3 align-top font-bold text-[var(--text2)]">{stunde}.</th>
                    {plan.tage.map(tag => {
                      const eintraege = plan.zeilen.filter(e => e.tag === tag && e.stunde === stunde);
                      return (
                        <td key={tag} className="border-l border-[var(--border)] p-2 align-top">
                          <div className="space-y-2">
                            {eintraege.map(e => (
                              <button key={e.klasseId} type="button" onClick={() => openClass(e.klasseId)}
                                title={`${e.klasse} · ${e.fach} · Schüler:innen öffnen`}
                                className={`block w-full rounded-xl border p-2 text-left hover:border-[var(--accent)] hover:bg-[var(--surface2)] ${eintraege.length > 1 ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text)]'}`}>
                                <span className="block font-extrabold">{e.klasse}</span>
                                <span className="mt-0.5 block break-words text-xs">{e.fach}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plan.zeilen.length === 0 && <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text2)]">Noch keine Fachstunden eingetragen. Wähle eine Klasse und trage im Stundenplan deine Unterrichtsstunden ein.</p>}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="flex items-center gap-2 font-extrabold text-[var(--text)]"><Users size={18} /> Meine Klassen</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(app.classes || []).filter(c => (c.schulart === 'mittelschule' || c.schulart === 'ahs_unterstufe') && (c.schuljahr || app.schuljahr) === plan.schuljahr).map(c => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3">
                  <button type="button" onClick={() => openClass(c.id)} className="text-left text-sm font-bold text-[var(--text)] hover:underline">{c.name} <span className="block text-xs font-normal text-[var(--text2)]">{c.stufe}. Schulstufe · {c.faecher?.join(', ') || 'Noch keine Fächer'}</span></button>
                  <button type="button" aria-label={`Stundenplan für ${c.name} bearbeiten`} onClick={() => openSetup(c.id)} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text)] hover:bg-[var(--surface2)]"><Settings2 size={16} /></button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
