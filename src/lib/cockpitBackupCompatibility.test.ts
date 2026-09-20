import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault } from './vaultService';
import { createEncryptedBackup, decryptBackup } from './backupCryptoService';
import { normalizeAppState } from './appState';

test('old JSON keeps class fund, legacy ink and media while new quickbar/paper preferences survive encrypted backup', async () => {
  const raw = {
    klassenbezeichnung: 'Synthetic Class',
    schueler: [{ id: 'synthetic', vorname: 'Testkind' }],
    materialien: [{ id: 'old-file', titel: 'Arbeitsblatt', typ: 'datei', dateiInhalt: 'data:image/png;base64,YQ==', faecher: [], schulstufen: [], tags: [], erstelltAm: '2026-09-20', favorit: false, kiGeneriert: false }],
    klassenkasse: { kontostand: 12, sammlungen: [], transaktionen: [] },
    boardSettings: {
      cockpitInkByClass: { 'class-one': [{ id: 'old-ink', color: '#000000', width: 4, points: [[0, 0], [3, 3]] }] },
      cockpitTextByClass: { 'class-one': '<p>Behalten</p>' },
      cockpitPaperByClass: { 'class-one': 'handwriting', 'class-two': 'grid' },
      cockpitPaperSpacingByClass: { 'class-one': 48, 'class-two': 24 },
      cockpitQuickbarByClass: { 'class-one': { enabled: true, itemIds: ['clock', 'timer'] }, 'class-two': { enabled: false, itemIds: [] } },
    },
  };
  const state = normalizeAppState(raw);
  const { vaultKey, vaultRecord } = await createVault('Synthetic test password 123!');
  const backup = await createEncryptedBackup(state, vaultKey, vaultRecord);
  const json = JSON.stringify(backup);
  assert.doesNotMatch(json, /Testkind|Behalten|Arbeitsblatt|old-ink|clock/);
  const restored = await decryptBackup<typeof state>(backup, vaultKey);
  assert.deepEqual(restored.boardSettings?.cockpitInkByClass, state.boardSettings?.cockpitInkByClass);
  assert.deepEqual(restored.boardSettings?.cockpitTextByClass, state.boardSettings?.cockpitTextByClass);
  assert.deepEqual(restored.boardSettings?.cockpitQuickbarByClass, state.boardSettings?.cockpitQuickbarByClass);
  assert.deepEqual(restored.boardSettings?.cockpitPaperSpacingByClass, state.boardSettings?.cockpitPaperSpacingByClass);
  assert.deepEqual(restored.materialien, state.materialien);
  assert.deepEqual(restored.klassenkasse, state.klassenkasse);
});
