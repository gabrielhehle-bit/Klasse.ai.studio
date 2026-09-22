import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState, syncActiveClass } from './appState';
import { createVault } from './vaultService';
import {
  saveEncryptedAppState, loadEncryptedAppState, saveEncryptedEmergencyBackup,
  inspectLocalRecoveryPoints, getEncryptedLocalRecoveryPoint,
  saveEncryptedPreImportBackup, __resetSecureStorageForTesting,
} from './secureStorageService';
import { decryptData } from './crypto';
import { hasEstablishedClassroom, isUnexpectedEmptyClassReplacement, hasUnexpectedClassDisappearance, shouldRestoreEstablishedCloudClassroom } from './appStateContinuity';

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

test('Altes leeres Handy-Profil lädt verifizierte 1a statt erneut die Einrichtung zu öffnen', () => {
  const staleEmptyMobile = normalizeAppState({
    ...initialAppState,
    klassenbezeichnung: 'Meine Klasse',
    stufe: 4,
    schueler: [],
    classes: [],
    wochenplanung: {},
  });

  assert.equal(hasEstablishedClassroom(staleEmptyMobile), false);
  assert.equal(shouldRestoreEstablishedCloudClassroom(staleEmptyMobile, oneA), true);
  assert.equal(shouldRestoreEstablishedCloudClassroom(oneA, staleEmptyMobile), false,
    'Ein vorhandener lokaler Klassenstand darf niemals automatisch durch einen Platzhalter ersetzt werden.');
  assert.equal(shouldRestoreEstablishedCloudClassroom(oneA, oneA), false,
    'Zwei echte Klassenstände müssen durch den üblichen revisionsgeschützten Sync laufen.');
  assert.equal(shouldRestoreEstablishedCloudClassroom(staleEmptyMobile, initialAppState), false,
    'Zwei leere Datenstände sind keine erfolgreiche Wiederherstellung.');

  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  const verifiedVault = context.indexOf('if (remote.vaultRecord.id !== vaultRecord.id)');
  const restore = context.indexOf('if (shouldRestoreEstablishedCloudClassroom(current, remoteState))');
  const baseline = context.indexOf('const baseline = loadAccountSyncMetadata(vaultRecord.id);', restore);
  assert.ok(verifiedVault !== -1 && verifiedVault < restore && restore < baseline,
    'Die Wiederherstellung darf nur nach dem Tresor-ID-Abgleich und vor dem Vergleich mit einer alten lokalen Sync-Baseline erfolgen.');
  assert.match(context, /if \(!isStillCurrent\) await saveEncryptedAppState\(remoteState, vaultKey\)/);
  assert.match(context, /if \(!hadLocalState \|\| \(!allowFreshSetup && !hasEstablishedClassroom\(current\)\)\) throw error;/);
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


test('Auch eine andere gefüllte Klasse darf die bisherige 1a nicht unbemerkt verdrängen', () => {
  const fourthGradePupils = [{ id: 'other-synthetic-child', vorname: 'Test' }];
  const wrongFourthGrade = syncActiveClass({
    ...initialAppState,
    activeClassId: 'class-synthetic-4b',
    schueler: fourthGradePupils,
    classes: [{
      id: 'class-synthetic-4b', name: '4b', stufe: 4,
      schueler: fourthGradePupils,
    }],
  } as any);
  assert.equal(hasEstablishedClassroom(wrongFourthGrade), true);
  assert.equal(isUnexpectedEmptyClassReplacement(oneA, wrongFourthGrade), false,
    'Der alte reine Leerstand-Check erkennt den Ersatz durch eine andere gefüllte Klasse nicht.');
  assert.equal(hasUnexpectedClassDisappearance(oneA, wrongFourthGrade), true);
  assert.equal(hasUnexpectedClassDisappearance(oneA, oneA), false);
  const withAdditionalRoom = syncActiveClass({
    ...oneA,
    classes: [...oneA.classes, ...wrongFourthGrade.classes],
  } as any);
  assert.equal(hasUnexpectedClassDisappearance(oneA, withAdditionalRoom), false,
    'Das Hinzufügen einer zweiten Klasse ist kein Datenverlust.');
  assert.equal(hasUnexpectedClassDisappearance(oneA, {
    ...wrongFourthGrade, retiredClasses: [...(wrongFourthGrade.retiredClasses || []), oneA.classes[0]],
  }), false, 'Das bestätigte Stilllegen der alten Klasse bewahrt die Klassen-ID.');
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.ok(context.includes('hasUnexpectedClassDisappearance(current, remoteState)'),
    'Der automatische Konto-Download muss die stabile Klassen-ID prüfen.');
  assert.ok(context.includes('setAccountSyncConflictResolvable(true)'));
});


test('Tägliche Notfallkopie bewahrt die ursprüngliche Klasse auch gegen einen anderen gefüllten Ersatz', async () => {
  __resetSecureStorageForTesting();
  const vault = await createVault('SyntheticEmergencyPreservationTest2026!');
  try {
    await saveEncryptedAppState(oneA, vault.vaultKey);
    await saveEncryptedEmergencyBackup(oneA, vault.vaultKey);
    const original = (await inspectLocalRecoveryPoints(vault.vaultKey))
      .find(point => point.source === 'emergency');
    assert.equal(original?.readable, true);
    assert.equal(original?.students, 1);
    const previousFile = await getEncryptedLocalRecoveryPoint(vault.vaultKey, 'emergency', original!.savedAt);

    const alternative = syncActiveClass({
      ...initialAppState,
      activeClassId: 'class-synthetic-replacement',
      classes: [{ id: 'class-synthetic-replacement', name: '4b', stufe: 4,
        schueler: [{ id: 'another-synthetic-child', vorname: 'Demo' }] }],
      schueler: [{ id: 'another-synthetic-child', vorname: 'Demo' }],
    } as any);
    await saveEncryptedEmergencyBackup(alternative, vault.vaultKey);
    await saveEncryptedEmergencyBackup(initialAppState, vault.vaultKey);
    const afterFile = await getEncryptedLocalRecoveryPoint(vault.vaultKey, 'emergency', original!.savedAt);
    assert.deepEqual(afterFile, previousFile);
    const restored = await decryptData<any>(afterFile.encryptedState, vault.vaultKey);
    assert.equal(restored.activeClassId, 'class-synthetic-1a');
    assert.equal(restored.classes[0].schueler[0].id, 'synthetic-child');
  } finally {
    __resetSecureStorageForTesting();
  }
});

test('Lokale Recovery-Inventur liest alle vorhandenen verschlüsselten Generationen ohne Mutation', async () => {
  __resetSecureStorageForTesting();
  const vault = await createVault('SyntheticRecoveryInventoryTest2026!');
  try {
    await saveEncryptedAppState(oneA, vault.vaultKey);
    await saveEncryptedEmergencyBackup(oneA, vault.vaultKey);
    await saveEncryptedPreImportBackup(oneA, vault.vaultKey);
    const first = await inspectLocalRecoveryPoints(vault.vaultKey);
    assert.ok(first.some(point => point.source === 'primary' && point.readable));
    assert.ok(first.some(point => point.source === 'fallback' && point.readable));
    assert.ok(first.some(point => point.source === 'backup' && point.readable));
    assert.ok(first.some(point => point.source === 'emergency' && point.readable));
    assert.ok(first.some(point => point.source === 'pre-import' && point.readable));
    assert.ok(first.every(point => point.classes === 1 && point.students === 1));
    assert.ok(!JSON.stringify(first).includes('synthetic-child'),
      'Keine Schüler-ID oder Name darf in die Inventur-Metadaten gelangen.');
    const source = first.find(point => point.source === 'pre-import')!;
    const exported = await getEncryptedLocalRecoveryPoint(vault.vaultKey, source.source, source.savedAt);
    assert.ok(!JSON.stringify(exported).includes('synthetic-child'));
    await assert.rejects(
      getEncryptedLocalRecoveryPoint(vault.vaultKey, source.source, source.savedAt + 1),
      /Sicherungsstand hat sich verändert/,
    );
    const second = await inspectLocalRecoveryPoints(vault.vaultKey);
    assert.deepEqual(second, first, 'Die reine Inventur darf weder Daten noch Zeitstempel ändern.');
    const stillActive = await loadEncryptedAppState(vault.vaultKey);
    assert.equal(stillActive?.activeClassId, 'class-synthetic-1a');
  } finally {
    __resetSecureStorageForTesting();
  }
});

test('Lokale Wiederherstellung ist ausdrücklich und führt keinen automatischen Cloud-Rollback aus', () => {
  const settings = readFileSync('src/components/settings/BackupSettings.tsx', 'utf8');
  assert.ok(settings.includes('Lokale Wiederherstellungspunkte prüfen'));
  assert.ok(settings.includes('getEncryptedLocalRecoveryPoint(key, point.source, point.savedAt)'));
  assert.ok(settings.includes('Sicherung einlesen'));
  assert.ok(!settings.includes('await restoreAppData(record)'));
});
