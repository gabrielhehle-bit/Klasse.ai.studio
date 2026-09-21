import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { accountSyncState, appStateFingerprint, isLatestAccountSnapshotConfirmed, mergeAccountSyncState } from './accountSyncService';
import { DEFAULT_CLASS_MASCOT } from './classMascot';

const classA = { id: 'A', name: 'A', schuljahr: '2026/27', stufe: 1, schueler: [] } as any;
const classB = { id: 'B', name: 'B', schuljahr: '2026/27', stufe: 2, schueler: [] } as any;
const classMascot = { ...DEFAULT_CLASS_MASCOT, kind: 'elf' as const, name: 'Elio', mood: 'proud' as const, displaySize: 280 as const };

test('Maskottchen-Reise auf den zweiten Laptop: klassenlokale Auswahl, Stimmung, Name und freier Cockpit-Anker', () => {
  const source = syncActiveClass({
    ...initialAppState,
    activeClassId: 'A',
    klassenbezeichnung: 'A',
    classes: [classA, classB],
    classMascot,
    cockpitLayout: [
      { id: 'widget-pet', type: 'pet', x: 71, y: 63, w: 44, h: 66, visible: true },
    ] as any,
  });
  // accountSyncState models the decrypted content inside the existing encrypted
  // account envelope, without sending pupil-level data through an extra mascot API.
  const accountPayload = accountSyncState(source);
  assert.deepEqual(accountPayload.classes?.[0].classMascot, classMascot);
  assert.equal(accountPayload.classes?.[1].classMascot, undefined);
  assert.deepEqual(accountPayload.cockpitLayout?.find(widget => widget.type === 'pet')?.x, 71);
  const remote = normalizeAppState(JSON.parse(JSON.stringify(accountPayload)));
  const secondDevice = mergeAccountSyncState(remote, {
    ...initialAppState,
    currentPage: 'dashboard',
  });
  const reopened = syncActiveClass(secondDevice);
  assert.equal(reopened.classMascot?.name, 'Elio');
  assert.equal(reopened.classMascot?.kind, 'elf');
  assert.equal(reopened.classMascot?.mood, 'proud');
  assert.equal(reopened.classMascot?.displaySize, 280);
  assert.deepEqual(
    reopened.cockpitLayout?.find(widget => widget.type === 'pet')
      ? { x: reopened.cockpitLayout.find(widget => widget.type === 'pet')!.x, y: reopened.cockpitLayout.find(widget => widget.type === 'pet')!.y }
      : null,
    { x: 71, y: 63 },
  );
  assert.equal(reopened.currentPage, 'dashboard', 'the other device retains its own navigation');
  assert.equal(switchClassState(reopened, 'B').classMascot, undefined, 'no class A mascot in class B');
  assert.equal(switchClassState(switchClassState(reopened, 'B'), 'A').classMascot?.name, 'Elio');
});

test('Alte Server-Quittung gilt nicht für neueste Änderung am Maskottchen', () => {
  const initial = { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT };
  const latest = { ...initial, classMascot: { ...DEFAULT_CLASS_MASCOT, name: 'Elio', kind: 'elf' as const } };
  assert.notEqual(appStateFingerprint(initial), appStateFingerprint(latest));
  assert.equal(isLatestAccountSnapshotConfirmed(latest, latest, initial), false);
  assert.equal(isLatestAccountSnapshotConfirmed(latest, null, latest), false);
  assert.equal(isLatestAccountSnapshotConfirmed(latest, latest, latest), true);
});

test('Maskottchen-Sync-Status ist nur in den Einstellungen, nie als Cockpit-Overlay', () => {
  const settings = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
  const board = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.match(settings, /Geräteübergreifender Sync/);
  assert.match(settings, /accountSyncStatus === 'synced'/);
  assert.match(settings, /accountSyncStatus === 'saved-local'/);
  assert.match(settings, /accountSyncStatus === 'conflict'/);
  assert.match(settings, /Cloud-Bestätigung steht aus/);
  assert.match(settings, /retryAccountSync/);
  assert.doesNotMatch(board, /Geräteübergreifender Sync|accountSyncStatus|fixed bottom-/);
});
