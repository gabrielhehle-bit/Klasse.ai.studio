import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const widget = readFileSync('src/components/cockpit/widgets/GroupsWidget.tsx', 'utf8');
const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('Grouping roster defaults to its historical present-students path', () => {
  assert.match(widget, /studentScope = widget\?\.settings\?\.studentScope === 'all' \? 'all' : 'present'/);
  assert.match(widget, /studentScope === 'all' \? allStudents : presentStudents/);
  assert.match(widget, /candidates\.filter\(s => !pausedSet\.has\(s\.id\)\)\.map\(s => s\.id\)/);
  assert.match(widget, /generateStudentGroups\(activeStudentIds, config\)/);
});

test('Both roster choices live inside Widget hinzufügen settings and preserve current groups', () => {
  const picker = surface.slice(surface.indexOf('aria-label="Widget-Einstellungen im Menü Widget hinzufügen"'), surface.indexOf('Category Switcher Tab Bar'));
  assert.match(picker, /Gruppen bilden · Wer wird eingeteilt\?/);
  assert.match(picker, /Heute anwesende Kinder/);
  assert.match(picker, /Alle Kinder der Klasse/);
  assert.match(picker, /saveSetting\("studentScope", scope\)/);
  assert.match(picker, /Bestehende Gruppen werden nicht ungefragt neu gemischt/);
  assert.match(picker, /\.\.\.\(configured\.settings \|\| \{\}\)/);
  assert.match(surface, /<GroupsWidgetContent/);
});

test('Group pause, pair constraints and naming options render only in Widget hinzufügen panel', () => {
  const adapter = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  assert.match(widget, /createPortal\(/);
  assert.match(widget, /document\.getElementById\('cockpit-groups-settings-host'\)/);
  assert.match(widget, /optionsHost && createPortal/);
  assert.match(widget, /Pausieren \(\{pausedStudentIds\.length\}\)/);
  assert.match(widget, /Paare \(\{notTogether\.length \+ keepTogether\.length\}\)/);
  assert.match(widget, /Stil/);
  assert.doesNotMatch(widget, /setShowOptions\(/);
  assert.match(surface, /id="cockpit-groups-settings-host"/);
  assert.match(surface, /settingsInPicker=\{isAddWidgetMenuOpen && isWidgetConfigurationOpen && selectedWidgetConfiguration === "groups"\}/);
  assert.match(adapter, /settingsInPicker\?: boolean/);
  assert.match(adapter, /onClosePickerSettings\?: \(\) => void/);
});
