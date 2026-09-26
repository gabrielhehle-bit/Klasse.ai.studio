import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cockpitWidgetSupportsSettings } from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const randomName = readFileSync('src/components/cockpit/widgets/RandomNameWidget.tsx', 'utf8');
const groups = readFileSync('src/components/cockpit/widgets/GroupsWidget.tsx', 'utf8');
const attendance = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');

test('Batch 2: Zufallsauswahl, Gruppen und Ich bin da verwenden dasselbe Kopf-Zahnrad', () => {
  assert.equal(cockpitWidgetSupportsSettings('randomname'), true);
  assert.equal(cockpitWidgetSupportsSettings('groups'), true);
  assert.equal(cockpitWidgetSupportsSettings('kidattendance'), true);

  assert.match(surface, /const isCentralInteractionWidgetSettings =/);
  assert.match(surface, /type === "kidattendance" \|\| type === "groups" \|\| type === "randomname"/);
  assert.match(surface, /toggleCentralInteractionWidgetSettings\(String\(widget\.type\)\)/);
  assert.match(surface, /setSelectedWidgetConfiguration\(type\)/);
  assert.match(surface, /setIsAddWidgetMenuOpen\(true\)/);
  assert.match(surface, /setIsWidgetConfigurationOpen\(true\)/);
});

test('Batch 2: Bedienfarbe folgt der Profil-Akzentfarbe statt festem Indigo', () => {
  for (const source of [randomName, groups, attendance]) {
    assert.doesNotMatch(source, /indigo-/);
  }

  assert.match(randomName, /bg-accent/);
  assert.match(randomName, /text-accent/);
  assert.match(randomName, /focus-visible:outline-accent/);

  assert.match(groups, /bg-accent/);
  assert.match(groups, /bg-accent-soft/);
  assert.match(groups, /text-accent/);

  assert.match(attendance, /bg-accent/);
  // Semantische Anwesenheitsfarben bleiben absichtlich statusbezogen.
  assert.match(attendance, /bg-emerald-600/);
  assert.match(attendance, /bg-rose-600/);
  assert.match(attendance, /bg-amber-500/);
});

test('Batch 2: der gemeinsame Widget-Kopf bleibt die einzige sichtbare Titelzeile', () => {
  assert.doesNotMatch(randomName, />🎯 Zufallsauswahl<\/span>/);
  assert.doesNotMatch(attendance, /<h3[^>]*>🖐️ Ich bin da!<\/h3>/);
  assert.doesNotMatch(attendance, /<strong[^>]*>Ich bin da!<\/strong>/);
  assert.match(attendance, />Anwesenheit<\/span>/);
});

test('Batch 2: zentrale Hauptaktionen bleiben mindestens 44px touchfreundlich', () => {
  assert.match(randomName, /min-h-11/);
  assert.match(groups, /min-h-11/);
  assert.match(attendance, /min-h-11/);
  assert.match(randomName, /min-w-11/);
  assert.match(attendance, /min-w-11/);
});

test('Batch 2: Gruppen-Erweiterungen bleiben in derselben zentralen Konfiguration verfügbar', () => {
  assert.match(groups, /cockpit-groups-settings-host/);
  assert.match(groups, /settingsInPicker/);
  assert.match(groups, /Pausieren \(\{pausedStudentIds\.length\}\)/);
  assert.match(groups, /Paare \(\{notTogether\.length \+ keepTogether\.length\}\)/);
  assert.match(groups, />\s*Stil\s*<\/button>/);
});
