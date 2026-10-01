import test from 'node:test';
import assert from 'node:assert/strict';
import { correctParticipationStars, commitParticipationAward, commitSocialAward, getSocialStars, undoParticipationAward, SOCIAL_BADGE_ID, resetParticipationStars, getParticipationResetCount } from './participationAward';
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

test('Fachplus erhöht genau den Fachzähler der Notenmappe und Rückgängig korrigiert beide Speicher', () => {
  const base = { ...state(), mitarbeit: { pupil: { Deutsch: { '1': 4, '2': 7 }, Mathematik: { '1': 2 } } } };
  const awarded = commitParticipationAward(base, { classId: 'a', sid: 'pupil', subject: 'Deutsch', id: 'award' });
  assert.equal(awarded.mitarbeit.pupil.Deutsch['1'], 5);
  assert.equal(awarded.mitarbeit.pupil.Deutsch['2'], 7);
  assert.equal(awarded.mitarbeit.pupil.Mathematik['1'], 2);
  assert.equal(commitParticipationAward(awarded, { classId: 'a', sid: 'pupil', subject: 'Deutsch', id: 'award' }), awarded);
  const corrected = undoParticipationAward(awarded, { classId: 'a', sid: 'pupil', id: 'award' });
  assert.equal(corrected.mitarbeit.pupil.Deutsch['1'], 4);
  assert.equal(corrected.mitarbeitLogs.reduce((n, log) => n + log.points, 0), 0);
  assert.equal(undoParticipationAward(corrected, { classId: 'a', sid: 'pupil', id: 'award' }), corrected);
});
test('Soziale Sterne verändern keine Fach-Mitarbeit und vergeben auch über zehn keine automatischen Badges', () => {
  const base = state();
  let next = base;
  for (let i = 1; i <= 9; i++) next = commitSocialAward(next, { classId: 'a', sid: 'pupil', id: `social-${i}` });
  assert.equal(getSocialStars(next, 'pupil'), 9);
  assert.equal(next.schueler[0].badges?.length || 0, 0);
  next = commitSocialAward(next, { classId: 'a', sid: 'pupil', id: 'social-10' });
  assert.equal(getSocialStars(next, 'pupil'), 10);
  assert.equal(next.schueler[0].badges?.filter(badge => badge.id === SOCIAL_BADGE_ID).length || 0, 0);
  assert.deepEqual(next.mitarbeit, base.mitarbeit);
  assert.equal(next.mitarbeitLogs.some(log => log.fach), false);
  const restored = normalizeAppState(JSON.parse(JSON.stringify(accountSyncState(syncActiveClass(next)))));
  assert.equal(getSocialStars(restored, 'pupil'), 10);
  assert.equal(restored.schueler[0].badges?.filter(badge => badge.id === SOCIAL_BADGE_ID).length || 0, 0);
  const undone = undoParticipationAward(next, { classId: 'a', sid: 'pupil', id: 'social-10' });
  assert.equal(getSocialStars(undone, 'pupil'), 9);
  assert.equal(Boolean(undone.schueler[0].badges?.some(badge => badge.id === SOCIAL_BADGE_ID)), false);
  next = commitSocialAward(next, { classId: 'a', sid: 'pupil', id: 'social-11' });
  assert.equal(next.schueler[0].badges?.filter(badge => badge.id === SOCIAL_BADGE_ID).length || 0, 0);
});
test('Soziale Sterne werden im geteilten Klassendatensatz verschlüsselt übertragen', async () => {
  let next = state();
  for (let i = 0; i < 10; i++) next = commitSocialAward(next, { classId: 'a', sid: 'pupil' });
  next = syncActiveClass(next);
  const key = await generateSharedClassKey();
  const shared = await decryptSharedClass(await encryptSharedClass(next.classes[0], key), key);
  assert.deepEqual(shared.mitarbeitLogs, next.classes[0].mitarbeitLogs);
  assert.deepEqual(shared.schueler[0].badges, next.schueler[0].badges);
  assert.deepEqual(shared.mitarbeit, next.mitarbeit);
});

