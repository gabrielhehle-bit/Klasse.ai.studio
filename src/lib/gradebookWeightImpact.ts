import type { AppState } from '../types';
import { berechne, getAssessmentMode, getFachCfg, getNotenLabel } from './GradeUtils';

export const WEIGHT_CATEGORY_KEYS = ['sa', 'lzk', 'wp', 'hue', 'obj', 'mi'] as const;
export type GradebookWeightCategory = typeof WEIGHT_CATEGORY_KEYS[number];

const FALLBACK_LABELS: Record<GradebookWeightCategory, string> = {
  sa: 'Schularbeiten',
  lzk: 'Lernzielkontrollen',
  wp: 'Wochenplan',
  hue: 'Hausübung',
  obj: 'Aufgaben',
  mi: 'Mitarbeit',
};

export interface GradebookWeightImpactRow {
  key: GradebookWeightCategory;
  label: string;
  configuredWeight: number;
  /** The calculation returns a value for this category, including valid zero points. */
  active: boolean;
  categoryValue: number | null;
  /** Among the currently assessed categories only; not a permanent weight change. */
  effectiveWeight: number;
}

export interface GradebookWeightImpact {
  total: number | null;
  mode: 'grades' | 'points' | 'percent';
  miOnly: boolean;
  configuredTotal: number;
  activeWeight: number;
  rows: GradebookWeightImpactRow[];
}

/**
 * Read-only explanation of the already established berechne() result.
 *
 * Each category's current average is obtained from the actual grading engine,
 * not from a new parallel grade formula. A temporary, isolated in-memory
 * weighting map makes just that category eligible; no app or stored data is
 * mutated. The final result ALWAYS comes from the untouched original app.
 */
export function explainGradebookWeightImpact(
  app: AppState,
  studentId: string,
  fach: string,
  semester: string,
): GradebookWeightImpact {
  const cfg = getFachCfg(app, fach);
  const mode = getAssessmentMode(app, fach);
  const miOnly = cfg.miOnly === true;
  const total = berechne(app, studentId, fach, semester);

  const configured = WEIGHT_CATEGORY_KEYS.map(key => ({
    key,
    label: getNotenLabel(app, fach, key, FALLBACK_LABELS[key]),
    configuredWeight: miOnly
      ? (key === 'mi' ? 100 : 0)
      : Math.max(0, Number(cfg.g[key] || 0) * 100),
  })).filter(row => row.configuredWeight > 0);

  const rows = configured.map(row => {
    let categoryValue: number | null = null;
    if (miOnly) {
      categoryValue = row.key === 'mi' ? total : null;
    } else {
      const categoryWeights = Object.fromEntries(WEIGHT_CATEGORY_KEYS.map(key =>
        [key, key === row.key ? row.configuredWeight : 0],
      ));
      const isolatedApp: AppState = {
        ...app,
        notenGewichtung: {
          ...(app.notenGewichtung || {}),
          [fach]: categoryWeights,
        },
      };
      categoryValue = berechne(isolatedApp, studentId, fach, semester);
    }
    return {
      ...row,
      categoryValue,
      active: categoryValue !== null && Number.isFinite(categoryValue),
      effectiveWeight: 0,
    };
  });

  const activeWeight = rows.reduce((sum, row) => sum + (row.active ? row.configuredWeight : 0), 0);
  return {
    total,
    mode,
    miOnly,
    configuredTotal: rows.reduce((sum, row) => sum + row.configuredWeight, 0),
    activeWeight,
    rows: rows.map(row => ({
      ...row,
      effectiveWeight: row.active && activeWeight > 0
        ? Math.round((row.configuredWeight / activeWeight) * 1000) / 10 : 0,
    })),
  };
}
