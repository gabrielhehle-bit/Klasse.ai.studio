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
