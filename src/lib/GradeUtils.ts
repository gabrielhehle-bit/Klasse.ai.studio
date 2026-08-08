
import { AppState, GradeData } from '../types';
import { FAECHER_ALLE, DEFAULT_GEWICHTUNG } from '../constants';

export function getGewichtung(app: AppState, fach: string) {
  if (app.notenGewichtung && app.notenGewichtung[fach]) {
    return app.notenGewichtung[fach];
  }
  return DEFAULT_GEWICHTUNG[fach as keyof typeof DEFAULT_GEWICHTUNG] || DEFAULT_GEWICHTUNG['Deutsch'];
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
    'Deutsch': { saCount: app.notenMeta?.['Deutsch']?.saCount ?? 4, lzk: true, wp: true, hue: true, mi: true, obj: false, miOnly: false, freitext: false, objLabel: app.notenLabels?.obj || 'Aufgabe' },
    'Mathematik': { saCount: app.notenMeta?.['Mathematik']?.saCount ?? 4, lzk: true, wp: true, hue: true, mi: true, obj: false, miOnly: false, freitext: false, objLabel: app.notenLabels?.obj || 'Aufgabe' },
    'Sachunterricht': { saCount: 0, lzk: true, wp: true, hue: true, mi: true, obj: false, miOnly: false, freitext: false, objLabel: app.notenLabels?.obj || 'Aufgabe' },
    'Englisch': { saCount: 0, lzk: true, wp: true, hue: false, mi: true, obj: false, miOnly: false, freitext: false, objLabel: app.notenLabels?.obj || 'Aufgabe' },
    'Türkisch': { saCount: 0, lzk: true, wp: true, hue: false, mi: true, obj: false, miOnly: false, freitext: false, objLabel: app.notenLabels?.obj || 'Aufgabe' },
    'Musikerziehung': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: false, miOnly: true, freitext: true, objLabel: app.notenLabels?.obj || 'Aufgabe' },
    'Bildnerische Erziehung': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: true, miOnly: false, freitext: true, objLabel: app.notenLabels?.obj || 'Kunstobjekt' },
    'Werken (TEC)': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: true, miOnly: false, freitext: true, objLabel: app.notenLabels?.obj || 'Werkstück' },
    'Werken (TEX)': { saCount: 0, lzk: true, wp: false, hue: false, mi: true, obj: true, miOnly: false, freitext: true, objLabel: app.notenLabels?.obj || 'Werkstück' },
    'Bewegung und Sport': { saCount: 0, lzk: false, wp: false, hue: false, mi: true, obj: false, miOnly: true, freitext: true, objLabel: app.notenLabels?.obj || 'Aufgabe' },
    'Religion': { saCount: 0, lzk: false, wp: false, hue: false, mi: true, obj: false, miOnly: true, freitext: false, objLabel: app.notenLabels?.obj || 'Aufgabe' },
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

  const base = {
    ...(BASE[baseKey] || BASE['Deutsch']),
    saCount: customSaCount,
    hue: isHueAllowed
  };
  const cfg = {
    ...base,
    sa: base.saCount > 0 && g.sa > 0,
    lzk: base.lzk && g.lzk > 0,
    wp: base.wp && g.wp > 0,
    obj: base.obj && g.obj > 0,
    g: {
      ...g,
      hue: (gw.hue || 0) / 100 // add hue percentage weight
    },
  };

  // Nebenfächer fallback
  if (cfg.obj && cfg.g.obj === 0) cfg.g.obj = 0.6;
  if (cfg.obj && cfg.g.mi === 0) cfg.g.mi = 0.4;
  
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
  const isFachActive = !app.faecher || app.faecher.includes(fach) || fach === 'Unterricht';
  const nd = app.noten?.[sid]?.[fach]?.[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };

  if (!isFachActive) {
    if (nd.endnote) {
      const parsed = parseFloat(nd.endnote.toString().replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
    }
    return null;
  }

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
    miNote = nd.miDirekt || null;
  } else {
    if (nd.miDirekt !== undefined && nd.miDirekt !== null) {
      miNote = nd.miDirekt;
    } else if (hasMitarbeitData && (adjustedMiRaw > 0 || (s.mode === 'relative' && s.relative_confirmed))) {
      miNote = miZuNote(adjustedMiRaw, s, app.mitarbeit, fach, sem, app.schueler);
    }
  }

  if (cfg.miOnly) {
    return miNote !== null ? Math.round(miNote * 100) / 100 : null;
  }

  function avg(arr: (number | string | null)[]) {
    const vals = (arr || []).map(x => {
      if (typeof x === 'number') return x;
      if (typeof x === 'string') {
        const n = parseFloat(x.replace(',', '.'));
        if (!isNaN(n) && n >= 1 && n <= 5) return n;
        // Fallback: extract a single digit 1-5 from the string, ensuring it's not part of a larger number
        // so that "guter 3er" or "2 (24P)" map properly, but "24P" doesn't map to 2.
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

  const hasHomeworkData = nd.hueErfasst === true || (nd.hue || 0) > 0 || (nd.hueAnm || []).length > 0;
  if (cfg.g.hue && cfg.g.hue > 0 && hasHomeworkData) {
    let hueNote = 1;
    const missCount = nd.hue || 0;
    if (missCount >= 1 && missCount <= 2) hueNote = 2;
    else if (missCount >= 3 && missCount <= 4) hueNote = 3;
    else if (missCount >= 5 && missCount <= 6) hueNote = 4;
    else if (missCount > 6) hueNote = 5;
    
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
