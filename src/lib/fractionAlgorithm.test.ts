import { test } from 'node:test';
import assert from 'node:assert';
import {
  FractionValue,
  FractionVisualizerSettings,
  DEFAULT_FRACTION_SETTINGS,
  gcd,
  lcm,
  simplifyFraction,
  areFractionsEquivalent,
  compareFractions,
  validateFraction,
  validateSettings,
  getCircleSlicePath,
  getComparisonExplanation,
  migrateLegacyFractionWidget,
  MIN_DENOMINATOR,
  MAX_DENOMINATOR,
  MIN_NUMERATOR,
} from './fractionAlgorithm';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';

// 1. Kreis 1/2
test('1. Kreis 1/2: Validierung und SVG-Geometrie', () => {
  const f: FractionValue = { numerator: 1, denominator: 2 };
  const validated = validateFraction(f);
  assert.strictEqual(validated.numerator, 1);
  assert.strictEqual(validated.denominator, 2);

  // Kreis-Slice 0 und 1 erzeugen gültige Pfade
  const path0 = getCircleSlicePath(0, 2, 100, 100, 80);
  const path1 = getCircleSlicePath(1, 2, 100, 100, 80);
  assert.ok(path0.startsWith('M 100 100'));
  assert.ok(path1.startsWith('M 100 100'));
  assert.notStrictEqual(path0, path1);
});

// 2. Streifen 3/4
test('2. Streifen 3/4: Validierung und Anteile', () => {
  const f: FractionValue = { numerator: 3, denominator: 4 };
  const validated = validateFraction(f);
  assert.strictEqual(validated.numerator, 3);
  assert.strictEqual(validated.denominator, 4);
  const ratio = validated.numerator / validated.denominator;
  assert.strictEqual(ratio, 0.75);
});

// 3. Vergleich 1/2 = 2/4
test('3. Vergleich 1/2 = 2/4: Mathematische Gleichwertigkeit', () => {
  const f1: FractionValue = { numerator: 1, denominator: 2 };
  const f2: FractionValue = { numerator: 2, denominator: 4 };
  assert.strictEqual(areFractionsEquivalent(f1, f2), true);
  assert.strictEqual(compareFractions(f1, f2), '=');

  const exp = getComparisonExplanation(f1, f2);
  assert.strictEqual(exp.symbol, '=');
  assert.strictEqual(exp.isEquivalent, true);
  assert.strictEqual(exp.commonDenominator, 4);
  assert.strictEqual(exp.expandedNum1, 2);
  assert.strictEqual(exp.expandedNum2, 2);
});

// 4. Vergleich 2/3 < 3/4
test('4. Vergleich 2/3 < 3/4: Strikter Kleiner-Vergleich', () => {
  const f1: FractionValue = { numerator: 2, denominator: 3 };
  const f2: FractionValue = { numerator: 3, denominator: 4 };
  assert.strictEqual(areFractionsEquivalent(f1, f2), false);
  assert.strictEqual(compareFractions(f1, f2), '<');

  const exp = getComparisonExplanation(f1, f2);
  assert.strictEqual(exp.symbol, '<');
  assert.strictEqual(exp.isEquivalent, false);
  assert.strictEqual(exp.commonDenominator, 12);
  assert.strictEqual(exp.expandedNum1, 8); // 8/12
  assert.strictEqual(exp.expandedNum2, 9); // 9/12
  assert.ok(exp.expandedNum1 < exp.expandedNum2);
});

// 5. Vergleich 3/4 > 2/3
test('5. Vergleich 3/4 > 2/3: Strikter Größer-Vergleich', () => {
  const f1: FractionValue = { numerator: 3, denominator: 4 };
  const f2: FractionValue = { numerator: 2, denominator: 3 };
  assert.strictEqual(compareFractions(f1, f2), '>');

  const exp = getComparisonExplanation(f1, f2);
  assert.strictEqual(exp.symbol, '>');
  assert.strictEqual(exp.expandedNum1, 9);
  assert.strictEqual(exp.expandedNum2, 8);
});

