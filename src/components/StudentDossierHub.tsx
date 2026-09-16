import React, { useMemo, useState } from 'react';
import { Search, Users, GraduationCap, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StudentDossier from './StudentDossier';
import { getStudentGenderLabel } from '../lib/studentListData';

export default function StudentDossierHub() {
  const { app } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    setSelectedStudentId(null);
    setSearch('');
  }, [app.activeClassId]);

  const students = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de-AT');
    return [...(app.schueler || [])]
      .filter(student => {
        if (!query) return true;
        return `${student.vorname} ${student.nachname}`.toLocaleLowerCase('de-AT').includes(query);
      })
      .sort((a, b) =>
        a.nachname.localeCompare(b.nachname, 'de-AT') ||
        a.vorname.localeCompare(b.vorname, 'de-AT')
      );
  }, [app.schueler, search]);

  if (selectedStudentId) {
    return (
      <StudentDossier
        schuelerId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
        onStudentChange={setSelectedStudentId}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Klasse</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Schülerdossier
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Wähle ein Kind und öffne direkt das vollständige Dossier. Die Klassenliste bleibt davon getrennt.
        </p>
      </header>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Kind suchen …"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
      </div>

      {students.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <Users size={34} className="mx-auto text-[var(--text3)]" />
          <p className="mt-3 text-sm font-bold text-[var(--text2)]">Keine passenden Kinder gefunden.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map(student => (
            <button
              key={student.id}
              type="button"
              onClick={() => setSelectedStudentId(student.id)}
              className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <GraduationCap size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[var(--text)]">
                  {student.vorname} {student.nachname}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-[var(--text3)]">
                  Geschlecht: {getStudentGenderLabel(student.geschlecht)}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
