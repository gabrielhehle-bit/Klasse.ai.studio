/**
 * F25.4 – Calculator & Fachmodul Mathematik Core Algorithm
 * 
 * 100 % offline, deterministisch, keine KI, keine externen Bibliotheken.
 * Deutsche/österreichische Komma-Darstellung, floating-point-artefaktfreie
 * Berechnung, saubere Division durch 0 ("Nicht durch 0 teilbar").
 */

export interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

export interface CalculatorState {
  currentInput: string; // z.B. "0", "12,5", "-3"
  previousValue: number | null;
  operator: string | null; // "+", "−", "×", "÷"
  expressionDisplay: string; // z.B. "12,5 + 3,8 =" oder "15 ×"
  isNewNumber: boolean;
  error: string | null;
  history: CalculationHistoryItem[];
}

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  currentInput: "0",
  previousValue: null,
  operator: null,
  expressionDisplay: "",
  isNewNumber: true,
  error: null,
  history: [],
};

/**
 * Wandelt eine deutsche Komma-Zahl oder interne Zahl in ein sauberes JS-Number um.
 */
export const parseDisplayNumber = (input: string): number => {
  if (!input || input === "Error") return 0;
  const normalized = input.replace(/\./g, "").replace(",", ".");
  const val = parseFloat(normalized);
  return Number.isFinite(val) ? val : 0;
};

/**
 * Formatiert eine Zahl im deutschen/österreichischen Format mit Komma als Dezimaltrenner.
 * Eliminiert Gleitkomma-Artefakte wie 0.30000000000000004.
 */
export const formatDisplayNumber = (num: number, maxDecimals: number = 8): string => {
  if (!Number.isFinite(num)) {
    return "Nicht definiert";
  }

  // Floating-Point-Artefakte über Präzisionsrundung bereinigen
  const precisionFix = parseFloat(num.toPrecision(12));
  
  // Runden auf maxDecimals
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(precisionFix * factor) / factor;

  const parts = rounded.toString().split(".");
  const intPart = parts[0];
  const decPart = parts[1];

  if (!decPart) {
    return intPart;
  }
  return `${intPart},${decPart}`;
};

/**
 * Führt eine Grundrechenart aus.
 */
export const calculateResult = (
  a: number,
  operator: string,
  b: number
): { result?: number; error?: string } => {
  switch (operator) {
    case "+": {
      const res = parseFloat((a + b).toPrecision(12));
      return { result: res };
    }
    case "-":
    case "−": {
      const res = parseFloat((a - b).toPrecision(12));
      return { result: res };
    }
    case "*":
    case "×":
    case "x":
    case "X": {
      const res = parseFloat((a * b).toPrecision(12));
      return { result: res };
    }
    case "/":
    case "÷":
    case ":": {
      if (b === 0) {
        return { error: "Nicht durch 0 teilbar" };
      }
      const res = parseFloat((a / b).toPrecision(12));
      return { result: res };
    }
    default:
      return { result: b };
  }
};

/**
 * Ziffern-Eingabe (0-9, 00)
 */
export const inputDigit = (state: CalculatorState, digit: string): CalculatorState => {
  if (state.error) {
    return {
      ...state,
      error: null,
      currentInput: digit === "00" ? "0" : digit,
      isNewNumber: false,
    };
  }

  if (state.isNewNumber) {
    return {
      ...state,
      currentInput: digit === "00" ? "0" : digit,
      isNewNumber: false,
    };
  }

  // Wenn nur "0" steht und wieder Ziffer kommt
  if (state.currentInput === "0" && digit !== "00") {
    return {
      ...state,
      currentInput: digit,
    };
  }
  if (state.currentInput === "0" && digit === "00") {
    return state;
  }

  // Max 14 Zeichen zur Vermeidung von Layout-Sprüngen
  if (state.currentInput.replace(/[-,]/g, "").length >= 12) {
    return state;
  }

  return {
    ...state,
    currentInput: state.currentInput + digit,
  };
};

/**
 * Komma-Eingabe
 */
export const inputDecimal = (state: CalculatorState): CalculatorState => {
  if (state.error) {
    return {
      ...state,
      error: null,
      currentInput: "0,",
      isNewNumber: false,
    };
  }

  if (state.isNewNumber) {
    return {
      ...state,
      currentInput: "0,",
      isNewNumber: false,
    };
  }

  if (state.currentInput.includes(",")) {
    return state;
  }

  return {
    ...state,
    currentInput: state.currentInput + ",",
  };
};

/**
 * Operator-Eingabe (+, −, ×, ÷)
 */
