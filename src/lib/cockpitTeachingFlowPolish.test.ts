import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCockpitEarnedBadges } from './cockpitEarnedBadges';

const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const students = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');

test('Fachpunkt und Sozialpunkt melden nur die tatsächliche Buchungsart', () => {
  assert.match(cockpit, /onAwarded\?\.\(subject\)/);
  assert.match(cockpit, /onAwarded\?\.\('Sozialverhalten'\)/);
  assert.match(cockpit, /awardParticipation\(sid, automaticSubject, app\.activeClassId, event, onAwarded\)/);
  assert.match(cockpit, /addParticipation=\{sidebarParticipationKind === "social" \? addSocialParticipation : addParticipation\}/);
  assert.match(cockpit, /removeParticipation=\{sidebarParticipationKind === "social" \? removeSocialParticipation : removeParticipation\}/);
  assert.match(students, /setRecentAwardSubject\(subject\)/);
  assert.match(students, /Rückgängig<\/button>/);
  assert.match(students, /if \(getTodayPoints\(lastAwardedId\) > 0\) removeParticipation\(lastAwardedId\)/);
  assert.match(students, /min-h-11 shrink-0 rounded-lg border/);
});

test('Die Lehrperson sieht das aktuelle Fach vor der Mitarbeit', () => {
  assert.match(cockpit, /Fach: \$\{getActiveSubject\(\)\}/);
  assert.match(cockpit, /'Fach auswählen'/);
  assert.match(cockpit, /resolveAutomaticParticipationSubject\(getActiveSubject\(\), app\.faecher, app\.participationSettings\?\.subjectMode\)/);
});

test('Badge-Übersicht ist nur Anzeige und filtert private Abzeichen', () => {
  const student = {badges: [
    {id:'one', name:'Lesefuchs', icon:'📘', date:'2026-11-16', visibleInCockpit:true},
    {id:'two', name:'Privat', icon:'🔐', date:'2026-11-16', visibleInCockpit:false},
    {id:'social-stars-10', name:'Auto', icon:'⭐', date:'2026-11-16', visibleInCockpit:true},
  ]};
  assert.deepEqual(getCockpitEarnedBadges(student, true, 999).visible.map(x => x.name), ['Lesefuchs']);
  assert.match(students, /aria-label="Badge-Übersicht schließen"/);
  assert.match(students, /getCockpitEarnedBadges\(selected, true, 999\)\.visible/);
  assert.match(students, /setBadgeDetailsStudentId\(student\.id\)/);
  assert.doesNotMatch(students, /awardStudentBadge\(/);
});

test('Seltene Vorlage-Aktion bleibt zugänglich, die Tafel behält ihre Bedienung', () => {
  assert.match(cockpit, /aria-label="Vorlage erstellen"/);
  assert.match(cockpit, /setVorlagenStartTab\("create"\); setIsVorlagenModalOpen\(true\); setIsMoreOptionsMenuOpen\(false\)/);
  assert.match(cockpit, /aria-label=\{isFullscreen \? "Vollbild beenden" : "Vollbild öffnen"\}/);
  assert.match(cockpit, /Tafel groß anzeigen/);
  assert.equal((cockpit.match(/aria-label="Vorlage erstellen"/g) || []).length, 1);
});
