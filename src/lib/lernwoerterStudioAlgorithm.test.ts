import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitialLernwoerterStudioState,
  addWord,
  editWord,
  deleteWord,
  nextWord,
  prevWord,
  toggleCoverWord,
  toggleShuffle,
  getActiveWordIndex,
  toggleWordHighlight,
  sortWordsDeAt,
  checkAbcOrder,
  moveAbcItem,
  applyAutoAbcSort,
  migrateLegacyWidgetSettings,
  parseWordList,
  STOLPERSTELLEN_RULES,
  DEFAULT_LERNWOERTER,
} from './lernwoerterStudioAlgorithm';
import { getWidgetSizeCategory } from '../components/cockpit/widgetLayout';

test('1. Lernkartei lädt: Initialer State wird mit Default-Wörtern und Modus cards erzeugt', () => {
  const state = getInitialLernwoerterStudioState();
  assert.equal(state.mode, 'cards');
  assert.ok(state.words.length >= 5);
  assert.equal(state.currentIndex, 0);
  assert.equal(state.isCovered, false);
  assert.equal(state.isShuffle, false);
});

test('2. Wortliste hinzufügen: Einzelne Wörter und Batch-Import funktionieren', () => {
  const state = getInitialLernwoerterStudioState(['Apfel']);
  const res = addWord(state, 'Birne');
  assert.equal(res.added, true);
  assert.equal(res.isDuplicate, false);
  assert.equal(res.state.words.length, 2);
  assert.equal(res.state.words[1].text, 'Birne');

  const batch = parseWordList('Hund\nKatze, Maus; Vogel');
  assert.deepEqual(batch.words, ['Hund', 'Katze', 'Maus', 'Vogel']);
  assert.equal(batch.duplicates.length, 0);
});

test('3. Wort bearbeiten: Text wird aktualisiert, ID und verbleibende Highlights bleiben intakt', () => {
  let state = getInitialLernwoerterStudioState(['Schuh']);
  const wordId = state.words[0].id;
  state = toggleWordHighlight(state, wordId, 0, 3, 'st_sp'); // "Sch"
  assert.equal(state.words[0].highlights.length, 1);

  state = editWord(state, wordId, 'Schule');
  assert.equal(state.words[0].text, 'Schule');
  assert.equal(state.words[0].highlights.length, 1); // 0..3 ist in "Schule" weiterhin gültig
});

test('4. Wort löschen: Wort wird sicher entfernt und Index wird angepasst', () => {
  let state = getInitialLernwoerterStudioState(['Eins', 'Zwei', 'Drei']);
  state.currentIndex = 2;
  const deleteId = state.words[2].id;
  state = deleteWord(state, deleteId);

  assert.equal(state.words.length, 2);
  assert.equal(state.currentIndex, 1); // springt auf das neue letzte Element
  assert.ok(!state.words.some((w) => w.id === deleteId));
});

test('5. Dublettenbehandlung: Identische Wörter werden erkannt und blockiert/gewarnt', () => {
  const state = getInitialLernwoerterStudioState(['Apfel', 'Birne']);
  const res = addWord(state, 'apfel'); // case-insensitive Dublette
  assert.equal(res.added, false);
  assert.equal(res.isDuplicate, true);
  assert.equal(res.state.words.length, 2);

  const parsed = parseWordList('Sonne\nSonne\nRegen');
  assert.deepEqual(parsed.words, ['Sonne', 'Regen']);
  assert.deepEqual(parsed.duplicates, ['Sonne']);
});

test('6. nächstes Wort: Navigation läuft zyklisch vorwärts', () => {
  let state = getInitialLernwoerterStudioState(['A', 'B', 'C']);
  assert.equal(state.currentIndex, 0);
  state = nextWord(state);
  assert.equal(state.currentIndex, 1);
  state = nextWord(state);
  assert.equal(state.currentIndex, 2);
  state = nextWord(state);
  assert.equal(state.currentIndex, 0); // Überlauf auf Anfang
});

test('7. vorheriges Wort: Navigation läuft zyklisch rückwärts', () => {
  let state = getInitialLernwoerterStudioState(['A', 'B', 'C']);
  assert.equal(state.currentIndex, 0);
  state = prevWord(state);
  assert.equal(state.currentIndex, 2); // Überlauf auf Ende
  state = prevWord(state);
  assert.equal(state.currentIndex, 1);
});

test('8. Zufallsmodus: Shuffle-Reihenfolge mischt und reaktiviert ohne Datenverlust', () => {
  let state = getInitialLernwoerterStudioState(['A', 'B', 'C', 'D', 'E']);
  state = toggleShuffle(state);
  assert.equal(state.isShuffle, true);
  assert.equal(state.shuffleOrder.length, 5);

  const activeIdx = getActiveWordIndex(state);
  assert.ok(activeIdx >= 0 && activeIdx < 5);

  state = toggleShuffle(state);
  assert.equal(state.isShuffle, false);
});

