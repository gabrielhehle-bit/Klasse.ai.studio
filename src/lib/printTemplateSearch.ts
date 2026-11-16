export interface PrintTemplateSearchItem {
  label: string;
  desc: string;
  keywords: string;
  taskCat: string;
}

/** Matches real labels and teacher-friendly synonyms, preserving template identity and order. */
export function filterPrintTemplates<T extends PrintTemplateSearchItem>(
  templates: readonly T[],
  query: string,
  taskCategory: string = 'all',
): T[] {
  const normalize = (value: string) => value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-AT')
    .replace(/ß/g, 'ss');
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return templates.filter(template => {
    if (taskCategory !== 'all' && template.taskCat !== taskCategory) return false;
    if (words.length === 0) return true;
    const haystack = normalize([template.label, template.desc, template.keywords].join(' '));
    return words.every(word => haystack.includes(word));
  });
}