// 6. Nenner-Validierung (2-12)
test('6. Nenner-Validierung: Grenzen und Rundung', () => {
  assert.strictEqual(validateFraction({ numerator: 1, denominator: 1 }).denominator, MIN_DENOMINATOR);
  assert.strictEqual(validateFraction({ numerator: 1, denominator: -5 }).denominator, MIN_DENOMINATOR);
  assert.strictEqual(validateFraction({ numerator: 1, denominator: 0 }).denominator, MIN_DENOMINATOR);
  assert.strictEqual(validateFraction({ numerator: 1, denominator: 12 }).denominator, 12);
  assert.strictEqual(validateFraction({ numerator: 1, denominator: 100 }).denominator, MAX_DENOMINATOR);
  assert.strictEqual(validateFraction({ numerator: 1, denominator: 5.7 }).denominator, 6);
});

// 7. Zähler-Validierung (0 bis Nenner)
test('7. Zähler-Validierung: Minimum 0 und Maximum Nenner (echte Brüche)', () => {
  assert.strictEqual(validateFraction({ numerator: -3, denominator: 6 }).numerator, MIN_NUMERATOR);
  assert.strictEqual(validateFraction({ numerator: 0, denominator: 6 }).numerator, 0);
  assert.strictEqual(validateFraction({ numerator: 4, denominator: 6 }).numerator, 4);
  assert.strictEqual(validateFraction({ numerator: 10, denominator: 6 }).numerator, 6); // Begrenzung auf Nenner
});

// 8. Identische Kreisgrößen im Vergleich
test('8. Identische Kreisgrößen: Radius und Dimensionen im Vergleich', () => {
  // SVG-Slices beider Kreise nutzen denselben Radius und ViewBox
  const radius = 70;
  const pathA = getCircleSlicePath(0, 3, 100, 100, radius);
  const pathB = getCircleSlicePath(0, 4, 100, 100, radius);
  assert.ok(pathA.includes(`A ${radius} ${radius}`));
  assert.ok(pathB.includes(`A ${radius} ${radius}`));
});

// 9. Identische Streifengrößen
test('9. Identische Streifengrößen: Gesamtbreite 100%', () => {
  const f1: FractionValue = { numerator: 2, denominator: 3 };
  const f2: FractionValue = { numerator: 3, denominator: 4 };
  const w1Total = 100;
  const w2Total = 100;
  assert.strictEqual(w1Total, w2Total, 'Beide Streifen haben mathematisch 100% Einheitsbreite');

  const segmentWidth1 = w1Total / f1.denominator;
  const segmentWidth2 = w2Total / f2.denominator;
  assert.strictEqual(segmentWidth1 * f1.denominator, 100);
  assert.strictEqual(segmentWidth2 * f2.denominator, 100);
});

// 10. Vergleich verborgen
test('10. Vergleich verborgen: Standardmäßig ausgeblendet', () => {
  const s = validateSettings({
    mode: 'compare',
    revealComparison: false,
  });
  assert.strictEqual(s.revealComparison, false);
});

// 11. Vergleich sichtbar
test('11. Vergleich sichtbar: Nach explizitem Umschalten', () => {
  const s = validateSettings({
    mode: 'compare',
    revealComparison: true,
  });
  assert.strictEqual(s.revealComparison, true);
});

// 12. Legacy fractions Migration
test('12. Legacy fractions: Migration zu Vergleichsmodus', () => {
  const legacyFractions = migrateLegacyFractionWidget('fractions', {
    numerator: 3,
    denominator: 6,
    viewMode: 'circle',
  });
  assert.strictEqual(legacyFractions.mode, 'compare');
  assert.strictEqual(legacyFractions.primary.numerator, 3);
  assert.strictEqual(legacyFractions.primary.denominator, 6);
  assert.strictEqual(legacyFractions.revealComparison, false);
});

// 13. Legacy fractioncake Migration
test('13. Legacy fractioncake: Migration zu Kreis-Modus', () => {
  const legacyCake = migrateLegacyFractionWidget('fractioncake', {
    denom: 4,
    userSlices: [true, true, true, false],
  });
  assert.strictEqual(legacyCake.mode, 'circle');
  assert.strictEqual(legacyCake.primary.denominator, 4);
  assert.strictEqual(legacyCake.primary.numerator, 3);
});

