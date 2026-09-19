import type { Student } from '../types';
import { calculateStudentAge, normalizeStudentGender } from './studentListData';

export type CountRow = { label: string; count: number };
export type ClassOverviewStats = {
  total: number;
  genders: CountRow[];
  firstLanguages: CountRow[];
  secondLanguages: CountRow[];
  germanFirstLanguage: number;
  germanSecondLanguage: number;
  daz: number;
  spf: number;
  espf: number;
  religions: CountRow[];
  citizenships: CountRow[];
  ages: { average: string; minimum: number | null; maximum: number | null; recorded: number };
};

const canonicalLanguage = (value?: string | null): string => {
  const trimmed = (value || '').trim();
  return trimmed.toLocaleLowerCase('de-AT') === 'deutsch' ? 'Deutsch' : trimmed || 'Nicht erfasst';
};

const countValues = (students: Student[], getValue: (student: Student) => string): CountRow[] => {
  const counts = new Map<string, { label: string; count: number }>();
  for (const student of students) {
    const label = getValue(student).trim() || 'Nicht erfasst';
    const key = label.toLocaleLowerCase('de-AT');
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { label, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de-AT'));
};

/** Counts always describe the entire active class, never the currently filtered list.
 * DaZ status is deliberately not inferred from the recorded second language (or vice versa).
 */
export function calculateClassOverviewStats(students: Student[]): ClassOverviewStats {
  const ages = students.map(s => calculateStudentAge(s.geburtstag)).filter((age): age is number => age !== null);
  const firstLanguages = countValues(students, s => canonicalLanguage(s.erstsprache));
  const secondLanguages = countValues(students, s => canonicalLanguage(s.zweitsprache));
  return {
    total: students.length,
    genders: countValues(students, s => {
      const gender = normalizeStudentGender(s.geschlecht);
      return gender === 'männlich' ? 'Männlich' : gender === 'weiblich' ? 'Weiblich' : gender === 'divers' ? 'Divers' : 'Nicht erfasst';
    }),
    firstLanguages,
    secondLanguages,
    germanFirstLanguage: students.filter(s => canonicalLanguage(s.erstsprache) === 'Deutsch').length,
    germanSecondLanguage: students.filter(s => canonicalLanguage(s.zweitsprache) === 'Deutsch').length,
    daz: students.filter(s => Boolean(s.daz)).length,
    spf: students.filter(s => Boolean(s.spf)).length,
    espf: students.filter(s => Boolean(s.espf)).length,
    religions: countValues(students, s => s.religion || 'Nicht erfasst'),
    citizenships: countValues(students, s => s.staatsbuergerschaft || 'Nicht erfasst'),
    ages: {
      average: ages.length ? (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1) : '–',
      minimum: ages.length ? Math.min(...ages) : null,
      maximum: ages.length ? Math.max(...ages) : null,
      recorded: ages.length,
    },
  };
}
