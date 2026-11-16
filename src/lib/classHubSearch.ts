/** Find a class function by the words teachers naturally use, not by a menu path. */
export type ClassHubSearchable = {
  title: string;
  description: string;
  meta?: string;
  keywords?: string;
};

const normalizeSearch = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('de-AT')
  .replace(/ß/g, 'ss');

export function filterClassHubItems<T extends ClassHubSearchable>(
  items: readonly T[],
  query: string,
): T[] {
  const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [...items];
  return items.filter(item => {
    const searchable = normalizeSearch(
      [item.title, item.description, item.meta, item.keywords].filter(Boolean).join(' '),
    );
    return words.every(word => searchable.includes(word));
  });
}
