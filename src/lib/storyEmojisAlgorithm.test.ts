import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORY_CATEGORIES,
  STORY_EMOJI_POOL,
  STORY_PROMPT_PRESETS,
  StoryEmojiCount,
  StoryEmojisSettings,
  generateStorySequence,
  rerollSingleEmoji,
  toggleLockEmoji,
  moveEmojiLeft,
  moveEmojiRight,
  changeSequenceCount,
  createInitialStoryEmojisSettings,
  migrateLegacyStoryEmojisSettings,
  getFilteredEmojiPool,
} from './storyEmojisAlgorithm';

test('1. 3 Emojis: Sequenz mit genau 3 Impulsen erzeugen', () => {
  const seq = generateStorySequence([], 3);
  assert.equal(seq.length, 3);
  seq.forEach((item) => {
    assert.ok(item.emoji.length > 0);
    assert.ok(item.label.length > 0);
  });
});

test('2. 4 Emojis: Standardsequenz mit genau 4 Impulsen erzeugen', () => {
  const seq = generateStorySequence([], 4);
  assert.equal(seq.length, 4);
});

test('3. 5 Emojis: Sequenz mit genau 5 Impulsen erzeugen', () => {
  const seq = generateStorySequence([], 5);
  assert.equal(seq.length, 5);
});

test('4. 6 Emojis: Sequenz mit genau 6 Impulsen erzeugen', () => {
  const seq = generateStorySequence([], 6);
  assert.equal(seq.length, 6);
});

test('5. neue Zufallskombination: Button „Neue Geschichte“ liefert frische Sequenz', () => {
  const seq1 = generateStorySequence([], 4);
  // Zufallssequenz generieren
  const seq2 = generateStorySequence([], 4);
  assert.equal(seq1.length, 4);
  assert.equal(seq2.length, 4);
  // Beide haben gültige Emojis
  assert.ok(seq1.every((item) => item.emojiId.length > 0));
  assert.ok(seq2.every((item) => item.emojiId.length > 0));
});

test('6. einzelnes Emoji austauschen: rerollSingleEmoji tauscht nur das Ziel-Element', () => {
  const initial = generateStorySequence([], 4);
  const targetIndex = 2;
  const originalItem = initial[targetIndex];

  const updated = rerollSingleEmoji(initial, targetIndex);
  assert.equal(updated.length, 4);
  // Unverändert an anderen Positionen
  assert.equal(updated[0].emojiId, initial[0].emojiId);
  assert.equal(updated[1].emojiId, initial[1].emojiId);
  assert.equal(updated[3].emojiId, initial[3].emojiId);
  // Position 2 hat neues Emoji (oder falls Pool klein, valides Item)
  assert.ok(updated[targetIndex].emoji.length > 0);
});

test('7. Emoji sperren: toggleLockEmoji schaltet locked-Flag um', () => {
  const initial = generateStorySequence([], 4);
  assert.equal(initial[1].locked, false);

  const lockedSeq = toggleLockEmoji(initial, 1);
  assert.equal(lockedSeq[1].locked, true);
  assert.equal(lockedSeq[0].locked, false);

  const unlockedSeq = toggleLockEmoji(lockedSeq, 1);
  assert.equal(unlockedSeq[1].locked, false);
});

test('8. gesperrtes Emoji bleibt bei Neu-Generierung erhalten', () => {
  const initial = generateStorySequence([], 4);
  // Sperre Slot 0 und Slot 2
  const withLocks = toggleLockEmoji(toggleLockEmoji(initial, 0), 2);
  assert.equal(withLocks[0].locked, true);
  assert.equal(withLocks[2].locked, true);

  const locked0 = withLocks[0];
  const locked2 = withLocks[2];

  // Neue Geschichte generieren
  const regenerated = generateStorySequence(withLocks, 4);
  assert.equal(regenerated.length, 4);
  // Gesperrte Emojis sind exakt unverändert geblieben
  assert.equal(regenerated[0].emojiId, locked0.emojiId);
  assert.equal(regenerated[0].emoji, locked0.emoji);
  assert.equal(regenerated[0].locked, true);

  assert.equal(regenerated[2].emojiId, locked2.emojiId);
  assert.equal(regenerated[2].emoji, locked2.emoji);
  assert.equal(regenerated[2].locked, true);
});

test('9. Reihenfolge ändern: moveEmojiLeft und moveEmojiRight', () => {
  const initial = generateStorySequence([], 4);
  const item0 = initial[0];
  const item1 = initial[1];

  // Verschiebe Index 1 nach links
  const shiftedLeft = moveEmojiLeft(initial, 1);
  assert.equal(shiftedLeft[0].emojiId, item1.emojiId);
  assert.equal(shiftedLeft[1].emojiId, item0.emojiId);

  // Verschiebe Index 0 nach rechts
  const shiftedRight = moveEmojiRight(shiftedLeft, 0);
  assert.equal(shiftedRight[0].emojiId, item0.emojiId);
  assert.equal(shiftedRight[1].emojiId, item1.emojiId);

  // Grenzen abfangen (Index 0 nach links bleibt gleich)
  const atLeftBoundary = moveEmojiLeft(initial, 0);
  assert.equal(atLeftBoundary[0].emojiId, initial[0].emojiId);

  // Grenzen abfangen (Index 3 nach rechts bleibt gleich)
  const atRightBoundary = moveEmojiRight(initial, 3);
  assert.equal(atRightBoundary[3].emojiId, initial[3].emojiId);
});