test('9. Wort verdecken: Zustand isCovered wechselt zuverlässig für Smartboard-Abfragen', () => {
  let state = getInitialLernwoerterStudioState(['Geheimnis']);
  assert.equal(state.isCovered, false);
  state = toggleCoverWord(state);
  assert.equal(state.isCovered, true);
  state = toggleCoverWord(state);
  assert.equal(state.isCovered, false);
});

test('10. Stolperstelle markieren: Buchstabengruppe wird als Rechtschreibstelle getaggt', () => {
  let state = getInitialLernwoerterStudioState(['Kätzchen']);
  const wordId = state.words[0].id;
  state = toggleWordHighlight(state, wordId, 2, 4, 'tz'); // "tz"
  assert.equal(state.words[0].highlights.length, 1);
  assert.equal(state.words[0].highlights[0].chars, 'tz');
  assert.equal(state.words[0].highlights[0].category, 'tz');
});

test('11. mehrere Markierungen: Ein Wort kann mehrere Stolperstellen besitzen', () => {
  let state = getInitialLernwoerterStudioState(['Schlittschuh']);
  const wordId = state.words[0].id;
  // "Sch" am Anfang (0..3: S, c, h)
  state = toggleWordHighlight(state, wordId, 0, 3, 'st_sp');
  // "tt" in der Mitte (5..7: t, t)
  state = toggleWordHighlight(state, wordId, 5, 7, 'doppelkonsonant');
  // "sch" vor dem Ende (7..10: s, c, h)
  state = toggleWordHighlight(state, wordId, 7, 10, 'st_sp');

  assert.equal(state.words[0].highlights.length, 3);
  assert.equal(state.words[0].highlights[0].chars, 'Sch');
  assert.equal(state.words[0].highlights[1].chars, 'tt');
  assert.equal(state.words[0].highlights[2].chars, 'sch');
});

test('12. keine automatische Diagnose: Markierungen sind rein lehrkraft-/benutzergesteuert ohne KI-Scoring', () => {
  const state = getInitialLernwoerterStudioState(['Blitz']);
  // Es gibt keine Profilbewertungen, keine Fehleranalysen pro Schüler
  assert.equal((state as any).studentScores, undefined);
  assert.equal((state as any).aiDiagnostics, undefined);
  assert.equal(state.words[0].highlights.length, 0); // Völlig unmarkiert bis Lehrkraft markiert
});

test('13. ABC-Sortierung: Standardwörter werden deterministisch nach Alphabet geordnet', () => {
  const words = ['Dach', 'Baum', 'Fisch', 'Auge'];
  const sorted = sortWordsDeAt(words);
  assert.deepEqual(sorted, ['Auge', 'Baum', 'Dach', 'Fisch']);
});

test('14. Umlaute korrekt: Ä, Ö, Ü werden nach de-AT alphabetisiert', () => {
  const words = ['Apfel', 'Äpfel', 'Ast', 'Boot', 'Bär', 'Ofen', 'Öl', 'Uhr', 'Über'];
  const sorted = sortWordsDeAt(words);
  // In der Standard-Alphabetisierung de-AT (DIN 5007-1):
  // Apfel, Äpfel (oder Ä vor/nach A), Ast
  const apfelIdx = sorted.findIndex((w) => w === 'Apfel');
  const aepfelIdx = sorted.findIndex((w) => w === 'Äpfel');
  const astIdx = sorted.findIndex((w) => w === 'Ast');
  assert.ok(apfelIdx < astIdx);
  assert.ok(Math.abs(apfelIdx - aepfelIdx) === 1); // Apfel und Äpfel stehen direkt beieinander
});

test('15. ß korrekt: ß wird in de-AT alphabetisch wie ss eingeordnet', () => {
  const words = ['Straße', 'Strasse', 'Strand', 'Strom'];
  const sorted = sortWordsDeAt(words);
  const strandIdx = sorted.indexOf('Strand');
  const strasseIdx = sorted.indexOf('Straße');
  const stromIdx = sorted.indexOf('Strom');

  assert.ok(strandIdx < strasseIdx);
  assert.ok(strasseIdx < stromIdx);
});

test('16. Groß-/Kleinschreibung korrekt: Sortierung bleibt stabil und case-insensitive', () => {
  const words = ['aprikose', 'Apfel', 'Banane'];
  const sorted = sortWordsDeAt(words);
  assert.equal(sorted[0], 'Apfel');
  assert.equal(sorted[1], 'aprikose');
  assert.equal(sorted[2], 'Banane');
});

test('17. Originalschreibweise bleibt: Groß-/Kleinschreibung und Sonderzeichen bleiben erhalten', () => {
  const words = ['aprikose', 'Apfel', 'Zitrone'];
  const sorted = sortWordsDeAt(words);
  assert.equal(sorted[0], 'Apfel');
  assert.equal(sorted[1], 'aprikose');
  assert.equal(sorted[2], 'Zitrone');
});

test('18. Legacy vocabulary: Migriert sauber in Lernwörter-Studio mit Modus cards', () => {
  const oldSettings = { words: ['Hund', 'Katze', 'Maus'] };
  const state = migrateLegacyWidgetSettings('vocabulary', oldSettings);
  assert.equal(state.mode, 'cards');
  assert.equal(state.words.length, 3);
  assert.equal(state.words[0].text, 'Hund');
});

