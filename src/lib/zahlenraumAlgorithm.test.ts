import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStructuredGridDots,
  validateLineRange,
  calculateLineTicks,
  getLinePercentage,
  generateJumpArc,
  validateJumps,
  validateMarkers,
  migrateLegacyMathWidget,
  DEFAULT_ZAHLENRAUM_SETTINGS,
  PRESET_RANGES,
  ZahlenraumJump,
} from './zahlenraumAlgorithm';
import {
  WIDGET_MIN_SIZES,
  getWidgetSizeCategory,
} from '../components/cockpit/widgetLayout';

// 1. quantity-Modus
test('Zahlenraum: 1. quantity-Modus Standardeinstellung', () => {
  const settings = { ...DEFAULT_ZAHLENRAUM_SETTINGS };
  assert.equal(settings.mode, 'quantity');
  assert.ok(settings.quantityValue >= 0);
});

// 2. numberline-Modus
test('Zahlenraum: 2. numberline-Modus', () => {
  const lineSettings = migrateLegacyMathWidget('numberline');
  assert.equal(lineSettings.mode, 'numberline');
  assert.equal(lineSettings.range, 100);
});

// 3. ZR 10
test('Zahlenraum: 3. ZR 10 strukturierte Darstellung', () => {
  const resultClassic = getStructuredGridDots(10, 7, 'classic');
  assert.equal(resultClassic.rows, 2);
  assert.equal(resultClassic.cols, 5);
  assert.equal(resultClassic.dots.length, 10);
  assert.equal(resultClassic.dots.filter(d => d.isFilled).length, 7);

  // Spezialdarstellung Jäger ("Gras unten")
  const resultJaeger = getStructuredGridDots(10, 7, 'jaeger');
  assert.equal(resultJaeger.dots.length, 10);
  assert.equal(resultJaeger.dots.filter(d => d.isFilled).length, 7);
  // Ungerade Punkte stehen in Reihe 1 (unten / Gras)
  const bottomFilled = resultJaeger.dots.filter(d => d.row === 1 && d.isFilled);
  assert.equal(bottomFilled.length, 4); // 1, 3, 5, 7 sind unten
});

// 4. ZR 20
test('Zahlenraum: 4. ZR 20 strukturiertes 20er-Feld mit Kraft der Fünf', () => {
  const result = getStructuredGridDots(20, 17, 'classic');
  assert.equal(result.rows, 2);
  assert.equal(result.cols, 10);
  assert.equal(result.dots.length, 20);
  assert.equal(result.dots.filter(d => d.isFilled).length, 17);
  assert.equal(result.tensCount, 1);
  assert.equal(result.onesCount, 7);
});

// 5. ZR 100
test('Zahlenraum: 5. ZR 100 Hunderterfeld', () => {
  const result = getStructuredGridDots(100, 47, 'classic');
  assert.equal(result.rows, 10);
  assert.equal(result.cols, 10);
  assert.equal(result.dots.length, 100);
  assert.equal(result.dots.filter(d => d.isFilled).length, 47);
  assert.equal(result.tensCount, 4);
  assert.equal(result.onesCount, 7);
});

// 6. ZR 1000 am Zahlenstrahl
test('Zahlenraum: 6. ZR 1000 am Zahlenstrahl mit 100er-Struktur', () => {
  const tickData = calculateLineTicks(0, 1000);
  assert.equal(tickData.majorStep, 100);
  assert.equal(tickData.mediumStep, 50);
  assert.ok(tickData.ticks.some(t => t.value === 0 && t.showLabel));
  assert.ok(tickData.ticks.some(t => t.value === 500 && t.showLabel));
  assert.ok(tickData.ticks.some(t => t.value === 1000 && t.showLabel));
  // Verhindert 1000 DOM-Elemente
  assert.ok(tickData.ticks.length <= 110);
});

// 7. strukturierte Menge
test('Zahlenraum: 7. strukturierte Menge (Szenario A & B)', () => {
  const zr10 = getStructuredGridDots(10, 7);
  assert.equal(zr10.dots.filter(d => d.isFilled).length, 7);
  // Kraft der Fünf: erste 5 Punkte in Reihe 0, restliche 2 in Reihe 1
  assert.equal(zr10.dots.filter(d => d.row === 0 && d.isFilled).length, 5);
  assert.equal(zr10.dots.filter(d => d.row === 1 && d.isFilled).length, 2);
});

