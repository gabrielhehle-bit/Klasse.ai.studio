import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const widget = readFileSync('src/components/cockpit/widgets/GroupsWidget.tsx', 'utf8');
const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('Grouping uses daily check-ins and disables generation when the selected pool is empty', () => {
  assert.match(widget, /normalizeCockpitStudentScope\(savedSettings\.studentScope\)/);
  assert.match(widget, /getCockpitStudentPool\(allStudents, app, studentScope\)/);
  assert.match(widget, /candidates\.filter\(s => !pausedSet\.has\(s\.id\)\)\.map\(s => s\.id\)/);
  assert.match(widget, /generateStudentGroups\(activeStudentIds, config\)/);
  assert.match(widget, /disabled=\{activeStudentIds\.length === 0\}/);
});

test('Roster defaults remain in Widget hinzufügen and preserve current groups', () => {
  const picker = surface.slice(surface.indexOf('aria-label="Widget-Einstellungen im Menü Widget hinzufügen"'), surface.indexOf('Category Switcher Tab Bar'));
  assert.match(picker, /Gruppen bilden · Wer wird eingeteilt\?/);
  assert.match(picker, /COCKPIT_STUDENT_SCOPES\.map/);
  assert.match(picker, /saveSetting\("studentScope", scope\)/);
  assert.match(picker, /Gruppenaufteilung/);
  assert.match(picker, /Kinder pro Gruppe/);
  assert.match(picker, /Anzahl Gruppen/);
  assert.match(picker, /groupDefaults.mode === "count"/);
  assert.match(picker, /saveSetting\("mode", mode\)/);
  assert.match(picker, /saveSetting\("targetValue", value\)/);
  assert.match(picker, /cockpitGroupDefaultsByClass/);
  assert.match(picker, /applyGroupWidgetPreference\(w.settings, groupKey, groupValue\)/);
  assert.match(picker, /setCockpitWidgets\(current => current.map\(updateExistingGroup\)\)/);

  assert.match(picker, /die bisherigen Kinder bleiben bis dahin in ihren Gruppen/);
  assert.match(picker, /cockpitLayout: \(prev.cockpitLayout \|\| cockpitWidgets\).map\(updateExistingGroup\)/);
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
  const main = widget.slice(widget.indexOf('Choose today\'s participants'), widget.indexOf('OPTIONEN MODAL'));
  assert.match(main, /onClick=\{\(\) => handleGenerate\(\)\}/);
  assert.match(main, /onUpdate\(\{ settings: \{ studentScope: scope \} \}\)/);
  assert.doesNotMatch(main, /setTargetValue\(|setMode\(|setShowOptions\(|Settings2|MoreHorizontal/);
  assert.match(widget, /const targetValue = typeof savedSettings\.targetValue/);
  assert.match(widget, /const mode: GroupingMode = savedSettings\.mode === 'count'/);

});
