/** A collection is a label on a material, never a copied file or a new storage silo. */
export const materialCollections = (items: readonly { sammlungen?: string[] }[]): string[] =>
  Array.from(new Set(items.flatMap(item => normalizeMaterialCollections(item.sammlungen))))
    .sort((a,b) => a.localeCompare(b, 'de-AT'));

export function normalizeMaterialCollections(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const name of value) {
    if (typeof name !== 'string') continue;
    const title = name.trim().replace(/\s+/g, ' ').slice(0, 80);
    const key = title.toLocaleLowerCase('de-AT');
    if (title && !seen.has(key)) { result.push(title); seen.add(key); }
  }
  return result;
}
