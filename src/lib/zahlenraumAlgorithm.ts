/**
 * zahlenraumAlgorithm.ts
 *
 * Didaktische Berechnungs- und Datenlogik für das Zahlenraum-Studio der LehrerAPP (F25.1B).
 * Unterstützt exklusiv:
 * - Modus A: Mengen & Zahlenbilder (ZR 10, ZR 20, ZR 100) mit Kraft der Fünf und Zehnerstruktur
 *            Spezialdarstellung ZR 10 nach Isolde Jäger ("Gras unten") als Option
 *            Additive Zerlegung (Zweifarbigkeit, z. B. 7 = 4 + 3)
 * - Modus B: Zahlenstrahl (0–10, 0–20, 0–100, 0–1000, Custom-Bereich z. B. 200–300, -50–50)
 *            Dynamische Teilstriche ohne Label-Kollision
 *            Hauptmarker + bis zu 5 Vergleichsmarker mit optional verdecktem Label (?)
 *            Rechensprünge (bis zu 10 Sprünge, z. B. 23 -> +10 -> 33 -> +4 -> 37, Vor-/Rücksprünge)
 * - 100% offline, keine Quizlogik, keine Bewertung, keine Schülerdaten, keine Audio-Engine.
 */

export type ZahlenraumMode = 'quantity' | 'numberline';
export type ZahlenraumRange = 10 | 20 | 100 | 1000 | 'custom';
export type QuantityStyle = 'classic' | 'jaeger';

export interface ZahlenraumMarker {
  id: string;
  value: number;
  labelHidden?: boolean;
}

export interface ZahlenraumJump {
  id: string;
  from: number;
  step: number;
  to: number;
}

export interface ZahlenraumSettings {
  mode: ZahlenraumMode;
  range: ZahlenraumRange;

  quantityValue: number;
  splitValue?: number;

  customMin?: number;
  customMax?: number;

  markers: Array<ZahlenraumMarker>;

  jumps: Array<ZahlenraumJump>;

  quantityStyle?: QuantityStyle;
}

export const PRESET_RANGES: Record<number, { min: number; max: number; label: string }> = {
  10: { min: 0, max: 10, label: 'ZR 10' },
  20: { min: 0, max: 20, label: 'ZR 20' },
  100: { min: 0, max: 100, label: 'ZR 100' },
  1000: { min: 0, max: 1000, label: 'ZR 1000' },
};

export const DEFAULT_ZAHLENRAUM_SETTINGS: ZahlenraumSettings = {
  mode: 'quantity',
  range: 20,
  quantityValue: 17,
  splitValue: undefined,
  markers: [
    { id: 'm1', value: 17, labelHidden: false }
  ],
  jumps: [],
  quantityStyle: 'classic',
};

export interface GridDotItem {
  index: number;      // 1-basierter Gesamtindex
  row: number;        // 0-basierter Zeilenindex
  col: number;        // 0-basierter Spaltenindex
  isFilled: boolean;  // ist dieser Punkt belegt?
  colorType: 'primary' | 'secondary' | 'empty';
  isFiveBreakCol: boolean;
  isFiveBreakRow: boolean;
}

/**
 * Erzeugt die strukturierte Punktmatrix für ZR 10, 20 und 100.
 *
 * Im ZR 10:
 * - 'classic': 2 Zeilen à 5 Spalten (Reihe 1: 1..5, Reihe 2: 6..10)
 * - 'jaeger': Isolde Jäger 10er-Raster ("Gras unten!"). Punkte füllen spaltenweise:
 *             Ungerade Punkte stehen unten im Gras (Reihe 1), gerade oben (Reihe 0).
 *
 * Im ZR 20:
 * - 2 Zeilen à 10 Spalten mit 5er-Zäsur nach Spalte 5 (Kraft der Fünf).
 *
 * Im ZR 100:
 * - 10 Zeilen à 10 Spalten mit 5er-Zäsur nach Spalte 5 und Zeile 5 (4 Quadranten à 5x5).
 */
