
import { AppState, AssessmentMode, GradeData } from '../types';
import { FAECHER_ALLE, DEFAULT_GEWICHTUNG } from '../constants';

export function getAssessmentMode(app: AppState, fach: string): AssessmentMode {
  const mode = app.notenMeta?.[fach]?.assessmentMode;
  if (mode === 'percent' || mode === 'points' || mode === 'grades') {
    return mode;
  }
  return 'grades';
}

export interface HomeworkGradebookSettings {
  mode: 'grade' | 'document';
  percentDeduction: number;
  participationDeduction: number;
}

export function getHomeworkGradebookSettings(app: AppState, fach: string): HomeworkGradebookSettings {
  const meta = app.notenMeta?.[fach] || {};
  const legacyDocumentOnly =
    app.settings?.hueMode === 'document' || app.settings?.hueGewichten === false;

  const mode: 'grade' | 'document' =
    meta.hueMode === 'document' || meta.hueMode === 'grade'
      ? meta.hueMode
      : legacyDocumentOnly
      ? 'document'
      : 'grade';

  const rawDeduction = meta.hueDeduction ?? app.settings?.huePercentDeduction ?? 5;
  const percentDeduction = Number.isFinite(Number(rawDeduction))
    ? Math.max(0, Number(rawDeduction))
    : 5;

  const legacyParticipation =
    app.settings?.hueWeight !== undefined
      ? app.settings.hueWeight
      : legacyDocumentOnly
      ? 0
      : 1;
  const rawParticipation = meta.hueMitarbeitWeight ?? legacyParticipation;
  const participationDeduction = Number.isFinite(Number(rawParticipation))
    ? Math.max(0, Number(rawParticipation))
    : 1;

  return { mode, percentDeduction, participationDeduction };
}

export function parseFinalGradeInput(input: string): { valid: boolean; value: string } {
  const trimmed = String(input ?? '').trim();
  if (trimmed === '') return { valid: true, value: '' };
  const upper = trimmed.toUpperCase();
  if (upper === 'SPF' || upper === 'ESPF') return { valid: true, value: upper };

  const normalized = trimmed.replace(',', '.');
  if (!/^(?:[1-4](?:\.\d+)?|5(?:\.0+)?)$/.test(normalized)) {
    return { valid: false, value: '' };
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    return { valid: false, value: '' };
  }
  return { valid: true, value: String(parsed) };
}

export function getMirroredAssessmentValue(
  rawValue: number | string | null,
  sourceMode: AssessmentMode,
  sourceMaxPoints: number,
  targetMode: AssessmentMode,
  targetMaxPoints: number,
): { sync: boolean; value: number | string | null } {
  if (typeof rawValue === 'string' && ['e', 'f', 'x', '-'].includes(rawValue.toLowerCase())) {
    return { sync: true, value: rawValue.toLowerCase() };
  }
  if (rawValue === null) return { sync: true, value: null };
  if (sourceMode !== targetMode) return { sync: false, value: rawValue };

  if (sourceMode !== 'points') {
    return { sync: true, value: rawValue };
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return { sync: false, value: rawValue };
  }
  if (!(sourceMaxPoints > 0) || !(targetMaxPoints > 0)) {
    return { sync: false, value: rawValue };
  }

  const proportional = Math.round((rawValue / sourceMaxPoints) * targetMaxPoints * 10) / 10;
  return {
    sync: true,
    value: Math.min(targetMaxPoints, Math.max(0, proportional)),
  };
}

export function getMaxPoints(app: AppState, fach: string, typ: string, idx: number): number {
  const key = typ === 'aufgaben' ? 'obj' : typ;
  const custom = app.notenMeta?.[fach]?.maxPoints?.[key]?.[idx];
  if (typeof custom === 'number' && !isNaN(custom) && custom > 0) {
    return custom;
  }
  if (key === 'sa') return 100;
  if (key === 'wp') return 10;
  return 20; // default for lzk & obj
}

export function isAssessmentValueMissing(value: unknown): boolean {
  return value === null ||
    value === undefined ||
    value === '' ||
    value === ' ' ||
    value === 'e' ||
    value === 'f' ||
    value === 'x' ||
    value === '-';
}

export function hasCalculatedAverage(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !Number.isNaN(value);
}

