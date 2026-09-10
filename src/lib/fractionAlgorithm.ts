/**
 * fractionAlgorithm.ts
 *
 * Fachlogik für den Bruch-Visualisierer (F25.3).
 * 100 % offline, deterministisch, keine KI, keine Gamification.
 */

export type FractionMode = 'circle' | 'strip' | 'compare';
export type CompareRepresentation = 'circle' | 'strip';

export interface FractionValue {
  numerator: number;
  denominator: number;
}

export interface FractionVisualizerSettings {
  mode: FractionMode;
  primary: FractionValue;
  secondary?: FractionValue;
  compareRepresentation?: CompareRepresentation;
  revealComparison?: boolean;
}

export const MIN_DENOMINATOR = 2;
export const MAX_DENOMINATOR = 12;
export const MIN_NUMERATOR = 0;

export const DEFAULT_FRACTION_SETTINGS: FractionVisualizerSettings = {
  mode: 'circle',
  primary: { numerator: 1, denominator: 2 },
  secondary: { numerator: 2, denominator: 4 },
  compareRepresentation: 'circle',
  revealComparison: false,
};

/**
 * Größter gemeinsamer Teiler (ggT / GCD)
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Kleinstes gemeinsames Vielfaches (kgV / LCM)
 */
export function lcm(a: number, b: number): number {
  const x = Math.abs(Math.round(a));
  const y = Math.abs(Math.round(b));
  if (x === 0 || y === 0) return 0;
  return Math.abs(x * y) / gcd(x, y);
}

/**
 * Kürzt einen Bruch vollständig
 */
export function simplifyFraction(f: FractionValue): FractionValue {
  const d = Math.max(1, Math.abs(Math.round(f.denominator)));
  const n = Math.max(0, Math.abs(Math.round(f.numerator)));
  const g = gcd(n, d);
  if (g <= 1) return { numerator: n, denominator: d };
  return {
    numerator: n / g,
    denominator: d / g,
  };
}

/**
 * Prüft mathematische Gleichwertigkeit zweier Brüche (z.B. 1/2 = 2/4)
 */
export function areFractionsEquivalent(f1: FractionValue, f2: FractionValue): boolean {
  const n1 = Math.round(f1.numerator);
  const d1 = Math.round(f1.denominator);
  const n2 = Math.round(f2.numerator);
  const d2 = Math.round(f2.denominator);
  if (d1 === 0 || d2 === 0) return false;
  return n1 * d2 === n2 * d1;
}

/**
 * Vergleicht zwei Brüche (<, =, >)
 */
export function compareFractions(f1: FractionValue, f2: FractionValue): '<' | '=' | '>' {
  const n1 = Math.round(f1.numerator);
  const d1 = Math.round(f1.denominator);
  const n2 = Math.round(f2.numerator);
  const d2 = Math.round(f2.denominator);
  const diff = n1 * d2 - n2 * d1;
  if (diff < 0) return '<';
  if (diff > 0) return '>';
  return '=';
}

/**
 * Validiert einen Bruch (Nenner 2-12, Zähler 0 bis Nenner)
 */
export function validateFraction(f?: Partial<FractionValue>): FractionValue {
  const rawDenom = typeof f?.denominator === 'number' ? f.denominator : 2;
  const den = Math.min(MAX_DENOMINATOR, Math.max(MIN_DENOMINATOR, Math.round(rawDenom)));
  const rawNum = typeof f?.numerator === 'number' ? f.numerator : 0;
  const num = Math.min(den, Math.max(MIN_NUMERATOR, Math.round(rawNum)));
  return { numerator: num, denominator: den };
}

/**
 * Validiert vollständige Settings
 */
export function validateSettings(s?: Partial<FractionVisualizerSettings>): FractionVisualizerSettings {
  const mode: FractionMode =
    s?.mode === 'circle' || s?.mode === 'strip' || s?.mode === 'compare'
      ? s.mode
      : 'circle';

  const primary = validateFraction(s?.primary ?? DEFAULT_FRACTION_SETTINGS.primary);
  const secondary = validateFraction(s?.secondary ?? DEFAULT_FRACTION_SETTINGS.secondary);
  const compareRepresentation: CompareRepresentation =
    s?.compareRepresentation === 'strip' ? 'strip' : 'circle';
  const revealComparison = Boolean(s?.revealComparison);

  return {
    mode,
    primary,
    secondary,
    compareRepresentation,
    revealComparison,
  };
}

/**
 * Berechnet SVG-Pfad für ein Kreissegment (Kreismodus)
 */
