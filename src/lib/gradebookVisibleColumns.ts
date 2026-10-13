/** Return original slot indices: hiding empty placeholders must never move grades. */
export function visibleAssessmentIndices(options: {
  count: number;
  visible?: boolean;
  focusedIndex?: number;
  expanded: boolean;
  labels?: Record<number, string>;
  dates?: Record<number, string>;
  areas?: Record<number, string>;
  maxPoints?: Record<number, number>;
  records: { values?: unknown[]; participation?: Record<number, boolean> }[];
}): number[] {
  if (options.visible === false) return [];
  return Array.from({ length: options.count }, (_, index) => index).filter(index => (options.focusedIndex === undefined || index === options.focusedIndex) && (
    options.expanded || Boolean(options.labels?.[index] || options.dates?.[index] || options.areas?.[index]) ||
    options.maxPoints?.[index] !== undefined || options.records.some(record => {
      const value = record.values?.[index];
      return (value !== undefined && value !== null && value !== '') || record.participation?.[index] === false;
    })),
  );
}
