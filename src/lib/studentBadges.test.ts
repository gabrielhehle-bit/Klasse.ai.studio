import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIFIED_DEFAULT_BADGES } from '../types';
import { initialAppState, syncActiveClass, normalizeAppState, switchClassState } from './appState';
import { accountSyncState } from './accountSyncService';
import { awardStudentBadge } from './studentBadges';
import { encryptSharedClass, decryptSharedClass, generateSharedClassKey } from './teamTeachingCrypto';
const base = () => syncActiveClass({ ...initialAppState, activeClassId: 'a', classes: [{ id: 'a', name: 'Demo', stufe: 1, klassenvorstand: true, faecher: ['Deutsch'], schueler: [{ id: 'pupil', vorname: 'Demo', nachname: 'Kind' }] }, { id: 'b', name: 'Andere Klasse', stufe: 1, klassenvorstand: true, faecher: ['Deutsch'], schueler: [] }], schueler: [{ id: 'pupil', vorname: 'Demo', nachname: 'Kind' }], mitarbeit: { pupil: { Deutsch: { '1': 5 } } } } as any);
test('Sport, Eishockey, Fußball, Zahlen und Leseratte stehen als fachbezogene Badges zur Verfügung', () => {
  for (const [id, fach] of [['sport', 'Sport'], ['football', 'Sport'], ['hockey', 'Sport'], ['numbers', 'Mathematik'], ['book', 'Deutsch']]) assert.equal(UNIFIED_DEFAULT_BADGES.find(badge => badge.id === id)?.fach, fach);
});
test('Lehrperson vergibt ein Badge genau einmal beim richtigen Kind, ohne Fachpunkte zu ändern', () => {
  const source = base();
  const request = { classId: 'a', sid: 'pupil', name: 'Leseratte', icon: '📚', fach: 'Deutsch' };
  const next = awardStudentBadge(source, request);
  assert.equal(next.schueler[0].badges?.[0].name, 'Leseratte');
  assert.equal(next.schueler[0].badges?.[0].fach, 'Deutsch');
  assert.deepEqual(next.mitarbeit, source.mitarbeit);
  assert.equal(awardStudentBadge(next, request), next);
  assert.equal(awardStudentBadge(source, { ...request, classId: 'b' }), source);
  assert.equal(awardStudentBadge(source, { ...request, sid: 'missing' }), source);
});
test('Vergebene Fachbadges bleiben beim Klassenwechsel, Gerätewechsel und verschlüsseltem Teamteaching erhalten', async () => {
  const source = syncActiveClass(awardStudentBadge(base(), { classId: 'a', sid: 'pupil', name: 'Eishockey-Badge', icon: '🏒', fach: 'Sport' }));
  const restored = normalizeAppState(JSON.parse(JSON.stringify(accountSyncState(source))));
  assert.deepEqual(restored.schueler[0].badges, source.schueler[0].badges);
  assert.deepEqual(switchClassState(switchClassState(source, 'b'), 'a').schueler[0].badges, source.schueler[0].badges);
  const key = await generateSharedClassKey();
  const shared = await decryptSharedClass(await encryptSharedClass(source.classes[0], key), key);
  assert.deepEqual(shared.schueler[0].badges, source.schueler[0].badges);
});
