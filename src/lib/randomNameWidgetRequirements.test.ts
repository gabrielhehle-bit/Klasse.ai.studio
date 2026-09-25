import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPresentStudents } from '../components/cockpit/studentSelectionUtils';
import type { AppState, Student } from '../types';

const widget = readFileSync('src/components/cockpit/widgets/RandomNameWidget.tsx', 'utf8');
const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('random widget never imports a demo roster or reveals mood data on the public board', () => {
  assert.doesNotMatch(widget, /DEFAULT_MOCK_STUDENTS|DEFAULT_MOCK_SCHUELER|MOCK_STUDENTS/);
  assert.match(widget, /getPresentStudents\(allStudents, app\)/);
  assert.doesNotMatch(widget, /befinden|moodByStudent|moodValue|privateMood/);
  assert.match(widget, /app\?\.activeClassId/);
  assert.match(widget, /getTodayIsoDate/);
  assert.match(widget, /setSessionExcludedIds\(\[\]\)/);
  assert.match(widget, /setSelectedStudentId\(null\)/);
  assert.deepEqual(getPresentStudents([], undefined), []);
});

test('only central Widget hinzufügen config controls sound; lesson action still selects children', () => {
  assert.match(cockpit, /<option value="randomname">🎯 Zufälliges Kind<\/option>/);
  assert.match(cockpit, /selectedWidgetConfiguration === "randomname"/);
  assert.match(cockpit, /saveRandomPreset\("soundEnabled", event\.target\.checked\)/);
  assert.match(cockpit, /cockpitRandomNameDefaultsByClass/);
  assert.match(cockpit, /Auf vorhandenes Widget anwenden/);
  assert.match(cockpit, /aria-label="Widget-Voreinstellungen öffnen"/);
  assert.doesNotMatch(widget, /setSoundEnabled|onClick=\{\(\) => setSoundEnabled/);
  assert.match(widget, /Kinder wählen/);
  assert.match(widget, /onClick=\{pickPupil\}/);
});

test('pupil selection is a modal with explicit navigable pages, not an internal scroll list', () => {
  assert.match(widget, /createPortal\(/);
  assert.match(widget, /aria-modal="true"/);
  assert.match(widget, /randomSelectionPage\(selectableStudents, selectorPage, pageSize\)/);
  assert.match(widget, /Vorherige Kinderseite/);
  assert.match(widget, /Nächste Kinderseite/);
  assert.doesNotMatch(widget, /overflow-y-auto|no-scrollbar/);
  assert.match(widget, /min-h-11/);
  assert.match(widget, /min-h-12/);
});
