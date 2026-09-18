import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const settings = readFileSync('src/components/Settings.tsx', 'utf8');
const accountSettings = readFileSync('src/components/settings/AccountSettings.tsx', 'utf8');
const emailLogin = readFileSync('src/components/EmailAccountLogin.tsx', 'utf8');
const schoolIdentity = readFileSync('src/components/settings/SchoolIdentitySettings.tsx', 'utf8');
const schoolAdmin = readFileSync('src/components/settings/SchoolVerificationAdmin.tsx', 'utf8');
const notes = readFileSync('src/components/Behavior.tsx', 'utf8');
const voiceArchive = readFileSync('src/components/StimmNotizen.tsx', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');

test('Backup-Restore: abgelaufene Geräte-Sitzung blockiert alte Backups nicht dauerhaft', () => {
  assert.match(context, /persistedSyncCode/);
  assert.match(context, /fetch\('\/api\/sync\/' \+ encodeURIComponent\(persistedSyncCode\)/);
  assert.match(context, /response\.status === 404/);
  assert.match(context, /clearActiveSessionKey\(\)/);
  assert.match(context, /activeSyncCode: undefined/);
  assert.match(context, /assertRestorableAppState\(data\)/);
});

test('E-Mail-Anmeldung ist innerhalb der laufenden App erreichbar', () => {
  assert.match(settings, /AccountSettings/);
  assert.match(accountSettings, /EmailAccountLogin/);
  assert.match(emailLogin, /\/api\/access\/email\/request/);
  assert.match(emailLogin, /\/api\/access\/email\/verify/);
  assert.match(emailLogin, /Schulmail/);
});

test('Bestehende Einrichtung bleibt beim E-Mail- und Schul-Onboarding unangetastet', () => {
  assert.match(accountSettings, /Klassen, Planungen und Noten bleiben auf diesem Gerät verfügbar/);
  assert.match(schoolIdentity, /Du musst nichts neu einrichten/);
  assert.match(schoolIdentity, /Bestehende Klassio-Daten werden dabei nicht verschoben, gelöscht oder neu angelegt/);
  assert.doesNotMatch(emailLogin, /factoryReset|Werksreset|clearAppData/);
});

test('Neue Schulen können ohne externen Kontakt beantragt und intern freigegeben werden', () => {
  assert.match(schoolIdentity, /Schulverifizierung anfordern/);
  assert.match(schoolAdmin, /Schulverwaltung/);
  assert.match(schoolAdmin, /Freigeben/);
  assert.match(schoolAdmin, /Ablehnen/);
});

test('Teamteaching ist direkt in der Sidebar sichtbar', () => {
  assert.match(sidebar, /id: 'teamteaching', label: 'Teamteaching'/);
});

test('Sprachnotizen liegen sichtbar in Notizen und starten die Transkription', () => {
  assert.match(notes, /id: 'voice', label: 'Diktieren'/);
  assert.match(notes, /<StimmNotizen \/>/);
  assert.match(voiceArchive, /Aufnahme starten/);
  assert.match(voiceArchive, /stimmNotizModal: true/);
  assert.doesNotMatch(sidebar, /id: 'stimmnotizen'/);
});