export function getStructuredGridDots(
  range: 10 | 20 | 100,
  filledCount: number,
  style: QuantityStyle = 'classic',
  splitValue?: number
): {
  rows: number;
  cols: number;
  dots: GridDotItem[];
  tensCount: number;
  onesCount: number;
} {
  const safeCount = Math.min(range, Math.max(0, Math.floor(filledCount)));
  const split = typeof splitValue === 'number' ? Math.min(safeCount, Math.max(0, Math.floor(splitValue))) : undefined;

  let rows = 2;
  let cols = 5;

  if (range === 20) {
    rows = 2;
    cols = 10;
  } else if (range === 100) {
    rows = 10;
    cols = 10;
  }

  const dots: GridDotItem[] = [];

  if (range === 10 && style === 'jaeger') {
    // Isolde Jäger: 2 Zeilen à 5 Spalten
    // row 0: oben, row 1: unten ("Gras")
    // Punkte füllen spaltenweise von links nach rechts:
    // Für Spalte c (0..4):
    // Punkt 2*c + 1 ist unten (row 1)
    // Punkt 2*c + 2 ist oben (row 0)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Welcher Füllrang gehört zu dieser Zelle?
        // r=1 (unten) bekommt ungerade Zahlen: 1, 3, 5, 7, 9 -> 2*c + 1
        // r=0 (oben) bekommt gerade Zahlen: 2, 4, 6, 8, 10 -> 2*c + 2
        const fillOrder = r === 1 ? 2 * c + 1 : 2 * c + 2;
        const isFilled = fillOrder <= safeCount;

        let colorType: 'primary' | 'secondary' | 'empty' = 'empty';
        if (isFilled) {
          if (split !== undefined) {
            colorType = fillOrder <= split ? 'primary' : 'secondary';
          } else {
            colorType = 'primary';
          }
        }

        dots.push({
          index: fillOrder,
          row: r,
          col: c,
          isFilled,
          colorType,
          isFiveBreakCol: false,
          isFiveBreakRow: false,
        });
      }
    }
  } else {
    // Standard-Didaktik ('classic')
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c + 1;
        const isFilled = index <= safeCount;

        let colorType: 'primary' | 'secondary' | 'empty' = 'empty';
        if (isFilled) {
          if (split !== undefined) {
            colorType = index <= split ? 'primary' : 'secondary';
          } else {
            // Kraft der Fünf: leichte optische Gliederung
            const fiveBlock = Math.floor((c % 10) / 5);
            colorType = fiveBlock === 0 ? 'primary' : 'secondary';
          }
        }

        const isFiveBreakCol = (c === 4 && cols > 5);
        const isFiveBreakRow = (r === 4 && rows > 5);

        dots.push({
          index,
          row: r,
          col: c,
          isFilled,
          colorType,
          isFiveBreakCol,
          isFiveBreakRow,
        });
      }
    }
  }

  return {
    rows,
    cols,
    dots,
    tensCount: Math.floor(safeCount / 10),
    onesCount: safeCount % 10,
  };
}

export type TickType = 'major' | 'medium' | 'minor';

export interface LineTick {
  value: number;
  pct: number;
  type: TickType;
  showLabel: boolean;
  label: string;
}

/**
 * Validiert und normalisiert Min/Max für den Zahlenstrahl.
 * Verhindert min = max, min > max, NaN oder absurde Bereiche.
 */
export function validateLineRange(min: number, max: number): { min: number; max: number } {
  let safeMin = isNaN(min) ? 0 : Math.floor(min);
  let safeMax = isNaN(max) ? 100 : Math.floor(max);

  // Begrenzung auf einen sicheren Bildungsbereich [-10000, 10000]
  safeMin = Math.max(-10000, Math.min(9990, safeMin));
  safeMax = Math.max(-9990, Math.min(10000, safeMax));

  if (safeMin >= safeMax) {
    if (safeMin === safeMax) {
      safeMax = safeMin + 10;
    } else {
      const temp = safeMin;
      safeMin = safeMax;
      safeMax = temp;
    }
  }

  return { min: safeMin, max: safeMax };
}

