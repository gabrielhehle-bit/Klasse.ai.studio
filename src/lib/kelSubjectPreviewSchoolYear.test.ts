import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const presentation = readFileSync('src/components/KELPresentation.tsx', 'utf8');
const subject = readFileSync('src/components/KELSubjectPage.tsx', 'utf8');

test('KEL subject preview waits until the actual subject slide exists', () => {
  assert.match(presentation, /const \[subjectPreviewRequest, setSubjectPreviewRequest\] = useState<string \| null>\(null\)/);
  assert.match(presentation, /const target = slides.findIndex\(slide => slide.type === 'subject' && slide.subject === subjectPreviewRequest\)/);
  assert.match(presentation, /if \(target < 0\) return/);
  assert.match(presentation, /setSlideIndex\(target\);\s*setView\('slides'\);\s*setSubjectPreviewRequest\(null\)/);
  assert.match(presentation, /setSubjectPreviewRequest\(item.fach\)/);
  assert.doesNotMatch(presentation, /setSlideIndex\(Math.max\(0, position\)\); setView\('slides'\)/);
  assert.match(presentation, /setSubjectPreviewRequest\(null\);\s*\/\/ A fresh meeting/);
});

test('preview activates the selected subject but marks the configuration as unsaved', () => {
  const start = presentation.indexOf('setVisible(previous => ({ ...previous, learning: true, subjectPages: true }));');
  assert.ok(start >= 0);
  const action = presentation.slice(start, start + 250);
  assert.match(action, /setSelectionSaved\(false\)/);
  assert.match(action, /setSubjectPreviewRequest\(item.fach\)/);
  assert.doesNotMatch(action, /setApp\(/);
});

test('KEL shows the actual whole-year grading period rather than a misleading semester', () => {
  assert.match(subject, /semester === '1' \? 'Ganzes Schuljahr'/);
  assert.doesNotMatch(subject, /Notenmappe dieses Kindes · Semester \{semester\}/);
  assert.match(presentation, /Noch keine dokumentierten Fachstände für dieses Schuljahr/);
  assert.match(presentation, /Auswahl für dieses Kind und Schuljahr gespeichert/);
  assert.match(subject, /getStudentAssessmentDomainPerformance\(app, studentId, fach, semester\)/);
});
