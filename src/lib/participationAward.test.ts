import test from 'node:test';
import assert from 'node:assert/strict';
import { commitParticipationAward } from './participationAward';
import { initialAppState, syncActiveClass, switchClassState, normalizeAppState } from './appState';
import { accountSyncState, mergeAccountSyncState } from './accountSyncService';
import { adoptAcknowledgedTeamRoom } from './teamTeachingProjection';
import { classRoomFingerprint, encryptSharedClass, decryptSharedClass, generateSharedClassKey } from './teamTeachingCrypto';
const room = (id: string) => ({ id, name: id, stufe: 1, klassenvorstand: true, schueler: [{ id: 'pupil', vorname: 'Demo', nachname: 'Kind' }], faecher: ['Deutsch', 'Mathematik'] });
const state = () => syncActiveClass({ ...initialAppState, classes: [room('a'), room('b')], activeClassId: 'a', schueler: room('a').schueler, faecher: room('a').faecher, participationSettings: { subjectMode: 'choose', feedback: 'both' } } as any);
test('Fachbestätigung vergibt genau einen Punkt an das gewählte Fach und erhält vorhandene Punkte', () => {
  const first = commitParticipationAward(state(), { classId: 'a', sid: 'pupil', subject: 'Deutsch' });
  const second = commitParticipationAward(first, { classId: 'a', sid: 'pupil', subject: 'Mathematik' });
  assert.deepEqual(second.mitarbeitLogs.map(log => [log.fach, log.points]), [['Deutsch', 1], ['Mathematik', 1]]);
  assert.notEqual(second.mitarbeitLogs[0].id, second.mitarbeitLogs[1].id);
});
test('Veraltete Klassen-, Kinder- und Fachauswahl verändert keinen gespeicherten Stand', () => {
  const source = state();
  for (const request of [{ classId: 'b', sid: 'pupil', subject: 'Deutsch' }, { classId: 'a', sid: 'missing', subject: 'Deutsch' }, { classId: 'a', sid: 'pupil', subject: 'missing' }]) assert.equal(commitParticipationAward(source, request), source);
});
test('Mitarbeit-Einstellungen bleiben beim Klassenwechsel getrennt', () => {
  const source = state();
  const switched = switchClassState(source, 'b');
  assert.equal(switched.participationSettings, undefined);
  assert.deepEqual(switchClassState(switched, 'a').participationSettings, source.participationSettings);
});
test('Geräteabgleich übernimmt ausgewählte Fächer, Pluspunkte und Reaktionseinstellungen', () => {
  const source = commitParticipationAward(state(), { classId: 'a', sid: 'pupil', subject: 'Deutsch' });
  const restored = normalizeAppState(JSON.parse(JSON.stringify(accountSyncState(source))));
  const secondDevice = mergeAccountSyncState(restored, initialAppState);
  assert.deepEqual(secondDevice.participationSettings, source.participationSettings);
  assert.deepEqual(secondDevice.mitarbeitLogs, source.mitarbeitLogs);
});
test('Teamteaching überträgt Mitarbeit-Einstellungen und Punkte verschlüsselt, ohne lokale Autoren-Metadaten', async () => {
  const source = syncActiveClass(commitParticipationAward(state(), { classId: 'a', sid: 'pupil', subject: 'Deutsch' }));
  const shared = { ...source.classes[0], teamTeaching: { sharedClassId: 'shared', role: 'owner', revision: 1, lastChangedBy: 'Demo Lehrperson' } } as any;
  const key = await generateSharedClassKey();
  const restored = await decryptSharedClass(await encryptSharedClass(shared, key), key);
  assert.deepEqual(restored.participationSettings, source.participationSettings);
  assert.deepEqual(restored.mitarbeitLogs, source.mitarbeitLogs);
  assert.equal(restored.teamTeaching, undefined);
  assert.equal(classRoomFingerprint(shared), classRoomFingerprint({ ...shared, teamTeaching: { ...shared.teamTeaching, lastChangedBy: 'Andere Person' } }));
});

test('Team-Abgleich ersetzt die Punkte der geteilten Klasse und erhält andere Klassenprotokolle', () => {
  const base = state();
  const local = syncActiveClass({ ...base, mitarbeitLogs: [
    {id:'local',sid:'pupil',fach:'Deutsch',points:1,timestamp:'2026-09-30T12:00:00Z'},
    {id:'other',sid:'other-pupil',fach:'Deutsch',points:1,timestamp:'2026-09-30T12:00:00Z'},
  ] });
  const incoming = { ...local.classes[0], mitarbeitLogs: [{id:'team',sid:'pupil',fach:'Mathematik',points:1,timestamp:'2026-09-30T12:10:00Z'}] };
  const adopted = adoptAcknowledgedTeamRoom(local, incoming);
  assert.deepEqual(adopted.mitarbeitLogs?.map(log => log.id), ['other', 'team']);
});
test('Historische Pluspunkte ohne Klassenprotokoll bleiben beim Klassenwechsel erhalten', () => {
  const base = state();
  const old = { ...base, mitarbeitLogs: [{id:'old',sid:'pupil',fach:'Deutsch',points:1,timestamp:'2026-09-29T12:00:00Z'}] };
  const other = switchClassState(old, 'b');
  assert.ok(other.mitarbeitLogs?.some(log => log.id === 'old'));
  assert.ok(switchClassState(other, 'a').mitarbeitLogs?.some(log => log.id === 'old'));
});