export function parseAssessmentInput(
  input: string,
  mode: AssessmentMode,
  maxPoints: number
): { valid: boolean; value: number | string | null } {
  const stripped = input.trim().toLowerCase();
  if (stripped === '') return { valid: true, value: null };
  if (['f', 'x', 'e', '-'].includes(stripped)) return { valid: true, value: stripped };

  const normalized = stripped
    .replace(mode === 'percent' ? '%' : /p(?:kt)?/g, '')
    .replace(',', '.')
    .trim();

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    if (mode === 'grades' && /^[1-5][+-]$/.test(stripped)) {
      return { valid: true, value: stripped };
    }
    return { valid: false, value: null };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { valid: false, value: null };

  const rounded = Math.round(parsed * 10) / 10;
  if (mode === 'percent') {
    if (rounded < 0 || rounded > 100) return { valid: false, value: null };
    return { valid: true, value: rounded };
  }
  if (mode === 'points') {
    const safeMax = Number.isFinite(maxPoints) && maxPoints > 0 ? maxPoints : 0;
    if (safeMax <= 0 || rounded < 0 || rounded > safeMax) return { valid: false, value: null };
    return { valid: true, value: rounded };
  }
  if (rounded < 1 || rounded > 5) return { valid: false, value: null };
  return { valid: true, value: rounded };
}

export function getAssessmentStorageValue(
  mode: AssessmentMode,
  totalPoints: number,
  maxPoints: number,
  gradeValue: number | string,
): number | string {
  if (mode === 'points') return totalPoints;
  if (mode === 'percent') {
    if (!Number.isFinite(maxPoints) || maxPoints <= 0) return 0;
    return Math.round((totalPoints / maxPoints) * 1000) / 10;
  }
  return gradeValue;
}

export function calculateItemPercent(
  rawVal: number | string | null | undefined,
  mode: AssessmentMode,
  maxPoints: number
): number | null {
  if (rawVal === null || rawVal === undefined || rawVal === '') return null;
  if (rawVal === 'f' || rawVal === 'x' || rawVal === 'e' || rawVal === '-') return null;

  let numVal: number | null = null;
  if (typeof rawVal === 'number') {
    numVal = rawVal;
  } else if (typeof rawVal === 'string') {
    const parsed = parseFloat(rawVal.replace(',', '.'));
    if (!isNaN(parsed)) {
      numVal = parsed;
    }
  }

  if (numVal === null || isNaN(numVal)) return null;

  if (mode === 'percent') {
    return Math.min(100, Math.max(0, numVal));
  } else if (mode === 'points') {
    if (maxPoints <= 0) return 0;
    return Math.min(100, Math.max(0, (numVal / maxPoints) * 100));
  }

  return null;
}

export function getGewichtung(app: AppState, fach: string) {
  if (app.notenGewichtung && app.notenGewichtung[fach]) {
    return app.notenGewichtung[fach];
  }
  return DEFAULT_GEWICHTUNG[fach as keyof typeof DEFAULT_GEWICHTUNG] || DEFAULT_GEWICHTUNG['Deutsch'];
}

export const DEFAULT_NOTEN_LABELS: Record<string, string> = {
  sa: 'Schularbeiten',
  lzk: 'Lernzielkontrollen',
  wp: 'Wochenplan',
  hue: 'Hausübung',
  obj: 'Aufgaben/Objekte',
  mi: 'Mitarbeit',
};

export function getNotenLabel(
  app: { notenMeta?: Record<string, any>; notenLabels?: Record<string, string> } | null | undefined,
  fach: string,
  key: string,
  fallback?: string
): string {
  // 1. Specific label for this fach in notenMeta[fach]?.labels
  const fachLabel = app?.notenMeta?.[fach]?.labels?.[key];
  if (fachLabel && typeof fachLabel === 'string' && fachLabel.trim() !== '') {
    return fachLabel;
  }
  // 2. Global legacy label fallback
  const globalLabel = app?.notenLabels?.[key];
  if (globalLabel && typeof globalLabel === 'string' && globalLabel.trim() !== '') {
    return globalLabel;
  }
  // 3. Fallback parameter or standard default
  return fallback || DEFAULT_NOTEN_LABELS[key] || key;
}

