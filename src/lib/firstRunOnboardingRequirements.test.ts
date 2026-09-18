import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const intro = readFileSync('src/components/InitialModeModal.tsx', 'utf8');
const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');

test('First run: zeigt eine kurze Klassio-Einführung statt Modus-Zwang', () => {
  assert.match(intro, /Klassio passt sich dir an\./);
  assert.match(intro, /Die Sidebar gehört dir\./);
  assert.match(intro, /Eine freie Fläche für deinen Unterricht\./);
  assert.match(intro, /Zum Dashboard/);
  assert.doesNotMatch(intro, /Fokus-Modus/);
  assert.doesNotMatch(intro, /Experte \(Voll\)/);
  assert.doesNotMatch(intro, /disabledModules:/);
});

test('First run: Abschluss landet im Dashboard und verhindert eine zweite Tour', () => {
  assert.match(intro, /firstLogin: false/);
  assert.match(intro, /tourAbgeschlossen: true/);
  assert.match(intro, /currentPage: 'dashboard'/);
});

test('Dashboard: Sicherungserinnerung lenkt im Alltag nicht mehr ab', () => {
  assert.doesNotMatch(dashboard, /Zeit für eine Wochensicherung/);
  assert.doesNotMatch(dashboard, /showBackupBanner|handleDownloadBackup/);
  assert.match(sidebar, /z-\[150\]/);
});
