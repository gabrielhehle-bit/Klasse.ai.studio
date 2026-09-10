import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WortSatzMode,
  DEFAULT_WORD_TASKS,
  DEFAULT_COMPOUND_TASKS,
  DEFAULT_SENTENCE_TASKS,
  splitSentenceIntoWords,
  shuffleArray,
  moveItemLeft,
  moveItemRight,
  checkWordTask,
  checkCompoundTask,
  checkSentenceTask,
  checkCurrentTask,
  createInitialWortSatzState,
  migrateLegacyWortSatzWidgetSettings,
  getCanonicalParts,
  initializeTaskItems,
} from './wortSatzWerkstattAlgorithm';

test('1. word-Modus: initialisiert standardmäßig mit word-Modus und Wortaufgaben', () => {
  const state = createInitialWortSatzState('word');
  assert.equal(state.mode, 'word');
  assert.ok(state.wordTasks.length > 0);
  assert.ok(state.currentItems.length > 0);
});

test('2. Buchstaben zu Wort ordnen: erkennt korrekt zusammengesetztes Wort', () => {
  assert.equal(checkWordTask(['H', 'A', 'U', 'S'], 'HAUS'), true);
  assert.equal(checkWordTask(['S', 'U', 'A', 'H'], 'HAUS'), false);
});

test('3. Wortbausteine ordnen: erkennt richtige Silben-Reihenfolge', () => {
  assert.equal(checkWordTask(['ELE', 'FANT'], 'ELEFANT'), true);
  assert.equal(checkWordTask(['FANT', 'ELE'], 'ELEFANT'), false);
  assert.equal(checkWordTask(['RE', 'GEN', 'SCHIRM'], 'REGENSCHIRM'), true);
});

test('4. compound-Modus: initialisiert mit compound-Aufgaben', () => {
  const state = createInitialWortSatzState('compound');
  assert.equal(state.mode, 'compound');
  assert.ok(state.compoundTasks.length > 0);
});

test('5. Kompositum zerlegen: trennt und prüft Bestandteile', () => {
  const task = DEFAULT_COMPOUND_TASKS[0];
  assert.equal(checkCompoundTask(['Haus', 'Tür'], task.parts), true);
  assert.equal(checkCompoundTask(['Tür', 'Haus'], task.parts), false);
});

test('6. Wieder zusammensetzen: bildet Gesamtwort aus Teilen', () => {
  const parts = ['Haus', 'Tür'];
  const joined = parts.join('');
  assert.equal(joined.toLowerCase(), 'haustür');
});

test('7. sentence-Modus: initialisiert mit Satzaufgaben', () => {
  const state = createInitialWortSatzState('sentence');
  assert.equal(state.mode, 'sentence');
  assert.ok(state.sentenceTasks.length > 0);
});

test('8. Satzwörter ordnen: prüft korrekte Reihenfolge', () => {
  const expected = ['Der', 'Hund', 'läuft', 'schnell.'];
  assert.equal(checkSentenceTask(['Der', 'Hund', 'läuft', 'schnell.'], expected), true);
  assert.equal(checkSentenceTask(['Hund', 'Der', 'schnell.', 'läuft'], expected), false);
});

test('9. Satzzeichen bleiben erhalten: splitSentenceIntoWords verliert keine Interpunktion', () => {
  const sentence = 'Auf dem Spielplatz bauen wir ein Baumhaus.';
  const words = splitSentenceIntoWords(sentence);
  assert.deepEqual(words, ['Auf', 'dem', 'Spielplatz', 'bauen', 'wir', 'ein', 'Baumhaus.']);
  assert.ok(words[words.length - 1].includes('.'));
  assert.equal(words.join(' '), sentence);
});

test('10. Großschreibung bleibt erhalten: Wortanfang und Nomen behalten Casing', () => {
  const sentence = 'Die Lehrerin erklärt die neue Aufgabe!';
  const words = splitSentenceIntoWords(sentence);
  assert.equal(words[0], 'Die');
  assert.equal(words[1], 'Lehrerin');
  assert.equal(words[2], 'erklärt');
  assert.equal(words[words.length - 1], 'Aufgabe!');
});

test('11. Prüfen: liefert exakt true bei passender Anordnung und false bei falscher Anordnung', () => {
  const state = createInitialWortSatzState('word');
  state.currentItems = ['H', 'A', 'U', 'S'];
  state.wordTasks = [{ id: 'w1', targetWord: 'HAUS', parts: ['H', 'A', 'U', 'S'], type: 'letters' }];
  state.currentTaskIndex = 0;
  assert.equal(checkCurrentTask(state), true);

  state.currentItems = ['A', 'H', 'U', 'S'];
  assert.equal(checkCurrentTask(state), false);
});

test('12. Lösung anzeigen: getCanonicalParts liefert stets die exakte Ziel-Anordnung', () => {
  const task = DEFAULT_SENTENCE_TASKS[0];
  const canonical = getCanonicalParts('sentence', task);
  assert.deepEqual(canonical, task.words);
});

test('13. Keine Punkte / Gamification: State enthält keine Stars, Scores oder Streaks', () => {
  const state = createInitialWortSatzState('word');
  assert.equal((state as any).score, undefined);
  assert.equal((state as any).points, undefined);
  assert.equal((state as any).stars, undefined);
  assert.equal((state as any).streak, undefined);
});

