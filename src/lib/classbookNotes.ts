/** Class-local additions to the automatically generated classbook.
 * Weekly lessons are read-only in this view; supplementary notes are stored
 * separately and appended when displaying/printing/exporting a classbook.
 */
export function withClassbookNotes(
  projected: Record<string, string[]>,
  notes: Record<string, string> | undefined,
): Record<string, string[]> {
  const result: Record<string, string[]> = Object.fromEntries(
    Object.entries(projected).map(([category, entries]) => [category, [...entries]]),
  );
  if (!notes) return result;
  for (const [category, rawNote] of Object.entries(notes)) {
    const note = typeof rawNote === 'string' ? rawNote.trim() : '';
    if (!category || !note) continue;
    if (!result[category]) result[category] = [];
    result[category].push(`Eigener Eintrag: ${note}`);
  }
  return result;
}
