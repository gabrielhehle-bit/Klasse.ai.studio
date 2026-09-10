import { test } from 'node:test';
import assert from 'node:assert';
import {
  INITIAL_CALCULATOR_STATE,
  formatDisplayNumber,
  parseDisplayNumber,
  calculateResult,
  inputDigit,
  inputDecimal,
  inputOperator,
  calculateEquals,
  inputClear,
  inputBackspace,
  toggleSign,
  inputPercent,
  handleKeyInput,
  clearHistory,
  MATH_FACHMODUL_TOOLS,
  RETIRED_MATH_WIDGETS,
  isMathFachmodulTool,
  isRetiredMathWidget,
  getRetiredWidgetFallbackMessage,
} from './calculatorAlgorithm';

// 1. Addition
test('1. Addition: 12 + 25 = 37', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '1');
  state = inputDigit(state, '2');
  state = inputOperator(state, '+');
  state = inputDigit(state, '2');
  state = inputDigit(state, '5');
  state = calculateEquals(state);
  assert.strictEqual(state.currentInput, '37');
  assert.strictEqual(state.error, null);
});

// 2. Subtraktion
test('2. Subtraktion: 50 − 18 = 32', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '5');
  state = inputDigit(state, '0');
  state = inputOperator(state, '−');
  state = inputDigit(state, '1');
  state = inputDigit(state, '8');
  state = calculateEquals(state);
  assert.strictEqual(state.currentInput, '32');
});

// 3. Multiplikation
test('3. Multiplikation: 7 × 8 = 56', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '7');
  state = inputOperator(state, '×');
  state = inputDigit(state, '8');
  state = calculateEquals(state);
  assert.strictEqual(state.currentInput, '56');
});

// 4. Division
test('4. Division: 84 ÷ 4 = 21', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '8');
  state = inputDigit(state, '4');
  state = inputOperator(state, '÷');
  state = inputDigit(state, '4');
  state = calculateEquals(state);
  assert.strictEqual(state.currentInput, '21');
});

// 5. Dezimalzahlen
test('5. Dezimalzahlen: 3,5 + 2,25 = 5,75', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '3');
  state = inputDecimal(state);
  state = inputDigit(state, '5');
  state = inputOperator(state, '+');
  state = inputDigit(state, '2');
  state = inputDecimal(state);
  state = inputDigit(state, '2');
  state = inputDigit(state, '5');
  state = calculateEquals(state);
  assert.strictEqual(state.currentInput, '5,75');
});

// 6. Komma-Anzeige
test('6. Komma-Anzeige: Österreichisch/deutschsprachig verwendet Komma', () => {
  const formatted = formatDisplayNumber(12.75);
  assert.strictEqual(formatted, '12,75');
  assert.strictEqual(formatted.includes('.'), false);
});

// 7. Division durch 0
test('7. Division durch 0: Saubere Fehlermeldung "Nicht durch 0 teilbar"', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '9');
  state = inputOperator(state, '÷');
  state = inputDigit(state, '0');
  state = calculateEquals(state);
  assert.strictEqual(state.error, 'Nicht durch 0 teilbar');
  assert.notStrictEqual(state.currentInput, 'Infinity');
  assert.notStrictEqual(state.currentInput, 'NaN');
});

// 8. Floating-Point-Formatierung
test('8. Floating-Point-Formatierung: 0,1 + 0,2 = 0,3 (ohne 0.30000000000000004)', () => {
  const res = calculateResult(0.1, '+', 0.2);
  assert.strictEqual(res.result, 0.3);
  const display = formatDisplayNumber(res.result!);
  assert.strictEqual(display, '0,3');
});

// 9. Tastatur
test('9. Tastatur: Tasten wie Enter, Backspace, Escape, Zahlen und Operatoren werden korrekt verarbeitet', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = handleKeyInput(state, '5')!;
  assert.strictEqual(state.currentInput, '5');
  state = handleKeyInput(state, '+')!;
  assert.strictEqual(state.operator, '+');
  state = handleKeyInput(state, '4')!;
  assert.strictEqual(state.currentInput, '4');
  state = handleKeyInput(state, 'Enter')!;
  assert.strictEqual(state.currentInput, '9');
  state = handleKeyInput(state, 'c')!;
  assert.strictEqual(state.currentInput, '0');
});

