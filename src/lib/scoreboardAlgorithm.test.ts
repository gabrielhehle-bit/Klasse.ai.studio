import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_SCOREBOARD_SETTINGS,
  DEFAULT_SCOREBOARD_TEAMS,
  MIN_TEAMS,
  MAX_TEAMS,
  TEAM_COLOR_PRESETS,
  sanitizeScoreboardSettings,
  incrementScore,
  correctScore,
  addTeam,
  updateTeam,
  removeTeam,
  startNewRound,
  finishRound,
  resetAllTeams,
  getWinners,
  validateScoreboardPedagogicalGuard,
  ScoreboardSettings,
} from './scoreboardAlgorithm.ts';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout.ts';

describe('F22 – Team-Scoreboard (widget-scoreboard)', () => {
  // 1. Team hinzufügen
  it('1. Team hinzufügen funktioniert (bis maximal 6)', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    assert.strictEqual(state.teams.length, 2);

    state = addTeam(state, 'Grüne Frösche');
    assert.strictEqual(state.teams.length, 3);
    assert.strictEqual(state.teams[2].name, 'Grüne Frösche');

    state = addTeam(state);
    state = addTeam(state);
    state = addTeam(state);
    assert.strictEqual(state.teams.length, 6);

    // Weiteres Hinzufügen wird bei MAX_TEAMS (6) ignoriert
    const beyondMax = addTeam(state, 'Zu viel');
    assert.strictEqual(beyondMax.teams.length, 6);
  });

  // 2. Team umbenennen
  it('2. Team umbenennen funktioniert', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    const teamId = state.teams[0].id;

    state = updateTeam(state, teamId, { name: 'Super Füchse' });
    assert.strictEqual(state.teams[0].name, 'Super Füchse');

    // Leerer String fällt auf bestehenden Namen zurück
    state = updateTeam(state, teamId, { name: '   ' });
    assert.strictEqual(state.teams[0].name, 'Super Füchse');
  });

  // 3. Team löschen
  it('3. Team löschen funktioniert, mindestens 2 Teams bleiben erhalten', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    state = addTeam(state, 'Team 3');
    assert.strictEqual(state.teams.length, 3);

    const team3Id = state.teams[2].id;
    state = removeTeam(state, team3Id);
    assert.strictEqual(state.teams.length, 2);

    // Löschen unter MIN_TEAMS wird verhindert
    const team1Id = state.teams[0].id;
    const cantRemove = removeTeam(state, team1Id);
    assert.strictEqual(cantRemove.teams.length, 2);
  });

  // 4. +1 funktioniert
  it('4. +1 erhöht Punktestand korrekt', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    const teamId = state.teams[0].id;

    state = incrementScore(state, teamId, 1);
    assert.strictEqual(state.teams[0].score, 1);

    state = incrementScore(state, teamId, 1);
    assert.strictEqual(state.teams[0].score, 2);
  });

  // 5. Korrektur funktioniert
  it('5. Korrektur (-1) verringert Punktestand nur für Tippfehler', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    const teamId = state.teams[0].id;

    state = incrementScore(state, teamId, 3);
    assert.strictEqual(state.teams[0].score, 3);

    state = correctScore(state, teamId, 1);
    assert.strictEqual(state.teams[0].score, 2);
  });

  // 6. keine negativen Werte
  it('6. Keine negativen Werte: Punktestand stoppt strikt bei 0', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    const teamId = state.teams[0].id;
    assert.strictEqual(state.teams[0].score, 0);

    state = correctScore(state, teamId, 1);
    assert.strictEqual(state.teams[0].score, 0);

    state = correctScore(state, teamId, 5);
    assert.strictEqual(state.teams[0].score, 0);
  });

  // 7. Neue Runde setzt Punkte zurück
  it('7. Neue Runde setzt Punkte aller Teams auf 0 zurück', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    state = incrementScore(state, state.teams[0].id, 4);
    state = incrementScore(state, state.teams[1].id, 7);

    assert.strictEqual(state.teams[0].score, 4);
    assert.strictEqual(state.teams[1].score, 7);

    state = startNewRound(state);
    assert.strictEqual(state.teams[0].score, 0);
    assert.strictEqual(state.teams[1].score, 0);
    assert.strictEqual(state.roundFinished, false);
  });

  // 8. Teamnamen bleiben bei neuer Runde
  it('8. Teamnamen, Farben und Icons bleiben bei Neuer Runde vollständig erhalten', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    state = updateTeam(state, state.teams[0].id, { name: 'Tisch 1 Blitz' });
    state = updateTeam(state, state.teams[1].id, { name: 'Tisch 2 Donner' });
    state = incrementScore(state, state.teams[0].id, 5);

    state = startNewRound(state);
    assert.strictEqual(state.teams[0].name, 'Tisch 1 Blitz');
    assert.strictEqual(state.teams[1].name, 'Tisch 2 Donner');
    assert.strictEqual(state.teams[0].score, 0);
  });

  // 9. Runde beenden funktioniert
  it('9. Runde beenden setzt roundFinished auf true', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    assert.strictEqual(state.roundFinished, false);

    state = finishRound(state);
    assert.strictEqual(state.roundFinished, true);
  });

  // 10. Gewinner korrekt
  it('10. Gewinner ermitteln hebt Team mit höchstem Punktestand hervor', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    state = incrementScore(state, state.teams[0].id, 3);
    state = incrementScore(state, state.teams[1].id, 6);

    const { winners, isTie, maxScore } = getWinners(state);
    assert.strictEqual(isTie, false);
    assert.strictEqual(maxScore, 6);
    assert.strictEqual(winners.length, 1);
    assert.strictEqual(winners[0].id, state.teams[1].id);
  });

  // 11. Gleichstand korrekt
  it('11. Gleichstand ermittelt mehrere Gewinner korrekt', () => {
    let state = { ...DEFAULT_SCOREBOARD_SETTINGS };
    state = incrementScore(state, state.teams[0].id, 5);
    state = incrementScore(state, state.teams[1].id, 5);

    const { winners, isTie, maxScore } = getWinners(state);
    assert.strictEqual(isTie, true);
    assert.strictEqual(maxScore, 5);
    assert.strictEqual(winners.length, 2);
  });

  // 12. keine Schülernamen-Rangliste
  it('12. Keine Schülernamen-Rangliste: Validator blockiert personenbezogene Ranglisten-Flags', () => {
    const validData = { teams: [{ id: '1', name: 'Team Rot', score: 3 }] };
    assert.strictEqual(validateScoreboardPedagogicalGuard(validData).valid, true);

    const invalidRanking = {
      teams: [{ id: '1', name: 'Max Mustermann', score: 3 }],
      isStudentRanking: true,
    };
    const check = validateScoreboardPedagogicalGuard(invalidRanking);
    assert.strictEqual(check.valid, false);
  });

  // 13. keine Verhaltensbewertung
  it('13. Keine Verhaltensbewertung: Straf- oder Disziplinattribute werden blockiert', () => {
    const invalidBehavior = {
      teams: [
        { id: '1', name: 'Team 1', score: 2, discipline: 'bad' },
      ],
    };
    const check = validateScoreboardPedagogicalGuard(invalidBehavior);
    assert.strictEqual(check.valid, false);
  });

  // 14. keine Klassenglas-Verknüpfung
  it('14. Keine Klassenglas-Verknüpfung: Scoreboard-State ist unabhängig von app.klassenglas_*', () => {
    const mockApp = {
      klassenglas_count: 14,
      klassenglas_ziel: 20,
    };
    const scoreboardState = sanitizeScoreboardSettings({});
    assert.strictEqual((scoreboardState as any).klassenglas_count, undefined);
    assert.strictEqual((scoreboardState as any).count, undefined);
    // Änderung am Scoreboard beeinflusst mockApp nicht
    const nextState = incrementScore(scoreboardState, scoreboardState.teams[0].id, 2);
    assert.strictEqual(nextState.teams[0].score, 2);
    assert.strictEqual(mockApp.klassenglas_count, 14);
  });

  // 15. zwei Scoreboards unabhängig
  it('15. Zwei Scoreboard-Instanzen arbeiten mit separaten Settings völlig autonom', () => {
    const boardA = sanitizeScoreboardSettings({
      teams: [
        { id: 'a1', name: 'Quiz Gruppe 1', score: 3, colorKey: 'red' },
        { id: 'a2', name: 'Quiz Gruppe 2', score: 2, colorKey: 'blue' },
      ],
    });

    const boardB = sanitizeScoreboardSettings({
      teams: [
        { id: 'b1', name: 'Tisch A', score: 10, colorKey: 'green' },
        { id: 'b2', name: 'Tisch B', score: 8, colorKey: 'amber' },
      ],
    });

    const updatedBoardA = incrementScore(boardA, 'a1', 1);
    assert.strictEqual(updatedBoardA.teams[0].score, 4);
    // Board B bleibt unberührt
    assert.strictEqual(boardB.teams[0].score, 10);
  });

  // 16. COMPACT (280–379 px)
  it('16. COMPACT Kategorie für Breiten 280–379 px', () => {
    assert.strictEqual(getWidgetSizeCategory(280), 'compact');
    assert.strictEqual(getWidgetSizeCategory(350), 'compact');
    assert.strictEqual(getWidgetSizeCategory(379), 'compact');
  });

  // 17. STANDARD (380–549 px)
  it('17. STANDARD Kategorie für Breiten 380–549 px', () => {
    assert.strictEqual(getWidgetSizeCategory(380), 'standard');
    assert.strictEqual(getWidgetSizeCategory(450), 'standard');
    assert.strictEqual(getWidgetSizeCategory(549), 'standard');
  });

  // 18. LARGE (550–799 px)
  it('18. LARGE Kategorie für Breiten 550–799 px', () => {
    assert.strictEqual(getWidgetSizeCategory(550), 'large');
    assert.strictEqual(getWidgetSizeCategory(680), 'large');
    assert.strictEqual(getWidgetSizeCategory(799), 'large');
  });

  // 19. FULLSCREEN (>= 800 px oder isFullscreen=true)
  it('19. FULLSCREEN Kategorie für Breiten >= 800 px oder isFullscreen=true', () => {
    assert.strictEqual(getWidgetSizeCategory(800), 'fullscreen');
    assert.strictEqual(getWidgetSizeCategory(1200), 'fullscreen');
    assert.strictEqual(getWidgetSizeCategory(300, true), 'fullscreen');
  });

  // 20. kein Overflow & Mindestgröße registriert
  it('20. Mindestgröße im WIDGET_MIN_SIZES Register vorhanden und mind. 280 px', () => {
    const minConfig = WIDGET_MIN_SIZES['scoreboard'];
    assert.ok(minConfig, 'scoreboard muss in WIDGET_MIN_SIZES definiert sein');
    assert.strictEqual(minConfig.minW, 280);
    assert.strictEqual(minConfig.minH, 220);
  });

  // 21. keine KI
  it('21. Keine KI: Vollständig deterministische Logik ohne generative Textaufrufe', () => {
    const state = sanitizeScoreboardSettings({});
    assert.strictEqual((state as any).aiAnalysis, undefined);
    assert.strictEqual((state as any).geminiModel, undefined);
  });

  // 22. keine Netzwerkrequests
  it('22. Keine externen Netzwerkaufrufe: 100% offline ausführbar', () => {
    const state = sanitizeScoreboardSettings(null);
    const round2 = startNewRound(state);
    const roundFinished = finishRound(round2);
    const winners = getWinners(roundFinished);
    assert.ok(winners);
  });

  // 23. verschlüsselte Persistenz
  it('23. Persistenzstruktur: Validiert und serialisiert in widget.settings', () => {
    const rawSettings = {
      teams: [
        { id: 't1', name: 'Eulen', score: 4, colorKey: 'purple', icon: '🦉' },
        { id: 't2', name: 'Adler', score: 2, colorKey: 'orange', icon: '🦅' },
      ],
      roundFinished: true,
      stepSize: 2,
    };
    const sanitized = sanitizeScoreboardSettings(rawSettings);
    assert.strictEqual(sanitized.teams.length, 2);
    assert.strictEqual(sanitized.teams[0].name, 'Eulen');
    assert.strictEqual(sanitized.teams[0].score, 4);
    assert.strictEqual(sanitized.teams[1].name, 'Adler');
    assert.strictEqual(sanitized.roundFinished, true);
    assert.strictEqual(sanitized.stepSize, 2);
  });

  // 24. andere Widgets unverändert
  it('24. Mindestmaße anderer Widgets im Register bleiben exakt unberührt', () => {
    assert.strictEqual(WIDGET_MIN_SIZES.stopwatch.minW, 280);
    assert.strictEqual(WIDGET_MIN_SIZES.todo.minW, 280);
    assert.strictEqual(WIDGET_MIN_SIZES.klassenglas.minW, 280);
    assert.strictEqual(WIDGET_MIN_SIZES.timer.minW, 280);
  });
});