/**
 * Berechnet didaktisch sinnvolle Teilstriche und Beschriftungen für den Zahlenstrahl.
 * Verhindert Label-Überdeckungen und begrenzt die Ticks auf max. ca. 120.
 */
export function calculateLineTicks(min: number, max: number): {
  ticks: LineTick[];
  majorStep: number;
  mediumStep: number;
  minorStep: number;
} {
  const { min: safeMin, max: safeMax } = validateLineRange(min, max);
  const span = safeMax - safeMin;

  let majorStep = 10;
  let mediumStep = 5;
  let minorStep = 1;

  if (span <= 10) {
    majorStep = 5;
    mediumStep = 1;
    minorStep = 1;
  } else if (span <= 20) {
    majorStep = 10;
    mediumStep = 5;
    minorStep = 1;
  } else if (span <= 100) {
    majorStep = 10;
    mediumStep = 5;
    minorStep = 1;
  } else if (span <= 200) {
    majorStep = 20;
    mediumStep = 10;
    minorStep = 2;
  } else if (span <= 500) {
    majorStep = 50;
    mediumStep = 25;
    minorStep = 5;
  } else if (span <= 1000) {
    majorStep = 100;
    mediumStep = 50;
    minorStep = 10;
  } else {
    const power = Math.pow(10, Math.floor(Math.log10(span)));
    majorStep = power;
    mediumStep = power / 2;
    minorStep = power / 10;
  }

  // Begrenze maximale Ticks
  const effectiveMinor = (span / minorStep > 120) ? mediumStep : minorStep;

  const ticks: LineTick[] = [];
  const startVal = Math.ceil(safeMin / effectiveMinor) * effectiveMinor;

  for (let v = startVal; v <= safeMax; v += effectiveMinor) {
    const isMajor = v % majorStep === 0 || v === safeMin || v === safeMax;
    const isMedium = !isMajor && (v % mediumStep === 0);
    const type: TickType = isMajor ? 'major' : isMedium ? 'medium' : 'minor';

    const pct = ((v - safeMin) / span) * 100;
    const showLabel = isMajor;

    ticks.push({
      value: v,
      pct,
      type,
      showLabel,
      label: v.toString(),
    });
  }

  // Randwerte garantieren
  if (!ticks.some(t => t.value === safeMin)) {
    ticks.unshift({
      value: safeMin,
      pct: 0,
      type: 'major',
      showLabel: true,
      label: safeMin.toString(),
    });
  }
  if (!ticks.some(t => t.value === safeMax)) {
    ticks.push({
      value: safeMax,
      pct: 100,
      type: 'major',
      showLabel: true,
      label: safeMax.toString(),
    });
  }

  return {
    ticks,
    majorStep,
    mediumStep,
    minorStep: effectiveMinor,
  };
}

/**
 * Berechnet die relative Position (0 bis 100%) eines Wertes auf dem Zahlenstrahl
 */
export function getLinePercentage(value: number, min: number, max: number): number {
  const { min: safeMin, max: safeMax } = validateLineRange(min, max);
  const span = safeMax - safeMin;
  const clamped = Math.max(safeMin, Math.min(safeMax, value));
  return ((clamped - safeMin) / span) * 100;
}

/**
 * Erzeugt einen SVG-Bogen für einen didaktischen Zahlensprung.
 */
export function generateJumpArc(
  fromPct: number,
  toPct: number,
  baseY: number = 75,
  maxHeight: number = 40
): {
  pathD: string;
  midX: number;
  midY: number;
  isForward: boolean;
} {
  const isForward = toPct >= fromPct;
  const dist = Math.abs(toPct - fromPct);
  const archH = Math.min(maxHeight, Math.max(14, dist * 0.75));

  const midX = (fromPct + toPct) / 2;
  const midY = baseY - archH;

  const pathD = `M ${fromPct} ${baseY} Q ${midX} ${baseY - archH * 1.5} ${toPct} ${baseY}`;

  return {
    pathD,
    midX,
    midY,
    isForward,
  };
}