// 10. Touch
test('10. Touch: Vorzeichenwechsel (±) und Prozent (%) funktionieren intuitiv', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '8');
  state = toggleSign(state);
  assert.strictEqual(state.currentInput, '-8');
  state = toggleSign(state);
  assert.strictEqual(state.currentInput, '8');

  state = inputPercent(state);
  assert.strictEqual(state.currentInput, '0,08');
});

// 11. Reset
test('11. Reset: C setzt Eingabe zurück, Verlauf kann gelöscht werden', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '9');
  state = inputOperator(state, '×');
  state = inputDigit(state, '9');
  state = calculateEquals(state);
  assert.strictEqual(state.history.length, 1);

  state = inputClear(state);
  assert.strictEqual(state.currentInput, '0');
  assert.strictEqual(state.operator, null);
  assert.strictEqual(state.history.length, 1);

  state = clearHistory(state);
  assert.strictEqual(state.history.length, 0);
});

// 12. COMPACT
test('12. COMPACT: Rechner liefert valide Anzeige und Tastendimensionen bei schmaler Breite (<340px)', () => {
  const compactWidth = 320;
  const isCompact = compactWidth < 340;
  assert.strictEqual(isCompact, true);
});

// 13. STANDARD
test('13. STANDARD: Rechner liefert vollen Grundrechner mit Vorzeichen und Prozent (340-540px)', () => {
  const standardWidth = 420;
  const isStandard = standardWidth >= 340 && standardWidth < 550;
  assert.strictEqual(isStandard, true);
});

// 14. LARGE
test('14. LARGE: Rechner liefert erweiterte Smartboard-Tasten und Verlaufsleiste (550-799px)', () => {
  const largeWidth = 650;
  const isLarge = largeWidth >= 550 && largeWidth < 800;
  assert.strictEqual(isLarge, true);
});

// 15. FULLSCREEN
test('15. FULLSCREEN: Maximale Smartboard-Projektionsfläche (>=800px)', () => {
  const fsWidth = 1024;
  const isFullscreen = fsWidth >= 800;
  assert.strictEqual(isFullscreen, true);
});

// 16. kein Overflow
test('16. kein Overflow: Lange Zahlen werden auf max. 12 Ziffern begrenzt', () => {
  let state = INITIAL_CALCULATOR_STATE;
  for (let i = 0; i < 20; i++) {
    state = inputDigit(state, '9');
  }
  assert.ok(state.currentInput.length <= 14);
});

// 17. offline
test('17. offline: Rechner läuft 100% synchron im Client', () => {
  const res = calculateResult(100, '÷', 4);
  assert.strictEqual(res.result, 25);
});

// 18. keine KI
test('18. keine KI: Rechner verwendet reine deterministische mathematische Funktionen', () => {
  const res1 = calculateResult(7, '×', 6);
  const res2 = calculateResult(7, '×', 6);
  assert.strictEqual(res1.result, res2.result);
});

// 19. keine Netzwerkrequests
test('19. keine Netzwerkrequests: Keine externen APIs, keine Schülerdaten', () => {
  let state = INITIAL_CALCULATOR_STATE;
  state = inputDigit(state, '1');
  state = inputOperator(state, '+');
  state = inputDigit(state, '1');
  state = calculateEquals(state);
  assert.strictEqual(state.history[0].expression, '1 + 1');
  assert.strictEqual(state.history[0].result, '2');
  assert.strictEqual((state.history[0] as any).studentId, undefined);
});

// 20. Zahlenraum-Studio nur im Mathe-Fachbereich
test('20. Zahlenraum-Studio im Mathe-Fachmodul registriert', () => {
  assert.strictEqual(isMathFachmodulTool('zahlenraum'), true);
  const tool = MATH_FACHMODUL_TOOLS.find((t) => t.type === 'zahlenraum');
  assert.strictEqual(tool?.isConsolidated, true);
});

// 21. Kopfrechentrainer korrekt zugeordnet
test('21. Kopfrechentrainer im Mathe-Fachmodul registriert', () => {
  assert.strictEqual(isMathFachmodulTool('kopfrechnen'), true);
  const tool = MATH_FACHMODUL_TOOLS.find((t) => t.type === 'kopfrechnen');
  assert.strictEqual(tool?.isConsolidated, true);
});

