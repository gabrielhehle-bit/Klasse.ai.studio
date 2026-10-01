export interface ChartAssessment {
  id: string;
  date: string;
  label: string;
  categoryLabel: string;
  rawGrade?: number | string;
  percent?: number;
}

/** Only dated, comparable assessments belong in a chronological chart. */
export function getDossierAssessmentChart(items: ChartAssessment[], mode: 'grades' | 'percent' | 'points') {
  const rows = items.flatMap(item => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return [];
    const d = new Date(item.date + 'T12:00:00');
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== Number(item.date.slice(0,4)) || d.getMonth()+1 !== Number(item.date.slice(5,7)) || d.getDate() !== Number(item.date.slice(8,10))) return [];
    let value: number | null = null;
    if (mode === 'grades') {
      const text = String(item.rawGrade ?? '').trim().replace(',', '.');
      if (/^[1-5](?:\.\d+)?$/.test(text)) value = Number(text);
      else {
        const tendency = text.match(/^([1-5])([+-])$/);
        const range = text.match(/^([1-5])-([1-5])$/);
        if (tendency) value = Math.max(1, Math.min(5, Number(tendency[1]) + (tendency[2] === '+' ? -0.25 : 0.25)));
        else if (range) value = (Number(range[1]) + Number(range[2])) / 2;
      }
    } else if (typeof item.percent === 'number') value = item.percent;
    if (value === null || !Number.isFinite(value) || value < (mode === 'grades' ? 1 : 0) || value > (mode === 'grades' ? 5 : 100)) return [];
    return [{ ...item, value, dateLabel: d.toLocaleDateString('de-AT', {day:'2-digit',month:'2-digit'}) }];
  }).sort((a,b) => a.date.localeCompare(b.date));
  return { rows, excludedCount: items.length - rows.length };
}