export const inputOperator = (state: CalculatorState, op: string): CalculatorState => {
  const normalizedOp = op === "*" || op === "x" || op === "X" ? "×" : op === "/" || op === ":" ? "÷" : op === "-" ? "−" : op;
  const currentVal = parseDisplayNumber(state.currentInput);

  if (state.error) {
    return {
      ...state,
      error: null,
      previousValue: 0,
      operator: normalizedOp,
      expressionDisplay: `0 ${normalizedOp}`,
      isNewNumber: true,
    };
  }

  // Falls bereits ein Operator vorhanden ist und eine Zahl eingegeben wurde: Zwischenergebnis berechnen
  if (state.operator && !state.isNewNumber && state.previousValue !== null) {
    const calc = calculateResult(state.previousValue, state.operator, currentVal);
    if (calc.error) {
      return {
        ...state,
        error: calc.error,
        currentInput: "0",
        previousValue: null,
        operator: null,
        expressionDisplay: "",
        isNewNumber: true,
      };
    }
    const newPrev = calc.result!;
    return {
      ...state,
      previousValue: newPrev,
      operator: normalizedOp,
      currentInput: formatDisplayNumber(newPrev),
      expressionDisplay: `${formatDisplayNumber(newPrev)} ${normalizedOp}`,
      isNewNumber: true,
    };
  }

  return {
    ...state,
    previousValue: currentVal,
    operator: normalizedOp,
    expressionDisplay: `${formatDisplayNumber(currentVal)} ${normalizedOp}`,
    isNewNumber: true,
  };
};

/**
 * Ist-Gleich-Taste (=)
 */
export const calculateEquals = (state: CalculatorState): CalculatorState => {
  if (!state.operator || state.previousValue === null) {
    return state;
  }

  const currentVal = parseDisplayNumber(state.currentInput);
  const calc = calculateResult(state.previousValue, state.operator, currentVal);

  if (calc.error) {
    return {
      ...state,
      error: calc.error,
      expressionDisplay: `${formatDisplayNumber(state.previousValue)} ${state.operator} ${formatDisplayNumber(currentVal)} =`,
      previousValue: null,
      operator: null,
      isNewNumber: true,
    };
  }

  const resultNum = calc.result!;
  const resultFormatted = formatDisplayNumber(resultNum);
  const expr = `${formatDisplayNumber(state.previousValue)} ${state.operator} ${formatDisplayNumber(currentVal)}`;

  const newHistoryItem: CalculationHistoryItem = {
    id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    expression: expr,
    result: resultFormatted,
    timestamp: Date.now(),
  };

  // Maximal 10 Einträge im lokalen Verlauf
  const updatedHistory = [newHistoryItem, ...state.history.slice(0, 9)];

  return {
    ...state,
    currentInput: resultFormatted,
    previousValue: null,
    operator: null,
    expressionDisplay: `${expr} =`,
    isNewNumber: true,
    error: null,
    history: updatedHistory,
  };
};

/**
 * C (Clear) – setzt aktuellen Rechenschritt zurück
 */
export const inputClear = (state: CalculatorState): CalculatorState => {
  return {
    ...state,
    currentInput: "0",
    previousValue: null,
    operator: null,
    expressionDisplay: "",
    isNewNumber: true,
    error: null,
  };
};

/**
 * Backspace (DEL) – löscht letzte Ziffer
 */
export const inputBackspace = (state: CalculatorState): CalculatorState => {
  if (state.error) {
    return inputClear(state);
  }

  if (state.isNewNumber) {
    return state;
  }

  const trimmed = state.currentInput.slice(0, -1);
  if (trimmed === "" || trimmed === "-") {
    return {
      ...state,
      currentInput: "0",
      isNewNumber: true,
    };
  }

  return {
    ...state,
    currentInput: trimmed,
  };
};

/**
 * Vorzeichenwechsel (±)
 */
export const toggleSign = (state: CalculatorState): CalculatorState => {
  if (state.error || state.currentInput === "0") {
    return state;
  }

  if (state.currentInput.startsWith("-")) {
    return {
      ...state,
      currentInput: state.currentInput.slice(1),
    };
  }

  return {
    ...state,
    currentInput: "-" + state.currentInput,
  };
};

/**
 * Prozentrechnung (%)
 */
export const inputPercent = (state: CalculatorState): CalculatorState => {
  if (state.error) return state;

  const currentVal = parseDisplayNumber(state.currentInput);

  if (state.previousValue !== null && state.operator) {
    // Grundschul-Prozent: z. B. 200 + 10% => 10% von 200 = 20
    const percentVal = (state.previousValue * currentVal) / 100;
    return {
      ...state,
      currentInput: formatDisplayNumber(percentVal),
      isNewNumber: false,
    };
  }

  // Einfache Prozentteilung (z. B. 50% => 0,5)
  const divided = currentVal / 100;
  return {
    ...state,
    currentInput: formatDisplayNumber(divided),
    isNewNumber: false,
  };
};