export function getCircleSlicePath(
  index: number,
  total: number,
  cx: number = 100,
  cy: number = 100,
  radius: number = 80
): string {
  if (total <= 1) {
    return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} Z`;
  }

  const anglePerSlice = 360 / total;
  // Start oben bei -90 Grad (12 Uhr)
  const startAngleDeg = -90 + index * anglePerSlice;
  const endAngleDeg = -90 + (index + 1) * anglePerSlice;

  const rad = Math.PI / 180;
  const x1 = cx + radius * Math.cos(startAngleDeg * rad);
  const y1 = cy + radius * Math.sin(startAngleDeg * rad);
  const x2 = cx + radius * Math.cos(endAngleDeg * rad);
  const y2 = cy + radius * Math.sin(endAngleDeg * rad);

  const largeArcFlag = anglePerSlice > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
}

/**
 * Berechnet didaktische Erläuterung für den Vergleich zweier Brüche
 */
export function getComparisonExplanation(f1: FractionValue, f2: FractionValue): {
  symbol: '<' | '=' | '>';
  isEquivalent: boolean;
  commonDenominator: number;
  expandedNum1: number;
  expandedNum2: number;
  text: string;
} {
  const v1 = validateFraction(f1);
  const v2 = validateFraction(f2);
  const symbol = compareFractions(v1, v2);
  const isEquivalent = areFractionsEquivalent(v1, v2);
  const commonDen = lcm(v1.denominator, v2.denominator);
  const m1 = commonDen / v1.denominator;
  const m2 = commonDen / v2.denominator;
  const expNum1 = v1.numerator * m1;
  const expNum2 = v2.numerator * m2;

  let text = '';
  if (isEquivalent) {
    if (v1.denominator === v2.denominator) {
      text = 'Identische Brüche mit gleichem Zähler und Nenner.';
    } else if (v1.denominator < v2.denominator) {
      text = `Gleichwertig: ${v1.numerator}/${v1.denominator} mit ${m1} erweitert ergibt ${v2.numerator}/${v2.denominator}.`;
    } else {
      text = `Gleichwertig: ${v1.numerator}/${v1.denominator} mit ${m2} gekürzt ergibt ${v2.numerator}/${v2.denominator}.`;
    }
  } else {
    if (v1.denominator === v2.denominator) {
      text = `Gleichnamig: Bei gleichem Nenner (${v1.denominator}) entscheidet der Zähler: ${v1.numerator} ${symbol} ${v2.numerator}.`;
    } else {
      text = `Auf gemeinsamen Nenner ${commonDen} erweitert: ${expNum1}/${commonDen} ${symbol} ${expNum2}/${commonDen}.`;
    }
  }

  return {
    symbol,
    isEquivalent,
    commonDenominator: commonDen,
    expandedNum1: expNum1,
    expandedNum2: expNum2,
    text,
  };
}

/**
 * Migration alter Widgets in das neue Bruch-Visualisierer Modell
 * - fractions -> Vergleichsmodus oder fachlich passender alter Startmodus
 * - fractioncake -> Kreis
 * - fractiongrid -> Streifen
 */
export function migrateLegacyFractionWidget(
  legacyType: string,
  rawSettings?: any
): FractionVisualizerSettings {
  if (legacyType === 'fractioncake') {
    // Bruch-Torte -> Kreis
    const denom = typeof rawSettings?.denom === 'number'
      ? Math.min(MAX_DENOMINATOR, Math.max(MIN_DENOMINATOR, rawSettings.denom))
      : 4;
    const slices = Array.isArray(rawSettings?.userSlices) ? rawSettings.userSlices : null;
    const activeCount = slices
      ? slices.filter(Boolean).length
      : typeof rawSettings?.activeCount === 'number'
      ? rawSettings.activeCount
      : Math.floor(denom / 2);
    const num = Math.min(denom, Math.max(0, activeCount));

    return {
      mode: 'circle',
      primary: { numerator: num, denominator: denom },
      secondary: { numerator: 2, denominator: 4 },
      compareRepresentation: 'circle',
      revealComparison: false,
    };
  }

  if (legacyType === 'fractiongrid') {
    // Bruchteile-Maler -> Streifen
    const total = typeof rawSettings?.totalSquares === 'number'
      ? Math.min(MAX_DENOMINATOR, Math.max(MIN_DENOMINATOR, rawSettings.totalSquares))
      : 8;
    const target = typeof rawSettings?.targetNum === 'number'
      ? Math.min(total, Math.max(0, rawSettings.targetNum))
      : 3;

    return {
      mode: 'strip',
      primary: { numerator: target, denominator: total },
      secondary: { numerator: 2, denominator: 4 },
      compareRepresentation: 'strip',
      revealComparison: false,
    };
  }

  if (legacyType === 'fractions') {
    // Altes fractions -> Vergleichsmodus
    const den1 = typeof rawSettings?.denominator === 'number'
      ? Math.min(MAX_DENOMINATOR, Math.max(MIN_DENOMINATOR, rawSettings.denominator))
      : 2;
    const num1 = typeof rawSettings?.numerator === 'number'
      ? Math.min(den1, Math.max(0, rawSettings.numerator))
      : 1;

    return {
      mode: 'compare',
      primary: { numerator: num1, denominator: den1 },
      secondary: { numerator: 2, denominator: 4 },
      compareRepresentation: rawSettings?.viewMode === 'bar' ? 'strip' : 'circle',
      revealComparison: false,
    };
  }

  // Fractionvisualizer oder unbekannt: validieren
  return validateSettings(rawSettings);
}
