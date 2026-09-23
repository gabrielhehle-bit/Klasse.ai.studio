import React from 'react';
import { useApp } from '../context/AppContext';
import { TAGE_NAMEN, LESSON_SLOT_NUMBERS, STUNDEN_INFO } from '../constants';
import type { PersonalLesson } from '../types';

/** Teacher-owned schedule, intentionally independent of the active classroom timetable. */
export default function PersonalTimetable() {
  const { app, setApp } = useApp();
  const year = app.schuljahr;
  const lessons = app.lehrerProfil?.stundenplanByYear?.[year] || [];
  const [editing, setEditing] = React.useState<{ tag: string; stunde: number } | null>(null);
  const [draft, setDraft] = React.useState<Pick<PersonalLesson, 'fach' | 'klasse' | 'raum'>>({ fach: '', klasse: '', raum: '' });
  const begin = (tag: string, stunde: number) => {
    const found = lessons.find(e => e.tag === tag && e.stunde === stunde);
    setEditing({ tag, stunde });
    setDraft({ fach: found?.fach || '', klasse: found?.klasse || '', raum: found?.raum || '' });
  };
  const save = () => {
    if (!editing) return;
    const entry: PersonalLesson = { ...editing, fach: draft.fach.trim(), klasse: draft.klasse.trim(), raum: draft.raum.trim() };
    setApp(prev => {
      const old = prev.lehrerProfil?.stundenplanByYear?.[year] || [];
      const next = old.filter(e => e.tag !== entry.tag || e.stunde !== entry.stunde);
      if (entry.fach || entry.klasse || entry.raum) next.push(entry);
      return {
        ...prev,
        lehrerProfil: {
          ...(prev.lehrerProfil || {}),
          stundenplanByYear: { ...(prev.lehrerProfil?.stundenplanByYear || {}), [year]: next },
        },
      };
    });
    setEditing(null);
  };
  const importClass = () => {
    const name = app.klassenbezeichnung || '';
    if (!name || !window.confirm(`Freie Stunden der Klasse ${name} in deinen persönlichen Plan übernehmen? Bestehende persönliche Stunden bleiben unverändert.`)) return;
    setApp(prev => {
      const old = prev.lehrerProfil?.stundenplanByYear?.[year] || [];
      const next = [...old];
      for (const tag of TAGE_NAMEN) {
        for (const stunde of LESSON_SLOT_NUMBERS) {
          if (!(prev.tageplan?.[tag]?.stunden || []).includes(stunde)) continue;
          const fach = prev.stammplan?.[tag]?.[stunde];
          if (!fach || next.some(e => e.tag === tag && e.stunde === stunde)) continue;
          next.push({ tag, stunde, fach, klasse: name, raum: '' });
        }
      }
      return { ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}), stundenplanByYear: { ...(prev.lehrerProfil?.stundenplanByYear || {}), [year]: next } } };
    });
  };
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-xl font-black text-[var(--text)]">Mein Stundenplan · {year}</h3><p className="text-sm text-[var(--text2)]">Deine Unterrichtsstunden, unabhängig vom aktuell gewählten Klassenstundenplan.</p></div>
        <button type="button" onClick={importClass} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold">Freie Stunden aus aktueller Klasse übernehmen</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
          <thead><tr><th scope="col" className="w-24 p-3">Std.</th>{TAGE_NAMEN.map(tag => <th key={tag} scope="col" className="p-3">{tag}</th>)}</tr></thead>
          <tbody>{LESSON_SLOT_NUMBERS.map(stunde => (
            <tr key={stunde} className="border-t border-[var(--border)]"><th scope="row" className="p-2 align-top">{stunde}.<small className="block font-normal">{STUNDEN_INFO[stunde] || ''}</small></th>
              {TAGE_NAMEN.map(tag => {
                const lesson = lessons.find(e => e.tag === tag && e.stunde === stunde);
                return <td key={tag} className="border-l border-[var(--border)] p-1 align-top">
                  <button type="button" onClick={() => begin(tag, stunde)} aria-label={`${tag}, ${stunde}. Stunde bearbeiten`} className="min-h-16 w-full rounded-xl p-2 text-left hover:bg-[var(--surface2)] hover:ring-2 hover:ring-[var(--accent)]">
                    <span className="block font-bold">{lesson?.fach || '＋ Eintragen'}</span>
                    {lesson?.klasse && <span className="block text-xs">{lesson.klasse}</span>}
                    {lesson?.raum && <span className="block text-xs">{lesson.raum}</span>}
                  </button>
                </td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h4 className="font-bold">{editing.tag}, {editing.stunde}. Stunde</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['fach', 'klasse', 'raum'] as const).map(key => <label key={key} className="text-sm">{key === 'fach' ? 'Fach / Tätigkeit' : key === 'klasse' ? 'Klasse' : 'Raum'}
            <input type="text" value={draft[key]} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2" />
          </label>)}
        </div>
        <p className="mt-2 text-xs text-[var(--text2)]">Alle Felder leeren und speichern, um diese Stunde zu entfernen.</p>
        <div className="mt-3 flex gap-2"><button type="button" onClick={save} className="rounded-xl bg-[var(--accent)] px-4 py-2 font-bold text-white">Speichern</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-[var(--border)] px-4 py-2">Abbrechen</button></div>
      </div>}
    </section>
  );
}
