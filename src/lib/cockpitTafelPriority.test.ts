import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCompactStudentGridLayout } from './studentWidgetGrid';

const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const list = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');

test('Tafel-Fokus nutzt die bestehende Seitenleistensteuerung', () => {
  assert.match(cockpit, /aria-label=\{sidebarMode === "hidden" \? "Schülerliste wieder anzeigen" : "Tafel groß anzeigen"\}/);
  assert.match(cockpit, /changeSidebarMode\(sidebarMode === "hidden" \? prevSidebarMode : "hidden"\)/);
  assert.match(cockpit, /<CockpitWidgetDock/);
  assert.match(cockpit, /boardPageIds\.map/);
});

test('Mitarbeit und Sozialverhalten behalten getrennte Datenfunktionen', () => {
  assert.match(cockpit, /\[\['subject', 'Mitarbeit'\], \['social', 'Sozialverhalten'\]\]/);
  assert.match(cockpit, /getTodayPoints=\{sidebarParticipationKind === "social" \? sid => getSocialStars\(app, sid\) : getTodayPoints\}/);
  assert.match(cockpit, /addParticipation=\{sidebarParticipationKind === "social" \? addSocialParticipation : addParticipation\}/);
  assert.match(cockpit, /removeParticipation=\{sidebarParticipationKind === "social" \? removeSocialParticipation : removeParticipation\}/);
  assert.match(cockpit, /commitSocialAward\(prev, \{ id, sid, classId \}\)/);
  assert.match(cockpit, /awardParticipation\(sid, automaticSubject, app.activeClassId, event, onAwarded\)/);
  assert.match(cockpit, /resolveAutomaticParticipationSubject\(/);
  assert.match(list, /addParticipation\(student\.id, event/);
  assert.match(list, /removeParticipation\(student\.id\)/);
});

test('Sozialverhaltenspunkte sind optisch unterscheidbar', () => {
  assert.match(list, /socialMode \? "bg-sky-600 hover:bg-sky-700" : "bg-emerald-600 hover:bg-emerald-700"/);
  assert.match(list, /Sozialpunkt für das Sozialverhalten/);
  assert.match(list, /Mitarbeitspunkt für ein Unterrichtsfach/);
});

test('bei genügend Platz sind 16 Kinder in der Seitenleiste ohne Scrollen erreichbar', () => {
  const layout = getCompactStudentGridLayout(400, 520, 16);
  assert.equal(layout.columns, 2);
  assert.equal(layout.rows, 8);
  assert.equal(layout.fits, true);
  const narrow = getCompactStudentGridLayout(190, 420, 16);
  assert.equal(narrow.fits, false);
  assert.match(list, /const autoCompactSidebar = sidebar && !sidebarCompact && !gridMode/);
  assert.match(list, /listSize.width >= 260 && compactLayout.fits/);
  assert.match(list, /sidebarCompact \|\| compact \|\| autoCompactSidebar/);
});