export function getFachCfg(app: AppState, fach: string) {
  const gw = getGewichtung(app, fach);
  const g = {
    sa: (gw.sa || 0) / 100,
    lzk: (gw.lzk || 0) / 100,
    wp: (gw.wp || 0) / 100,
    obj: (gw.obj || 0) / 100,
    mi: (gw.mi || 0) / 100,
  };

  const BASE: Record<string, any> = {
    'Deutsch': { saCount: app.notenMeta?.['Deutsch']?.saCount ?? 4, lzk: true, wp: true, hue: true, mi: true, obj: false, miOnly: false, freitext: false, objLabel: getNotenLabel(app, 'Deutsch', 'obj', 'Aufgabe') },
    'Mathematik': { saCount: app.notenMeta?.['Mathematik']?.saCount ?? 4, lzk: true, wp: true, hue: true, mi: true, obj: false, miOnly: false, freitext: false, objLabel: getNotenLabel(app, 'Mathematik', 'obj', 'Aufgabe') },
    'Sachunterricht': { saCount: 0, lzk: true, wp: true, hue: true, mi: true, obj: false, miOnly: false, freitext: false, objLabel: getNotenLabel(app, 'Sachunterricht', 'obj', 'Aufgabe') },
    'Englisch': { saCount: 0, lzk: true, wp: true, hue: false, mi: true, obj: false, miOnly: false, freitext: false, objLabel: getNotenLabel(app, 'Englisch', 'obj', 'Aufgabe') },
    'Türkisch': { saCount: 0, lzk: true, wp: true, hue: false, mi: true, obj: false, miOnly: false, freitext: false, objLabel: getNotenLabel(app, 'Türkisch', 'obj', 'Aufgabe') },
    'Musikerziehung': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: false, miOnly: true, freitext: true, objLabel: getNotenLabel(app, 'Musikerziehung', 'obj', 'Aufgabe') },
    'Bildnerische Erziehung': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: true, miOnly: false, freitext: true, objLabel: getNotenLabel(app, 'Bildnerische Erziehung', 'obj', 'Kunstobjekt') },
    'Werken (TEC)': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: true, miOnly: false, freitext: true, objLabel: getNotenLabel(app, 'Werken (TEC)', 'obj', 'Werkstück') },
    'Werken (TEX)': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: true, miOnly: false, freitext: true, objLabel: getNotenLabel(app, 'Werken (TEX)', 'obj', 'Werkstück') },
    'Bewegung und Sport': { saCount: 0, lzk: false, wp: false, hue: false, mi: true, obj: false, miOnly: true, freitext: true, objLabel: getNotenLabel(app, 'Bewegung und Sport', 'obj', 'Aufgabe') },
    'Religion': { saCount: 0, lzk: false, wp: false, hue: false, mi: true, obj: false, miOnly: true, freitext: false, objLabel: getNotenLabel(app, 'Religion', 'obj', 'Aufgabe') },
  };

  const lowerFach = (fach || '').toLowerCase();
  let baseKey = 'Deutsch';
  if (lowerFach.includes('deutsch')) {
    baseKey = 'Deutsch';
  } else if (lowerFach.includes('mathematik') || lowerFach === 'mathe') {
    baseKey = 'Mathematik';
  } else if (lowerFach.includes('sachunterricht')) {
    baseKey = 'Sachunterricht';
  } else if (lowerFach.includes('englisch')) {
    baseKey = 'Englisch';
  } else if (lowerFach.includes('türkisch')) {
    baseKey = 'Türkisch';
  } else if (lowerFach.includes('musik')) {
    baseKey = 'Musikerziehung';
  } else if (lowerFach.includes('bildnerische') || lowerFach.includes('kunst') || lowerFach.includes('zeichen')) {
    baseKey = 'Bildnerische Erziehung';
  } else if (lowerFach.includes('tec')) {
    baseKey = 'Werken (TEC)';
  } else if (lowerFach.includes('tex')) {
    baseKey = 'Werken (TEX)';
  } else if (lowerFach.includes('sport') || lowerFach.includes('bewegung')) {
    baseKey = 'Bewegung und Sport';
  } else if (lowerFach.includes('religion')) {
    baseKey = 'Religion';
  } else {
    const exactMatch = Object.keys(BASE).find(k => k.toLowerCase() === lowerFach);
    if (exactMatch) {
      baseKey = exactMatch;
    } else {
      const substringKey = Object.keys(BASE).find(k => lowerFach.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerFach));
      if (substringKey) {
        baseKey = substringKey;
      }
    }
  }

  const isHueAllowed = ['deutsch', 'mathematik', 'sachunterricht', 'mathe'].some(s => lowerFach.includes(s));
  
  // Keine Volksschul-Standardzahl für Schularbeiten auf Sek-I-Fächer übertragen.
  // Vorhandene explizite Fach-Konfiguration bleibt erhalten; neue Fächer starten neutral.
  const secondary = app.schulart === 'mittelschule' || app.schulart === 'ahs_unterstufe';
  const customSaCount = app.notenMeta?.[fach]?.saCount ?? (secondary ? 0 : app.notenMeta?.[baseKey]?.saCount ?? BASE[baseKey].saCount);
  const defaultObjLabel = BASE[baseKey]?.objLabel || 'Aufgabe';
  const customObjLabel = getNotenLabel(app, fach, 'obj', defaultObjLabel);

  const base = {
    ...(BASE[baseKey] || BASE['Deutsch']),
    saCount: customSaCount,
    hue: isHueAllowed,
    objLabel: customObjLabel
  };
  const genericAssessmentEnabled = base.obj || app.notenMeta?.[fach]?.enableObj === true;
  const cfg = {
    ...base,
    sa: base.saCount > 0 && g.sa > 0,
    lzk: base.lzk && g.lzk > 0,
    wp: base.wp && g.wp > 0,
    // The generic "Sonstige Leistung" area may be visible even at 0% weighting.
    // It only influences berechne() once a positive obj weighting is configured.
    obj: genericAssessmentEnabled,
    g: {
      ...g,
      hue: (gw.hue || 0) / 100 // add hue percentage weight
    },
  };

  // Nebenfächer fallback
  if (base.obj && cfg.g.obj === 0) cfg.g.obj = 0.6;
  if (base.obj && cfg.g.mi === 0) cfg.g.mi = 0.4;
  
  return cfg;
}

