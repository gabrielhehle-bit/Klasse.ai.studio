import { yearPlanCellDisplayText, type YearPlanCell } from './yearlyPlanData';

type YearlyExportWeek = { kw: number; sw: number | null; monday: Date };
type YearlyExportSubject = { id: string; label: string };

function csvCell(value: unknown): string {
  const raw = String(value ?? '').replace(/"/g, '""');
  // User-authored plans are spreadsheet input, never formulas.
  const safe = /^[\s\t\r\n]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe}"`;
}

export function yearlyPlanCsv(
  plan: Record<number, Record<string, YearPlanCell>>,
  weeks: YearlyExportWeek[],
  subjects: YearlyExportSubject[],
  holidayLabel?: (week: YearlyExportWeek) => string | undefined,
): string {
  const rows: unknown[][] = [['SW', 'KW', ...subjects.map(subject => subject.label)]];
  for (const week of weeks) {
    const holiday = holidayLabel?.(week);
    rows.push([
      week.sw ?? '',
      week.kw,
      ...subjects.map(subject => {
        const cell = plan?.[week.kw]?.[subject.id];
        // Existing plans still export on a school-free week.
        const content = yearPlanCellDisplayText(cell);
        return content || holiday || '';
      }),
    ]);
  }
  return rows.map(row => row.map(csvCell).join(',')).join('\n');
}

export function downloadYearlyPlanCsv(
  schoolYear: string,
  plan: Record<number, Record<string, YearPlanCell>>,
  weeks: YearlyExportWeek[],
  subjects: YearlyExportSubject[],
  holidayLabel?: (week: YearlyExportWeek) => string | undefined,
): void {
  const csv = yearlyPlanCsv(plan, weeks, subjects, holidayLabel);
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Jahresplanung_${schoolYear.replace(/[^0-9A-Za-z_-]+/g, '_')}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
