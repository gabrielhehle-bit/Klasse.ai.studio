/** Pure, parent-facing KEL summaries. No mutations or invented qualitative ratings. */
export type KelMoodSummary = {
  counts: number[];
  percentages: number[];
  total: number;
  average: number | null;
  positiveCount: number;
  mostFrequent: number | null;
};

export function summarizeKelMood(
  entries: Record<string, unknown> | null | undefined,
  start: string,
  end: string,
): KelMoodSummary {
  const counts = [0, 0, 0, 0, 0];
  for (const [day, raw] of Object.entries(entries || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < start || day > end) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 5) continue;
    counts[value - 1] += 1;
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  const sum = counts.reduce((acc, count, index) => acc + count * (index + 1), 0);
  const maximum = Math.max(...counts);
  const mostFrequent = maximum > 0 && counts.filter(count => count === maximum).length === 1
    ? counts.indexOf(maximum) + 1
    : null;
  return {
    counts, total,
    percentages: counts.map(count => total ? Math.round(count / total * 100) : 0),
    average: total ? sum / total : null,
    positiveCount: counts[0] + counts[1],
    mostFrequent,
  };
}

export type KelBehaviorRow = {
  id: string;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export function summarizeKelBehavior(
  logs: Array<{ iconId?: unknown }>,
  stages: Array<{ id: unknown; label?: unknown; color?: unknown }>,
): { total: number; rows: KelBehaviorRow[]; leading: KelBehaviorRow | null } {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const id = String(log.iconId ?? '');
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const known = stages.map(stage => {
    const id = String(stage.id);
    return {
      id,
      label: typeof stage.label === 'string' && stage.label.trim() ? stage.label.trim() : 'Beobachtung',
      count: counts.get(id) || 0,
      color: typeof stage.color === 'string' ? stage.color : '#64748b',
    };
  }).filter(row => row.count > 0).sort((a,b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
  const total = known.reduce((sum, row) => sum + row.count, 0);
  const percentages = known.map(row => ({
    ...row, percent: total ? Math.round(row.count / total * 100) : 0,
  }));
  const visible = percentages.slice(0, 4);
  const otherCount = percentages.slice(4).reduce((sum, row) => sum + row.count, 0);
  if (otherCount > 0) visible.push({
    id: '_others', label: 'Weitere Kategorien', count: otherCount,
    percent: Math.round(otherCount / total * 100), color: '#64748b',
  });
  return { total, rows: visible, leading: percentages[0] || null };
}
