import React from 'react';
import { CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TAGE_NAMEN, LESSON_SLOT_NUMBERS, STUNDEN_INFO } from '../constants';

/** Edits the existing, class-local Stammstundenplan rather than creating a competing copy. */
export default function ClassTimetable() {
  const { app, setApp } = useApp();
  const [edit, setEdit] = React.useState<{ tag: string; stunde: number } | null>(null);
  const [fach, setFach] = React.useState('');
  const [enabled, setEnabled] = React.useState(true);
  const plan = app.stammplan || {};
  const hours = app.tageplan || {};
  const startEdit = (tag: string, stunde: number) => {
    setEdit({ tag, stunde });
    setFach(plan[tag]?.[stunde] || '');
    setEnabled((hours[tag]?.stunden || []).includes(stunde));
  };
  const save = () => {
    if (!edit) return;
    const { tag, stunde } = edit;
    setApp(prev => {
      const day = { ...(prev.stammplan?.[tag] || {}) };
      if (enabled && fach.trim()) day[stunde] = fach.trim();
      else delete day[stunde];
      const active = new Set<number>(prev.tageplan?.[tag]?.stunden || []);
      if (enabled) active.add(stunde);
      else active.delete(stunde);
      return {
        ...prev,
        stammplan: { ...prev.stammplan, [tag]: day },
        tageplan: { ...(prev.tageplan || {}), [tag]: { ...(prev.tageplan?.[tag] || {}), stunden: Array.from(active).sort((a, b) => a - b) } },
      };
    });
    setEdit(null);
  };
  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase text-[var(--accent)]">Klasse · Schuljahr {app.schuljahr}</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Klassenstundenplan · {app.klassenbezeichnung || 'Klasse'}</h1>
        <p className="mt-2 text-sm text-[var(--text2)]">Wähle eine Stunde zum Bearbeiten. Änderungen gelten nur für die ausgewählte Klasse und werden auch in der Anwesenheit verwendet.</p>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[700px] table-fixed border-collapse text-sm">
          <thead><tr><th scope="col" className="w-24 p-3 text-left">Stunde</th>{TAGE_NAMEN.map(tag => <th scope="col" key={tag} className="p-3 text-left">{tag}</th>)}</tr></thead>
          <tbody>{LESSON_SLOT_NUMBERS.map(stunde => (
            <tr key={stunde} className="border-t border-[var(--border)]">
              <th scope="row" className="p-2 text-left">{stunde}.<span className="block text-xs font-normal">{app.stundenZeiten?.[stunde] || STUNDEN_INFO[stunde] || ''}</span></th>
              {TAGE_NAMEN.map(tag => {
                const active = (hours[tag]?.stunden || []).includes(stunde);
                return <td key={tag} className="border-l border-[var(--border)] p-1 align-top">
                  <button type="button" onClick={() => startEdit(tag, stunde)} aria-label={`${tag}, ${stunde}. Stunde bearbeiten`} className={`min-h-14 w-full rounded-lg p-2 text-left hover:ring-2 hover:ring-[var(--accent)] ${active ? 'bg-[var(--surface2)] text-[var(--text)]' : 'text-[var(--text2)] opacity-60'}`}>
                    {active ? plan[tag]?.[stunde] || 'Fach eintragen' : '–'}
                  </button>
                </td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {edit && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" aria-label="Unterrichtsstunde bearbeiten">
        <h2 className="font-bold">{edit.tag}, {edit.stunde}. Stunde</h2>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Unterricht an diesem Tag</label>
        <label className="mt-3 block text-sm">Fach / Unterricht
          <input type="text" value={fach} onChange={e => setFach(e.target.value)} disabled={!enabled} list="klassio-class-subjects" className="mt-1 block w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3" />
        </label>
        <datalist id="klassio-class-subjects">{(app.faecher || []).map(f => <option value={f} key={f} />)}</datalist>
        <div className="mt-4 flex gap-2"><button type="button" onClick={save} className="rounded-xl bg-[var(--accent)] px-4 py-2 font-bold text-white">Speichern</button><button type="button" onClick={() => setEdit(null)} className="rounded-xl border border-[var(--border)] px-4 py-2">Abbrechen</button></div>
      </section>}
      <p className="flex items-center gap-2 text-xs text-[var(--text2)]"><CalendarDays size={15} /> Unterrichtszeiten und weitere Klassenoptionen bleiben zusätzlich in den Klassen-Einstellungen bearbeitbar.</p>
    </main>
  );
}