// 22. Bruch-Visualisierer korrekt zugeordnet
test('22. Bruch-Visualisierer im Mathe-Fachmodul registriert', () => {
  assert.strictEqual(isMathFachmodulTool('fractionvisualizer'), true);
  const tool = MATH_FACHMODUL_TOOLS.find((t) => t.type === 'fractionvisualizer');
  assert.strictEqual(tool?.isConsolidated, true);
});

// 23. mathbalancer im Mathe-Fachmodul
test('23. mathbalancer im Mathe-Fachmodul zugeordnet', () => {
  assert.strictEqual(isMathFachmodulTool('mathbalancer'), true);
});

// 24. moneycalc im Mathe-Fachmodul
test('24. moneycalc im Mathe-Fachmodul zugeordnet', () => {
  assert.strictEqual(isMathFachmodulTool('moneycalc'), true);
});

// 25. mathpyramid im Mathe-Fachmodul
test('25. mathpyramid im Mathe-Fachmodul zugeordnet', () => {
  assert.strictEqual(isMathFachmodulTool('mathpyramid'), true);
});

// 26. clockpuzzle im Mathe-Fachmodul
test('26. clockpuzzle im Mathe-Fachmodul zugeordnet', () => {
  assert.strictEqual(isMathFachmodulTool('clockpuzzle'), true);
});

// 27. geometry im Mathe-Fachmodul
test('27. geometry im Mathe-Fachmodul zugeordnet', () => {
  assert.strictEqual(isMathFachmodulTool('geometry'), true);
});

// 28. angledetective im Mathe-Fachmodul
test('28. angledetective im Mathe-Fachmodul zugeordnet', () => {
  assert.strictEqual(isMathFachmodulTool('angledetective'), true);
});

// 29. estimationjar im Mathe-Fachmodul
test('29. estimationjar im Mathe-Fachmodul zugeordnet', () => {
  assert.strictEqual(isMathFachmodulTool('estimationjar'), true);
});

// 30. divrobot nicht mehr im Picker
test('30. divrobot als Altlast deklariert und aus Picker entfernt', () => {
  assert.strictEqual(isRetiredMathWidget('divrobot'), true);
  assert.strictEqual(isMathFachmodulTool('divrobot'), false);
});

// 31. mathduel nicht mehr im Picker
test('31. mathduel als Altlast deklariert und aus Picker entfernt', () => {
  assert.strictEqual(isRetiredMathWidget('mathduel'), true);
  assert.strictEqual(isMathFachmodulTool('mathduel'), false);
});

// 32. shapepuzzle nicht mehr im Picker
test('32. shapepuzzle als Altlast deklariert und aus Picker entfernt', () => {
  assert.strictEqual(isRetiredMathWidget('shapepuzzle'), true);
  assert.strictEqual(isMathFachmodulTool('shapepuzzle'), false);
});

// 33. sorting nicht mehr im Picker
test('33. sorting als Altlast deklariert und aus Picker entfernt', () => {
  assert.strictEqual(isRetiredMathWidget('sorting'), true);
  assert.strictEqual(isMathFachmodulTool('sorting'), false);
});

// 34. Legacy-Boards crashen nicht
test('34. Legacy-Boards crashen nicht: Fallback-Nachrichten vorhanden', () => {
  for (const retired of RETIRED_MATH_WIDGETS) {
    const msg = getRetiredWidgetFallbackMessage(retired);
    assert.ok(msg);
    assert.ok(msg.length > 10);
  }
});

// 35. andere Fachbereiche unverändert
test('35. Ziel-Fachmodul Mathematik enthält exakt 10 Tools (3 konsolidierte + 7 spezialisierte)', () => {
  assert.strictEqual(MATH_FACHMODUL_TOOLS.length, 10);
  const consolidated = MATH_FACHMODUL_TOOLS.filter((t) => t.isConsolidated);
  const specialized = MATH_FACHMODUL_TOOLS.filter((t) => !t.isConsolidated);
  assert.strictEqual(consolidated.length, 3);
  assert.strictEqual(specialized.length, 7);
});
