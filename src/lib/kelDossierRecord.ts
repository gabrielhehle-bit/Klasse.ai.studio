/**
 * A dossier's live KEL assessment belongs to the current child AND school year.
 * Older meeting revisions must not be changed by a quick rating in the dossier.
 * Keep the latest dated meeting within that year; never fall back to an older
 * school year merely because it is the first entry in the array.
 */
export function findActiveKelDossierRecordIndex<T extends {
  schuelerId: string;
  schuljahr?: string;
  datum?: string;
}>(
  records: readonly T[] | null | undefined,
  studentId: string,
  schoolYear: string | null | undefined,
): number {
  if (!Array.isArray(records)) return -1;
  const year = schoolYear || '';
  let best = -1;
  let latestTime = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < records.length; index++) {
    const item = records[index];
    if (!item || item.schuelerId !== studentId || (item.schuljahr || '') !== year) continue;
    const parsed = Date.parse(item.datum || '');
    const time = Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
    if (best < 0 || time > latestTime) {
      best = index;
      latestTime = time;
    }
  }
  return best;
}