test('Zurücksetzen korrigiert mehrere heutige Fachpunkte und lässt andere Kinder, Fächer und Tage unberührt', () => {
  const now = '2026-10-01T10:00:00Z';
  let source = { ...state(), schueler: [...state().schueler, { id: 'other', vorname: 'Andere', nachname: 'Kind' }], mitarbeit: { pupil: { Deutsch: { '1': 4, '2': 9 }, Mathematik: { '1': 7 } } } } as any;
  source = commitParticipationAward(source, { classId: 'a', sid: 'pupil', subject: 'Deutsch', id: 'yesterday' }, '2026-09-30T10:00:00Z');
  for (let i = 0; i < 3; i++) source = commitParticipationAward(source, { classId: 'a', sid: 'pupil', subject: 'Deutsch', id: `today-${i}` }, now);
  source = undoParticipationAward(source, { classId: 'a', sid: 'pupil', id: 'today-0' }, now);
  source = commitParticipationAward(source, { classId: 'a', sid: 'other', subject: 'Deutsch', id: 'other-award' }, now);
  source = commitSocialAward(source, { classId: 'a', sid: 'pupil', id: 'social' }, now);
  const request = { classId: 'a', sid: 'pupil', kind: 'subject', scope: 'today' } as const;
  assert.equal(getParticipationResetCount(source, request, now), 2);
  const next = resetParticipationStars(source, request, now);
  assert.equal(getParticipationResetCount(next, request, now), 0);
  assert.equal(next.mitarbeit.pupil.Deutsch['1'], 5);
  assert.equal(next.mitarbeit.pupil.Deutsch['2'], 9);
  assert.equal(next.mitarbeit.pupil.Mathematik['1'], 7);
  assert.equal(next.mitarbeit.other.Deutsch['1'], 1);
  assert.equal(getSocialStars(next, 'pupil'), 1);
  assert.equal(resetParticipationStars(next, request, now), next);
  assert.equal(undoParticipationAward(next, { classId: 'a', sid: 'pupil', id: 'today-1' }, now), next);
  assert.equal(resetParticipationStars(next, { ...request, classId: 'b' }, now), next);
});
test('Sozialsterne können mehrfach korrigiert werden, manuelle Badges und Fachnoten bleiben erhalten', () => {
  const now = '2026-10-01T10:00:00Z';
  let source = { ...state(), schueler: [{ ...state().schueler[0], badges: [{ id: 'manual', name: 'Teamgeist', icon: '🤝', date: now }] }] } as any;
  for (let i = 0; i < 12; i++) source = commitSocialAward(source, { classId: 'a', sid: 'pupil' }, now);
  const request = { classId: 'a', sid: 'pupil', kind: 'social', scope: 'all' } as const;
  const reset = resetParticipationStars(source, request, now);
  assert.equal(getSocialStars(reset, 'pupil'), 0);
  assert.deepEqual(reset.schueler, source.schueler);
  assert.deepEqual(reset.mitarbeit, source.mitarbeit);
  const awarded = commitSocialAward(reset, { classId: 'a', sid: 'pupil' }, now);
  assert.equal(getSocialStars(awarded, 'pupil'), 1);
  assert.equal(getSocialStars(resetParticipationStars(awarded, request, now), 'pupil'), 0);
});
test('Legacy-Journalpunkte ohne Notenmappe-Nachweis werden beim Zurücksetzen nicht von alten Fachnoten abgezogen', () => {
  const now = '2026-10-01T10:00:00Z';
  let source = { ...state(), mitarbeit: { pupil: { Deutsch: { '1': 8 } } }, mitarbeitLogs: [{ id: 'legacy', sid: 'pupil', fach: 'Deutsch', points: 3, timestamp: now }] } as any;
  source = commitParticipationAward(source, { classId: 'a', sid: 'pupil', subject: 'Deutsch' }, now);
  const request = { classId: 'a', kind: 'subject', scope: 'today' } as const;
  assert.equal(getParticipationResetCount(source, request, now), 4);
  const next = resetParticipationStars(source, request, now);
  assert.equal(next.mitarbeit.pupil.Deutsch['1'], 8);
  assert.equal(getParticipationResetCount(next, request, now), 0);
  assert.equal(resetParticipationStars(next, request, now), next);
});
test('Zurückgesetzte Sterne einschließlich Korrekturen werden verschlüsselt im Klassenteam übertragen', async () => {
  const now = '2026-10-01T10:00:00Z';
  let source = commitParticipationAward(state(), { classId: 'a', sid: 'pupil', subject: 'Deutsch' }, now);
  source = syncActiveClass(resetParticipationStars(source, { classId: 'a', kind: 'subject', scope: 'today' }, now));
  const key = await generateSharedClassKey();
  const shared = await decryptSharedClass(await encryptSharedClass(source.classes[0], key), key);
  assert.deepEqual(shared.mitarbeitLogs, source.mitarbeitLogs);
  assert.deepEqual(shared.mitarbeit, source.mitarbeit);
});

