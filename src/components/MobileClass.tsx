import React, { useMemo, useState } from 'react';
import { Search, UsersRound } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Privacy-conscious mobile class overview. No new pupil records or secondary data store. */
export default function MobileClass() {
  const { app } = useApp();
  const [search, setSearch] = useState('');
  const pupils = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('de-AT');
    return [...(app.schueler || [])]
      .filter(student => !needle || `${student.vorname} ${student.nachname}`
        .toLocaleLowerCase('de-AT').includes(needle))
      .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de-AT'));
  }, [app.schueler, search]);

  return (
    <div className="space-y-4 pb-5" data-testid="klassio-mobile-class">
      <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <UsersRound size={22} />
          </span>
          <div>
            <p className="text-sm font-bold text-violet-600">Deine Klasse</p>
            <p className="text-lg font-extrabold text-slate-800">{app.klassenbezeichnung || 'Meine Klasse'}</p>
            <p className="text-sm text-slate-500">{app.schueler?.length || 0} Kinder</p>
          </div>
        </div>
      </section>
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-violet-100 bg-white px-3">
        <Search size={19} className="shrink-0 text-violet-700" />
        <span className="sr-only">Kinder suchen</span>
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Kind suchen …" className="w-full bg-transparent text-base text-slate-800 outline-none" />
      </label>
      <section aria-label="Klassenliste" className="space-y-2">
        {pupils.map((student, idx) => (
          <article key={student.id} className="flex min-h-14 items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700" aria-hidden="true">
              {(student.vorname?.[0] || '?').toUpperCase()}
            </span>
            <p className="min-w-0 flex-1 break-words text-base font-bold text-slate-800">
              {student.vorname} {student.nachname}
            </p>
            <span className="shrink-0 text-xs text-slate-400">{idx + 1}</span>
          </article>
        ))}
        {pupils.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">Keine passenden Kinder gefunden.</p>}
      </section>
      <p className="px-1 text-xs leading-relaxed text-slate-500">
        Die vollständigen Stammdaten und das Schülerdossier bleiben in der PC-Ansicht verfügbar.
      </p>
    </div>
  );
}
