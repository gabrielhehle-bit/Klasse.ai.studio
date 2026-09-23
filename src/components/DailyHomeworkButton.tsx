import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import type { HomeworkAssignment } from '../types';
import { homeworkForDay, upsertHomework } from '../lib/dailyHomework';

/** One independent homework action per calendar day; no lesson slot is required. */
export default function DailyHomeworkButton({ day, date }: { day: string; date: string }) {
  const { app, setApp } = useApp();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fach, setFach] = useState('');
  const [aufgabe, setAufgabe] = useState('');
  const [faelligAm, setFaelligAm] = useState('');
  const [error, setError] = useState('');
  const classId = app.activeClassId;
  const year = app.schuljahr;
  const entries = homeworkForDay(app.hausuebungen, date, year);
  useEffect(() => { setOpen(false); setEditingId(null); setFach(''); setAufgabe(''); setFaelligAm(''); setError(''); }, [classId, year, date]);

  const clear = () => { setEditingId(null); setFach(''); setAufgabe(''); setFaelligAm(''); setError(''); };
  const edit = (entry: HomeworkAssignment) => {
    setEditingId(entry.id);
    setFach(entry.fach);
    setAufgabe(entry.aufgabe);
    setFaelligAm(entry.faelligAm);
    setError('');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const item = { id: editingId || crypto.randomUUID(), aufgegebenAm: date,
      faelligAm, fach, aufgabe, schuljahr: year };
    let valid: HomeworkAssignment[];
    try { valid = upsertHomework(entries, item); } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Hausübung konnte nicht gespeichert werden.');
      return;
    }
    const owner = classId, ownerYear = year;
    setApp(prev => {
      if (prev.activeClassId !== owner || prev.schuljahr !== ownerYear) return prev;
      const latest = prev.hausuebungen || [];
      // Editing may only replace this class's original entry, never another class.
      if (editingId && !latest.some(entry => entry.id === editingId && entry.aufgegebenAm === date && entry.schuljahr === ownerYear)) return prev;
      return { ...prev, hausuebungen: upsertHomework(latest, valid.find(entry => entry.id === item.id)!) };
    });
    clear();
  };
  const remove = (id: string) => {
    if (!window.confirm('Diese Hausübung löschen?')) return;
    const owner = classId, ownerYear = year;
    setApp(prev => {
      if (prev.activeClassId !== owner || prev.schuljahr !== ownerYear) return prev;
      return { ...prev, hausuebungen: (prev.hausuebungen || []).filter(entry =>
        !(entry.id === id && entry.aufgegebenAm === date && entry.schuljahr === ownerYear)) };
    });
    if (editingId === id) clear();
  };
  return <>
    <button type="button" onClick={() => setOpen(true)}
      aria-label={'Hausübung für ' + day + ' ' + date + ' eintragen'}
      className="mt-1 min-h-9 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900 shadow-sm hover:bg-amber-100">
      📚 HÜ {entries.length ? '· ' + entries.length : '+ hinzufügen'}
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div role="presentation" className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-3"
        onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label={'Hausübungen ' + day + ' ' + date}
          className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 p-4">
            <div><h2 className="text-xl font-black">📚 Hausübungen</h2>
              <p className="text-sm text-slate-600">{day} · {date.split('-').reverse().join('.')}</p></div>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 rounded-xl border border-slate-300 text-lg font-bold" aria-label="Hausübungen schließen">✕</button>
          </header>
          <div className="min-h-0 space-y-4 overflow-y-auto p-4">
            {entries.length > 0 && <section aria-label="Eingetragene Hausübungen" className="space-y-2">
              {entries.map(entry => <article key={entry.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-black">{entry.fach} · bis {entry.faelligAm.split('-').reverse().join('.')}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{entry.aufgabe}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => edit(entry)} className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold">Bearbeiten</button>
                  <button type="button" onClick={() => remove(entry.id)} className="min-h-10 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700">Löschen</button>
                </div>
              </article>)}
            </section>}
            <form className="space-y-3" onSubmit={submit}>
              <h3 className="font-black">{editingId ? 'Hausübung bearbeiten' : 'Neue Hausübung'}</h3>
              <label className="block text-sm font-bold">Fach
                <input list={'hue-faecher-' + date} value={fach} onChange={event => setFach(event.target.value)}
                  required maxLength={100} placeholder="z. B. Deutsch"
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3" />
                <datalist id={'hue-faecher-' + date}>{(app.faecher || []).map(subject => <option key={subject} value={subject} />)}</datalist>
              </label>
              <label className="block text-sm font-bold">Welche Hausübung?
                <textarea value={aufgabe} onChange={event => setAufgabe(event.target.value)}
                  required maxLength={2000} rows={3} placeholder="z. B. Arbeitsheft Seite 12, Aufgabe 1–3"
                  className="mt-1 w-full resize-y rounded-xl border border-slate-300 bg-white p-3" />
              </label>
              <label className="block text-sm font-bold">Bis wann?
                <input type="date" value={faelligAm} min={date}
                  onChange={event => setFaelligAm(event.target.value)} required
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3" />
              </label>
              {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="min-h-11 rounded-xl bg-amber-600 px-5 text-sm font-black text-white">Hausübung speichern</button>
                {editingId && <button type="button" onClick={clear} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold">Abbrechen</button>}
              </div>
            </form>
          </div>
        </section>
      </div>, document.body)}
  </>;
}
