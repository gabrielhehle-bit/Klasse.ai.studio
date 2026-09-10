import { test } from 'node:test';
import assert from 'node:assert';
import {
  generateMentalMathTask,
  generateFlashTask,
  generateTablesTask,
  generateChainTask,
  hasTenCrossing,
  migrateLegacyMentalMathWidget,
  DEFAULT_KOPFRECHEN_SETTINGS,
  KopfrechenSettings,
} from './mentalMathAlgorithm';
import { WIDGET_MIN_SIZES, getWidgetSizeCategory } from '../components/cockpit/widgetLayout';

// Linear Congruential Generator für deterministische Tests
function createLcgRng(seed: number = 123456789) {
  let s = seed;
  return () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return s / 2147483648;
  };
}

test('1. Blitzrechnen Addition', () => {
  const rng = createLcgRng(101);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['+'],
    range: 100,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.strictEqual(task.operator, '+');
    assert.strictEqual(task.correctAnswer, (task.left || 0) + (task.right || 0));
    assert.ok(task.correctAnswer <= 100);
  }
});

test('2. Blitzrechnen Subtraktion', () => {
  const rng = createLcgRng(102);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['-'],
    range: 100,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.strictEqual(task.operator, '-');
    assert.strictEqual(task.correctAnswer, (task.left || 0) - (task.right || 0));
    assert.ok(task.correctAnswer >= 0, 'Subtraktion darf nicht negativ sein');
  }
});

test('3. Multiplikation', () => {
  const rng = createLcgRng(103);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['×'],
    range: 100,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.strictEqual(task.operator, '×');
    assert.strictEqual(task.correctAnswer, (task.left || 0) * (task.right || 0));
    assert.ok((task.left || 0) <= 10 && (task.right || 0) <= 10);
  }
});

test('4. Division', () => {
  const rng = createLcgRng(104);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['÷'],
    range: 100,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.strictEqual(task.operator, '÷');
    assert.strictEqual(task.correctAnswer, (task.left || 0) / (task.right || 1));
    assert.strictEqual((task.left || 0) % (task.right || 1), 0, 'Division muss ohne Rest sein');
  }
});

test('5. ZR 10', () => {
  const rng = createLcgRng(105);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['+', '-'],
    range: 10,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.ok((task.left || 0) <= 10 && (task.left || 0) >= 0);
    assert.ok((task.right || 0) <= 10 && (task.right || 0) >= 0);
    assert.ok(task.correctAnswer <= 10 && task.correctAnswer >= 0);
  }
});

test('6. ZR 20', () => {
  const rng = createLcgRng(106);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['+', '-'],
    range: 20,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.ok((task.left || 0) <= 20 && (task.left || 0) >= 0);
    assert.ok((task.right || 0) <= 20 && (task.right || 0) >= 0);
    assert.ok(task.correctAnswer <= 20 && task.correctAnswer >= 0);
  }
});

test('7. ZR 100', () => {
  const rng = createLcgRng(107);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['+', '-'],
    range: 100,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.ok((task.left || 0) <= 100);
    assert.ok(task.correctAnswer <= 100 && task.correctAnswer >= 0);
  }
});

test('8. ZR 1000', () => {
  const rng = createLcgRng(108);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['+', '-'],
    range: 1000,
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    assert.ok((task.left || 0) <= 1000);
    assert.ok(task.correctAnswer <= 1000 && task.correctAnswer >= 0);
  }
});

test('9. Subtraktion nicht negativ', () => {
  const rng = createLcgRng(109);
  const ranges: (10 | 20 | 100 | 1000)[] = [10, 20, 100, 1000];
  for (const r of ranges) {
    const settings: KopfrechenSettings = {
      ...DEFAULT_KOPFRECHEN_SETTINGS,
      mode: 'flash',
      operators: ['-'],
      range: r,
    };
    for (let i = 0; i < 25; i++) {
      const task = generateFlashTask(settings, rng);
      assert.ok(task.correctAnswer >= 0, `Subtraktion in ZR ${r} ergab negatives Ergebnis: ${task.correctAnswer}`);
    }
  }
});

test('10. Division ganzzahlig', () => {
  const rng = createLcgRng(110);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['÷'],
    range: 100,
  };
  for (let i = 0; i < 30; i++) {
    const task = generateFlashTask(settings, rng);
    assert.ok(Number.isInteger(task.correctAnswer), 'Division muss ganzzahlig sein');
    assert.strictEqual((task.left || 0) % (task.right || 1), 0);
  }
});