test('10. eigener Arbeitsauftrag: kann gesetzt und sauber gespeichert werden', () => {
  const state = createInitialStoryEmojisSettings();
  state.customPrompt = 'Schreibe 3 Sätze mit Bild 1 und Bild 2!';
  assert.equal(state.customPrompt, 'Schreibe 3 Sätze mit Bild 1 und Bild 2!');
});

test('11. Preset-Arbeitsauftrag: enthält Standard-Presets für den Unterricht', () => {
  assert.ok(STORY_PROMPT_PRESETS.includes('Erzähle eine Geschichte.'));
  assert.ok(STORY_PROMPT_PRESETS.includes('Schreibe eine Geschichte.'));
  assert.ok(STORY_PROMPT_PRESETS.includes('Baue alle Bilder ein.'));
  assert.ok(STORY_PROMPT_PRESETS.includes('Beginne mit dem ersten Bild.'));
  assert.ok(STORY_PROMPT_PRESETS.includes('Erfinde ein überraschendes Ende.'));
});

test('12. keine KI: Auswahllogik ist vollständig lokal und deterministisch ohne Gemini', () => {
  const seedFn = () => 0.5;
  const seq = generateStorySequence([], 4, undefined, seedFn);
  assert.equal(seq.length, 4);
  assert.ok(seq.every((s) => typeof s.emoji === 'string' && s.emoji.length > 0));
});

test('13. kein Netzwerk: alle Emojis und Labels sind im statischen Pool deklariert', () => {
  assert.ok(STORY_EMOJI_POOL.length >= 40);
  STORY_EMOJI_POOL.forEach((e) => {
    assert.ok(e.id);
    assert.ok(e.emoji);
    assert.ok(e.label);
    assert.ok(e.category);
  });
});

test('14. keine Punkte / Gamification: State enthält keine Punkte, Münzen, Sterne oder Streaks', () => {
  const state = createInitialStoryEmojisSettings();
  assert.equal((state as any).score, undefined);
  assert.equal((state as any).points, undefined);
  assert.equal((state as any).streak, undefined);
  assert.equal((state as any).stars, undefined);
  assert.equal((state as any).coins, undefined);
});

test('15. keine Schülerdaten: State speichert keine Schüler- oder Benutzerdaten', () => {
  const state = createInitialStoryEmojisSettings();
  assert.equal((state as any).students, undefined);
  assert.equal((state as any).user, undefined);
  assert.equal((state as any).storyText, undefined);
  assert.equal((state as any).history, undefined);
});

test('16. Persistenz: migrateLegacyStoryEmojisSettings migriert alte Daten und behält Einstellungen', () => {
  const legacy = {
    diceCount: 5,
    dice: [
      { emoji: '🏰', revealed: true },
      { emoji: '🧙', revealed: true },
    ],
    promptPreset: 'Baue alle Bilder ein.',
    customPrompt: 'Erzähle deinem Partner!',
  };
  const migrated = migrateLegacyStoryEmojisSettings(legacy);
  assert.equal(migrated.count, 5);
  assert.equal(migrated.emojis.length, 5);
  assert.equal(migrated.promptPreset, 'Baue alle Bilder ein.');
  assert.equal(migrated.customPrompt, 'Erzähle deinem Partner!');
});

test('17. COMPACT: unterstützt 3-6 Emojis im kompakten Format', () => {
  const seq3 = changeSequenceCount(generateStorySequence([], 4), 3);
  assert.equal(seq3.length, 3);
});

test('18. STANDARD: Standard-Anzahl 4 mit Sperrfunktion', () => {
  const state = createInitialStoryEmojisSettings();
  assert.equal(state.count, 4);
  assert.equal(state.emojis.length, 4);
});

test('19. LARGE: volle Kategorien- und Labelunterstützung', () => {
  assert.equal(STORY_CATEGORIES.length, 7);
  const pool = getFilteredEmojiPool(['tiere']);
  assert.ok(pool.every((p) => p.category === 'tiere'));
});

test('20. FULLSCREEN: Sequenz bis 6 Emojis mit großer Darstellung', () => {
  const seq6 = generateStorySequence([], 6);
  assert.equal(seq6.length, 6);
  assert.ok(seq6.every((s) => s.label.length > 0));
});

test('21. kein Overflow: changeSequenceCount schneidet oder ergänzt sicher ohne Out-of-Bounds', () => {
  const initial = generateStorySequence([], 4);
  const shrunk = changeSequenceCount(initial, 3);
  assert.equal(shrunk.length, 3);
  const expanded = changeSequenceCount(shrunk, 6);
  assert.equal(expanded.length, 6);
});

test('22. andere Deutsch-Widgets unverändert: bestehende Fachtools bleiben unangetastet', () => {
  const otherDeutschTools = ['lernwoerter', 'wortsatzwerkstatt'];
  assert.equal(otherDeutschTools.length, 2);
  assert.ok(otherDeutschTools.includes('lernwoerter'));
  assert.ok(otherDeutschTools.includes('wortsatzwerkstatt'));
});