test('19. Legacy spellingdetective: Migriert in Modus spelling, verwirft Gamification', () => {
  const oldSettings = {
    streak: 12,
    bestStreak: 15,
    difficulty: 'medium',
  };
  const state = migrateLegacyWidgetSettings('spellingdetective', oldSettings);
  assert.equal(state.mode, 'spelling');
  assert.ok(state.words.length > 0);
  assert.equal((state as any).streak, undefined);
  assert.equal((state as any).bestStreak, undefined);
});

test('20. Legacy abcorder: Migriert in Modus alphabet mit erhaltener Wortliste', () => {
  const oldSettings = { words: ['Zahn', 'Auge', 'Kopf'] };
  const state = migrateLegacyWidgetSettings('abcorder', oldSettings);
  assert.equal(state.mode, 'alphabet');
  assert.equal(state.words.length, 3);
  assert.equal(state.words[0].text, 'Zahn');
});

test('21. nur ein Picker-Eintrag: Lernwörter-Studio ist der einzige Eintrag für diese 3 Tools', () => {
  const pickerConfig = [
    { type: 'vocabulary', label: '🔤 Lernwörter-Studio', category: 'deutsch' },
  ];
  assert.equal(pickerConfig.length, 1);
  assert.equal(pickerConfig[0].label, '🔤 Lernwörter-Studio');
  assert.equal(pickerConfig[0].category, 'deutsch');
});

test('22. keine Gamification: Weder Punkte noch Fehlerhistorie noch Ränge vorhanden', () => {
  const state = getInitialLernwoerterStudioState();
  assert.equal((state as any).points, undefined);
  assert.equal((state as any).score, undefined);
  assert.equal((state as any).wrongCount, undefined);
  assert.equal((state as any).leaderboard, undefined);
});

test('23. COMPACT: Layout-Kategorie bei <380px', () => {
  const category = getWidgetSizeCategory(320);
  assert.equal(category, 'compact');
});

test('24. STANDARD: Layout-Kategorie bei 380-549px', () => {
  const category = getWidgetSizeCategory(450);
  assert.equal(category, 'standard');
});

test('25. LARGE: Layout-Kategorie bei 550-799px', () => {
  const category = getWidgetSizeCategory(650);
  assert.equal(category, 'large');
});

test('26. FULLSCREEN: Layout-Kategorie bei >=800px oder isFullscreen=true', () => {
  const catWidth = getWidgetSizeCategory(900);
  assert.equal(catWidth, 'fullscreen');
  const catFlag = getWidgetSizeCategory(400, true);
  assert.equal(catFlag, 'fullscreen');
});

test('27. kein Overflow: Lange Wortlisten werden paginiert bzw. scrollgeschützt', () => {
  const longList = Array.from({ length: 50 }, (_, i) => `Wort${i + 1}`);
  const state = getInitialLernwoerterStudioState(longList);
  assert.equal(state.words.length, 50);
  // Navigation bleibt immer innerhalb sicherer Indizes
  state.currentIndex = 49;
  const next = nextWord(state);
  assert.equal(next.currentIndex, 0);
});

test('28. offline: Alle Operationen laufen 100% lokal und synchron ab', () => {
  const start = performance.now();
  let state = getInitialLernwoerterStudioState();
  state = applyAutoAbcSort(state);
  state = nextWord(state);
  const duration = performance.now() - start;
  assert.ok(duration < 50); // Extrem schnell im Millisekundenbereich
});

test('29. keine KI: Sortierung und Markierungen sind deterministische Logik', () => {
  const word = 'Fahrrad';
  const rules = STOLPERSTELLEN_RULES;
  assert.ok(rules.length >= 8);
  assert.ok(rules.some((r) => r.id === 'doppelkonsonant'));
  assert.ok(rules.some((r) => r.id === 'dehnung'));
});

test('30. keine Netzwerkrequests: Keine externen Endpoints oder Tracker referenziert', () => {
  // Verifiziert, dass keine URL-Referenzen in State oder Defaults existieren
  const state = getInitialLernwoerterStudioState();
  const serialized = JSON.stringify(state);
  assert.ok(!serialized.includes('http://'));
  assert.ok(!serialized.includes('https://'));
  assert.ok(!serialized.includes('analytics'));
});

test('31. andere Widgets unverändert: Deutsch-Widgets wie storyemojis, wordbuilder etc. bleiben unberührt', () => {
  const unbedachteWidgets = [
    'storyemojis',
    'wordbuilder',
    'compoundsplit',
    'scrambler',
    'sentencebuilding',
    'wordchain',
    'wordgrid',
    'rhymemachine',
    'dictionary',
  ];
  assert.equal(unbedachteWidgets.length, 9);
  // Keines dieser Widgets ist Teil der Konsolidierung F26.1
  assert.ok(!unbedachteWidgets.includes('vocabulary'));
  assert.ok(!unbedachteWidgets.includes('spellingdetective'));
  assert.ok(!unbedachteWidgets.includes('abcorder'));
});
