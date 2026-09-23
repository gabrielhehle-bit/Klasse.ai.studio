/** Page a long assignment without truncating a teacher's original words or using
 * hidden in-widget scrollbars on the Smartboard. Original text is never modified. */
export function instructionTextPages(value: string, pageSize: number): string[] {
  if (!value) return [''];
  const limit = Math.max(24, Math.floor(pageSize));
  const pages: string[] = [];
  let rest = value;
  while (rest.length) {
    if (rest.length <= limit) { pages.push(rest); break; }
    let end = rest.lastIndexOf(' ', limit);
    const line = rest.lastIndexOf('\n', limit);
    if (line > Math.floor(limit * 0.4)) end = line + 1;
    else if (end < Math.floor(limit * 0.4)) end = limit;
    pages.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  return pages;
}
export function instructionChecklistWindow(total: number, page: number, rows: number): {
  page: number; pageCount: number; start: number; end: number;
} {
  const safeRows = Math.max(1, Math.floor(rows));
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / safeRows));
  const safePage = Math.min(pageCount - 1, Math.max(0, Math.floor(page)));
  return { page: safePage, pageCount, start: safePage * safeRows, end: Math.min(total, (safePage + 1) * safeRows) };
}