/**
 * Validiert und begrenzt Rechensprünge auf den sichtbaren Bereich.
 * Maximal 10 Sprünge.
 */
export function validateJumps(
  jumps: ZahlenraumJump[],
  min: number,
  max: number,
  maxAllowed: number = 10
): ZahlenraumJump[] {
  const { min: safeMin, max: safeMax } = validateLineRange(min, max);
  return jumps
    .slice(0, maxAllowed)
    .filter(j => {
      return (
        !isNaN(j.from) &&
        !isNaN(j.to) &&
        j.from >= safeMin &&
        j.from <= safeMax &&
        j.to >= safeMin &&
        j.to <= safeMax
      );
    });
}

/**
 * Validiert und begrenzt Marker auf den sichtbaren Bereich.
 * Maximal 6 Marker (1 Hauptmarker + bis zu 5 Vergleichsmarker).
 */
export function validateMarkers(
  markers: ZahlenraumMarker[],
  min: number,
  max: number,
  maxAllowed: number = 6
): ZahlenraumMarker[] {
  const { min: safeMin, max: safeMax } = validateLineRange(min, max);
  return markers
    .slice(0, maxAllowed)
    .filter(m => !isNaN(m.value) && m.value >= safeMin && m.value <= safeMax);
}

/**
 * Migriert bestehende Einstellungen aus `anschauung` oder `numberline`
 * transparent in das neue Zahlenraum-Studio Datenmodell.
 */
export function migrateLegacyMathWidget(
  type: string,
  existingSettings?: any
): ZahlenraumSettings {
  const base: ZahlenraumSettings = { ...DEFAULT_ZAHLENRAUM_SETTINGS };

  if (type === 'anschauung' || type === 'widget-anschauung') {
    base.mode = 'quantity';
    base.range = 10;
    base.quantityValue = 7;
    base.quantityStyle = 'jaeger'; // Altes Anschauung nutzte die Jäger-Gras-Methode
    if (existingSettings) {
      if (typeof existingSettings.rasterNumber === 'number') {
        base.quantityValue = Math.min(10, Math.max(0, existingSettings.rasterNumber));
      }
      if (typeof existingSettings.style === 'string') {
        base.quantityStyle = existingSettings.style === 'classic' ? 'classic' : 'jaeger';
      }
    }
  } else if (type === 'numberline' || type === 'widget-numberline') {
    base.mode = 'numberline';
    base.range = 100;
    base.customMin = 0;
    base.customMax = 100;
    if (existingSettings) {
      if (typeof existingSettings.customMin === 'number') base.customMin = existingSettings.customMin;
      if (typeof existingSettings.customMax === 'number') base.customMax = existingSettings.customMax;
      if (typeof existingSettings.range === 'number' && [10, 20, 100, 1000].includes(existingSettings.range)) {
        base.range = existingSettings.range;
      }
      if (typeof existingSettings.target === 'number') {
        base.markers = [{ id: 'm1', value: existingSettings.target, labelHidden: false }];
      }
    }
  }

  // Falls bereits ein ZahlenraumSettings-Objekt vorliegt
  if (existingSettings && (existingSettings.mode === 'quantity' || existingSettings.mode === 'numberline')) {
    return {
      ...base,
      ...existingSettings,
      // Sicherheitsbereinigung: kein placevalue
      markers: Array.isArray(existingSettings.markers)
        ? existingSettings.markers.map((m: any, i: number) => ({
            id: m.id || `m${i + 1}`,
            value: typeof m.value === 'number' ? m.value : 0,
            labelHidden: !!m.labelHidden,
          }))
        : base.markers,
      jumps: Array.isArray(existingSettings.jumps)
        ? existingSettings.jumps.map((j: any, i: number) => ({
            id: j.id || `j${i + 1}`,
            from: typeof j.from === 'number' ? j.from : 0,
            step: typeof j.step === 'number' ? j.step : (j.to - j.from || 1),
            to: typeof j.to === 'number' ? j.to : (j.from + (j.step || 1)),
          }))
        : base.jumps,
    };
  }

  return base;
}
