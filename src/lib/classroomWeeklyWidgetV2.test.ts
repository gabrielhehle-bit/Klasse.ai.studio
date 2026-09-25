import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getClassroomWeeklyWidgetPreferences } from './classroomWeeklyWidgetPreferences';
import { getClassroomWeeklyTasks } from './classroomWeeklyPlan';

const widget = readFileSync('src/components/cockpit/widgets/ClassroomWeeklyPlanWidget.tsx', 'utf8');
const picker = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('Widget 3: default and legacy widget preferences are safe and predictable', () => {
  assert.deepEqual(getClassroomWeeklyWidgetPreferences(undefined), {
    taskCardsPerPage: 1, showMaterials: true, startSize: 'large',
  });
  assert.deepEqual(getClassroomWeeklyWidgetPreferences({ taskCardsPerPage: 2, showMaterials: false, startSize: 'compact' }), {
    taskCardsPerPage: 2, showMaterials: false, startSize: 'compact',
  });
  assert.deepEqual(getClassroomWeeklyWidgetPreferences({ taskCardsPerPage: 999, startSize: 'bogus' }), {
    taskCardsPerPage: 1, showMaterials: true, startSize: 'large',
  });
});

test('Widget 3: only explicitly published tasks can appear in the classroom weekly widget', () => {
  const app = { schuljahr: '2026/27', wochenplanung: {
    39: { Montag: {
      0: { fach: 'Deutsch', thema: 'Freigegeben', material: 'Geheimtext', wochenplanMaterial: 'Heft', imKinderWochenplan: true },
      1: { fach: 'Mathematik', thema: 'Nicht freigegeben', imKinderWochenplan: false },
    } },
  } };
  const tasks = getClassroomWeeklyTasks(app, 39);
  assert.deepEqual(tasks.map(task => task.title), ['Freigegeben']);
  assert.deepEqual(tasks.map(task => task.material), ['Heft']);
  assert.ok(!JSON.stringify(tasks).includes('Nicht freigegeben'));
  assert.ok(!JSON.stringify(tasks).includes('Geheimtext'));
});

test('Widget 3: central library gear and class-local settings do not rewrite an existing instance', () => {
  assert.match(picker, /aria-label="Widget-Voreinstellungen öffnen"/);
  assert.match(picker, /<option value="classweeklyplan">📋 Wochenplan der Kinder<\/option>/);
  assert.match(picker, /group\.label} hinzufügen/);
  assert.match(picker, /cockpitChildrenWeekDefaultsByClass/);
  assert.match(picker, /Voreinstellungen auf vorhandenes Widget anwenden/);
  assert.match(picker, /type === "classweeklyplan" && !useOld/);
  assert.match(picker, /ClassroomWeeklyPlanWidget widget=\{widget\}/);
  assert.match(picker, /Bestehende Wochenpläne und Rückmeldungen der Kinder werden nicht verändert/);
});

test('Widget 3: all released tasks appear directly in widget with a persistent finish button', () => {
  assert.match(widget, /aria-label="Aufgaben dieser Woche"/);
  assert.match(widget, /overflow-y-auto overscroll-contain/);
  assert.match(widget, /tasks\.map\(\(task, index\) => <article/);
  assert.match(widget, /<TaskText task=\{task\} showMaterials=\{preferences\.showMaterials\} \/>/);
  assert.match(widget, /aria-label="Aufgabe abschließen"/);
  assert.match(widget, /✅ Ich bin fertig mit einer Aufgabe/);
  assert.match(widget, /disabled=\{!tasks\.length \|\| !pupils\.length\}/);
  assert.doesNotMatch(widget, /Alle Aufgaben und \{pupils\.length\} Namen groß öffnen/);
  assert.match(widget, /isExpanded && typeof document !== 'undefined'/);
  assert.match(widget, /Zurück zur Widgetgröße/);
});

test('Widget 3: child selects task, then name, then private outcome; records are scoped', () => {
  assert.match(widget, /type FinishStep = 'task' \| 'child' \| 'feedback'/);
  assert.match(widget, /aria-label="Aufgabe auswählen"/);
  assert.match(widget, /aria-label="Kind auswählen"/);
  assert.match(widget, /aria-label="Wie ist die Aufgabe gelaufen\?"/);
  assert.match(widget, /setSelectedTaskId\(task\.id\); setChildId\(null\); setFinishStep\('child'\)/);
  assert.match(widget, /setChildId\(student\.id\); setFinishStep\('feedback'\)/);
  assert.match(widget, /onClick=\{\(\) => saveFeedback\(choice\.value\)\}/);
  assert.match(widget, /onClick=\{\(\) => saveFeedback\('hilfe'\)\}/);
  assert.match(widget, /updateChildWeeklyFeedback\(previous\.schueler, savedStudent, currentTask, feedback\)/);
  assert.match(widget, /previous\.schuljahr !== savedYear/);
  assert.match(widget, /selectionScope === scope/);
  assert.doesNotMatch(widget, /getChildTaskProgress\(pupil, task\.id\)/);
  assert.doesNotMatch(widget, /progress\?\.difficulty/);
  assert.doesNotMatch(widget, /progress\.helpRequested/);
});
