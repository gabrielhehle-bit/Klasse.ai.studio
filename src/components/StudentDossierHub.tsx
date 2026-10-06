import React, { useMemo, useState } from 'react';
import { Search, Users, GraduationCap, ChevronRight, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StudentDossier from './StudentDossier';
import ClassDossier from './ClassDossier';
import { getStudentGenderLabel } from '../lib/studentListData';

type DossierMode = 'students' | 'class';

export default function StudentDossierHub() {
  const { app } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<DossierMode>('students');

  React.useEffect(() => {
    setSelectedStudentId(null);
    setSearch('');
    setMode('students');
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

  const openStudent = React.useCallback((studentId: string) => {
    setMode('students');
    setSelectedStudentId(studentId);
  }, []);

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
    <div data-student-dossier-hub className="mx-auto w-full max-w-[1500px] space-y-4 px-3 py-4 sm:px-5 sm:py-5">
      <nav
        data-dossier-switch
        aria-label="Dossier auswählen"
        className="grid max-w-xl grid-cols-2 gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface2)] p-1.5"
      >
        <button
          type="button"
          aria-pressed={mode === 'students'}
          onClick={() => setMode('students')}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${mode === 'students' ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm' : 'text-[var(--text2)] hover:bg-[var(--surface)]/70'}`}
        >
          <GraduationCap size={17}/>
          Schülerdossier
        </button>
        <button
          type="button"
          aria-pressed={mode === 'class'}
          onClick={() => setMode('class')}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${mode === 'class' ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm' : 'text-[var(--text2)] hover:bg-[var(--surface)]/70'}`}
        >
          <BarChart3 size={17}/>
          Klassendossier
        </button>
      </nav>

      {mode === 'class' ? (
        <ClassDossier onSelectStudent={openStudent}/>
      ) : (
        <>
          <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Klasse</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
                  Schülerdossier
                </h1>
              </div>
              <span className="text-xs font-semibold text-[var(--text3)]">{students.length} Kinder</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text2)]">
              Wähle ein Kind und öffne direkt das vollständige Dossier. Für die gesamte Klasse wechselst du oben ins Klassendossier.
            </p>
          </header>

          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Kind suchen …"
              aria-label="Kind im Schülerdossier suchen"
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>

          {students.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
              <Users size={34} className="mx-auto text-[var(--text3)]" />
              <p className="mt-3 text-sm font-bold text-[var(--text2)]">Keine passenden Kinder gefunden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Kinder für das Schülerdossier">
              {students.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => openStudent(student.id)}
                  className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--accent)]/35 hover:bg-[var(--accent-soft)]/30"
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
        </>
      )}
    </div>
  );
}