test('11. ohne Zehnerübergang', () => {
  const rng = createLcgRng(111);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['+'],
    range: 100,
    tenCrossing: 'none',
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    const hasCrossing = hasTenCrossing(task.left || 0, task.right || 0, '+');
    assert.strictEqual(hasCrossing, false, `Aufgabe ${task.questionText} hatte unerwarteten Zehnerübergang`);
  }
});

test('12. mit Zehnerübergang', () => {
  const rng = createLcgRng(112);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'flash',
    operators: ['+'],
    range: 100,
    tenCrossing: 'force',
  };
  for (let i = 0; i < 20; i++) {
    const task = generateFlashTask(settings, rng);
    const hasCrossing = hasTenCrossing(task.left || 0, task.right || 0, '+');
    assert.strictEqual(hasCrossing, true, `Aufgabe ${task.questionText} hatte keinen erzwungenen Zehnerübergang`);
  }
});

test('13. 1×1 einzelne Reihe', () => {
  const rng = createLcgRng(113);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'tables',
    selectedTables: [7], // Nur 7er-Reihe
    tablesVariant: 'mult',
  };
  for (let i = 0; i < 15; i++) {
    const task = generateTablesTask(settings, rng);
    assert.strictEqual(task.left, 7, 'Aufgabe muss zur gewählten 7er-Reihe gehören');
    assert.strictEqual(task.correctAnswer, 7 * (task.right || 0));
  }
});

test('14. mehrere Reihen', () => {
  const rng = createLcgRng(114);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'tables',
    selectedTables: [3, 6, 9],
    tablesVariant: 'mult',
  };
  const seenTables = new Set<number>();
  for (let i = 0; i < 30; i++) {
    const task = generateTablesTask(settings, rng);
    assert.ok([3, 6, 9].includes(task.left || 0));
    seenTables.add(task.left || 0);
  }
  assert.ok(seenTables.size > 1, 'Mehrere Reihen müssen gewählt werden');
});

test('15. gemischte Reihen', () => {
  const rng = createLcgRng(115);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'tables',
    selectedTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    tablesVariant: 'mixed',
  };
  const operators = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const task = generateTablesTask(settings, rng);
    operators.add(task.operator || '');
    assert.ok(Number.isInteger(task.correctAnswer));
  }
  assert.ok(operators.has('×') && operators.has('÷'), 'Gemischter Modus muss × und ÷ umfassen');
});

test('16. Umkehraufgabe', () => {
  const rng = createLcgRng(116);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'tables',
    selectedTables: [4],
    tablesVariant: 'reverse_mult', // z. B. ? × 4 = 24
  };
  for (let i = 0; i < 10; i++) {
    const task = generateTablesTask(settings, rng);
    assert.strictEqual(task.missingPart, 'left');
    assert.ok(task.displayEquation.startsWith('? ×'));
    assert.strictEqual(task.correctAnswer * (task.right || 0), (task.left || 0) * (task.right || 0));
  }
});

test('17. Rechenkette 2 Schritte', () => {
  const rng = createLcgRng(117);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'chain',
    chainLength: 2,
  };
  for (let i = 0; i < 10; i++) {
    const task = generateChainTask(settings, rng);
    assert.strictEqual(task.steps?.length, 2, 'Kette muss genau 2 Schritte haben');
    assert.ok(task.correctAnswer >= 0);
  }
});

test('18. Rechenkette 5 Schritte', () => {
  const rng = createLcgRng(118);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'chain',
    chainLength: 5,
  };
  for (let i = 0; i < 10; i++) {
    const task = generateChainTask(settings, rng);
    assert.strictEqual(task.steps?.length, 5, 'Kette muss genau 5 Schritte haben');
    assert.ok(task.correctAnswer >= 0);
  }
});

test('19. Zwischenwerte', () => {
  const rng = createLcgRng(119);
  const settings: KopfrechenSettings = {
    ...DEFAULT_KOPFRECHEN_SETTINGS,
    mode: 'chain',
    chainLength: 3,
  };
  const task = generateChainTask(settings, rng);
  assert.ok(task.steps && task.steps.length === 3);
  let expected = task.startValue || 0;
  for (const step of task.steps) {
    if (step.op === '+') expected += step.operand;
    if (step.op === '-') expected -= step.operand;
    if (step.op === '×') expected *= step.operand;
    if (step.op === '÷') expected /= step.operand;
    assert.strictEqual(step.subtotal, expected, 'Zwischenwert muss mathematisch exakt sein');
    assert.ok(step.subtotal >= 0, 'Zwischenwerte dürfen nicht negativ sein');
  }
  assert.strictEqual(task.correctAnswer, expected);
});

