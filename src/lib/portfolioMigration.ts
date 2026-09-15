import type { PortfolioEntry, Student } from '../types';

export type LegacyPortfolioEntry = {
  id?: string;
  titel?: string;
  fach?: string;
  datum?: string;
  bewertung?: string;
  beschreibung?: string;
};

export type LegacyPortfolioMap = Record<string, LegacyPortfolioEntry[]>;

export function mergeLegacyPortfolioEntries(
  students: Student[],
  legacyEntries: LegacyPortfolioMap,
): { students: Student[]; remaining: LegacyPortfolioMap; migratedCount: number } {
  const activeIds = new Set(students.map(student => student.id));
  const remaining: LegacyPortfolioMap = {};
  let migratedCount = 0;

  Object.entries(legacyEntries || {}).forEach(([studentId, entries]) => {
    if (!activeIds.has(studentId)) {
      remaining[studentId] = Array.isArray(entries) ? entries : [];
    }
  });

  const nextStudents = students.map(student => {
    const entries = Array.isArray(legacyEntries?.[student.id]) ? legacyEntries[student.id] : [];
    if (entries.length === 0) return student;

    const existing = student.portfolio || [];
    const existingIds = new Set(existing.map(entry => entry.id));
    const migrated: PortfolioEntry[] = entries
      .filter(entry => entry && entry.titel)
      .map((entry, index) => ({
        id: entry.id || `legacy-${student.id}-${index}`,
        datum: entry.datum || '',
        titel: entry.titel || 'Portfolio-Eintrag',
        beschreibung: entry.beschreibung || '',
        fach: entry.fach,
        bewertung: entry.bewertung,
        tags: entry.fach ? [entry.fach] : ['Sonstiges'],
        isInKEL: false,
      }))
      .filter(entry => !existingIds.has(entry.id));

    migratedCount += migrated.length;
    if (migrated.length === 0) return student;
    return {
      ...student,
      portfolio: [...migrated, ...existing],
    };
  });

  return { students: nextStudents, remaining, migratedCount };
}
