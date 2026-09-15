export interface HistoricalStudent {
  id: string;
  name: string;
  class: string;
  year: string;
  math: number;
  german: number;
  sach: number;
  behavior: string;
  average: number;
}

/**
 * Production starts with an empty archive. Historical student records are
 * created only from real user data and remain supported through AppState for
 * backup/import compatibility.
 */
export const DEFAULT_HISTORICAL_STUDENTS: HistoricalStudent[] = [];