export function miZuNote(striche: number, settings: any, allMitarbeit?: any, fach?: string, sem?: string, students?: any[]): number {
  const s = settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' };
  
  if (s.mode === 'relative' && s.relative_confirmed && allMitarbeit && fach && sem && students) {
    const activeValues = students.map(st => allMitarbeit?.[st.id]?.[fach]?.[sem] || 0);
    const avg = activeValues.length > 0 ? activeValues.reduce((a: number, b: number) => a + b, 0) / activeValues.length : 0;
    const rel = s.relative_thresholds || { 1: 20, 2: 10, 3: 0, 4: -10 };
    
    if (striche >= avg * (1 + rel[1]/100)) return 1;
    if (striche >= avg * (1 + rel[2]/100)) return 2;
    if (striche >= avg * (1 + rel[3]/100)) return 3;
    if (striche >= avg * (1 + rel[4]/100)) return 4;
    return 5;
  }

  const t = s.thresholds || { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 };
  if (striche >= (t[1] || 13)) return 1;
  if (striche >= (t[2] || 10)) return 2;
  if (striche >= (t[3] || 7)) return 3;
  if (striche >= (t[4] || 4)) return 4;
  return 5;
}

export function berechne(app: AppState, sid: string, fach: string, sem: string): number | null {
  const isFachConfigured = !app.faecher || app.faecher.includes(fach) || fach === 'Unterricht';
  const hasNotenmappe = app.fachConfig?.[fach]?.unterrichtet !== false;
  const nd = app.noten?.[sid]?.[fach]?.[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };

  if (!isFachConfigured || !hasNotenmappe) {
    if (nd.endnote) {
      const parsed = parseFloat(nd.endnote.toString().replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
    }
    return null;
  }

  const assessmentMode = getAssessmentMode(app, fach);
  const cfg = getFachCfg(app, fach);
  const rawMitarbeitValue = app.mitarbeit?.[sid]?.[fach]?.[sem];
  const hasMitarbeitData = rawMitarbeitValue !== undefined && rawMitarbeitValue !== null;
  const miRaw = rawMitarbeitValue || 0;
  const s = app.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' };

  let miNote: number | null = null;
  
  let adjustedMiRaw = miRaw;
  const homeworkSettings = getHomeworkGradebookSettings(app, fach);
  const hueWeight = homeworkSettings.mode === 'document' ? 0 : homeworkSettings.participationDeduction;
  if (hueWeight > 0) {
    adjustedMiRaw = Math.max(0, miRaw - (nd.hue || 0) * hueWeight);
  }
  
  if (s.mode === 'manual') {
    miNote = nd.miDirekt !== undefined && nd.miDirekt !== null ? nd.miDirekt : null;
  } else {
    if (nd.miDirekt !== undefined && nd.miDirekt !== null) {
      miNote = nd.miDirekt;
    } else if (hasMitarbeitData && (adjustedMiRaw > 0 || (s.mode === 'relative' && s.relative_confirmed))) {
      miNote = miZuNote(adjustedMiRaw, s, app.mitarbeit, fach, sem, app.schueler);
    }
  }

  // --- PERCENT OR POINTS ASSESSMENT MODE ---
  if (assessmentMode === 'percent' || assessmentMode === 'points') {
    const calcCategoryPercent = (arr: (number | string | null)[], typ: 'sa' | 'lzk' | 'wp' | 'obj') => {
      const validItems = (arr || [])
        .map((val, idx) => {
          const maxP = getMaxPoints(app, fach, typ, idx);
          return calculateItemPercent(val, assessmentMode, maxP);
        })
        .filter((v): v is number => v !== null && !isNaN(v));

      return validItems.length ? validItems.reduce((a, b) => a + b, 0) / validItems.length : null;
    };

    const saPercent = cfg.sa ? calcCategoryPercent(nd.sa, 'sa') : null;
    const lzkPercent = cfg.lzk ? calcCategoryPercent(nd.lzk, 'lzk') : null;
    const wpPercent = cfg.wp ? calcCategoryPercent(nd.wp, 'wp') : null;
    const objPercent = cfg.obj ? calcCategoryPercent(nd.aufgaben, 'obj') : null;

    let miPercent: number | null = null;
    if (cfg.g.mi > 0) {
      if (miNote !== null) {
        if (assessmentMode === 'points' && s.mode === 'manual' && nd.miDirekt !== undefined && nd.miDirekt !== null) {
          const maxMiPoints = app.notenMeta?.[fach]?.maxPoints?.mi?.[0] || 20;
          miPercent = maxMiPoints > 0
            ? Math.min(100, Math.max(0, (nd.miDirekt / maxMiPoints) * 100))
            : null;
        } else if (assessmentMode === 'percent' && s.mode === 'manual' && nd.miDirekt !== undefined && nd.miDirekt !== null) {
          miPercent = Math.min(100, Math.max(0, nd.miDirekt));
        } else if (miNote > 5) {
          miPercent = Math.min(100, Math.max(0, miNote));
        } else {
          // Standard Austrian 1..5 scale to percentage (1=100%, 2=80%, 3=60%, 4=40%, 5=20%)
          miPercent = Math.min(100, Math.max(0, (6 - miNote) * 20));
        }
      } else if (hasMitarbeitData && adjustedMiRaw > 0) {
        const threshold = (s.thresholds?.[1] || 13);
        miPercent = Math.min(100, Math.max(0, (adjustedMiRaw / threshold) * 100));
      }
    }

    let huePercent: number | null = null;
    const isHueDocumentOnly = homeworkSettings.mode === 'document';
    const hasHomeworkData = nd.hueErfasst === true || (nd.hue || 0) > 0 || (nd.hueAnm || []).length > 0;
    
    if (cfg.g.hue && cfg.g.hue > 0 && hasHomeworkData && !isHueDocumentOnly) {
      const missCount = nd.hue || 0;
      huePercent = Math.max(0, 100 - missCount * homeworkSettings.percentDeduction);
    }

    if (cfg.miOnly) {
      return miPercent !== null ? Math.round(miPercent * 10) / 10 : null;
    }

    const bereiche = [
      { avg: saPercent, gw: cfg.g.sa * 100 },
      { avg: lzkPercent, gw: cfg.g.lzk * 100 },
      { avg: wpPercent, gw: cfg.g.wp * 100 },
      { avg: objPercent, gw: cfg.g.obj * 100 },
      { avg: miPercent, gw: cfg.g.mi * 100 },
    ];
    if (huePercent !== null && !isHueDocumentOnly) {
      bereiche.push({ avg: huePercent, gw: cfg.g.hue * 100 });
    }

    const aktiv = bereiche.filter(b => b.avg !== null && b.gw > 0);
    if (!aktiv.length) return null;

    const sumGw = aktiv.reduce((sum, b) => sum + b.gw, 0);
    if (sumGw === 0) return null;

    const totalPercent = aktiv.reduce((sum, b) => {
      const val = b.avg || 0;
      return sum + val * (b.gw / sumGw);
    }, 0);

    return isNaN(totalPercent) ? null : Math.round(totalPercent * 10) / 10;
  }

  // --- TRADITIONAL NOTEN (GRADES 1..5) MODE ---
  if (cfg.miOnly) {
    return miNote !== null ? Math.round(miNote * 100) / 100 : null;
  }

  function avg(arr: (number | string | null)[]) {
    const vals = (arr || []).map(x => {
      if (typeof x === 'number') return x;
      if (typeof x === 'string') {
        const n = parseFloat(x.replace(',', '.'));
        if (!isNaN(n) && n >= 1 && n <= 5) return n;
        const match = x.match(/(?:^|\D)([1-5])(?:\D|$)/);
        if (match) return parseInt(match[1], 10);
      }
      return null;
    }).filter((x): x is number => 
      typeof x === 'number' && !isNaN(x) && x >= 1 && x <= 5
    );
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const saAvg = (cfg.sa) ? avg(nd.sa) : null;
  const lzkAvg = (cfg.lzk) ? avg(nd.lzk) : null;
  const wpAvg = (cfg.wp) ? avg(nd.wp) : null;
  const objAvg = (cfg.obj) ? avg(nd.aufgaben) : null;
  const miAvg = (cfg.g.mi > 0) ? miNote : null;

  const bereiche = [
    { avg: saAvg, gw: cfg.g.sa * 100 },
    { avg: lzkAvg, gw: cfg.g.lzk * 100 },
    { avg: wpAvg, gw: cfg.g.wp * 100 },
    { avg: objAvg, gw: cfg.g.obj * 100 },
    { avg: miAvg, gw: cfg.g.mi * 100 },
  ];

  const isHueDocumentOnly = homeworkSettings.mode === 'document';
  const hasHomeworkData = nd.hueErfasst === true || (nd.hue || 0) > 0 || (nd.hueAnm || []).length > 0;
  if (cfg.g.hue && cfg.g.hue > 0 && hasHomeworkData && !isHueDocumentOnly) {
    let hueNote = 1;
    const missCount = nd.hue || 0;
    const deductionPerMiss = homeworkSettings.percentDeduction;
    
    if (deductionPerMiss !== undefined && deductionPerMiss > 0) {
      // Calculate grade based on percentage deduction from 100%
      const huePct = Math.max(0, 100 - missCount * deductionPerMiss);
      if (huePct >= 87.5) hueNote = 1;
      else if (huePct >= 75) hueNote = 2;
      else if (huePct >= 62.5) hueNote = 3;
      else if (huePct >= 50) hueNote = 4;
      else hueNote = 5;
    } else {
      if (missCount >= 1 && missCount <= 2) hueNote = 2;
      else if (missCount >= 3 && missCount <= 4) hueNote = 3;
      else if (missCount >= 5 && missCount <= 6) hueNote = 4;
      else if (missCount > 6) hueNote = 5;
    }
    
    bereiche.push({ avg: hueNote, gw: cfg.g.hue * 100 });
  }

  const aktiv = bereiche.filter(b => b.avg !== null && b.gw > 0);
  if (!aktiv.length) return null;

  const sumGw = aktiv.reduce((s, b) => s + b.gw, 0);
  if (sumGw === 0) return null;

  const sumNote = aktiv.reduce((s, b) => {
    const val = b.avg || 0;
    return s + val * (b.gw / sumGw);
  }, 0);

  return isNaN(sumNote) ? null : Math.round(sumNote * 100) / 100;
}