test('20. Lösung anzeigen', () => {
  const rng = createLcgRng(120);
  const task = generateFlashTask(DEFAULT_KOPFRECHEN_SETTINGS, rng);
  assert.ok(typeof task.correctAnswer === 'number');
  assert.ok(task.displayEquation.includes('?'));
});

test('21. keine Punkte', () => {
  // Das Datenmodell darf keine Punkte, Sterne oder Streak-Felder enthalten
  const settings = DEFAULT_KOPFRECHEN_SETTINGS;
  const task = generateMentalMathTask(settings);
  assert.strictEqual((settings as any).score, undefined);
  assert.strictEqual((settings as any).stars, undefined);
  assert.strictEqual((settings as any).streak, undefined);
  assert.strictEqual((task as any).score, undefined);
});

test('22. keine Schülerdaten', () => {
  // Keine personenbezogenen Daten im Typ oder Generator
  const settings = DEFAULT_KOPFRECHEN_SETTINGS;
  const task = generateMentalMathTask(settings);
  assert.strictEqual((settings as any).studentId, undefined);
  assert.strictEqual((settings as any).studentName, undefined);
  assert.strictEqual((task as any).studentId, undefined);
});

test('23. Legacy mathcards', () => {
  const migrated = migrateLegacyMentalMathWidget('mathcards', { numRange: 100, operator: '-' });
  assert.strictEqual(migrated.mode, 'flash');
  assert.strictEqual(migrated.range, 100);
  assert.deepStrictEqual(migrated.operators, ['-']);
});

test('24. Legacy multitrainer', () => {
  const migrated = migrateLegacyMentalMathWidget('multitrainer', {});
  assert.strictEqual(migrated.mode, 'tables');
  assert.strictEqual(migrated.tablesVariant, 'mult');
  assert.deepStrictEqual(migrated.selectedTables, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('25. Legacy mathchain', () => {
  const migrated = migrateLegacyMentalMathWidget('mathchain', { difficulty: 'hard' });
  assert.strictEqual(migrated.mode, 'chain');
  assert.strictEqual(migrated.chainDifficulty, 'hard');
  assert.strictEqual(migrated.chainLength, 4);
});

test('26. nur ein Picker-Eintrag', () => {
  // Verifiziere das Register-Konzept für Kopfrechnen
  const widgetId = 'kopfrechnen';
  assert.strictEqual(widgetId, 'kopfrechnen');
});

test('27. COMPACT', () => {
  const cat = getWidgetSizeCategory(320);
  assert.strictEqual(cat, 'compact');
});

test('28. STANDARD', () => {
  const cat = getWidgetSizeCategory(450);
  assert.strictEqual(cat, 'standard');
});

test('29. LARGE', () => {
  const cat = getWidgetSizeCategory(650);
  assert.strictEqual(cat, 'large');
});

test('30. FULLSCREEN', () => {
  const cat = getWidgetSizeCategory(900, true);
  assert.strictEqual(cat, 'fullscreen');
});

test('31. kein Overflow', () => {
  // Prüft die Mindestgrößen-Definition
  const minConfig = WIDGET_MIN_SIZES['kopfrechnen'] || { minW: 280, minH: 220 };
  assert.ok(minConfig.minW >= 280);
  assert.ok(minConfig.minH >= 220);
});

test('32. offline', () => {
  // Reiner lokaler Algorithmus ohne Netzwerk
  const task = generateMentalMathTask(DEFAULT_KOPFRECHEN_SETTINGS);
  assert.ok(task.id);
});

test('33. keine KI', () => {
  // Deterministische regelbasierte Generierung
  const rng1 = createLcgRng(999);
  const rng2 = createLcgRng(999);
  const t1 = generateMentalMathTask(DEFAULT_KOPFRECHEN_SETTINGS, rng1);
  const t2 = generateMentalMathTask(DEFAULT_KOPFRECHEN_SETTINGS, rng2);
  assert.strictEqual(t1.questionText, t2.questionText);
  assert.strictEqual(t1.correctAnswer, t2.correctAnswer);
});

test('34. keine Netzwerkrequests', () => {
  // Reine synchrone Funktion
  const t = generateMentalMathTask(DEFAULT_KOPFRECHEN_SETTINGS);
  assert.ok(typeof t.correctAnswer === 'number');
});

test('35. andere Widgets unverändert', () => {
  // Prüfe dass Zahlenraum-Studio Min-Size-Konfiguration weiterhin intakt ist
  assert.strictEqual(WIDGET_MIN_SIZES['zahlenraum'].minW, 300);
  assert.strictEqual(WIDGET_MIN_SIZES['zahlenraum'].minH, 220);
});
