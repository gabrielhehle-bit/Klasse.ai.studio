import React, { useMemo, useState } from 'react';
import { Check, Circle, NotebookPen, Plus, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { logObservation } from '../lib/utils';

/** Mobile-first composer over the EXISTING class notes and dashboardTodos. */
export default function MobileNotes() {
  const { app, setApp, accountSyncStatus } = useApp();
  const [mode, setMode] = useState<'note' | 'todo'>('note');
  const [draft, setDraft] = useState('');
  const [studentId, setStudentId] = useState('');
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const students = useMemo(
    () => [...(app.schueler || [])].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')),
    [app.schueler],
  );
  const studentNames = useMemo(
    () => new Map(students.map(student => [student.id, `${student.vorname} ${student.nachname}`])),
    [students],
  );
  const entries = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('de-AT');
    return (app.notes || [])
      .filter(entry => !needle || [entry.inhalt, entry.kategorie, studentNames.get(entry.schuelerId || '') || '']
        .some(value => String(value || '').toLocaleLowerCase('de-AT').includes(needle)))
      .sort((a, b) => (new Date(b.datum).getTime() || 0) - (new Date(a.datum).getTime() || 0));
  }, [app.notes, search, studentNames]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (mode === 'todo') {
      setApp(prev => ({
        ...prev,
        dashboardTodos: [
          { id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, done: false },
          ...(prev.dashboardTodos || []),
        ],
      }));
    } else {
      logObservation(setApp, studentId || undefined, text, 'Notiz', 'KLASSIO Mobile');
    }
    setDraft('');
    setSaved(true);
  };

  return (
    <div className="space-y-4 pb-5" data-testid="klassio-mobile-notes">
      <form onSubmit={submit} className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex gap-2" role="group" aria-label="Eintragsart">
          <button type="button" onClick={() => { setMode('note'); setSaved(false); }}
            className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${mode === 'note' ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-700'}`}>
            Notiz
          </button>
          <button type="button" onClick={() => { setMode('todo'); setSaved(false); }}
            className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${mode === 'todo' ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-700'}`}>
            To-do
          </button>
        </div>
        {mode === 'note' && (
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Für wen?
            <select
              value={studentId}
              onChange={event => { setStudentId(event.target.value); setSaved(false); }}
              className="mt-2 min-h-12 w-full rounded-xl border border-violet-100 bg-[#faf9ff] px-3 text-slate-800"
            >
              <option value="">Allgemeine Klassennotiz</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>{student.vorname} {student.nachname}</option>
              ))}
            </select>
          </label>
        )}
        <label htmlFor="klassio-mobile-note-input" className="mb-2 block text-sm font-semibold text-slate-700">
          {mode === 'note' ? 'Deine Notiz' : 'Dein To-do'}
        </label>
        <textarea id="klassio-mobile-note-input" rows={4} value={draft}
          placeholder={mode === 'note' ? 'Hier schnell etwas festhalten …' : 'Was ist zu erledigen?'}
          onChange={event => { setDraft(event.target.value); setSaved(false); }}
          className="w-full resize-y rounded-2xl border border-violet-100 bg-[#faf9ff] p-3 text-base leading-relaxed text-slate-900 outline-none focus:border-violet-500" />
        <button type="submit" disabled={!draft.trim()}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-base font-bold text-white disabled:opacity-40">
          <Plus size={19} /> {mode === 'note' ? 'Notiz speichern' : 'To-do speichern'}
        </button>
        {saved && (
          <p role="status" className="mt-2 text-sm text-violet-700">
            Gespeichert in KLASSIO. {accountSyncStatus === 'synced'
              ? 'Der neueste Stand ist auf dem Server bestätigt.'
              : 'Der geräteübergreifende Abgleich kann noch laufen.'}
          </p>
        )}
      </form>
      {mode === 'todo' ? (
        <section className="space-y-2" aria-label="Offene Aufgaben">
          <h2 className="px-1 text-sm font-extrabold text-slate-700">Deine Aufgaben</h2>
          {(app.dashboardTodos || []).map(todo => (
            <button
              type="button" key={todo.id}
              onClick={() => setApp(prev => ({
                ...prev,
                dashboardTodos: (prev.dashboardTodos || []).map(item =>
                  item.id === todo.id ? { ...item, done: !item.done } : item),
              }))}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3 text-left shadow-sm"
              aria-pressed={todo.done}
            >
              {todo.done ? <Check size={22} className="shrink-0 text-violet-700" /> : <Circle size={22} className="shrink-0 text-slate-400" />}
              <span className={todo.done ? 'break-words text-slate-500 line-through' : 'break-words text-slate-800'}>{todo.text}</span>
            </button>
          ))}
        </section>
      ) : (
        <section className="space-y-2" aria-label="Gespeicherte Notizen">
          <h2 className="px-1 text-sm font-extrabold text-slate-700">Letzte Notizen</h2>
          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-violet-100 bg-white px-3">
            <Search size={19} className="shrink-0 text-violet-600" />
            <span className="sr-only">Notizen durchsuchen</span>
            <input value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Notizen suchen" className="w-full bg-transparent text-base outline-none" />
          </label>
          {entries.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">Keine passenden Notizen.</p>}
          {entries.slice(0, 30).map(entry => (
            <article key={entry.id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-violet-700">
                <NotebookPen size={15} />
                <span>{studentNames.get(entry.schuelerId || '') || 'Allgemein'}</span>
                <span className="text-slate-400">·</span>
                <time className="text-slate-500">{Number.isFinite(Date.parse(entry.datum)) ? new Date(entry.datum).toLocaleDateString('de-AT') : ''}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">{entry.inhalt}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
