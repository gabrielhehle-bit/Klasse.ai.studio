/**
 * Kopfrechentrainer - Didaktischer Kernalgorithmus (F25.2)
 *
 * 100% offline, deterministisch testbar, ohne KI, ohne Schülerprofile,
 * ohne Gamification (keine Sterne, Coins, Punkte oder Streaks).
 */

export type MentalMathMode = 'flash' | 'tables' | 'chain';
export type MentalMathOperator = '+' | '-' | '×' | '÷';
export type MentalMathRange = 10 | 20 | 100 | 1000;
export type TenCrossingOption = 'none' | 'force' | 'mixed';
export type TablesVariant = 'mult' | 'div' | 'reverse_mult' | 'reverse_div' | 'mixed';
export type ChainDifficulty = 'easy' | 'medium' | 'hard';
export type PresentationMode = 'teacher' | 'student'; // Lehrkraft zeigt vs Schüler tippt

export interface MentalMathStep {
  op: MentalMathOperator;
  operand: number;
  subtotal: number;
}

export interface MentalMathTask {
  id: string;
  mode: MentalMathMode;
  questionText: string;
  correctAnswer: number;
  promptText?: string;
  left?: number;
  right?: number;
  operator?: MentalMathOperator;
  // Für Rechenkette:
  startValue?: number;
  steps?: MentalMathStep[];
  // Für Umkehraufgaben / Lücken:
  missingPart?: 'left' | 'right' | 'result';
  displayEquation: string; // z. B. "24 + 17 = ?" oder "? × 4 = 24"
}

export interface KopfrechenSettings {
  mode: MentalMathMode;
  presentationMode: PresentationMode;
  // Modus A: Blitzrechnen
  range: MentalMathRange;
  operators: MentalMathOperator[];
  tenCrossing: TenCrossingOption;
  // Modus B: Einmaleins
  selectedTables: number[]; // 1..10
  tablesVariant: TablesVariant;
  // Modus C: Rechenkette
  chainLength: 2 | 3 | 4 | 5;
  chainDifficulty: ChainDifficulty;
  chainOperators: MentalMathOperator[];
  showIntermediates: boolean;
  // UI
  autoRevealOnSolve?: boolean;
}

export const DEFAULT_KOPFRECHEN_SETTINGS: KopfrechenSettings = {
  mode: 'flash',
  presentationMode: 'teacher',
  range: 20,
  operators: ['+', '-'],
  tenCrossing: 'mixed',
  selectedTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  tablesVariant: 'mult',
  chainLength: 3,
  chainDifficulty: 'easy',
  chainOperators: ['+', '-'],
  showIntermediates: false,
  autoRevealOnSolve: false,
};

/**
 * Pseudo-Random Number Generator Typ für deterministische Tests
 */
export type RNG = () => number;

/**
 * Hilfsfunktion: Zufällige Ganzzahl im Bereich [min, max]
 */
export function getRandomInt(min: number, max: number, rng: RNG = Math.random): number {
  const r = rng();
  return Math.floor(r * (max - min + 1)) + min;
}

/**
 * Prüft ob zwei Zahlen bei Addition oder Subtraktion einen Zehnerübergang erzeugen.
 */
export function hasTenCrossing(a: number, b: number, op: '+' | '-'): boolean {
  if (op === '+') {
    return (a % 10) + (b % 10) >= 10;
  } else {
    return (a % 10) < (b % 10);
  }
}

/**
 * Generiert eine einzelne Blitzrechnen-Aufgabe (Modus A)
 */