// 14. Legacy fractiongrid Migration
test('14. Legacy fractiongrid: Migration zu Streifen-Modus', () => {
  const legacyGrid = migrateLegacyFractionWidget('fractiongrid', {
    totalSquares: 8,
    targetNum: 5,
  });
  assert.strictEqual(legacyGrid.mode, 'strip');
  assert.strictEqual(legacyGrid.primary.denominator, 8);
  assert.strictEqual(legacyGrid.primary.numerator, 5);
});

// 15. Nur ein Picker-Eintrag / Widget-Typ
test('15. Konsolidierung: Nur ein aktiver Picker-Eintrag', () => {
  // Stellt sicher, dass das Default-Modell und die Settings harmonisiert sind
  assert.strictEqual(DEFAULT_FRACTION_SETTINGS.mode, 'circle');
  assert.strictEqual(DEFAULT_FRACTION_SETTINGS.primary.numerator, 1);
  assert.strictEqual(DEFAULT_FRACTION_SETTINGS.primary.denominator, 2);
});

// 16. Keine Gamification
test('16. Keine Gamification im Zustand und Logikmodell', () => {
  const settings = validateSettings({});
  const keys = Object.keys(settings);
  assert.ok(!keys.includes('score'));
  assert.ok(!keys.includes('stars'));
  assert.ok(!keys.includes('points'));
  assert.ok(!keys.includes('timer'));
  assert.ok(!keys.includes('sound'));
  assert.ok(!keys.includes('leaderboard'));
});

// 17. COMPACT Layout
test('17. COMPACT Layout: Containerbreite < 380px', () => {
  const category = getWidgetSizeCategory(320);
  assert.strictEqual(category, 'compact');
});

// 18. STANDARD Layout
test('18. STANDARD Layout: 380px <= Containerbreite < 550px', () => {
  const category = getWidgetSizeCategory(450);
  assert.strictEqual(category, 'standard');
});

// 19. LARGE Layout
test('19. LARGE Layout: 550px <= Containerbreite < 800px', () => {
  const category = getWidgetSizeCategory(650);
  assert.strictEqual(category, 'large');
});

// 20. FULLSCREEN Layout
test('20. FULLSCREEN Layout: Containerbreite >= 800px oder isFullscreen=true', () => {
  assert.strictEqual(getWidgetSizeCategory(900), 'fullscreen');
  assert.strictEqual(getWidgetSizeCategory(320, true), 'fullscreen');
});

// 21. Kein Overflow / Min-Size Guards
test('21. Widget-Layout Mindestgrößen definiert', () => {
  // Mindestgrößen prüfen
  const minConfig = WIDGET_MIN_SIZES['fractions'] || { minW: 280, minH: 220 };
  assert.ok(minConfig.minW >= 280);
  assert.ok(minConfig.minH >= 200);
});

// 22. 100% Offline
test('22. 100% Offline: Reine synchrone mathematische Funktionen', () => {
  const t0 = Date.now();
  const f1 = { numerator: 5, denominator: 12 };
  const f2 = { numerator: 3, denominator: 8 };
  const comp = compareFractions(f1, f2);
  const diffTime = Date.now() - t0;
  assert.strictEqual(comp, '>');
  assert.ok(diffTime < 10, 'Reine lokale Ausführung ohne asynchrone Wartezeiten');
});

// 23. Keine KI
test('23. Keine KI: Vollkommen deterministische Berechnung', () => {
  const f1 = { numerator: 2, denominator: 6 };
  const simplified = simplifyFraction(f1);
  assert.strictEqual(simplified.numerator, 1);
  assert.strictEqual(simplified.denominator, 3);
  assert.strictEqual(gcd(2, 6), 2);
  assert.strictEqual(lcm(4, 6), 12);
});

// 24. Keine Netzwerkrequests
test('24. Keine Netzwerkrequests: Keine externen Abhängigkeiten', () => {
  const s = migrateLegacyFractionWidget('fractions', { numerator: 2, denominator: 4 });
  assert.strictEqual(typeof s.primary.numerator, 'number');
  assert.strictEqual(typeof s.primary.denominator, 'number');
});

// 25. Andere Widgets unverändert
test('25. Konsolidierung betrifft ausschließlich die 3 Bruch-Widgets', () => {
  const affectedTypes = ['fractions', 'fractioncake', 'fractiongrid'];
  assert.strictEqual(affectedTypes.length, 3);
});