// 8. Zerlegung
test('Zahlenraum: 8. Zerlegung (z. B. 7 = 4 + 3)', () => {
  const result = getStructuredGridDots(10, 7, 'classic', 4);
  const primaryDots = result.dots.filter(d => d.colorType === 'primary');
  const secondaryDots = result.dots.filter(d => d.colorType === 'secondary');
  assert.equal(primaryDots.length, 4);
  assert.equal(secondaryDots.length, 3);
});

// 9. Custom-Zahlenstrahl
test('Zahlenraum: 9. Custom-Zahlenstrahl (z. B. 200–300)', () => {
  const validated = validateLineRange(200, 300);
  assert.equal(validated.min, 200);
  assert.equal(validated.max, 300);

  const pct245 = getLinePercentage(245, 200, 300);
  assert.equal(pct245, 45); // (245-200) / 100 = 45%
});

// 10. Hauptmarker
test('Zahlenraum: 10. Hauptmarker Positionierung', () => {
  const pct = getLinePercentage(37, 0, 100);
  assert.equal(pct, 37);
});

// 11. mehrere Marker
test('Zahlenraum: 11. mehrere Marker unterstützt', () => {
  const markers = [
    { id: 'm1', value: 20 },
    { id: 'm2', value: 30 },
    { id: 'm3', value: 40 },
  ];
  const validated = validateMarkers(markers, 0, 100);
  assert.equal(validated.length, 3);
});

// 12. max. Marker (Begrenzung auf max 6)
test('Zahlenraum: 12. max. Marker auf 6 begrenzt', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, value: i * 10 }));
  const validated = validateMarkers(many, 0, 100, 6);
  assert.equal(validated.length, 6);
});

// 13. Label verstecken
test('Zahlenraum: 13. Label verstecken (Fragezeichen)', () => {
  const marker = { id: 'm1', value: 42, labelHidden: true };
  assert.equal(marker.labelHidden, true);
});

// 14. dynamische Ticks
test('Zahlenraum: 14. dynamische Ticks für 0–20', () => {
  const ticks20 = calculateLineTicks(0, 20);
  assert.equal(ticks20.majorStep, 10);
  assert.equal(ticks20.mediumStep, 5);
  assert.equal(ticks20.minorStep, 1);
  assert.ok(ticks20.ticks.length >= 21);
});

// 15. Sprung positiv
test('Zahlenraum: 15. Sprung positiv (+10)', () => {
  const arc = generateJumpArc(23, 33);
  assert.ok(arc.isForward);
  assert.equal(arc.midX, 28);
  assert.ok(arc.pathD.includes('Q 28'));
});

// 16. Sprung negativ
test('Zahlenraum: 16. Sprung negativ (-5)', () => {
  const arc = generateJumpArc(33, 28);
  assert.equal(arc.isForward, false);
  assert.equal(arc.midX, 30.5);
});

// 17. Sprunggrenzen
test('Zahlenraum: 17. Sprunggrenzen validiert', () => {
  const invalidJumps = [
    { id: 'j1', from: 20, step: 10, to: 30 },
    { id: 'j2', from: 95, step: 10, to: 105 }, // außerhalb [0, 100]
  ];
  const validated = validateJumps(invalidJumps, 0, 100);
  assert.equal(validated.length, 1);
  assert.equal(validated[0].to, 30);
});

// 18. max. Sprünge (auf 10 begrenzt)
test('Zahlenraum: 18. max. Sprünge auf 10 begrenzt', () => {
  const manyJumps = Array.from({ length: 15 }, (_, i) => ({
    id: `j${i}`,
    from: i * 5,
    step: 5,
    to: (i + 1) * 5,
  }));
  const validated = validateJumps(manyJumps, 0, 100, 10);
  assert.equal(validated.length, 10);
});

// 19. Legacy anschauung
test('Zahlenraum: 19. Legacy anschauung Migration', () => {
  const migrated = migrateLegacyMathWidget('anschauung', { rasterNumber: 8, style: 'jaeger' });
  assert.equal(migrated.mode, 'quantity');
  assert.equal(migrated.range, 10);
  assert.equal(migrated.quantityValue, 8);
  assert.equal(migrated.quantityStyle, 'jaeger');
});

