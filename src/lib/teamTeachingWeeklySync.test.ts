import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState, syncActiveClass } from './appState';
import { accountSyncState, hasSharedClassAccountDrift, mergeAccountSyncState } from './accountSyncService';
import { decryptSharedClass, encryptSharedClass, generateSharedClassKey } from './teamTeachingCrypto';
import { classRoomFingerprint } from './teamTeachingCrypto';
import { adoptAcknowledgedTeamRoom } from './teamTeachingProjection';

const oldPlan = { 39: { Montag: { 0: { fach: 'Deutsch', thema: 'Alte Kopie im persönlichen Konto' } } } };
const newPlan = { 39: { Montag: { 0: { fach: 'Deutsch', thema: 'Neu im Team geplant' } } } };
function makeState(plan: any) {
  return syncActiveClass({
    ...initialAppState,
    activeClassId: 'shared-room',
    klassenbezeichnung: '1a',
    stufe: 1,
    schuljahr: '2026/27',
    wochenplanung: plan,
    classes: [{ id: 'shared-room', name: '1a', stufe: 1, schuljahr: '2026/27', klassenvorstand: true, schueler: [], wochenplanung: plan }],
  } as any);
}
function asTeam(state: any) {
  return { ...state, classes: state.classes.map((room: any) => ({
    ...room, teamTeaching: { sharedClassId: 'shared-1', role: 'editor', revision: 3, lastSyncedHash: 'baseline' },
  })) };
}

test('Personal-account refresh cannot erase more recent Teamteaching weekly planning or current-class projection', () => {
  const remote = makeState(oldPlan);
  const local = asTeam(makeState(newPlan));
  assert.equal(hasSharedClassAccountDrift(remote, local), true);
  const restored = syncActiveClass(mergeAccountSyncState(remote, local));
  assert.equal(restored.wochenplanung[39].Montag[0].thema, 'Neu im Team geplant');
  assert.equal(restored.classes.find((room: any) => room.id === 'shared-room').wochenplanung[39].Montag[0].thema,
    'Neu im Team geplant');
  assert.equal(restored.classes[0].teamTeaching.revision, 3);
  assert.equal(accountSyncState(restored).classes[0].teamTeaching, undefined);
});

test('A personal-account backup missing the shared class cannot drop an adopted Teamteaching classroom', () => {
  const local = asTeam(makeState(newPlan));
  const remote = { ...initialAppState, activeClassId: '', classes: [], currentPage: 'dashboard' } as any;
  assert.equal(hasSharedClassAccountDrift(remote, local), true);
  const restored = syncActiveClass(mergeAccountSyncState(remote, local));
  assert.equal(restored.activeClassId, 'shared-room');
  assert.equal(restored.classes.length, 1);
  assert.equal(restored.wochenplanung[39].Montag[0].thema, 'Neu im Team geplant');
});

test('Normal personal-account sync remains untouched when this device has no shared class', () => {
  const remote = makeState(newPlan);
  const local = makeState(oldPlan);
  assert.equal(hasSharedClassAccountDrift(remote, local), false);
  const restored = syncActiveClass(mergeAccountSyncState(remote, local));
  assert.equal(restored.wochenplanung[39].Montag[0].thema, 'Neu im Team geplant');
});

test('Encrypted shared-class snapshots include the actual weekly plan for another school account', async () => {
  const owner = asTeam(makeState(newPlan)).classes[0];
  const key = await generateSharedClassKey();
  const payload = await encryptSharedClass(owner, key);
  assert.ok(!JSON.stringify(payload).includes('Neu im Team geplant'));
  const otherTeacher = await decryptSharedClass(payload, key);
  assert.equal(otherTeacher.wochenplanung[39].Montag[0].thema, 'Neu im Team geplant');
  assert.equal(otherTeacher.teamTeaching, undefined);
});

test('Adopting an acknowledged shared classroom normalizes imported fields without creating phantom changes', () => {
  const remote = asTeam(makeState(oldPlan));
  const initialRoom = { ...remote.classes[0], teamTeaching: {
    ...remote.classes[0].teamTeaching, lastSyncedHash: classRoomFingerprint(remote.classes[0]),
  } };
  const colleague = makeState({ 39: { Dienstag: { 1: { fach: 'Sport', thema: 'Meine andere Klasse' } } } });
  const colleagueOwnRoom = { ...colleague.classes[0], id: 'colleague-own', name: 'Andere Klasse' };
  const adopted = adoptAcknowledgedTeamRoom({
    ...colleague, activeClassId: colleagueOwnRoom.id, classes: [colleagueOwnRoom],
  } as any, initialRoom);
  const target = adopted.classes.find((room: any) => room.id === initialRoom.id)!;
  assert.equal(target.wochenplanung[39].Montag[0].thema, 'Alte Kopie im persönlichen Konto');
  assert.equal(classRoomFingerprint(target), target.teamTeaching?.lastSyncedHash);
  const stable = syncActiveClass(adopted);
  assert.equal(classRoomFingerprint(stable.classes.find((room: any) => room.id === initialRoom.id)!),
    target.teamTeaching?.lastSyncedHash, 'Repeated app hydration must not manufacture a new classroom edit');
});
