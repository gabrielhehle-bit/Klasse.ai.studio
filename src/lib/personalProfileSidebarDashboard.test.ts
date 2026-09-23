import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState, switchClassState, syncActiveClass } from './appState';
import { accountSyncState, appStateFingerprint, mergeAccountSyncState } from './accountSyncService';

const profile = {
  name: 'Lea Beispiel', kuerzel: 'LBe', anrede: 'Frau', schule: 'Meine Schule',
  motto: 'Mit Freude lernen', mottoAnzeige: 'motto' as const, spruch: '',
  fotoDataUrl: 'data:image/webp;base64,' + 'a'.repeat(64),
  titelbildDataUrl: 'data:image/webp;base64,' + 'b'.repeat(96),
  akzentfarbe: '#15803d',
};

test('teacher profile belongs to the account, never to a class projection or another class', () => {
  const state = {
    ...initialAppState, activeClassId: 'a', klassenbezeichnung: '1a', stufe: 1,
    schuljahr: '2026/27', lehrerProfil: { ...initialAppState.lehrerProfil, ...profile },
    classes: [
      { id: 'a', name: '1a', stufe: 1, klassenvorstand: true, schueler: [] },
      { id: 'b', name: '2b', stufe: 2, klassenvorstand: false, schueler: [] },
    ],
  } as any;
  const stored = syncActiveClass(state);
  assert.equal((stored.classes[0] as any).lehrerProfil, undefined);
  const second = switchClassState(stored, 'b');
  assert.equal(second.lehrerProfil.name, 'Lea Beispiel');
  assert.equal(second.lehrerProfil.kuerzel, 'LBe');
  assert.equal(second.lehrerProfil.fotoDataUrl, profile.fotoDataUrl);
  assert.equal((second.classes[1] as any).lehrerProfil, undefined);
  const restored = normalizeAppState(JSON.parse(JSON.stringify(second)));
  assert.equal(restored.lehrerProfil.titelbildDataUrl, profile.titelbildDataUrl);
});

test('account synchronization preserves personal photos, motto, abbreviation and theme while navigation remains local', () => {
  const state = { ...initialAppState, lehrerProfil: profile,
    currentPage: 'profil', customAccentColor: '#15803d' } as any;
  const payload = accountSyncState(state);
  assert.equal(payload.lehrerProfil.fotoDataUrl, profile.fotoDataUrl);
  assert.equal(payload.lehrerProfil.titelbildDataUrl, profile.titelbildDataUrl);
  assert.equal(payload.lehrerProfil.kuerzel, profile.kuerzel);
  assert.notEqual(appStateFingerprint(state), appStateFingerprint(initialAppState));
  const received = normalizeAppState(JSON.parse(JSON.stringify(payload)));
  const remoteDevice = mergeAccountSyncState(received, { ...initialAppState, currentPage: 'dashboard' });
  assert.equal(remoteDevice.lehrerProfil.akzentfarbe, '#15803d');
  assert.equal(remoteDevice.lehrerProfil.name, 'Lea Beispiel');
  assert.equal(remoteDevice.currentPage, 'dashboard');
});

test('personal portrait opens profile from sidebar and both dashboard views', () => {
  const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
  const dashboard = readFileSync('src/components/DashboardTodayOverview.tsx', 'utf8');
  const compact = readFileSync('src/components/DashboardSimpleOverview.tsx', 'utf8');
  const view = readFileSync('src/components/LehrerProfilView.tsx', 'utf8');
  for (const source of [sidebar, dashboard, compact]) {
    assert.match(source, /<TeacherAvatar app=\{app\}/);
    assert.match(source, /Profil (?:auf dem Dashboard )?öffnen/);
  }
  assert.match(sidebar, /lehrerProfil\?\.kuerzel/);
  assert.match(view, /Lehrerkürzel/);
  assert.match(view, /Profilfoto auswählen/);
  assert.match(view, /Titelbild auswählen/);
  assert.match(view, /prepareProfileImage/);
  assert.match(view, /Mein Stundenplan/);
  assert.match(view, /Mein Motto/);
  assert.match(view, /Persönliche Akzentfarbe/);
  assert.match(view, /mottoAnzeige/);
  assert.match(view, /lehrerProfil:/);
  assert.doesNotMatch(view, /schulName: schule/);
});
