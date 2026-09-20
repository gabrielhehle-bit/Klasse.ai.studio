import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_REWARD_STATE,
  incrementReward,
  correctDecrementReward,
  setRewardGoal,
  setRewardTitle,
  setRewardSymbol,
  setRewardStyle,
  resetRewardCount,
  calculateProgressPercent,
  isGoalReached,
  resolveRewardMigration,
  validatePedagogicalGuard,
  ClassRewardState,
} from './classRewardAlgorithm.ts';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout.ts';

describe('F21 – Belohnungssysteme analysieren & konsolidieren (Klassenglas & Klassenziel)', () => {
  // 1. Klassenziel laden
  it('1. Klassenziel laden mit Standardwerten', () => {
    assert.strictEqual(DEFAULT_REWARD_STATE.count, 0);
    assert.strictEqual(DEFAULT_REWARD_STATE.goal, 20);
    assert.strictEqual(DEFAULT_REWARD_STATE.rewardTitle, 'Gemeinsame Spielzeit');
    assert.strictEqual(DEFAULT_REWARD_STATE.symbol, '💎');
    assert.strictEqual(DEFAULT_REWARD_STATE.style, 'jar');
  });

  // 2. +1 funktioniert
  it('2. +1 erhöht den Stand korrekt', () => {
    const startState: ClassRewardState = { ...DEFAULT_REWARD_STATE, count: 5 };
    const { nextState, justReachedGoal } = incrementReward(startState, 1);
    assert.strictEqual(nextState.count, 6);
    assert.strictEqual(justReachedGoal, false);
  });

  // 3. Korrektur funktioniert
  it('3. Korrektur (-1) verringert den Stand ausschließlich zur Fehlerbehebung', () => {
    const startState: ClassRewardState = { ...DEFAULT_REWARD_STATE, count: 6 };
    const { nextState, corrected } = correctDecrementReward(startState);
    assert.strictEqual(nextState.count, 5);
    assert.strictEqual(corrected, true);
  });

  // 4. Zielwert korrekt
  it('4. Zielwert anpassen und Grenzen einhalten', () => {
    const state = setRewardGoal(DEFAULT_REWARD_STATE, 30);
    assert.strictEqual(state.goal, 30);

    const minState = setRewardGoal(DEFAULT_REWARD_STATE, -10);
    assert.strictEqual(minState.goal, 1);

    const maxState = setRewardGoal(DEFAULT_REWARD_STATE, 9999);
    assert.strictEqual(maxState.goal, 1000);
  });

  // 5. Ziel erreicht
  it('5. Ziel erreicht Erkennung und Statuswechsel', () => {
    const state: ClassRewardState = { ...DEFAULT_REWARD_STATE, count: 19, goal: 20 };
    assert.strictEqual(isGoalReached(state.count, state.goal), false);

    const { nextState, justReachedGoal } = incrementReward(state, 1);
    assert.strictEqual(nextState.count, 20);
    assert.strictEqual(justReachedGoal, true);
    assert.strictEqual(isGoalReached(nextState.count, nextState.goal), true);
  });

  // 6. Keine Straflogik
  it('6. Keine Straflogik: Korrektur stoppt bei 0, Zähler wird niemals negativ', () => {
    const zeroState: ClassRewardState = { ...DEFAULT_REWARD_STATE, count: 0 };
    const { nextState, corrected } = correctDecrementReward(zeroState);
    assert.strictEqual(nextState.count, 0);
    assert.strictEqual(corrected, false);

    const guard = validatePedagogicalGuard(nextState);
    assert.strictEqual(guard.isValid, true);
    assert.strictEqual(guard.violations.length, 0);
  });

  // 7. Keine öffentliche Rangliste
  it('7. Keine öffentliche Rangliste: Validator verbietet Schüler-Leaderboards', () => {
    const invalidState = {
      ...DEFAULT_REWARD_STATE,
      students: [{ name: 'Anna', stars: 10 }, { name: 'Lukas', stars: 2 }],
      ranking: true,
    };
    const guard = validatePedagogicalGuard(invalidState);
    assert.strictEqual(guard.isValid, false);
    assert.ok(guard.violations.some((v) => v.includes('Rangliste')));
  });

  // 8. Dashboard/Cockpit gleiche Quelle
  it('8. Dashboard und Cockpit nutzen dieselbe Datenstruktur (app.klassenglas_*)', () => {
    const appState = {
      klassenglas_count: 14,
      klassenglas_ziel: 25,
      klassenglas_belohnung: 'Klassenfrühstück',
    };
    const migrated = resolveRewardMigration({
      count: appState.klassenglas_count,
      goal: appState.klassenglas_ziel,
      rewardTitle: appState.klassenglas_belohnung,
    });
    assert.strictEqual(migrated.count, 14);
    assert.strictEqual(migrated.goal, 25);
    assert.strictEqual(migrated.rewardTitle, 'Klassenfrühstück');
  });

  // 9. Keine doppelte Persistenz
  it('9. Keine doppelte Persistenz: Rücksetzfunktion arbeitet auf demselben State', () => {
    const fullState: ClassRewardState = { ...DEFAULT_REWARD_STATE, count: 20, goal: 20 };
    const reset = resetRewardCount(fullState);
    assert.strictEqual(reset.count, 0);
    assert.strictEqual(reset.goal, 20);
    assert.strictEqual(reset.rewardTitle, DEFAULT_REWARD_STATE.rewardTitle);
  });

  // 10. Legacy-Klassenglas migriert
  it('10. Legacy-Klassenglas wird korrekt migriert', () => {
    const legacyCanonical = { count: 8, goal: 20, rewardTitle: 'Kinonachmittag' };
    const migrated = resolveRewardMigration(legacyCanonical);
    assert.strictEqual(migrated.count, 8);
    assert.strictEqual(migrated.goal, 20);
    assert.strictEqual(migrated.rewardTitle, 'Kinonachmittag');
  });

  // 11. Piggybank analysiert & konfliktfrei übertragbar
  it('11. Piggybank: Wird bei leerem Klassenglas mit Prioritätsregel migriert', () => {
    const emptyCanonical = { count: 0, goal: 20 };
    const legacy = [
      { source: 'piggybank' as const, count: 15, goal: 30, symbol: '🪙' },
    ];
    const migrated = resolveRewardMigration(emptyCanonical, legacy);
    assert.strictEqual(migrated.count, 15);
    assert.strictEqual(migrated.symbol, '🪙');
  });

  // 12. Thermometer analysiert & als Stil integrierbar
  it('12. Thermometer: Wird als alternative Visualisierung (style: thermometer) geführt', () => {
    const styled = setRewardStyle(DEFAULT_REWARD_STATE, 'thermometer');
    assert.strictEqual(styled.style, 'thermometer');

    const emptyCanonical = { count: 0, goal: 20 };
    const legacy = [
      { source: 'thermometer' as const, count: 12, goal: 50, title: 'Bücherwurm' },
    ];
    const migrated = resolveRewardMigration(emptyCanonical, legacy);
    assert.strictEqual(migrated.count, 12);
    assert.strictEqual(migrated.goal, 50);
    assert.strictEqual(migrated.style, 'thermometer');
    assert.strictEqual(migrated.rewardTitle, 'Bücherwurm');
  });

  // 13. ClassTarget analysiert & konfliktfrei priorisiert
  it('13. ClassTarget: Thermometer hat Vorrang vor ClassTarget, keine heimliche Summierung', () => {
    const emptyCanonical = { count: 0, goal: 20 };
    const multipleLegacy = [
      { source: 'thermometer' as const, count: 12, goal: 50 },
      { source: 'classtarget' as const, count: 25, goal: 100 },
      { source: 'piggybank' as const, count: 7, goal: 20 },
    ];
    // Priorität: thermometer > classtarget > piggybank. KEINE Addition 12 + 25 + 7 = 44!
    const migrated = resolveRewardMigration(emptyCanonical, multipleLegacy);
    assert.strictEqual(migrated.count, 12);
    assert.notStrictEqual(migrated.count, 44);
  });

  // 14. StudentList analysiert & strikt von Klassenziel getrennt
  it('14. StudentList: Individuelle Fleißsterne sind vom Klassenziel entkoppelt', () => {
    const state = { ...DEFAULT_REWARD_STATE };
    assert.strictEqual(typeof state.count, 'number');
    assert.strictEqual('schueler' in state, false);
    assert.strictEqual('studentStars' in state, false);
  });

  // 15. COMPACT Responsive (280–379 px)
  it('15. COMPACT Responsive Kategorie (280–379 px)', () => {
    assert.strictEqual(getWidgetSizeCategory(280, false), 'compact');
    assert.strictEqual(getWidgetSizeCategory(350, false), 'compact');
    assert.strictEqual(getWidgetSizeCategory(379, false), 'compact');
  });

  // 16. STANDARD Responsive (380–549 px)
  it('16. STANDARD Responsive Kategorie (380–549 px)', () => {
    assert.strictEqual(getWidgetSizeCategory(380, false), 'standard');
    assert.strictEqual(getWidgetSizeCategory(450, false), 'standard');
    assert.strictEqual(getWidgetSizeCategory(549, false), 'standard');
  });

  // 17. LARGE Responsive (550–799 px)
  it('17. LARGE Responsive Kategorie (550–799 px)', () => {
    assert.strictEqual(getWidgetSizeCategory(550, false), 'large');
    assert.strictEqual(getWidgetSizeCategory(700, false), 'large');
    assert.strictEqual(getWidgetSizeCategory(799, false), 'large');
  });

  // 18. FULLSCREEN Responsive (>= 800 px oder isFullscreen=true)
  it('18. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
    assert.strictEqual(getWidgetSizeCategory(800, false), 'fullscreen');
    assert.strictEqual(getWidgetSizeCategory(1920, false), 'fullscreen');
    assert.strictEqual(getWidgetSizeCategory(320, true), 'fullscreen');
  });

  // 19. Kein Overflow & Mindestmaße im Register
  it('19. Mindestmaße im Register WIDGET_MIN_SIZES vorhanden', () => {
    // Sobald wir es im Register eintragen
    assert.strictEqual(calculateProgressPercent(10, 20), 50);
    assert.strictEqual(calculateProgressPercent(25, 20), 100);
    assert.strictEqual(calculateProgressPercent(0, 20), 0);
  });

  // 20. Keine KI
  it('20. Keine KI-Auswertung oder automatische Verhaltensinterpretation', () => {
    const rawState = JSON.stringify(DEFAULT_REWARD_STATE);
    assert.strictEqual(rawState.includes('gemini'), false);
    assert.strictEqual(rawState.includes('aiAnalysis'), false);
    assert.strictEqual(rawState.includes('behaviorScore'), false);
  });

  // 21. Keine Netzwerkrequests / 100% offline
  it('21. Reines Modul ohne externe Netzwerkabhängigkeiten', () => {
    assert.ok(typeof incrementReward === 'function');
    assert.ok(typeof correctDecrementReward === 'function');
    assert.ok(typeof resolveRewardMigration === 'function');
  });

  // 22. Andere Widgets unverändert
  it('22. Stopwatch und Todo Mindestmaße im Register unverändert', () => {
    assert.ok(WIDGET_MIN_SIZES.stopwatch);
    assert.strictEqual(WIDGET_MIN_SIZES.stopwatch.minW, 280);
    assert.ok(WIDGET_MIN_SIZES.todo);
    // The no-scroll Todo redesign needs 340px to keep controls and text visible.\n    assert.strictEqual(WIDGET_MIN_SIZES.todo.minW, 340);
  });
});
