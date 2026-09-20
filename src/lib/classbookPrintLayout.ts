import { splitKlassenbuchCategoryKey } from './klassenbuchSubjects';

/** Print-only representation of the existing, shared weekly classbook projection.
 * No lesson, teacher note, or student record is ever modified.
 */
export type KlassenbuchPrintLayout = 'standard' | 'fachbereiche';
export type KlassenbuchPrintDetail = 'ausfuehrlich' | 'kurz';
export type KlassenbuchPrintRow = {
  kind: 'heading' | 'content';
  key: string;
  label: string;
  lines: string[];
};

export function formatKlassenbuchPrintEntry(entry: string, detail: KlassenbuchPrintDetail): string {
  const text = String(entry || '').trim();
  if (detail !== 'kurz' || !text || text.startsWith('Eigener Eintrag:')) return text;
  // The weekly projection has labeled, delimiter-separated fields. In the
  // compact school template show teaching topic, material and homework,
  // without silently shortening manual notes or otherwise unrecognized text.
  const segments = text.split(' · ').map(part => part.trim()).filter(Boolean);
  const wanted = segments.filter(part => /^(Unterricht|Material|Hausübung):\s*/i.test(part));
  return wanted.length ? wanted.join(' · ') : text;
}

export function buildKlassenbuchPrintRows(
  categories: Record<string, string[]>,
  options: { showEmptyRows?: boolean; detail?: KlassenbuchPrintDetail } = {},
): KlassenbuchPrintRow[] {
  const includeEmpty = options.showEmptyRows !== false;
  const detail = options.detail || 'ausfuehrlich';
  const available = Object.entries(categories).map(([key, entries]) => {
    const parsed = splitKlassenbuchCategoryKey(key);
    const lines = (entries || []).map(line => formatKlassenbuchPrintEntry(line, detail)).filter(Boolean);
    return { key, subject: parsed.subject, subarea: parsed.subarea, lines };
  }).filter(row => includeEmpty || row.lines.length > 0);
  const subjectsWithAreas = new Set(available.filter(row => row.subarea).map(row => row.subject));
  const rows: KlassenbuchPrintRow[] = [];
  const seenSubjects = new Set<string>();
  for (const row of available) {
    const grouped = subjectsWithAreas.has(row.subject);
    if (grouped && !seenSubjects.has(row.subject)) {
      rows.push({ kind: 'heading', key: `subject:${row.subject}`, label: row.subject, lines: [] });
      seenSubjects.add(row.subject);
    }
    rows.push({
      kind: 'content', key: row.key,
      label: row.subarea || row.subject,
      lines: row.lines,
    });
  }
  return rows;
}
