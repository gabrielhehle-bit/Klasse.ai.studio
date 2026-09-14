import type { Student } from '../types';

export interface StudentIdentityLike {
  name?: string | null;
  vorname?: string | null;
  nachname?: string | null;
}

function buildLocalDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function expandTwoDigitYear(value: string): number {
  const year = Number(value);
  return year > 50 ? 1900 + year : 2000 + year;
}

export function parseStudentBirthday(value?: string | null): Date | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const austrian = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(trimmed);
  if (austrian) {
    const year = austrian[3].length === 2 ? expandTwoDigitYear(austrian[3]) : Number(austrian[3]);
    return buildLocalDate(year, Number(austrian[2]), Number(austrian[1]));
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return buildLocalDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return null;
}

export function toDateInputValue(value?: string | null): string {
  const date = parseStudentBirthday(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateStudentAge(value?: string | null, referenceDate = new Date()): number | null {
  const birthday = parseStudentBirthday(value);
  if (!birthday) return null;

  let age = referenceDate.getFullYear() - birthday.getFullYear();
  const birthdayNotReached =
    referenceDate.getMonth() < birthday.getMonth() ||
    (referenceDate.getMonth() === birthday.getMonth() && referenceDate.getDate() < birthday.getDate());

  if (birthdayNotReached) age -= 1;
  return age >= 0 ? age : null;
}

export function getStudentComparableName(student: StudentIdentityLike): string {
  const explicitName = String(student.name || '').trim();
  const fallbackName = `${String(student.vorname || '').trim()} ${String(student.nachname || '').trim()}`.trim();
  return (explicitName || fallbackName).toLocaleLowerCase('de-AT');
}

export function normalizeStudentGender(value?: string | null): string {
  const normalized = String(value || '').trim().toLocaleLowerCase('de-AT');
  if (!normalized) return '';
  if (normalized === 'm' || normalized === 'm.' || normalized.startsWith('männ') || normalized.startsWith('maenn')) return 'männlich';
  if (normalized === 'w' || normalized === 'w.' || normalized === 'f' || normalized === 'f.' || normalized.startsWith('weib')) return 'weiblich';
  if (normalized === 'd' || normalized === 'd.' || normalized.startsWith('divers')) return 'divers';
  return String(value || '').trim();
}


export type StudentSortBy = 'nachname' | 'vorname' | 'alter';
export type StudentSortOrder = 'asc' | 'desc';

export function sortStudentsForList(
  students: Student[],
  sortBy: StudentSortBy,
  sortOrder: StudentSortOrder
): Student[] {
  return [...students].sort((a, b) => {
    if (sortBy === 'alter') {
      const dateA = parseStudentBirthday(a.geburtstag);
      const dateB = parseStudentBirthday(b.geburtstag);

      // Missing/invalid birthdays always stay at the end, independent of direction.
      if (!dateA && !dateB) return getStudentComparableName(a).localeCompare(getStudentComparableName(b), 'de');
      if (!dateA) return 1;
      if (!dateB) return -1;

      // "Alter aufsteigend" means younger children first.
      const comparison = dateB.getTime() - dateA.getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    const valueA = sortBy === 'nachname' ? (a.nachname || '') : (a.vorname || '');
    const valueB = sortBy === 'nachname' ? (b.nachname || '') : (b.vorname || '');
    const comparison = valueA.localeCompare(valueB, 'de');
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

const IMPORTABLE_STUDENT_FIELDS = [
  'vorname',
  'nachname',
  'geschlecht',
  'geburtstag',
  'besuchsjahr',
  'sv_nummer',
  'ikmNummer',
  'staatsbuergerschaft',
  'religion',
  'erstsprache',
  'zweitsprache',
  'anschrift',
  'plz',
  'ort',
  'telefon_mutter',
  'telefon_vater',
  'email_eltern',
] as const;

function hasImportValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function normalizedIdentityValue(value: unknown): string {
  return String(value || '').trim().toLocaleLowerCase('de-AT');
}

function normalizedBirthday(value: unknown): string {
  return toDateInputValue(String(value || ''));
}

function mergeImportedStudent(existing: Student, incoming: Student): Student {
  const merged: Student = { ...existing };

  for (const field of IMPORTABLE_STUDENT_FIELDS) {
    const value = incoming[field];
    if (hasImportValue(value)) {
      (merged as any)[field] = value;
    }
  }

  merged.vorname = String(merged.vorname || '').trim();
  merged.nachname = String(merged.nachname || '').trim();
  merged.name = `${merged.vorname} ${merged.nachname}`.trim();
  return merged;
}

export interface StudentImportMergeResult {
  students: Student[];
  added: number;
  updated: number;
}

export function mergeImportedStudents(existing: Student[], incoming: Student[]): StudentImportMergeResult {
  const result = existing.map(student => ({ ...student }));
  let added = 0;
  let updated = 0;

  const incomingNameCounts = incoming.reduce((counts, student) => {
    const name = getStudentComparableName(student);
    counts.set(name, (counts.get(name) || 0) + 1);
    return counts;
  }, new Map<string, number>());

  for (const imported of incoming) {
    const importedName = getStudentComparableName(imported);
    const importedBirthday = normalizedBirthday(imported.geburtstag);
    const importedSv = normalizedIdentityValue(imported.sv_nummer);
    const importedIkm = imported.ikmNummer != null ? String(imported.ikmNummer) : '';

    let matchIndex = -1;

    if (importedSv) {
      matchIndex = result.findIndex(student => normalizedIdentityValue(student.sv_nummer) === importedSv);
    }

    if (matchIndex < 0 && importedIkm) {
      matchIndex = result.findIndex(student => student.ikmNummer != null && String(student.ikmNummer) === importedIkm);
    }

    if (matchIndex < 0 && importedName && importedBirthday) {
      matchIndex = result.findIndex(student =>
        getStudentComparableName(student) === importedName &&
        normalizedBirthday(student.geburtstag) === importedBirthday
      );
    }

    if (matchIndex < 0 && importedName && incomingNameCounts.get(importedName) === 1) {
      const candidates = result
        .map((student, index) => ({ student, index }))
        .filter(({ student }) => getStudentComparableName(student) === importedName);

      if (candidates.length === 1) {
        const candidateBirthday = normalizedBirthday(candidates[0].student.geburtstag);
        // A unique name is a safe fallback when at least one side has no birthday.
        // Conflicting known birthdays are never merged.
        if (!candidateBirthday || !importedBirthday || candidateBirthday === importedBirthday) {
          matchIndex = candidates[0].index;
        }
      }
    }

    if (matchIndex >= 0) {
      result[matchIndex] = mergeImportedStudent(result[matchIndex], imported);
      updated += 1;
    } else {
      result.push({
        ...imported,
        id: imported.id || crypto.randomUUID(),
        vorname: String(imported.vorname || '').trim(),
        nachname: String(imported.nachname || '').trim(),
        name: `${String(imported.vorname || '').trim()} ${String(imported.nachname || '').trim()}`.trim(),
      });
      added += 1;
    }
  }

  return { students: result, added, updated };
}