export function generateFlashTask(settings: KopfrechenSettings, rng: RNG = Math.random): MentalMathTask {
  const ops: MentalMathOperator[] = settings.operators.length > 0 ? settings.operators : ['+'];
  const op: MentalMathOperator = ops[getRandomInt(0, ops.length - 1, rng)];
  const range = settings.range || 20;
  const tenCrossing = settings.tenCrossing || 'mixed';

  let left = 0;
  let right = 0;
  let answer = 0;

  if (op === '+') {
    let attempts = 0;
    do {
      attempts++;
      if (range === 10) {
        left = getRandomInt(1, 9, rng);
        right = getRandomInt(1, 10 - left, rng);
      } else if (range === 20) {
        left = getRandomInt(1, 18, rng);
        right = getRandomInt(1, 20 - left, rng);
      } else if (range === 100) {
        left = getRandomInt(2, 90, rng);
        right = getRandomInt(1, 100 - left, rng);
      } else {
        // ZR 1000
        const step = getRandomInt(1, 10, rng) <= 7 ? 10 : 1; // 70% Zehnerschritte
        const maxTens = Math.floor(1000 / step);
        const lStep = getRandomInt(1, maxTens - 1, rng);
        const rStep = getRandomInt(1, maxTens - lStep, rng);
        left = lStep * step;
        right = rStep * step;
      }
      answer = left + right;

      if (tenCrossing === 'mixed') break;
      const crossing = hasTenCrossing(left, right, '+');
      if (tenCrossing === 'none' && !crossing) break;
      if (tenCrossing === 'force' && crossing) break;
    } while (attempts < 100);

  } else if (op === '-') {
    let attempts = 0;
    do {
      attempts++;
      if (range === 10) {
        left = getRandomInt(2, 10, rng);
        right = getRandomInt(1, left, rng); // Garantiert left - right >= 0
      } else if (range === 20) {
        left = getRandomInt(3, 20, rng);
        right = getRandomInt(1, left, rng);
      } else if (range === 100) {
        left = getRandomInt(5, 100, rng);
        right = getRandomInt(1, left, rng);
      } else {
        // ZR 1000
        const step = getRandomInt(1, 10, rng) <= 7 ? 10 : 1;
        const maxTens = Math.floor(1000 / step);
        const lStep = getRandomInt(2, maxTens, rng);
        const rStep = getRandomInt(1, lStep, rng);
        left = lStep * step;
        right = rStep * step;
      }
      answer = left - right;

      if (tenCrossing === 'mixed') break;
      const crossing = hasTenCrossing(left, right, '-');
      if (tenCrossing === 'none' && !crossing) break;
      if (tenCrossing === 'force' && crossing) break;
    } while (attempts < 100);

  } else if (op === '×') {
    // Multiplikation 1x1 der Volksschule
    if (range === 10) {
      // Ergebnisse bis 10
      const validPairs: [number, number][] = [
        [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10],
        [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
        [3, 1], [3, 2], [3, 3],
        [4, 1], [4, 2],
        [5, 1], [5, 2]
      ];
      const pair = validPairs[getRandomInt(0, validPairs.length - 1, rng)];
      left = pair[0];
      right = pair[1];
    } else if (range === 20) {
      // Ergebnisse bis 20
      const maxA = 10;
      left = getRandomInt(1, maxA, rng);
      const maxB = Math.min(10, Math.floor(20 / left));
      right = getRandomInt(1, Math.max(1, maxB), rng);
    } else {
      // Standard 1x1 (1..10 x 1..10)
      left = getRandomInt(1, 10, rng);
      right = getRandomInt(1, 10, rng);
    }
    answer = left * right;

  } else {
    // Division: Ganzzahlig, Volksschule
    let divRange = range;
    if (divRange === 10) {
      const validDivs: [number, number][] = [
        [10, 2], [10, 5], [10, 1], [8, 2], [8, 4], [6, 2], [6, 3], [4, 2], [9, 3], [6, 1]
      ];
      const p = validDivs[getRandomInt(0, validDivs.length - 1, rng)];
      left = p[0];
      right = p[1];
      answer = left / right;
    } else if (divRange === 20) {
      const divisor = getRandomInt(1, 10, rng);
      const quotient = getRandomInt(1, Math.floor(20 / divisor), rng);
      left = divisor * quotient;
      right = divisor;
      answer = quotient;
    } else {
      // Standard Volksschule 1x1 Division (1..100 / 1..10)
      const divisor = getRandomInt(1, 10, rng);
      const quotient = getRandomInt(1, 10, rng);
      left = divisor * quotient;
      right = divisor;
      answer = quotient;
    }
  }

  const question = `${left} ${op} ${right}`;

  return {
    id: `flash-${Date.now()}-${getRandomInt(100, 999, rng)}`,
    mode: 'flash',
    questionText: question,
    correctAnswer: answer,
    left,
    right,
    operator: op,
    missingPart: 'result',
    displayEquation: `${question} = ?`,
  };
}

/**
 * Generiert eine Einmaleins/Einsineins-Aufgabe (Modus B)
 */
export function generateTablesTask(settings: KopfrechenSettings, rng: RNG = Math.random): MentalMathTask {
  const tables = settings.selectedTables.length > 0 ? settings.selectedTables : [2, 3, 4, 5];
  const row = tables[getRandomInt(0, tables.length - 1, rng)];
  const factor2 = getRandomInt(1, 10, rng);

  let variant = settings.tablesVariant || 'mult';
  if (variant === 'mixed') {
    const variants: TablesVariant[] = ['mult', 'div', 'reverse_mult', 'reverse_div'];
    variant = variants[getRandomInt(0, variants.length - 1, rng)];
  }

  const product = row * factor2;

  if (variant === 'mult') {
    // z. B. 6 × 4 = ?
    return {
      id: `tables-${Date.now()}-${getRandomInt(100, 999, rng)}`,
      mode: 'tables',
      questionText: `${row} × ${factor2}`,
      correctAnswer: product,
      left: row,
      right: factor2,
      operator: '×',
      missingPart: 'result',
      displayEquation: `${row} × ${factor2} = ?`,
    };
  } else if (variant === 'div') {
    // z. B. 24 ÷ 6 = ?
    return {
      id: `tables-${Date.now()}-${getRandomInt(100, 999, rng)}`,
      mode: 'tables',
      questionText: `${product} ÷ ${row}`,
      correctAnswer: factor2,
      left: product,
      right: row,
      operator: '÷',
      missingPart: 'result',
      displayEquation: `${product} ÷ ${row} = ?`,
    };
  } else if (variant === 'reverse_mult') {
    // z. B. ? × 4 = 24
    return {
      id: `tables-${Date.now()}-${getRandomInt(100, 999, rng)}`,
      mode: 'tables',
      questionText: `? × ${factor2} = ${product}`,
      correctAnswer: row,
      left: row,
      right: factor2,
      operator: '×',
      missingPart: 'left',
      displayEquation: `? × ${factor2} = ${product}`,
    };
  } else {
    // reverse_div: z. B. 24 ÷ ? = 4
    return {
      id: `tables-${Date.now()}-${getRandomInt(100, 999, rng)}`,
      mode: 'tables',
      questionText: `${product} ÷ ? = ${factor2}`,
      correctAnswer: row,
      left: product,
      right: factor2,
      operator: '÷',
      missingPart: 'right',
      displayEquation: `${product} ÷ ? = ${factor2}`,
    };
  }
}

/**
 * Generiert eine Rechenkette (Modus C)
 * Schrittweise Berechnung von links nach rechts ohne negative Zwischenwerte
 * und ohne Restdivisionen.
 */
export function generateChainTask(settings: KopfrechenSettings, rng: RNG = Math.random): MentalMathTask {
  const stepsCount = settings.chainLength || 3;
  const diff = settings.chainDifficulty || 'easy';
  const allowedOps: MentalMathOperator[] = settings.chainOperators.length > 0 ? settings.chainOperators : ['+', '-'];

  let attempts = 0;
  while (attempts < 100) {
    attempts++;

    // Startwert je nach Schwierigkeit
    let currentVal = 0;
    if (diff === 'easy') {
      currentVal = getRandomInt(2, 12, rng);
    } else if (diff === 'medium') {
      currentVal = getRandomInt(5, 30, rng);
    } else {
      currentVal = getRandomInt(10, 50, rng);
    }

    const startVal = currentVal;
    const steps: MentalMathStep[] = [];
    let validChain = true;

    for (let i = 0; i < stepsCount; i++) {
      // Wähle Operator
      const op = allowedOps[getRandomInt(0, allowedOps.length - 1, rng)];
      let operand = 0;

      if (op === '+') {
        const maxAdd = diff === 'easy' ? 8 : diff === 'medium' ? 15 : 30;
        operand = getRandomInt(1, maxAdd, rng);
        currentVal += operand;
      } else if (op === '-') {
        if (currentVal <= 1) {
          validChain = false;
          break;
        }
        const maxSub = Math.min(currentVal, diff === 'easy' ? 8 : diff === 'medium' ? 20 : 35);
        operand = getRandomInt(1, maxSub, rng);
        currentVal -= operand;
      } else if (op === '×') {
        // Multiplikator klein halten
        const multiplier = diff === 'easy' ? 2 : getRandomInt(2, 3, rng);
        if (currentVal * multiplier > (diff === 'easy' ? 30 : 100)) {
          validChain = false;
          break;
        }
        operand = multiplier;
        currentVal *= operand;
      } else if (op === '÷') {
        // Finde ganzzahligen Teiler > 1
        const divisors: number[] = [];
        for (let d = 2; d <= 10; d++) {
          if (currentVal % d === 0) divisors.push(d);
        }
        if (divisors.length === 0) {
          validChain = false;
          break;
        }
        operand = divisors[getRandomInt(0, divisors.length - 1, rng)];
        currentVal /= operand;
      }

      if (currentVal < 0) {
        validChain = false;
        break;
      }

      steps.push({
        op,
        operand,
        subtotal: currentVal,
      });
    }

    if (validChain && steps.length === stepsCount) {
      // Baue Kettentext z. B. "12 + 8 − 5 + 10"
      let qText = `${startVal}`;
      for (const s of steps) {
        qText += ` ${s.op} ${s.operand}`;
      }

      return {
        id: `chain-${Date.now()}-${getRandomInt(100, 999, rng)}`,
        mode: 'chain',
        questionText: qText,
        correctAnswer: currentVal,
        startValue: startVal,
        steps,
        missingPart: 'result',
        displayEquation: `${qText} = ?`,
      };
    }
  }

  // Robuster Fallback (2 einfache Schritte)
  return {
    id: `chain-fallback-${Date.now()}`,
    mode: 'chain',
    questionText: '10 + 5 - 3',
    correctAnswer: 12,
    startValue: 10,
    steps: [
      { op: '+', operand: 5, subtotal: 15 },
      { op: '-', operand: 3, subtotal: 12 },
    ],
    missingPart: 'result',
    displayEquation: '10 + 5 - 3 = ?',
  };
}

/**
 * Universeller Dispatcher zur Erzeugung einer Aufgabe
 */
export function generateMentalMathTask(settings: KopfrechenSettings, rng: RNG = Math.random): MentalMathTask {
  switch (settings.mode) {
    case 'tables':
      return generateTablesTask(settings, rng);
    case 'chain':
      return generateChainTask(settings, rng);
    case 'flash':
    default:
      return generateFlashTask(settings, rng);
  }
}

/**
 * Migration von Altdaten aus `mathcards`, `multitrainer` oder `mathchain`
 */
export function migrateLegacyMentalMathWidget(type: string, oldSettings?: any): KopfrechenSettings {
  const base: KopfrechenSettings = { ...DEFAULT_KOPFRECHEN_SETTINGS };

  if (!oldSettings && !type) return base;

  if (type === 'multitrainer') {
    base.mode = 'tables';
    base.tablesVariant = 'mult';
    base.selectedTables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return base;
  }

  if (type === 'mathchain') {
    base.mode = 'chain';
    if (oldSettings?.difficulty) {
      base.chainDifficulty = oldSettings.difficulty;
    }
    base.chainLength = oldSettings?.difficulty === 'hard' ? 4 : 3;
    return base;
  }

  if (type === 'mathcards') {
    base.mode = 'flash';
    if (oldSettings?.numRange === 10 || oldSettings?.numRange === 100) {
      base.range = oldSettings.numRange;
    }
    if (oldSettings?.operator) {
      base.operators = [oldSettings.operator];
    }
    return base;
  }

  // Wenn bereits neue Einstellungen vorhanden sind
  return {
    ...base,
    ...(oldSettings || {}),
  };
}