test('−1/−2/−3 correct only the chosen child and subject; reset and undo cannot deduct twice', () => {
  const now = '2026-10-01T10:00:00Z';
  let source = state();
  source = commitParticipationAward(source, { classId:'a', sid:'pupil', subject:'Deutsch', id:'yesterday' }, '2026-09-30T10:00:00Z');
  for (let i=0;i<6;i++) source = commitParticipationAward(source, {classId:'a',sid:'pupil',subject:'Deutsch',id:`today-${i}`}, now);
  source = commitParticipationAward(source, {classId:'a',sid:'pupil',subject:'Mathematik'}, now);
  source = commitSocialAward(source, {classId:'a',sid:'pupil'}, now);
  const request = {classId:'a',sid:'pupil',kind:'subject',scope:'today',subject:'Deutsch'} as const;
  for (const amount of [1,2,3]) source = correctParticipationStars(source, {...request,amount}, now);
  assert.equal(source.mitarbeit.pupil.Deutsch['1'], 1);
  assert.equal(source.mitarbeit.pupil.Mathematik['1'], 1);
  assert.equal(getSocialStars(source,'pupil'),1);
  assert.equal(getParticipationResetCount(source,request,now),0);
  assert.equal(resetParticipationStars(source,request,now),source);
  assert.equal(undoParticipationAward(source,{classId:'a',sid:'pupil',id:'today-0'},now),source);
  assert.equal(correctParticipationStars(source,{...request,amount:3},now),source);
});
test('Partial correction of legacy multi-point entries preserves historical gradebook values', () => {
  const now = '2026-10-01T10:00:00Z';
  const source = {...state(),mitarbeit:{pupil:{Deutsch:{'1':8}}},mitarbeitLogs:[{id:'legacy',sid:'pupil',fach:'Deutsch',points:3,timestamp:now}]} as any;
  const request = {classId:'a',sid:'pupil',kind:'subject',scope:'today',subject:'Deutsch',amount:1} as const;
  const first = correctParticipationStars(source,request,now);
  assert.equal(getParticipationResetCount(first,request,now),2);
  const second = correctParticipationStars(first,{...request,amount:3},now);
  assert.equal(getParticipationResetCount(second,request,now),0);
  assert.equal(second.mitarbeit.pupil.Deutsch['1'],8);
  assert.equal(correctParticipationStars(second,request,now),second);
});
test('Stale correction requests and invalid amounts write nothing; social corrections preserve badges and grades', () => {
  const now = '2026-10-01T10:00:00Z';
  let source = state();
  for(let i=0;i<4;i++) source=commitSocialAward(source,{classId:'a',sid:'pupil'},now);
  const request = {classId:'a',sid:'pupil',kind:'social',scope:'all',amount:2} as const;
  for(const invalid of [{...request,classId:'b'},{...request,sid:'missing'},{...request,amount:-1},{...request,amount:4},{...request,kind:'subject' as const}]) assert.equal(correctParticipationStars(source,invalid,now),source);
  const corrected=correctParticipationStars(source,request,now);
  assert.equal(getSocialStars(corrected,'pupil'),2);
  assert.deepEqual(corrected.mitarbeit,source.mitarbeit);
  assert.deepEqual(corrected.schueler,source.schueler);
});