/**
 * Verlauf löschen
 */
export const clearHistory = (state: CalculatorState): CalculatorState => {
  return {
    ...state,
    history: [],
  };
};

/**
 * Tastatureingaben verarbeiten
 */
export const handleKeyInput = (state: CalculatorState, key: string): CalculatorState | null => {
  if (/^[0-9]$/.test(key)) {
    return inputDigit(state, key);
  }
  if (key === "," || key === ".") {
    return inputDecimal(state);
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "x" || key === "X" || key === ":") {
    return inputOperator(state, key);
  }
  if (key === "Enter" || key === "=") {
    return calculateEquals(state);
  }
  if (key === "Backspace") {
    return inputBackspace(state);
  }
  if (key === "Escape" || key.toLowerCase() === "c") {
    return inputClear(state);
  }
  if (key === "%") {
    return inputPercent(state);
  }
  return null;
};

// ==========================================
// FACHMODUL MATHEMATIK – KONSISTENZPRÜFUNG
// ==========================================

export interface MathFachmodulTool {
  id: string;
  name: string;
  type: string;
  isConsolidated: boolean;
  desc: string;
}

/**
 * Genau die 10 Mathematik-Fachtools gemäß F25.4:
 * - 3 Konsolidierte Tools
 * - 7 Spezialtools
 */
export const MATH_FACHMODUL_TOOLS: MathFachmodulTool[] = [
  // 3 Konsolidierte Tools
  {
    id: "zahlenraum",
    name: "Zahlenraum-Studio",
    type: "zahlenraum",
    isConsolidated: true,
    desc: "Mengenbilder, Hunderterfeld & Zahlenstrahl (ZR 10 bis 1000)",
  },
  {
    id: "kopfrechnen",
    name: "Kopfrechentrainer",
    type: "kopfrechnen",
    isConsolidated: true,
    desc: "Blitzrechnen, Einmaleins/Einsineins & Rechenketten",
  },
  {
    id: "fractionvisualizer",
    name: "Bruch-Visualisierer",
    type: "fractionvisualizer",
    isConsolidated: true,
    desc: "Brüche im Kreis & Streifen darstellen und vergleichen",
  },
  // 7 Spezialtools
  {
    id: "mathbalancer",
    name: "Rechenwaage",
    type: "mathbalancer",
    isConsolidated: false,
    desc: "Gleiche die Balkenwaage mit Gewichten aus",
  },
  {
    id: "moneycalc",
    name: "Geld-Rechner",
    type: "moneycalc",
    isConsolidated: false,
    desc: "Münzen und Scheine zählen und rechnen",
  },
  {
    id: "mathpyramid",
    name: "Zahlenmauer",
    type: "mathpyramid",
    isConsolidated: false,
    desc: "Zahlenpyramiden durch Addition und Subtraktion lösen",
  },
  {
    id: "clockpuzzle",
    name: "Uhrentrainer",
    type: "clockpuzzle",
    isConsolidated: false,
    desc: "Lerne analoge und digitale Uhrzeiten einzustellen",
  },
  {
    id: "geometry",
    name: "Geometrie",
    type: "geometry",
    isConsolidated: false,
    desc: "Geometrische Formen, Flächen und Muster",
  },
  {
    id: "angledetective",
    name: "Winkel-Detektiv",
    type: "angledetective",
    isConsolidated: false,
    desc: "Schätze und bestimme Winkel im Scheinwerferstrahl",
  },
  {
    id: "estimationjar",
    name: "Schätzglas",
    type: "estimationjar",
    isConsolidated: false,
    desc: "Mengen und Murmelanzahlen im Glas schätzen",
  },
];

/**
 * 4 Altlasten, die aus dem Picker und Katalog entfernt wurden.
 */
export const RETIRED_MATH_WIDGETS = [
  "divrobot",
  "mathduel",
  "shapepuzzle",
  "sorting",
] as const;

export type RetiredMathWidgetType = (typeof RETIRED_MATH_WIDGETS)[number];

export const isMathFachmodulTool = (type: string): boolean => {
  return MATH_FACHMODUL_TOOLS.some((t) => t.type === type);
};

export const isRetiredMathWidget = (type: string): boolean => {
  return RETIRED_MATH_WIDGETS.includes(type as RetiredMathWidgetType);
};

export const getRetiredWidgetFallbackMessage = (type: string): string => {
  switch (type) {
    case "sorting":
      return "Dieses ältere Mathematik-Widget wird nicht mehr unterstützt. Nutzen Sie für Zahlenfolgen & Ordnen das Zahlenraum-Studio.";
    case "divrobot":
    case "mathduel":
    case "shapepuzzle":
    default:
      return "Dieses ältere Mathematik-Widget wird nicht mehr unterstützt.";
  }
};