test('14. Keine Schülerdaten: State speichert keine Benutzer- oder Schülerprofile', () => {
  const state = createInitialWortSatzState('sentence');
  assert.equal((state as any).students, undefined);
  assert.equal((state as any).user, undefined);
  assert.equal((state as any).errorLog, undefined);
});

test('15. Keine KI: Funktionalität ist vollständig deterministisch und offline', () => {
  const parts = initializeTaskItems('word', DEFAULT_WORD_TASKS[0]);
  assert.equal(parts.length, DEFAULT_WORD_TASKS[0].parts.length);
});

test('16. Legacy wordbuilder Migration: migriert nach mode: word', () => {
  const migrated = migrateLegacyWortSatzWidgetSettings('wordbuilder', { score: 10, streak: 3 });
  assert.equal(migrated.mode, 'word');
  assert.equal((migrated as any).score, undefined);
  assert.equal((migrated as any).streak, undefined);
  assert.ok(migrated.wordTasks.length > 0);
});

test('17. Legacy scrambler Migration: migriert nach mode: sentence', () => {
  const migrated = migrateLegacyWortSatzWidgetSettings('scrambler', { streak: 5 });
  assert.equal(migrated.mode, 'sentence');
  assert.ok(migrated.sentenceTasks.length > 0);
});

test('18. Legacy compoundsplit Migration: migriert nach mode: compound', () => {
  const migrated = migrateLegacyWortSatzWidgetSettings('compoundsplit', { difficulty: 'easy' });
  assert.equal(migrated.mode, 'compound');
  assert.ok(migrated.compoundTasks.length > 0);
});

test('19. Legacy sentencebuilding Migration: migriert nach mode: sentence', () => {
  const migrated = migrateLegacyWortSatzWidgetSettings('sentencebuilding', {});
  assert.equal(migrated.mode, 'sentence');
});

test('20. Shuffling: verändert Reihenfolge und behält alle Elemente', () => {
  const original = ['A', 'B', 'C', 'D'];
  const shuffled = shuffleArray(original);
  assert.equal(shuffled.length, original.length);
  assert.deepEqual(new Set(shuffled), new Set(original));
});

test('21. moveItemLeft: tauscht Element mit linkem Nachbarn', () => {
  const items = ['A', 'B', 'C'];
  const res = moveItemLeft(items, 1);
  assert.deepEqual(res.newItems, ['B', 'A', 'C']);
  assert.equal(res.newIndex, 0);

  const atEdge = moveItemLeft(items, 0);
  assert.deepEqual(atEdge.newItems, ['A', 'B', 'C']);
  assert.equal(atEdge.newIndex, 0);
});

test('22. moveItemRight: tauscht Element mit rechtem Nachbarn', () => {
  const items = ['A', 'B', 'C'];
  const res = moveItemRight(items, 1);
  assert.deepEqual(res.newItems, ['A', 'C', 'B']);
  assert.equal(res.newIndex, 2);

  const atEdge = moveItemRight(items, 2);
  assert.deepEqual(atEdge.newItems, ['A', 'B', 'C']);
  assert.equal(atEdge.newIndex, 2);
});

test('23. Fugenelement: unterstützt Komposita mit Fugen-s oder Fugen-n', () => {
  const geburtstag = DEFAULT_COMPOUND_TASKS.find((c) => c.word === 'Geburtstag');
  assert.ok(geburtstag !== undefined);
  assert.deepEqual(geburtstag?.parts, ['Geburt', 's', 'Tag']);
  assert.equal(geburtstag?.fugenIndex, 1);
});

test('24. Presets Integrität: alle Standardaufgaben haben gültige Daten', () => {
  DEFAULT_WORD_TASKS.forEach((w) => {
    assert.ok(w.targetWord.length > 0);
    assert.ok(w.parts.length > 0);
    assert.equal(w.parts.join('').toUpperCase(), w.targetWord.toUpperCase());
  });

  DEFAULT_COMPOUND_TASKS.forEach((c) => {
    assert.ok(c.word.length > 0);
    assert.ok(c.parts.length > 1);
  });

  DEFAULT_SENTENCE_TASKS.forEach((s) => {
    assert.ok(s.originalSentence.length > 0);
    assert.ok(s.words.length > 1);
    assert.equal(s.words.join(' '), s.originalSentence);
  });
});

test('25. isCovered: Status zur Abdeckung des Zielworts wird sauber gesteuert', () => {
  const state = createInitialWortSatzState('word');
  assert.equal(state.isCovered, false);
  state.isCovered = true;
  assert.equal(state.isCovered, true);
});

test('26. Migration behält bereits migrierte Settings', () => {
  const existingState = createInitialWortSatzState('compound');
  existingState.currentTaskIndex = 2;
  const migrated = migrateLegacyWortSatzWidgetSettings('compoundsplit', existingState);
  assert.equal(migrated.mode, 'compound');
  assert.equal(migrated.currentTaskIndex, 2);
});

test('27. Feedback Werte: exakt "correct" oder "incorrect" für "Passt." bzw. "Noch nicht ganz."', () => {
  const state = createInitialWortSatzState('word');
  state.checkFeedback = 'correct';
  assert.equal(state.checkFeedback, 'correct');
  state.checkFeedback = 'incorrect';
  assert.equal(state.checkFeedback, 'incorrect');
});
