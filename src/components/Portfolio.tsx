import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, Target, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StudentLernziele from './StudentLernziele';
import StudentPortfolio from './StudentPortfolio';
import { mergeLegacyPortfolioEntries, type LegacyPortfolioMap } from '../lib/portfolioMigration';
import {
  loadEncryptedStorageItem,
  removeStorageItem,
  saveEncryptedStorageItem,
  STORAGE_KEYS,
} from '../lib/secureStorageService';
import { getActiveVaultKey } from '../lib/vaultStorage';

export default function Portfolio() {
  const { app, setApp } = useApp();
  const students = useMemo(
    () => [...(app.schueler || [])].sort((a, b) =>
      (a.nachname || '').localeCompare(b.nachname || '', 'de') ||
      (a.vorname || '').localeCompare(b.vorname || '', 'de')
    ),
    [app.schueler]
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    const requested = app.selectedStudentForPortfolio;
    return requested && students.some(student => student.id === requested)
      ? requested
      : students[0]?.id || '';
  });
  const [activeTab, setActiveTab] = useState<'lernziele' | 'portfolio'>('lernziele');
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    const migrateLegacyPortfolios = async () => {
      const activeStudentIds = new Set((app.schueler || []).map(student => student.id));

      const rootLegacy = (app as any).portfolioEntries as LegacyPortfolioMap | undefined;
      if (rootLegacy && typeof rootLegacy === 'object') {
        const hasActiveEntries = Object.keys(rootLegacy).some(studentId =>
          activeStudentIds.has(studentId) && Array.isArray(rootLegacy[studentId]) && rootLegacy[studentId].length > 0
        );
        if (hasActiveEntries) {
          setApp(prev => {
            const currentLegacy = ((prev as any).portfolioEntries || {}) as LegacyPortfolioMap;
            const migrated = mergeLegacyPortfolioEntries(prev.schueler || [], currentLegacy);
            const next: any = { ...prev, schueler: migrated.students };
            if (Object.keys(migrated.remaining).length > 0) next.portfolioEntries = migrated.remaining;
            else delete next.portfolioEntries;
            return next;
          });
        }
      }

      const vaultKey = getActiveVaultKey();
      if (!vaultKey) return;

      const cached = await loadEncryptedStorageItem<LegacyPortfolioMap>(
        STORAGE_KEYS.PORTFOLIO_ENTRIES,
        vaultKey,
      );
      if (cancelled || !cached || typeof cached !== 'object') return;

      const hasActiveCachedEntries = Object.keys(cached).some(studentId =>
        activeStudentIds.has(studentId) && Array.isArray(cached[studentId]) && cached[studentId].length > 0
      );
      if (!hasActiveCachedEntries) return;

      const preview = mergeLegacyPortfolioEntries(app.schueler || [], cached);
      setApp(prev => ({
        ...prev,
        schueler: mergeLegacyPortfolioEntries(prev.schueler || [], cached).students,
      }));

      if (vaultKey && Object.keys(preview.remaining).length > 0) {
        await saveEncryptedStorageItem(STORAGE_KEYS.PORTFOLIO_ENTRIES, preview.remaining, vaultKey);
      } else if (Object.keys(preview.remaining).length === 0) {
        removeStorageItem(STORAGE_KEYS.PORTFOLIO_ENTRIES);
      }
    };

    void migrateLegacyPortfolios();
    return () => {
      cancelled = true;
    };
  }, [app.activeClassId, setApp]);

  useEffect(() => {
    const requested = app.selectedStudentForPortfolio;
    if (!requested || !students.some(student => student.id === requested)) return;
    setSelectedStudentId(requested);
    setApp(prev => ({ ...prev, selectedStudentForPortfolio: undefined }));
  }, [app.selectedStudentForPortfolio, students, setApp]);

  useEffect(() => {
    if (students.length === 0) {
      if (selectedStudentId) setSelectedStudentId('');
      return;
    }
    if (!students.some(student => student.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('de');
    if (!q) return students;
    return students.filter(student =>
      `${student.vorname || ''} ${student.nachname || ''}`.toLocaleLowerCase('de').includes(q)
    );
  }, [students, search]);

  const selectedStudent = students.find(student => student.id === selectedStudentId);

  if (students.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-10 text-center">
          <UserRound size={30} className="mx-auto text-slate-300" />
          <h1 className="mt-4 text-xl font-black text-slate-800">Noch keine Kinder in dieser Klasse</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Lernziele und Portfolio stehen zur Verfügung, sobald mindestens ein Kind angelegt ist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-5 px-4 py-5 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Leistungen</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">Lernziele & Portfolio</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[var(--text2)]">
              Lernfortschritte je Semester dokumentieren und echte Arbeiten, Fotos und Meilensteine im Portfolio sammeln.
            </p>
          </div>
          {selectedStudent && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3">
              <span className="block text-[0.625rem] font-black uppercase tracking-wider text-[var(--text3)]">Ausgewählt</span>
              <span className="mt-0.5 block text-sm font-black text-[var(--text)]">
                {selectedStudent.vorname} {selectedStudent.nachname}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="self-start rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm xl:sticky xl:top-4">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Kind suchen …"
              aria-label="Kind für Lernziele und Portfolio suchen"
              className="min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] pl-9 pr-3 text-sm font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>

          <div className="mt-3 max-h-[62vh] space-y-1.5 overflow-y-auto pr-1">
            {filteredStudents.map(student => {
              const active = student.id === selectedStudentId;
              const portfolioCount = student.portfolio?.length || 0;
              const semesterRatings =
                app.studentLernzielSemesterBewertungen?.[student.id]?.[semester] ||
                (semester === '1' ? app.studentLernzielBewertungen?.[student.id] : undefined) ||
                {};
              const ratedCount = Object.values(semesterRatings).filter(value => value !== null && value !== undefined).length;

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--surface2)]'
                  }`}
                >
                  <span className="block truncate text-sm font-black text-[var(--text)]">
                    {student.nachname} {student.vorname}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[0.6875rem] font-bold text-[var(--text3)]">
                    <span>{ratedCount} Lernziele</span>
                    <span>·</span>
                    <span>{portfolioCount} Portfolio</span>
                  </span>
                </button>
              );
            })}

            {filteredStudents.length === 0 && (
              <div className="px-3 py-8 text-center text-xs font-bold text-[var(--text3)]">
                Kein passendes Kind gefunden.
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface2)] p-1">
              <button
                type="button"
                onClick={() => setActiveTab('lernziele')}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                  activeTab === 'lernziele'
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text2)] hover:text-[var(--text)]'
                }`}
              >
                <Target size={16} /> Lernziele
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('portfolio')}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                  activeTab === 'portfolio'
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text2)] hover:text-[var(--text)]'
                }`}
              >
                <BookOpen size={16} /> Portfolio
              </button>
            </div>

            {activeTab === 'lernziele' && (
              <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-1">
                {(['1', '2'] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSemester(value)}
                    className={`min-h-9 rounded-lg px-4 text-xs font-black transition ${
                      semester === value
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                        : 'text-[var(--text3)] hover:text-[var(--text)]'
                    }`}
                  >
                    {value}. Semester
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudentId && activeTab === 'lernziele' && (
            <StudentLernziele
              key={`goals-${selectedStudentId}`}
              schuelerId={selectedStudentId}
              semester={semester}
              onSemesterChange={setSemester}
            />
          )}

          {selectedStudentId && activeTab === 'portfolio' && (
            <StudentPortfolio key={`portfolio-${selectedStudentId}`} schuelerId={selectedStudentId} />
          )}
        </main>
      </div>
    </div>
  );
}
