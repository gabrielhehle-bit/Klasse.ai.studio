/**
 * Verhalten im Schülerdossier: ein Tagesabschluss pro Kind und Kalendertag.
 * Historische Mehrfacheinträge werden in der Anzeige zusammengeführt, niemals
 * aus dem verschlüsselten AppState oder einem Backup gelöscht.
 * Einzelne Materialien-/HÜ-Vermerke bleiben im Journal unverändert erhalten.
 */
export function behaviorLogDay(log: any): string {
  if (typeof log?.datum === 'string' && /^\d{4}-\d{2}-\d{2}/.test(log.datum)) {
    return log.datum.slice(0, 10);
  }
  const time = Number(log?.timestamp);
  if (!Number.isFinite(time) || time <= 0) return '';
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dailyBehaviorEntries(logs: any[], studentId: string, day: string): any[] {
  return (Array.isArray(logs) ? logs : []).filter(log =>
    log?.schuelerId === studentId && behaviorLogDay(log) === day &&
    !String(log.comment || '').trim()
  );
}

/** One representative daily status for display; raw events remain recoverable. */
export function collapseDailyBehaviorHistory(logs: any[], studentId: string): any[] {
  const byDay = new Map<string, any>();
  for (const entry of (Array.isArray(logs) ? logs : []).filter(log => log?.schuelerId === studentId)) {
    const day = behaviorLogDay(entry);
    const key = day || `undated-${entry.id || byDay.size}`;
    const previous = byDay.get(key);
    // Prefer the actual daily status over a supplementary one-off note.
    if (!previous ||
      (String(previous.comment || '').trim() && !String(entry.comment || '').trim()) ||
      (Boolean(previous.comment) === Boolean(entry.comment) &&
        Number(entry.timestamp || 0) > Number(previous.timestamp || 0))) {
      byDay.set(key, entry);
    }
  }
  return [...byDay.values()].sort((a, b) =>
    (behaviorLogDay(b) || '').localeCompare(behaviorLogDay(a) || '') ||
    Number(b.timestamp || 0) - Number(a.timestamp || 0)
  );
}
