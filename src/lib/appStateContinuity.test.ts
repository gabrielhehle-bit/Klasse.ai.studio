import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState, syncActiveClass } from './appState';
import { createVault } from './vaultService';
import { saveEncryptedAppState, loadEncryptedAppState, __resetSecureStorageForTesting } from './secureStorageService';
import { hasEstablishedClassroom, isUnexpectedEmptyClassReplacement } from './appStateContinuity';

const oneA = syncActiveClass({
  ...initialAppState,
  activeClassId: 'class-synthetic-1a',
  classes: [{ id: 'class-synthetic-1a', name: '1a', stufe: 1, schueler: [{ id: 'synthetic-child', vorname: 'Test' }] }],
  klassenbezeichnung: '1a',
  stufe: 1,
  schueler: [{ id: 'synthetic-child', vorname: 'Test' }],
} as any);

test('An empty startup state stays without classes: no manufactured fourth-grade placeholder', () => {
  const fresh = normalizeAppState(structuredClone(initialAppState));
  assert.equal(fresh.classes.length, 0);
  assert.equal(fresh.activeClassId, '');
  assert.equal(hasEstablishedClassroom(fresh), false);
});

test('Real legacy class and existing 1a remain restorable', () => {
  const migrated = normalizeAppState({ klassenbezeichnung: '1a', stufe: 1, schueler: [{ id: 'synthetic-child' }] });
  assert.equal(migrated.classes.length, 1);
  assert.equal(migrated.classes[0].schueler.length, 1);
  assert.equal(hasEstablishedClassroom(migrated), true);
  assert.equal(hasEstablishedClassroom(normalizeAppState(oneA)), true);
});

test('Neither default 4th-grade placeholder nor empty state may overwrite an existing class', () => {
  const placeholder = normalizeAppState({ klassenbezeichnung: 'Meine Klasse', stufe: 4, schueler: [], classes: [] });
  assert.equal(hasEstablishedClassroom(placeholder), false);
  assert.equal(isUnexpectedEmptyClassReplacement(oneA, placeholder), true);
  assert.equal(isUnexpectedEmptyClassReplacement(oneA, initialAppState), true);
  assert.equal(isUnexpectedEmptyClassReplacement(oneA, oneA), false);
  const plannedWithoutPupils = normalizeAppState({
    activeClassId: 'class-synthetic-planned',
    classes: [{
      id: 'class-synthetic-planned', name: '1a', stufe: 1, schueler: [],
      wochenplanung: { 39: { Montag: { 0: { thema: 'Synthetischer Wochenplan' } } } },
    }],
  });
  assert.equal(isUnexpectedEmptyClassReplacement(plannedWithoutPupils, placeholder), true,
    'Auch eine schon geplante Klasse ohne erfasste Kinder darf kein leerer Ersatzstand verdrängen');
});

test('An existing vault may not silently bootstrap a missing account as empty or open before hydration', () => {
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  const gate = readFileSync('src/components/VaultGate.tsx', 'utf8');
  const storage = readFileSync('src/lib/secureStorageService.ts', 'utf8');
  assert.match(context, /!hadLocalState \|\| !hasEstablishedClassroom\(current\)/);
  assert.match(context, /previousReceipt\?\.revision/);
  assert.match(context, /hasEstablishedClassroom\(remoteState\)/);
  assert.match(context, /setIsAppHydrated\(true\)/);
  assert.match(context, /setIsAppHydrated\(false\)/);
  assert.match(gate, /gateState === 'unlocked' && isVaultUnlocked && isAppHydrated/);
  assert.match(gate, /unlockAppVault\(activeVaultKey, true\)/);
  assert.match(storage, /isUnexpectedEmptyClassReplacement\(prior, appState\)/);
  assert.match(storage, /STORAGE_KEYS\.NOTFALLKOPIE/);
});

test('Verschlüsselter Primärstand bleibt nach abgewiesenem leerem Autosave vollständig erhalten', async () => {
  __resetSecureStorageForTesting();
  const vault = await createVault('SynthetischesTestpasswort2026!NurTests');
  try {
    await saveEncryptedAppState(oneA, vault.vaultKey);
    await assert.rejects(
      saveEncryptedAppState(normalizeAppState(structuredClone(initialAppState)), vault.vaultKey),
      /verhindert das Überschreiben einer bisher gefüllten Klasse/,
    );
    const restored = await loadEncryptedAppState(vault.vaultKey);
    assert.equal(restored?.classes.find(room => room.id === 'class-synthetic-1a')?.schueler?.length, 1);
    assert.equal(restored?.activeClassId, 'class-synthetic-1a');
  } finally {
    __resetSecureStorageForTesting();
  }
});

test('Ausdrücklich neue Installation darf initial ohne Klasse verschlüsselt gespeichert werden', async () => {
  __resetSecureStorageForTesting();
  const vault = await createVault('SynthetischesZweitesTestpasswort2026!');
  try {
    await saveEncryptedAppState(initialAppState, vault.vaultKey);
    const restored = await loadEncryptedAppState(vault.vaultKey);
    assert.equal(restored?.classes.length, 0);
  } finally {
    __resetSecureStorageForTesting();
  }
});
