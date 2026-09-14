
import { AppState, AssessmentMode, GradeData } from '../types';
import { FAECHER_ALLE, DEFAULT_GEWICHTUNG } from '../constants';

export function getAssessmentMode(app: AppState, fach: string): AssessmentMode {
  const mode = app.notenMeta?.[fach]?.assessmentMode;
  if (mode === 'percent' || mode === 'points' || mode === 'grades') {
    return mode;
  }
  return 'grades';
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
  
  const customSaCount = app.notenMeta?.[fach]?.saCount ?? app.notenMeta?.[baseKey]?.saCount ?? BASE[baseKey].saCount;
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
  const hueWeight = app.settings?.hueWeight !== undefined ? app.settings.hueWeight : (app.settings?.hueGewichten === false ? 0 : 1);
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
        if (miNote > 5) {
          miPercent = Math.min(100, Math.max(0, miNote));
        } else if (assessmentMode === 'points' && miNote <= 5 && s.mode === 'manual' && nd.miDirekt !== undefined && nd.miDirekt > 0) {
          // In points mode with direct entry <= 5, if max points for mi is configured, use it
          const maxMiPoints = app.notenMeta?.[fach]?.maxPoints?.mi?.[0] || 20;
          if (maxMiPoints > 5) {
            miPercent = Math.min(100, Math.max(0, (nd.miDirekt / maxMiPoints) * 100));
          } else {
            miPercent = Math.min(100, Math.max(0, (6 - miNote) * 20));
          }
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
    const isHueDocumentOnly = app.notenMeta?.[fach]?.hueMode === 'document' || app.settings?.hueGewichten === false;
    const hasHomeworkData = nd.hueErfasst === true || (nd.hue || 0) > 0 || (nd.hueAnm || []).length > 0;
    
    if (cfg.g.hue && cfg.g.hue > 0 && hasHomeworkData && !isHueDocumentOnly) {
      const missCount = nd.hue || 0;
      const deductionPerMiss = app.notenMeta?.[fach]?.hueDeduction ?? app.settings?.huePercentDeduction ?? 5;
      huePercent = Math.max(0, 100 - missCount * deductionPerMiss);
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

  const isHueDocumentOnly = app.notenMeta?.[fach]?.hueMode === 'document' || app.settings?.hueGewichten === false;
  const hasHomeworkData = nd.hueErfasst === true || (nd.hue || 0) > 0 || (nd.hueAnm || []).length > 0;
  if (cfg.g.hue && cfg.g.hue > 0 && hasHomeworkData && !isHueDocumentOnly) {
    let hueNote = 1;
    const missCount = nd.hue || 0;
    const deductionPerMiss = app.notenMeta?.[fach]?.hueDeduction ?? app.settings?.huePercentDeduction;
    
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
