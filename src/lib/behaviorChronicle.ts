import type { AppNote } from '../types';

export type ChronicleFilter = 'all' | 'journal' | 'student';

type ChronicleStudent = {
  id: string;
  vorname?: string;
  nachname?: string;
};

export function filterChronicleEntries(
  entries: AppNote[],
  filter: ChronicleFilter,
  search: string,
  students: ChronicleStudent[]
): AppNote[] {
  const query = search.trim().toLocaleLowerCase('de-AT');
  const studentById = new Map(students.map(student => [student.id, student]));

  return entries.filter(entry => {
    const linkedStudent = entry.schuelerId ? studentById.get(entry.schuelerId) : undefined;
    const haystack = [
      entry.inhalt,
      entry.kategorie,
      linkedStudent?.vorname,
      linkedStudent?.nachname,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('de-AT');

    const matchesSearch = !query || haystack.includes(query);
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'journal'
          ? !entry.schuelerId // Allgemein: both free-form class notes and journal entries
          : Boolean(entry.schuelerId);

    return matchesSearch && matchesFilter;
  });
}