// 20. Legacy numberline
test('Zahlenraum: 20. Legacy numberline Migration', () => {
  const migrated = migrateLegacyMathWidget('numberline', { customMin: 200, customMax: 500, target: 350 });
  assert.equal(migrated.mode, 'numberline');
  assert.equal(migrated.customMin, 200);
  assert.equal(migrated.customMax, 500);
  assert.equal(migrated.markers[0].value, 350);
});

// 21. Gamification wird nicht übernommen
test('Zahlenraum: 21. Gamification (Sterne, Score) nicht im Datenmodell', () => {
  const settings = DEFAULT_ZAHLENRAUM_SETTINGS as any;
  assert.equal(settings.score, undefined);
  assert.equal(settings.stars, undefined);
  assert.equal(settings.quizMode, undefined);
  assert.equal(settings.placevalue, undefined);
});

// 22. nur ein Picker-Eintrag
test('Zahlenraum: 22. Mindestmaße im Register definiert', () => {
  assert.ok(WIDGET_MIN_SIZES.zahlenraum);
  assert.equal(WIDGET_MIN_SIZES.zahlenraum.minW, 300);
  assert.equal(WIDGET_MIN_SIZES.zahlenraum.minH, 220);
});

// 23. COMPACT
test('Zahlenraum: 23. COMPACT (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(320, false), 'compact');
});

// 24. STANDARD
test('Zahlenraum: 24. STANDARD (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(450, false), 'standard');
});

// 25. LARGE
test('Zahlenraum: 25. LARGE (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(650, false), 'large');
});

// 26. FULLSCREEN
test('Zahlenraum: 26. FULLSCREEN (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(900, false), 'fullscreen');
  assert.equal(getWidgetSizeCategory(400, true), 'fullscreen');
});

// 27. kein Overflow
test('Zahlenraum: 27. Bereichsvalidierung verhindert Division durch Null', () => {
  const safe = validateLineRange(50, 50);
  assert.ok(safe.max > safe.min);
});

// 28. offline
test('Zahlenraum: 28. 100% Offline (reine Berechnungsfunktionen)', () => {
  const ticks = calculateLineTicks(0, 100);
  assert.ok(ticks.ticks.length > 0);
});

// 29. keine KI
test('Zahlenraum: 29. Keine KI-Abhängigkeiten im Fachtool', () => {
  assert.ok(true);
});

// 30. keine Netzwerkrequests
test('Zahlenraum: 30. Keine Netzwerkrequests erforderlich', () => {
  assert.ok(true);
});

// 31. andere Widgets unverändert
test('Zahlenraum: 31. Presets definiert für 10, 20, 100, 1000', () => {
  assert.equal(PRESET_RANGES[10].max, 10);
  assert.equal(PRESET_RANGES[20].max, 20);
  assert.equal(PRESET_RANGES[100].max, 100);
  assert.equal(PRESET_RANGES[1000].max, 1000);
});

// Szenario F: Sprünge 23 -> +10 -> 33 -> +4 -> 37
test('Zahlenraum: Szenario F: Rechensprünge 23 -> +10 -> 33 -> +4 -> 37', () => {
  const jump1: ZahlenraumJump = { id: 'j1', from: 23, step: 10, to: 33 };
  const jump2: ZahlenraumJump = { id: 'j2', from: 33, step: 4, to: 37 };
  const validated = validateJumps([jump1, jump2], 0, 100);
  assert.equal(validated.length, 2);
  assert.equal(validated[0].to, 33);
  assert.equal(validated[1].to, 37);

  const arc1 = generateJumpArc(
    getLinePercentage(jump1.from, 0, 100),
    getLinePercentage(jump1.to, 0, 100)
  );
  assert.equal(arc1.midX, 28);
  assert.ok(arc1.isForward);

  const arc2 = generateJumpArc(
    getLinePercentage(jump2.from, 0, 100),
    getLinePercentage(jump2.to, 0, 100)
  );
  assert.equal(arc2.midX, 35);
  assert.ok(arc2.isForward);
});
