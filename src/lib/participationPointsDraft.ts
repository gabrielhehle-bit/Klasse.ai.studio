/** A temporary text edit is not a participation award or correction. */
export function parseParticipationPointsDraft(draft: string): number | null {
  const text = draft.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
